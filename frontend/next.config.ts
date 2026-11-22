import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Solo en `next dev`: oculta la “N” flotante de Dev Tools (no sale en `next build` + producción). */
  devIndicators: false,
  /** Mantiene más rutas compiladas en memoria al navegar el menú en desarrollo. */
  onDemandEntries: {
    maxInactiveAge: 5 * 60 * 1000,
    pagesBufferLength: 12,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
