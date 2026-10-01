import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  // RTL16 + React 18 需要 development build 才能让 act() 工作
  // vitest 默认是 production build (process.env.NODE_ENV === 'production')
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  test: {
    // 默认 node 环境，组件测试用 happy-dom 单独指定
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.test.{ts,tsx}',
      'api/**/__tests__/**/*.test.{ts,tsx}',
    ],
    // 允许 .tsx 组件测试走 happy-dom (更快)
    environmentMatchGlobs: [['src/components/**/*.test.tsx', 'happy-dom']],
    setupFiles: ['./vitest.setup.ts'],
    // 默认使用 forks pool, React 18 act() 在 threads 下偶发不稳定
    pool: 'forks',
  },
});
