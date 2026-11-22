import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../../shared/infrastructure/http/apiClient';
import { loginApi } from './authApi';
import {
  borrarSesion,
  EVENTO_SESION_EXPIRADA,
  guardarSesion,
  leerSesion,
  registrarLectorToken,
  type RolUsuario,
  type SesionGuardada,
} from './authStorage';

export const USUARIO_ADMIN_INICIAL = 'jesus.pantoja';

interface AuthContextValue {
  ready: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  rol: RolUsuario | null;
  fotoPerfilUrl: string | null;
  login: (usuario: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => void;
  actualizarFotoSesion: (fotoPerfilUrl: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sesion, setSesion] = useState<SesionGuardada | null>(null);

  useEffect(() => {
    const actual = leerSesion();
    setSesion(actual);
    setReady(true);
  }, []);

  useEffect(() => {
    const onExpirada = () => setSesion(null);
    window.addEventListener(EVENTO_SESION_EXPIRADA, onExpirada);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, onExpirada);
  }, []);

  registrarLectorToken(() => sesion?.token ?? null);

  const login = useCallback(async (usuario: string, password: string) => {
    try {
      const data = await loginApi(usuario.trim(), password);
      const guardada: SesionGuardada = {
        token: data.token,
        id: data.id,
        usuario: data.usuario,
        rol: data.rol,
        fotoPerfilUrl: data.fotoPerfilUrl ?? '',
      };
      guardarSesion(guardada);
      setSesion(guardada);
      return { ok: true as const };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false as const, message: error.message };
      }
      return { ok: false as const, message: 'No se pudo conectar con el servidor. ¿Está encendido el backend?' };
    }
  }, []);

  const logout = useCallback(() => {
    borrarSesion();
    setSesion(null);
  }, []);

  const actualizarFotoSesion = useCallback((fotoPerfilUrl: string) => {
    setSesion((actual) => {
      if (!actual) return actual;
      const siguiente = { ...actual, fotoPerfilUrl };
      guardarSesion(siguiente);
      return siguiente;
    });
  }, []);

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated: sesion != null,
      userId: sesion?.id ?? null,
      userEmail: sesion?.usuario ?? null,
      rol: sesion?.rol ?? null,
      fotoPerfilUrl: sesion?.fotoPerfilUrl ?? null,
      login,
      logout,
      actualizarFotoSesion,
    }),
    [ready, sesion, login, logout, actualizarFotoSesion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
