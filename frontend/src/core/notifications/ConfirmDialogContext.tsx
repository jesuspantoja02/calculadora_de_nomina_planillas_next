import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from '../../shared/ui/Icon';

export type ConfirmVariante = 'danger' | 'warning';

export interface ConfirmOptions {
  titulo: string;
  mensaje: string;
  detalle?: string;
  confirmarLabel?: string;
  cancelarLabel?: string;
  variante?: ConfirmVariante;
}

interface ConfirmContextValue {
  confirmar: (opciones: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface DialogState extends ConfirmOptions {
  abierto: boolean;
}

const INICIAL: DialogState = {
  abierto: false,
  titulo: '',
  mensaje: '',
  detalle: undefined,
  confirmarLabel: 'Confirmar',
  cancelarLabel: 'Cancelar',
  variante: 'danger',
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(INICIAL);
  const resolverRef = useRef<((valor: boolean) => void) | null>(null);
  const tituloId = useId();
  const descId = useId();
  const confirmarBtnRef = useRef<HTMLButtonElement>(null);

  const cerrar = useCallback((valor: boolean) => {
    resolverRef.current?.(valor);
    resolverRef.current = null;
    setDialog((d) => ({ ...d, abierto: false }));
  }, []);

  const confirmar = useCallback((opciones: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setDialog({
        abierto: true,
        titulo: opciones.titulo,
        mensaje: opciones.mensaje,
        detalle: opciones.detalle,
        confirmarLabel: opciones.confirmarLabel ?? 'Confirmar',
        cancelarLabel: opciones.cancelarLabel ?? 'Cancelar',
        variante: opciones.variante ?? 'danger',
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog.abierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => confirmarBtnRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [dialog.abierto, cerrar]);

  const value = useMemo(() => ({ confirmar }), [confirmar]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog.abierto ? (
        <div className="confirm-dialog no-print" role="presentation">
          <button
            type="button"
            className="confirm-dialog__backdrop"
            aria-label="Cerrar diálogo"
            onClick={() => cerrar(false)}
          />
          <div
            className={`confirm-dialog__card confirm-dialog__card--${dialog.variante}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            aria-describedby={descId}
          >
            <div className="confirm-dialog__icon" aria-hidden="true">
              <Icon nombre="alert" tamano={22} />
            </div>
            <div className="confirm-dialog__body">
              <h2 id={tituloId} className="confirm-dialog__title">
                {dialog.titulo}
              </h2>
              <p id={descId} className="confirm-dialog__message">
                {dialog.mensaje}
              </p>
              {dialog.detalle ? <p className="confirm-dialog__detail">{dialog.detalle}</p> : null}
            </div>
            <div className="confirm-dialog__actions">
              <button type="button" className="btn btn-outline-secondary" onClick={() => cerrar(false)}>
                {dialog.cancelarLabel}
              </button>
              <button
                ref={confirmarBtnRef}
                type="button"
                className={`btn ${dialog.variante === 'warning' ? 'btn-primary' : 'btn-danger'} confirm-dialog__confirm`}
                onClick={() => cerrar(true)}
              >
                {dialog.confirmarLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue['confirmar'] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx.confirmar;
}
