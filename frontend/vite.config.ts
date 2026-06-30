import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // In dev, forward API + health calls to the Fastify server so the browser
      // talks to one origin and CORS/cookies behave like production.
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
