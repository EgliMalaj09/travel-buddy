import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { EmptyState, Shell } from '@/components';
import type { Role } from '@/lib/roles';
import { AuditPage } from '@/pages/AuditPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DeletionsPage } from '@/pages/DeletionsPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { TeamPage } from '@/pages/TeamPage';
import { UserPage } from '@/pages/UserPage';
import { UsersPage } from '@/pages/UsersPage';

/** Pages a role may not open say so (the API refuses them anyway). */
function Need({ role, children }: { role: Role; children: ReactNode }) {
  const { can } = useAuth();
  return can(role) ? children : <EmptyState icon="lock" title="Your role cannot open this page" message="Ask an owner if you need it." />;
}

function Routed() {
  const { session } = useAuth();
  if (!session) return <LoginPage />;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<Need role="support"><UsersPage /></Need>} />
        <Route path="users/:id" element={<Need role="support"><UserPage /></Need>} />
        <Route path="deletions" element={<Need role="support"><DeletionsPage /></Need>} />
        <Route path="config" element={<ConfigPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="team" element={<Need role="owner"><TeamPage /></Need>} />
        <Route path="audit" element={<Need role="owner"><AuditPage /></Need>} />
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </BrowserRouter>
  );
}
