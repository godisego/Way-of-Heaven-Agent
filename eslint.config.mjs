import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: rootDir });

export default [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "data/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
