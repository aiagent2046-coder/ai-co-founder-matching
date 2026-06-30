import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config';

// Калибровочный конфиг: только разовые *.calib.ts прогоны (вне обычной регрессии).
// Запуск: npm run calibrate
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ['**/*.calib.ts'],
    },
  }),
);
