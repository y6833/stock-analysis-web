#!/bin/bash

# Post-deployment script for stock-analysis-web
# Usage: ./post-deploy.sh [environment]

ENVIRONMENT=$1
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Running post-deployment script for $ENVIRONMENT environment"

# Load environment-specific variables
if [ -f ".env.$ENVIRONMENT" ]; then
  echo "[$TIMESTAMP] Loading environment variables from .env.$ENVIRONMENT"
  export $(grep -v '^#' .env.$ENVIRONMENT | xargs)
else
  echo "[$TIMESTAMP] Warning: .env.$ENVIRONMENT file not found"
fi

# Restart the application server
echo "[$TIMESTAMP] Restarting application server"
if [ -f "server/pm2.config.js" ]; then
  pm2 reload server/pm2.config.js --env $ENVIRONMENT
else
  echo "[$TIMESTAMP] Warning: PM2 config not found, using default restart"
  pm2 reload stock-analysis-web-server || echo "[$TIMESTAMP] Failed to restart server with PM2"
fi

# Clear server-side cache if needed
echo "[$TIMESTAMP] Clearing server-side cache"
if [ -f "scripts/clear-cache.js" ]; then
  node scripts/clear-cache.js $ENVIRONMENT
fi

# Run database migrations if needed
echo "[$TIMESTAMP] Running database migrations"
if [ -f "run-migrations.js" ]; then
  node run-migrations.js --env $ENVIRONMENT
fi

# Update permissions if needed
echo "[$TIMESTAMP] Updating file permissions"
find ./dist -type f -exec chmod 644 {} \;
find ./dist -type d -exec chmod 755 {} \;

# Create deployment marker
echo "[$TIMESTAMP] Creating deployment marker"
echo "{\"version\": \"$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')\", \"environment\": \"$ENVIRONMENT\", \"timestamp\": \"$TIMESTAMP\"}" > ./dist/deployment-info.json

echo "[$TIMESTAMP] Post-deployment completed successfully"