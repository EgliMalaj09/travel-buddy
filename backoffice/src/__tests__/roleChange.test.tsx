import { act, render, screen } from '@testing-library/react';

import { App } from '@/App';
import { clearSession, saveSession } from '@/auth/session';

const dashboard = {
  at: '2026-11-13T12:00:00Z',
  users: {
    total: 1, active: 1, suspended: 0, deletionRequested: 0, newLast7Days: 0, newLast30Days: 0, activeLast7Days: 0, activeLast30Days: 0,
    signUpsPerDay: [],
  },
  content: [],
};

function fakeApi(answer: (path: string) => { status: number; body: unknown }) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const a = answer(new URL((input as Request).url).pathname);
    return new Response(JSON.stringify(a.body), {
      status: a.status,
      headers: { 'Content-Type': a.status >= 400 ? 'application/problem+json' : 'application/json' },
    });
  }) as typeof fetch;
}

function signedInAs(role: string) {
  saveSession({
    token: 'tok',
    expiresAt: new Date(Date.now() + 1_800_000).toISOString(),
    me: { userId: 'u1', email: 'm@x.co', role },
  });
}

describe('role changed or removed by an owner', () => {
  beforeEach(() => {
    clearSession();
    window.history.pushState({}, '', '/');
  });

  it('updates the menu when the role was lowered, without logging in again', async () => {
    signedInAs('support');
    let role = 'support';
    fakeApi((path) => {
      if (path === '/admin/me') return { status: 200, body: { userId: 'u1', email: 'm@x.co', role } };
      if (path === '/admin/dashboard') return { status: 200, body: dashboard };
      return { status: 200, body: { items: [], nextCursor: null } };
    });
    render(<App />);
    expect(await screen.findByRole('link', { name: 'Accounts' })).toBeInTheDocument();

    role = 'viewer';
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await vi.waitFor(() => expect(screen.queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument());
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('says an owner removed the access when a still-valid token is refused', async () => {
    signedInAs('viewer');
    fakeApi(() => ({ status: 401, body: { title: 'Please log in again.', status: 401 } }));
    render(<App />);
    expect(await screen.findByText(/An owner removed your back office access/)).toBeInTheDocument();
    expect(screen.queryByText(/sessions last 30 minutes/)).not.toBeInTheDocument();
  });
});
