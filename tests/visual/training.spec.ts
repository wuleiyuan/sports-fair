import { test, expect } from '@playwright/test';

/**
 * /training 训练页视觉回归 baseline
 */
test.describe('Training (/training)', () => {
  test('renders stable baseline', async ({ page }) => {
    await page.goto('/training', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    });
    await expect(page).toHaveScreenshot('training.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });
});