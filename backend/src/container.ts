/**
 * Raíz de composición: único lugar donde se conectan puertos con adaptadores.
 * Para cambiar de base de datos solo hay que reemplazar las clases Sqlite* por otras
 * que implementen los mismos puertos (domain/*.repository.ts).
 */
import type { Db } from './shared/infrastructure/sqlite/database.ts';
import { AsistenteService } from './modules/asistente/application/asistente.service.ts';
import { AuthService } from './modules/auth/application/auth.service.ts';
import { UsuarioGestionService } from './modules/auth/application/usuario.service.ts';
import { SqliteUsuarioRepository } from './modules/auth/infrastructure/sqlite-usuario.repository.ts';
import { ConfiguracionService } from './modules/configuracion/application/configuracion.service.ts';
import { SqliteConfiguracionRepository } from './modules/configuracion/infrastructure/sqlite-configuracion.repository.ts';
import { DashboardService } from './modules/dashboard/application/dashboard.service.ts';
import { EmpleadoService } from './modules/empleados/application/empleado.service.ts';
import { SqliteEmpleadoRepository } from './modules/empleados/infrastructure/sqlite-empleado.repository.ts';
import { PagoService } from './modules/planilla/application/pago.service.ts';
import { SqlitePagoRepository } from './modules/planilla/infrastructure/sqlite-pago.repository.ts';

export interface OpcionesServicios {
  authSecret: string;
  tokenTtlMs: number;
  adminRecoveryKey?: string;
  aiApiKey?: string;
  aiBaseUrl?: string;
  aiModel?: string;
}

export function construirServicios(db: Db, opciones: OpcionesServicios) {
  const empleados = new SqliteEmpleadoRepository(db);
  const pagos = new SqlitePagoRepository(db);
  const configuracion = new SqliteConfiguracionRepository(db); // implementa configuración + mantenimiento
  const usuarios = new SqliteUsuarioRepository(db);
  const auth = new AuthService(
    usuarios,
    opciones.authSecret,
    opciones.tokenTtlMs,
    opciones.adminRecoveryKey ?? '',
  );
  const usuariosGestion = new UsuarioGestionService(usuarios);
  const configuracionService = new ConfiguracionService(configuracion, configuracion);
  const asistente = new AsistenteService(configuracionService, {
    apiKey: opciones.aiApiKey ?? '',
    baseUrl: opciones.aiBaseUrl ?? 'https://api.groq.com/openai/v1',
    model: opciones.aiModel ?? 'openai/gpt-oss-20b',
  });

  return {
    auth,
    usuariosGestion,
    empleados: new EmpleadoService(empleados),
    pagos: new PagoService(pagos, empleados, configuracion),
    configuracion: configuracionService,
    dashboard: new DashboardService(empleados, pagos, configuracion),
    asistente,
  };
}
export type Servicios = ReturnType<typeof construirServicios>;
