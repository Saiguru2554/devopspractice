
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('TaskFlow Application', () => {
  beforeEach(() => {
    localStorage.clear();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '[]'
      })
    );
  });

  it('renders the TaskFlow homepage', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /make room for/i
      })
    ).toBeInTheDocument();
  });

  it('displays AWS connection settings', () => {
    render(<App />);

    expect(
      screen.getByText(/connect your aws api/i)
    ).toBeInTheDocument();
  });
});
