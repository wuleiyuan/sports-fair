import { test, expect } from '@playwright/test';

/**
 * /sports/ride 骑行详情页视觉回归 baseline
 */
test.describe('Sport detail - ride (/sports/ride)', () => {
  test('renders stable baseline', async ({ page }) => {
    await page.goto('/sports/Ride', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    });
    await expect(page).toHaveScreenshot('sport-detail-ride.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });
});