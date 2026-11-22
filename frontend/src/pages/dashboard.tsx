import { ProtectedLayout } from '@/core/layout/ProtectedLayout';
import { DashboardPage } from '@/modules/dashboard/presentation/pages/DashboardPage';

export default function DashboardRoute() {
  return (
    <ProtectedLayout>
      <DashboardPage />
    </ProtectedLayout>
  );
}
