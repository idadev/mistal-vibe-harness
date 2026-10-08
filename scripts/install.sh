#!/usr/bin/env sh
# Usage:
#   scripts/install.sh <target-project> [--link]   -> <target-project>/.vibe/
#   scripts/install.sh --global [--link]           -> ${VIBE_HOME:-~/.vibe}
set -eu
SRC="$(cd "$(dirname "$0")/.." && pwd)"
if [ "${1:-}" = "--global" ]; then
  DEST_ROOT="${VIBE_HOME:-$HOME/.vibe}"; MODE="${2:-}"
else
  TARGET="${1:?usage: install.sh <target-project>|--global [--link]}"
  DEST_ROOT="$TARGET/.vibe"; MODE="${2:-}"
fi
for d in skills agents prompts; do
  mkdir -p "$DEST_ROOT/$d"
  for item in "$SRC/$d"/*; do
    [ -e "$item" ] || continue
    dest="$DEST_ROOT/$d/$(basename "$item")"
    rm -rf "$dest"
    if [ "$MODE" = "--link" ]; then ln -s "$item" "$dest"; else cp -R "$item" "$dest"; fi
  done
done
echo "Installed into $DEST_ROOT"
