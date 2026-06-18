/**
 * v2.3.0 — /manifest.json endpoint
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MANIFEST_CONTENT } from './_manifest_content';

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

  return res.status(200).send(MANIFEST_CONTENT);
}
