import { randomUUID } from 'node:crypto';
import { AppError } from '../../../shared/errors/app-error.ts';
import { hashPassword } from '../../../shared/security/password.ts';
import type { TokenPayload } from '../../../shared/security/token.ts';
import { puedeAsignarRol, type RolUsuario } from '../domain/roles.ts';
import type { UsuarioRepository } from '../domain/usuario.repository.ts';
import type { actualizarUsuarioSchema, crearUsuarioSchema } from './usuario.dto.ts';
import type { z } from 'zod';

export interface UsuarioDto {
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

function aDto(u: {
  id: string;
  usuario: string;
  rol: RolUsuario;
  fotoPerfilUrl: string;
  creadoEn: string;
  intentosFallidos: number;
  bloqueadoHasta: string | null;
  habilitado: boolean;
}): UsuarioDto {
  const hasta = u.bloqueadoHasta ? Date.parse(u.bloqueadoHasta) : NaN;
  const bloqueada = !Number.isNaN(hasta) && hasta > Date.now();
  return {
    id: u.id,
    usuario: u.usuario,
    rol: u.rol,
    fotoPerfilUrl: u.fotoPerfilUrl,
    creadoEn: u.creadoEn,
    intentosFallidos: u.intentosFallidos,
    bloqueadoHasta: bloqueada ? u.bloqueadoHasta : null,
    bloqueada,
    habilitado: u.habilitado,
  };
}

export class UsuarioGestionService {
  #usuarios: UsuarioRepository;

  constructor(usuarios: UsuarioRepository) {
    this.#usuarios = usuarios;
  }

  listar(): UsuarioDto[] {
    return this.#usuarios.listar().map(aDto);
  }

  crear(actor: TokenPayload, body: z.infer<typeof crearUsuarioSchema>): UsuarioDto {
    if (!puedeAsignarRol(actor.rol, body.rol)) {
      throw new AppError(403, 'SIN_PERMISO', 'No puedes asignar ese rol.');
    }
    if (this.#usuarios.buscarPorUsuario(body.usuario)) {
      throw new AppError(409, 'USUARIO_DUPLICADO', 'Ese nombre de usuario ya está registrado.');
    }

    const creado = this.#usuarios.crear({
      id: randomUUID(),
      usuario: body.usuario,
      passwordHash: hashPassword(body.password),
      rol: body.rol,
      fotoPerfilUrl: body.fotoPerfilUrl ?? '',
      habilitado: true,
      creadoEn: new Date().toISOString(),
    });
    return aDto(creado);
  }

  actualizar(actor: TokenPayload, id: string, body: z.infer<typeof actualizarUsuarioSchema>): UsuarioDto {
    const existente = this.#usuarios.buscarPorId(id);
    if (!existente) {
      throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado.');
    }

    if (body.rol !== undefined && !puedeAsignarRol(actor.rol, body.rol)) {
      throw new AppError(403, 'SIN_PERMISO', 'No puedes asignar ese rol.');
    }
    if (body.rol !== undefined && existente.rol === 'admin' && body.rol !== 'admin') {
      this.#asegurarOtroAdmin(id);
    }
    if (body.habilitado === false) {
      if (actor.sub === id) {
        throw new AppError(400, 'AUTO_DESHABILITACION', 'No puedes deshabilitar tu propia cuenta mientras tienes la sesión abierta.');
      }
      if (existente.rol === 'admin') {
        this.#asegurarOtroAdmin(id);
      }
    }
    if (body.usuario !== undefined && body.usuario.toLowerCase() !== existente.usuario.toLowerCase()) {
      const duplicado = this.#usuarios.buscarPorUsuario(body.usuario);
      if (duplicado && duplicado.id !== id) {
        throw new AppError(409, 'USUARIO_DUPLICADO', 'Ese nombre de usuario ya está registrado.');
      }
    }

    const actualizado = this.#usuarios.actualizar(id, {
      usuario: body.usuario,
      passwordHash: body.password ? hashPassword(body.password) : undefined,
      rol: body.rol,
      fotoPerfilUrl: body.fotoPerfilUrl,
      habilitado: body.habilitado,
    });
    return aDto(actualizado);
  }

  eliminar(actor: TokenPayload, id: string): void {
    if (actor.sub === id) {
      throw new AppError(400, 'AUTO_ELIMINACION', 'No puedes eliminar tu propia cuenta mientras tienes la sesión abierta.');
    }
    const existente = this.#usuarios.buscarPorId(id);
    if (!existente) {
      throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado.');
    }
    if (existente.rol === 'admin') {
      this.#asegurarOtroAdmin(id);
    }
    this.#usuarios.eliminar(id);
  }

  /** Libera el bloqueo por intentos fallidos (solo admin vía rutas). */
  desbloquear(id: string): UsuarioDto {
    const existente = this.#usuarios.buscarPorId(id);
    if (!existente) {
      throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado.');
    }
    const actualizado = this.#usuarios.actualizar(id, { intentosFallidos: 0, bloqueadoHasta: null });
    return aDto(actualizado);
  }

  rolesAsignables(actor: TokenPayload): RolUsuario[] {
    const todos: RolUsuario[] = ['admin', 'jefe', 'gerente', 'usuario'];
    return todos.filter((r) => puedeAsignarRol(actor.rol, r));
  }

  #asegurarOtroAdmin(excluirId: string): void {
    const admins = this.#usuarios
      .listar()
      .filter((u) => u.rol === 'admin' && u.habilitado && u.id !== excluirId);
    if (admins.length === 0) {
      throw new AppError(400, 'ULTIMO_ADMIN', 'Debe quedar al menos un administrador habilitado en el sistema.');
    }
  }
}
