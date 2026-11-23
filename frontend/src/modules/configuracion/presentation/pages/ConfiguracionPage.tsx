import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { container } from '../../../../composition/container';
import { useConfirm } from '../../../../core/notifications/ConfirmDialogContext';
import { useToast } from '../../../../core/notifications/ToastContext';
import { formatoMoneda } from '../../../../shared/formatters';
import { AFP_ENTIDADES, type AfpEntidad } from '../../../../shared/models/tipos';
import { useApiAction } from '../../../../shared/presentation/useApiAction';
import { CompanyLogo } from '../../../../shared/ui/CompanyLogo';
import { EntradaInput } from '../../../../shared/ui/EntradaInput';
import { PageHeader } from '../../../../shared/ui/PageHeader';
import { claseValidacion } from '../../../../shared/validators/formularios';
import type { AfpTasasMap, Configuracion, TasasAfp, TipoComisionAfp } from '../../domain/configuracion.model';

type CampoTasa = keyof TasasAfp;

interface FormState {
  empresaNombre: string;
  empresaRuc: string;
  empresaEslogan: string;
  empresaLogoUrl: string;
  afpTasas: Record<AfpEntidad, Record<CampoTasa, string>>;
  tipoComisionAfp: TipoComisionAfp;
  remuneracionMaximaAsegurable: string;
  tasaOnp: string;
  tasaEssalud: string;
  rmv: string;
  uit: string;
  adelantoQuincenalPct: string;
  aplicarQuintaCategoria: boolean;
}

const TASAS_FALLBACK: TasasAfp = {
  aportePct: 10,
  primaSeguroPct: 1.37,
  comisionFlujoPct: 1.55,
  comisionSaldoPct: 0.78,
};

function tasasATexto(t: Partial<TasasAfp> | Record<string, unknown> | undefined): Record<CampoTasa, string> {
  const raw = t ?? {};
  const aporte = raw.aportePct ?? (raw as { aporteAfpPct?: number }).aporteAfpPct ?? TASAS_FALLBACK.aportePct;
  const prima = raw.primaSeguroPct ?? TASAS_FALLBACK.primaSeguroPct;
  const flujo = raw.comisionFlujoPct ?? TASAS_FALLBACK.comisionFlujoPct;
  const saldo = raw.comisionSaldoPct ?? TASAS_FALLBACK.comisionSaldoPct;
  return {
    aportePct: String(aporte),
    primaSeguroPct: String(prima),
    comisionFlujoPct: String(flujo),
    comisionSaldoPct: String(saldo),
  };
}

/** Respuesta del API con nombres de campos legacy opcionales. */
type ConfiguracionConLegacy = Configuracion & {
  tasasAfp?: Configuracion['afpTasas'];
  aporteAfpPct?: number;
  primaSeguroPct?: number;
  comisionFlujoPct?: number;
};

/** Acepta `afpTasas` (nuevo) o `tasasAfp` / planos legacy para no romper la pantalla. */
function desdeConfig(c: ConfiguracionConLegacy): FormState {
  const mapa =
    (c.afpTasas as Configuracion['afpTasas'] | undefined) ??
    (c.tasasAfp as Configuracion['afpTasas'] | undefined) ??
    null;
  const afpTasas = {} as FormState['afpTasas'];
  for (const ent of AFP_ENTIDADES) {
    afpTasas[ent] = tasasATexto(mapa?.[ent] as Partial<TasasAfp> | undefined);
  }
  // Si el API aún manda tasas planas globales, rellena todas las AFP.
  if (!mapa && (c.aporteAfpPct != null || c.primaSeguroPct != null || c.comisionFlujoPct != null)) {
    const plano = tasasATexto({
      aportePct: c.aporteAfpPct as number | undefined,
      primaSeguroPct: c.primaSeguroPct as number | undefined,
      comisionFlujoPct: c.comisionFlujoPct as number | undefined,
    });
    for (const ent of AFP_ENTIDADES) afpTasas[ent] = { ...plano };
  }
  return {
    empresaNombre: String(c.empresaNombre ?? ''),
    empresaRuc: String(c.empresaRuc ?? ''),
    empresaEslogan: String(c.empresaEslogan ?? ''),
    empresaLogoUrl: String(c.empresaLogoUrl ?? ''),
    afpTasas,
    tipoComisionAfp: c.tipoComisionAfp === 'saldo' ? 'saldo' : 'flujo',
    remuneracionMaximaAsegurable: String(c.remuneracionMaximaAsegurable ?? 0),
    tasaOnp: String(c.tasaOnp ?? 13),
    tasaEssalud: String(c.tasaEssalud ?? 9),
    rmv: String(c.rmv ?? 0),
    uit: String(c.uit ?? 1),
    adelantoQuincenalPct: String(c.adelantoQuincenalPct ?? 40),
    aplicarQuintaCategoria: Boolean(c.aplicarQuintaCategoria),
  };
}

