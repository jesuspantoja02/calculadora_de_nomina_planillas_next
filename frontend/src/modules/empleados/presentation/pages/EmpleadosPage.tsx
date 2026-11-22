import { useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useConfirm } from '../../../../core/notifications/ConfirmDialogContext';
import { useToast } from '../../../../core/notifications/ToastContext';
import { descargarEmpleadosCsv, descargarEmpleadosExcel } from '../../../../shared/export/empleadosExport';
import { Icon } from '../../../../shared/ui/Icon';
import { PageHeader } from '../../../../shared/ui/PageHeader';
import { EmpleadoFiltros, pensionInicialDesdeUrl } from '../components/EmpleadoFiltros';
import { EmpleadoForm } from '../components/EmpleadoForm';
import { EmpleadoLista } from '../components/EmpleadoLista';
import type { Empleado } from '../../domain/empleado.model';
import { useEmpleadosStore } from '../hooks/useEmpleadosStore';

function queryStr(value: string | string[] | undefined): string | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function EmpleadosPage() {
  const store = useEmpleadosStore();
  const toast = useToast();
  const confirmar = useConfirm();
  const router = useRouter();
  const limpiarFormRef = useRef<(() => void) | null>(null);
  const pensionInicial = pensionInicialDesdeUrl(queryStr(router.query.regimen), queryStr(router.query.afp));

  const onGuardar = useCallback(
    async (dto: Parameters<typeof store.guardar>[0]) => {
      const ok = await store.guardar(dto);
      if (ok) limpiarFormRef.current?.();
    },
    [store],
  );

  const onEliminar = async (e: Empleado) => {
    const ok = await confirmar({
      titulo: 'Eliminar empleado',
      mensaje: `¿Confirmas eliminar a ${e.nombre} del registro de planilla?`,
      detalle: 'Las boletas ya emitidas se conservan en el historial.',
      confirmarLabel: 'Eliminar empleado',
      cancelarLabel: 'Conservar',
      variante: 'danger',
    });
    if (ok) void store.eliminar(e);
  };

  const exportar = async (formato: 'csv' | 'excel') => {
    if (store.items.length === 0) {
      toast.error('No hay empleados en la lista filtrada para exportar.');
      return;
    }
    try {
      if (formato === 'csv') {
        await descargarEmpleadosCsv(store.items);
      } else {
        await descargarEmpleadosExcel(store.items);
      }
      toast.exito(
        formato === 'csv'
          ? `CSV descargado (${store.items.length} empleados).`
          : `Excel descargado (${store.items.length} empleados).`,
      );
    } catch {
      toast.error(formato === 'csv' ? 'No se pudo generar el CSV.' : 'No se pudo generar el Excel.');
    }
  };

  return (
    <>
      <PageHeader
        titulo="Empleados"
        descripcion="Alta de personal y lista de trabajadores registrados."
        acciones={
          <div className="export-bar">
            <button
              type="button"
              className="btn btn-outline-secondary btn-export d-inline-flex align-items-center gap-2"
              onClick={() => exportar('csv')}
              disabled={store.cargando || store.items.length === 0}
            >
              <Icon nombre="download" /> CSV
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-export d-inline-flex align-items-center gap-2"
              onClick={() => exportar('excel')}
              disabled={store.cargando || store.items.length === 0}
            >
              <Icon nombre="download" /> Excel
            </button>
            <a className="btn btn-primary" href="#alta-empleado">
              Nuevo empleado
            </a>
          </div>
        }
      />

      <div className="row g-4">
        <section className="col-xl-5" id="alta-empleado">
          <EmpleadoForm
            empleado={store.editando}
            guardando={store.guardando}
            onGuardar={onGuardar}
            onCancelar={() => store.editar(null)}
            onLimpiarRef={(fn) => {
              limpiarFormRef.current = fn;
            }}
          />
        </section>

        <section className="col-xl-7">
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">
                Empleados registrados <span className="count">{store.items.length}</span>
              </h2>
            </div>
            <EmpleadoFiltros pensionInicial={pensionInicial} onCambio={store.filtrar} />
            <EmpleadoLista
              items={store.items}
              cargando={store.cargando}
              editandoId={store.editando?.id ?? null}
              onEditar={store.editar}
              onEliminar={onEliminar}
            />
          </div>
        </section>
      </div>
    </>
  );
}
