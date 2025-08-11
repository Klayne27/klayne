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
        type: "module",
      },
      // pwaAssets: {
      //   images: "public/x-logo2.png",
      // },
      // includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
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
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        swSrc: "src/sw.js", // This is where your custom logic lives
      },
      srcDir: "src",
      filename: "sw.js", // This is the file we will create
    }),
  ],
  optimizeDeps: {
    exclude: ["date-fns"], // Add any problematic packages here
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
