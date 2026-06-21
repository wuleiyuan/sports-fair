<p align="center">
  <img src="screenshots/screenshot-home.png" alt="Sports Fair" width="720">
</p>

<p align="center">
  <strong>Sports Fair — 运动集市</strong><br>
  个人运动数据仪表盘 · 整合 Apple Health / Strava / Garmin / Keep · 训练分析 · AI 评估
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/wuleiyuan/sports-fair/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-MIT-FF8800?style=flat-square" alt="许可证"></a>
  <a href="https://github.com/wuleiyuan/sports-fair/releases"><img src="https://img.shields.io/github/v/release/wuleiyuan/sports-fair?style=flat-square&color=FF8800" alt="版本"></a>
  <a href="https://github.com/wuleiyuan/sports-fair/pulls"><img src="https://img.shields.io/badge/欢迎-PR-FF8800?style=flat-square" alt="欢迎 PR"></a>
  <a href="https://github.com/yihong0618/running_page"><img src="https://img.shields.io/badge/Forked%20from-running__page-1a1a1a?style=flat-square" alt="Forked from running_page"></a>
</p>

---

## 这是什么？

**Sports Fair** 是一个开源的个人运动数据仪表盘。它把你 Apple Watch、Garmin、Strava 等设备记录的原始运动数据，变成直观的图表、科学的训练分析和个性化的 AI 健康建议。

<p align="center">
  <img src="screenshots/demo.gif" alt="Sports Fair 演示" width="720">
  <br>
  <em>页面概览：地图轨迹、训练负荷分析、健康评估、逐年统计</em>
</p>

它能回答你关于训练的这些问题：

| 你的问题 | Sports Fair 怎么回答 |
|---------|-------------------|
| 我是不是练得太猛了？ | **ACWR（急慢性负荷比）** — 超过 1.5 说明受伤风险增加 |
| 我现在状态咋样？该休息还是该练？ | **TSB（训练压力平衡）** — 负数说明疲劳，正数说明恢复充分 |
| 我的健康状况在变好吗？ | **五维健康评估** — RHR / HRV / 睡眠 / 步数 / 训练负荷综合评分 |
| 下次训练该注意什么？ | **AI 教练** — 大模型根据你的数据生成个性化建议 |
| 我今年跑了多远？ | **逐年统计** — 距离、时长、爬升、次数一目了然 |

---

## 截图

| 🏠 首页 — 活动地图 & 时间线 | 📈 训练分析 — ACWR / TSB / 心率区间 |
|:---:|:---:|
| <img src="screenshots/screenshot-home.png" alt="首页截图" width="340"> | <img src="screenshots/screenshot-training.png" alt="训练页面截图" width="340"> |

---

## 功能

### 🗺️ 交互式运动地图
基于 **MapLibre** 开源地图引擎，**无需任何 API Token**。支持街景、卫星、地形多种地图风格，浏览所有运动轨迹。

### 📊 五维健康评估
AI 对五个关键健康维度逐一评分，并给出个性化建议：

| 维度 | 衡量什么 |
|------|---------|
| 静息心率 (RHR) | 心血管健康 baseline |
| 心率变异性 (HRV) | 自主神经恢复状态 |
| 睡眠 | 时长与规律性 |
| 日常步数 | 活动量评估 |
| 训练负荷 | 运动强度 & 恢复状态 |

AI 引擎支持 MiMo / OpenAI / Anthropic。

### 📈 训练负荷分析
三种科学验证的指标，帮你量化训练强度和恢复状态：

| 指标 | 全称 | 告诉你什么 |
|------|------|-----------|
| **ACWR** | 急慢性负荷比 (Gabbett) | 训练强度是否增加太快？（理想区间 0.8–1.3） |
| **TSB** | 训练压力平衡 (Coggan) | 现在状态如何？（>+15 恢复充分，<-15 过度训练） |
| **HR Zones** | 心率五区间 (Karvonen) | 每次训练强度分布（Z1 恢复 → Z5 无氧） |

