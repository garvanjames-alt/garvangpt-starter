import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for GarvanGPT / Almost Human frontend
// Key fix: allow Render/custom domains in `vite preview`.
// If Render is running `vite preview`, this prevents the
// “Blocked request. This host is not allowed” error.
export default defineConfig({
  plugins: [react()],

  // Local dev server
  server: {
    port: 5173,
    proxy: {
      // Backend API (local dev)
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/respond": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Preview server (what Render may be using)
  preview: {
    port: 4173,
    // Allow any host so /robots.txt and /sitemap.xml work on Render + custom domain
    allowedHosts: "all",
  },
});
