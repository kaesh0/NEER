import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
    // Pre-transform the core module graph on dev-server start so the first
    // browser load doesn't transform hundreds of modules one-by-one (the
    // "cold start takes forever" feel).
    warmup: {
      clientFiles: ['./src/main.jsx', './src/App.jsx', './src/pages/**/*.jsx', './src/components/**/*.jsx'],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-leaflet', 'leaflet'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          maps: ['leaflet', 'react-leaflet', '@india-boundary-corrector/leaflet-layer'],
        },
      },
    },
  },
})
