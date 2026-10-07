import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Lê o .env da raiz para que o proxy siga a porta real da API (variável PORT)
  const env = loadEnv(mode, path.resolve(root, '../..'), '');
  const api = `http://localhost:${env.PORT || 3000}`;
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'script',
        includeAssets: ['favicon.svg', 'theme-init.js', 'robots.txt', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'RouteFlow — Gestão inteligente de operações em campo',
          short_name: 'RouteFlow',
          description:
            'Agenda, rotas, visitas, evidências, autorizações e despesas de operações em campo.',
          lang: 'pt-BR',
          start_url: '/dashboard',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0a1220',
          theme_color: '#13233b',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Cache básico do "app shell". Dados da API não são cacheados (offline completo: roadmap).
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/health/],
          cleanupOutdatedCaches: true,
          // pdf.js só é usado ao enviar cartas: fica fora do cache inicial (economia de dados móveis)
          globIgnores: ['**/pdf-*.js', '**/pdf.worker*'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
        '@routeflow/types': path.resolve(root, '../../packages/types/src/index.ts'),
        '@routeflow/ui': path.resolve(root, '../../packages/ui/src/index.ts'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 5173,
      proxy: { '/api': api, '/health': api },
    },
    build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1200 },
  };
});
