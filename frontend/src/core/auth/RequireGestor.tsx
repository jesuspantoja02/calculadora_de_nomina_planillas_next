import { useRouter } from 'next/router';
import { useEffect, type ReactNode } from 'react';
import { esGestor } from './roles';
import { useAuth } from './AuthContext';

export function RequireGestor({ children }: { children: ReactNode }) {
  const { rol, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!esGestor(rol)) {
      void router.replace('/');
    }
  }, [ready, rol, router]);

  if (!ready || !esGestor(rol)) {
    return <div className="panel empty m-4">Cargando…</div>;
  }

  return <>{children}</>;
}
