import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, loadEnv } from 'vite'

// PWA = installable + home-screen icon. Proxies keep API keys off the client in dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const footballKey = env.VITE_FOOTBALL_API_KEY || process.env.VITE_FOOTBALL_API_KEY || ''
  const cricKey = env.VITE_CRICAPI_KEY || process.env.VITE_CRICAPI_KEY || ''
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'FLASH! — Brutal News + Live Scores',
        short_name: 'FLASH!',
        description: 'Neo-brutalist news flash cards with live football + cricket scores.',
        theme_color: '#FFDE59',
        background_color: '#FFF6E9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Live Scores', short_name: 'Scores', url: '/?scores=1', description: 'Jump straight to live scores' },
          { name: 'Top News', short_name: 'News', url: '/', description: 'Swipe the headlines' },
        ],
      },
      workbox: {
        // cache live APIs briefly — protects quotas + offline fallback
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gnews\.io\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'gnews', expiration: { maxEntries: 30, maxAgeSeconds: 600 } },
          },
          {
            urlPattern: /^https:\/\/api\.cricapi\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'cricapi', expiration: { maxEntries: 20, maxAgeSeconds: 120 } },
          },
          {
            urlPattern: /^https:\/\/v3\.football\.api-sports\.io\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-football', expiration: { maxEntries: 20, maxAgeSeconds: 120 } },
          },
          {
            urlPattern: /^https:\/\/picsum\.photos\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 60, maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // NOTE: specific routes must come BEFORE generic '/api' (prefix match)
      // Football: client calls /api/football/fixtures?live=all — key injected server-side
      '/api/football': {
        target: 'https://v3.football.api-sports.io',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/football/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (footballKey) proxyReq.setHeader('x-apisports-key', footballKey)
          })
        },
      },
      // Cricket: client calls /api/cricket/cricScore — apikey injected server-side
      '/api/cricket': {
        target: 'https://api.cricapi.com',
        changeOrigin: true,
        rewrite: (p) => {
          let path = p.replace(/^\/api\/cricket/, '/v1')
          // inject apikey if client didn't send one
          if (cricKey && !/apikey=/i.test(path)) {
            path += (path.includes('?') ? '&' : '?') + `apikey=${cricKey}`
          }
          return path
        },
      },
      '/api': {
        target: 'https://newsapi.org/v2',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
}}) // end return + arrow + defineConfig
