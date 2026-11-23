import { timingSafeEqual } from 'node:crypto';
import { AppError } from '../../../shared/errors/app-error.ts';
import { hashPassword, verifyPassword } from '../../../shared/security/password.ts';
import { crearToken, verificarToken, type TokenPayload } from '../../../shared/security/token.ts';
import type { RolUsuario } from '../domain/roles.ts';
import type { UsuarioRepository } from '../domain/usuario.repository.ts';
import type {
  actualizarPerfilSchema,
  cambiarPasswordSchema,
  loginSchema,
  recuperarAdminSchema,
} from './auth.dto.ts';
import type { z } from 'zod';

function claveRecuperacionValida(recibida: string, esperada: string): boolean {
  if (!esperada) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface SesionDto {
  token: string;
  id: string;
  usuario: string;
  rol: RolUsuario;
  fotoPerfilUrl: string;
}

export interface PerfilDto {
  id: string;
  usuario: string;
  rol: RolUsuario;
  fotoPerfilUrl: string;
  creadoEn: string;
}

export class AuthService {
  #usuarios: UsuarioRepository;
  #authSecret: string;
  #tokenTtlMs: number;
  #adminRecoveryKey: string;

  constructor(
    usuarios: UsuarioRepository,
    authSecret: string,
    tokenTtlMs: number,
    adminRecoveryKey = '',
  ) {
    this.#usuarios = usuarios;
    this.#authSecret = authSecret;
    this.#tokenTtlMs = tokenTtlMs;
    this.#adminRecoveryKey = adminRecoveryKey;
  }

  static readonly MAX_INTENTOS_LOGIN = 3;
  static readonly BLOQUEO_MS = 5 * 60 * 1000;

  iniciarSesion(credenciales: z.infer<typeof loginSchema>): SesionDto {
    const registro = this.#usuarios.buscarPorUsuario(credenciales.usuario);
    if (!registro) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Usuario o contraseña incorrectos.');
    }

    if (!registro.habilitado) {
      throw new AppError(
        403,
        'CUENTA_DESHABILITADA',
        `La cuenta «${registro.usuario}» está deshabilitada. Contacta a un administrador.`,
        { usuario: registro.usuario },
      );
    }

    const ahora = Date.now();
    if (registro.bloqueadoHasta) {
      const hasta = Date.parse(registro.bloqueadoHasta);
      if (!Number.isNaN(hasta) && hasta > ahora) {
        const minutos = Math.max(1, Math.ceil((hasta - ahora) / 60_000));
        throw new AppError(
          423,
          'CUENTA_BLOQUEADA',
          `Cuenta bloqueada por demasiados intentos fallidos. Espera ${minutos} min o pide a un administrador que la libere.`,
          { bloqueadoHasta: registro.bloqueadoHasta, usuario: registro.usuario },
        );
      }
      // Bloqueo vencido: limpiar antes de validar
      this.#usuarios.actualizar(registro.id, { intentosFallidos: 0, bloqueadoHasta: null });
      registro.intentosFallidos = 0;
      registro.bloqueadoHasta = null;
    }

    if (!verifyPassword(credenciales.password, registro.passwordHash)) {
      const intentos = registro.intentosFallidos + 1;
      if (intentos >= AuthService.MAX_INTENTOS_LOGIN) {
        const bloqueadoHasta = new Date(ahora + AuthService.BLOQUEO_MS).toISOString();
        this.#usuarios.actualizar(registro.id, { intentosFallidos: intentos, bloqueadoHasta });
        throw new AppError(
          423,
          'CUENTA_BLOQUEADA',
          `Cuenta «${registro.usuario}» bloqueada tras ${AuthService.MAX_INTENTOS_LOGIN} intentos fallidos. Espera 5 minutos o pide a un administrador que la libere.`,
          { bloqueadoHasta, usuario: registro.usuario, intentosFallidos: intentos },
        );
      }
      this.#usuarios.actualizar(registro.id, { intentosFallidos: intentos });
      const restantes = AuthService.MAX_INTENTOS_LOGIN - intentos;
      throw new AppError(
        401,
        'CREDENCIALES_INVALIDAS',
        `Usuario o contraseña incorrectos. Te quedan ${restantes} intento${restantes === 1 ? '' : 's'} antes del bloqueo.`,
        { usuario: registro.usuario, intentosFallidos: intentos, intentosRestantes: restantes },
      );
    }

    this.#usuarios.actualizar(registro.id, { intentosFallidos: 0, bloqueadoHasta: null });

    const token = crearToken(
      { sub: registro.id, usuario: registro.usuario, rol: registro.rol },
      this.#authSecret,
      this.#tokenTtlMs,
    );

    return {
      token,
      id: registro.id,
      usuario: registro.usuario,
      rol: registro.rol,
      fotoPerfilUrl: registro.fotoPerfilUrl,
    };
  }

  /** Info mínima para el login: detectar cuenta y si puede usar recuperación admin. */
  inspeccionarCuenta(usuario: string): {
    encontrada: boolean;
    usuario?: string;
    rol?: RolUsuario;
    bloqueada: boolean;
    bloqueadoHasta: string | null;
    habilitado: boolean;
    puedeRecuperarAdmin: boolean;
  } {
    const registro = this.#usuarios.buscarPorUsuario(usuario.trim());
    if (!registro) {
      return {
        encontrada: false,
        bloqueada: false,
        bloqueadoHasta: null,
        habilitado: false,
        puedeRecuperarAdmin: false,
      };
    }
    const ahora = Date.now();
    const hasta = registro.bloqueadoHasta ? Date.parse(registro.bloqueadoHasta) : NaN;
    const bloqueada = !Number.isNaN(hasta) && hasta > ahora;
    return {
      encontrada: true,
      usuario: registro.usuario,
      rol: registro.rol,
      bloqueada,
      bloqueadoHasta: bloqueada ? registro.bloqueadoHasta : null,
      habilitado: registro.habilitado,
      puedeRecuperarAdmin: registro.rol === 'admin' && registro.habilitado && Boolean(this.#adminRecoveryKey),
    };
  }

  validarToken(token: string): TokenPayload {
    return verificarToken(token, this.#authSecret);
  }

  /** Valida JWT y que la cuenta siga existiendo y habilitada. */
  validarAcceso(token: string): TokenPayload {
    const payload = this.validarToken(token);
    const registro = this.#usuarios.buscarPorId(payload.sub);
    if (!registro || !registro.habilitado) {
      throw new AppError(401, 'CUENTA_DESHABILITADA', 'Tu cuenta está deshabilitada. Contacta a un administrador.');
    }
    return payload;
  }

  sesionDesdeToken(token: string): SesionDto {
    const payload = this.validarToken(token);
    const registro = this.#usuarios.buscarPorId(payload.sub);
    return {
      token,
      id: payload.sub,
      usuario: payload.usuario,
      rol: payload.rol,
      fotoPerfilUrl: registro?.fotoPerfilUrl ?? '',
    };
  }

  perfil(payload: TokenPayload): PerfilDto {
    const registro = this.#usuarios.buscarPorId(payload.sub);
    if (!registro) {
      throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado.');
    }
    return {
      id: registro.id,
      usuario: registro.usuario,
      rol: registro.rol,
      fotoPerfilUrl: registro.fotoPerfilUrl,
      creadoEn: registro.creadoEn,
    };
  }

  actualizarPerfil(payload: TokenPayload, body: z.infer<typeof actualizarPerfilSchema>): PerfilDto {
    const registro = this.#usuarios.buscarPorId(payload.sub);
    if (!registro) {
      throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado.');
    }
    const actualizado = this.#usuarios.actualizar(payload.sub, { fotoPerfilUrl: body.fotoPerfilUrl });
    return {
      id: actualizado.id,
      usuario: actualizado.usuario,
      rol: actualizado.rol,
      fotoPerfilUrl: actualizado.fotoPerfilUrl,
      creadoEn: actualizado.creadoEn,
    };
  }

  cambiarPassword(payload: TokenPayload, body: z.infer<typeof cambiarPasswordSchema>): void {
    const registro = this.#usuarios.buscarPorId(payload.sub);
    if (!registro) {
      throw new AppError(404, 'NO_ENCONTRADO', 'Usuario no encontrado.');
    }
    if (!verifyPassword(body.passwordActual, registro.passwordHash)) {
      throw new AppError(401, 'PASSWORD_ACTUAL_INVALIDA', 'La contraseña actual no es correcta.');
    }
    this.#usuarios.actualizar(payload.sub, { passwordHash: hashPassword(body.passwordNueva) });
  }

  /**
   * Restablece la contraseña de un usuario con rol admin usando ADMIN_RECOVERY_KEY.
   * No aplica a jefe/gerente/usuario.
   */
  recuperarPasswordAdmin(body: z.infer<typeof recuperarAdminSchema>): void {
    if (!this.#adminRecoveryKey) {
      throw new AppError(
        503,
        'RECUPERACION_DESACTIVADA',
        'La recuperación de administrador no está configurada en el servidor.',
      );
    }
    if (!claveRecuperacionValida(body.claveRecuperacion, this.#adminRecoveryKey)) {
      throw new AppError(401, 'CLAVE_RECUPERACION_INVALIDA', 'Clave de recuperación incorrecta.');
    }

    const registro = this.#usuarios.buscarPorUsuario(body.usuario);
    if (!registro || registro.rol !== 'admin') {
      throw new AppError(
        403,
        'SOLO_ADMIN',
        'Solo una cuenta administrador puede restablecerse con esta opción.',
      );
    }
    if (!registro.habilitado) {
      throw new AppError(
        403,
        'CUENTA_DESHABILITADA',
        `La cuenta «${registro.usuario}» está deshabilitada. Pide a otro administrador que la habilite.`,
      );
    }

    this.#usuarios.actualizar(registro.id, {
      passwordHash: hashPassword(body.passwordNueva),
      intentosFallidos: 0,
      bloqueadoHasta: null,
    });
  }
}
