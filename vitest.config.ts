import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit-тесты живут в *.test.ts(x). E2E-файлы Playwright (tests/e2e/*.spec.ts)
    // не должны подхватываться Vitest — у них свой раннер (playwright test).
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
  },
});
