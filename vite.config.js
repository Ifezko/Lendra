/* EITHERWAY_CHAINLINK_UI_ALIAS */
import path from 'path'
import { fileURLToPath } from 'url'
const __ewDir = path.dirname(fileURLToPath(import.meta.url))
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  resolve: { alias: { '@eitherway/chainlink-ui': path.resolve(__ewDir, 'src/lib/chainlink-ui') } },
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': 'http://localhost:3001',
    },
    cors: true,
    allowedHosts: true,
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})
