import { RequireGestor } from '@/core/auth/RequireGestor';
import { ProtectedLayout } from '@/core/layout/ProtectedLayout';
import { ConfiguracionPage } from '@/modules/configuracion/presentation/pages/ConfiguracionPage';

export default function ConfiguracionRoute() {
  return (
    <ProtectedLayout>
      <RequireGestor>
        <ConfiguracionPage />
      </RequireGestor>
    </ProtectedLayout>
  );
}
