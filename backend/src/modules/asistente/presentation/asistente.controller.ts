import type { Request, Response } from 'express';
import type { AsistenteService } from '../application/asistente.service.ts';
import { chatAsistenteSchema } from '../application/asistente.dto.ts';

export function crearAsistenteController(servicio: AsistenteService) {
  return {
    chat: async (req: Request, res: Response) => {
      const body = chatAsistenteSchema.parse(req.body);
      const data = await servicio.conversar(body);
      res.json({ data });
    },
  };
}
