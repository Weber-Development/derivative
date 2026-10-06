import { defineConfig } from "vitest/config";

// Real Chromium tests: layout, colour contrast, focus and reduced motion, which jsdom cannot do.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/browser/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
