import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, loadEnv } from 'vite'
import { extractArticle, assertPublicHttpUrl } from './api/_extract.js'

// Dev-only parity for Vercel's api/article.js: vite `server.proxy` can't run
// JS, so a tiny middleware serves /api/article on localhost with the same
// extraction + SSRF guard. Plugin middlewares run before the proxy, so the
// generic '/api' proxy never sees these requests.
function articleDevMiddleware() {
  return {
    name: 'article-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/article', async (req, res) => {
        const send = (status, obj) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
        }
        try {
          const u = new URL(req.url, 'http://localhost')
          const target = assertPublicHttpUrl(u.searchParams.get('url') || '')
          const ctl = new AbortController()
          const t = setTimeout(() => ctl.abort(), 12000)
          let upstream
          try {
            upstream = await fetch(target, {
              signal: ctl.signal,
              redirect: 'follow',
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml',
              },
            })
          } finally {
            clearTimeout(t)
          }
          if (upstream.status === 401 || upstream.status === 403) {
            send(402, { error: 'PAYWALLED: publisher blocks readers — open the original instead.' })
            return
          }
          if (!upstream.ok) {
            send(502, { error: `Publisher returned ${upstream.status}` })
            return
          }
          const html = await upstream.text()
          send(200, extractArticle(html, upstream.url || target))
        } catch (e) {
          if (/PAYWALL_OR_EMPTY/.test(e?.message || '')) {
            send(402, { error: 'PAYWALLED_OR_JS: full text needs the original page — open it instead.' })
          } else {
            send(e.status || 502, { error: e.message || 'Extraction failed' })
          }
        }
      })
    },
  }
}

// PWA = installable + home-screen icon. Proxies keep API keys off the client in dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const footballKey = env.VITE_FOOTBALL || env.VITE_FOOTBALL_API_KEY || process.env.VITE_FOOTBALL || process.env.VITE_FOOTBALL_API_KEY || ''
  const cricKey = env.VITE_CRICAPI || env.VITE_CRICAPI_KEY || process.env.VITE_CRICAPI || process.env.VITE_CRICAPI_KEY || ''
  const gnewsKey = env.VITE_GNEWS || process.env.VITE_GNEWS || ''
  return {
  plugins: [
    react(),
    articleDevMiddleware(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'apple-touch-icon.png', 'apple-splash-1170x2532.png', 'apple-splash-1290x2796.png', 'apple-splash-2048x2732.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512.png'],
      manifest: {
        name: 'FLASH! — Brutal News + Live Scores',
        short_name: 'FLASH!',
        description: 'Neo-brutalist news flash cards with live football + cricket scores.',
        theme_color: '#FFDE59',
        // ink-black OS splash to match the in-app boot screen
        background_color: '#0D0D12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
      // GNews: client calls /api/gnews?category=sports&max=10 — key injected server-side (dev parity with Vercel api/gnews.js)
      '/api/gnews': {
        target: 'https://gnews.io',
        changeOrigin: true,
        rewrite: (p) => {
          const u = new URL(p, 'http://localhost')
          const params = new URLSearchParams(u.search)
          params.delete('apikey')
          if (gnewsKey) params.set('apikey', gnewsKey)
          if (!params.get('lang')) params.set('lang', 'en')
          if (!params.get('country')) params.set('country', 'us')
          if (!params.get('max')) params.set('max', '10')
          return `/api/v4/top-headlines?${params}`
        },
      },
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
