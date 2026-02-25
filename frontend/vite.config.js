import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // ── Development ─────────────────────────────────────────────
  // Proxy /api calls to the Express backend running locally.
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:10000',
        changeOrigin: true,
      },
    },
  },

  // ── Production build ─────────────────────────────────────────
  // Output goes to dist/. The Render build step copies this to
  // backend/public/ so Express can serve it as static files.
  build: {
    outDir:       'dist',
    sourcemap:    mode === 'development',
    // Roll up chunks so the initial load is fast
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          charts:   ['recharts'],
          icons:    ['lucide-react'],
        },
      },
    },
  },
}));
