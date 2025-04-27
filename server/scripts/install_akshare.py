#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import subprocess
import platform

def check_python_version():
    """检查 Python 版本"""
    version = sys.version_info
    print(f"Python 版本: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print("警告: AKShare 推荐使用 Python 3.7 或更高版本")
        return False
    
    return True

def install_package(package_name):
    """安装 Python 包"""
    print(f"正在安装 {package_name}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", package_name])
        return True
    except subprocess.CalledProcessError as e:
        print(f"安装 {package_name} 失败: {e}")
        return False

def check_package(package_name):
    """检查 Python 包是否已安装"""
    try:
        __import__(package_name)
        return True
    except ImportError:
        return False

def main():
    """主函数"""
    print("=" * 50)
    print("AKShare 安装脚本")
    print("=" * 50)
    
    # 检查 Python 版本
    if not check_python_version():
        print("请升级 Python 版本后再运行此脚本")
        return
    
    # 升级 pip
    print("正在升级 pip...")
    install_package("pip")
    
    # 安装 AKShare
    if check_package("akshare"):
        import akshare
        print(f"AKShare 已安装，版本: {akshare.__version__}")
    else:
        print("AKShare 未安装，正在安装...")
        if install_package("akshare"):
            import akshare
            print(f"AKShare 安装成功，版本: {akshare.__version__}")
        else:
            print("AKShare 安装失败，请手动安装")
            return
    
    # 安装其他依赖库
    dependencies = ["pandas", "sqlalchemy", "pymysql"]
    for dep in dependencies:
        if check_package(dep):
            module = __import__(dep)
            version = getattr(module, "__version__", "未知")
            print(f"{dep} 已安装，版本: {version}")
        else:
            print(f"{dep} 未安装，正在安装...")
            if install_package(dep):
                module = __import__(dep)
                version = getattr(module, "__version__", "未知")
                print(f"{dep} 安装成功，版本: {version}")
            else:
                print(f"{dep} 安装失败，请手动安装")
    
    print("=" * 50)
    print("安装完成！")
    print("=" * 50)

if __name__ == "__main__":
    main()
