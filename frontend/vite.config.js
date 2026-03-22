import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In fixture mode (default): proxy /api/* to VITE_PROXY_TARGET (default: localhost:3001).
// In backend mode (VITE_API_URL set in .env.local): client.js uses absolute URLs that bypass
// the proxy entirely, so the proxy target is irrelevant but harmless.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3001';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': proxyTarget,
      },
    },
  };
});
