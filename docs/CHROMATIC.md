# Chromatic 视觉回归 & UI Review

> 让 UI 改动拥有专属 review 流——1:1 pixel 对比、可评论、可追溯、可审计。

---

## 1. 项目目标

`sports-fair` 之前没有任何视觉回归机制：UI 改动只能靠人肉对比 GitHub diff，
reviewer 必须本地跑 `pnpm dev` 才能看到效果，且经常漏看细微像素偏差（间距 1px / 颜色 1%）。

**引入 Chromatic 后**：

| 能力                                 | 价值                                      |
| ------------------------------------ | ----------------------------------------- |
| 1:1 像素 diff（cloud-side baseline） | 任何 > 0.01% 差异都会被捕捉               |
| PR 内嵌可视化对比卡                  | reviewer 不需本地复现即可看「这次改了啥」 |
| 行级 / 区域级评论                    | 可在 diff 上直接留 review comment         |
| 历史 baseline 永久保留               | 任意 commit 可回溯到任意时刻的截图        |
| 不依赖 Storybook                     | 用现有 Playwright 全页截图喂入            |

---

## 2. 为什么走「Playwright + Chromatic」组合

Chromatic 原生吃 **Storybook** stories，但本项目目前没有 Storybook。
强行引入 Storybook 等于推翻整个组件 demo 体系，ROI 太低。

本项目已有的：

| 现有资产                               | 复用方式                                              |
| -------------------------------------- | ----------------------------------------------------- |
| `playwright.config.ts`                 | 已经 headless chromium，baseURL 4173 (vite preview)   |
| `tests/visual/*.spec.ts` × 6           | 已经能产出全页 PNG 截图（baseline 在 `*-snapshots/`） |
| `pnpm run visual:test / visual:update` | CI 友好脚本                                           |

**组合方案**：

```
┌────────────────┐    ┌────────────────┐    ┌─────────────────────┐
│  Vite preview  │ ─▶ │ Playwright 截图 │ ─▶ │  Chromatic 上传评审  │
│  (4173)        │    │  (PNG, 全页)    │    │  (1:1 pixel diff)   │
└────────────────┘    └────────────────┘    └─────────────────────┘
```

Chromatic CLI 接受任意 PNG 文件夹作为 story 树——上传截图即创建"story"，
所以**无需写任何额外测试**就能让 UI 改动进入 Chromatic review 流。

---

## 3. 启用步骤（一次性配置）

> ⏱️ 约 10 分钟。一次性配置，永久受益。

### 3.1 注册 Chromatic 账号

打开 <https://www.chromatic.com/>，用 GitHub 账号登录。

### 3.2 创建 Project

