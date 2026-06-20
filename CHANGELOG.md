# 更新日志

所有值得注意的版本变更都会记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [未发布]

### 计划中
- 2024-09~2025-08 缺失数据期（Apple Watch 漏戴根因）
- `bump_version.sh -y` 自动从 git log 生成 CHANGELOG 段落（目前还要手填）

## [2.4.1] - 2026-06-20

### 修复
- **训练页 404** — `fetch('/training_load.json')` 在生产构建中返回 404，因 Vite 不自动 serve `src/static/` 目录文件。改为使用 `import` 直接引 JSON（与项目中 `health.tsx` 等所有页面一致），JSON 内联至 JS bundle，消除额外网络请求

## [2.4.0] - 2026-06-20

### 新增
- **TSB 训练状态模型** — Coggan TSB (2003) 基于 CTL 42d / ATL 7d 指数移动平均
  - `scripts/training_load.py`: 新增 `compute_ctl_atl()` + TSB 输出字段
  - 规律: TSB > 15 恢复 / -5~15 最佳 / -15~-5 疲劳 / < -15 过度
- **TSBCard 前端组件** — Apple HIG Bento 风格，替换原 CadenceCard 占位
  - 大数字 TSB 值 + CTL / ATL 双列数据
  - TSB 标尺 (-30 ~ +30) 带指针定位
  - 静态训练建议 (Coggan 模型)
  - `types.ts`: TSBResult / TSBStatus / TSB_STATUS_LABEL / tsbStatusAdvice()
- **训练负荷页算法说明** — training.tsx footer 增加 Coggan TSB 公式说明

### 修复
- **TRIMP 公式修正** — `training_load.py` 中 `compute_trimp()` 的 Banister 公式错用 `delta_hr` (绝对差值) 替代 `hrr_ratio` (相对比例)，导致 TRIMP 数值高估约 100 倍
  - 修复后: ACWR 比值不变 (同比例缩放)，TSB 降至合理区间 (-2.1)
- **导航栏重复链接** — Header 中 "📊 旅程总览" 和 site-metadata navLinks 中 "Summary" 均指向 `/summary`，现已删除 navLinks 中冗余条目

### 移除
- **CadenceCard** — 从 training.tsx Bento grid 移除 (占位待后续 cadence 数据源就绪后再恢复)

## [2.3.5] - 2026-06-20

### 修复
- **徒步/步行数据归类修复** — Keep 源 `outdoorWalking` 数据被 `keep_sync.py` 错误标记为 `Hiking`，现已重新归入 `Walk`
  - Hiking: 41→4（仅保留真正"徒步 Hiking"的 4 条）
  - Walk: 29→66（并入 37 条 Keep outdoorWalking）
  - 总数 677 不变，无数据丢失

## [2.3.2] - 2026-06-19

### 新增
- **Training 页面** — v2.3.2 功能徽章显示在各卡片 footer
- **ACWRCard** — 高危区间（ACWR > 1.5）显示 warning 文本 + 生成时间戳显示在 footer
- **HRZonesCard** — 极化训练 >= 70% 时显示 "极化训练合理" 标签
- **CadenceCard** — 步频信息 + 目标区间显示
- **AdviceListCard** — 建议 action + evidence 渲染 + footer 显示 method + source

### 修复
- 修复多元素文本选择器导致的测试失败（testing-library `getByText` → `getAllByText` + 长度检查）

## [2.3.0] - 2026-06-18

### 新增 (PWA 基础 + 骨架屏体感优化)

#### PWA (渐进式 Web App) 基础支持
- **`public/manifest.json`** — 标准 PWA manifest
  - `display: standalone` (iOS Safari "添加到主屏幕" 后秒开, 无浏览器边框)
  - `theme_color: #1a1a1a`, `background_color: #ffffff` (启动屏颜色)
  - 2 个快捷方式: "健康评估" (/health-assess) / "运动总览" (/summary)
  - `icons` 复用现有 favicon.png (192/512)
- **`public/sw.js`** — Service Worker (v2.3.0 缓存策略)
  - 静态资源 (JS/CSS/SVG/images): **stale-while-revalidate** (秒开 + 后台静默更新)
  - JSON 数据 (activities/health_stats/training_advice/load): **cache-first + 后台刷新**
  - `/api/*` (LLM 调用): **network-only** (避免 cache 死导致 AI 建议过期)
  - 离线 fallback: JSON 数据用本地 cache, 其他返 503
  - 缓存版本 `sports-fair-v2.3.0` 升级时自动清理旧 cache
- **`index.html`** — PWA meta 全套
  - `link rel="manifest"` / `apple-touch-icon` / `apple-mobile-web-app-capable`
  - `theme-color` / `description` / 中文 title
- **`src/main.tsx`** — SW 注册 (仅生产环境)

