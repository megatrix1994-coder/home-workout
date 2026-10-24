import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth';
import { RegisterPage } from './RegisterPage';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

function setup() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/v1/auth/me') return jsonResponse({}, 401);
    if (url === '/api/v1/auth/register' && init?.method === 'POST') {
      return jsonResponse({ data: { email: 'friend@example.com', name: 'Friend', status: 'pending' } }, 201);
    }
    return jsonResponse({}, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  return fetchMock;
}

describe('RegisterPage', () => {
  it('sends a request and tells the person to wait for approval', async () => {
    const fetchMock = setup();
    await userEvent.type(await screen.findByLabelText('Email'), 'friend@example.com');
    await userEvent.type(screen.getByLabelText('Name'), 'Friend');
    await userEvent.type(screen.getByLabelText('Password'), 'long-password');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'long-password');
    await userEvent.click(screen.getByRole('button', { name: 'Request access' }));

    expect(await screen.findByRole('heading', { name: 'Waiting for approval' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'friend@example.com',
          name: 'Friend',
          password: 'long-password',
        }),
      }),
    );
  });

  it('refuses mismatched passwords without calling the API', async () => {
    const fetchMock = setup();
    await userEvent.type(await screen.findByLabelText('Email'), 'friend@example.com');
    await userEvent.type(screen.getByLabelText('Name'), 'Friend');
    await userEvent.type(screen.getByLabelText('Password'), 'long-password');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'other-password');
    await userEvent.click(screen.getByRole('button', { name: 'Request access' }));

    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/v1/auth/register', expect.anything());
  });
});
