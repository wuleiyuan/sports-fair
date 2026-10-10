/**
 * v2.5.25 — Vercel build 后把 logo PNG 从 src/static/icons/ 复制到 dist/
 *
 * 背景:
 *   - .vercelignore 排除整个 public/ 目录
 *   - Vite 默认从 public/ 复制资源到 dist/, 但 Vercel 端 public/ 不可见
 *   - 这导致 favicon.png / apple-touch-icon.png / images/*.png 永远 404
 *   - 老方案 (api/serverless function) 在 Vercel 上跑不起来 (500)
 *
 * 解决:
 *   - 把 5 个 PNG 放在 src/static/icons/ (git tracked, Vercel 一定上传)
 *   - postbuild 脚本: src/static/icons/* → dist/ 对应位置
 *   - 不依赖 .vercelignore 改动的生效
 *
 * 调用:
 *   pnpm build = node scripts/embed-sw.js && vite build && node scripts/copy-icons.js
 */
import { copyFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src', 'static', 'icons');
const DIST = join(ROOT, 'dist');

// 源文件 → 目标路径 (相对 dist/)
const COPIES = [
  { from: 'favicon.png', to: 'favicon.png' },
  { from: 'apple-touch-icon.png', to: 'apple-touch-icon.png' },
  { from: 'favicon-192.png', to: 'images/favicon.png' },
  { from: 'favicon-1024.png', to: 'images/favicon-1024.png' }, // v2.5.26: 1024x1024 主图 (LANCZOS 上采样)
  { from: 'logo-512.png', to: 'images/logo-512.png' },
  { from: 'og-image.png', to: 'images/og-image.png' },
];

if (!existsSync(DIST)) {
  console.log('⏭  copy-icons: dist/ 不存在, vite build 还没跑?');
  process.exit(0);
}

if (!existsSync(SRC)) {
  console.log('⏭  copy-icons: src/static/icons/ 不存在, 跳过 (用仓库里已嵌入的)');
  process.exit(0);
}

let copied = 0;
let failed = 0;

for (const { from, to } of COPIES) {
  const srcPath = join(SRC, from);
  const destPath = join(DIST, to);
  if (!existsSync(srcPath)) {
    console.log(`  ⚠ skip: ${from} (source not found)`);
    failed++;
    continue;
  }
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(srcPath, destPath);
  const size = statSync(destPath).size;
  console.log(`  ✓ ${from} → ${to} (${size} B)`);
  copied++;
}

console.log(
  `\n✓ copy-icons: ${copied} copied, ${failed} failed → ${DIST}`,
);
