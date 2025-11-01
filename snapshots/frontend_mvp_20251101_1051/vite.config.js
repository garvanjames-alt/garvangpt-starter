import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // send /api/* to the backend on :3001 (no path rewrite)
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // send /respond to the backend on :3001
      "/respond": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
