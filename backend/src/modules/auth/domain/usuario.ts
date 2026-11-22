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
}
