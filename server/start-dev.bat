@echo off
echo 启动开发服务器...
set EGG_SKIP_MIGRATION=true
npx egg-bin dev
