import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// TODO: replace 'portfolio-manager' with your actual GitHub repo name before deploying
export default defineConfig({
  plugins: [react()],
  base: '/portfolio-manager/',
})
