import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node24",
    outDir: "dist-electron/electron",
    emptyOutDir: false,
    minify: false,
    sourcemap: false,
    lib: {
      entry: "electron/preload.ts",
      formats: ["cjs"],
      fileName: () => "preload.cjs",
    },
    rollupOptions: {
      external: ["electron"],
    },
  },
});
