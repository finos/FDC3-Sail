import { defineConfig } from "vite"
import glob from "glob"

export default defineConfig({
    publicDir: "public",
    server: {
        port: 5173,
        host: true,
        proxy: {
            "/socket.io": {
                target: "http://localhost:8090",
                ws: true,
                changeOrigin: true
            }
        }
    },
    build: {
        cssMinify: false,   // makes the css easier to read
        sourcemap: true,    // provide sourcemap for prod debug
        rollupOptions: {
            input: {
                main: "index.html",
                ...Object.fromEntries(
                    glob.sync("html/**/*.html").map(file => [
                        file.replace(/\.html$/, '').replace(/\//g, '-'),
                        file
                    ])
                )
            },
        },
    },
})
