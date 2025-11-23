import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite blocks unknown hosts in preview mode for security.
// Render serves your app from almosthuman-frontend.onrender.com,
// so we explicitly allow it here.
export default defineConfig({
  plugins: [react()],

  // Local dev server settings
  server: {
    port: 5173,
  },

  // `vite preview` settings (what Render is currently running)
  preview: {
    port: 4173,
    // Allow your Render domain + any subdomains you might add later
    allowedHosts: [
      "almosthuman-frontend.onrender.com",
      ".onrender.com",
      "localhost",
      "127.0.0.1",
    ],
  },
});
