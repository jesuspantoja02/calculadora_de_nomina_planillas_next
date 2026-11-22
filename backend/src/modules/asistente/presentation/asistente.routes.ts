import { Router } from 'express';
import type { AsistenteService } from '../application/asistente.service.ts';
import { crearAsistenteController } from './asistente.controller.ts';

export function crearAsistenteRouter(servicio: AsistenteService): Router {
  const router = Router();
  const c = crearAsistenteController(servicio);
  router.post('/chat', c.chat);
  return router;
}