#### Skeleton (骨架屏) 通用组件
- **`src/components/Skeleton/`** — 纯 CSS 脉冲动画, 0 第三方依赖
  - `<Skeleton />` 通用矩形
  - `<SkeletonText lines={3} />` 文本行 (最后一行 70%, 更真实)
  - `<SkeletonCard />` 卡片轮廓 (header + 主指标 + 文本)
  - `<SkeletonRow />` 列表行
  - **自适应主题**: 暗色模式自动切换灰度
  - **`prefers-reduced-motion`**: 用户偏好降低动画时禁用脉冲
- **接入 3 个最卡的位置**:
  1. **`health-assess.tsx` AI 综合建议加载中** — `SkeletonText lines={3}` (替代裸文字 "AI 教练正在分析…")
  2. **`ActivityList`** — 列表 loading 时渲染 N 个卡片骨架 (替代 100vh 居中白屏) + SVG Suspense fallback 替换 "Loading SVG..."
  3. **`RunMap`** — 中国边界数据加载时浮层骨架 (修复了 `isLoadingMapData` 状态之前没人用的 bug)

### 后续
- v2.3.1 计划: Apple HIG Bento Box 训练看板前端卡片 (读 training_load.json + training_advice.json 渲染)
- v2.3.2 计划: 在 sync 源加 cadence 字段, 激活 training_load.json 的 cadence 占位
- v2.4.0 计划: LLM 周报 (等 mimo key 复活, 或换 DeepSeek/智谱 等 OpenAI 兼容接口)
- v2.4.1 计划: SVGO CI 步骤 (asset/grid.svg 等 SVG 极限压缩 30-50%)

## [2.2.9] - 2026-06-18

### 新增 (训练建议引擎 — rule-based, 0 LLM 依赖)
- **`scripts/training_advice.py`** — 读 `training_load.json` (v2.2.8) → 输出 `training_advice.json` (~2 KB)
  - **5 类规则** (severity 排序: high > medium > low > info):
    1. **ACWR 风险等级** — 5 状态映射: high_risk (>1.5) / caution (1.3-1.5) / sweet_spot (0.8-1.3) / undertraining (<0.8) / unknown
    2. **Z2 占比** — 4 状态: 不足 (<20%) / 偏低 (20-60%) / 合理 (60-80%) / 过多 (>80%)
    3. **Polarized 80/20** — 2 状态: 偏离 (<70%) / 符合 (≥70%)
    4. **数据完整度** — 7d 不足 / 28d 不足 / 90d HR 不足 (按阈值告警)
    5. **综合状态 (overall)** — 最高 severity → overall_status + overall_summary
  - **每条 advice 附 `evidence` 字段** (用户能看 "为什么这么说" 的数据依据)
  - **0 LLM 依赖** (避免 6/16 已踩过的 GHA step 复杂度坑 + API 成本)
  - **纯 stdlib** (跟 training_load.py 一致, 沙箱 pip install 撞墙也跑得动)
- **`run_data_sync.yml`** 新增 `Compute training advice (rule-based)` step
  - 在 `Compute training load` 之后、`Safety check` 之前
  - 守门: JSON 缺字段 / advice_items 数组空 / severity 不在合法集合 → exit 1
  - `cache-dependency-path` 加 `scripts/training_advice.py` (改动时强制跳过 cache)
  - `on.push.paths` 加 `src/static/training_advice.json` (改动触发重 sync)
  - `git add` 列表加 `src/static/training_advice.json` (跟 activities.json / training_load.json 一起 commit)
- **`src/static/training_advice.json`** — 实测输出 (基于 user 6/17 数据)
  - **overall_status: high_risk** (ACWR 1.58 触发)
  - 3 条 advice 排序: high → medium → low
    - **[high] 训练负荷激增（伤病高危）** — ACWR 1.58 > 1.5 警戒线, 建议 1-2 天全休
    - **[medium] Z2 有氧底座可加强** — Z2 占比 25.1%, 建议每周 1-2 次 45-60 分钟纯 Z2
    - **[low] 训练分布符合 polarized** — Z1+Z2 = 75.4%, 符合 80/20 模型
  - 整体摘要: "⚠️ 重点关注: 训练负荷激增（伤病高危）。"

### 后续
- v2.2.10 计划: 在 health-assess 页加训练负荷卡片, 读 training_load.json + training_advice.json 渲染
- v2.2.11 计划: 在 sync 源 (keep_sync / apple_health / gpx_sync) 加 cadence 字段, 激活 training_load.json 的 cadence 占位
- v2.2.12+ 评估: LLM 周报路径 (在 rule-based 跑通 + 验证价值后再决定要不要花 API 钱)

## [2.2.8] - 2026-06-17

