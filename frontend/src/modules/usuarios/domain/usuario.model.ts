import type { RolUsuario } from '../../../core/auth/roles';

export interface UsuarioCuenta {
  id: string;
  usuario: string;
  rol: RolUsuario;
  fotoPerfilUrl: string;
  creadoEn: string;
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  bloqueada: boolean;
  habilitado: boolean;
}

export interface UsuarioCuentaDto {
  usuario: string;
  password: string;
  rol: RolUsuario;
  fotoPerfilUrl?: string;
}

export interface ActualizarUsuarioDto {
  usuario?: string;
  password?: string;
  rol?: RolUsuario;
  fotoPerfilUrl?: string;
  habilitado?: boolean;
}
