import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test('Сайт открывается и показывает главный заголовок', async ({ page }) => {
  await page.goto(BASE_URL);
  // Ждем появления логотипа или главного заголовка
  await expect(page.locator('text=Найди сооснователя')).toBeVisible({ timeout: 10000 });
});

test('Страница логина доступна', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  // Проверяем, что есть кнопка входа или поле email
  await expect(page.locator('input[type="email"], input[name="email"], text=Войти').first()).toBeVisible({ timeout: 10000 });
});