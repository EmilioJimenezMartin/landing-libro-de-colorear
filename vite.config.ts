import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // rutas relativas: la misma build sirve para Vercel y para el artefacto de Claude
  base: './',
})
