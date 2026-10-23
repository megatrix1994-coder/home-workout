import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth';
import { AcceptInvitePage } from './AccessLinkPages';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

const token = 'invite-token-abcdefghijklmnop';

function renderInvite() {
  render(
    <MemoryRouter initialEntries={[`/invite/${token}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AcceptInvitePage', () => {
  it('creates an account for the invited email and signs in', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/v1/auth/me') return jsonResponse({}, 401);
      if (url.startsWith('/api/v1/auth/tokens/')) {
        return jsonResponse({
          data: { kind: 'invite', email: 'baraka@example.com', expiresAt: '2026-10-30T00:00:00.000Z' },
        });
      }
      return jsonResponse(
        { data: { id: 'u-2', email: 'baraka@example.com', name: 'Baraka', role: 'member' } },
        201,
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderInvite();

    const email = await screen.findByLabelText('Email');
    expect(email).toHaveValue('baraka@example.com');
    expect(email).toHaveAttribute('readonly');
    await userEvent.type(screen.getByLabelText('Name'), 'Baraka');
    await userEvent.type(screen.getByLabelText('Password'), 'a-long-password');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'a-long-password');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/accept-invite',
      expect.objectContaining({
        body: JSON.stringify({
          token,
          email: 'baraka@example.com',
          name: 'Baraka',
          password: 'a-long-password',
        }),
      }),
    );
  });

  it('stops a short or mismatched password before calling the server', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      String(input) === '/api/v1/auth/me'
        ? jsonResponse({}, 401)
        : jsonResponse({ data: { kind: 'invite', email: null, expiresAt: '2026-10-30T00:00:00.000Z' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderInvite();

    await userEvent.type(await screen.findByLabelText('Email'), 'new@example.com');
    await userEvent.type(screen.getByLabelText('Name'), 'New');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 10 characters.');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/v1/auth/accept-invite', expect.anything());
  });

  it('explains when the link has been used or revoked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input) === '/api/v1/auth/me'
          ? jsonResponse({}, 401)
          : jsonResponse({ error: { message: 'This link is no longer valid.' } }, 404),
      ),
    );

    renderInvite();

    expect(
      await screen.findByRole('heading', { name: 'This link is no longer valid' }),
    ).toBeInTheDocument();
  });
});
