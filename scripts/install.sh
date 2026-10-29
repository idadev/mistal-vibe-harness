#!/usr/bin/env sh
# Usage:
#   scripts/install.sh <target-project> [--link] [--agents <types>] [--force]  -> <target-project>/.vibe/
#   scripts/install.sh --global [--link]                                       -> ${VIBE_HOME:-~/.vibe}
# --agents compose <target-project>/AGENTS.md from templates/ (types: api-spec,api-impl,kafka,database,migration).
# --force overwrites an existing AGENTS.md.
set -eu
SRC="$(cd "$(dirname "$0")/.." && pwd)"
TARGET=""; GLOBAL=0; MODE=""; AGENTS=""; FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --global) GLOBAL=1 ;;
    --link) MODE="--link" ;;
    --force) FORCE=1 ;;
    --agents) shift; AGENTS="${1:?--agents needs a comma-separated list of types}" ;;
    -*) echo "unknown option: $1" >&2; exit 1 ;;
    *) TARGET="$1" ;;
  esac
  shift
done
if [ "$GLOBAL" = 1 ]; then
  [ -z "$TARGET" ] || { echo "use either <target-project> or --global" >&2; exit 1; }
  [ -z "$AGENTS" ] || { echo "--agents needs a <target-project> (AGENTS.md lives at the project root)" >&2; exit 1; }
  DEST_ROOT="${VIBE_HOME:-$HOME/.vibe}"
else
  [ -n "$TARGET" ] || { echo "usage: install.sh <target-project>|--global [--link] [--agents <types>] [--force]" >&2; exit 1; }
  DEST_ROOT="$TARGET/.vibe"
fi

# Validate --agents before touching anything.
if [ -n "$AGENTS" ]; then
  for t in $(echo "$AGENTS" | tr ',' ' '); do
    case "$t" in api-spec|api-impl|kafka|database|migration) ;; *) echo "unknown agents type: $t" >&2; exit 1 ;; esac
  done
  if [ -e "$TARGET/AGENTS.md" ] && [ "$FORCE" != 1 ]; then
    echo "$TARGET/AGENTS.md exists; use --force to overwrite" >&2; exit 1
  fi
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

if [ -n "$AGENTS" ]; then
  OUT="$TARGET/AGENTS.md"
  cat "$SRC/templates/AGENTS.base.md" > "$OUT"
  case ",$AGENTS," in
    *,api-spec,*|*,api-impl,*|*,kafka,*|*,database,*) cat "$SRC/templates/java-spring/AGENTS.spring-common.md" >> "$OUT" ;;
  esac
  for t in api-spec api-impl kafka database; do
    case ",$AGENTS," in *,"$t",*) cat "$SRC/templates/java-spring/AGENTS.$t.md" >> "$OUT" ;; esac
  done
  case ",$AGENTS," in *,migration,*) cat "$SRC/templates/AGENTS.migration.md" >> "$OUT" ;; esac
  echo "Wrote $OUT (fill in the <!-- À COMPLÉTER --> markers)"
fi
