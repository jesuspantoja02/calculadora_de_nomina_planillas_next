import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  cargarImagenDesdeArchivo,
  exportarFotoPerfilDataUrl,
  escalaCover,
  MARCO_FOTO_PX,
  transformFotoInicial,
  type TransformFotoPerfil,
} from '../media/recortarFotoPerfil';
import { Icon } from './Icon';

interface FotoPerfilCropDialogProps {
  abierto: boolean;
  archivo: File | null;
  onCancelar: () => void;
  onConfirmar: (dataUrl: string) => void;
}

export function FotoPerfilCropDialog({ abierto, archivo, onCancelar, onConfirmar }: FotoPerfilCropDialogProps) {
  const tituloId = useId();
  const [imagen, setImagen] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState<TransformFotoPerfil>(transformFotoInicial(1, 1));
  const [arrastrando, setArrastrando] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const liberarRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!abierto || !archivo) {
      liberarRef.current?.();
      liberarRef.current = null;
      setImagen(null);
      setError(null);
      return;
    }
    let cancelado = false;
    setError(null);
    setImagen(null);
    void cargarImagenDesdeArchivo(archivo)
      .then(({ imagen: img, liberar }) => {
        if (cancelado) {
          liberar();
          return;
        }
        liberarRef.current?.();
        liberarRef.current = liberar;
        setImagen(img);
        setTransform(transformFotoInicial(img.naturalWidth, img.naturalHeight));
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setError(e instanceof Error ? e.message : 'No se pudo abrir la imagen.');
      });
    return () => {
      cancelado = true;
      liberarRef.current?.();
      liberarRef.current = null;
    };
  }, [abierto, archivo]);

  useEffect(() => {
    if (!abierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => confirmarRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [abierto, onCancelar]);

  const limitarOffset = useCallback((zoom: number, ox: number, oy: number, img: HTMLImageElement) => {
    const cover = escalaCover(img.naturalWidth, img.naturalHeight);
    const scale = cover * zoom;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const maxX = Math.max(0, (drawW - MARCO_FOTO_PX) / 2);
    const maxY = Math.max(0, (drawH - MARCO_FOTO_PX) / 2);
    return {
      zoom,
      offsetX: Math.min(maxX, Math.max(-maxX, ox)),
      offsetY: Math.min(maxY, Math.max(-maxY, oy)),
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!imagen) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastrando(true);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: transform.offsetX, oy: transform.offsetY };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !imagen) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setTransform(
      limitarOffset(
        transformRef.current.zoom,
        dragRef.current.ox + dx,
        dragRef.current.oy + dy,
        imagen,
      ),
    );
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setArrastrando(false);
  };

  const cambiarZoom = (zoom: number) => {
    if (!imagen) return;
    setTransform((t) => limitarOffset(zoom, t.offsetX, t.offsetY, imagen));
  };

  const confirmar = () => {
    if (!imagen) return;
    try {
      const dataUrl = exportarFotoPerfilDataUrl(imagen, transform);
      onConfirmar(dataUrl);
    } catch {
      setError('No se pudo recortar la foto.');
    }
  };

  if (!abierto) return null;

  const cover = imagen ? escalaCover(imagen.naturalWidth, imagen.naturalHeight) : 1;
  const scale = cover * transform.zoom;
  const imgStyle =
    imagen != null
      ? {
          width: imagen.naturalWidth * scale,
          height: imagen.naturalHeight * scale,
          transform: `translate(calc(-50% + ${transform.offsetX}px), calc(-50% + ${transform.offsetY}px))`,
        }
      : undefined;

  return (
    <div className="foto-crop-backdrop" role="presentation" onClick={onCancelar}>
      <div
        className="foto-crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="foto-crop-dialog__head">
          <h2 id={tituloId} className="foto-crop-dialog__title">
            Ajustar foto de perfil
          </h2>
          <button type="button" className="foto-crop-dialog__close" onClick={onCancelar} aria-label="Cerrar">
            <Icon nombre="x" tamano={18} />
          </button>
        </header>

        <div className="foto-crop-dialog__body">
          {error ? <p className="foto-crop-dialog__error">{error}</p> : null}
          {!error && !imagen ? <p className="text-secondary mb-0">Cargando imagen…</p> : null}

          {imagen ? (
            <>
              <p className="foto-crop-dialog__hint">Arrastra para centrar el rostro dentro del círculo.</p>
              <div
                className={`foto-crop-stage${arrastrando ? ' foto-crop-stage--dragging' : ''}`}
                style={{ width: MARCO_FOTO_PX, height: MARCO_FOTO_PX }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagen.src} alt="" className="foto-crop-stage__img" style={imgStyle} draggable={false} />
                <div className="foto-crop-stage__mask" aria-hidden="true" />
                <div className="foto-crop-stage__ring" aria-hidden="true" />
              </div>

              <label className="foto-crop-zoom">
                <span>Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={transform.zoom}
                  onChange={(e) => cambiarZoom(Number(e.target.value))}
                />
              </label>
            </>
          ) : null}
        </div>

        <footer className="foto-crop-dialog__foot">
          <button type="button" className="btn btn-secondary" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            ref={confirmarRef}
            type="button"
            className="btn btn-primary"
            disabled={!imagen || !!error}
            onClick={confirmar}
          >
            Usar foto
          </button>
        </footer>
      </div>
    </div>
  );
}
