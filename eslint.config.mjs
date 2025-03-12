import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// export default tseslint.config(
//     {
//         ignores: ["*/dist/**/*.js", ".rollup.cache/**", "*/dist/**/*.d.ts", "*.d.ts", "eslint.config.mjs"],
//         files: ["src/**/*.ts", "src/**/*.tsx"],
//     },
//     eslint.configs.recommended,
//     tseslint.configs.recommended,
//     {
//         languageOptions: {
//             parserOptions: {
//                 projectService: true,
//                 tsconfigRootDir: import.meta.dirname,
//             },
//         }
//     }
// );

export default tseslint.config(
    {
        ignores: ["**/*.js", "**/*.mjs", "**/.next/", "**/.turbo/", "**/dist/"],
    },
    {
        files: ["/*/src/**/*.{ts,tsx}"],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
            jsdoc.configs["flat/recommended"],
        ],
        plugins: {
            jsdoc,
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {