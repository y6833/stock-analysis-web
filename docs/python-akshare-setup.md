# Python + AKShare 环境配置指南

## 🎯 问题解决

您遇到的 `ReadTimeoutError` 是网络超时问题，这在中国大陆访问PyPI时很常见。

## 🚀 快速解决方案

### 方法1：使用国内镜像源（推荐）

```bash
# 使用清华大学镜像源（推荐）
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests

# 如果上面失败，尝试阿里云镜像
pip install -i https://mirrors.aliyun.com/pypi/simple/ akshare pandas requests

# 或者使用豆瓣镜像
pip install -i https://pypi.douban.com/simple/ akshare pandas requests
```

### 方法2：永久配置镜像源

**Windows系统：**
```cmd
# 创建pip配置目录
mkdir %APPDATA%\pip

# 创建配置文件 pip.ini
echo [global] > %APPDATA%\pip\pip.ini
echo index-url = https://pypi.tuna.tsinghua.edu.cn/simple/ >> %APPDATA%\pip\pip.ini
echo trusted-host = pypi.tuna.tsinghua.edu.cn >> %APPDATA%\pip\pip.ini
echo timeout = 60 >> %APPDATA%\pip\pip.ini
```

**或者手动创建文件：**
1. 打开文件管理器，输入 `%APPDATA%\pip`
2. 如果目录不存在，创建 `pip` 文件夹
3. 在该目录下创建 `pip.ini` 文件，内容如下：

```ini
[global]
index-url = https://pypi.tuna.tsinghua.edu.cn/simple/
trusted-host = pypi.tuna.tsinghua.edu.cn
timeout = 60
```

配置完成后，直接运行：
```bash
pip install akshare pandas requests
```

## 🔧 分步安装（如果上述方法仍有问题）

```bash
# 1. 先更新pip
python -m pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple/

# 2. 分别安装依赖
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ numpy
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ pandas
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ requests
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ lxml
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ beautifulsoup4

# 3. 最后安装akshare
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare
```

## 🌐 网络问题解决

### 如果仍然超时，尝试：

```bash
# 增加超时时间到120秒
pip install --timeout 120 -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests

# 使用代理（如果您有代理）
pip install --proxy http://proxy.company.com:8080 -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare

# 禁用缓存
pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests
```

## ✅ 验证安装

```bash
# 检查Python版本
python --version

# 验证所有库是否安装成功
python -c "
import sys
print('Python版本:', sys.version)

try:
    import akshare as ak
    print('✅ AKShare版本:', ak.__version__)
except ImportError as e:
    print('❌ AKShare导入失败:', e)

try:
    import pandas as pd
    print('✅ Pandas版本:', pd.__version__)
except ImportError as e:
    print('❌ Pandas导入失败:', e)

try:
    import requests
    print('✅ Requests版本:', requests.__version__)
except ImportError as e:
    print('❌ Requests导入失败:', e)
"
```

## 🔍 测试AKShare功能

```bash
# 测试AKShare基本功能
python -c "
import akshare as ak
print('正在测试AKShare连接...')

try:
    # 获取股票基本信息
    stock_info = ak.stock_info_a_code_name()
    print(f'✅ 成功获取股票列表，共 {len(stock_info)} 只股票')
    
    # 测试获取股票行情
    stock_zh_a_hist = ak.stock_zh_a_hist(symbol='000001', period='daily', start_date='20240101', end_date='20240102')
    print(f'✅ 成功获取历史行情数据')
    
    print('🎉 AKShare功能测试通过！')
except Exception as e:
    print(f'❌ AKShare测试失败: {e}')
    print('请检查网络连接或稍后重试')
"
```

## 🐍 Python环境管理建议

### 使用虚拟环境（推荐）

```bash
# 创建虚拟环境
python -m venv stock_analysis_env

# 激活虚拟环境
# Windows:
stock_analysis_env\Scripts\activate
# macOS/Linux:
# source stock_analysis_env/bin/activate

# 在虚拟环境中安装依赖
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests

# 验证安装
python -c "import akshare as ak; print('AKShare版本:', ak.__version__)"
```

### 使用Anaconda（替代方案）

如果pip持续有问题，可以考虑使用Anaconda：

```bash
# 下载并安装Anaconda
# https://www.anaconda.com/products/distribution

# 创建新环境
conda create -n stock_analysis python=3.9

# 激活环境
conda activate stock_analysis

# 安装依赖
conda install pandas requests
pip install akshare
```

## 🔧 常见问题解决

### 1. SSL证书错误
```bash
pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare
```

### 2. 权限错误
```bash
# Windows: 以管理员身份运行命令提示符
# 或使用用户安装
pip install --user -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests
```

### 3. 版本冲突
```bash
# 强制重新安装
pip install --force-reinstall -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests
```

## 📝 环境变量配置

安装完成后，在项目根目录的 `.env` 文件中添加：

```bash
# Python环境配置
PYTHON_PATH=python
AKSHARE_CACHE_DURATION=300
DEBUG_AKSHARE=false
```

## 🚀 完成后的下一步

1. **重启开发服务器**：
   ```bash
   npm run dev
   ```

2. **运行数据源检查**：
   ```bash
   npm run check-datasources
   ```

3. **测试AKShare数据源**：
   - 进入数据源设置页面
   - 点击"一键测试所有数据源"
   - 查看AKShare是否连接成功

## 💡 性能优化建议

安装完成后，为了提高AKShare的性能：

```python
# 在Python脚本中设置
import akshare as ak

# 设置请求头，避免被反爬虫
ak.set_token("your_token_here")  # 如果有token的话

# 设置缓存
import os
os.environ['AKSHARE_CACHE_DURATION'] = '300'  # 5分钟缓存
```

通过以上步骤，您应该能够成功安装AKShare并解决网络超时问题。如果仍有问题，建议使用我们推荐的增强版数据源作为替代方案。
