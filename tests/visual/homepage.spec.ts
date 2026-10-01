import { test, expect } from '@playwright/test';

/**
 * 首页（/）视觉回归 baseline
 * - 全页截图对比（toHaveScreenshot）
 * - 等 networkidle 防止动效/异步加载导致 baseline 漂移
 */
test.describe('Homepage (/)', () => {
  test('renders stable baseline', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // 关掉 SW 注册：本地 preview 不需要，避免后台导航触发不必要状态
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    });
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });
});