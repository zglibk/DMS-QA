#!/bin/bash

# DMS-QA 开发环境快速启动脚本
# 用于在GitHub Codespaces中快速启动前后端服务

echo "🚀 启动 DMS-QA 质量管理系统开发环境..."
echo "================================================"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 函数：启动前端服务
start_frontend() {
    echo "📱 启动前端开发服务器..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "📦 安装前端依赖..."
        npm install
    fi
    echo "🌐 前端服务将在 http://localhost:5173 启动"
    npm run dev &
    FRONTEND_PID=$!
    cd ..
}

# 函数：启动后端服务
start_backend() {
    echo "🔧 启动后端API服务器..."
    cd server
    if [ ! -d "node_modules" ]; then
        echo "📦 安装后端依赖..."
        npm install
    fi
    echo "🔗 后端API将在 http://localhost:3001 启动"
    node app.js &
    BACKEND_PID=$!
    cd ..
}

# 函数：清理进程
cleanup() {
    echo "\n🛑 正在停止服务..."
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    echo "✅ 服务已停止"
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

# 检查参数
case "$1" in
    "frontend")
        start_frontend
        echo "✅ 前端服务已启动，按 Ctrl+C 停止"
        wait $FRONTEND_PID
        ;;
    "backend")
        start_backend
        echo "✅ 后端服务已启动，按 Ctrl+C 停止"
        wait $BACKEND_PID
        ;;
    "all"|"")
        start_frontend
        sleep 2
        start_backend
        echo ""
        echo "🎉 DMS-QA 开发环境已完全启动！"
        echo "📱 前端: http://localhost:5173"
        echo "🔧 后端: http://localhost:3001"
        echo "📋 按 Ctrl+C 停止所有服务"
        echo ""
        
        # 等待任一服务结束
        wait
        ;;
    "help")
        echo "用法: $0 [选项]"
        echo "选项:"
        echo "  all        启动前端和后端服务 (默认)"
        echo "  frontend   仅启动前端服务"
        echo "  backend    仅启动后端服务"
        echo "  help       显示此帮助信息"
        ;;
    *)
        echo "❌ 未知选项: $1"
        echo "使用 '$0 help' 查看可用选项"
        exit 1
        ;;
esac