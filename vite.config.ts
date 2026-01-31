import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icons/evvault-icon.svg', 'icons/evvault-icon-maskable.svg'],
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
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
        globIgnores: ['mediapipe/**'],
      },
      injectManifest: {
        swSrc: 'src/sw.ts',
        swDest: 'dist/sw.js',
        injectionPoint: 'self.__WB_MANIFEST',
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      injectManifestBuildOptions: {
        minify: false,
      },
    }),
  ],
})
