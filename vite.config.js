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

// Dev-only parity for Vercel's api/cricket/detail.js route: prod serves
// api.cricapi.com match_info through /api/cricket/detail. This middleware
// does the same on localhost so the scoreboard shows in dev too.
// Plugin middlewares run before the proxy, so '/api/cricket/detail' never
// reaches the generic rewrite.
function cricketDetailDevMiddleware(cricKey) {
  return {
    name: 'cricket-detail-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/cricket/detail', async (req, res) => {
        const send = (status, obj) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
        }
        try {
          const u = new URL(req.url, 'http://localhost')
          const rawId = String(u.searchParams.get('id') || u.searchParams.get('matchId') || '').replace(/^cr-/, '')
          if (!rawId) {
            send(400, { error: 'Missing ?id= match id' })
            return
          }
          if (!cricKey) {
            send(500, { error: 'Server missing CricketData key. Set VITE_CRICKETDATA_KEY in .env' })
            return
          }
          const ctl = new AbortController()
          const t = setTimeout(() => ctl.abort(), 10000)
          let upstream
          try {
            upstream = await fetch(
              `https://api.cricapi.com/v1/match_info?apikey=${encodeURIComponent(cricKey)}&id=${encodeURIComponent(rawId)}`,
              { signal: ctl.signal }
            )
          } finally {
            clearTimeout(t)
          }
          const body = await upstream.text()
          res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
          res.statusCode = upstream.status
          res.end(body)
        } catch (e) {
          send(502, { error: e.message || 'Cricket detail failed' })
        }
      })
    },
  }
}

// PWA = installable + home-screen icon. Proxies keep API keys off the client in dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const footballKey = env.VITE_FOOTBALL || env.VITE_FOOTBALL_API_KEY || process.env.VITE_FOOTBALL || process.env.VITE_FOOTBALL_API_KEY || ''
  const cricKey = env.VITE_CRICKETDATA_KEY || env.CRICKETDATA_KEY || process.env.VITE_CRICKETDATA_KEY || process.env.CRICKETDATA_KEY || ''
  const gnewsKey = env.VITE_GNEWS || process.env.VITE_GNEWS || ''
  return {
  plugins: [
    react(),
    articleDevMiddleware(),
    cricketDetailDevMiddleware(cricKey),
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
            options: { cacheName: 'cricketdata', expiration: { maxEntries: 20, maxAgeSeconds: 120 } },
          },
          {
            urlPattern: /\/api\/f1standings.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'f1-standings', expiration: { maxEntries: 4, maxAgeSeconds: 3600 } },
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
      // F1 (Jolpica, no CORS upstream): client calls
      // /api/f1standings?kind=drivers|constructors|schedule|results|qualifying[&round=N|last]
      // — dev parity with api/f1standings.js
      '/api/f1standings': {
        target: 'https://api.jolpi.ca',
        changeOrigin: true,
        rewrite: (p) => {
          const u = new URL(p, 'http://localhost')
          const kind = u.searchParams.get('kind') || 'drivers'
          if (kind === 'constructors') return '/ergast/f1/current/constructorstandings/'
          if (kind === 'schedule') return '/ergast/f1/current/'
          if (kind === 'results' || kind === 'qualifying') {
            const round = u.searchParams.get('round') || 'last'
            if (!/^(\d{1,2}|last)$/.test(round)) return '/ergast/f1/current/last/results/'
            return `/ergast/f1/current/${round}/${kind}/`
          }
          return '/ergast/f1/current/driverstandings/'
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Accept', 'application/json')
          })
        },
      },
      // Cricket (CricketData.org): client calls /api/cricket/live + /api/cricket/detail?id= — key injected server-side
      '/api/cricket': {
        target: 'https://api.cricapi.com',
        changeOrigin: true,
        rewrite: (p) => {
          const u = new URL(p, 'http://localhost')
          const pathname = u.pathname.replace(/^\/api\/cricket/, '') || '/live'
          const params = new URLSearchParams(u.search)
          // legacy compat (old RapidAPI/Cricbuzz routes)
          if (pathname === '/cricScore') {
            params.set('apikey', cricKey)
            if (!params.get('offset')) params.set('offset', '0')
            return `/v1/currentMatches?${params}`
          }
          if (pathname === '/match_info') {
            const id = String(params.get('id') || params.get('matchId') || '').replace(/^cr-/, '')
            return `/v1/match_info?apikey=${encodeURIComponent(cricKey)}&id=${encodeURIComponent(id)}`
          }
          if (pathname === '/live' || pathname === '/') {
            params.set('apikey', cricKey)
            if (!params.get('offset')) params.set('offset', '0')
            return `/v1/currentMatches?${params}`
          }
          if (pathname === '/detail') {
            const id = String(params.get('id') || params.get('matchId') || '').replace(/^cr-/, '')
            return `/v1/match_info?apikey=${encodeURIComponent(cricKey)}&id=${encodeURIComponent(id)}`
          }
          return pathname + (u.search || '')
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
