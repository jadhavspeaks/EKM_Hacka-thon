import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        babelrc: false,
        configFile: false,
        plugins: [],
        presets: [
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
      },
    }),
  ],
  esbuild: {
    target: 'es2020',
    jsx: 'automatic',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
