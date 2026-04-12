'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { NAV_ITEMS, ROUTE_META } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase/client';

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
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const isLoginRoute = pathname === '/login';

  useEffect(() => {
    function handleMessage(event) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'open-release-detail' && event.data.releaseId && event.data.catalogueId && event.data.catalogueType) {
        const params = new URLSearchParams({
          catalogue_id: String(event.data.catalogueId),
          catalogue_type: String(event.data.catalogueType)
        });
        router.push(`/releases/${event.data.releaseId}?${params.toString()}`);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      setAuthReady(true);
      if (!data.session && !isLoginRoute) router.replace('/login');
      if (data.session && isLoginRoute) router.replace('/dashboard');
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setAuthReady(true);
      if (!nextSession && !isLoginRoute) router.replace('/login');
      if (nextSession && isLoginRoute) router.replace('/dashboard');
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isLoginRoute, router]);

  if (!authReady) {
    return <div className="auth-shell"><div className="auth-card"><div className="loading-block">Loading…</div></div></div>;
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!session) {
    return <div className="auth-shell"><div className="auth-card"><div className="loading-block">Redirecting…</div></div></div>;
  }

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