### 新增 (训练负荷数据层)
- **`scripts/training_load.py`** — 从 `activities.json` + `health_stats.json` 提炼训练负荷指标
  - **ACWR (7/28 急慢性训练负荷比)** — Gabbett 1998 公式，Banister TRIMP 算法
    - HRmax 来自 `health_stats.top_stats.hr.max_ever` (用户实测, 不用 220-age)
    - HRrest 来自 `health_stats.top_stats.rhr.median` (用户实测中位, 更稳)
    - 阈值: < 0.8 训练不足 / 0.8-1.3 sweet spot / 1.3-1.5 caution / > 1.5 高危
  - **5 区心率分布 (Karvonen HRR)** — Z1 < 60% / Z2 60-70% / Z3 70-80% / Z4 80-90% / Z5 90%+
    - 按 duration_min 时间加权，统计最近 90 天
    - polarized_pct = Z1+Z2 (80/20 polarized training 监控)
  - **cadence 字段占位** — activities.json 无 cadence 字段，等 v2.2.11 在 sync 源里加字段
  - 输出: `src/static/training_load.json` (~1.3 KB)
  - 纯 stdlib，无外部依赖
- **`run_data_sync.yml`** 新增 `Compute training load (ACWR + HR zones)` step
  - 在 `Run sync Keep script` 之后、`Make svg` 之前
  - 守门：JSON 缺字段 / hr_max 不合理 / hr_rest 不合理 → exit 1
  - `cache-dependency-path` 加 `scripts/training_load.py` + `scripts/check_activities_safety.py`
  - `git add` 列表加 `src/static/training_load.json`
  - `on.push.paths` 加 `src/static/training_load.json` (改动触发重 sync)

### 验证 (本地实跑)
- **ACWR 1.58 (high_risk)** — 7d acute 81838 TRIMP / 28d chronic 51924 TRIMP
  - 7d 5 天有数据 / 28d 13 天有数据
  - 触发: 2025 训练稀疏 + 2026 突然高强度 → 慢性基底低 → 急性飙
  - 这正是工具的价值: 7/28 滚动窗口自动识别"训练负荷激增"风险
- **HR 区间分布** (90 天)
  - Z1 50.3% / Z2 25.1% / Z3 21.6% / Z4 0% / Z5 3.0%
  - polarized_pct 75.4% (Z1+Z2, 符合 polarized training 80/20 模型)
  - 32 个活动有 HR 数据

### 后续
- 6/17 03:20 sync run 把 v2.2.7 activities.json 推到 master (675 条 / latest 6/15)
- v2.2.8 是新功能 (数据层新增) — minor bump 更准，但项目用 patch bump 保持低噪，minor 留给 UI 层

## [2.2.7] - 2026-06-16

### 修复 (sync 永远只产 ~116 条 / 历史数据看似在线下丢失)

- **`.gitignore`** 第 33 行原把 `/run_page/data.db` 全部 ignore — GitHub Actions
  checkout 后**根本没有 db 文件**，`keep_sync.py` 起手新建空 db、增量 insert ~100 条
  Keep 数据，`generator.load()` 自然只产 ~116 条 → safety check 79% drop → 阻拦 push
  → sync 永远卡死，6/09 之后线上数据冻在那
- **修法**: 加 `!/run_page/data.db.bootstrap` negate 规则，把"只含 activities 表"的
  精简 db (~112 KB / 584 条) commit 进仓库 → workflow `Restore bootstrap db` step
  在 keep_sync 前 `cp data.db.bootstrap data.db`，让 generator 拿到完整 8 年历史
- 完整 db 138 MB（包含 Apple Health records 表 ~136 MB 的 daily samples）超 GitHub
  100 MB 单文件上限不能直传，但 `DROP TABLE records; VACUUM;` 后只剩 activities 表
  ~112 KB，完美进仓库

### 新增

- **`scripts/refresh_bootstrap_db.py`** — 本地一键工具：`DROP TABLE records; VACUUM;`
  → 输出 `run_page/data.db.bootstrap`，每次本地导新数据后跑一次 + commit + push
- **`run_page/data.db.bootstrap`** (112 KB / 584 activities / 7 sport types) — 仓库新文件

### Workflow 变更

- `.github/workflows/run_data_sync.yml` 加 `Restore bootstrap db` step
  （在 `Run sync Keep script` 之前）：拷贝 + 验 ≥500 条，bootstrap 损坏直接 fail

## [2.2.6] - 2026-06-16

### 修复 (sync 致命崩溃)
- **`run_page/keep_sync.py:91`** — `log.get('stats', {})` 当 `stats` 字段值为 `None` 时返回 `None` 不是 `{}`（Python 默认值只在 key 不存在时生效，key 存在但值 None 时不生效）
  - 改成 `log.get('stats') or {}` 兜住 None
  - 影响：6/16 outdoorWalking + stairClimbing 第一条新记录的 stats 字段是 None → 崩 → 整个 sync exit 1 → push step 跳过 → 6/09–6/15 已经 parse 成功的跑步数据没 commit 到 master
  - 之前没暴露：因为 v2.2.5 之前 `|| true` 把这种崩静默吞了 + 之前没有 outdoorWalking/stairClimbing 类型的 stats=None 数据进来

