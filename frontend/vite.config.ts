import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // The Dockerfile copies this folder into the nginx image.
    outDir: "dist",
  },
  server: {
    // In development Vite serves the React app on :5173 and forwards API
    // calls to the Express server on :3000, so both feel like one site.
    proxy: { "/api": "http://localhost:3000" },
  },
});
