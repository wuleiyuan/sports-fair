#!/usr/bin/env node
// standards-check.mjs — Sports Fair 项目级 standards 静态检查
//
// 依据：docs/standards/C4.md + docs/standards/OpenSSF-Best-Practices.md
// 用途：每次 push / PR 自动跑；任何一条失败 → CI 红
//
// 检查项（C4 + OpenSSF 不变量）：
//   C4.1  LICENSE 存在且为 MIT
//   C4.2  CONTRIBUTING.md 含 "Pull Request Process" 段
//   C4.3  CODE_OF_CONDUCT.md 存在
//   C4.4  SECURITY.md 含 "Reporting a Vulnerability" 段
//   C4.5  CHANGELOG.md 最新版本号 == package.json version
//   C4.6  package.json repository.url 指向 wuleiyuan/sports-fair
//   OSSF.1 .gitignore 含 .env
//   OSSF.2 .gitignore 含 data.db（避免泄露私人活动数据）
//   OSSF.3 无 hard-coded secrets（AKIA / ghp_ / sk- / gho_ 前缀）
//   OSSF.4 src/components/ShareModal/ 无 inline style
//   OSSF.5 src/components/Icons.tsx 至少 20 个图标
//   DOCS.1 docs/standards/ 目录含 C4.md + OpenSSF-Best-Practices.md
//
// 退出码：0 全通过；1 有失败项

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);

const FAILURES = [];
const PASSES = [];

// ─── helpers ──────────────────────────────────────────────────────
function ok(name) {
  PASSES.push(name);
  console.log(`✅ ${name}`);
}
function fail(name, why) {
  FAILURES.push({ name, why });
  console.error(`❌ ${name}\n     ↳ ${why}`);
}

function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) return listFiles(p);
    return [p];
  });
}

// ─── C4.1 ─ LICENSE ───────────────────────────────────────────────
const license = readIfExists(join(ROOT, 'LICENSE'));
if (!license) {
  fail('C4.1 LICENSE exists', 'LICENSE 文件不存在');
} else if (!/MIT License/i.test(license)) {
  fail('C4.1 LICENSE is MIT', 'LICENSE 不是 MIT');
} else {
  ok('C4.1 LICENSE is MIT');
}

// ─── C4.2 ─ CONTRIBUTING ──────────────────────────────────────────
const contrib = readIfExists(join(ROOT, 'CONTRIBUTING.md'));
if (!contrib) {
  fail('C4.2 CONTRIBUTING.md exists', 'CONTRIBUTING.md 不存在');
} else if (!/Pull Request Process/i.test(contrib)) {
  fail('C4.2 CONTRIBUTING.md has PR Process', '缺少 "Pull Request Process" 段');
} else {
  ok('C4.2 CONTRIBUTING.md has PR Process');
}

// ─── C4.3 ─ CODE_OF_CONDUCT ───────────────────────────────────────
if (!existsSync(join(ROOT, 'CODE_OF_CONDUCT.md'))) {
  fail('C4.3 CODE_OF_CONDUCT.md exists', 'CODE_OF_CONDUCT.md 不存在');
} else {
  ok('C4.3 CODE_OF_CONDUCT.md exists');
}

// ─── C4.4 ─ SECURITY.md ──────────────────────────────────────────
const sec = readIfExists(join(ROOT, 'SECURITY.md'));
if (!sec) {
  fail('C4.4 SECURITY.md exists', 'SECURITY.md 不存在');
} else if (!/Reporting a Vulnerability/i.test(sec)) {
  fail('C4.4 SECURITY.md has vuln report process', '缺少 "Reporting a Vulnerability" 段');
} else {
  ok('C4.4 SECURITY.md has vuln report process');
}

