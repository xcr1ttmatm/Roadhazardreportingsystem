import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable PWA. The service worker only caches the app shell, so live
    // data keeps coming from Supabase and map tiles keep coming from MapTiler.
    // Registration is done explicitly in src/main.jsx.
    VitePWA({
      // A new build installs in the background and takes over on the next full
      // load; the open page is never reloaded or had its old chunks deleted
      // underneath it. Registration lives in src/main.jsx.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Road Hazard Reporting System',
        short_name: 'Road Hazard',
        description: 'Report and track road hazards across Iligan City.',
        lang: 'en',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#2563EB',
        background_color: '#FFFFFF',
        categories: ['utilities', 'government'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only: the 44 MB ONNX model, the login background and the
        // source logos are deliberately left out so installs stay small.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/models/**', '**/login-bg.png', '**/CEOsLogo.png', '**/mobileAppLogo.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/models\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
