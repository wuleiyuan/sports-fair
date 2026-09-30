# Standards — Sports Fair 开发规范

本目录是 **Sports Fair 仓库** 的开发规范基线。所有 PR 都应符合：

## 📜 核心规范

| 规范 | 文件 | 用途 |
|---|---|---|
| **[C4](C4.md)** — Collective Code Construction Contract | `C4.md` | 协作流程：fork + PR + 短小补丁 + Trunk-based + 维护者中立 |
| **[OpenSSF Best Practices Badge](OpenSSF-Best-Practices.md)** | `OpenSSF-Best-Practices.md` | 安全 + 质量基线：Passing/Silver/Gold 条款 + 当前达标度 |
| **[AGENT-POLICY](AGENT-POLICY.md)** — 我作为 AI 的自约束 | `AGENT-POLICY.md` | AI 助手开发本仓库时的硬规则 + 红线 + 自检 |

## 🔗 关联文件

| 文件 | 关系 |
|---|---|
| [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) | C4 + 本规范对外的简化版入口（人类贡献者） |
| [`../../SECURITY.md`](../../SECURITY.md) | OpenSSF `vulnerability_report_process` 的实现 |
| [`../../CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) | C4 友好文化的体现 |
| [`../../LICENSE`](../../LICENSE) | C4 + OpenSSF 都要求的 MIT 许可证 |
| [`../../CHANGELOG.md`](../../CHANGELOG.md) | OpenSSF `release_notes` 的实现 |
| [`../../scripts/standards-check.mjs`](../../scripts/standards-check.mjs) | 自动跑 OpenSSF 不变量检查 |

## 🤖 自动化守门

```bash
pnpm standards:check   # OpenSSF 不变量
pnpm ui:check          # UI invariants
pnpm run check         # Prettier + ESLint
pnpm test              # Vitest
```

任何一项失败 → CI 红 → PR 不允许 merge。

## 🏅 当前 OpenSSF Badge 进度

| 等级 | 状态 | 申报入口 |
|---|---|---|
| 🥉 **Passing** | 🟡 接近达标，差 4 条 | <https://www.bestpractices.dev/> |
| 🥈 **Silver** | ⚪ 暂未启动 | 需先获 Passing |
| 🥇 **Gold** | ⚪ 远期 | 需 2 名维护者 |

详情见 [`OpenSSF-Best-Practices.md`](OpenSSF-Best-Practices.md)。

## 📚 引用规范原文

* C4 原文：<https://github.com/zeromq/rfc/blob/master/spec:22/C4.md>（Pieter Hintjens，GPLv3）
* OpenSSF Best Practices：<https://www.bestpractices.dev/en/criteria/0>
