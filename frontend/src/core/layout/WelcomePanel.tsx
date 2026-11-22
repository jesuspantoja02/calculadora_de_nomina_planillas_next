import Link from 'next/link';
import { useEffect, useState } from 'react';
import { container } from '../../composition/container';
import { CNJ_ESLOGAN, CNJ_LOGO_URL, CNJ_NOMBRE, CNJ_PANEL_HERO_URL } from '../../config/empresaBranding';
import { Icon, type NombreIcono } from '../../shared/ui/Icon';

const atajos: { href: string; titulo: string; detalle: string; icono: NombreIcono }[] = [
  {
    href: '/empleados',
    titulo: 'Empleados',
    detalle: 'Alta, filtros y régimen AFP/ONP',
    icono: 'users',
  },
  {
    href: '/planilla/procesar-pago',
    titulo: 'Procesar pago',
    detalle: 'Simular y emitir boleta del periodo',
    icono: 'wallet',
  },
  {
    href: '/planilla/boletas',
    titulo: 'Boletas',
    detalle: 'Historial e impresión',
    icono: 'file',
  },
  {
    href: '/dashboard',
    titulo: 'Dashboard',
    detalle: 'Totales y composición del mes',
    icono: 'chart',
  },
];

export function WelcomePanel() {
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState(CNJ_NOMBRE);
  const [eslogan, setEslogan] = useState(CNJ_ESLOGAN);
  const [logoUrl, setLogoUrl] = useState(CNJ_LOGO_URL);

  useEffect(() => {
    void container.configuracion
      .obtener()
      .then((c) => {
        setNombre(c.empresaNombre?.trim() || CNJ_NOMBRE);
        setEslogan(c.empresaEslogan?.trim() || CNJ_ESLOGAN);
        setLogoUrl(c.empresaLogoUrl?.trim() || CNJ_LOGO_URL);
      })
      .catch(() => {
        /* valores CNJ por defecto */
      })
      .finally(() => setCargando(false));
  }, []);

  return (
    <section
      className="welcome-panel no-print"
      aria-labelledby="welcome-panel-title"
      style={{ backgroundImage: `url(${CNJ_PANEL_HERO_URL})` }}
    >
      <div className="welcome-panel__overlay" aria-hidden="true" />
      <div className="welcome-panel__content">
        {cargando ? (
          <p className="welcome-panel__loading">Cargando…</p>
        ) : (
          <>
            <p className="welcome-panel__eyebrow">Gestión de planillas · Perú</p>
            <div className="welcome-panel__logo-wrap">
              <img className="welcome-panel__logo" src={logoUrl} alt={`Logo de ${nombre}`} width={112} height={112} />
            </div>
            <h1 className="welcome-panel__nombre" id="welcome-panel-title">
              {nombre}
            </h1>
            <p className="welcome-panel__eslogan">{eslogan}</p>

            <nav className="welcome-panel__intents" aria-label="Accesos rápidos">
              {atajos.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`welcome-intent welcome-intent--${i}`}
                >
                  <span className="welcome-intent__icon" aria-hidden="true">
                    <Icon nombre={item.icono} tamano={20} />
                  </span>
                  <span className="welcome-intent__copy">
                    <span className="welcome-intent__title">{item.titulo}</span>
                    <span className="welcome-intent__detail">{item.detalle}</span>
                  </span>
                </Link>
              ))}
            </nav>
          </>
        )}
      </div>
    </section>
  );
}
