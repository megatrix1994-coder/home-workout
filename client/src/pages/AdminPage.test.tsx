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

function setup() {
  let memberStatus = 'active';
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
        ],
      });
    }
    if (url.startsWith('/api/v1/admin/invites?')) return jsonResponse({ data: [] });
    if (url === '/api/v1/admin/invites' && method === 'POST') {
      return jsonResponse(
        {
          data: {
            id: 'inv-1',
            email: null,
            role: 'member',
            expiresAt: '2026-10-30T00:00:00.000Z',
            url: 'http://localhost:5173/invite/secret-token',
          },
        },
        201,
      );
    }
    if (url === '/api/v1/admin/users/u-member/remove' && method === 'POST') {
      memberStatus = 'removed';
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

    await userEvent.click(await screen.findByRole('button', { name: 'Create invite link' }));

    expect(await screen.findByLabelText('Link')).toHaveValue(
      'http://localhost:5173/invite/secret-token',
    );
    expect(screen.getByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('http://localhost:5173/invite/secret-token')),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/invites',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ role: 'member' }) }),
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
