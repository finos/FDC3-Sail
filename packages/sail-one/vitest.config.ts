import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"
import react from "@vitejs/plugin-react"

const packageRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(packageRoot, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
})
