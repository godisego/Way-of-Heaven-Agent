import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// vitest 独立于 Next/tsc，需要自己声明 "@/ → src/" 路径别名
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
});
