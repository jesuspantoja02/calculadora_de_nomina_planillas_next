import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../../shared/infrastructure/http/apiClient';
import {
  inspeccionarCuentaApi,
  recuperarAdminApi,
  type CuentaLoginInfo,
} from '../auth/authApi';
import { etiquetaRol } from '../auth/roles';
import {
  borrarCredencialesRecordadas,
  guardarCredencialesRecordadas,
  leerCredencialesRecordadas,
} from '../auth/credencialesRecordadas';
import { ThemeToggle } from '../theme/ThemeToggle';
import { BrandLogo } from '../../shared/ui/BrandLogo';
import { PasswordRevealButton } from '../../shared/ui/PasswordRevealButton';

export function LoginPage() {
  const { isAuthenticated, ready, login } = useAuth();
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [cuentaInfo, setCuentaInfo] = useState<CuentaLoginInfo | null>(null);
  const [claveRecuperacion, setClaveRecuperacion] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordNueva2, setPasswordNueva2] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [exitoRecuperar, setExitoRecuperar] = useState('');

  useEffect(() => {
    const recordadas = leerCredencialesRecordadas();
    if (recordadas) {
      setUsuario(recordadas.usuario);
      setPassword(recordadas.password);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (ready && isAuthenticated) {
      void router.replace('/');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || isAuthenticated) {
    return (
      <div className="login-page" aria-busy="true">
        <p className="login-page__boot">Cargando…</p>
      </div>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setExitoRecuperar('');
    setLoading(true);

    const result = await login(usuario, password);
    if (!result.ok) {
      setLoading(false);
      setError(result.message);
      return;
    }

    if (remember) {
      guardarCredencialesRecordadas(usuario.trim(), password);
    } else {
      borrarCredencialesRecordadas();
    }

    setExiting(true);
    window.setTimeout(() => {
      void router.replace('/');
    }, 320);
  };

  const abrirRecuperacion = async () => {
    setError('');
    setExitoRecuperar('');
    const nombre = usuario.trim();
    if (!nombre) {
      setError('Escribe primero el usuario con el que intentas iniciar sesión.');
      return;
    }

    setLoading(true);
    try {
      const info = await inspeccionarCuentaApi(nombre);
      setCuentaInfo(info);
      // Defensa: si el proxy apunta a otra API sin `encontrada`, no fingir que el usuario no existe.
      if (typeof info.encontrada !== 'boolean') {
        setError(
          'La API de autenticación no respondió como se espera. Revisa que el backend de este proyecto (puerto 3002) esté encendido.',
        );
        return;
      }
      if (!info.encontrada) {
        setError('No hay una cuenta con ese usuario.');
        return;
      }
      if (!info.puedeRecuperarAdmin) {
        setError(
          info.habilitado === false
            ? `La cuenta «${info.usuario}» está deshabilitada. Pide a un administrador que la habilite en Usuarios del sistema.`
            : info.bloqueada
              ? `La cuenta «${info.usuario}» está bloqueada. Espera 5 minutos o pide a un administrador que la libere en Usuarios.`
              : `La cuenta «${info.usuario}» (${info.rol ? etiquetaRol(info.rol) : 'sin rol'}) no puede usar recuperación por clave del sistema. Solo aplica a administradores.`,
        );
        return;
      }
      setModoRecuperar(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo consultar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const onRecuperarAdmin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setExitoRecuperar('');

    if (passwordNueva !== passwordNueva2) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await recuperarAdminApi(usuario.trim(), claveRecuperacion, passwordNueva);
      setPassword(passwordNueva);
      setClaveRecuperacion('');
      setPasswordNueva('');
      setPasswordNueva2('');
      setModoRecuperar(false);
      setCuentaInfo(null);
      setExitoRecuperar('Contraseña de administrador actualizada. Ya puedes iniciar sesión.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__theme no-print">
        <ThemeToggle />
      </div>
      <div className="login-page__fields" aria-hidden="true">
        <div className="login-page__field-block login-page__field-block--a" />
        <div className="login-page__field-block login-page__field-block--b" />
        <div className="login-page__field-block login-page__field-block--c" />
      </div>

      <div className="login-page__grid">
        <header className="login-page__hero login-reveal login-reveal--1">
          <p className="login-page__eyebrow">Nómina · Gestión de planillas</p>
          <div className="login-page__hero-logo">
            <BrandLogo size={56} variant="lockup" />
          </div>
          <h1 className="login-page__title">Operación de planilla con precisión normativa</h1>
          <p className="login-page__lead">
            Empleados, simulación de pago y boletas sobre la misma API — AFP, ONP, quinta y EsSalud alineados a la
            práctica laboral peruana.
          </p>
          <ul className="login-page__trust">
            <li>
              <strong>Regímenes</strong>
              <span>AFP por administradora y ONP</span>
            </li>
            <li>
              <strong>Ciclo de pago</strong>
              <span>Adelanto quincenal y fin de mes</span>
            </li>
            <li>
              <strong>Auditoría</strong>
              <span>Boletas persistidas e imprimibles</span>
            </li>
          </ul>
        </header>

        <section className="login-page__card login-reveal login-reveal--2" aria-labelledby="login-heading">
          <div className="login-page__card-head login-reveal login-reveal--3">
            <div>
              <h2 id="login-heading">{modoRecuperar ? 'Recuperar acceso admin' : 'Acceso al panel'}</h2>
              <p>
                {modoRecuperar
                  ? 'Cuenta detectada como administrador. Confirma con la clave de recuperación del servidor.'
                  : 'Usa tu usuario registrado. Tras 3 intentos fallidos la cuenta se bloquea 5 minutos.'}
              </p>
            </div>
          </div>

          {modoRecuperar ? (
            <form onSubmit={onRecuperarAdmin} noValidate>
              <div className="login-page__error" role="alert" data-hidden={error ? 'false' : 'true'}>
                {error || ' '}
              </div>

              {cuentaInfo?.encontrada ? (
                <p className="login-page__cuenta-detectada" role="status">
                  Cuenta: <strong>{cuentaInfo.usuario}</strong>
                  {cuentaInfo.rol ? ` · ${etiquetaRol(cuentaInfo.rol)}` : ''}
                  {cuentaInfo.habilitado === false ? ' · deshabilitada' : ''}
                  {cuentaInfo.bloqueada ? ' · bloqueada' : ''}
                </p>
              ) : null}

              <div className="login-page__field">
                <label htmlFor="recuperar-clave">Clave de recuperación del sistema</label>
                <div className="login-page__input-wrap login-page__input-wrap--secret">
                  <span className="login-page__input-icon" aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
                      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
                    </svg>
                  </span>
                  <input
                    id="recuperar-clave"
                    type="password"
                    autoComplete="off"
                    required
                    value={claveRecuperacion}
                    onChange={(e) => setClaveRecuperacion(e.target.value)}
                    placeholder="ADMIN_RECOVERY_KEY"
                  />
                </div>
              </div>

              <div className="login-page__field">
                <label htmlFor="recuperar-nueva">Nueva contraseña</label>
                <div className="login-page__input-wrap login-page__input-wrap--secret">
                  <span className="login-page__input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="recuperar-nueva"
                    type={mostrarNueva ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <PasswordRevealButton
                    visible={mostrarNueva}
                    onToggle={() => setMostrarNueva((v) => !v)}
                    className="login-page__reveal"
                  />
                </div>
              </div>

              <div className="login-page__field">
                <label htmlFor="recuperar-nueva2">Confirmar nueva contraseña</label>
                <div className="login-page__input-wrap">
                  <span className="login-page__input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="recuperar-nueva2"
                    type={mostrarNueva ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={passwordNueva2}
                    onChange={(e) => setPasswordNueva2(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
              </div>

              <button type="submit" className="login-page__submit" disabled={loading}>
                {loading ? 'Guardando…' : 'Restablecer contraseña admin'}
              </button>

              <button
                type="button"
                className="login-page__link login-page__link--block"
                onClick={() => {
                  setModoRecuperar(false);
                  setError('');
                  setCuentaInfo(null);
                  setClaveRecuperacion('');
                  setPasswordNueva('');
                  setPasswordNueva2('');
                }}
              >
                Volver al inicio de sesión
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="login-page__error" role="alert" data-hidden={error ? 'false' : 'true'}>
                {error || ' '}
              </div>
              {exitoRecuperar ? (
                <p className="login-page__success" role="status">
                  {exitoRecuperar}
                </p>
              ) : null}

              <div className="login-page__field login-reveal login-reveal--3">
                <label htmlFor="login-usuario">Usuario</label>
                <div className="login-page__input-wrap">
                  <span className="login-page__input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="login-usuario"
                    type="text"
                    name="usuario"
                    autoComplete="username"
                    required
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Tu usuario"
                  />
                </div>
              </div>

              <div className="login-page__field login-reveal login-reveal--4">
                <label htmlFor="login-password">Contraseña</label>
                <div className="login-page__input-wrap login-page__input-wrap--secret">
                  <span className="login-page__input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    type={mostrarPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <PasswordRevealButton
                    visible={mostrarPassword}
                    onToggle={() => setMostrarPassword((visible) => !visible)}
                    className="login-page__reveal"
                  />
                </div>
              </div>

              <div className="login-page__row login-reveal login-reveal--4">
                <label className="login-page__remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Recordarme
                </label>
                <button type="button" className="login-page__link" onClick={() => void abrirRecuperacion()} disabled={loading}>
                  ¿Olvidaste tu clave?
                </button>
              </div>

              <button
                type="submit"
                className={`login-page__submit login-reveal login-reveal--5${exiting ? ' login-page__submit--exit' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-page__spinner" aria-hidden="true" />
                    Verificando…
                  </>
                ) : (
                  'Entrar al panel'
                )}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
