import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth';
import { AdminPage } from './AdminPage';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

const admin = { id: 'u-admin', email: 'admin@example.com', name: 'Wanjiru', role: 'admin' };

function adminUser(overrides: Record<string, unknown>) {
  return {
    ...admin,
    status: 'active',
    createdAt: '2026-10-01T00:00:00.000Z',
    removedAt: null,
    workoutCount: 0,
    lastSeenAt: null,
    ...overrides,
  };
}

function setup(invite: { mobileUrl?: string | null } = {}) {
  let memberStatus = 'active';
  let requestStatus = 'pending';
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url === '/api/v1/auth/me') return jsonResponse({ data: admin });
    if (url.startsWith('/api/v1/admin/users?')) {
      return jsonResponse({
        data: [
          adminUser({ workoutCount: 4 }),
          adminUser({
            id: 'u-member',
            email: 'otieno@example.com',
            name: 'Otieno',
            role: 'member',
            status: memberStatus,
            workoutCount: 2,
          }),
          adminUser({
            id: 'u-request',
            email: 'friend@example.com',
            name: 'Friend',
            role: 'member',
            status: requestStatus,
            workoutCount: 0,
          }),
        ],
      });
    }
    if (url.startsWith('/api/v1/admin/invites?')) return jsonResponse({ data: [] });
    if (url === '/api/v1/admin/invites' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { email?: string; role?: string };
      return jsonResponse(
        {
          data: {
            id: 'inv-1',
            email: body.email ?? null,
            role: body.role ?? 'member',
            expiresAt: '2026-10-30T00:00:00.000Z',
            url: 'http://localhost:5173/invite/secret-token',
            mobileUrl:
              invite.mobileUrl === undefined ? null : invite.mobileUrl,
          },
        },
        201,
      );
    }
    if (url === '/api/v1/admin/users/u-member/remove' && method === 'POST') {
      memberStatus = 'removed';
      return jsonResponse({ data: {} });
    }
    if (url === '/api/v1/admin/users/u-request/approve' && method === 'POST') {
      requestStatus = 'active';
      return jsonResponse({ data: {} });
    }
    return jsonResponse({}, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  render(
    <MemoryRouter>
      <AuthProvider>
        <AdminPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe('AdminPage', () => {
  it('creates an invite link and shows it once with share options', async () => {
    const fetchMock = setup();

    await userEvent.click(await screen.findByRole('button', { name: 'Create invite' }));

    expect(await screen.findByLabelText('Link')).toHaveValue(
      'http://localhost:5173/invite/secret-token',
    );
    expect(screen.queryByRole('link', { name: 'Send email' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('http://localhost:5173/invite/secret-token')),
    );
    expect(screen.getByText('A phone link is unavailable on this computer.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Send mobile link' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/invites',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ role: 'member' }) }),
    );
  });

  it('offers Gmail and mail-app links when the invite is locked to an email', async () => {
    setup();
    await userEvent.type(await screen.findByLabelText('Email (optional)'), 'friend@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create invite' }));
    const send = await screen.findByRole('link', { name: 'Send email' });
    expect(send).toHaveAttribute('href', expect.stringContaining('mail.google.com'));
    expect(send).toHaveAttribute('href', expect.stringContaining('friend%40example.com'));
    expect(screen.getByRole('link', { name: 'Open mail app' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:friend@example.com'),
    );
  });

  it('offers a phone Wi-Fi link when the server returns a mobile URL', async () => {
    const phone = 'http://192.168.1.70:8080/invite/secret-token';
    setup({ mobileUrl: phone });
    await userEvent.type(await screen.findByLabelText('Email (optional)'), 'friend@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create invite' }));

    expect(await screen.findByLabelText('Phone link')).toHaveValue(phone);
    expect(screen.getByRole('link', { name: 'Send mobile link' })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent(phone)),
    );
    expect(screen.getByRole('link', { name: 'Open mail app with mobile link' })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent(phone)),
    );
    expect(screen.getByRole('link', { name: 'Share mobile link on WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent(phone)),
    );
    expect(screen.getByRole('button', { name: 'Copy mobile link' })).toBeInTheDocument();
    expect(screen.queryByText('A phone link is unavailable on this computer.')).not.toBeInTheDocument();
  });

  it('approves an access request from the admin page', async () => {
    const fetchMock = setup();
    const request = (await screen.findByText(/friend@example.com/)).closest('li')!;
    expect(within(request).getByText(/requested/i)).toBeInTheDocument();
    await userEvent.click(within(request).getByRole('button', { name: 'Approve' }));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/users/u-request/approve',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('removes a member and hides actions on your own account', async () => {
    const fetchMock = setup();

    const otieno = (await screen.findByRole('heading', { name: 'Otieno' })).closest('li')!;
    const self = screen.getByRole('heading', { name: /Wanjiru/ }).closest('li')!;
    expect(within(self).queryByRole('button')).not.toBeInTheDocument();

    await userEvent.click(within(otieno).getByRole('button', { name: 'Remove access' }));

    expect(await screen.findByText('Access removed')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/users/u-member/remove',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
