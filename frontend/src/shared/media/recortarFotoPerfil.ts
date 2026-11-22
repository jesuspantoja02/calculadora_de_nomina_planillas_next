/** Tamaño del marco circular en pantalla (px). */
export const MARCO_FOTO_PX = 280;
/** Resolución exportada del avatar (cuadrado, se muestra circular). */
export const AVATAR_EXPORT_PX = 320;

export interface TransformFotoPerfil {
  /** Escala relativa al “cover” del marco (1 = encaja justo). */
  zoom: number;
  /** Desplazamiento en px respecto al centro del marco. */
  offsetX: number;
  offsetY: number;
}

export function transformFotoInicial(imgW: number, imgH: number): TransformFotoPerfil {
  return { zoom: 1, offsetX: 0, offsetY: 0 };
}

/** Escala base para que la imagen cubra el círculo (object-fit: cover). */
export function escalaCover(imgW: number, imgH: number, marco = MARCO_FOTO_PX): number {
  return Math.max(marco / imgW, marco / imgH);
}

/**
 * Dibuja el recorte circular del avatar como JPEG data URL comprimido.
 * Cualquier foto grande se reduce a ~30–80 KB.
 */
export function exportarFotoPerfilDataUrl(
  imagen: HTMLImageElement,
  transform: TransformFotoPerfil,
  calidad = 0.85,
): string {
  const size = AVATAR_EXPORT_PX;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas.');

  const cover = escalaCover(imagen.naturalWidth, imagen.naturalHeight);
  const scale = cover * transform.zoom;
  const ratio = size / MARCO_FOTO_PX;
  const drawW = imagen.naturalWidth * scale * ratio;
  const drawH = imagen.naturalHeight * scale * ratio;
  const dx = size / 2 + transform.offsetX * ratio - drawW / 2;
  const dy = size / 2 + transform.offsetY * ratio - drawH / 2;

  // Cuadrado (el marco circular es solo en la UI); JPEG no soporta transparencia.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(imagen, dx, dy, drawW, drawH);

  return canvas.toDataURL('image/jpeg', calidad);
}

export interface ImagenCargada {
  imagen: HTMLImageElement;
  /** Liberar el object URL cuando ya no se use la vista previa. */
  liberar: () => void;
}

export function cargarImagenDesdeArchivo(file: File): Promise<ImagenCargada> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen.'));
      return;
    }
    // Hasta ~20 MB: se recorta y comprime en el cliente.
    if (file.size > 20 * 1024 * 1024) {
      reject(new Error('La imagen es demasiado pesada (máx. 20 MB).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    let liberado = false;
    const liberar = () => {
      if (liberado) return;
      liberado = true;
      URL.revokeObjectURL(url);
    };
    img.onload = () => resolve({ imagen: img, liberar });
    img.onerror = () => {
      liberar();
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}
