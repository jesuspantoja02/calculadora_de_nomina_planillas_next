import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../auth/AuthContext';
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
              <h2 id="login-heading">Acceso al panel</h2>
              <p>Usa tu usuario registrado. La sesión se protege con token JWT.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate>
            <div
              className="login-page__error"
              role="alert"
              data-hidden={error ? 'false' : 'true'}
            >
              {error || ' '}
            </div>

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
              <a className="login-page__link" href="#recuperar" onClick={(e) => e.preventDefault()}>
                ¿Olvidaste tu clave?
              </a>
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
        </section>
      </div>
    </div>
  );
}
