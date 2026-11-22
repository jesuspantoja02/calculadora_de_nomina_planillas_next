import { ProtectedLayout } from '@/core/layout/ProtectedLayout';
import { RequireGestor } from '@/core/auth/RequireGestor';
import { UsuariosPage } from '@/modules/usuarios/presentation/pages/UsuariosPage';

export default function UsuariosRoute() {
  return (
    <ProtectedLayout>
      <RequireGestor>
        <UsuariosPage />
      </RequireGestor>
    </ProtectedLayout>
  );
}
