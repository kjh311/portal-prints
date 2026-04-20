import { defineConfig } from "vite";
import { crx, defineManifest } from "@crxjs/vite-plugin";

const manifest = defineManifest({
  manifest_version: 3,
  name: "Portal Prints",
  version: "1.1",
  description: "Capture high-quality frames from YouTube videos with Supabase integration.",
  permissions: ["storage", "activeTab", "unlimitedStorage", "identity"],
  host_permissions: ["*://*.youtube.com/*"],
  content_scripts: [
    {
      matches: ["*://*.youtube.com/*"],
      js: ["src/content/content.ts"],
    },
  ],
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  action: {
    default_popup: "src/popup/popup.html",
  },
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
});

export default defineConfig({
  plugins: [crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
