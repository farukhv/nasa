import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../data/public'),
  server: { port: 5173, strictPort: true },
  worker: { format: 'es' },
})