### 修复 (release 自动化)
- **`.github/workflows/release.yml`** 重写
  - 老版本 push tag 触发后又跑 `mathieudutour/github-tag-action` 自己建一个新 tag → release 用的不是我们 push 的 tag（race condition）
  - 老版本用 `actions/create-release@v1`（已 deprecated 2024+）
  - 新版本：`softprops/action-gh-release@v2`，body 自动从 CHANGELOG.md 抓 `## [X.Y.Z]` 段落

## [2.2.5] - 2026-06-16

### 新增 (数据完整性保护)
- **`scripts/check_activities_safety.py`**: sync workflow pre-commit gate
  - 对比 HEAD vs working tree 的 `src/static/activities.json`，下跌 ≥30% 且 ≥50 条 → exit 1
  - 双阈值（比例 + 绝对值）防止小数据集误判和大数据集漏报
  - 输出年份 diff 报告，定位被冲掉的年份
- **`api/activities-stats.ts`**: 用户自查端点
  - 返回 `{ count, earliestDate, latestDate, byYear, bySport }`
  - 检测年份 gap，给出 `warning` / `hint`

### 修复
- **`run_data_sync.yml` keep_sync 静默吞错** → `pipefail` + 关键字 grep（cookie 失效 / 风控 / 401 / 403 直接红）
  - 根因：6/09 之后 7 天 Keep 一条数据没同步上来，workflow 仍永远绿
- **step-level `needs:` 是无效字段** → 改 step 顺序 + `set -e`，safety check 挂 = job 红 = push 不跑
  - 根因：之前 safety check 失败也照样 push，保护根本没生效
- **`release.yml`** 重写
  - 老版本 push tag 后又跑 `mathieudutour/github-tag-action` 自己建一个新 tag，结果 release 用的不是我们 push 的 tag
  - 老版本用了 deprecated 的 `actions/create-release@v1`
  - 新版本：push `v*` tag → 直接用这个 tag 用 `softprops/action-gh-release@v2` 建 release，body 自动从 CHANGELOG.md 抓对应版本段

### 数据
- `src/static/activities.json` 从 db regen，562 条 / 8 年（2019-2026）/ 6 类运动（Run 452 / RopeSkipping 37 / StairStepper 33 / Walk 29 / Ride 7 / Hiking 4）

## [2.2.0] - 2026-06-13

### 新增 (按用户 6/11 决策: 接入 LLM 替换静态 AI 建议)
- **Vercel Function** `api/assess-ai.ts`: Edge runtime, 调小米 MiMo (`api.xiaomimimo.com`)
  - 10s 超时 + 60s CDN cache 兜底
  - 失败降级到 `bundle.overall` 静态建议
  - Key 从 `MIMO_API_KEY` 环境变量读，代码不入完整 key
  - 模型可配: `MIMO_MODEL` (默认 `mimo-v2-flash`)
- **健康评估页** (`/health-assess`) 加 LLM 个性化建议区
  - 4 状态: idle / loading(脉冲点) / ok(显示 AI 建议+模型徽章) / error(降级静态+错误原因)
  - 切换 7/30 天窗口自动重新拉 AI 建议
  - 加载中不阻塞页面, 静态数据先用, AI 覆盖整体建议
- **前端 wrapper** `fetchAIGuidance()` 12s 超时 + 取消保护
- **UI**:
  - 🤖 AI 个性化建议 标题 + 模型名徽章 (紫渐变)
  - 加载中脉冲点动画
  - 降级时显示 "(AI 建议暂不可用...)" 灰色小字
- **依赖**: `@vercel/node` (devDep)

### 待用户配置
- Vercel dashboard → Project → Settings → Environment Variables 加 `MIMO_API_KEY`

## [2.2.1] - 2026-06-13

### 新增 (按用户 6/13 反馈: "api 到时候可以更换")
- **LLM Provider 抽象层** `api/providers/llm.ts`
  - 三家实现: **mimo** (默认, 小米 MiMo) / **openai** (gpt-4o-mini 等) / **anthropic** (claude-haiku 等)
  - 切换只改环境变量 `LLM_PROVIDER=openai` + 配对应 `OPENAI_API_KEY`
  - 加新 provider = 加 1 个 factory 函数 + 登记 `PROVIDERS`, handler 不动
- **前端 Provider 切换器** (健康评估页)
  - 三个 pill 按钮: MiMo / OpenAI / Anthropic
  - 切换自动重拉, 徽章显示 "Provider · model"
  - 前端传 `provider` 字段, 后端尊重请求 (fallback 到 env LLM_PROVIDER)
- **Anthropic 适配**: 处理 Messages API 与 OpenAI Chat Completions 的格式差
  (system 单独字段, `x-api-key` header, usage 字段 rename)

### 重构
- `api/assess-ai.ts` 从直接调 MiMo 改为走 `buildProvider()` 工厂
- `fetchAIGuidance()` 加可选 `options.provider` 参数

