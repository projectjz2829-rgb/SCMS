
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === 'development'

  return {
    base: '/',
    build: {
      outDir: '../backend/app/static/dist',
      emptyOutDir: true,
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/auth': {
          target: process.env.VITE_API_URL || 'http://127.0.0.1:5000',
          changeOrigin: true,
        }
      }
    }
  }
})
