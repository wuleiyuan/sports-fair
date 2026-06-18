/**
 * v2.3.0 — /sw.js endpoint
 *
 * Vercel 静态 build 不 deploy public/sw.js 根文件 (Vite 5 行为),
 * 改用 serverless function 直接内联 sw.js 内容返回.
 *
 * build 时 scripts/embed-sw.js 把 sw.js 写入 api/sw-content.ts,
 * function 编译时 import SW_CONTENT 常量.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SW_CONTENT } from './sw-content';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // v2.3.0 debug: import diagnostic
  console.log('[sw.js] SW_CONTENT type:', typeof SW_CONTENT, 'length:', SW_CONTENT?.length);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (typeof SW_CONTENT !== 'string' || SW_CONTENT.length === 0) {
    console.error('[sw.js] SW_CONTENT missing!');
    return res.status(500).json({ error: 'sw.js not found' });
  }

  return res.status(200).send(SW_CONTENT);
}
