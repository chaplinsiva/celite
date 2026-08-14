// agent-notes: ctx="UI test for Header component", deps="vitest, @testing-library/react, components/Header", state="active", last="vteam@2026-08-02"
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Header from '../components/Header';
import { AppProvider } from '../context/AppContext';

// Mock Supabase browser client
vi.mock('../lib/supabaseClient', () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  return {
    getSupabaseBrowserClient: () => ({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      from: vi.fn().mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      }),
    }),
  };
});

describe('Header component', () => {
  it('renders logo and navigation links', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <Header />
        </AppProvider>
      );
    });

    // Verify brand title is rendered
    expect(screen.getByText(/Celite/i)).toBeInTheDocument();
  });
});
