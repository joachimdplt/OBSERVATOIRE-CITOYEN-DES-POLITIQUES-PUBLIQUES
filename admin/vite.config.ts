import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
  server: {
    // L'administration et l'API partagent une origine, comme en production :
    // le cookie de session ne part que vers /api/admin, sans CORS.
    proxy: { '/api': process.env.API_ORIGIN ?? 'http://localhost:3001' },
  },
})

export default config
