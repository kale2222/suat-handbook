#!/bin/bash
# 用法: ./scripts/release.sh v0.1 "部署到 Cloudflare Pages"
# 效果: 更新 CHANGELOG.md → commit → 打 tag → push

set -e

VERSION=$1
DESCRIPTION=$2
DATE=$(date +%Y-%m-%d)

if [ -z "$VERSION" ] || [ -z "$DESCRIPTION" ]; then
  echo "用法: ./scripts/release.sh <版本号> <描述>"
  echo "示例: ./scripts/release.sh v0.1 '部署到 Cloudflare Pages'"
  exit 1
fi

# 在 CHANGELOG.md 顶部插入新版本条目
ENTRY="## $VERSION - $DATE\n\n$DESCRIPTION\n"
TMPFILE=$(mktemp)
{ echo -e "$ENTRY"; tail -n +2 CHANGELOG.md; } > "$TMPFILE"
# 保留第一行标题
{ head -n 1 CHANGELOG.md; echo ""; echo -e "$ENTRY"; tail -n +3 CHANGELOG.md; } > "$TMPFILE"
mv "$TMPFILE" CHANGELOG.md

git add CHANGELOG.md
git commit -m "release: $VERSION - $DESCRIPTION"
git tag -a "$VERSION" -m "$DESCRIPTION"
git push
git push --tags

echo ""
echo "✓ $VERSION 已发布"
