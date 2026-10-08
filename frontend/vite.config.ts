import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: {
      proxy: {
        '/api': { target: env.VITE_API_URL ?? 'http://localhost:3000', changeOrigin: false },
      },
    },
  };
});
