import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest, request) => {
            const origin = request.headers.origin;
            const host = request.headers.host;
            if (!origin || !host) return;

            try {
              if (new URL(origin).host === host) {
                proxyRequest.setHeader('origin', 'http://127.0.0.1:3001');
              }
            } catch {
              // Let the API reject malformed Origin headers.
            }
          });
        }
      }
    },
    fs: {
      strict: true,
      allow: [process.cwd()]
    }
  }
});
