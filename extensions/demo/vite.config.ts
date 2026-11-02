import { defineConfig } from "vite-plus"

export default defineConfig({
  pack: {
    entry: ["./src/index.ts", "./src/ui.tsx"],
    sourcemap: true,
    dts: {
      sourcemap: true,
    },
  },
})
