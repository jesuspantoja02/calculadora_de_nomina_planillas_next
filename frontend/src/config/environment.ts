export const environment = {
  /**
   * Desarrollo: `/api/v1` (rewrites en next.config.ts → localhost:3002).
   * Producción: define `NEXT_PUBLIC_API_URL` en el build.
   */
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '/api/v1',
};
