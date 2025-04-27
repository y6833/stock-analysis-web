# 检查 Python 是否已安装
$pythonInstalled = $false
try {
    $pythonVersion = python --version
    Write-Host "Python 已安装: $pythonVersion"
    $pythonInstalled = $true
} catch {
    Write-Host "Python 未安装"
}

# 如果 Python 未安装，提示用户安装
if (-not $pythonInstalled) {
    Write-Host "请先安装 Python 3.7 或更高版本，然后再运行此脚本"
    Write-Host "可以从 https://www.python.org/downloads/ 下载安装"
    exit 1
}

# 安装 AKShare 库
Write-Host "正在安装 AKShare 库..."
python -m pip install --upgrade pip
python -m pip install akshare

# 检查 AKShare 是否安装成功
try {
    python -c "import akshare; print('AKShare 版本:', akshare.__version__)"
    Write-Host "AKShare 安装成功！"
} catch {
    Write-Host "AKShare 安装失败，请检查错误信息"
    exit 1
}

Write-Host "安装完成！"
