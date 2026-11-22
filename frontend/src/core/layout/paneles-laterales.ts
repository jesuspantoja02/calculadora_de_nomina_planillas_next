/** Coordina paneles derechos (perfil ↔ asistente) para que no se solapen. */
export const EVENTO_CERRAR_PERFIL = 'nomina:cerrar-perfil';
export const EVENTO_CERRAR_ASISTENTE = 'nomina:cerrar-asistente';
export const EVENTO_PERFIL_VISIBLE = 'nomina:perfil-visible';

export function pedirCerrarPerfil(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENTO_CERRAR_PERFIL));
}

export function pedirCerrarAsistente(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENTO_CERRAR_ASISTENTE));
}

export function avisarPerfilVisible(abierto: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_PERFIL_VISIBLE, { detail: abierto }));
}
