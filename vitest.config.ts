import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "lib/**/*.ts",
        "components/**/*.tsx",
        "app/**/*.ts",
        "app/**/*.tsx",
      ],
      exclude: [
        "node_modules/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/types.ts",
        "**/constants.ts",
      ],
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@/components": path.resolve(__dirname, "components"),
      "@/lib": path.resolve(__dirname, "lib"),
    },
  },
});
