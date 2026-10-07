#!/usr/bin/env bash
set -euo pipefail
npm run prisma:generate
npm run lint
npm run typecheck
npm run typecheck:connector
npm test
npm run build
