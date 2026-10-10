/**
 * v2.5.23.2 — /api/icon/<path> catch-all serverless function
 *
 * 把 favicon.png / apple-touch-icon.png / images/{favicon,logo-512,og-image}.png
 * 通过 serverless function 兜底返回（base64 解码成 Buffer）。
 *
 * 路由入口: vercel.json rewrites 把上面 5 个 URL 重写到 /api/icon/<path>
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findIcon } from '../icon-content';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel dynamic route /api/icon/[...path].ts → req.query.path 是 string | string[]
  const raw = req.query.path;
  const pathParam = Array.isArray(raw) ? raw.join('/') : raw;

  if (typeof pathParam !== 'string' || pathParam.length === 0) {
    return res.status(400).json({ error: 'path required' });
  }

  const icon = findIcon(pathParam);
  if (!icon) {
    return res.status(404).json({ error: `icon not found: ${pathParam}` });
  }

  res.setHeader('Content-Type', icon.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Content-Length', String(icon.size));
  return res.status(200).send(icon.buffer);
}
