import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import viteConfig from './vite.config'

export default defineConfig({
  ...viteConfig,
  plugins: [...(viteConfig.plugins || []), vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/tests/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'server/node_modules'],
    root: fileURLToPath(new URL('./', import.meta.url)),
    transformMode: {
      web: [/\.[jt]sx$/],
    },
    deps: {
      inline: ['vite']
    },
    server: {
      deps: {
        inline: ['vite']
      }
    }
  },
})
