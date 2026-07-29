import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // O alvo NAO leva "/api": o proxy do Vite nao remove o prefixo que casou,
      // ele acrescenta o caminho inteiro ao alvo. Com "…:3333/api" aqui, uma
      // chamada a /api/saude chegaria na API como /api/api/saude.
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
});
