#!/usr/bin/env bash
# Builds the plugin ZIP: the asset of the GitHub Release behind the stable link
# https://github.com/draftboardco/draftboard-skill/releases/latest/download/draftboard-chatgpt-plugin.zip
# and the file uploaded to the OpenAI plugin portal (platform.openai.com/plugins).
# .github/workflows/release.yml runs it when a v<version> tag is pushed.
#
# The archive carries exactly what the portal reads — the manifest, the MCP
# config, the skill and the assets it references — and nothing else: no
# README (repo-facing copy), no CI, no Claude marketplace file. The manifest
# check runs first, so a field the portal would reject never gets zipped, and
# the release check refuses uncommitted files or an already-published version.
#
#   --dry-run   build without the release check, to inspect the archive locally
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/check-docs.mjs
if [[ "${1:-}" != "--dry-run" ]]; then
  node scripts/check-openai-release.mjs --release
fi

VERSION="$(node -p "require('./plugin.json').version")"
OUT_DIR="$ROOT/dist"
# The file name is constant: it is the asset name the stable link points at.
OUT="$OUT_DIR/v$VERSION/draftboard-chatgpt-plugin.zip"

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
zip -qr -X "$OUT" plugin.json mcp.json LICENSE skills assets -x '*.DS_Store'

echo "Built $OUT"
unzip -l "$OUT"
