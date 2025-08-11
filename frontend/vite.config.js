import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true, // This enables the service worker in development mode
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
      injectRegister: "auto",
      selfDestroying: false,

      injectManifest: {
        swSrc: "src/sw.js",
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      srcDir: "src",
      filename: "sw.js",
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
