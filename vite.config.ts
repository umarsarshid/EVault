import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: [
        'vite.svg',
        'icons/evvault-icon.svg',
        'icons/evvault-icon-maskable.svg',
        'mediapipe/vision_bundle.cjs',
        'mediapipe/vision_wasm_internal.js',
        'mediapipe/vision_wasm_internal.wasm',
        'mediapipe/vision_wasm_nosimd_internal.js',
        'mediapipe/vision_wasm_nosimd_internal.wasm',
        'mediapipe/face_detector.task',
      ],
      manifest: {
        name: 'Evidence Vault',
        short_name: 'EvidenceVault',
        description: 'Offline-first, locally encrypted evidence capture vault.',
        theme_color: '#f7f1e5',
        background_color: '#f7f1e5',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/evvault-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/evvault-icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,ico,png,wasm,cjs,task}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'evv-images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'evv-docs',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    }),
  ],
})
