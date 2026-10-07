$ErrorActionPreference = "Stop"
$Package = "@tech-leads-club/agent-skills@1.4.10"
$Skills = @(
  "tlc-spec-driven",
  "coding-guidelines",
  "harness-eval",
  "create-adr",
  "spec-driven-eval",
  "frontend-blueprint",
  "react-best-practices",
  "react-composition-patterns",
  "web-design-guidelines",
  "accessibility",
  "playwright-skill",
  "security-best-practices",
  "skill-architect"
)

foreach ($Skill in $Skills) {
  Write-Host "Installing $Skill for OpenCode (local)..."
  & npx -y $Package install -s $Skill -a opencode
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Done. Review git diff, including skill lockfile, before committing."
