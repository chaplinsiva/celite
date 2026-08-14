// agent-notes: ctx="Vitest setup with Testing Library and Next.js mocks", deps="@testing-library/jest-dom, vitest", state="active", last="vteam@2026-08-02"
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));
