@echo off
echo Creating database...
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS stock_analysis CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

echo Creating tables...
cd %~dp0
mysql -u root -proot stock_analysis < database/create_tables.sql

echo Database setup completed!
pause
