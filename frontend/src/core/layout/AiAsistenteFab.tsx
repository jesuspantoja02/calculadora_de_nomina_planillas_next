import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { enviarConsultaAsistenteApi, type MensajeAsistente } from '../asistente/asistenteApi';
import { ApiError } from '../../shared/infrastructure/http/apiClient';
import { Icon } from '../../shared/ui/Icon';
import { EVENTO_CERRAR_ASISTENTE, EVENTO_PERFIL_VISIBLE, pedirCerrarPerfil } from './paneles-laterales';

function renderTexto(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

export function AiAsistenteFab() {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [mensajes, setMensajes] = useState<MensajeAsistente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const [perfilVisible, setPerfilVisible] = useState(false);
  const tituloId = useId();
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const abrir = () => {
    pedirCerrarPerfil();
    setPerfilVisible(false);
    setAbierto(true);
  };

  const cerrar = () => setAbierto(false);

  useEffect(() => {
    const onCerrar = () => setAbierto(false);
    const onPerfil = (e: Event) => {
      const abiertoPerfil = Boolean((e as CustomEvent<boolean>).detail);
      setPerfilVisible(abiertoPerfil);
      if (abiertoPerfil) setAbierto(false);
    };
    window.addEventListener(EVENTO_CERRAR_ASISTENTE, onCerrar);
    window.addEventListener(EVENTO_PERFIL_VISIBLE, onPerfil as EventListener);
    return () => {
      window.removeEventListener(EVENTO_CERRAR_ASISTENTE, onCerrar);
      window.removeEventListener(EVENTO_PERFIL_VISIBLE, onPerfil as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [abierto]);

  useEffect(() => {
    const el = listaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [mensajes, cargando, abierto]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const texto = borrador.trim();
    if (!texto || cargando) return;

    const historial = mensajes.slice(-12);
    const siguienteUser: MensajeAsistente = { role: 'user', content: texto };
    setMensajes((m) => [...m, siguienteUser]);
    setBorrador('');
    setError(null);
    setCargando(true);

    try {
      const data = await enviarConsultaAsistenteApi(texto, historial);
      setConectado(true);
      setMensajes((m) => [...m, { role: 'assistant', content: data.respuesta }]);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo obtener respuesta del asistente.';
      setError(msg);
      setMensajes((m) => m.slice(0, -1));
      setBorrador(texto);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="ai-asistente no-print">
      <div
        className={`ai-asistente__backdrop${abierto ? ' ai-asistente__backdrop--open' : ''}`}
        onClick={cerrar}
        role="presentation"
      />

      <aside
        className={`ai-asistente__sheet${abierto ? ' ai-asistente__sheet--open' : ''}`}
        aria-hidden={!abierto}
        inert={!abierto ? true : undefined}
        aria-labelledby={tituloId}
        role="dialog"
        aria-modal="true"
      >
        <header className="ai-asistente__head">
          <div className="ai-asistente__brand">
            <span className="ai-asistente__brand-icon" aria-hidden="true">
              <Icon nombre="sparkles" tamano={16} />
            </span>
            <div>
              <h2 id={tituloId} className="ai-asistente__title">
                Asistente
              </h2>
              <p className="ai-asistente__subtitle">
                {conectado ? 'IA por API key' : 'Consultas sobre el sistema'}
              </p>
            </div>
          </div>
          <button type="button" className="ai-asistente__close" aria-label="Cerrar asistente" onClick={cerrar}>
            <Icon nombre="x" tamano={18} />
          </button>
        </header>

        <div className="ai-asistente__body" ref={listaRef}>
          {mensajes.length === 0 && !cargando ? (
            <div className="ai-asistente__empty">
              <Icon nombre="message" tamano={28} />
              <p className="ai-asistente__empty-title">Pregunta lo que necesites</p>
              <p className="ai-asistente__empty-text">
                Empleados, AFP, boletas, quincena, quinta categoría, roles o configuración.
              </p>
              <div className="ai-asistente__suggestions">
                {[
                  '¿Cómo se calcula la AFP Integra?',
                  '¿Qué es el adelanto quincenal?',
                  '¿Quién puede entrar a Configuración?',
                ].map((s) => (
                  <button key={s} type="button" className="ai-asistente__chip" onClick={() => setBorrador(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="ai-asistente__messages">
              {mensajes.map((m, i) => (
                <li key={`${m.role}-${i}`} className={`ai-asistente__msg ai-asistente__msg--${m.role}`}>
                  <div className="ai-asistente__bubble">{renderTexto(m.content)}</div>
                </li>
              ))}
              {cargando ? (
                <li className="ai-asistente__msg ai-asistente__msg--assistant">
                  <div className="ai-asistente__bubble ai-asistente__bubble--typing" aria-live="polite">
                    Escribiendo…
                  </div>
                </li>
              ) : null}
            </ul>
          )}
          {error ? <p className="ai-asistente__error">{error}</p> : null}
        </div>

        <form className="ai-asistente__composer" onSubmit={(e) => void enviar(e)}>
          <label htmlFor="ai-asistente-input" className="visually-hidden">
            Escribe tu consulta
          </label>
          <textarea
            ref={inputRef}
            id="ai-asistente-input"
            className="ai-asistente__input"
            rows={2}
            placeholder="Escribe tu pregunta…"
            value={borrador}
            disabled={cargando}
            onChange={(e) => setBorrador(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void enviar(e);
              }
            }}
          />
          <button
            type="submit"
            className="ai-asistente__send"
            aria-label="Enviar consulta"
            disabled={cargando || !borrador.trim()}
          >
            <Icon nombre="send" tamano={18} />
          </button>
        </form>
      </aside>

      <button
        type="button"
        className={`ai-asistente__fab${abierto || perfilVisible ? ' ai-asistente__fab--hidden' : ''}`}
        aria-label="Abrir asistente de consultas"
        aria-expanded={abierto}
        aria-hidden={abierto || perfilVisible}
        onClick={abrir}
      >
        <Icon nombre="message" tamano={22} />
      </button>
    </div>
  );
}
