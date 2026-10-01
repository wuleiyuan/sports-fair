import { test, expect } from '@playwright/test';

/**
 * /sports/hiking 徒步详情页视觉回归 baseline
 */
test.describe('Sport detail - hiking (/sports/hiking)', () => {
  test('renders stable baseline', async ({ page }) => {
    await page.goto('/sports/Hiking', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    });
    await expect(page).toHaveScreenshot('sport-detail-hiking.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });
});