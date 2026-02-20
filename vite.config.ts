import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`
    ),
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
