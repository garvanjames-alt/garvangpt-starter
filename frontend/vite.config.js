// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Allow the Render preview hostname
const allowed = [
  'almosthuman-frontend.onrender.com', // your live frontend
  '.onrender.com',                      // any Render subdomain (optional)
  'localhost'
]

export default defineConfig({
  plugins: [react()],

  // local dev (unchanged)
  server: {
    host: true,
    port: 5173
  },

  // Render uses `vite preview` for production
  preview: {
    host: true,
    port: 10000,           // Render will override with $PORT; port value is fine
    allowedHosts: allowed  // <-- critical line
  }
})
