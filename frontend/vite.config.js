import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for GarvanGPT / Almost Human frontend
// Key fix: allow Render hostnames when running `vite preview` on Render.
// Without this, requests to /robots.txt or /sitemap.xml on the live site
// can be blocked with: "This host is not allowed. Add to preview.allowedHosts".

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // If you ever open the dev server to LAN/tunnels, uncomment:
    // host: true,
  },

  preview: {
    port: 5173,
    // Allow your Render frontend domain + any subdomain on onrender.com.
    // You can add your future custom domain here too.
    allowedHosts: [
      "almosthuman-frontend.onrender.com",
      ".onrender.com",
    ],
  },
});
