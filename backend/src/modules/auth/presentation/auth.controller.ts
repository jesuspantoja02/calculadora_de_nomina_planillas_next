import type { Request, Response } from 'express';
import type { AuthService } from '../application/auth.service.ts';
import {
  actualizarPerfilSchema,
  cambiarPasswordSchema,
  inspeccionarCuentaSchema,
  loginSchema,
  recuperarAdminSchema,
} from '../application/auth.dto.ts';

export function crearAuthController(servicio: AuthService) {
  return {
    login: async (req: Request, res: Response) => {
      const sesion = servicio.iniciarSesion(loginSchema.parse(req.body));
      res.json({ data: sesion });
    },
    inspeccionarCuenta: async (req: Request, res: Response) => {
      const { usuario } = inspeccionarCuentaSchema.parse(req.body);
      res.json({ data: servicio.inspeccionarCuenta(usuario) });
    },
    yo: async (req: Request, res: Response) => {
      res.json({ data: servicio.perfil(req.auth!) });
    },
    actualizarPerfil: async (req: Request, res: Response) => {
      res.json({ data: servicio.actualizarPerfil(req.auth!, actualizarPerfilSchema.parse(req.body)) });
    },
    cambiarPassword: async (req: Request, res: Response) => {
      servicio.cambiarPassword(req.auth!, cambiarPasswordSchema.parse(req.body));
      res.status(204).end();
    },
    recuperarAdmin: async (req: Request, res: Response) => {
      servicio.recuperarPasswordAdmin(recuperarAdminSchema.parse(req.body));
      res.status(204).end();
    },
  };
}
