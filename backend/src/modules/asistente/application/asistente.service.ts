import { AppError } from '../../../shared/errors/app-error.ts';
import type { ConfiguracionService } from '../../configuracion/application/configuracion.service.ts';
import type { Configuracion } from '../../configuracion/domain/configuracion.ts';
import { construirPromptSistema } from '../domain/conocimiento.ts';
import type { ChatAsistenteInput } from './asistente.dto.ts';
import { completarChatLlm } from './llm-cliente.ts';

export interface RespuestaAsistente {
  respuesta: string;
  proveedor: 'llm';
}

export interface OpcionesAsistente {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function resumenConfig(c: Configuracion): string {
  const lineasAfp = Object.entries(c.afpTasas)
    .map(
      ([nombre, t]) =>
        `- ${nombre}: aporte ${t.aportePct}%, prima ${t.primaSeguroPct}%, comisión flujo ${t.comisionFlujoPct}%, comisión saldo ${t.comisionSaldoPct}%`,
    )
    .join('\n');
  return [
    `Empresa: ${c.empresaNombre} (RUC ${c.empresaRuc || '—'})`,
    `RMV: S/ ${c.rmv} · UIT: S/ ${c.uit}`,
    `ONP: ${c.tasaOnp}% · EsSalud: ${c.tasaEssalud}% (empleador)`,
    `Remuneración máx. asegurable: S/ ${c.remuneracionMaximaAsegurable}`,
    `Comisión AFP aplicada: ${c.tipoComisionAfp}`,
    `Adelanto quincenal: ${c.adelantoQuincenalPct}%`,
    `Quinta categoría: ${c.aplicarQuintaCategoria ? 'activa' : 'desactivada'}`,
    'Tasas AFP vigentes:',
    lineasAfp,
  ].join('\n');
}

export class AsistenteService {
  #configuracion: ConfiguracionService;
  #llm: OpcionesAsistente;

  constructor(configuracion: ConfiguracionService, llm: OpcionesAsistente) {
    this.#configuracion = configuracion;
    this.#llm = llm;
  }

  async conversar(input: ChatAsistenteInput): Promise<RespuestaAsistente> {
    if (!this.#llm.apiKey.trim()) {
      throw new AppError(
        503,
        'IA_NO_CONFIGURADA',
        'Configura AI_API_KEY en backend/.env para usar el asistente. No se usa IA local.',
      );
    }

    const config = await this.#configuracion.obtener();
    const contextoVivo = resumenConfig(config);
    const system = construirPromptSistema(contextoVivo);
    const historial = input.historial.slice(-12).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const respuesta = await completarChatLlm(
      [{ role: 'system', content: system }, ...historial, { role: 'user', content: input.mensaje }],
      this.#llm,
    );

    return { respuesta, proveedor: 'llm' };
  }
}
