#!/bin/bash

# 创建风险监控表的脚本

echo "开始创建风险监控相关表..."

# 执行SQL文件
mysql -u root -proot stock_analysis < create_risk_monitoring_tables.sql

if [ $? -eq 0 ]; then
    echo "风险监控表创建成功！"
else
    echo "风险监控表创建失败！"
    exit 1
fi
