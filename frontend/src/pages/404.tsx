import { ProtectedLayout } from '@/core/layout/ProtectedLayout';
import { NotFoundPage } from '@/core/pages/NotFoundPage';

export default function Custom404() {
  return (
    <ProtectedLayout>
      <NotFoundPage />
    </ProtectedLayout>
  );
}
