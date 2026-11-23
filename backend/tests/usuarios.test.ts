import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirServicios } from '../src/container.ts';
import { asegurarUsuarioAdmin, USUARIO_ADMIN_INICIAL } from '../src/modules/auth/infrastructure/seed-usuarios.ts';
import { abrirBaseDatos } from '../src/shared/infrastructure/sqlite/database.ts';
import { AppError } from '../src/shared/errors/app-error.ts';

const opcionesAuth = { authSecret: 'test-secret-min-16-chars', tokenTtlMs: 3_600_000 };

test('gestión de usuarios: roles y permisos', () => {
  const db = abrirBaseDatos(':memory:');
  asegurarUsuarioAdmin(db);
  const { auth, usuariosGestion } = construirServicios(db, opcionesAuth);

  const admin = auth.iniciarSesion({ usuario: USUARIO_ADMIN_INICIAL, password: 'P@ntoja10' });
  const payloadAdmin = auth.validarToken(admin.token);

  const operador = usuariosGestion.crear(payloadAdmin, {
    usuario: 'operador.rrhh',
    password: 'Operador1!',
    rol: 'usuario',
  });
  assert.equal(operador.rol, 'usuario');

  const lista = usuariosGestion.listar();
  assert.ok(lista.length >= 2);
  assert.equal(operador.habilitado, true);

  const sesionOperador = auth.iniciarSesion({ usuario: 'operador.rrhh', password: 'Operador1!' });
  const payloadOperador = auth.validarToken(sesionOperador.token);

  assert.throws(
    () => usuariosGestion.crear(payloadOperador, { usuario: 'otro', password: 'Otro1234!', rol: 'usuario' }),
    (e) => e instanceof AppError && e.status === 403,
  );

  const deshabilitado = usuariosGestion.actualizar(payloadAdmin, operador.id, { habilitado: false });
  assert.equal(deshabilitado.habilitado, false);
  assert.throws(
    () => auth.iniciarSesion({ usuario: 'operador.rrhh', password: 'Operador1!' }),
    (e) => e instanceof AppError && e.code === 'CUENTA_DESHABILITADA',
  );

  const rehabilitado = usuariosGestion.actualizar(payloadAdmin, operador.id, { habilitado: true });
  assert.equal(rehabilitado.habilitado, true);
  assert.ok(auth.iniciarSesion({ usuario: 'operador.rrhh', password: 'Operador1!' }).token);

  db.close();
});
