#!/usr/bin/env bash
# Vercel Ignored Build Step (fallback)
# 用途：仅当 src/ 或 vercel.json/package.json/wf 变更时构建
#
# ⚠️  2026-09-29 关键修复：
# 之前 inline 命令 (见下方) 没显式列 data JSON, 实际它通过 `-- src/` 已经
# 能匹配 src/static/activities.json — 理论 Vercel 会 rebuild. 但用户报告
# Vercel 实际跳过了 cron 推上来的 data commit (434c16f), 推测 Vercel UI
# 配置的是更严格的过滤 (e.g. `^src/(components|pages|utils|hooks|lib|styles)`)
# 把 src/static/ 排除在外了。
#
# ✅ 推荐：把下方 inline 命令升级为显式包含 data JSON, 避免歧义:
#   if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then exit 0; fi
#   if git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- src/ package.json vercel.json .vercelignore src/static/activities.json src/static/training_advice.json src/static/training_load.json; then
#     echo "⏭️  No source changes, skip build"; exit 1;
#   fi
#
# 注意：Vercel UI 里的 Ignored Build Step 优先于这个脚本
# 在 Vercel Project Settings → Git → Ignored Build Step 里填上面这段

set -e

if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ]; then
  echo "ℹ️  No previous SHA (initial deploy), proceed with build"
  exit 0
fi

echo "=== Vercel Ignored Build Step (script) ==="
echo "Previous: $VERCEL_GIT_PREVIOUS_SHA"
echo "Current:  $VERCEL_GIT_COMMIT_SHA"

CHANGED=$(git diff --name-only "$VERCEL_GIT_PREVIOUS_SHA" HEAD 2>/dev/null || echo "")

if echo "$CHANGED" | grep -qE '^(src/|package\.json|vercel\.json|\.vercelignore|tailwind\.config|vite\.config|tsconfig\.json)'; then
  echo "✅ Source/config changed, proceed with build"
  echo "Changed files:"
  echo "$CHANGED" | grep -E '^(src/|package\.json|vercel\.json|\.vercelignore|tailwind\.config|vite\.config|tsconfig\.json)' || true
  exit 0
else
  echo "⏭️  No source changes, skip build"
  echo "Changed files (data only or empty):"
  echo "$CHANGED" | head -20
  exit 1
fi
