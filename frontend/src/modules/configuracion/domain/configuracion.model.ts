import type { AfpEntidad } from '../../../shared/models/tipos';

export type TipoComisionAfp = 'flujo' | 'saldo';

export interface TasasAfp {
  aportePct: number;
  primaSeguroPct: number;
  comisionFlujoPct: number;
  comisionSaldoPct: number;
}

export type AfpTasasMap = Record<AfpEntidad, TasasAfp>;

export interface Configuracion {
  afpTasas: AfpTasasMap;
  tipoComisionAfp: TipoComisionAfp;
  remuneracionMaximaAsegurable: number;
  tasaOnp: number;
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
