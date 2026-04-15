#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "=========================================="
echo "JuBu AI Build Script"
echo "=========================================="

# 确保 .env 文件存在
if [ ! -f .env ]; then
    echo "Warning: .env file not found, copying from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "Warning: .env.example not found, creating minimal .env..."
        cat > .env << 'EOF'
VITE_SITE_URL=https://jubuguanai.coze.site
EOF
    fi
fi

# 加载环境变量
export $(cat .env 2>/dev/null | grep -v '^#' | xargs) 2>/dev/null || true

# 安装依赖
echo "[1/3] Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 构建前端
echo "[2/3] Building frontend with Vite..."
NODE_ENV=production pnpm vite build

# 验证构建产物
echo "[3/3] Verifying build output..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "Build verification passed!"
    echo ""
    echo "Build output:"
    du -sh dist/ 2>/dev/null || echo "dist/ exists"
else
    echo "Error: Build output not found!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
