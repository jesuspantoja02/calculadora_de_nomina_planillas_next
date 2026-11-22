import type { CSSProperties } from 'react';
import { estilosAvatarTinte, iniciales, tintePersona } from '../formatters';
import { Icon } from './Icon';

interface UserAvatarProps {
  nombre: string;
  fotoUrl?: string | null;
  size?: number;
  tema?: 'light' | 'dark';
  className?: string;
  /** Si no hay foto, usa iniciales (lista) o icono (perfil). */
  fallback?: 'iniciales' | 'icono';
}

export function UserAvatar({
  nombre,
  fotoUrl,
  size = 40,
  tema = 'light',
  className = '',
  fallback = 'iniciales',
}: UserAvatarProps) {
  const style = {
    width: size,
    height: size,
    minWidth: size,
    ...(!fotoUrl && fallback === 'iniciales' ? estilosAvatarTinte(tintePersona(nombre, tema)) : undefined),
  } as CSSProperties;

  if (fotoUrl) {
    return (
      <span
        className={`user-avatar user-avatar--foto user-avatar--circular${className ? ` ${className}` : ''}`}
        style={style}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fotoUrl} alt="" width={size} height={size} />
      </span>
    );
  }

  if (fallback === 'icono') {
    return (
      <span className={`user-avatar user-avatar--icon${className ? ` ${className}` : ''}`} style={style} aria-hidden="true">
        <Icon nombre="user" tamano={Math.round(size * 0.45)} />
      </span>
    );
  }

  return (
    <span className={`user-avatar${className ? ` ${className}` : ''}`} style={style} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  );
}
