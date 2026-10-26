import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(
      new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace("T", ".")
        .slice(0, 15),
    ),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icon.svg",
        "icon-192.png",
        "icon-512.png",
        "apple-touch-icon.png",
        "qr_*.png",
      ],
      manifest: {
        name: "仓位管理器",
        short_name: "仓位管理",
        description: "精准仓位计算，严格风险控制。数据仅保存在本地。",
        lang: "zh-CN",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f5f5f7",
        theme_color: "#f5f5f7",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: { cleanupOutdatedCaches: true, navigateFallback: "index.html" },
    }),
  ],
  server: { host: "127.0.0.1" },
});
