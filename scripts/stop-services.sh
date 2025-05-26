#!/bin/bash

# 量化交易系统服务停止脚本

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

# 停止单个服务
stop_service() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        
        if kill -0 "$pid" 2>/dev/null; then
            log_info "停止 $service_name (PID: $pid)..."
            
            # 尝试优雅停止
            kill -TERM "$pid" 2>/dev/null || true
            
            # 等待进程结束
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # 如果进程仍在运行，强制停止
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "$service_name 未响应优雅停止，强制终止..."
                kill -KILL "$pid" 2>/dev/null || true
                sleep 1
            fi
            
            # 检查进程是否已停止
            if ! kill -0 "$pid" 2>/dev/null; then
                log_success "$service_name 已停止"
            else
                log_error "无法停止 $service_name"
                return 1
            fi
        else
            log_warning "$service_name 进程不存在 (PID: $pid)"
        fi
        
        # 删除PID文件
        rm -f "$pid_file"
    else
        log_warning "$service_name PID文件不存在"
    fi
    
    return 0
}

# 停止端口上的进程
stop_port_process() {
    local port=$1
    local service_name=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$pid" ]; then
        log_info "发现端口 $port 上的进程 ($service_name): $pid"
        kill -TERM "$pid" 2>/dev/null || true
        
        # 等待进程结束
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 5 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # 强制停止
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL "$pid" 2>/dev/null || true
        fi
        
        log_success "端口 $port 上的进程已停止"
    fi
}

# 停止所有服务
stop_all_services() {
    log_info "停止所有量化交易系统服务..."
    
    # 停止各个服务
    stop_service ".backend.pid" "后端服务"
    stop_service ".frontend.pid" "前端服务"
    stop_service ".proxy.pid" "代理服务"
    stop_service ".data_sync.pid" "数据同步任务"
    
    # 额外检查端口
    stop_port_process 7001 "后端服务"
    stop_port_process 5173 "前端服务"
    stop_port_process 3001 "代理服务"
    
    log_success "所有服务停止完成"
}

# 停止特定服务
stop_specific_service() {
    local service=$1
    
    case $service in
        "backend"|"后端")
            stop_service ".backend.pid" "后端服务"
            stop_port_process 7001 "后端服务"
            ;;
        "frontend"|"前端")
            stop_service ".frontend.pid" "前端服务"
            stop_port_process 5173 "前端服务"
            ;;
        "proxy"|"代理")
            stop_service ".proxy.pid" "代理服务"
            stop_port_process 3001 "代理服务"
            ;;
        "sync"|"同步")
            stop_service ".data_sync.pid" "数据同步任务"
            ;;
        *)
            log_error "未知的服务: $service"
            log_info "可用的服务: backend, frontend, proxy, sync"
            exit 1
            ;;
    esac
}

# 显示服务状态
show_status() {
    echo ""
    log_info "服务状态检查："
    
    # 检查PID文件
    for pid_file in .backend.pid .frontend.pid .proxy.pid .data_sync.pid; do
        local service_name=""
        case $pid_file in
            ".backend.pid") service_name="后端服务" ;;
            ".frontend.pid") service_name="前端服务" ;;
            ".proxy.pid") service_name="代理服务" ;;
            ".data_sync.pid") service_name="数据同步" ;;
        esac
        
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                echo "  🟢 $service_name: 运行中 (PID: $pid)"
            else
                echo "  🔴 $service_name: 已停止 (僵尸PID文件)"
                rm -f "$pid_file"
            fi
        else
            echo "  ⚪ $service_name: 未运行"
        fi
    done
    
    # 检查端口
    echo ""
    log_info "端口占用检查："
    
    for port in 7001 5173 3001; do
        local service_name=""
        case $port in
            7001) service_name="后端服务" ;;
            5173) service_name="前端服务" ;;
            3001) service_name="代理服务" ;;
        esac
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local pid=$(lsof -ti:$port)
            echo "  🔴 端口 $port ($service_name): 被占用 (PID: $pid)"
        else
            echo "  🟢 端口 $port ($service_name): 空闲"
        fi
    done
}

# 清理临时文件
cleanup_temp_files() {
    log_info "清理临时文件..."
    
    # 清理PID文件
    rm -f .backend.pid .frontend.pid .proxy.pid .data_sync.pid
    
    # 清理日志文件（可选）
    if [ "$1" = "--clean-logs" ]; then
        log_info "清理日志文件..."
        rm -rf logs/*.log
    fi
    
    # 清理缓存文件
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
    fi
    
    if [ -d "server/node_modules/.cache" ]; then
        rm -rf server/node_modules/.cache
    fi
    
    log_success "临时文件清理完成"
}

# 显示帮助信息
show_help() {
    echo "量化交易系统服务停止脚本"
    echo ""
    echo "用法:"
    echo "  $0 [选项] [服务名]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -s, --status        显示服务状态"
    echo "  -c, --clean         清理临时文件"
    echo "  --clean-logs        清理日志文件"
    echo ""
    echo "服务名:"
    echo "  backend             停止后端服务"
    echo "  frontend            停止前端服务"
    echo "  proxy               停止代理服务"
    echo "  sync                停止数据同步任务"
    echo "  (不指定服务名则停止所有服务)"
    echo ""
    echo "示例:"
    echo "  $0                  停止所有服务"
    echo "  $0 backend          只停止后端服务"
    echo "  $0 --status         查看服务状态"
    echo "  $0 --clean          停止服务并清理临时文件"
}

# 主函数
main() {
    # 检查是否在项目根目录
    if [ ! -f "package.json" ] || [ ! -d "server" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 解析命令行参数
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--status)
            show_status
            exit 0
            ;;
        -c|--clean)
            stop_all_services
            cleanup_temp_files
            exit 0
            ;;
        --clean-logs)
            stop_all_services
            cleanup_temp_files --clean-logs
            exit 0
            ;;
        "")
            # 没有参数，停止所有服务
            stop_all_services
            ;;
        *)
            # 停止特定服务
            stop_specific_service "$1"
            ;;
    esac
    
    echo ""
    log_success "操作完成"
}

# 运行主函数
main "$@"
