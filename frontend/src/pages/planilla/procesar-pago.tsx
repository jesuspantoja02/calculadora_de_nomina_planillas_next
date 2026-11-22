import { ProtectedLayout } from '@/core/layout/ProtectedLayout';
import { ProcesarPagoPage } from '@/modules/planilla/presentation/pages/ProcesarPagoPage';

export default function ProcesarPagoRoute() {
  return (
    <ProtectedLayout>
      <ProcesarPagoPage />
    </ProtectedLayout>
  );
}
