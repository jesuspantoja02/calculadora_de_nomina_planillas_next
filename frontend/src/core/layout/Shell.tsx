import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { Icon } from '../../shared/ui/Icon';
import { AiAsistenteFab } from './AiAsistenteFab';
import { WelcomePanel } from './WelcomePanel';
import { Sidebar } from './Sidebar';

export function Shell({ children }: { children?: ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const router = useRouter();
  const enCartilla = router.pathname === '/';

  return (
    <div className="shell">
      <button type="button" className="menu-btn no-print" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>
        <Icon nombre="menu" tamano={20} />
      </button>
      <div
        className={`sidebar-backdrop no-print${menuAbierto ? ' abierto' : ''}`}
        onClick={() => setMenuAbierto(false)}
        onKeyDown={undefined}
        role="presentation"
      />

      <Sidebar abierto={menuAbierto} onNavegar={() => setMenuAbierto(false)} />

      <main className={`main${enCartilla ? ' main--cartilla' : ''}`}>
        {enCartilla ? (
          <WelcomePanel />
        ) : (
          <div className="view motion-page">{children}</div>
        )}
      </main>

      <AiAsistenteFab />
    </div>
  );
}
