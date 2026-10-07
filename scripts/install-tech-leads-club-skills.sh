#!/usr/bin/env bash
set -euo pipefail

PACKAGE="@tech-leads-club/agent-skills@1.4.10"
SKILLS=(
  "tlc-spec-driven"
  "coding-guidelines"
  "harness-eval"
  "create-adr"
  "spec-driven-eval"
  "frontend-blueprint"
  "react-best-practices"
  "react-composition-patterns"
  "web-design-guidelines"
  "accessibility"
  "playwright-skill"
  "security-best-practices"
  "skill-architect"
)

for skill in "${SKILLS[@]}"; do
  echo "Installing $skill for OpenCode (local)..."
  npx -y "$PACKAGE" install -s "$skill" -a opencode
done

echo "Done. Review git diff, including skill lockfile, before committing."
