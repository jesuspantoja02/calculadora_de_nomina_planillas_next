import { ProtectedLayout } from '@/core/layout/ProtectedLayout';
import { BoletasPage } from '@/modules/planilla/presentation/pages/BoletasPage';

export default function BoletasRoute() {
  return (
    <ProtectedLayout>
      <BoletasPage />
    </ProtectedLayout>
  );
}
