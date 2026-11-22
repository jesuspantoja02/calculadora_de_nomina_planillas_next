import type { AfpEntidad } from '../../empleados/domain/empleado.ts';
import { AFP_ENTIDADES } from '../../../shared/config/catalogos.ts';

export type TipoComisionAfp = 'flujo' | 'saldo';

/** Tasas SBS por administradora (editables en configuración). */
export interface TasasAfp {
  aportePct: number;
  primaSeguroPct: number;
  /** Comisión mensual sobre remuneración (esquema flujo). */
  comisionFlujoPct: number;
  /** Comisión anual sobre el fondo (esquema saldo; no se descuenta del sueldo). */
  comisionSaldoPct: number;
}

export type AfpTasasMap = Record<AfpEntidad, TasasAfp>;

/**
 * Parámetros de planilla. Las tasas AFP son por administradora (SBS, referencia oct 2026).
 * La comisión sobre saldo no sale del sueldo: se cobra al fondo.
 */
export interface Configuracion {
  afpTasas: AfpTasasMap;
  /** Esquema de comisión aplicado al calcular la boleta (flujo descuenta del sueldo; saldo no). */
  tipoComisionAfp: TipoComisionAfp;
  /** Tope de remuneración asegurable (SBS). */
  remuneracionMaximaAsegurable: number;
  tasaOnp: number;
  /** EsSalud a cargo del empleador. */
  tasaEssalud: number;
  rmv: number;
  uit: number;
  adelantoQuincenalPct: number;
  aplicarQuintaCategoria: boolean;
  empresaNombre: string;
  empresaRuc: string;
  empresaEslogan: string;
  empresaLogoUrl: string;
}

/** Valores SBS de referencia (devengue octubre 2026). */
export const AFP_TASAS_POR_DEFECTO: AfpTasasMap = {
  Habitat: { aportePct: 10, primaSeguroPct: 1.37, comisionFlujoPct: 1.47, comisionSaldoPct: 1.25 },
  Integra: { aportePct: 10, primaSeguroPct: 1.37, comisionFlujoPct: 1.55, comisionSaldoPct: 0.78 },
  Prima: { aportePct: 10, primaSeguroPct: 1.37, comisionFlujoPct: 1.6, comisionSaldoPct: 1.25 },
  Profuturo: { aportePct: 10, primaSeguroPct: 1.37, comisionFlujoPct: 1.69, comisionSaldoPct: 0.68 },
};

export const CONFIG_POR_DEFECTO: Readonly<Configuracion> = Object.freeze({
  afpTasas: structuredClone(AFP_TASAS_POR_DEFECTO),
  tipoComisionAfp: 'flujo' as TipoComisionAfp,
  remuneracionMaximaAsegurable: 12_732.7,
  tasaOnp: 13,
  tasaEssalud: 9,
  rmv: 1230,
  uit: 5500,
  adelantoQuincenalPct: 40,
  aplicarQuintaCategoria: true,
  empresaNombre: 'CNJ ESTUDIO CONTABLE',
  empresaRuc: '20123456789',
  empresaEslogan: 'Solidez contable, confianza en cada cifra',
  empresaLogoUrl: '',
});

/** Formatos antiguos guardados en SQLite. */
type LegacyJson = {
  aporteAfpPct?: number;
  primaSeguroPct?: number;
  comisionFlujoPct?: number;
  afpTasas?: Partial<Record<AfpEntidad, Partial<TasasAfp> & Record<string, unknown>>>;
  /** Nombre antiguo del mapa por AFP. */
  tasasAfp?: Partial<Record<AfpEntidad, Record<string, unknown>>>;
  tipoComisionAfp?: TipoComisionAfp;
  remuneracionMaximaAsegurable?: number;
  tasaOnp?: number;
  tasaEssalud?: number;
  rmv?: number;
  uit?: number;
  adelantoQuincenalPct?: number;
  aplicarQuintaCategoria?: boolean;
  empresaNombre?: string;
  empresaRuc?: string;
  empresaEslogan?: string;
  empresaLogoUrl?: string;
};

