import type { RolUsuario } from './roles.ts';

export type { RolUsuario };

export interface Usuario {
  id: string;
  usuario: string;
  passwordHash: string;
  rol: RolUsuario;
  /** Data URL de la foto de perfil, o vacío. */
  fotoPerfilUrl: string;
  creadoEn: string;
  /** Fallos de login seguidos (se reinicia al acertar o al desbloquear). */
  intentosFallidos: number;
  /** ISO hasta cuándo está bloqueada la cuenta; null = libre. */
  bloqueadoHasta: string | null;
  /** Si es false, la cuenta no puede iniciar sesión ni usar la API. */
  habilitado: boolean;
}
