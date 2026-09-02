/** @type {import("lint-staged").Configuration} */
export default {
  "**/*.{ts,tsx,js,jsx,mjs,cjs,json,md,mdx,yml,yaml,css,scss,html}":
    "prettier --write",
  "packages/*/src/**/*.{ts,tsx}":
    "eslint --fix --max-warnings=0 --no-warn-ignored",
}
