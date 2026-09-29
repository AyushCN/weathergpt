import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'WeatherGPT',
        short_name: 'WeatherGPT',
        description: 'AI-Powered Conversational Weather Intelligence',
        theme_color: '#0ea5e9',
        background_color: '#f0f9ff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: new RegExp('^https://api\\.open-meteo\\.com/.*', 'i'), handler: 'StaleWhileRevalidate', options: { cacheName: 'open-meteo-cache', expiration: { maxEntries: 50, maxAgeSeconds: 600 }, networkTimeoutSeconds: 10 } },
          { urlPattern: new RegExp('^https://geocoding-api\\.open-meteo\\.com/.*', 'i'), handler: 'StaleWhileRevalidate', options: { cacheName: 'geocoding-cache', expiration: { maxEntries: 100, maxAgeSeconds: 3600 } } },
          { urlPattern: new RegExp('^https://fonts\\.googleapis\\.com/.*', 'i'), handler: 'CacheFirst', options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } } },
          { urlPattern: new RegExp('^https://fonts\\.gstatic\\.com/.*', 'i'), handler: 'CacheFirst', options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } } }
        ]
      },
      offlineGoogleAnalytics: false,
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [new RegExp('^/api')]
    })
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { host: '0.0.0.0', port: 5173, proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } } }
});