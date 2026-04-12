'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { NAV_ITEMS, ROUTE_META } from '@/lib/config';

function routeMetaForPath(pathname) {
  if (pathname.startsWith('/releases/')) {
    return { title: 'Release Detail', subtitle: 'Detailed release record and linked operational information.' };
  }
  return ROUTE_META[pathname] || ROUTE_META['/dashboard'];
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const meta = useMemo(() => routeMetaForPath(pathname || '/dashboard'), [pathname]);

  useEffect(() => {
    function handleMessage(event) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'open-release-detail' && event.data.releaseId) {
        router.push(`/releases/${event.data.releaseId}`);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return (
    <div className="app-shell">
      <aside className="shell-sidebar">
        <div className="shell-logo">
          <div className="shell-logo-icon">L</div>
          <div className="shell-logo-text">
            Leah Ops Hub
            <span>Internal Operations</span>
          </div>
        </div>
        <nav className="shell-nav">
          <div className="shell-nav-label">Core</div>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href === '/releases' && pathname.startsWith('/releases/'));
            return (
              <Link key={item.href} href={item.href} className={`shell-nav-btn${active ? ' active' : ''}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="shell-footer">Next.js migration shell · legacy-compatible</div>
      </aside>
      <main className="shell-main">
        <header className="shell-topbar">
          <div>
            <div className="shell-title">{meta.title}</div>
            <div className="shell-subtitle">{meta.subtitle}</div>
          </div>
          <div className="shell-avatar">L</div>
        </header>
        <div className="shell-content">{children}</div>
      </main>
    </div>
  );
}
