import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    reporters: ['verbose', 'json'],
    outputFile: './test-results.json',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
})
