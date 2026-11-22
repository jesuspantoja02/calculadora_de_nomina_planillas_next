import { Router } from 'express';
import { requiereGestor } from '../../../shared/http/requiere-gestor.ts';
import type { ConfiguracionService } from '../application/configuracion.service.ts';
import { crearConfiguracionController } from './configuracion.controller.ts';

/** GET abierto a cualquier sesión (branding). Escritura solo admin / jefe / gerente. */
export function crearConfiguracionRouter(servicio: ConfiguracionService): Router {
  const c = crearConfiguracionController(servicio);
  const router = Router();
  const soloGestor = requiereGestor();
  router.get('/configuracion', c.obtener);
  router.put('/configuracion', soloGestor, c.actualizar);
  router.delete('/datos', soloGestor, c.reiniciarDatos);
  return router;
}