function pctOk(v: string): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

function Bloque({
  titulo,
  descripcion,
  badge,
  danger,
  children,
}: {
  titulo: string;
  descripcion: string;
  badge?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`config-block${danger ? ' config-block--danger' : ''}`}>
      <header className="config-block__head">
        <div>
          <h2 className="config-block__title">{titulo}</h2>
          <p className="config-block__desc">{descripcion}</p>
        </div>
        {badge ? <span className="config-block__badge">{badge}</span> : null}
      </header>
      {children}
    </section>
  );
}

const COLUMNAS_TASA: { key: CampoTasa; label: string; hint: string }[] = [
  { key: 'aportePct', label: 'Aporte (%)', hint: 'Al fondo' },
  { key: 'primaSeguroPct', label: 'Prima (%)', hint: 'Seguro' },
  { key: 'comisionFlujoPct', label: 'Com. flujo (%)', hint: 'Sobre sueldo' },
  { key: 'comisionSaldoPct', label: 'Com. saldo (%)', hint: 'Anual fondo' },
];

export function ConfiguracionPage() {
  const toast = useToast();
  const confirmar = useConfirm();
  const run = useApiAction();
  const [form, setForm] = useState<FormState | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [touched, setTouched] = useState(false);

  const cargarConfig = () => {
    setCargando(true);
    setErrorCarga(false);
    void container.configuracion
      .obtener()
      .then((c) => setForm(desdeConfig(c)))
      .catch(() => {
        setForm(null);
        setErrorCarga(true);
      })
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cargando) {
    return (
      <>
        <PageHeader titulo="Configuración" descripcion="Cargando parámetros…" />
        <div className="panel empty">Cargando…</div>
      </>
    );
  }

  if (errorCarga || !form) {
    return (
      <>
        <PageHeader titulo="Configuración" descripcion="No se pudieron cargar los parámetros." />
        <div className="panel empty">
          <p className="mb-3">Revisa que la sesión siga activa y que el backend esté en marcha.</p>
          <button type="button" className="btn btn-primary" onClick={cargarConfig}>
            Reintentar
          </button>
        </div>
      </>
    );
  }

  const rucOk = /^\d{11}$/.test(form.empresaRuc);
  const nombreOk = form.empresaNombre.length >= 2;
  const afpOk = AFP_ENTIDADES.every((ent) => COLUMNAS_TASA.every((col) => pctOk(form.afpTasas[ent][col.key])));
  const n = (v: string) => Number(v);
  const valid =
    nombreOk &&
    rucOk &&
    afpOk &&
    pctOk(form.tasaOnp) &&
    pctOk(form.tasaEssalud) &&
    pctOk(form.adelantoQuincenalPct) &&
    Number.isFinite(n(form.remuneracionMaximaAsegurable)) &&
    n(form.remuneracionMaximaAsegurable) >= 0 &&
    Number.isFinite(n(form.rmv)) &&
    n(form.rmv) >= 0 &&
    Number.isFinite(n(form.uit)) &&
    n(form.uit) >= 1;

  const rmv = Number.isFinite(n(form.rmv)) ? n(form.rmv) : 0;
  const essalud = Number.isFinite(n(form.tasaEssalud)) ? n(form.tasaEssalud) : 0;
  const uit = Number.isFinite(n(form.uit)) ? n(form.uit) : 0;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) {
      toast.error('Revisa los campos marcados antes de guardar.');
      return;
    }
    const afpTasas = {} as AfpTasasMap;
    for (const ent of AFP_ENTIDADES) {
      const t = form.afpTasas[ent];
      afpTasas[ent] = {
        aportePct: n(t.aportePct),
        primaSeguroPct: n(t.primaSeguroPct),
        comisionFlujoPct: n(t.comisionFlujoPct),
        comisionSaldoPct: n(t.comisionSaldoPct),
      };
    }
    const config: Configuracion = {
      empresaNombre: form.empresaNombre,
      empresaRuc: form.empresaRuc,
      empresaEslogan: form.empresaEslogan.trim(),
      empresaLogoUrl: form.empresaLogoUrl,
      afpTasas,
      tipoComisionAfp: form.tipoComisionAfp,
      remuneracionMaximaAsegurable: n(form.remuneracionMaximaAsegurable),
      tasaOnp: n(form.tasaOnp),
      tasaEssalud: n(form.tasaEssalud),
      rmv: n(form.rmv),
      uit: n(form.uit),
      adelantoQuincenalPct: n(form.adelantoQuincenalPct),
      aplicarQuintaCategoria: form.aplicarQuintaCategoria,
    };
    setGuardando(true);
    const ok = await run(() => container.configuracion.actualizar(config));
    setGuardando(false);
    if (ok) toast.exito('Configuración guardada.');
  };

  const reiniciar = async () => {
    const acepta = await confirmar({
      titulo: 'Reiniciar datos operativos',
      mensaje: '¿Confirmas borrar todos los empleados y boletas guardadas?',
      detalle: 'La configuración de tasas y datos de empresa se conserva. Esta acción no se puede deshacer.',
      confirmarLabel: 'Borrar datos',
      cancelarLabel: 'Conservar',
      variante: 'warning',
    });
    if (!acepta) return;
    const ok = await run(() => container.configuracion.reiniciarDatos());
    if (ok) toast.exito('Datos borrados.');
  };

  const setTasa = (ent: AfpEntidad, campo: CampoTasa, valor: string) => {
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        afpTasas: {
          ...f.afpTasas,
          [ent]: { ...f.afpTasas[ent], [campo]: valor },
        },
      };
    });
  };

  const elegirLogo = (file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      toast.error('Usa una imagen PNG, JPEG o WebP.');
      return;
    }
    if (file.size > 400_000) {
      toast.error('El logo no debe superar 400 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === 'string' ? reader.result : '';
      setForm((f) => (f ? { ...f, empresaLogoUrl: data } : f));
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader
        titulo="Configuración"
        descripcion="Solo administradores, jefes y gerentes. Las tasas AFP se configuran por administradora (Integra, Prima, Profuturo y Habitat)."
        eyebrow="Sistema · Acceso restringido"
      />

      <form className="config-page" onSubmit={guardar} noValidate>
        <Bloque
          titulo="Identidad de la empresa"
          descripcion="Nombre, RUC, eslogan y logo que se muestran en el panel de inicio y en las boletas."
          badge="Empresa"
        >
          <div className="row">
            <div className="col-lg-8 mb-3">
              <label className="form-label" htmlFor="empresaNombre">
                Nombre comercial
              </label>
              <EntradaInput
                id="empresaNombre"
                tipo="empresa"
                className={`form-control ${claseValidacion(nombreOk, !nombreOk, touched, touched)}`}
                value={form.empresaNombre}
                onChange={(v) => setForm((f) => (f ? { ...f, empresaNombre: v } : f))}
                maxLength={60}
                autoComplete="organization"
              />
            </div>
            <div className="col-lg-4 mb-3">
              <label className="form-label" htmlFor="empresaRuc">
                RUC (11 dígitos)
              </label>
              <EntradaInput
                id="empresaRuc"
                tipo="ruc"
                className={`form-control ${claseValidacion(rucOk, !rucOk, touched, touched)}`}
                value={form.empresaRuc}
                onChange={(v) => setForm((f) => (f ? { ...f, empresaRuc: v } : f))}
                maxLength={11}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="row">
            <div className="col-lg-8 mb-3">
              <label className="form-label" htmlFor="empresaEslogan">
                Eslogan
              </label>
              <EntradaInput
                id="empresaEslogan"
                tipo="empresa"
                className="form-control"
                value={form.empresaEslogan}
                onChange={(v) => setForm((f) => (f ? { ...f, empresaEslogan: v } : f))}
                maxLength={120}
                autoComplete="off"
                placeholder="Ej. Planillas claras, pagos seguros"
              />
            </div>
            <div className="col-lg-4 mb-3">
              <span className="form-label d-block">Logo</span>
              <div className="config-logo-row">
                <CompanyLogo nombre={form.empresaNombre} logoUrl={form.empresaLogoUrl} size={64} />
                <div className="d-flex flex-column gap-2">
                  <label className="btn btn-secondary btn-sm mb-0">
                    Subir imagen
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="visually-hidden"
                      onChange={(e) => {
                        elegirLogo(e.target.files?.[0] ?? null);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {form.empresaLogoUrl ? (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-secondary"
                      onClick={() => setForm((f) => (f ? { ...f, empresaLogoUrl: '' } : f))}
                    >
                      Quitar logo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Bloque>

        <Bloque
          titulo="AFP por administradora"
          descripcion="Cada AFP tiene sus propias tasas SBS. El cálculo de la boleta usa la administradora del trabajador. La comisión sobre saldo no se descuenta del sueldo."
          badge="Pensión"
        >
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="tipoComisionAfp">
                Esquema de comisión (boleta)
              </label>
              <select
                id="tipoComisionAfp"
                className="form-select"
                value={form.tipoComisionAfp}
                onChange={(e) => setForm((f) => (f ? { ...f, tipoComisionAfp: e.target.value as TipoComisionAfp } : f))}
              >
                <option value="flujo">Flujo — se descuenta del sueldo</option>
                <option value="saldo">Saldo — se cobra al fondo (0 % en boleta)</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="remuneracionMaximaAsegurable">
                Remuneración máxima asegurable (S/)
              </label>
              <EntradaInput
                id="remuneracionMaximaAsegurable"
                tipo="decimal"
                limites={{ max: 1_000_000, decimales: 2 }}
                className="form-control"
                value={form.remuneracionMaximaAsegurable}
                onChange={(v) => setForm((f) => (f ? { ...f, remuneracionMaximaAsegurable: v } : f))}
                inputMode="decimal"
                autoComplete="off"
              />
              <div className="form-text">Tope SBS para aporte, prima y comisión por flujo.</div>
            </div>
          </div>

          <div className="table-responsive config-afp-table-wrap">
            <table className="table config-afp-table mb-0">
              <thead>
                <tr>
                  <th scope="col">Administradora</th>
                  {COLUMNAS_TASA.map((col) => (
                    <th key={col.key} scope="col">
                      <span className="d-block">{col.label}</span>
                      <span className="config-afp-table__hint">{col.hint}</span>
                    </th>
                  ))}
                  <th scope="col">Total flujo</th>
                </tr>
              </thead>
              <tbody>
                {AFP_ENTIDADES.map((ent) => {
                  const t = form.afpTasas[ent];
                  const totalFlujo =
                    (pctOk(t.aportePct) ? n(t.aportePct) : 0) +
                    (pctOk(t.primaSeguroPct) ? n(t.primaSeguroPct) : 0) +
                    (pctOk(t.comisionFlujoPct) ? n(t.comisionFlujoPct) : 0);
                  return (
                    <tr key={ent}>
                      <th scope="row">
                        <span className="config-afp-name">AFP {ent}</span>
                      </th>
                      {COLUMNAS_TASA.map((col) => {
                        const ok = pctOk(t[col.key]);
                        return (
                          <td key={col.key}>
                            <EntradaInput
                              id={`afp-${ent}-${col.key}`}
                              tipo="decimal"
                              limites={{ max: 100, decimales: 2 }}
                              className={`form-control form-control-sm ${claseValidacion(ok, !ok, touched, touched)}`}
                              value={t[col.key]}
                              onChange={(v) => setTasa(ent, col.key, v)}
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`${ent} ${col.label}`}
                            />
                          </td>
                        );
                      })}
                      <td className="config-afp-total">{totalFlujo.toFixed(2)} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Bloque>

        <Bloque
          titulo="ONP y EsSalud"
          descripcion="ONP se descuenta al afiliado. EsSalud es aporte del empleador; en EPS la bonificación de gratificación usa el 75 %."
          badge="Aportes"
        >
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label" htmlFor="tasaOnp">
                ONP (%)
              </label>
              <EntradaInput
                id="tasaOnp"
                tipo="decimal"
                limites={{ max: 100, decimales: 2 }}
                className="form-control"
                value={form.tasaOnp}
                onChange={(v) => setForm((f) => (f ? { ...f, tasaOnp: v } : f))}
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label" htmlFor="tasaEssalud">
                EsSalud empleador (%)
              </label>
              <EntradaInput
                id="tasaEssalud"
                tipo="decimal"
                limites={{ max: 100, decimales: 2 }}
                className="form-control"
                value={form.tasaEssalud}
                onChange={(v) => setForm((f) => (f ? { ...f, tasaEssalud: v } : f))}
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <div className="col-md-4 mb-3 d-flex align-items-stretch">
              <div className="config-hint w-100">
                <span className="config-hint__label">Equivalente EPS (75 %)</span>
                <span className="config-hint__value">{(essalud * 0.75).toFixed(2)} %</span>
                <span className="config-hint__note">Referencia para gratificación con EPS</span>
              </div>
            </div>
          </div>
        </Bloque>

        <Bloque
          titulo="Parámetros legales (S/)"
          descripcion="RMV y UIT vigentes. La asignación familiar se calcula como el 10 % de la RMV (Ley 25129)."
          badge="Normativa"
        >
          <div className="config-hint-grid">
            <div className="config-hint">
              <span className="config-hint__label">Asignación familiar</span>
              <span className="config-hint__value">{formatoMoneda(rmv * 0.1)}</span>
              <span className="config-hint__note">10 % de la RMV</span>
            </div>
            <div className="config-hint">
              <span className="config-hint__label">Deducción 7 UIT</span>
              <span className="config-hint__value">{formatoMoneda(uit * 7)}</span>
              <span className="config-hint__note">Base anual de 5.ª categoría</span>
            </div>
            <div className="config-hint">
              <span className="config-hint__label">Tope asegurable</span>
              <span className="config-hint__value">{formatoMoneda(n(form.remuneracionMaximaAsegurable) || 0)}</span>
              <span className="config-hint__note">AFP / prima</span>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label" htmlFor="rmv">
                Remuneración mínima vital (RMV)
              </label>
              <EntradaInput
                id="rmv"
                tipo="decimal"
                limites={{ max: 100_000, decimales: 2 }}
                className="form-control"
                value={form.rmv}
                onChange={(v) => setForm((f) => (f ? { ...f, rmv: v } : f))}
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label" htmlFor="uit">
                Unidad impositiva tributaria (UIT)
              </label>
              <EntradaInput
                id="uit"
                tipo="entero"
                limites={{ min: 1, max: 100_000 }}
                className="form-control"
                value={form.uit}
                onChange={(v) => setForm((f) => (f ? { ...f, uit: v } : f))}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </div>
        </Bloque>

        <Bloque
          titulo="Política de pago"
          descripcion="Adelanto quincenal y retención de quinta categoría en el fin de mes."
          badge="Planilla"
        >
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label" htmlFor="adelantoQuincenalPct">
                Adelanto quincenal (%)
              </label>
              <EntradaInput
                id="adelantoQuincenalPct"
                tipo="decimal"
                limites={{ max: 100, decimales: 2 }}
                className="form-control"
                value={form.adelantoQuincenalPct}
                onChange={(v) => setForm((f) => (f ? { ...f, adelantoQuincenalPct: v } : f))}
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <div className="col-md-6 mb-3">
              <div className="config-check h-100">
                <div className="form-check mb-0">
                  <input
                    id="quinta"
                    type="checkbox"
                    className="form-check-input"
                    checked={form.aplicarQuintaCategoria}
                    onChange={(e) => setForm((f) => (f ? { ...f, aplicarQuintaCategoria: e.target.checked } : f))}
                  />
                  <label className="form-check-label" htmlFor="quinta">
                    Retener 5.ª categoría en el fin de mes
                  </label>
                </div>
              </div>
            </div>
          </div>
        </Bloque>

        <Bloque
          titulo="Mantenimiento"
          descripcion="Borra empleados y boletas. No elimina usuarios ni esta configuración."
          badge="Peligro"
          danger
        >
          <button type="button" className="btn btn-outline-danger" onClick={() => void reiniciar()}>
            Borrar empleados y boletas
          </button>
        </Bloque>

        <div className="config-actions">
          <button type="submit" className="btn btn-primary" disabled={!valid || guardando}>
            {guardando ? 'Guardando…' : 'Guardar configuración'}
          </button>
          {!valid && touched ? (
            <p className="config-actions__note">Hay campos inválidos. Corrige empresa, AFP u otros parámetros.</p>
          ) : (
            <p className="config-actions__note">Los cambios aplican a las próximas boletas según la AFP de cada trabajador.</p>
          )}
        </div>
      </form>
    </>
  );
}
