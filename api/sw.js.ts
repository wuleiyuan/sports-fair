/**
 * v2.3.0 — /sw.js endpoint
 *
 * Vercel 静态 build 似乎不 deploy public/sw.js (Vite 5 + Tailwind v4 组合?),
 * 改用 serverless function 显式返回 sw.js 内容。
 *
 * Cache-Control: no-store — 每次拉新版本, SW 更新即时生效
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 不缓存
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel serverless function cwd 是项目根, public/ 在根
    const swPath = join(process.cwd(), 'public', 'sw.js');
    const content = readFileSync(swPath, 'utf-8');
    return res.status(200).send(content);
  } catch (err) {
    console.error('[sw.js] readFileSync failed:', err);
    return res.status(500).json({ error: 'sw.js not found' });
  }
}
