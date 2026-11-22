import { z } from 'zod';

/** Data URL de imagen (PNG/JPEG/WebP), o cadena vacía para quitar. */
export const imagenDataUrlCampo = z
  .string()
  .max(900_000, 'La imagen es demasiado grande.')
  .refine((v) => v === '' || /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(v), 'Formato de imagen no válido.');
