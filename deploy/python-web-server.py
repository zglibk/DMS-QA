#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DMS-QA 前端静态文件服务器
支持SPA应用的Python Web服务器，支持配置文件和自动IP检测
"""

import os
import sys
import json
import mimetypes
import urllib.parse
import socket
import subprocess
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
import threading
import time
from datetime import datetime

# 默认配置
DEFAULT_CONFIG = {
    'server': {
        'host': '0.0.0.0',
        'port': 8081,
        'auto_detect_ip': True,
        'fallback_ip': '192.168.1.57'
    },
    'frontend': {
        'paths': [r"D:\DMS-QA server\frontend", "./frontend", "../frontend"],
        'spa_mode': True,
        'api_proxy': {
            'enabled': True,
            'backend_port': 3001,
            'auto_detect_backend': True
        }
    },
    'cors': {'enabled': True, 'allow_origin': '*'},
    'cache': {'html_cache': 'no-cache', 'static_cache': 3600, 'asset_cache': 86400},
    'logging': {'enabled': True},
    'deployment': {
        'auto_config_frontend': True,
        'create_config_file': True,
        'backup_original': True
    }
}

# 全局配置
CONFIG = DEFAULT_CONFIG.copy()
FRONTEND_PATH = None
SERVER_IP = None

# MIME类型映射
MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.zip': 'application/zip',
}

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """支持多线程的HTTP服务器"""
    daemon_threads = True
    allow_reuse_address = True

class StaticFileHandler(BaseHTTPRequestHandler):
    """静态文件处理器"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        client_ip = self.client_address[0]
        print(f"[{timestamp}] {client_ip} - {format % args}")
    
    def get_mime_type(self, file_path):
        """获取文件的MIME类型"""
        _, ext = os.path.splitext(file_path.lower())
        return MIME_TYPES.get(ext, 'application/octet-stream')
    
    def send_cors_headers(self):
        """发送CORS头"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Access-Control-Max-Age', '86400')
    
    def send_cache_headers(self, file_path):
        """发送缓存头"""
        _, ext = os.path.splitext(file_path.lower())
        if ext in ['.html', '.htm']:
            # HTML文件不缓存
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        elif ext in ['.js', '.css']:
            # JS和CSS文件短期缓存
            self.send_header('Cache-Control', 'public, max-age=3600')
        else:
            # 其他静态资源长期缓存
            self.send_header('Cache-Control', 'public, max-age=86400')
    
    def send_file(self, file_path):
        """发送文件内容"""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            # 发送响应头
            self.send_response(200)
            self.send_header('Content-Type', self.get_mime_type(file_path))
            self.send_header('Content-Length', str(len(content)))
            self.send_cors_headers()
            self.send_cache_headers(file_path)
            self.end_headers()
            
            # 发送文件内容
            self.wfile.write(content)
            return True
            
        except IOError as e:
            print(f"读取文件失败: {file_path} - {e}")
            return False
    
    def send_404(self):
        """发送404错误"""
        error_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - 页面未找到</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #e74c3c; }
                p { color: #666; }
                .back-link { color: #3498db; text-decoration: none; }
            </style>
        </head>
        <body>
            <h1>404 - 页面未找到</h1>
            <p>请求的页面不存在</p>
            <a href="/" class="back-link">返回首页</a>
        </body>
        </html>
        """
        
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(error_html.encode('utf-8'))))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(error_html.encode('utf-8'))
    
    def send_500(self, error_msg="内部服务器错误"):
        """发送500错误"""
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>500 - 服务器错误</title>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; text-align: center; padding: 50px; }}
                h1 {{ color: #e74c3c; }}
                p {{ color: #666; }}
                .error {{ background: #f8f8f8; padding: 10px; margin: 20px; border-left: 4px solid #e74c3c; }}
            </style>
        </head>
        <body>
            <h1>500 - 服务器错误</h1>
            <div class="error">{error_msg}</div>
            <p>请联系管理员或稍后重试</p>
        </body>
        </html>
        """
        
        self.send_response(500)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(error_html.encode('utf-8'))))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(error_html.encode('utf-8'))
    
    def do_OPTIONS(self):
        """处理OPTIONS请求（CORS预检）"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        """处理GET请求"""
        try:
            # 解析URL
            parsed_url = urllib.parse.urlparse(self.path)
            url_path = parsed_url.path
            
            # 移除查询参数
            if url_path.endswith('/'):
                url_path = url_path[:-1]
            
            # 根路径重定向到index.html
            if url_path == '' or url_path == '/':
                url_path = '/index.html'
            
            # 构建文件路径
            file_path = os.path.join(FRONTEND_PATH, url_path.lstrip('/'))
            
            # 安全检查：防止目录遍历
            real_frontend_path = os.path.realpath(FRONTEND_PATH)
            real_file_path = os.path.realpath(file_path)
            
            if not real_file_path.startswith(real_frontend_path):
                self.send_404()
                return
            
            # 检查文件是否存在
            if os.path.isfile(file_path):
                # 文件存在，直接发送
                if not self.send_file(file_path):
                    self.send_500("文件读取失败")
            else:
                # 文件不存在，对于SPA应用返回index.html
                index_path = os.path.join(FRONTEND_PATH, 'index.html')
                if os.path.isfile(index_path):
                    if not self.send_file(index_path):
                        self.send_500("index.html读取失败")
                else:
                    self.send_404()
                    
        except Exception as e:
            print(f"处理请求时发生错误: {e}")
            self.send_500(f"请求处理错误: {str(e)}")

def get_local_ip():
    """获取本机IP地址"""
    try:
        # 方法1: 连接外部地址获取本机IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            return ip
    except:
        try:
            # 方法2: 获取主机名对应的IP
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            if ip != "127.0.0.1":
                return ip
        except:
            pass

    try:
        # 方法3: 使用ipconfig命令（Windows）
        if os.name == 'nt':
            result = subprocess.run(['ipconfig'], capture_output=True, text=True, encoding='gbk')
            lines = result.stdout.split('\n')
            for i, line in enumerate(lines):
                if '以太网适配器' in line or 'Ethernet adapter' in line:
                    # 查找后续的IPv4地址
                    for j in range(i+1, min(i+10, len(lines))):
                        if 'IPv4' in lines[j] or 'IP Address' in lines[j]:
                            match = re.search(r'(\d+\.\d+\.\d+\.\d+)', lines[j])
                            if match:
                                ip = match.group(1)
                                if not ip.startswith('127.') and not ip.startswith('169.254.'):
                                    return ip
    except:
        pass

    return None

def detect_backend_service():
    """检测后端服务地址"""
    if not CONFIG['frontend']['api_proxy']['auto_detect_backend']:
        return f"http://{SERVER_IP}:{CONFIG['frontend']['api_proxy']['backend_port']}"

    backend_port = CONFIG['frontend']['api_proxy']['backend_port']

    # 检测可能的后端地址
    possible_ips = [SERVER_IP, '127.0.0.1', 'localhost']

    for ip in possible_ips:
        if ip:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(2)
                    result = s.connect_ex((ip, backend_port))
                    if result == 0:
                        print(f"✅ 检测到后端服务: http://{ip}:{backend_port}")
                        return f"http://{ip}:{backend_port}"
            except:
                continue

    # 如果都检测不到，使用服务器IP
    backend_url = f"http://{SERVER_IP}:{backend_port}"
    print(f"⚠️  未检测到后端服务，使用默认地址: {backend_url}")
    return backend_url

def update_frontend_config():
    """更新前端配置文件中的API地址"""
    if not CONFIG['deployment']['auto_config_frontend']:
        return

    backend_url = detect_backend_service()

    # 查找前端JavaScript文件并更新API配置
    if FRONTEND_PATH:
        assets_dir = os.path.join(FRONTEND_PATH, 'assets')
        if os.path.isdir(assets_dir):
            for filename in os.listdir(assets_dir):
                if filename.endswith('.js') and 'index-' in filename:
                    file_path = os.path.join(assets_dir, filename)
                    try:
                        # 备份原文件
                        if CONFIG['deployment']['backup_original']:
                            backup_path = file_path + '.backup'
                            if not os.path.exists(backup_path):
                                with open(file_path, 'rb') as src, open(backup_path, 'wb') as dst:
                                    dst.write(src.read())

                        # 读取文件内容
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        # 替换API地址
                        original_content = content
                        patterns = [
                            (r'http://localhost:3001', backend_url),
                            (r'http://127\.0\.0\.1:3001', backend_url),
                            (r'http://192\.168\.1\.57:3001', backend_url),
                            (r'"\/api\/', f'"{backend_url}/api/'),
                            (r"'\/api\/", f"'{backend_url}/api/"),
                        ]

                        for pattern, replacement in patterns:
                            content = re.sub(pattern, replacement, content)

                        # 如果内容有变化，写回文件
                        if content != original_content:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(content)
                            print(f"✅ 已更新前端配置: {filename}")

                    except Exception as e:
                        print(f"⚠️  更新前端配置失败 {filename}: {e}")

def create_deployment_config():
    """创建部署配置文件"""
    if not CONFIG['deployment']['create_config_file']:
        return

    config_data = {
        'server_ip': SERVER_IP,
        'frontend_url': f"http://{SERVER_IP}:{CONFIG['server']['port']}",
        'backend_url': detect_backend_service(),
        'deployment_time': datetime.now().isoformat(),
        'frontend_path': FRONTEND_PATH,
        'notes': '此文件由DMS-QA Python Web服务器自动生成'
    }

    config_file = os.path.join(os.path.dirname(__file__), 'deployment-info.json')
    try:
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
        print(f"✅ 已创建部署配置: {config_file}")
    except Exception as e:
        print(f"⚠️  创建部署配置失败: {e}")

def load_config():
    """加载配置文件"""
    global CONFIG, SERVER_IP
    config_file = os.path.join(os.path.dirname(__file__), 'server-config.json')

    if os.path.isfile(config_file):
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                file_config = json.load(f)

            # 合并配置
            for key in file_config:
                if key in CONFIG:
                    if isinstance(CONFIG[key], dict) and isinstance(file_config[key], dict):
                        CONFIG[key].update(file_config[key])
                    else:
                        CONFIG[key] = file_config[key]
                else:
                    CONFIG[key] = file_config[key]

            print(f"✅ 已加载配置文件: {config_file}")
        except Exception as e:
            print(f"⚠️  配置文件加载失败，使用默认配置: {e}")
    else:
        print("ℹ️  未找到配置文件，使用默认配置")

    # 检测服务器IP
    if CONFIG['server']['auto_detect_ip']:
        detected_ip = get_local_ip()
        if detected_ip:
            SERVER_IP = detected_ip
            print(f"✅ 自动检测到服务器IP: {SERVER_IP}")
        else:
            SERVER_IP = CONFIG['server']['fallback_ip']
            print(f"⚠️  IP检测失败，使用备用IP: {SERVER_IP}")
    else:
        SERVER_IP = CONFIG['server']['fallback_ip']
        print(f"ℹ️  使用配置的IP地址: {SERVER_IP}")

def find_frontend_path():
    """查找前端文件目录"""
    possible_paths = CONFIG['frontend']['paths']

    # 添加一些额外的可能路径
    extra_paths = [
        os.path.join(os.getcwd(), "frontend"),
        os.path.join(os.path.dirname(__file__), "frontend"),
        os.path.join(os.path.dirname(__file__), "..", "frontend"),
    ]

    all_paths = possible_paths + [p for p in extra_paths if p not in possible_paths]

    for path in all_paths:
        abs_path = os.path.abspath(path)
        if os.path.isdir(abs_path) and os.path.isfile(os.path.join(abs_path, "index.html")):
            return abs_path

    return None

def print_server_info():
    """打印服务器信息"""
    host = CONFIG['server']['host']
    port = CONFIG['server']['port']
    backend_url = detect_backend_service()

    print("=" * 70)
    print("🚀 DMS-QA 前端静态文件服务器 (智能部署版)")
    print("=" * 70)
    print(f"�️  服务器IP: {SERVER_IP}")
    print(f"📍 监听地址: {host}:{port}")
    print(f"🌐 访问地址:")
    print(f"   本地访问: http://localhost:{port}")
    print(f"   远程访问: http://{SERVER_IP}:{port}")
    print(f"   登录页面: http://{SERVER_IP}:{port}/login")
    print(f"📁 前端目录: {FRONTEND_PATH}")
    print(f"� 后端API: {backend_url}")
    print(f"�🕐 启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print("💡 智能功能:")
    print("  ✅ 自动检测服务器IP地址")
    print("  ✅ 自动配置前端API地址")
    print("  ✅ 自动检测后端服务状态")
    print("  ✅ 支持SPA单页应用路由")
    print("  ✅ 自动CORS跨域支持")
    print("  ✅ 智能缓存策略")
    print("  ✅ 多线程并发处理")
    print("  ✅ 配置文件自定义")
    print("=" * 70)
    print("🛑 按 Ctrl+C 停止服务器")
    print()

def main():
    """主函数"""
    global FRONTEND_PATH

    print("🔧 初始化智能部署服务器...")

    # 加载配置和检测IP
    load_config()

    # 查找前端文件目录
    FRONTEND_PATH = find_frontend_path()

    if not FRONTEND_PATH:
        print("❌ 错误：未找到前端文件目录")
        print("\n请确保以下位置之一存在前端文件:")
        for path in CONFIG['frontend']['paths']:
            print(f"  - {path}")
        print("\n前端目录应包含 index.html 文件")
        sys.exit(1)

    # 智能配置前端
    print("🔧 正在进行智能配置...")
    update_frontend_config()
    create_deployment_config()

    # 检查端口是否被占用
    host = CONFIG['server']['host']
    port = CONFIG['server']['port']

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()

    if result == 0:
        print(f"⚠️  警告：端口 {port} 已被占用")
        print("请停止占用该端口的程序，或修改配置文件中的端口设置")

        # 尝试自动选择其他端口
        for try_port in range(port + 1, port + 10):
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', try_port))
            sock.close()
            if result != 0:
                print(f"✅ 自动选择可用端口: {try_port}")
                CONFIG['server']['port'] = try_port
                port = try_port
                break
        else:
            print("❌ 无法找到可用端口")
            sys.exit(1)

    try:
        # 创建服务器
        server = ThreadingHTTPServer((host, port), StaticFileHandler)

        # 打印服务器信息
        print_server_info()

        # 启动服务器
        server.serve_forever()

    except KeyboardInterrupt:
        print("\n🛑 收到停止信号，正在关闭服务器...")
        server.shutdown()
        server.server_close()
        print("✅ 服务器已关闭")

    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
