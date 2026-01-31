/// <reference lib="webworker" />

const PRECACHE = 'evvault-precache-v1'
const RUNTIME_CACHE = 'evvault-runtime-v1'
const MEDIAPIPE_CACHE = 'evvault-mediapipe-v1'

const swGlobal = self as unknown as ServiceWorkerGlobalScope & {
  __WB_MANIFEST?: Array<{ url: string } | string>
}

const PRECACHE_MANIFEST = (self as unknown as typeof swGlobal).__WB_MANIFEST ?? []

const PRE_CACHE_URLS = PRECACHE_MANIFEST.map((entry) =>
  typeof entry === 'string'
    ? entry
    : entry?.url ?? '',
).filter(Boolean)

const normalizeUrl = (url: string) => {
  try {
    return new URL(url, swGlobal.location.href).href
  } catch {
    return url
  }
}

async function cacheFirst(request: Request, cacheName: string) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) {
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request: Request) {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    throw error
  }
}

swGlobal.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRE_CACHE_URLS.map(normalizeUrl)))
      .then(() => swGlobal.skipWaiting()),
  )
})

swGlobal.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![PRECACHE, RUNTIME_CACHE, MEDIAPIPE_CACHE].includes(key)) {
              return caches.delete(key)
            }
            return Promise.resolve()
          }),
        ),
      )
      .then(() => swGlobal.clients.claim()),
  )
})

swGlobal.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (!url.protocol.startsWith('http')) return

  if (url.pathname.startsWith('/mediapipe/')) {
    event.respondWith(cacheFirst(event.request, MEDIAPIPE_CACHE))
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return networkFirst(event.request)
    }),
  )
})
