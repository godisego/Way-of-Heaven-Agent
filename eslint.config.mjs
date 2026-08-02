import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: rootDir });

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "data/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
