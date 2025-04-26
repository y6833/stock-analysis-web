@echo off
echo Installing dependencies...
npm install egg egg-cors egg-jwt egg-sequelize mysql2 egg-scripts
npm install --save-dev egg-bin egg-ci egg-mock eslint eslint-config-egg
echo Dependencies installed successfully!
pause
