#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DMS-QA Python Web服务器 - Windows服务安装脚本
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def check_admin():
    """检查是否以管理员身份运行"""
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def install_pywin32():
    """安装pywin32包"""
    print("📦 安装pywin32包...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pywin32'])
        print("✅ pywin32安装成功")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ pywin32安装失败: {e}")
        return False

def create_service_script():
    """创建Windows服务脚本"""
    service_script = '''
import win32serviceutil
import win32service
import win32event
import servicemanager
import socket
import sys
import os
import subprocess
import time

class DmsQaWebService(win32serviceutil.ServiceFramework):
    _svc_name_ = "DMS-QA-WebServer"
    _svc_display_name_ = "DMS-QA Web服务器"
    _svc_description_ = "DMS-QA质量管理系统前端Web服务器"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.process = None
        
        # 服务器脚本路径
        self.server_script = os.path.join(os.path.dirname(__file__), 'python-web-server.py')

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        
        # 终止Python服务器进程
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=10)
            except:
                try:
                    self.process.kill()
                except:
                    pass

    def SvcDoRun(self):
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                            servicemanager.PYS_SERVICE_STARTED,
                            (self._svc_name_, ''))
        
        # 启动Python Web服务器
        try:
            self.process = subprocess.Popen([
                sys.executable, 
                self.server_script
            ], cwd=os.path.dirname(self.server_script))
            
            # 等待停止信号
            win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)
            
        except Exception as e:
            servicemanager.LogErrorMsg(f"服务启动失败: {str(e)}")

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(DmsQaWebService)
'''
    
    script_path = os.path.join(os.path.dirname(__file__), 'dms-qa-web-service.py')
    
    try:
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(service_script)
        print(f"✅ 服务脚本已创建: {script_path}")
        return script_path
    except Exception as e:
        print(f"❌ 服务脚本创建失败: {e}")
        return None

def install_service(service_script):
    """安装Windows服务"""
    print("🔧 安装Windows服务...")
    try:
        # 安装服务
        subprocess.check_call([
            sys.executable, 
            service_script, 
            'install'
        ])
        print("✅ Windows服务安装成功")
        
        # 启动服务
        subprocess.check_call([
            sys.executable, 
            service_script, 
            'start'
        ])
        print("✅ Windows服务启动成功")
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Windows服务安装失败: {e}")
        return False

def create_uninstall_script():
    """创建卸载脚本"""
    uninstall_script = '''@echo off
echo 卸载DMS-QA Web服务器...
python dms-qa-web-service.py stop
python dms-qa-web-service.py remove
echo 服务已卸载
pause
'''
    
    script_path = os.path.join(os.path.dirname(__file__), 'uninstall-service.bat')
    
    try:
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(uninstall_script)
        print(f"✅ 卸载脚本已创建: {script_path}")
        return True
    except Exception as e:
        print(f"❌ 卸载脚本创建失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 50)
    print("🔧 DMS-QA Python Web服务器 - Windows服务安装")
    print("=" * 50)
    
    # 检查管理员权限
    if not check_admin():
        print("❌ 需要管理员权限才能安装Windows服务")
        print("请以管理员身份运行此脚本")
        input("按任意键退出...")
        sys.exit(1)
    
    print("✅ 管理员权限确认")
    
    # 检查Python环境
    print(f"🐍 Python版本: {sys.version}")
    
    # 检查前端文件
    frontend_paths = [
        r"D:\DMS-QA server\frontend",
        "./frontend",
        "../frontend"
    ]
    
    frontend_found = False
    for path in frontend_paths:
        if os.path.isdir(path) and os.path.isfile(os.path.join(path, "index.html")):
            print(f"✅ 前端文件找到: {os.path.abspath(path)}")
            frontend_found = True
            break
    
    if not frontend_found:
        print("❌ 未找到前端文件")
        print("请确保前端文件已正确部署")
        input("按任意键退出...")
        sys.exit(1)
    
    # 检查服务器脚本
    server_script = os.path.join(os.path.dirname(__file__), 'python-web-server.py')
    if not os.path.isfile(server_script):
        print(f"❌ 未找到服务器脚本: {server_script}")
        input("按任意键退出...")
        sys.exit(1)
    
    print("✅ 服务器脚本找到")
    
    # 安装pywin32
    if not install_pywin32():
        input("按任意键退出...")
        sys.exit(1)
    
    # 创建服务脚本
    service_script = create_service_script()
    if not service_script:
        input("按任意键退出...")
        sys.exit(1)
    
    # 安装Windows服务
    if not install_service(service_script):
        input("按任意键退出...")
        sys.exit(1)
    
    # 创建卸载脚本
    create_uninstall_script()
    
    print("\n" + "=" * 50)
    print("🎉 安装完成！")
    print("=" * 50)
    print("📋 服务信息:")
    print("  服务名称: DMS-QA-WebServer")
    print("  显示名称: DMS-QA Web服务器")
    print("  访问地址: http://192.168.1.57:8081")
    print("\n💡 管理命令:")
    print("  启动服务: net start DMS-QA-WebServer")
    print("  停止服务: net stop DMS-QA-WebServer")
    print("  卸载服务: 运行 uninstall-service.bat")
    print("\n📁 相关文件:")
    print(f"  服务脚本: {service_script}")
    print(f"  Web服务器: {server_script}")
    print(f"  卸载脚本: uninstall-service.bat")
    
    input("\n按任意键退出...")

if __name__ == "__main__":
    main()
