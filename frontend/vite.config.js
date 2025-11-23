import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for Almost Human / GarvanGPT frontend
// Key fix: allow Render host in `preview.allowedHosts`

export default defineConfig(({ mode }) => {
  const isLocal = mode === "development";

  return {
    plugins: [react()],

    // If you ever deploy under a subpath, set base here. Root deploy = "/".
    base: "/",

    server: {
      port: 5173,
      strictPort: true,
      host: true, // allow LAN / Docker / Render-style hosts during dev if needed
      proxy: {
        // Local dev proxy to backend
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

    preview: {
      port: 4173,
      host: true,

      // ✅ FIX for “Blocked request. This host is not allowed.”
      // Add your Render/production hostnames here.
      allowedHosts: [
        "almosthuman-frontend.onrender.com",
        "almosthuman-frontend.onrender.com",
        "almosthumanlabs.ai",
        "www.almosthumanlabs.ai",
        "localhost",
        "127.0.0.1",
      ],
    },
  };
});
