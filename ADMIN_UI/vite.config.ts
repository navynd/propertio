import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "::",
    port: 8081,
  },
  base: "/adminpanel/",
  build: {
    outDir: "dist/adminpanel",
  },
})
