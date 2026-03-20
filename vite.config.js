import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/gallery/",
  root: ".",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ["three"],
  },
  assetsInclude: ["**/*.jpg", "**/*.jpeg", "**/*.png", "**/*.webp", "**/*.hdr"],
});
