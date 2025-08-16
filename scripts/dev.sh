#!/bin/bash

# OpsMind Vue Dashboard 开发环境启动脚本

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

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        log_warning "端口 $port 已被占用"
        return 1
    else
        log_info "端口 $port 可用"
        return 0
    fi
}

# 检查依赖
check_dependencies() {
    log_info "检查开发环境依赖..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查 Node.js 版本
    local node_version=$(node -v | cut -d'v' -f2)
    local major_version=$(echo $node_version | cut -d'.' -f1)
    
    if [ $major_version -lt 16 ]; then
        log_warning "建议使用 Node.js 16+ 版本，当前版本: $node_version"
    fi
    
    log_success "依赖检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "检查并安装依赖..."
    
    if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
        log_info "安装项目依赖..."
        npm install
    else
        log_info "依赖已存在，检查是否需要更新..."
        npm ci --only=production --silent 2>/dev/null || npm install
    fi
    
    log_success "依赖准备完成"
}

# 环境检查
check_environment() {
    log_info "检查开发环境配置..."
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        log_warning ".env 文件不存在，将使用默认配置"
    fi
    
    if [ ! -f ".env.development" ]; then
        log_warning ".env.development 文件不存在，将使用默认配置"
    fi
    
    # 检查关键端口
    local vue_port=5173
    local angular_port=3000
    local angularjs_port=8080
    
    if ! check_port $vue_port; then
        log_error "Vue 开发服务器端口 $vue_port 被占用，请释放端口或修改配置"
        exit 1
    fi
    
    if ! check_port $angular_port; then
        log_warning "Angular 代理端口 $angular_port 被占用，Angular 集成可能无法正常工作"
    fi
    
    if ! check_port $angularjs_port; then
        log_warning "AngularJS 代理端口 $angularjs_port 被占用，AngularJS 集成可能无法正常工作"
    fi
    
    log_success "环境检查完成"
}

# 启动开发服务器
start_dev_server() {
    log_info "启动 Vue 开发服务器..."
    log_info "访问地址: http://localhost:5173"
    log_info "按 Ctrl+C 停止服务器"
    echo ""
    
    # 启动开发服务器
    npm run dev
}

# 显示帮助信息
show_help() {
    echo "OpsMind Vue Dashboard 开发环境启动脚本"
    echo ""
    echo "用法:"
    echo "  ./scripts/dev.sh [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -c, --check    仅执行环境检查，不启动服务器"
    echo "  -i, --install  仅安装依赖，不启动服务器"
    echo ""
    echo "示例:"
    echo "  ./scripts/dev.sh           # 启动开发服务器"
    echo "  ./scripts/dev.sh --check   # 仅检查环境"
    echo "  ./scripts/dev.sh --install # 仅安装依赖"
}

# 主函数
main() {
    local check_only=false
    local install_only=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--check)
                check_only=true
                shift
                ;;
            -i|--install)
                install_only=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    log_info "OpsMind Vue Dashboard 开发环境"
    echo ""
    
    # 执行检查
    check_dependencies
    check_environment
    install_dependencies
    
    if [ "$check_only" = true ]; then
        log_success "环境检查完成，一切正常！"
        exit 0
    fi
    
    if [ "$install_only" = true ]; then
        log_success "依赖安装完成！"
        exit 0
    fi
    
    # 启动开发服务器
    start_dev_server
}

# 执行主函数
main "$@"
