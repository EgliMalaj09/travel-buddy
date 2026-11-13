import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '@/App';
import { clearSession } from '@/auth/session';

type Handler = (path: string, body: unknown) => { status: number; body: unknown };

function fakeApi(handler: Handler) {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const request = input as Request;
    const path = new URL(request.url).pathname;
    calls.push(`${request.method} ${path} ${request.headers.get('Authorization') ? 'auth' : 'anon'}`);
    const text = request.method === 'GET' ? '' : await request.text();
    const answer = handler(path, text ? JSON.parse(text) : undefined);
    return new Response(JSON.stringify(answer.body), {
      status: answer.status,
      headers: { 'Content-Type': answer.status >= 400 ? 'application/problem+json' : 'application/json' },
    });
  }) as typeof fetch;
  return calls;
}

const dashboard = {
  at: '2026-11-13T12:00:00Z',
  users: {
    total: 3, active: 3, suspended: 0, deletionRequested: 0, newLast7Days: 1, newLast30Days: 3, activeLast7Days: 2, activeLast30Days: 3,
    signUpsPerDay: [{ day: '2026-11-13', count: 1 }],
  },
  content: [{ key: 'trips', label: 'Trips', value: 4, hint: null }],
};

describe('back office login', () => {
  beforeEach(() => {
    clearSession();
    window.history.pushState({}, '', '/');
  });

  it('asks for the authenticator code, then shows the dashboard with only the pages the role may open', async () => {
    const calls = fakeApi((path) => {
      if (path === '/admin/auth/login') return { status: 200, body: { kind: 'codeRequired', challenge: 'c1' } };
      if (path === '/admin/auth/verify')
        return {
          status: 200,
          body: { accessToken: 'tok', expiresAt: new Date(Date.now() + 1_800_000).toISOString(), me: { userId: 'u1', email: 'v@x.co', role: 'viewer' } },
        };
      if (path === '/admin/dashboard') return { status: 200, body: dashboard };
      return { status: 404, body: {} };
    });
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Email'), 'v@x.co');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    await user.type(await screen.findByLabelText('6-digit code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByText('Trips')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Services' })).toBeInTheDocument();
    expect(calls).toContain('GET /admin/dashboard auth');
    expect(calls).toContain('POST /admin/auth/login anon');
  });

  it('shows the QR code and key on the first login', async () => {
    fakeApi(() => ({
      status: 200,
      body: { kind: 'setupRequired', challenge: 'c1', secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' },
    }));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'o@x.co');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Set up your authenticator app')).toBeInTheDocument();
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
  });

  it('shows the API error text when the password is wrong', async () => {
    fakeApi(() => ({ status: 401, body: { title: 'Email or password is not right.', status: 401, code: 'invalid_credentials' } }));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Email'), 'o@x.co');
    await user.type(screen.getByLabelText('Password'), 'wrong password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is not right.');
  });
});
