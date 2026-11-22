import Head from 'next/head';

interface SiteHeadProps {
  title: string;
}

/** Título de pestaña del navegador. */
export function SiteHead({ title }: SiteHeadProps) {
  const completo = title.includes('Nómina') ? title : `${title} · Nómina`;
  return (
    <Head>
      <title>{completo}</title>
    </Head>
  );
}

const TITULOS_RUTA: Record<string, string> = {
  '/': 'Inicio',
  '/empleados': 'Empleados',
  '/planilla/procesar-pago': 'Procesar pago',
  '/planilla/boletas': 'Boletas',
  '/dashboard': 'Dashboard',
  '/usuarios': 'Usuarios',
  '/configuracion': 'Configuración',
  '/login': 'Acceso',
};

export function tituloDesdeRuta(pathname: string): string {
  return TITULOS_RUTA[pathname] ?? 'Planillas';
}