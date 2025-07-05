#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DMS-QA 智能部署工具
自动检测服务器环境并配置系统
"""

import os
import sys
import json
import socket
import subprocess
import re
import shutil
from datetime import datetime

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

def check_port_available(port):
    """检查端口是否可用"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', port))
            return True
    except:
        return False

def find_available_port(start_port=8081, max_try=10):
    """查找可用端口"""
    for port in range(start_port, start_port + max_try):
        if check_port_available(port):
            return port
    return None

def detect_backend_service(ip, port=3001):
    """检测后端服务"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2)
            result = s.connect_ex((ip, port))
            return result == 0
    except:
        return False

def update_database_config(server_ip):
    """更新数据库配置文件"""
    db_config_paths = [
        './server/db.js',
        '../server/db.js',
        './db.js'
    ]
    
    for db_path in db_config_paths:
        if os.path.isfile(db_path):
            try:
                # 备份原文件
                backup_path = db_path + '.backup'
                if not os.path.exists(backup_path):
                    shutil.copy2(db_path, backup_path)
                
                # 读取文件内容
                with open(db_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 替换数据库服务器地址
                original_content = content
                
                # 常见的数据库配置模式
                patterns = [
                    (r"server:\s*['\"][\d\.]+['\"]", f"server: '{server_ip}'"),
                    (r"host:\s*['\"][\d\.]+['\"]", f"host: '{server_ip}'"),
                    (r"server:\s*['\"]localhost['\"]", f"server: '{server_ip}'"),
                    (r"host:\s*['\"]localhost['\"]", f"host: '{server_ip}'"),
                ]
                
                for pattern, replacement in patterns:
                    content = re.sub(pattern, replacement, content)
                
                # 如果内容有变化，写回文件
                if content != original_content:
                    with open(db_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"✅ 已更新数据库配置: {db_path}")
                    return True
                    
            except Exception as e:
                print(f"⚠️  更新数据库配置失败 {db_path}: {e}")
    
    return False

def create_deployment_summary(server_ip, frontend_port, backend_port):
    """创建部署摘要"""
    summary = {
        "deployment_info": {
            "server_ip": server_ip,
            "deployment_time": datetime.now().isoformat(),
            "frontend_url": f"http://{server_ip}:{frontend_port}",
            "backend_url": f"http://{server_ip}:{backend_port}",
            "login_url": f"http://{server_ip}:{frontend_port}/login"
        },
        "services": {
            "frontend": {
                "port": frontend_port,
                "status": "configured",
                "type": "Python Web Server"
            },
            "backend": {
                "port": backend_port,
                "status": "detected" if detect_backend_service(server_ip, backend_port) else "not_detected",
                "type": "Node.js API Server"
            }
        },
        "next_steps": [
            "1. 启动后端服务（如未运行）",
            "2. 运行 start-python-web-server.bat 启动前端服务",
            f"3. 访问 http://{server_ip}:{frontend_port}/login 进行登录",
            "4. 使用 admin/123456 进行登录测试"
        ]
    }
    
    summary_file = 'deployment-summary.json'
    try:
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        print(f"✅ 已创建部署摘要: {summary_file}")
        return summary
    except Exception as e:
        print(f"⚠️  创建部署摘要失败: {e}")
        return summary

def print_deployment_info(summary):
    """打印部署信息"""
    info = summary['deployment_info']
    services = summary['services']
    
    print("\n" + "=" * 70)
    print("🎉 DMS-QA 智能部署完成！")
    print("=" * 70)
    print(f"🖥️  服务器IP: {info['server_ip']}")
    print(f"🌐 前端访问: {info['frontend_url']}")
    print(f"🔗 后端API: {info['backend_url']}")
    print(f"🚪 登录页面: {info['login_url']}")
    print(f"🕐 部署时间: {info['deployment_time']}")
    print("\n📊 服务状态:")
    print(f"  前端服务: 端口 {services['frontend']['port']} - {services['frontend']['status']}")
    print(f"  后端服务: 端口 {services['backend']['port']} - {services['backend']['status']}")
    
    print("\n📋 下一步操作:")
    for step in summary['next_steps']:
        print(f"  {step}")
    
    print("\n💡 管理命令:")
    print("  启动前端: start-python-web-server.bat")
    print("  安装服务: python install-python-service.py")
    print("  查看配置: type server-config.json")
    print("=" * 70)

def main():
    """主函数"""
    print("🚀 DMS-QA 智能部署工具")
    print("=" * 50)
    
    # 检测服务器IP
    print("🔍 检测服务器环境...")
    server_ip = get_local_ip()
    
    if not server_ip:
        print("❌ 无法检测服务器IP地址")
        server_ip = input("请手动输入服务器IP地址: ").strip()
        if not server_ip:
            print("❌ 必须提供服务器IP地址")
            sys.exit(1)
    
    print(f"✅ 服务器IP: {server_ip}")
    
    # 检测可用端口
    print("🔍 检测可用端口...")
    frontend_port = find_available_port(8081)
    if not frontend_port:
        print("❌ 无法找到可用的前端端口")
        sys.exit(1)
    
    print(f"✅ 前端端口: {frontend_port}")
    
    # 检测后端服务
    backend_port = 3001
    backend_running = detect_backend_service(server_ip, backend_port)
    if backend_running:
        print(f"✅ 检测到后端服务: {server_ip}:{backend_port}")
    else:
        print(f"⚠️  未检测到后端服务: {server_ip}:{backend_port}")
    
    # 更新配置文件
    print("🔧 更新配置文件...")
    config_file = 'server-config.json'
    
    if os.path.isfile(config_file):
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 更新配置
            config['server']['fallback_ip'] = server_ip
            config['server']['port'] = frontend_port
            config['frontend']['api_proxy']['backend_port'] = backend_port
            
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            print(f"✅ 已更新配置文件: {config_file}")
        except Exception as e:
            print(f"⚠️  更新配置文件失败: {e}")
    
    # 询问是否更新数据库配置
    update_db = input("\n是否更新数据库配置文件中的服务器地址？(y/n): ").strip().lower()
    if update_db == 'y':
        if update_database_config(server_ip):
            print("✅ 数据库配置已更新")
        else:
            print("⚠️  未找到数据库配置文件或更新失败")
    
    # 创建部署摘要
    print("📝 创建部署摘要...")
    summary = create_deployment_summary(server_ip, frontend_port, backend_port)
    
    # 打印部署信息
    print_deployment_info(summary)
    
    # 询问是否立即启动服务
    start_now = input("\n是否立即启动前端服务？(y/n): ").strip().lower()
    if start_now == 'y':
        try:
            if os.name == 'nt':  # Windows
                subprocess.run(['start-python-web-server.bat'], shell=True)
            else:
                subprocess.run(['python3', 'python-web-server.py'])
        except Exception as e:
            print(f"⚠️  启动服务失败: {e}")
            print("请手动运行 start-python-web-server.bat")

if __name__ == "__main__":
    main()
