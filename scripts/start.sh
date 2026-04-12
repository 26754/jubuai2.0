#!/bin/bash
set -Eeuo pipefail

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

echo "Starting production server on port ${DEPLOY_RUN_PORT}..."
npx serve dist -l ${DEPLOY_RUN_PORT}
