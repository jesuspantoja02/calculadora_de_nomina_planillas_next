import type { RolUsuario, Usuario } from './usuario.ts';

export interface CrearUsuarioInput {
  id: string;
  usuario: string;
  passwordHash: string;
  rol: RolUsuario;
  fotoPerfilUrl?: string;
  habilitado?: boolean;
  creadoEn: string;
}

export interface ActualizarUsuarioInput {
  usuario?: string;
  passwordHash?: string;
  rol?: RolUsuario;
  fotoPerfilUrl?: string;
  intentosFallidos?: number;
  /** Pasar `null` para limpiar el bloqueo. */
  bloqueadoHasta?: string | null;
  habilitado?: boolean;
}

export interface UsuarioRepository {
  buscarPorUsuario(usuario: string): Usuario | null;
  buscarPorId(id: string): Usuario | null;
  listar(): Usuario[];
  crear(input: CrearUsuarioInput): Usuario;
  actualizar(id: string, input: ActualizarUsuarioInput): Usuario;
  eliminar(id: string): void;
  contarPorRol(rol: RolUsuario): number;
}
