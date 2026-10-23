import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, RequireAdmin, RequireUser } from './auth';
import { safeNext } from './auth-context';
import { LoginPage } from './pages/LoginPage';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

const member = { id: 'u-1', email: 'amina@example.com', name: 'Amina', role: 'member' };

function Where() {
  const location = useLocation();
  return <p>At {`${location.pathname}${location.search}`}</p>;
}

function renderApp(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireUser />}>
            <Route path="/history" element={<p>History page</p>} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<p>Admin page</p>} />
            </Route>
          </Route>
          <Route path="*" element={<Where />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('auth guards', () => {
  it('sends a signed-out visitor to sign in, then back to the page they asked for', async () => {
    let signedIn = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v1/auth/me') {
        return signedIn
          ? jsonResponse({ data: member })
          : jsonResponse({ error: { message: 'Sign in to continue.' } }, 401);
      }
      if (url === '/api/v1/auth/login' && init?.method === 'POST') {
        signedIn = true;
        return jsonResponse({ data: member });
      }
      return jsonResponse({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/history');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'amina@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'long-password-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('History page')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'amina@example.com', password: 'long-password-1' }),
      }),
    );
  });

  it('shows the server message when the password is wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input) === '/api/v1/auth/me'
          ? jsonResponse({}, 401)
          : jsonResponse({ error: { message: 'Email or password is incorrect.' } }, 401),
      ),
    );

    renderApp('/login');

    await userEvent.type(await screen.findByLabelText('Email'), 'amina@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('keeps members out of the admin page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: member })));

    renderApp('/admin');

    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeInTheDocument();
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
  });

  it('lets an admin open the admin page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: { ...member, role: 'admin' } })));

    renderApp('/admin');

    expect(await screen.findByText('Admin page')).toBeInTheDocument();
  });

  it('only follows a same-site path after sign-in', () => {
    expect(safeNext('/history')).toBe('/history');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
