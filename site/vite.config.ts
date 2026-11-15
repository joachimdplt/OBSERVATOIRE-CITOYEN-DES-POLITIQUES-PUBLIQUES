import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ mode }) => {
  // Les variables du fichier .env (clé de l'API, adresse de l'API) pour le
  // serveur de développement ; en production, l'environnement du serveur.
  for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), '')))
    process.env[k] ??= v
  return {
  resolve: { tsconfigPaths: true },
  // Sans la source de chaque balise ajoutée en développement : elle doublait
  // le poids des pages pour un outil que nous n'utilisons pas.
  plugins: [
    devtools({ injectSource: { enabled: false } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  // MapLibre charge son worker depuis un fichier voisin du sien : réemballé
  // par Vite, il ne le trouve plus et la carte reste blanche.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  }
})

export default config
