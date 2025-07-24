#!/bin/bash

# Rollback script for stock-analysis-web
# Usage: ./rollback.sh [environment] [version]

set -e

ENVIRONMENT=$1
VERSION=$2
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
BACKUP_DIR="deployments/rollback_$(date +%Y%m%d_%H%M%S)"

if [ -z "$ENVIRONMENT" ]; then
  echo "[$TIMESTAMP] Error: Environment not specified (staging or production)"
  exit 1
fi

if [ -z "$VERSION" ]; then
  echo "[$TIMESTAMP] Error: Version not specified"
  exit 1
fi

echo "[$TIMESTAMP] Starting rollback for $ENVIRONMENT environment to version $VERSION"

# Create backup of current deployment
echo "[$TIMESTAMP] Creating backup of current deployment to $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r dist "$BACKUP_DIR/"
cp -r server "$BACKUP_DIR/"
cp -r scripts "$BACKUP_DIR/"
cp package.json "$BACKUP_DIR/"
cp package-lock.json "$BACKUP_DIR/"
cp .env.* "$BACKUP_DIR/" 2>/dev/null || true

# Determine backup source
BACKUP_SOURCE=""
if [[ "$VERSION" == backup_* ]]; then
  # Version is a backup directory name
  if [ "$ENVIRONMENT" == "production" ]; then
    BACKUP_SOURCE="/var/backups/stock-analysis-web/$VERSION"
  else
    BACKUP_SOURCE="/var/backups/stock-analysis-web-staging/$VERSION"
  fi
  
  if [ ! -d "$BACKUP_SOURCE" ]; then
    echo "[$TIMESTAMP] Error: Backup directory $BACKUP_SOURCE not found"
    exit 1
  fi
else
  # Version is a build number or tag
  if [ "$ENVIRONMENT" == "production" ]; then
    BACKUP_SOURCE="deployments/production_$VERSION.txt"
  else
    BACKUP_SOURCE="deployments/staging_$VERSION.txt"
  fi
  
  if [ ! -f "$BACKUP_SOURCE" ]; then
    echo "[$TIMESTAMP] Error: Build $VERSION not found in deployment history"
    exit 1
  fi
  
  # Extract backup directory from deployment info
  BACKUP_DIR_INFO=$(grep "Backup:" "$BACKUP_SOURCE" | cut -d' ' -f2)
  if [ -n "$BACKUP_DIR_INFO" ] && [ -d "$BACKUP_DIR_INFO" ]; then
    BACKUP_SOURCE="$BACKUP_DIR_INFO"
  else
    echo "[$TIMESTAMP] Error: Could not determine backup directory for version $VERSION"
    exit 1
  fi
fi

echo "[$TIMESTAMP] Restoring from $BACKUP_SOURCE"

# Stop the application
echo "[$TIMESTAMP] Stopping application"
pm2 stop stock-analysis-web-server || true
pm2 stop stock-analysis-web-proxy || true

# Restore files
echo "[$TIMESTAMP] Restoring files"
rm -rf dist/* server/* scripts/*
cp -r "$BACKUP_SOURCE/dist" ./ || cp -r "$BACKUP_SOURCE/dist" ./
cp -r "$BACKUP_SOURCE/server" ./ || cp -r "$BACKUP_SOURCE/server" ./
cp -r "$BACKUP_SOURCE/scripts" ./ || cp -r "$BACKUP_SOURCE/scripts" ./
cp "$BACKUP_SOURCE/package.json" ./ || cp "$BACKUP_SOURCE/package.json" ./
cp "$BACKUP_SOURCE/package-lock.json" ./ || cp "$BACKUP_SOURCE/package-lock.json" ./

# Restore environment-specific files
if [ -f "$BACKUP_SOURCE/.env.$ENVIRONMENT" ]; then
  cp "$BACKUP_SOURCE/.env.$ENVIRONMENT" "./.env.$ENVIRONMENT"
fi

if [ -f "$BACKUP_SOURCE/.env.$ENVIRONMENT.local" ]; then
  cp "$BACKUP_SOURCE/.env.$ENVIRONMENT.local" "./.env.$ENVIRONMENT.local"
fi

# Restart the application
echo "[$TIMESTAMP] Restarting application"
pm2 reload server/pm2.config.js --env "$ENVIRONMENT" || pm2 start server/pm2.config.js --env "$ENVIRONMENT"

# Verify the application is running
echo "[$TIMESTAMP] Verifying application is running"
sleep 5
if ! pm2 show stock-analysis-web-server | grep -q "online"; then
  echo "[$TIMESTAMP] Error: Application failed to start after rollback"
  exit 1
fi

# Create rollback marker
echo "[$TIMESTAMP] Creating rollback marker"
echo "{\"version\": \"rollback-$VERSION\", \"environment\": \"$ENVIRONMENT\", \"timestamp\": \"$TIMESTAMP\", \"original_version\": \"$VERSION\"}" > ./dist/rollback-info.json

echo "[$TIMESTAMP] Rollback completed successfully"