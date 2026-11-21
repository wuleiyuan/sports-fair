/**
 * 临时诊断端点 — 用完即删。
 * 目的：在 Vercel 运行时里捕获真实错误信息（静态 import 失败无法 try/catch）。
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const out: Record<string, unknown> = {
    node: process.version,
    cwd: process.cwd(),
    moduleType: 'unknown',
  };

  // 1) 动态 import 各种写法
  const tries: [string, string][] = [
    ['ext-less ./shared/content', './shared/content'],
    ['with .js ./shared/content.js', './shared/content.js'],
    ['ext-less ./shared/deepseek', './shared/deepseek'],
    ['with .js ./shared/deepseek.js', './shared/deepseek.js'],
  ];
  for (const [label, spec] of tries) {
    try {
      const m = (await import(/* @vite-ignore */ spec)) as Record<string, unknown>;
      out[label] = 'OK keys=' + Object.keys(m).slice(0, 4).join(',');
    } catch (e) {
      const err = e as Error;
      out[label] = `${err.name}: ${err.message}`;
    }
  }

  // 2) 文件是否在函数包里
  try {
    const here = process.cwd();
    const candidates = [
      path.join(here, 'api'),
      path.join(here, 'api', 'shared'),
      '/var/task/api',
      '/var/task/api/shared',
    ];
    const found: Record<string, string[] | string> = {};
    for (const c of candidates) {
      try {
        found[c] = await fs.readdir(c);
      } catch (e) {
        found[c] = 'ERR ' + (e as Error).message;
      }
    }
    out.dirs = found;
  } catch (e) {
    out.dirs = 'ERR ' + (e as Error).message;
  }

  return res.status(200).json(out);
}
