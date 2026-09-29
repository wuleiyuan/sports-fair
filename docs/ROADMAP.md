# Roadmap

不在 CHANGELOG 里的中长期计划 / 已知问题跟踪。
CHANGELOG 只记"已发布"内容，本文件记"将来要做"。

## 数据缺口

- [ ] **2024-09 ~ 2025-08 缺失数据期（Apple Watch 漏戴根因）**
  - 现象：该时段 Keep 无任何活动记录
  - 原因：推测 Apple Watch 没戴/没电/同步失败
  - 行动：如有原始 GPX/Health 导出可补回；否则接受历史缺口

## 工具改进

- [ ] **`bump_version.sh -y` 自动从 git log 生成 CHANGELOG 段落**
  - 当前：每次 release 要手填 Added/Changed/Fixed 段
  - 目标：从 `git log v2.5.2..HEAD --oneline` 自动归类（feat/fix/chore → 对应段）
  - 价值：减少手动维护成本，避免漏写