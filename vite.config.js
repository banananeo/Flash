import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import { getNews, fetchEspnStory } from './api/_news.js'
import { extractArticle, assertPublicHttpUrl } from './api/_extract.js'
import { fetchEspnLiveMatches, fetchEspnMatchDetail } from './api/_cricket.js'
import { fetchEspnFootballMatches, fetchEspnFootballDetail, sanitizeDateParam } from './api/_football.js'
import widgetScoresHandler from './api/widget-scores.js'

// Dev-only parity for Vercel's api/article.js
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
          const espn = await fetchEspnStory(target).catch(() => null)
          if (espn) {
            send(200, espn)
            return
          }
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

// Dev-only parity for api/cricket/live.js + api/cricket/detail.js (ESPN Cricket, no key)
function cricketDevMiddleware() {
  return {
    name: 'cricket-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/cricket', async (req, res, next) => {
        const send = (status, obj) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
        }
        try {
          const u = new URL(req.url, 'http://localhost')
          const pathname = u.pathname || '/'
          if (pathname === '/live' || pathname === '/' || pathname === '/cricScore') {
            const rawDate = String(u.searchParams.get('date') || '').trim().replace(/-/g, '')
            const safeDate = /^\d{8}$/.test(rawDate) ? rawDate : ''
            const up = u.searchParams.get('upcoming')
            const upcoming = up == null ? !safeDate : up === '1' || up === 'true'
            const matches = await fetchEspnLiveMatches(safeDate, { upcoming })
            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30')
            send(200, { provider: 'espn', date: safeDate || 'today', matches })
            return
          }
          if (pathname === '/detail' || pathname === '/match_info') {
            const id = u.searchParams.get('id') || u.searchParams.get('matchId') || ''
            const series = u.searchParams.get('series') || u.searchParams.get('seriesId') || ''
            if (!id) {
              send(400, { error: 'Missing ?id= ESPN match id' })
              return
            }
            const detail = await fetchEspnMatchDetail(id, series)
            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30')
            send(200, detail)
            return
          }
          next()
        } catch (e) {
          send(e?.status || 502, { error: e?.message || 'ESPN Cricket failed' })
        }
      })
    },
  }
}

// Dev-only parity for api/football/live.js + api/football/detail.js (ESPN Soccer, no key)
function footballDevMiddleware() {
  return {
    name: 'football-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/football', async (req, res, next) => {
        const send = (status, obj) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
        }
        try {
          const u = new URL(req.url, 'http://localhost')
          const pathname = u.pathname || '/'
          if (pathname === '/live' || pathname === '/' || pathname === '/fixtures') {
            const date = sanitizeDateParam(u.searchParams.get('date'))
            const up = u.searchParams.get('upcoming')
            const upcoming = up == null ? !date : up === '1' || up === 'true'
            const matches = await fetchEspnFootballMatches(date, { upcoming })
            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30')
            send(200, { provider: 'espn', date: date || 'today', matches })
            return
          }
          if (pathname === '/detail') {
            const id = u.searchParams.get('id') || u.searchParams.get('fixture') || ''
            const league = u.searchParams.get('league') || u.searchParams.get('leagueSlug') || ''
            if (!id) {
              send(400, { error: 'Missing ?id= ESPN football event id' })
              return
            }
            const detail = await fetchEspnFootballDetail(id, league)
            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30')
            send(200, detail)
            return
          }
          next()
        } catch (e) {
          send(e?.status || 502, { error: e?.message || 'ESPN Football failed' })
        }
      })
    },
  }
}

// Dev-only parity for api/news.js (BBC RSS / ESPN / Google News RSS, no key)
function newsDevMiddleware() {
  return {
    name: 'news-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/news', async (req, res) => {
        const send = (status, obj) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
        }
        try {
          const u = new URL(req.url, 'http://localhost')
          const articles = await getNews({
            category: u.searchParams.get('category') || 'all',
            q: u.searchParams.get('q') || '',
            max: u.searchParams.get('max') || '10',
          })
          send(200, { articles })
        } catch (e) {
          send(e?.status || 502, { error: `News upstream unreachable: ${e?.message || 'Unknown error'}` })
        }
      })
    },
  }
}

// Dev-only parity for api/widget-scores.js
function widgetScoresDevMiddleware() {
  return {
    name: 'widget-scores-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/widget-scores', async (req, res) => {
        const u = new URL(req.url, 'http://localhost')
        const fakeReq = {
          method: req.method,
          url: `/api/widget-scores${u.search}`,
          query: Object.fromEntries(u.searchParams.entries()),
        }
        const fakeRes = {
          setHeader: (k, v) => res.setHeader(k, v),
          status: (code) => {
            res.statusCode = code
            return fakeRes
          },
          json: (obj) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
            return fakeRes
          },
          send: (body) => {
            res.end(body)
            return fakeRes
          },
          end: (body) => {
            res.end(body)
            return fakeRes
          },
        }
        try {
          await widgetScoresHandler(fakeReq, fakeRes)
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e?.message || 'Widget scores failed' }))
        }
      })
    },
  }
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      articleDevMiddleware(),
      newsDevMiddleware(),
      cricketDevMiddleware(),
      footballDevMiddleware(),
      widgetScoresDevMiddleware(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'logo.svg',
          'apple-touch-icon.png',
          'apple-splash-1170x2532.png',
          'apple-splash-1290x2796.png',
          'apple-splash-2048x2732.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512.png',
        ],
        manifest: {
          name: 'flash — Less noise. More signal.',
          short_name: 'flash',
          description: 'An editorial pulse for news, live football, cricket and Formula 1.',
          theme_color: '#F8FAFC',
          background_color: '#F8FAFC',
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
            { name: 'Live Scores', short_name: 'Scores', url: '/?view=scores', description: 'Jump straight to live scores' },
            { name: 'Your Briefing', short_name: 'News', url: '/', description: 'Read today’s briefing' },
            { name: 'Formula 1', short_name: 'F1', url: '/?view=f1', description: 'Championship standings & calendar' },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /\/api\/news.*/i,
              handler: 'NetworkFirst',
              options: { cacheName: 'news', expiration: { maxEntries: 30, maxAgeSeconds: 600 } },
            },
            {
              urlPattern: /\/api\/cricket\/.*/i,
              handler: 'NetworkFirst',
              options: { cacheName: 'espn-cricket', expiration: { maxEntries: 20, maxAgeSeconds: 60 } },
            },
            {
              urlPattern: /\/api\/football\/.*/i,
              handler: 'NetworkFirst',
              options: { cacheName: 'espn-football', expiration: { maxEntries: 20, maxAgeSeconds: 60 } },
            },
            {
              urlPattern: /\/api\/f1standings.*/i,
              handler: 'NetworkFirst',
              options: { cacheName: 'f1-standings', expiration: { maxEntries: 6, maxAgeSeconds: 3600 } },
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
        // F1 (Jolpica, no CORS upstream)
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
      },
    },
  }
})
