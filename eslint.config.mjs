import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ["**/*.js", "**/*.mjs", "**/dist/"],
    },
    {
        files: ["packages/*/src/**/*.{ts,tsx}"],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended,
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        }
    })
