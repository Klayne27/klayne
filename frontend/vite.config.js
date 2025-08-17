import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      // Use the injectManifest object to point to your service worker
      srcDir: "src",
      filename: "sw.js", // Add this
      injectManifest: {
        swSrc: "src/sw.js", // Path to your source service worker
        swDest: "dist/sw.js", // Output path for the service worker
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      devOptions: {
        enabled: true,
        type: "module", 
      },
      manifest: {
        name: "X-ayne",
        short_name: "X-ayne",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "x-logo2.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "x-logo2.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["date-fns"],
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
})
