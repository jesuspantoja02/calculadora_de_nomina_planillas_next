import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { SiteHead, tituloDesdeRuta } from '../../shared/ui/SiteHead';
import { RequireAuth } from '../auth/RequireAuth';
import { Shell } from './Shell';

export function ProtectedLayout({ children }: { children?: ReactNode }) {
  const router = useRouter();
  return (
    <RequireAuth>
      <SiteHead title={tituloDesdeRuta(router.pathname)} />
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}
