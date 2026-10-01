import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 视觉回归 baseline 配置
 * - headless 模式
 * - 仅 chromium
 * - baseURL: vite preview 默认端口 4173
 * - 全页截图对比 baseline（toHaveScreenshot）
 * - 自动启动 vite preview；如已外部启动则复用
 */
export default defineConfig({
  testDir: './tests/visual',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: './tests/visual/test-results',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  // 自动起 vite preview（--port 4173），已起则跳过
  webServer: {
    command: 'pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});