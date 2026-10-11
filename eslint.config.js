import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "src/core/raw/vendor", "playwright-report", "test-results"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // DOM typings lack FileSystemDirectoryHandle iterators and the picker; tests stub window APIs.
    files: ["tests/**", "src/core/storage/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  { plugins: { "react-hooks": reactHooks }, rules: { ...reactHooks.configs.recommended.rules } },
);
