import { test, expect } from '@playwright/test';

/**
 * /sports/run 跑步详情页视觉回归 baseline
 */
test.describe('Sport detail - run (/sports/run)', () => {
  test('renders stable baseline', async ({ page }) => {
    await page.goto('/sports/Run', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    });
    await expect(page).toHaveScreenshot('sport-detail-run.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });
});