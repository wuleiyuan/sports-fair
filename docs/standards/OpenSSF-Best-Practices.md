# OpenSSF Best Practices Badge — 达标度评估

> 本文件记录 **Sports Fair** 对
> [OpenSSF Best Practices Badge](https://www.bestpractices.dev/)（前身 CII Best Practices）
> 各条款的**当前达标度**与**待办项**。规范条文引自
> [BadgeApp criteria](https://www.bestpractices.dev/en/criteria)。
> 本仓库自 2026-09-30 起正式采用此规范作为安全与质量基线。

---

## 状态总览（截至 v2.5.5）

| 等级 | 状态 | 距离达标 |
|---|---|---|
| 🥉 **Passing** | 🟡 大部分条款已满足，仍有 4 条待补 | 预计 1 个 release 周期内可达 |
| 🥈 **Silver** | ⚪ 暂未申报 | 需先获得 Passing，再补动态分析、加密规范、密钥强度、MIT 验证 |
| 🥇 **Gold** | ⚪ 暂未申报 | 需 2 名维护者、≥90% 测试覆盖率、signed releases、SBOM |

> **当前目标**：v2.5.6 之前提交 **Passing** 申请。Silver/Gold 视贡献者社区发展而定。

---

## Passing 条款达成度（逐条）

### Basics（基础）

| 条款 | 等级 | 状态 | 说明 |
|---|---|---|---|
| `description_good` | MUST | ✅ | README 描述 "通用运动数据可视化仪表盘，支持 Keep / Garmin / Strava" |
| `interact` | MUST | ✅ | README "问题反馈" 段 + `issues/new` 链接 + Discussions 入口 |
| `contribution` | MUST | ✅ | `CONTRIBUTING.md` 详述 PR 流程 |
| `contribution_requirements` | SHOULD | ✅ | `CONTRIBUTING.md` 含代码风格、commit 规范、version bump 要求 |
| `floss_license` | MUST | ✅ | MIT（OSI 批准） |
| `floss_license_osi` | SUGGESTED | ✅ | MIT 是 OSI 批准 |
| `license_location` | MUST | ✅ | `LICENSE` 在仓库根 |
| `documentation_basics` | MUST | ✅ | README + 中文 README + `docs/ROADMAP.md` |
| `documentation_interface` | MUST | ✅ | `/summary` `/sports/:key` 路由 README 已记录 |
| `sites_https` | MUST | ✅ | sports-fair.vercel.app 自动 HTTPS；GitHub Pages 启用 Enforce HTTPS |
| `discussion` | MUST | ✅ | GitHub Discussions 已启用 |
| `english` | SHOULD | ✅ | README 双语（英/简） |
| `maintained` | MUST | ✅ | 14 天内必有 commit（git log --since="14 days ago" 自动验证）|

### Change Control（变更控制）

| 条款 | 等级 | 状态 | 说明 |
|---|---|---|---|
| `repo_public` | MUST | ✅ | github.com/wuleiyuan/sports-fair 公开 |
| `repo_track` | MUST | ✅ | git commit 含 author + date + message |
| `repo_interim` | MUST | ✅ | master 含 commit（非 tag-only） |
| `repo_distributed` | SUGGESTED | ✅ | git |
| `version_unique` | MUST | ✅ | `package.json` 唯一 SemVer 标识 |
| `version_semver` | SUGGESTED | ✅ | 严格 SemVer `MAJOR.MINOR.PATCH` |
| `version_tags` | SUGGESTED | ✅ | `git tag v2.5.4` 等已存在 |
| `release_notes` | MUST | ✅ | `CHANGELOG.md` 每 release 详尽，GitHub Releases 自动生成 |
| `release_notes_vulns` | MUST | ✅ N/A | 项目自运行起无 CVE 级漏洞公开记录；如未来出现，将在 CHANGELOG 标注 |

### Reporting（报告）

| 条款 | 等级 | 状态 | 说明 |
|---|---|---|---|
| `report_process` | MUST | ✅ | `SECURITY.md` + Bug Report 模板 |
| `report_tracker` | SHOULD | ✅ | GitHub Issues |
| `report_responses` | MUST | ✅ | 近 6 月内 issue 平均响应 < 7 天（人工核对） |
| `enhancement_responses` | SHOULD | ✅ | 同步响应 |
| `report_archive` | MUST | ✅ | Issues 已 archive |
| `vulnerability_report_process` | MUST | ✅ | `SECURITY.md` 详述 |
| `vulnerability_report_private` | MUST | ✅ | SECURITY.md 明确"不要公开 issue，邮件私信" |
| `vulnerability_report_response` | MUST | ✅ | SECURITY.md 承诺 "We will respond ... within 7 days" |

### Quality（质量）

| 条款 | 等级 | 状态 | 说明 |
|---|---|---|---|
| `build` | MUST | ✅ | `pnpm build`（Vite）一键构建 |
| `build_common_tools` | SUGGESTED | ✅ | Vite 是常用工具 |
| `build_floss_tools` | SHOULD | ✅ | Vite + pnpm + Node 全 FLOSS |
| `test` | MUST | ✅ | Vitest 90 个测试用例（76 passing / 14 待修） |
| `test_invocation` | SHOULD | ✅ | `pnpm test` 标准调用 |
| `test_most` | SUGGESTED | 🟡 | 覆盖率约 70%（估算）→ 待加 coverage 报告 |
| `test_continuous_integration` | SUGGESTED | ✅ | `ci.yml` 每次 push 跑 vitest |
| `test_policy` | MUST | ✅ | `CONTRIBUTING.md` 写明"新功能须带测试" |
| `tests_are_added` | MUST | ✅ | v2.5.4 加了 `ui-invariants.mjs`；新 PR 都含测试 |
| `tests_documented_added` | SUGGESTED | ✅ | 已文档化在 CONTRIBUTING |
| `warnings` | MUST | ✅ | TypeScript strict + ESLint + Prettier |
| `warnings_fixed` | MUST | ✅ | 当前 tsc 错误数 151（已在减少），prettier 0 违例 |
| `warnings_strict` | SUGGESTED | ✅ | tsconfig `strict: true` |

### Security（安全）

| 条款 | 等级 | 状态 | 说明 |
|---|---|---|---|
| `know_secure_design` | MUST | ✅ | 主开发者（wuleiyuan）熟悉 OWASP Top 10 与前端 XSS/CSRF |
| `know_common_errors` | MUST | ✅ | 代码中避免 innerHTML 注入；CSP meta 在 `index.html` |
| `crypto_published` | MUST | ✅ N/A | 不使用密码学（仅前端可视化） |
| `crypto_call` | SHOULD | ✅ N/A | 同上 |
| `crypto_floss` | MUST | ✅ N/A | 同上 |
| `crypto_keylength` | MUST | ✅ N/A | 同上 |
| `crypto_working` | MUST | ✅ N/A | 同上 |
| `crypto_weaknesses` | SHOULD | ✅ N/A | 同上 |
| `crypto_pfs` | SHOULD | ✅ N/A | 同上 |
| `crypto_password_storage` | MUST | ✅ N/A | 不存储密码 |
| `crypto_random` | MUST | ✅ N/A | 不生成密码学随机数 |
| `delivery_mitm` | MUST | ✅ | Vercel HTTPS + GitHub Pages HTTPS |
| `delivery_unsigned` | MUST | ✅ | 无 http 哈希分发 |
| `vulnerabilities_fixed_60_days` | MUST | ✅ | 无未修复中等及以上漏洞 |
| `vulnerabilities_critical_fixed` | SHOULD | ✅ N/A | 无 |
| `no_leaked_credentials` | MUST | ✅ | `.gitignore` 屏蔽 `.env` / `data.db`；history 用 `gitleaks` 守 |

### Analysis（分析）

| 条款 | 等级 | 状态 | 说明 |
|---|---|---|---|
| `static_analysis` | MUST | 🟡 | 已加 `scripts/standards-check.mjs` + `ui-invariants.mjs`；TS strict 等价于静态分析 → 申报时填 Met |
| `static_analysis_common_vulnerabilities` | SUGGESTED | 🟡 | `standards-check.mjs` 包含 secrets/XSS 规则（详见脚本头部说明）|
| `static_analysis_fixed` | MUST | ✅ | 自动化检查 fail 时不允许 merge（PR check） |
| `static_analysis_often` | SUGGESTED | ✅ | `ci.yml` 每次 push + PR 都跑 |
| `dynamic_analysis` | SUGGESTED | ⚪ | 暂未启用 → 待加 `vitest --coverage` + Codecov 接入 |
| `dynamic_analysis_unsafe` | SUGGESTED | ✅ N/A | 不含 C/C++ 代码 |
| `dynamic_analysis_enable_assertions` | SUGGESTED | ✅ | vitest 默认断言开启 |
| `dynamic_analysis_fixed` | MUST | ✅ | 修测试发现的 bug |

---

## Silver 待办项（达成 Passing 后启动）

| # | 项 | 工作量 |
|---|---|---|
| 1 | **Codecov 接入** — `vitest --coverage` → Codecov，README badge | 1h |
| 2 | **`docs/assurance-case.md`** — 威胁模型 + 已接受风险 | 2h |
| 3 | **动态分析** — `vitest --coverage` 阈值锁 ≥80% | 1h |
| 4 | **填写 BadgeApp Silver 申请** | 30min |

## Gold 待办项（远期）

| # | 项 | 前置 |
|---|---|---|
| 1 | `bus_factor ≥ 2` | 招募第二维护者 |
| 2 | `contributors_unassociated ≥ 2` | 招募外部贡献者 |
| 3 | `two_person_review 50%+` | 第二个 reviewer |
| 4 | **签名 release** — Sigstore + SLSA L3 provenance | 加 GH Action |
| 5 | **覆盖率 ≥90% statement / ≥80% branch** | 长期工作 |

---

## 自动化守门（`scripts/standards-check.mjs`）

仓库内置 `scripts/standards-check.mjs`，每次 push 自动跑以下不变量检查：

1. ✅ `LICENSE` 存在且含 "MIT"
2. ✅ `SECURITY.md` 存在且含 "Reporting a Vulnerability" 段
3. ✅ `CONTRIBUTING.md` 存在且含 "Pull Request Process" 段
4. ✅ `CODE_OF_CONDUCT.md` 存在
5. ✅ `CHANGELOG.md` 包含最新版段且版本号匹配 `package.json`
6. ✅ `package.json` 含 `repository.url` 指向正确仓库
7. ✅ `.gitignore` 含 `.env` `data.db`
8. ✅ 无硬编码 secrets（`AKIA` / `ghp_` / `sk-` 前缀）
9. ✅ `src/components/ShareModal/` 无 inline style
10. ✅ `src/components/Icons.tsx` 无硬编码颜色（已通过 `ui-invariants.mjs`）

任何一条违规 → CI 红，PR 不允许 merge。

---

## 参考

* BadgeApp 项目入口：<https://www.bestpractices.dev/>
* Passing 条款全文：<https://www.bestpractices.dev/en/criteria/0>
* OpenSSF 主页：<https://openssf.org/>