function tasasPorDefecto(): AfpTasasMap {
  return structuredClone(AFP_TASAS_POR_DEFECTO);
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Acepta claves nuevas (`aportePct`) o legacy (`aporteAfpPct`). */
function leerTasasParciales(parcial: Record<string, unknown> | undefined, def: TasasAfp): TasasAfp {
  if (!parcial) return { ...def };
  return {
    aportePct: num(parcial.aportePct ?? parcial.aporteAfpPct, def.aportePct),
    primaSeguroPct: num(parcial.primaSeguroPct, def.primaSeguroPct),
    comisionFlujoPct: num(parcial.comisionFlujoPct, def.comisionFlujoPct),
    comisionSaldoPct: num(parcial.comisionSaldoPct, def.comisionSaldoPct),
  };
}

/** Une defaults + JSON guardado y migra formatos antiguos a `afpTasas`. */
export function normalizarConfiguracion(guardada: LegacyJson = {}): Configuracion {
  const afpTasas = tasasPorDefecto();
  const mapaLegacy = guardada.afpTasas ?? guardada.tasasAfp;

  if (mapaLegacy) {
    for (const ent of AFP_ENTIDADES) {
      afpTasas[ent] = leerTasasParciales(mapaLegacy[ent] as Record<string, unknown> | undefined, AFP_TASAS_POR_DEFECTO[ent]);
    }
  } else if (
    guardada.aporteAfpPct !== undefined ||
    guardada.primaSeguroPct !== undefined ||
    guardada.comisionFlujoPct !== undefined
  ) {
    for (const ent of AFP_ENTIDADES) {
      const def = AFP_TASAS_POR_DEFECTO[ent];
      afpTasas[ent] = {
        aportePct: num(guardada.aporteAfpPct, def.aportePct),
        primaSeguroPct: num(guardada.primaSeguroPct, def.primaSeguroPct),
        comisionFlujoPct: num(guardada.comisionFlujoPct, def.comisionFlujoPct),
        comisionSaldoPct: def.comisionSaldoPct,
      };
    }
  }

  return {
    afpTasas,
    tipoComisionAfp: guardada.tipoComisionAfp === 'saldo' ? 'saldo' : 'flujo',
    remuneracionMaximaAsegurable: num(guardada.remuneracionMaximaAsegurable, CONFIG_POR_DEFECTO.remuneracionMaximaAsegurable),
    tasaOnp: num(guardada.tasaOnp, CONFIG_POR_DEFECTO.tasaOnp),
    tasaEssalud: num(guardada.tasaEssalud, CONFIG_POR_DEFECTO.tasaEssalud),
    rmv: num(guardada.rmv, CONFIG_POR_DEFECTO.rmv),
    uit: num(guardada.uit, CONFIG_POR_DEFECTO.uit),
    adelantoQuincenalPct: num(guardada.adelantoQuincenalPct, CONFIG_POR_DEFECTO.adelantoQuincenalPct),
    aplicarQuintaCategoria: guardada.aplicarQuintaCategoria ?? CONFIG_POR_DEFECTO.aplicarQuintaCategoria,
    empresaNombre: typeof guardada.empresaNombre === 'string' ? guardada.empresaNombre : CONFIG_POR_DEFECTO.empresaNombre,
    empresaRuc: typeof guardada.empresaRuc === 'string' ? guardada.empresaRuc : CONFIG_POR_DEFECTO.empresaRuc,
    empresaEslogan: typeof guardada.empresaEslogan === 'string' ? guardada.empresaEslogan : CONFIG_POR_DEFECTO.empresaEslogan,
    empresaLogoUrl: typeof guardada.empresaLogoUrl === 'string' ? guardada.empresaLogoUrl : CONFIG_POR_DEFECTO.empresaLogoUrl,
  };
}

export function tasasDeAfp(config: Configuracion, afp: AfpEntidad | null | undefined): TasasAfp {
  if (afp && config.afpTasas[afp]) return config.afpTasas[afp];
  return config.afpTasas.Integra;
}
