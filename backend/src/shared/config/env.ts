import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:3001'),
  DATABASE_FILE: z.string().default('data/nomina.db'),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  AUTH_SECRET: z.string().min(16).default('dev-nomina-auth-secret-cambiar-en-prod'),
  AUTH_TOKEN_TTL_HOURS: z.coerce.number().positive().max(168).default(12),
  /** Clave de emergencia para restablecer contraseña de un admin (mín. 16). Vacía = desactivado. */
  ADMIN_RECOVERY_KEY: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : ''),
    z.string().refine((v) => v === '' || v.length >= 16, {
      message: 'ADMIN_RECOVERY_KEY debe tener al menos 16 caracteres (o vacía para desactivar).',
    }),
  ),
  /** Clave OpenAI-compatible (OpenAI, Groq, etc.). Obligatoria para el chat; sin fallback local. */
  AI_API_KEY: z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string().default('')),
  AI_BASE_URL: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined),
    z.string().url().default('https://api.groq.com/openai/v1'),
  ),
  AI_MODEL: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined),
    z.string().default('openai/gpt-oss-20b'),
  ),
});

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(resultado.error));
  process.exit(1);
}

export const env = resultado.data;
export const origenesPermitidos = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
