import { fileURLToPath, URL } from "url"
import { defineConfig } from "vite"
import glob from "glob"
export default defineConfig({
    build: {
        rollupOptions: {
            input: glob.sync("html/**/*.html"),
        },
    },
})
