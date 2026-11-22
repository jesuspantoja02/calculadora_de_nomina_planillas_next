const TIPOS = /^image\/(png|jpeg|webp)$/i;
const MAX_BYTES = 400_000;

export type ResultadoImagen =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

/** Lee PNG/JPEG/WebP ≤ 400 KB como data URL (mismo criterio que logo de empresa). */
export function leerImagenComoDataUrl(file: File): Promise<ResultadoImagen> {
  if (!TIPOS.test(file.type)) {
    return Promise.resolve({ ok: false, message: 'Usa una imagen PNG, JPEG o WebP.' });
  }
  if (file.size > MAX_BYTES) {
    return Promise.resolve({ ok: false, message: 'La imagen no debe superar 400 KB.' });
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        resolve({ ok: false, message: 'No se pudo leer la imagen.' });
        return;
      }
      resolve({ ok: true, dataUrl });
    };
    reader.onerror = () => resolve({ ok: false, message: 'No se pudo leer la imagen.' });
    reader.readAsDataURL(file);
  });
}
