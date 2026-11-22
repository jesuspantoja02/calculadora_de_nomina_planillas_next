import { ApiError, apiGet, apiPost, mensajeDeError } from '../../shared/infrastructure/http/apiClient';
import { environment } from '../../config/environment';
import { obtenerTokenAuth } from './authStorage';
import type { RolUsuario } from './roles';

export interface SesionApi {
  token: string;
  id: string;
  usuario: string;
  rol: RolUsuario;
  fotoPerfilUrl: string;
}

export interface PerfilApi {
  id: string;
  usuario: string;
  rol: RolUsuario;
  fotoPerfilUrl: string;
  creadoEn: string;
}

export async function loginApi(usuario: string, password: string): Promise<SesionApi> {
  return apiPost<SesionApi>('/auth/login', { usuario, password });
}

export async function fetchPerfilApi(): Promise<PerfilApi> {
  return apiGet<PerfilApi>('/auth/me');
}

export async function actualizarPerfilApi(fotoPerfilUrl: string): Promise<PerfilApi> {
  const token = obtenerTokenAuth();
  const res = await fetch(`${environment.apiUrl}/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fotoPerfilUrl }),
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* vacío */
    }
    throw new ApiError(res.status, mensajeDeError(res.status, body));
  }
  const json = (await res.json()) as { data: PerfilApi };
  return json.data;
}

export async function cambiarPasswordApi(passwordActual: string, passwordNueva: string): Promise<void> {
  const token = obtenerTokenAuth();
  const res = await fetch(`${environment.apiUrl}/auth/cambiar-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ passwordActual, passwordNueva }),
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* vacío */
    }
    throw new ApiError(res.status, mensajeDeError(res.status, body));
  }
}
