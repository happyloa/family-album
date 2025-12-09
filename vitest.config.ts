import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node'
  },
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib')
    }
  }
});
