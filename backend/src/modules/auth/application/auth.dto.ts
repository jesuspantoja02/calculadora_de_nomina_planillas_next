import { z } from 'zod';
import { imagenDataUrlCampo } from '../../../shared/validators/imagen-data-url.ts';
import { passwordCampo } from './usuario.dto.ts';

export const loginSchema = z.object({
  usuario: z.string().trim().min(1, 'El usuario es obligatorio.').max(64),
  password: z.string().min(1, 'La contraseña es obligatoria.').max(128),
});

export const cambiarPasswordSchema = z.object({
  passwordActual: z.string().min(1, 'Indica tu contraseña actual.'),
  passwordNueva: passwordCampo,
});

export const actualizarPerfilSchema = z.object({
  fotoPerfilUrl: imagenDataUrlCampo,
});
