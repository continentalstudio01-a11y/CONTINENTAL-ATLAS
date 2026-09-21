import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          dados: ['dexie', 'dexie-react-hooks', '@supabase/supabase-js']
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg'],
      manifest: {
        name: 'Continental Atlas',
        short_name: 'Atlas',
        description: 'Sistema de gestão da Continental MKT',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#E6EDF6',
        theme_color: '#E6EDF6',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Novo evento', url: '/agenda?novo=1' },
          { name: 'Nova tarefa', url: '/tarefas?novo=1' },
          { name: 'Novo lançamento', url: '/financeiro?novo=1' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
});
