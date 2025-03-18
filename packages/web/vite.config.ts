import { defineConfig } from "vite"
import glob from "glob"
export default defineConfig({
    build: {
        cssMinify: false,   // makes the css easier to read
        sourcemap: true,    // provide souremap for prod debug
        rollupOptions: {
            input: glob.sync("html/**/*.html"),
        },
    },
})
