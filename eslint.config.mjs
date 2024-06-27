import globals from "globals";
import tseslint from "typescript-eslint";


export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: {...globals.browser, ...globals.node} }},
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": 1,
      "@typescript-eslint/no-explicit-any": 1,
      "@typescript-eslint/no-unused-vars": 1,
      "@typescript-eslint/no-var-requires": 1
    }
  }
];