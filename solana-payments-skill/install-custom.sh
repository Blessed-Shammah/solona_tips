#!/usr/bin/env bash
# solana-payments-skill — interactive installer.
# Lets you choose where the skill lands. Only copies local files; no network, no binaries.
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "solana-payments-skill — install location:"
echo "  1) Personal  (~/.claude/)        — available in every project"
echo "  2) Project   (./.claude/)        — only this repo"
echo "  3) Custom    (you type the path)"
printf "Choose [1-3]: "
read -r choice

case "$choice" in
  1) DEST_ROOT="$HOME/.claude" ;;
  2) DEST_ROOT="$(pwd)/.claude" ;;
  3) printf "Enter target .claude dir: "; read -r DEST_ROOT ;;
  *) echo "Invalid choice."; exit 1 ;;
esac

SKILL_DEST="$DEST_ROOT/skills/solana-payments"
RULES_DEST="$DEST_ROOT/rules"

echo "Installing → $SKILL_DEST"
mkdir -p "$SKILL_DEST" "$RULES_DEST"
cp -R "$SRC_DIR/skill/." "$SKILL_DEST/"
cp "$SRC_DIR/rules/payments.md" "$RULES_DEST/payments.md"

printf "Also install optional agents/ and commands/? [y/N]: "
read -r extras
if [ "$extras" = "y" ] || [ "$extras" = "Y" ]; then
  [ -d "$SRC_DIR/agents" ] && { mkdir -p "$DEST_ROOT/agents"; cp -R "$SRC_DIR/agents/." "$DEST_ROOT/agents/"; }
  [ -d "$SRC_DIR/commands" ] && { mkdir -p "$DEST_ROOT/commands"; cp -R "$SRC_DIR/commands/." "$DEST_ROOT/commands/"; }
  echo "Installed agents/ and commands/."
fi

echo "Done. Skill at $SKILL_DEST/SKILL.md"
