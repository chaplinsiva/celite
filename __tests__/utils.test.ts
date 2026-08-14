// agent-notes: ctx="Unit tests for cn utility", deps="vitest, lib/utils", state="active", last="vteam@2026-08-02"
import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    const result = cn('bg-red-500', 'text-white');
    expect(result).toContain('bg-red-500');
    expect(result).toContain('text-white');
  });

  it('should resolve conflicting Tailwind CSS classes', () => {
    const result = cn('p-4', 'p-6');
    expect(result).toBe('p-6');
  });

  it('should handle conditional class names', () => {
    const isPrimary = true;
    const isHidden = false;
    const result = cn('btn', isPrimary && 'btn-primary', isHidden && 'hidden');
    expect(result).toBe('btn btn-primary');
  });
});
