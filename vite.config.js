import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5011,
    proxy: {
      '/api': {
        target: 'http://localhost:5012',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5012',
        changeOrigin: true,
        ws: true
      }
    }
  }
})