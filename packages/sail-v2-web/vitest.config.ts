import { defineConfig } from "vite-plus"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}", "test/**/*.test.ts"],
  },
})
