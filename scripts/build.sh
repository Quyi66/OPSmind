#!/bin/bash

# OpsMind Vue Dashboard 构建脚本
# 用法: ./scripts/build.sh [dev|prod]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Node.js 和 npm
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        log_info "依赖已存在，跳过安装"
    fi
    
    log_success "依赖安装完成"
}

# 代码检查
lint_code() {
    log_info "执行代码检查..."
    
    npm run lint:check
    
    log_success "代码检查通过"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    npm run test:run
    
    log_success "测试通过"
}

# 构建项目
build_project() {
    local mode=$1
    
    log_info "构建项目 (模式: $mode)..."
    
    # 清理旧的构建文件
    npm run clean
    
    # 根据模式构建
    if [ "$mode" = "prod" ]; then
        npm run build:prod
    else
        npm run build:dev
    fi
    
    log_success "项目构建完成"
}

# 分析构建结果
analyze_build() {
    log_info "分析构建结果..."
    
    if [ -d "dist" ]; then
        echo "构建文件大小:"
        du -sh dist/*
        echo ""
        echo "详细文件列表:"
        find dist -type f -name "*.js" -o -name "*.css" | xargs ls -lh
    else
        log_warning "构建目录不存在"
    fi
}

# 主函数
main() {
    local mode=${1:-dev}
    
    log_info "开始构建 OpsMind Vue Dashboard"
    log_info "构建模式: $mode"
    
    # 检查参数
    if [ "$mode" != "dev" ] && [ "$mode" != "prod" ]; then
        log_error "无效的构建模式: $mode (支持: dev, prod)"
        exit 1
    fi
    
    # 执行构建流程
    check_dependencies
    install_dependencies
    lint_code
    
    # 生产环境运行测试
    if [ "$mode" = "prod" ]; then
        run_tests
    fi
    
    build_project $mode
    analyze_build
    
    log_success "构建完成！"
    
    if [ "$mode" = "prod" ]; then
        log_info "生产构建文件位于 dist/ 目录"
        log_info "可以使用 'npm run preview' 预览构建结果"
    fi
}

# 执行主函数
main "$@"
