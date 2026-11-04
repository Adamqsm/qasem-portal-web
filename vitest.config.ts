import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // tsconfig has jsx: "preserve" (Next/SWC territory). The one test that
  // renders a page (ai-visibility.test.ts) needs Vite to compile JSX itself,
  // with the app's automatic runtime.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    passWithNoTests: true,
  },
});