### 配置示例 (Vercel env)
```
LLM_PROVIDER=mimo
MIMO_API_KEY=sk-...

# 或换 OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# 或换 Anthropic
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

## [2.2.2] - 2026-06-13

### 新增 (可观察性 + 安全加固)
- **`/api/health-check` GET 端点**: 用户自查 LLM provider 配置状态
  - 返回 `activeProvider` / `activeReady` / `providers[]` 状态表
  - 不暴露 key 内容, 只暴露 hasKey 布尔
  - 失败时给 hint: "Active provider mimo missing MIMO_API_KEY"
- **错误响应加 `requestId` + `hint` 字段** (assess-ai.ts)
  - 每次请求生成 UUID, 通过响应头 `X-Request-Id` 和 body 字段返回
  - 失败时给用户可读 hint, 引导到 health-check 端点
  - 服务端 console.error 也带 requestId, 方便 dashboard log 关联
- **前端错误展示升级** (health-assess.tsx)
  - 显示短 requestId (前 8 位), 用户可贴给开发
  - 显示服务端 hint
  - "查看 AI 配置状态 →" 链接到 /api/health-check
- **Prompt injection 防御** (assess-ai.ts)
  - sanitize() 函数: 字段截断 200 字符 + 过滤 `ignore previous` / `system:` 等敏感 pattern
  - cards 数组限制最多 10 张
  - trainingLoadTrend 限制最多 30 个, 非数字替换为 0
  - 单用户应用下主要是防恶意 prompt 浪费 token, 不防 data exfil
- **README LLM 配置章节**: 完整 env 变量表 + 3 家 provider 注册链接 + 加新 provider 步骤



## [2.2.4] - 2026-06-13

### 新增 (health-check UI 化 + 测试覆盖加深)
- **`AIDiagnosticsPanel` 折叠式组件** (`src/components/HealthAssessment/`)
  - 默认折叠, 点击展开
  - `autoOpenOnError={true}` 时 AI 错误自动展开 (用户场景优先)
  - 表格化展示 3 家 provider 状态 (name / envKeyName / hasKey / model)
  - 当前激活 provider 高亮, hint 黄色 banner
  - 失败时内联重试按钮 (5s 超时)
- **`healthCheckClient.ts`**: 客户端 health-check fetcher (5s 超时)
- **vitest 配置升级**
  - include 路径纳入 `api/__tests__/**`
  - `environmentMatchGlobs` 让 .tsx 组件测试走 happy-dom
  - 新增 `vitest.setup.ts` 加载 jest-dom matchers
- **测试覆盖** (新 3 个测试文件, 共 ~22 cases)
  - `api/__tests__/sanitize.test.ts`: 字段截断/敏感 pattern/混合场景
  - `api/__tests__/e2e.test.ts`: 8 cases 模拟前端 → /api/assess-ai → provider 完整路径
  - `src/components/HealthAssessment/__tests__/AIDiagnosticsPanel.test.tsx`: 7 cases 组件行为
- **devDep 装**: @testing-library/react / @testing-library/jest-dom / happy-dom

### 改 UX
- 健康评估页错误时, health-check 链接替换为组件嵌入 (直接看到 provider 状态)
- 错误文案微调: "请展开上方 'AI 配置诊断' 排查"

## [2.2.3] - 2026-06-13

### 新增 (前端韧性 + UX 优化)
- **localStorage 24h 缓存** (`fetchAIGuidanceWithCache`)
  - key 维度: `windowDays_provider_bundleHash`, hash 基于 cards key/main/severity
  - 同 bundle 同 provider 24h 内复用, 节省 LLM 费用
  - 失败响应不写 cache (避免错误响应被反复用)
  - 过期自动失效
- **Provider 偏好持久化** (`loadProviderPref` / `saveProviderPref`)
  - 用户上次选的 provider, 下次访问自动恢复
  - localStorage 污染 (非法值) → fallback mimo
- **AI 调用自动重试** (5xx/网络错时 1 次)
  - 200 空内容 / 4xx 客户端错 → 不重试
  - 重试间隔 800ms, 避免打爆 provider
  - 错误分类细化: `HTTP 4xx/5xx` / `Network: ...` / `Abort: ...`
- **空 aiGuidance 防御** (后端返回 200 但空)
  - 自动归类为 error, 触发降级到静态建议
  - 错误字段自动补默认值
- **空数据兜底** (前端 edge case)
  - 检测到 bundle.cards 全部 N/A → 显示黄色 banner, 引导用户录入数据
  - 不浪费一次 LLM 调用
- **缓存指示器**: AI 徽章右侧加 "📦cached" 标记
- **空白行过滤**: 渲染 AI 建议时 `.filter(l => l.trim())`

### 测试
- 新增 `src/utils/__tests__/llmCache.test.ts` (8 cases)
  - fetchAIGuidance: 重试/空/网络错/4xx 不重试
  - loadProviderPref/saveProviderPref: 双向/污染 fallback
  - fetchAIGuidanceWithCache: miss/hit/失败不缓存/provider 隔离

## [2.1.13] - 2026-06-12

### 新增 (按用户强烈反馈：标准 GitHub 流程)
- **README.md** 更新：v2.1.12 + Releases 链接 + Vercel 徽章 + Features 列表 + 文档导航
- **CONTRIBUTING.md** 完整重写：开发指南 + Conventional Commits + PR 流程（之前只有 16B 占位）
- **CODE_OF_CONDUCT.md** 新增：Contributor Covenant 2.1 完整版
- **SECURITY.md** 新增：漏洞报告流程 + 支持版本表
- **.github/ISSUE_TEMPLATE/bug_report.md** 新增
- **.github/ISSUE_TEMPLATE/feature_request.md** 新增
- **.github/PULL_REQUEST_TEMPLATE.md** 新增（含 Version Bump checklist）
- **docs/VERSION_PROCESS.md** 新增（公开版，PROJECT_NOTES.md 公开部分拆出来）
- **.github/workflows/release.yml** trigger 改为 `push: tags: ['v*']`（让 tag push 自动 create release）

### 流程改进
- 修根因：v2.1.1 之后 release 缺失是因为 workflow trigger 是 `workflow_dispatch`（手动），没人跑
- 解法：tag push 自动 create release
- 向后兼容：保留 `workflow_dispatch` 入口

## [2.1.12] - 2026-06-12

### 新增 (按用户强烈反馈：release 自动化 + 一次性回填)
- **scripts/release.sh** 一键 bump + commit + tag + push + create release（用 curl + GitHub API，不依赖 gh CLI）
- **scripts/backfill_releases.sh** 一次性回填历史 release entry（v2.1.2-2.1.11 共 10 个）
- **PROJECT_NOTES.md** §版本号流程升级为 5 必做步（含 create release 必做）
- **scripts/bump_version.sh** 标"已废弃"（新功能用 release.sh）

### 用法
```bash
# 平时 bump
GITHUB_TOKEN=*** ./scripts/release.sh patch

# 回填历史 release（一次性）
GITHUB_TOKEN=*** ./scripts/backfill_releases.sh v2.1.2 v2.1.3 v2.1.4 v2.1.5 v2.1.6 v2.1.7 v2.1.8 v2.1.9 v2.1.10 v2.1.11
```

## [2.1.11] - 2026-06-12

### 修复 (色带塌陷根因 + 升级 sub)
- **AssessmentCard.tsx** 色带 `flexGrow + flexBasis: 0` 浏览器渲染塌陷 → 改用 `width: ${pct}%` 百分比（v2.1.10 修复失败根因）
- **AssessmentCard.tsx** 色带标签同步改 width 百分比
- **AssessmentCard.tsx** 位置圆点改用 inline style（position absolute + left % + 14px 圆点）—— 摆脱 .acwr-position-* CSS 依赖
- **healthAssessment.ts** sub 升级为急性/慢性双显示：`急性 X TRIMP · 慢性 Y TRIMP/天`（替代原"近 7 天 X · 4 周均 Y"）
- ACWR 色带比例：紫 0-0.8 (40%) / 绿 0.8-1.3 (25%) / 橙 1.3-1.5 (10%) / 蓝 1.5+ (25%)

## [2.1.10] - 2026-06-12

### 修复 (按用户截图反馈)
- **AssessmentCard.tsx** ACWR 色带 `flex: 0.5` 不合法简写 → `flexGrow: span, flexBasis: 0`（之前色带塌陷 0 宽，截图里看不到）
- **AssessmentCard.tsx** ACWR 标签同步修复 `flex` 简写问题（标签挤成一行 → 按比例分布）
- ACWR 色带比例：紫 0-0.8 (40%) / 绿 0.8-1.3 (25%) / 橙 1.3-1.5 (10%) / 蓝 1.5+ (25%)

## [2.1.9] - 2026-06-12

### 新增 (UI 重构：按 Gemini 设计稿)
- **assessTrainingLoad** 改用 Banister TRIMP 替代单纯时长，TRIMP 优先用 average_heartrate 算强度权重，无则降级为 duration × 1.0
- **assessTrainingLoad** 返回 { card, trend }，trend 数组保留供 v2.2.0 进一步使用
- **AssessmentBundle** 新增 `trainingLoadTrend?: number[]` 字段
- **AssessmentCard** 训练负荷卡片显示 **ACWR 区间色带**（4 段：恢复期紫/最佳提升绿/过度训练橙/高危预警蓝）+ 位置圆点 + 状态评级标签 + 静态 AI 教练建议
- **acwrZone()** 函数：根据 ACWR ratio 返回当前区间 + 业务级建议（维持训练/减量 20%/减量 50% 等）
- **ACWR 风险区间色带** 全新 CSS（色带 + 标签 + 位置圆点 + 状态标签）
- 推翻前一版"7 天柱状图"设计（信息量低），改用 Gemini 设计稿的"区间色带 + 业务评级"方案

### 算法细节
- TRIMP 公式: T = duration_min × 0.64 × exp(1.92 × intensity)
- intensity = clamp((avgHR - hrRest) / (hrMax - hrRest), 0, 1)
- hrMax 近似 = top_stats.hr.max_ever (fallback 190)
- hrRest 近似 = top_stats.rhr.median (fallback 60)
- ACWR = acute7d / chronic28d，chronic = 28 天日均 × 7

### 已知局限
- TRIMP 强度依赖 average_heartrate，活动缺此字段时降级为 duration×1.0（保守）
- hrMax / hrRest 是基于历史估算，不是个人精确值（理想需 Apple Watch 用户输入最大心率）

## [2.1.8] - 2026-06-12

### 修复
- **scripts/bump_version.sh** 加 `-y/--yes` 自动模式：自动 git add + commit + tag + push
- **scripts/bump_version.sh** 注释更新：明确说明"没 tag = GitHub Releases 看不到版本"
- **scripts/bump_version.sh** 改后输出重写：手工模式只列 4 必做步 + 提示用 `-y` 自动化
- **PROJECT_NOTES.md** §版本号流程 第 4 步改为 "git tag + push" 必做（原写"GitHub UI 发 release"是可选的）
- **PROJECT_NOTES.md** §版本号流程 加 "历史教训"段：v2.1.1-2.1.7 漏 tag 教训

### 回填
- **git tag v2.1.2 / v2.1.3 / v2.1.4 / v2.1.5 / v2.1.6 / v2.1.7** 6 个 tag 全部补打 + push（不回填 release，按用户决策先修根因，下次 bump 自动）
- **PROJECT_NOTES.md** §版本号流程注释明确："公开文档但本地不入仓"（避免误暴露异常数据现状）

## [2.1.7] - 2026-06-12

### 修复
- **health_stats.py** HR / RHR / HRV 收集时过滤异常值（HR 30-220 / RHR 30-120 / HRV 10-200）
- **health_stats.py** 睡眠过滤改为 1-14h（原本 16h 上限过松，午睡 < 1h 也过滤）
- **health_stats.py** `compute_top_stats` 收集时同步加合理性过滤
- **health.tsx** `safeByYear` useMemo 客户端异常值防御（双保险，根因在 health_stats.py 需重跑脚本）
- **CHANGELOG** 标记 2.1.7 需手动重跑 `python3 run_page/health_stats.py` 才能让 health_stats.json 实际生效

## [2.1.6] - 2026-06-12

### 修复
- **assessHRV** 支持 7/30 天窗口 + 文案明确标注"全量均值"+ 提示开启 Apple Watch HRV 日级测量
- **assessRHR** 过滤异常值（RHR < 30 数据缺失 / > 120 异常高）
- **assessSleep** 过滤异常值（< 1h 手环未戴 / > 14h 未摘表）
- **assessSteps** 过滤负值（防御性）
- **AssessmentCard** advice 区块显式 `color: #1a1a1a` + `font-weight: 500` 修复亮底深字对比度
- **style.module.css** `.switchBtn.active` 加 `font-weight: 600` + `box-shadow` 增强 7/30 切换高亮

## [2.1.5] - 2026-06-12

### 新增 (Minor)
- **健康评估建议模块 UI 完整** (路由 `/health-assess`)
  - `src/components/HealthAssessment/AssessmentCard.tsx` - 单卡片（5 个共用）
  - `src/components/HealthAssessment/SeverityBadge.tsx` - 严重程度徽章（良好/关注/警告/紧急）
  - `src/pages/health-assess.tsx` - 路由页（含 7 天/30 天切换）
  - `src/pages/style.module.css` - 评估页专用样式
  - `src/components/Header/index.tsx` - 顶部导航新增 🩺 评估建议 链接（同时加 📊 旅程总览、💚 健康分析）
  - `src/main.tsx` - 路由注册
- **vitest 测试框架引入**
  - `vitest.config.ts` - vitest + tsconfigPaths 配置
  - `src/utils/__tests__/healthAssessment.test.ts` - 7 个 describe 块
  - `src/utils/__tests__/activitiesDisplay.test.ts` (v2.1.4 已有)
  - `package.json` scripts: `test` / `test:watch` / `ci` 链路加 `test` 步骤
  - `package.json` devDeps: `vitest@^3.2.4`
- **文档 `HEALTH_ASSESSMENT.md`** - 用户视角 + 算法说明 + 数据局限 + 4 段医学/运动科学依据

### 算法依据
- RHR：AHA 静息心率分级（优秀 < 60 / 良好 60-64 / 一般 65-69 / 偏高 70-79）
- HRV：Apple Heart Rate Study + Kubios 公开数据（高 > 50ms / 中 30-50ms / 低 < 30ms）
- 睡眠：NSF 建议（7-9h 充足 / 6-7h 略少 / < 6h 不足）
- 步数：WHO + 主流 App 共识（10000+ 优秀 / 7000-10000 良好 / 4000-7000 偏低 / < 4000 久坐）
- 训练负荷（ACWR）：acute:chronic workload ratio 公开论文（0.8-1.3 安全 / 1.3-1.5 警戒 / > 1.5 危险）

## [2.1.4] - 2026-06-12

### 新增 (Minor)
- **运动类型显示维度重构**：根据运动语义，UI 不再统一显示距离
  - `distance` (位移)：Run / Hiking / Walk / Ride / Swim / Elliptical / Skiing / Surfing / Wheelchair
  - `count` (计数)：StairStepper / RopeSkipping / Boxing / Soccer / Basketball / Tennis / Golf
  - `duration` (时长)：Strength / Core / Yoga / Workout
  - 22 个 sportCompat 桶加 `displayMetric` + `unitLabel` 字段
- **新增 `src/utils/activitiesDisplay.ts`**：
  - `getDisplayMetric(activity)` 返回 `{label, value, subLabel, subValue, anomaly}`
  - `aggregateDisplayMetric(activities[])` 批量聚合（sidebar / 主页用）
  - 防御性异常检测：0 距离 + 长时长 / Run 速度 < 1 km/h / Run 速度 > 30 km/h
- **新增 `src/utils/healthAssessment.ts`** (5 个评估函数 + 类型) — UI 留待 2.1.5
- **新增单元测试** `src/utils/__tests__/activitiesDisplay.test.ts` (vitest 框架，下版本引入)
- **异常数据视觉提示**：`RunRow.tsx` 加 `warning` / `error` 样式（黄/红左边框 + tooltip）

### 修复 (Patch)
- **异常数据 filter 加强** `run_page/generator/__init__.py`：
  - Run 速度 < 1 km/h 持续 > 1h 跳过（卡死/误触发）
  - Run 速度 > 30 km/h 持续 > 5min 跳过（接近短跑极限但持续不可能是跑步）
  - 任意 type 0 距离 + 长时长（> 1h）跳过（数据损坏）
  - 防御性 `_moving_time_to_seconds()` helper 支持 timedelta/str/无值
  - 每次跑加 skipped 计数日志

### UI 改动
- `RunTable/RunRow.tsx`：第二列从 "距离" 改为 `display.value`（距离/次数/时长自适应）
- `RunTable/style.module.css`：加 `.warning` / `.error` 样式
- `sportCompat.ts`：22 桶加 `displayMetric` + `unitLabel`

## [2.1.3] - 2026-06-12

### 修复 (Patch)
- **异常数据修复**：`run_page/generator/__init__.py` filter 强化
  - 防御 `distance IS NULL` 行漏过滤（`and_(distance > 0.1, distance.isnot(None))`）
  - 0 距离 Run 二次过滤（误触发 / Apple Watch 半路掉线）
  - 0 距离 Workout 保留不删（Keep API 漏 GPX，用户决策：丢数据更糟）
- **离线重生工具**：新增 `scripts/regen_activities_json.py`
  - 绕开 keep API 凭证依赖，本地可重生活动 JSON
  - 跟 `generator.load()` 同样 filter + streak 计算逻辑
  - 用途：本地调试 / yml runner cache miss / db 已更新但 json 未更新时手动同步

### 文档
- `.gitignore` 加 `src/static/activities.json.bak-*` 排除（regen 脚本会自动备份）

### 统计
- db: 584 条 / 7 年份 / 6 类型 (Run 455, RopeSkipping 37, StairStepper 33, Walk 29, Workout 19, Ride 7, Hiking 4)
- json: 562 条 / 7 年份 / 6 类型（filter 22 条：3 Run 0 距离 + 19 Workout 0 距离）

## [2.1.2] - 2026-06-12

### 修复 (Patch)
- T1.1: `YearStat` 组件按 sportKey 过滤（之前用 useActivities 全集，sidebar Total Journey 错显示 562 而非 452 Run）
- T1.3: `PeriodStat` 组件按 sportKey 过滤（之前跑步详情页时段分布混入爬楼/跳绳/步行/骑行/徒步条）

### 新增
- `useSportActivities(sportKey)` hook
- `getRunPeriodBySport(sportKey)` 函数
- 4 组件加 `sportKey` prop（PeriodStat / YearStat / LocationStat / index.tsx）
- 主页 `<LocationStat sportKey="Run" />` 显式传参

## [2.1.1] - 2026-03-04

### 发布
- Sports Fair 品牌重命名（fork of yihong0618/running_page）
- Vercel 部署优化
- 性能优化（Apple HIG 缓动曲线）
- 升级 vite-tsconfig-paths
- dependabot 关闭
- Vercel buildCommand 修复

[未发布]: https://github.com/wuleiyuan/sports-fair/compare/v2.1.3...HEAD
[2.1.3]: https://github.com/wuleiyuan/sports-fair/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/wuleiyuan/sports-fair/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/wuleiyuan/sports-fair/releases/tag/v2.1.1
