import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for GarvanGPT / Almost Human frontend
// NOTE: This file MUST be the one Render uses.
// If Render is building from repo root, either:
//   A) set Render Root Directory = frontend, OR
//   B) move/copy this file to the repo root.
// Otherwise preview.allowedHosts will be ignored.

export default defineConfig({
  plugins: [react()],

  // Local dev server
  server: {
    port: 5173,
    proxy: {
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

  // Preview server (ONLY matters if Render is running `vite preview`)
  preview: {
    port: 4173,
    // Be explicit. "all" should work in Vite 5+, but listing hosts
    // avoids any version mismatch.
    allowedHosts: [
      "almosthuman-frontend.onrender.com",
      "almosthuman-frontend-static.onrender.com",
      "www.almosthumanlabs.ai",
      "almosthumanlabs.ai",
    ],
  },
});
