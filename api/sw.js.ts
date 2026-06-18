/**
 * v2.3.0 — /sw.js endpoint
 *
 * Vercel 静态 build 不 deploy public/sw.js 根文件,
 * 改用 serverless function 返回嵌入内容.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SW_CONTENT } from './_sw_content';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).send(SW_CONTENT);
}
