/**
 * 临时诊断端点 — 用完即删。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const out: Record<string, unknown> = { node: process.version, cwd: process.cwd() };
  const walk = async (p: string, depth: number): Promise<unknown> => {
    try {
      const ents = await fs.readdir(p, { withFileTypes: true });
      const r: Record<string, unknown> = {};
      for (const e of ents) {
        if (e.isDirectory() && depth > 0) {
          r[e.name + '/'] = await walk(path.join(p, e.name), depth - 1);
        } else {
          r[e.name] = e.isDirectory() ? 'dir' : 'file';
        }
      }
      return r;
    } catch (e) {
      return 'ERR ' + (e as Error).message;
    }
  };
  out.apiDir = await walk('/var/task/api', 2);
  try {
    out.vercelConfig = await fs.readFile('/var/task/.vercel/output/config.json', 'utf-8');
  } catch (e) {
    out.vercelConfig = 'ERR ' + (e as Error).message;
  }
  return res.status(200).json(out);
}
