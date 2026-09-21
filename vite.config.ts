import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "gada_logo.png", "gadaride-logo.png"],
      manifest: {
        id: "/",
        name: "Gadaride Dashboard",
        short_name: "Gadaride",
        description: "Gadaride logistics dashboard — manage orders, riders and vendors.",
        theme_color: "#0D2447",
        background_color: "#ffffff",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        start_url: "/",
        scope: "/",
        orientation: "portrait-primary",
        icons: [
          { src: "/icon-72.png", sizes: "72x72", type: "image/png", purpose: "any" },
          { src: "/icon-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
          { src: "/icon-128.png", sizes: "128x128", type: "image/png", purpose: "any" },
          { src: "/icon-144.png", sizes: "144x144", type: "image/png", purpose: "any" },
          { src: "/icon-152.png", sizes: "152x152", type: "image/png", purpose: "any" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/maskable-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/maskable-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Don't let the SW hijack API/auth calls — always hit the network for those.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
