import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from '@rollup/plugin-typescript';
import resolve from "@rollup/plugin-node-resolve";

export default {
    input: 'src/preload.ts',

    output: {
        file: 'dist/preload.js',
        format: 'cjs',
        sourcemap: true
    },

    plugins: [
        resolve({
            browser: true, // Ensures we use browser-compatible versions
        }),
        commonjs(),
        typescript(),
        babel({
            include: ["**.js", "node_modules/**"],
            babelHelpers: "bundled",
            presets: ["@babel/preset-env"],
        })
    ],
    external: ["electron", "fs", "path"]
};