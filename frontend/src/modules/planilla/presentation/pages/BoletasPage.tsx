import { useEffect, useState } from 'react';
import { useConfirm } from '../../../../core/notifications/ConfirmDialogContext';
import { useToast } from '../../../../core/notifications/ToastContext';
import { descargarBoletaPdf, descargarBoletasPdf } from '../../../../shared/export/boletasPdf';
import { enmascararDni, formatoFecha, formatoMoneda, modalidadLabel } from '../../../../shared/formatters';
import { useDebouncedValue } from '../../../../shared/hooks/useDebouncedValue';
import { EntradaInput } from '../../../../shared/ui/EntradaInput';
import { Icon } from '../../../../shared/ui/Icon';
import { PageHeader } from '../../../../shared/ui/PageHeader';
import { Boleta } from '../components/Boleta';
import type { Pago } from '../../domain/pago.model';
import { useBoletasStore } from '../hooks/useBoletasStore';

export function BoletasPage() {
  const store = useBoletasStore();
  const toast = useToast();
  const confirmar = useConfirm();
  const [fecha, setFecha] = useState('');
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue({ fecha, q }, 250);

  const { filtrar } = store;

  useEffect(() => {
    const f: { fecha?: string; q?: string } = {};
    if (debounced.fecha) f.fecha = debounced.fecha;
    if (debounced.q) f.q = debounced.q;
    filtrar(f);
  }, [debounced, filtrar]);

  const eliminar = async (p: Pago) => {
    const ok = await confirmar({
      titulo: 'Eliminar boleta',
      mensaje: `¿Confirmas eliminar la boleta de ${p.nombre}?`,
      detalle: `Fecha de pago: ${formatoFecha(p.fechaPago)}. Esta acción no se puede deshacer.`,
      confirmarLabel: 'Eliminar boleta',
      cancelarLabel: 'Conservar',
      variante: 'danger',
    });
    if (ok) void store.eliminar(p);
  };

  const pdfSeleccionada = () => {
    if (!store.seleccionada) {
      toast.error('Selecciona una boleta para descargar el PDF.');
      return;
    }
    descargarBoletaPdf(store.seleccionada);
    toast.exito(`PDF de ${store.seleccionada.nombre} descargado.`);
  };

  const pdfListado = () => {
    if (store.items.length === 0) {
      toast.error('No hay boletas en el listado filtrado.');
      return;
    }
    descargarBoletasPdf(store.items);
    toast.exito(`PDF con ${store.items.length} boleta(s) descargado.`);
  };

  return (
    <>
      <PageHeader
        titulo="Boletas de pago"
        descripcion="Historial de boletas emitidas. Filtra por fecha, nombre o DNI."
        acciones={
          <div className="export-bar">
            <button
              type="button"
              className="btn btn-outline-secondary btn-export d-inline-flex align-items-center gap-2"
              onClick={pdfListado}
              disabled={store.items.length === 0}
            >
              <Icon nombre="download" /> PDF del listado
            </button>
            <button
              type="button"
              className="btn btn-primary btn-export d-inline-flex align-items-center gap-2"
              onClick={pdfSeleccionada}
              disabled={!store.seleccionada}
            >
              <Icon nombre="download" /> PDF seleccionada
            </button>
          </div>
        }
      />

      <form className="panel mb-4" onSubmit={(e) => e.preventDefault()}>
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label" htmlFor="fecha">
              Fecha de pago
            </label>
            <input id="fecha" type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="q">
              Nombre o DNI
            </label>
            <EntradaInput
              id="q"
              tipo="busqueda"
              className="form-control"
              value={q}
              onChange={setQ}
              maxLength={60}
              placeholder="Buscar…"
              autoComplete="off"
            />
          </div>
          <div className="col-md-3">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setFecha('');
                setQ('');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </form>

      <div className="row g-4">
        <section className="col-xl-5">
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">
                Boletas emitidas <span className="count">{store.items.length}</span>
              </h2>
            </div>
            {store.items.length === 0 ? (
              <p className="empty">No hay boletas que coincidan con los filtros.</p>
            ) : (
              store.items.map((p) => (
                <div
                  key={p.id}
                  className={`row-item clickable${store.seleccionada?.id === p.id ? ' selected' : ''}`}
                  onClick={() => store.seleccionar(p)}
                  onKeyDown={(e) => e.key === 'Enter' && store.seleccionar(p)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold text-truncate">{p.nombre}</div>
                    <small className="text-secondary">
                      DNI {enmascararDni(p.dni)} · {formatoFecha(p.fechaPago)}
                    </small>
                  </div>
                  <div className="text-end">
                    <div className="fw-semibold">{formatoMoneda(p.neto)}</div>
                    <span className="badge text-bg-secondary">{modalidadLabel(p.modalidad)}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    aria-label={`Descargar PDF de ${p.nombre}`}
                    title="Descargar PDF"
                    onClick={(e) => {
                      e.stopPropagation();
                      descargarBoletaPdf(p);
                      toast.exito(`PDF de ${p.nombre} descargado.`);
                    }}
                  >
                    <Icon nombre="download" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    aria-label={`Eliminar boleta de ${p.nombre}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminar(p);
                    }}
                  >
                    <Icon nombre="trash" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="col-xl-7">
          {store.seleccionada ? (
            <Boleta boleta={store.seleccionada} />
          ) : (
            <div className="panel empty">Selecciona una boleta de la lista para verla.</div>
          )}
        </section>
      </div>
    </>
  );
}
