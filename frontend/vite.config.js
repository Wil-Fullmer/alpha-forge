import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Vite dev server proxies /api/* to the fixture server (port 3001).
// This avoids CORS issues in development — the browser always talks to
// the same origin (localhost:5173) and Vite forwards matching requests.
// Because of this proxy, client.js uses relative paths (/api/...) rather
// than hardcoding http://localhost:3001, which keeps network calls clean.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