### 🧠 AI 教练
大模型分析你的近期数据，给出可操作的建议 —— 比如调整训练负荷、改善恢复、变换训练类型。

### 🎯 多种运动类型
跑步、骑行、游泳、跳绳、爬楼梯等，每种运动显示对应指标（距离/次数/时长）。

### 🎨 橙黑主题
深色背景 + 橙色强调色，毛玻璃卡片 + bento grid 布局，所有页面风格统一。

### 📱 PWA 支持
可安装为手机应用，离线也可查看缓存内容。

---

## 工作原理

```
你的运动设备 (Apple Watch / Garmin / Strava / 等等)
        │
        ▼
  ┌─────────────────────┐
  │  GitHub Actions      │  ← 每天自动同步
  │  Python 数据同步脚本  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  SQLite 数据库        │  ← 存储在仓库中
  │  (运动记录、健康指标)  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  React 前端           │  ← 部署在 Vercel
  │  (MapLibre 地图、     │
  │   Tailwind 橙黑主题)  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  你的浏览器            │  ← PWA，可安装为应用
  └─────────────────────┘
```

全自动流水线：GitHub Actions 定时拉取数据 → 更新数据库 → 触发 Vercel 重新部署。不需要自己管服务器。

---

## 页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 🏠 首页 | `/` | 活动地图 & 时间线 — MapLibre 浏览所有路线 |
| 📊 统计 | `/stats` | 逐年数据 — 距离、时长、爬升、活动次数 |
| ❤️ 健康 | `/health` | Apple HealthKit 指标 — RHR / HRV / 睡眠 / 步数 |
| 🩺 健康评估 | `/health-assess` | AI 五维健康评分 & 个性化建议 |
| 🏋️ 训练分析 | `/training` | ACWR / TSB / 心率区间趋势图 |
| 📋 活动列表 | `/activities` | 全部活动，支持按类型筛选和搜索 |
| ⏱️ 近期活动 | `/recents` | 最近运动摘要速览 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| **前端** | TypeScript, React, Vite, Tailwind CSS |
| **地图** | MapLibre GL（开源，无需 API Key） |
| **数据同步** | Python |
| **数据库** | SQLite |
| **CI/CD** | GitHub Actions |
| **托管** | Vercel |
| **PWA** | vite-plugin-pwa |
| **AI** | MiMo / OpenAI / Anthropic API（可选） |

---

## 快速开始

### 方案一：一键部署到 Vercel（推荐）

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwuleiyuan%2Fsports-fair)

点击上方按钮，登录 GitHub 授权，Vercel 会自动 fork 并部署。**零配置，一分钟上线。**

### 方案二：本地开发

```bash
git clone https://github.com/wuleiyuan/sports-fair.git
cd sports-fair
pip3 install -r requirements.txt
npm install -g corepack && corepack enable
pnpm install
pnpm develop
```

打开浏览器访问 [http://localhost:5173](http://localhost:5173)。

### 配置数据源

部署后，数据同步通过 **GitHub Actions** 自动运行。目前支持：

> **Garmin** · **Garmin-CN** · **Strava** · **Nike Run Club** · **Keep** · **GPX** · **TCX** · **FIT**

各数据源配置方式详见 [数据同步文档](docs/DATA_SYNC.md)。

---

## 上游项目

本项目基于 [yihong0618/running_page](https://github.com/yihong0618/running_page)（10k+ stars）构建。我们 fork 后重新设计了 UI 并大幅扩展了功能范围。

**继承的部分：**
- Python 数据同步适配器（Garmin / Strava / Nike / Keep）
- GitHub Actions 自动化流水线
- 核心数据模型 & SQLite schema
- 地图 & 时间线渲染
- GPX / TCX / FIT 导入管道

感谢 [@yihong0618](https://github.com/yihong0618) 及所有 [running_page 贡献者](https://github.com/yihong0618/running_page/graphs/contributors)。

---

## 许可证

[MIT](LICENSE)
