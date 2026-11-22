import Link from 'next/link';
import { PageHeader } from '../../shared/ui/PageHeader';

export function NotFoundPage() {
  return (
    <>
      <PageHeader titulo="Página no encontrada" descripcion="La ruta que buscas no existe o fue movida (404)." />
      <Link className="btn btn-primary" href="/empleados">
        Volver al inicio
      </Link>
    </>
  );
}
