import type { ReactNode } from 'react';

interface PageHeaderProps {
  titulo: string;
  descripcion?: string;
  eyebrow?: string;
  acciones?: ReactNode;
}

export function PageHeader({ titulo, descripcion, eyebrow = 'Planilla Nómina', acciones }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div className="page-head-copy">
        {eyebrow ? <p className="page-head-eyebrow">{eyebrow}</p> : null}
        <h1>{titulo}</h1>
        {descripcion ? <p className="lede">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="page-head-actions">{acciones}</div> : null}
    </header>
  );
}
