import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { esAdmin, esGestor, etiquetaRol } from '../auth/roles';
import { ThemeToggle } from '../theme/ThemeToggle';
import { BrandLogo } from '../../shared/ui/BrandLogo';
import { Icon, type NombreIcono } from '../../shared/ui/Icon';
import { UserAvatar } from '../../shared/ui/UserAvatar';
import { ProfileSheet } from './ProfileSheet';
import { avisarPerfilVisible, EVENTO_CERRAR_PERFIL, pedirCerrarAsistente } from './paneles-laterales';

interface ItemNav {
  ruta: string;
  etiqueta: string;
  icono: NombreIcono;
}

const operacion: ItemNav[] = [
  { ruta: '/empleados', etiqueta: 'Empleados', icono: 'users' },
  { ruta: '/planilla/procesar-pago', etiqueta: 'Procesar pago', icono: 'wallet' },
  { ruta: '/planilla/boletas', etiqueta: 'Boletas de pago', icono: 'file' },
  { ruta: '/dashboard', etiqueta: 'Dashboard', icono: 'chart' },
];

function itemsSistema(rol: ReturnType<typeof useAuth>['rol']): ItemNav[] {
  if (!esGestor(rol)) return [];
  const items: ItemNav[] = [];
  if (esAdmin(rol)) {
    items.push({ ruta: '/usuarios', etiqueta: 'Usuarios del sistema', icono: 'shield' });
  } else {
    items.push({ ruta: '/usuarios', etiqueta: 'Agregar nuevo usuario', icono: 'user-plus' });
  }
  items.push({ ruta: '/configuracion', etiqueta: 'Configuración', icono: 'sliders' });
  return items;
}

interface SidebarProps {
  abierto: boolean;
  onNavegar: () => void;
}

function irInicio(router: ReturnType<typeof useRouter>, onNavegar: () => void) {
  onNavegar();
  void router.push('/');
}

export function Sidebar({ abierto, onNavegar }: SidebarProps) {
  const { logout, userEmail, rol, fotoPerfilUrl } = useAuth();
  const router = useRouter();
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [navFadeAbajo, setNavFadeAbajo] = useState(false);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const sistema = itemsSistema(rol);

  useEffect(() => {
    const onCerrarPerfil = () => setPerfilAbierto(false);
    window.addEventListener(EVENTO_CERRAR_PERFIL, onCerrarPerfil);
    return () => window.removeEventListener(EVENTO_CERRAR_PERFIL, onCerrarPerfil);
  }, []);

  useEffect(() => {
    avisarPerfilVisible(perfilAbierto);
  }, [perfilAbierto]);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;

    const actualizarFade = () => {
      const hayMas = el.scrollHeight > el.clientHeight + 2;
      const alFinal = el.scrollTop + el.clientHeight >= el.scrollHeight - 6;
      setNavFadeAbajo(hayMas && !alFinal);
    };

    actualizarFade();
    const observer = new ResizeObserver(actualizarFade);
    observer.observe(el);
    el.addEventListener('scroll', actualizarFade, { passive: true });
    window.addEventListener('resize', actualizarFade);

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', actualizarFade);
      window.removeEventListener('resize', actualizarFade);
    };
  }, [sistema.length, rol]);

  const cerrarSesion = () => {
    logout();
    onNavegar();
    void router.replace('/login');
  };

  const esActiva = (ruta: string) => router.pathname === ruta;

  return (
    <>
      <aside className={`sidebar no-print ${abierto ? 'abierto' : ''}`}>
        <div className="sidebar-brand-row">
          <button
            type="button"
            className="brand brand--home"
            onClick={() => irInicio(router, onNavegar)}
            aria-label="Ir al inicio — Planilla Nómina Perú"
          >
            <BrandLogo variant="lockup" size={40} />
          </button>
          <ThemeToggle compact />
        </div>

        <div className={`sidebar-nav-wrap${navFadeAbajo ? ' sidebar-nav-wrap--fade' : ''}`}>
          <div className="sidebar-nav-scroll" ref={navScrollRef}>
          <nav className="nav" aria-label="Navegación principal">
          <div className="nav-group">
            <p className="nav-label">Operación</p>
            <div className="nav-group__items">
              {operacion.map((item) => (
                <Link
                  key={item.ruta}
                  href={item.ruta}
                  className={`nav-item${esActiva(item.ruta) ? ' active' : ''}`}
                  onClick={onNavegar}
                >
                  <span className="nav-icon">
                    <Icon nombre={item.icono} tamano={18} />
                  </span>
                  <span className="nav-item__label">{item.etiqueta}</span>
                </Link>
              ))}
            </div>
          </div>

          {sistema.length > 0 ? (
            <>
              <div className="nav-divider" role="presentation" aria-hidden="true" />
              <div className="nav-group">
                <p className="nav-label">Sistema</p>
                <div className="nav-group__items">
                  {sistema.map((item) => (
                    <Link
                      key={item.ruta}
                      href={item.ruta}
                      className={`nav-item${esActiva(item.ruta) ? ' active' : ''}`}
                      onClick={onNavegar}
                    >
                      <span className="nav-icon">
                        <Icon nombre={item.icono} tamano={18} />
                      </span>
                      <span className="nav-item__label">{item.etiqueta}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          </nav>
          </div>
        </div>

        <div className="sidebar-divider" role="presentation" aria-hidden="true" />

        <div className="sidebar-foot">
          {userEmail ? (
            <>
              <button
                type="button"
                className="sidebar-profile-btn"
                onClick={() => {
                  pedirCerrarAsistente();
                  setPerfilAbierto(true);
                }}
                aria-label="Ver mi perfil"
              >
                <UserAvatar
                  nombre={userEmail}
                  fotoUrl={fotoPerfilUrl}
                  size={36}
                  fallback="icono"
                  className="sidebar-profile-btn__avatar"
                />
                <span className="sidebar-profile-btn__meta">
                  <span className="sidebar-profile-btn__name">{userEmail}</span>
                  {rol ? <span className={`sidebar-role sidebar-role--${rol}`}>{etiquetaRol(rol)}</span> : null}
                </span>
              </button>
            </>
          ) : null}
          <button type="button" className="sidebar-logout" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
          <span className="sidebar-foot-note">Ley laboral · AFP, ONP, quinta</span>
        </div>
      </aside>

      <ProfileSheet abierto={perfilAbierto} onCerrar={() => setPerfilAbierto(false)} />
    </>
  );
}
