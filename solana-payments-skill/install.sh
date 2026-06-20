#!/usr/bin/env bash
# solana-payments-skill — minimal installer.
# Copies the skill into ~/.claude/skills/solana-payments and the safety rules into ~/.claude/rules.
# No network calls, no binaries downloaded. Review before running (it only copies files).
#
# Usage:
#   ./install.sh            Install for Claude Code (default: ~/.claude/)
#   ./install.sh --agents   Also install for non-Claude agents (Cursor/Windsurf): writes the
#                           skill + agents into ./.agents/ in addition to the Claude path.
#   CLAUDE_HOME=/path ./install.sh   Override the Claude config root.
set -euo pipefail

WITH_AGENTS=0
for arg in "$@"; do
  case "$arg" in
    --agents) WITH_AGENTS=1 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "unknown flag: $arg (try --help)"; exit 1 ;;
  esac
done

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_ROOT="${CLAUDE_HOME:-$HOME/.claude}"
SKILL_DEST="$DEST_ROOT/skills/solana-payments"
RULES_DEST="$DEST_ROOT/rules"

install_into() { # $1 = config root
  local root="$1"
  mkdir -p "$root/skills/solana-payments" "$root/rules"
  cp -R "$SRC_DIR/skill/." "$root/skills/solana-payments/"     # SKILL.md hub + references/
  cp "$SRC_DIR/rules/payments.md" "$root/rules/payments.md"    # safety laws
  [ -d "$SRC_DIR/agents" ]   && { mkdir -p "$root/agents";   cp -R "$SRC_DIR/agents/." "$root/agents/"; }
  [ -d "$SRC_DIR/commands" ] && { mkdir -p "$root/commands"; cp -R "$SRC_DIR/commands/." "$root/commands/"; }
}

echo "Installing solana-payments-skill → $SKILL_DEST"
install_into "$DEST_ROOT"

if [ "$WITH_AGENTS" -eq 1 ]; then
  AGENTS_ROOT="$(pwd)/.agents"
  echo "Also installing for non-Claude agents → $AGENTS_ROOT (Cursor/Windsurf/Codex)"
  install_into "$AGENTS_ROOT"
fi

echo "Done."
echo "  Skill : $SKILL_DEST/SKILL.md"
echo "  Rules : $RULES_DEST/payments.md"
[ "$WITH_AGENTS" -eq 1 ] && echo "  Agents copy : $(pwd)/.agents/"
echo "Open your agent and ask it to load the 'solana-payments' skill (or run /solana-payments)."