// ─── C4.5 ─ CHANGELOG 与 package.json 版本对齐 ──────────────────
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const changelog = readIfExists(join(ROOT, 'CHANGELOG.md'));
if (!changelog) {
  fail('C4.5 CHANGELOG.md exists', 'CHANGELOG.md 不存在');
} else {
  // 找最新的 [X.Y.Z] 段（排除 [未发布]）
  const versions = [...changelog.matchAll(/##\s*\[([^\]]+)\]/g)]
    .map((m) => m[1])
    .filter((v) => v !== '未发布' && v !== 'Unreleased');
  const latestChangelogVer = versions[0];
  if (!latestChangelogVer) {
    fail('C4.5 CHANGELOG has versioned section', 'CHANGELOG 缺 [X.Y.Z] 段');
  } else if (latestChangelogVer !== pkg.version) {
    fail(
      'C4.5 CHANGELOG version matches package.json',
      `CHANGELOG 最新段是 [${latestChangelogVer}]，但 package.json 是 ${pkg.version}`
    );
  } else {
    ok(`C4.5 CHANGELOG version [${pkg.version}] matches package.json`);
  }
}

// ─── C4.6 ─ repository.url 正确 ──────────────────────────────────
const repoUrl = pkg.repository?.url || pkg.repository || '';
const expectedRepos = ['wuleiyuan/sports-fair', 'github.com/wuleiyuan/sports-fair'];
if (!expectedRepos.some((r) => repoUrl.includes(r))) {
  fail(
    'C4.6 package.json repository.url points to wuleiyuan/sports-fair',
    `当前: ${repoUrl}`
  );
} else {
  ok('C4.6 package.json repository.url is correct');
}

// ─── OSSF.1 ─ .gitignore 含 .env ──────────────────────────────────
const gi = readIfExists(join(ROOT, '.gitignore'));
if (!gi) {
  fail('OSSF.1 .gitignore exists', '.gitignore 不存在');
} else if (!/(^|\s)\.env(\s|$)/m.test(gi)) {
  fail('OSSF.1 .gitignore blocks .env', '.gitignore 未屏蔽 .env');
} else {
  ok('OSSF.1 .gitignore blocks .env');
}

// ─── OSSF.2 ─ .gitignore 含 data.db ───────────────────────────────
if (!gi) {
  // 已在上一步 fail
} else if (!/(^|\s)data\.db(\s|$)/m.test(gi)) {
  fail('OSSF.2 .gitignore blocks data.db', '.gitignore 未屏蔽 data.db（隐私数据）');
} else {
  ok('OSSF.2 .gitignore blocks data.db');
}

// ─── OSSF.3 ─ 无 hard-coded secrets ──────────────────────────────
const SECRET_PATTERNS = [
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key
  /\bghp_[A-Za-z0-9]{30,}\b/, // GitHub PAT
  /\bgho_[A-Za-z0-9]{30,}\b/, // GitHub OAuth
  /\bsk-[A-Za-z0-9]{20,}\b/, // OpenAI key prefix
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, // Slack tokens
];
const scanDirs = ['src', 'api', 'scripts', '.github'];
let secretHits = [];
for (const d of scanDirs) {
  const dir = join(ROOT, d);
  if (!existsSync(dir)) continue;
  for (const f of listFiles(dir)) {
    if (!/\.(ts|tsx|js|mjs|cjs|py|sh|yml|yaml|json|md)$/.test(f)) continue;
    if (f.includes('node_modules')) continue;
    const content = readIfExists(f) || '';
    for (const pat of SECRET_PATTERNS) {
      if (pat.test(content)) {
        secretHits.push(`${f}: ${pat}`);
      }
    }
  }
}
if (secretHits.length > 0) {
  fail('OSSF.3 no hard-coded secrets', `发现 ${secretHits.length} 处疑似 secret：\n       ${secretHits.slice(0, 3).join('\n       ')}`);
} else {
  ok('OSSF.3 no hard-coded secrets');
}

// ─── OSSF.4 ─ ShareModal 无 inline style ──────────────────────────
const shareModalDir = join(ROOT, 'src/components/ShareModal');
if (!existsSync(shareModalDir)) {
  console.log('⏭  OSSF.4 ShareModal no inline style (目录不存在，跳过)');
} else {
  const files = listFiles(shareModalDir).filter((f) => /\.(tsx|jsx)$/.test(f));
  let inlineHits = [];
  for (const f of files) {
    const content = readIfExists(f) || '';
    // 匹配 style={{ ... }} 但允许 CSS 变量传递（变量名以 -- 开头）
    // 简化匹配：任何 style={...} 出现即视为潜在问题
    const matches = [...content.matchAll(/style=\{\{([^}]+)\}\}/g)];
    for (const m of matches) {
      // 允许仅传 CSS 变量的（如 style={{ '--sport-color': color }}）
      if (!/['"]--/.test(m[1])) {
        inlineHits.push(`${f}: ${m[0].slice(0, 60)}...`);
      }
    }
  }
  if (inlineHits.length > 0) {
    fail(
      'OSSF.4 ShareModal no inline style',
      `发现 ${inlineHits.length} 处 inline style：\n       ${inlineHits.slice(0, 3).join('\n       ')}`
    );
  } else {
    ok('OSSF.4 ShareModal no inline style');
  }
}

// ─── OSSF.5 ─ Icons.tsx ≥ 20 图标 ────────────────────────────────
const iconsFile = join(ROOT, 'src/components/Icons.tsx');
if (!existsSync(iconsFile)) {
  fail('OSSF.5 Icons.tsx exists', 'src/components/Icons.tsx 不存在');
} else {
  const content = readFileSync(iconsFile, 'utf8');
  // 匹配 export const IconXxx / function IconXxx / const IconXxx =
  const iconDecls = [
    ...(content.matchAll(/export\s+const\s+(Icon[A-Z][A-Za-z0-9]+)/g) || []),
    ...(content.matchAll(/export\s+function\s+(Icon[A-Z][A-Za-z0-9]+)/g) || []),
  ];
  const uniqueIcons = new Set(iconDecls.map((m) => m[1]));
  if (uniqueIcons.size < 20) {
    fail(
      'OSSF.5 Icons.tsx has ≥20 icons',
      `只找到 ${uniqueIcons.size} 个图标（要求 ≥20）`
    );
  } else {
    ok(`OSSF.5 Icons.tsx has ${uniqueIcons.size} icons (≥20)`);
  }
}

// ─── DOCS.1 ─ standards 目录完整 ────────────────────────────────
const stdDir = join(ROOT, 'docs/standards');
const needFiles = ['C4.md', 'OpenSSF-Best-Practices.md', 'AGENT-POLICY.md', 'README.md'];
const missing = needFiles.filter((n) => !existsSync(join(stdDir, n)));
if (missing.length > 0) {
  fail('DOCS.1 docs/standards/ complete', `缺失文件: ${missing.join(', ')}`);
} else {
  ok('DOCS.1 docs/standards/ complete (4 files)');
}

// ─── 总结 ──────────────────────────────────────────────────────
console.log('');
console.log('━'.repeat(60));
console.log(`  Standards check: ${PASSES.length} pass(es), ${FAILURES.length} failure(s)`);
console.log('━'.repeat(60));

if (FAILURES.length > 0) {
  console.error('');
  console.error('失败清单：');
  for (const f of FAILURES) {
    console.error(`  ❌ ${f.name}`);
    console.error(`     ${f.why.replace(/\n/g, '\n     ')}`);
  }
  process.exit(1);
}

console.log('✅ All standards checks passed');
process.exit(0);
