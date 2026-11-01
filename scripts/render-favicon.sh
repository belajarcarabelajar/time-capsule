#!/usr/bin/env bash
# Renders the hourglass favicon (same emoji as the old data-URI SVG icon) into
# Google-eligible raster files in apps/web/public. Needs ImageMagick 7 with pango
# and the Noto Color Emoji font. Output is committed; rerun only to change the icon.
set -euo pipefail

public="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../apps/web/public" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT

# Glyph trimmed, then centered on a square canvas at 90% height (the old SVG used font-size 90 in a 100 viewBox).
magick -background none -size 1024x1024 -gravity center \
  pango:'<span font="Noto Color Emoji 600">⏳</span>' -trim +repage \
  -resize 922x922 -gravity center -extent 1024x1024 "$work/master.png"

magick "$work/master.png" -resize 512x512 -depth 8 -strip "$public/logo-512.png"
magick "$work/master.png" -resize 192x192 -depth 8 -strip "$public/icon-192.png"
magick "$work/master.png" -resize 180x180 -background white -flatten -depth 8 -strip "$public/apple-touch-icon.png"
magick "$work/master.png" -define icon:auto-resize=48,32,16 "$public/favicon.ico"
