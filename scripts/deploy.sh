#!/usr/bin/env bash
# Production deploy that preserves prior _next/static chunks for a grace window.
#
# Background:
#   `next build` wipes `.next` (including `.next/static/chunks`) every time.
#   Browsers viewing pages from a previous build cache HTML that references
#   the old chunk hashes; if those chunks are gone, the page breaks with
#   "Refused to apply style ... text/plain" / ChunkLoadError. This script
#   keeps the previous chunks alongside the new ones for KEEP_DAYS days so
#   stale tabs continue to work.
#
# Where to run:
#   On the production server (Hostinger / wherever .next lives), after
#   pulling the latest commit. Wire it into your deploy step:
#     git pull
#     npm ci
#     npm run db:deploy
#     bash scripts/deploy.sh
#     <restart your Node process — pm2 restart / systemd / Hostinger panel>
#
# Notes:
#   - Idempotent. Safe to re-run.
#   - Old chunks live in $ARCHIVE_DIR (outside .next so `next build` cannot
#     wipe them). They're symlinked or copied back after each build.
#   - Tweak KEEP_DAYS and ARCHIVE_DIR to suit. Defaults are conservative.

set -euo pipefail

# --- Config -------------------------------------------------------------------
APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
ARCHIVE_DIR="${ARCHIVE_DIR:-$APP_DIR/.next-static-archive}"
KEEP_DAYS="${KEEP_DAYS:-7}"

cd "$APP_DIR"

# --- 1. Snapshot the current static dir BEFORE the build wipes it -------------
if [ -d ".next/static" ]; then
  echo "[deploy] snapshotting current .next/static -> $ARCHIVE_DIR"
  mkdir -p "$ARCHIVE_DIR"
  cp -an .next/static/. "$ARCHIVE_DIR/"
fi

# --- 2. Build -----------------------------------------------------------------
echo "[deploy] building"
npm run build

# --- 3. Merge archived chunks into the new build ------------------------------
# `cp -an` = no-clobber + archive; only adds files that don't already exist
# in the new build, so we never overwrite a fresh chunk with a stale one.
if [ -d "$ARCHIVE_DIR" ]; then
  echo "[deploy] restoring archived chunks into new build"
  mkdir -p .next/static
  cp -an "$ARCHIVE_DIR/." .next/static/
fi

# --- 4. Refresh archive with the new build's files ----------------------------
echo "[deploy] refreshing archive with new build's chunks"
mkdir -p "$ARCHIVE_DIR"
cp -an .next/static/. "$ARCHIVE_DIR/"

# Bump mtimes on files currently referenced by this build so the prune step
# below doesn't delete chunks that are still live.
find .next/static -type f -print0 | while IFS= read -r -d '' f; do
  rel="${f#.next/static/}"
  if [ -f "$ARCHIVE_DIR/$rel" ]; then
    touch -c "$ARCHIVE_DIR/$rel"
  fi
done

# --- 5. Prune chunks older than KEEP_DAYS days --------------------------------
echo "[deploy] pruning archive entries older than $KEEP_DAYS days"
find "$ARCHIVE_DIR" -type f -mtime +"$KEEP_DAYS" -delete
find "$ARCHIVE_DIR" -type d -empty -delete 2>/dev/null || true

echo "[deploy] done. Restart your Node process now (e.g. pm2 restart all)."
