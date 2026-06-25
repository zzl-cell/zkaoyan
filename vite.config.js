import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(async ({ command }) => {
  const plugins = [
    vue(),
    Components({ resolvers: [VantResolver()] }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Z考研',
        short_name: 'Z考研',
        description: '面向大学生的题库学习 App',
        theme_color: '#1989fa',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ]

  // Only load mock plugin in dev mode
  if (command === 'serve') {
    const { mockApiPlugin } = await import('./mock/server.js')
    plugins.push(mockApiPlugin())
  }

  return {
    plugins,
    server: {
      host: true,
      port: 3000,
    },
  }
})
