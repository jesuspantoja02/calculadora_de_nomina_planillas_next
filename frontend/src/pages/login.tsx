import { LoginPage } from '@/core/pages/LoginPage';
import { SiteHead } from '@/shared/ui/SiteHead';

export default function LoginRoute() {
  return (
    <>
      <SiteHead title="Acceso" />
      <LoginPage />
    </>
  );
}
