import { NavLink, Outlet } from 'react-router';

import { useAuth } from '@/auth/AuthProvider';
import { Button, Icon, type IconName } from '@/components/core';
import type { Role } from '@/lib/roles';

const links: { to: string; label: string; icon: IconName; role: Role }[] = [
  { to: '/', label: 'Dashboard', icon: 'home', role: 'viewer' },
  { to: '/users', label: 'Accounts', icon: 'users', role: 'support' },
  { to: '/deletions', label: 'Deletion queue', icon: 'trash', role: 'support' },
  { to: '/config', label: 'App settings', icon: 'sliders', role: 'viewer' },
  { to: '/services', label: 'Services', icon: 'pulse', role: 'viewer' },
  { to: '/team', label: 'Team', icon: 'team', role: 'owner' },
  { to: '/audit', label: 'Audit log', icon: 'list', role: 'owner' },
];

/** The frame of every page after login: navigation (side on a computer, top on a phone) and the page. */
export function Shell() {
  const { session, signOut, can } = useAuth();
  return (
    <div className="shell">
      <nav className="nav" aria-label="Back office">
        <div className="brand">
          <i aria-hidden>T</i> Back office
        </div>
        {links
          .filter((l) => can(l.role))
          .map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}>
              <Icon name={l.icon} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        <div className="spacer" />
        <div className="who">
          <span className="cap" style={{ overflowWrap: 'anywhere' }}>
            {session?.me.email}
          </span>
          <span className="mono">{session?.me.role}</span>
          <Button variant="ghost" small onClick={() => signOut()} style={{ justifyContent: 'flex-start', paddingLeft: 0 }}>
            <Icon name="out" size={18} /> Log out
          </Button>
        </div>
      </nav>
      <main className="main" id="main">
        <Outlet />
      </main>
    </div>
  );
}
