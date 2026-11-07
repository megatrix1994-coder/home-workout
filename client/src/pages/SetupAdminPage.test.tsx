import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth';
import { SetupAdminPage } from './SetupAdminPage';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

describe('SetupAdminPage', () => {
  it('creates the admin and opens the admin page', async () => {
    const admin = { id: 'admin-1', email: 'alex@example.com', name: 'Alex Admin', role: 'admin' };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v1/auth/me') return jsonResponse({}, 401);
      if (url === '/api/v1/auth/setup-admin' && init?.method === 'POST') {
        return jsonResponse({ data: admin }, 201);
      }
      if (url === '/api/v1/auth/setup-admin') return jsonResponse({ data: { needed: true } });
      return jsonResponse({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/setup']}>
        <AuthProvider>
          <Routes>
            <Route path="/setup" element={<SetupAdminPage />} />
            <Route path="/admin" element={<p>Admin page</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await userEvent.type(await screen.findByLabelText('Email'), 'alex@example.com');
    await userEvent.type(screen.getByLabelText('Name'), 'Alex Admin');
    await userEvent.type(screen.getByLabelText('Password'), 'long-password');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'long-password');
    await userEvent.click(screen.getByRole('button', { name: 'Create admin' }));

    expect(await screen.findByText('Admin page')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/setup-admin',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'alex@example.com',
          name: 'Alex Admin',
          password: 'long-password',
        }),
      }),
    );
  });
});
