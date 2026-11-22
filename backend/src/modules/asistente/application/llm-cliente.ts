import { AppError } from '../../../shared/errors/app-error.ts';

export interface MensajeLlm {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpcionesLlm {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** Cliente OpenAI-compatible (OpenAI, Groq, etc.). */
export async function completarChatLlm(
  mensajes: MensajeLlm[],
  opciones: OpcionesLlm,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${opciones.baseUrl.replace(/\/$/, '')}/chat/completions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opciones.apiKey}`,
      },
      body: JSON.stringify({
        model: opciones.model,
        messages: mensajes,
        temperature: 0.4,
        max_tokens: 900,
      }),
      signal,
    });
  } catch {
    throw new AppError(502, 'IA_NO_DISPONIBLE', 'No se pudo contactar al proveedor de IA.');
  }

  if (!res.ok) {
    let detalle = '';
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detalle = body.error?.message ?? '';
    } catch {
      /* vacío */
    }
    throw new AppError(
      502,
      'IA_ERROR',
      detalle || `El proveedor de IA respondió con error (${res.status}).`,
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const texto = json.choices?.[0]?.message?.content?.trim();
  if (!texto) {
    throw new AppError(502, 'IA_VACIA', 'La IA no devolvió una respuesta útil.');
  }
  return texto;
}
