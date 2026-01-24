import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    passWithNoTests: true,
    setupFiles: ["./test/setup.ts"],
  },
});
