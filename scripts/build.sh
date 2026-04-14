#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install

# 确保 .env 文件存在
if [ ! -f .env ]; then
    echo "Warning: .env file not found, creating from example..."
    cp .env.example .env
fi

echo "Building frontend with Vite..."
# 显式加载环境变量
export $(cat .env | grep -v '^#' | xargs) 2>/dev/null || true
pnpm vite build

echo "Build completed successfully!"
