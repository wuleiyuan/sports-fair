import { test, expect } from '@playwright/test';

/**
 * /health 健康数据页视觉回归 baseline
 */
test.describe('Health (/health)', () => {
  test('renders stable baseline', async ({ page }) => {
    await page.goto('/health', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    });
    await expect(page).toHaveScreenshot('health.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });
});