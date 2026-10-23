import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PrivacyPage } from './PrivacyPage';

describe('PrivacyPage', () => {
  it('says what is stored and how to ask for deletion', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Privacy notice' })).toBeInTheDocument();
    expect(screen.getByText(/hashed password/i)).toBeInTheDocument();
    expect(screen.getByText(/delete the account/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Protection Act, 2019/i)).toBeInTheDocument();
  });
});
