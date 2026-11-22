import { apiPost } from '../../shared/infrastructure/http/apiClient';

export interface MensajeAsistente {
  role: 'user' | 'assistant';
  content: string;
}

export interface RespuestaAsistente {
  respuesta: string;
  proveedor: 'llm';
}

export function enviarConsultaAsistenteApi(
  mensaje: string,
  historial: MensajeAsistente[],
): Promise<RespuestaAsistente> {
  return apiPost<RespuestaAsistente>('/asistente/chat', { mensaje, historial });
}
