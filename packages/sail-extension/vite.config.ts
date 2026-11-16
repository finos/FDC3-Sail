import { defineConfig } from "vite-plus"

export default defineConfig({
  pack: {
    entry: ["./src/index.ts", "./src/ui.ts"],
    sourcemap: true,
    dts: {
      sourcemap: true,
    },
  },
})
