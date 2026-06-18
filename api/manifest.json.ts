/**
 * v2.3.0 — /manifest.json endpoint
 *
 * 同 sw.js: 显式 serverless function 返回 manifest 内容
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const manifestPath = join(process.cwd(), 'public', 'manifest.json');
    const content = readFileSync(manifestPath, 'utf-8');
    return res.status(200).send(content);
  } catch (err) {
    console.error('[manifest.json] readFileSync failed:', err);
    return res.status(500).json({ error: 'manifest.json not found' });
  }
}
