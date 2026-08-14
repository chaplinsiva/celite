// agent-notes: ctx="Vitest configuration with v8 coverage and React support", deps="vitest, @vitejs/plugin-react", state="active", last="vteam@2026-08-02"
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'coverage/**',
        '**/*.d.ts',
        'vitest.config.ts',
        'vitest.setup.ts',
        'next.config.ts',
        'next-sitemap.config.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
