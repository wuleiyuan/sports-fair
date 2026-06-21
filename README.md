<p align="center">
  <img src="screenshots/screenshot-home.png" alt="Sports Fair" width="720">
</p>

<p align="center">
  <strong>Sports Fair — 运动集市</strong><br>
  多数据源运动可视化仪表盘 · Apple Health / Strava / Garmin / Keep / GPX
</p>

<p align="center">
  <a href="https://sports-fair.vercel.app"><img src="https://img.shields.io/badge/Live-Demo-FF8800?style=flat-square" alt="Live Demo"></a>
  <a href="https://github.com/wuleiyuan/sports-fair/blob/master/LICENSE"><img src="https://img.shields.io/github/license/wuleiyuan/sports-fair?style=flat-square&color=FF8800" alt="License"></a>
  <a href="https://github.com/wuleiyuan/sports-fair/releases"><img src="https://img.shields.io/github/v/release/wuleiyuan/sports-fair?style=flat-square&color=FF8800" alt="Release"></a>
  <a href="https://github.com/wuleiyuan/sports-fair/blob/master/CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-Welcome-FF8800?style=flat-square" alt="PRs Welcome"></a>
  <a href="https://github.com/yihong0618/running_page"><img src="https://img.shields.io/badge/Forked%20from-running__page-1a1a1a?style=flat-square" alt="Forked from running_page"></a>
</p>

---

### 🚀 One-Click Deploy

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwuleiyuan%2Fsports-fair)

---

## Features

| | |
|---|---|
| 🏃 **Multi-source** | Apple HealthKit / Strava / Garmin / Keep / Nike / GPX / TCX / FIT |
| 🗺️ **MapLibre** | Fully open-source map, **no API token needed** |
| 📊 **Health Assessment** | 5-dimension evaluation — RHR / HRV / Sleep / Steps / Training Load |
| 📈 **Training Load** | ACWR (Gabbett) + TSB (Coggan) + HR 5-Zone (Karvonen) |
| 🧠 **AI Coach** | LLM-powered personalized advice (MiMo / OpenAI / Anthropic) |
| 🎨 **Orange-Black UI** | Dark theme with orange accents, bento grid layout |
| 📱 **PWA** | Install as app on iOS/Android |
| 🎯 **Sport Types** | Running, cycling, swimming, skipping, stair climbing, and more |

## Pages

| Page | Description |
|------|-------------|
| `/` | Activity map & timeline — browse all activities on MapLibre |
| `/stats` | Year-by-year stats — distance, duration, elevation, count |
| `/health` | Health metrics from Apple HealthKit |
| `/health-assess` | AI-powered health assessment with 5-dimension evaluation |
| `/training` | ACWR / TSB / HR zone analysis |
| `/activities` | Full activity list with filters |
| `/recents` | Recent activities summary |

<p align="center">
  <img src="screenshots/screenshot-training.png" alt="Training Page" width="720">
</p>

## Quick Start

1. **[Fork](https://github.com/wuleiyuan/sports-fair/fork) this repo**
2. **Import to Vercel** (click button above) — zero config
3. **Sync data** via GitHub Actions or upload GPX/TCX/FIT files

> Full docs: [CHANGELOG](CHANGELOG.md) · [CONTRIBUTING](CONTRIBUTING.md) · [Version Process](docs/VERSION_PROCESS.md)

## Tech Stack

`TypeScript` · `React` · `Vite` · `Tailwind CSS` · `MapLibre GL` · `PWA` · `Python` · `GitHub Actions` · `Vercel`

## Upstream

This project is built on the foundation of [yihong0618/running_page](https://github.com/yihong0618/running_page) — an excellent open-source running data dashboard with over 10k stars. We forked and re-architected it with a completely redesigned UI and expanded feature scope.

**What we inherited from the upstream:**
- Python data sync infrastructure (Garmin / Strava / Nike / Keep adapters)
- GitHub Actions CI/CD for automated data fetching
- Core data models & database schema
- Original map & timeline rendering logic
- GPX / TCX / FIT import pipeline

We are deeply grateful to [@yihong0618](https://github.com/yihong0618) and all [running_page contributors](https://github.com/yihong0618/running_page/graphs/contributors) for making this possible. If you find this project useful, consider giving a [star to the upstream](https://github.com/yihong0618/running_page) as well.

## License

[MIT](LICENSE)
