import { ProtectedLayout } from '@/core/layout/ProtectedLayout';
import { EmpleadosPage } from '@/modules/empleados/presentation/pages/EmpleadosPage';

export default function EmpleadosRoute() {
  return (
    <ProtectedLayout>
      <EmpleadosPage />
    </ProtectedLayout>
  );
}
