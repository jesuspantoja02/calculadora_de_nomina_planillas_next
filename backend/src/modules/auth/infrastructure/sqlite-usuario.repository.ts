import { randomUUID } from 'node:crypto';
import type { Db } from '../../../shared/infrastructure/sqlite/database.ts';
import type { ActualizarUsuarioInput, CrearUsuarioInput, UsuarioRepository } from '../domain/usuario.repository.ts';
import type { Usuario } from '../domain/usuario.ts';
import type { RolUsuario } from '../domain/roles.ts';

type Fila = {
  id: string;
  usuario: string;
  password_hash: string;
  rol: RolUsuario;
  foto_perfil_url: string | null;
  creado_en: string;
  intentos_fallidos: number | null;
  bloqueado_hasta: string | null;
  habilitado: number | null;
};

const SELECT_COLS =
  'id, usuario, password_hash, rol, foto_perfil_url, creado_en, intentos_fallidos, bloqueado_hasta, habilitado';

function mapFila(fila: Fila): Usuario {
  return {
    id: fila.id,
    usuario: fila.usuario,
    passwordHash: fila.password_hash,
    rol: fila.rol,
    fotoPerfilUrl: fila.foto_perfil_url ?? '',
    creadoEn: fila.creado_en,
    intentosFallidos: fila.intentos_fallidos ?? 0,
    bloqueadoHasta: fila.bloqueado_hasta ?? null,
    habilitado: (fila.habilitado ?? 1) === 1,
  };
}

export class SqliteUsuarioRepository implements UsuarioRepository {
  #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  buscarPorUsuario(usuario: string): Usuario | null {
    const fila = this.#db
      .prepare(`SELECT ${SELECT_COLS} FROM usuarios WHERE usuario = ? COLLATE NOCASE`)
      .get(usuario) as Fila | undefined;
    return fila ? mapFila(fila) : null;
  }

  buscarPorId(id: string): Usuario | null {
    const fila = this.#db.prepare(`SELECT ${SELECT_COLS} FROM usuarios WHERE id = ?`).get(id) as Fila | undefined;
    return fila ? mapFila(fila) : null;
  }

  listar(): Usuario[] {
    const filas = this.#db
      .prepare(`SELECT ${SELECT_COLS} FROM usuarios ORDER BY usuario COLLATE NOCASE ASC`)
      .all() as Fila[];
    return filas.map(mapFila);
  }

  crear(input: CrearUsuarioInput): Usuario {
    const id = input.id || randomUUID();
    const fotoPerfilUrl = input.fotoPerfilUrl ?? '';
    const habilitado = input.habilitado !== false;
    this.#db
      .prepare(
        `INSERT INTO usuarios (id, usuario, password_hash, rol, foto_perfil_url, creado_en, intentos_fallidos, bloqueado_hasta, habilitado)
         VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
      )
      .run(id, input.usuario, input.passwordHash, input.rol, fotoPerfilUrl, input.creadoEn, habilitado ? 1 : 0);
    return {
      id,
      usuario: input.usuario,
      passwordHash: input.passwordHash,
      rol: input.rol,
      fotoPerfilUrl,
      creadoEn: input.creadoEn,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      habilitado,
    };
  }

  actualizar(id: string, input: ActualizarUsuarioInput): Usuario {
    const actual = this.buscarPorId(id);
    if (!actual) throw new Error('Usuario no encontrado');

    const usuario = input.usuario ?? actual.usuario;
    const passwordHash = input.passwordHash ?? actual.passwordHash;
    const rol = input.rol ?? actual.rol;
    const fotoPerfilUrl = input.fotoPerfilUrl !== undefined ? input.fotoPerfilUrl : actual.fotoPerfilUrl;
    const intentosFallidos =
      input.intentosFallidos !== undefined ? input.intentosFallidos : actual.intentosFallidos;
    const bloqueadoHasta =
      input.bloqueadoHasta !== undefined ? input.bloqueadoHasta : actual.bloqueadoHasta;
    const habilitado = input.habilitado !== undefined ? input.habilitado : actual.habilitado;

    this.#db
      .prepare(
        `UPDATE usuarios SET usuario = ?, password_hash = ?, rol = ?, foto_perfil_url = ?,
         intentos_fallidos = ?, bloqueado_hasta = ?, habilitado = ? WHERE id = ?`,
      )
      .run(usuario, passwordHash, rol, fotoPerfilUrl, intentosFallidos, bloqueadoHasta, habilitado ? 1 : 0, id);

    return {
      id,
      usuario,
      passwordHash,
      rol,
      fotoPerfilUrl,
      creadoEn: actual.creadoEn,
      intentosFallidos,
      bloqueadoHasta,
      habilitado,
    };
  }

  eliminar(id: string): void {
    this.#db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  }

  contarPorRol(rol: RolUsuario): number {
    const fila = this.#db.prepare('SELECT COUNT(*) AS n FROM usuarios WHERE rol = ?').get(rol) as { n: number };
    return fila.n;
  }
}