1. 进入 Chromatic dashboard → `Add project` → 选择 `wuleiyuan/sports-fair`
2. 项目名建议：`sports-fair`
3. Chromatic 会给你一个 `project-token`，形如：
   ```
   chpt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 3.3 把 token 注入 GitHub Secrets

1. 进入 GitHub 仓库 → `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret`
3. Name: `CHROMATIC_PROJECT_TOKEN`
4. Value: 粘贴 3.2 拿到的 token
5. 点击 `Add secret`

### 3.4 触发首次 baseline 上传

任一方式：

- 本地 push 到 `master` 触发 workflow
- 或者打开任意一个 PR
- 或者手动触发：`Actions` → `Chromatic Visual Review` → `Run workflow`

首次上传后，Chromatic 会接受所有截图作为「基线」，
后续 PR 都会跟这个基线做 1:1 pixel diff。

---

## 4. 日常使用

### 4.1 CI 流程（推荐）

push / PR → `.github/workflows/chromatic.yml` 自动跑：

```
1. checkout (fetch-depth: 0)
2. pnpm install (unset NODE_ENV)
3. pnpm run build
4. playwright install chromium
5. pnpm run visual:update      ← 刷新本地 baseline
6. pnpm exec chromatic upload   ← 上传到 Chromatic
7. （缺 token 时）发 PR comment 提示启用
```

PR 里会出现：

- ✅ 一个 Chromatic check（绿色 = 无变化 / 黄色 = 有变化 / 红色 = error）
- 💬 一个 Chromatic bot 评论，列出所有「视觉变化」story + before/after 滚动条

reviewer 直接在评论里 approve / request changes，不需要本地复现。

### 4.2 本地测试

#### 跑视觉回归（无 Chromatic）

```bash
pnpm run visual:test        # 跟 baseline 比对
pnpm run visual:update      # 接受当前为新 baseline
```

#### 跑 Chromatic 上传（debug 用）

```bash
CHROMATIC_PROJECT_TOKEN=<你的 token> pnpm run chromatic:test
```

`--exit-zero-on-changes` flag 让有视觉变化时不报错——方便本地实验。

#### 干跑（看 Chromatic 能不能连通）

```bash
CHROMATIC_PROJECT_TOKEN=<你的 token> pnpm exec chromatic --dry-run
```

### 4.3 优雅降级

`.github/workflows/chromatic.yml` 已配置：

| 场景                             | 行为                                                                |
| -------------------------------- | ------------------------------------------------------------------- |
| `CHROMATIC_PROJECT_TOKEN` 未设置 | workflow **不 fail**，PR 自动收到一条 warning 评论                  |
| 上传成功但有视觉变化             | `exit-zero-on-changes` 让 check 绿色，但 Chromatic UI 上能看到 diff |
| Chromatic 服务挂了               | `continue-on-error: true` 让 job 不挂，但会有红色 ❌ 提示           |

---

## 5. 架构与设计取舍

### 5.1 为什么不用 Storybook

| 方案                               | 工作量                        | 维护成本             | 价值                      |
| ---------------------------------- | ----------------------------- | -------------------- | ------------------------- |
| 引入 Storybook                     | 高（每个组件写 1+ story）     | 高（跟源码同步更新） | 组件级视觉测试            |
| **Playwright + Chromatic（采用）** | **零**（沿用现有 Playwright） | **低**（截图自动）   | **全页视觉回归 + review** |

本项目目前 6 张 baseline 截图覆盖了 home / training / health / sport-detail 三种页面类型，
对当前规模足够。未来若组件量爆炸，可分阶段引入 Storybook。

### 5.2 为什么用 `--exit-zero-on-changes`

Chromatic 默认行为：检测到视觉变化会让 check fail。
对 review 流来说这是 anti-pattern：

- UI 改动 99% 是预期的（PR 就是要改 UI）
- fail → merge button 灰 → reviewer 找不到 approve 入口
- 真正的 gate 应该用「reviewer 没 approve」而不是「像素有变化」

`--exit-zero-on-changes` 让 Chromatic check 永远绿色，把决策权交给 reviewer。

### 5.3 为什么在 CI 里 `visual:update`

Chromatic 把每次上传的截图存为**该 commit 的 baseline**。
CI 里 `visual:update` 确保本地 baseline 跟 PR 同步，避免「本地旧 baseline → Chromatic 比对失败」。

> 注：本地 `tests/visual/*-snapshots/` 是 Playwright 自己的 baseline；
> Chromatic 的 baseline 在云端，互不冲突。

---

## 6. 故障排查

### 6.1 `chromatic: command not found`

```bash
unset NODE_ENV && pnpm install
# 或
pnpm exec chromatic --version
```

Chromatic 在 devDependencies，CI 用 `pnpm install --frozen-lockfile` 也会装。

### 6.2 `Cannot find module '@chromatic-com/playwright'` 或类似

Chromatic 18+ 自带依赖无需额外装。如果是模块解析错误，清缓存：

```bash
rm -rf node_modules pnpm-lock.yaml.bak
unset NODE_ENV && pnpm install
```

### 6.3 Workflow 一直 skipped

检查 `secrets.CHROMATIC_PROJECT_TOKEN`：

1. GitHub repo → `Settings` → `Secrets and variables` → `Actions`
2. 确认 secret 名**完全等于** `CHROMATIC_PROJECT_TOKEN`（大小写敏感）
3. 重新触发 workflow

### 6.4 PR 截图跟本地 baseline 对不上

正常——Chromatic 跟的是云端历史 baseline，不是本地 `*-snapshots/`。
本地 `pnpm run visual:update` 是给 Playwright 自己用的，跟 Chromatic 无关。

---

## 7. 未来可扩展

| 方向                          | 价值                                     | 优先级                        |
| ----------------------------- | ---------------------------------------- | ----------------------------- |
| 引入 Storybook                | 组件级视觉测试，按钮/弹窗单独 diff       | 中（等组件数 > 30）           |
| 给 Chromatic 加 `owners` 通知 | reviewer 自动 @ 责任人                   | 低                            |
| 接 Chromatic TurboSnap        | 只对改动相关的 story 截图，CI 提速 5-10x | 中（baseline 数 > 50 后启用） |
| 加 mobile viewport baseline   | 移动端单独 diff                          | 低（先把桌面端跑稳）          |

---

## 8. 参考链接

- 📘 Chromatic 官方文档：<https://www.chromatic.com/docs>
- 📘 Chromatic CLI：<https://www.chromatic.com/docs/cli>
- 📘 本项目 Playwright 配置：`playwright.config.ts`
- 📘 本项目 workflow：`.github/workflows/chromatic.yml`

---

_最后更新：随 Chromatic 18.x 集成同步写入_
