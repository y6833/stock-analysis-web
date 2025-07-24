# PowerShell Deployment Script for Windows Environments
# Usage: .\deploy-windows.ps1 -Environment [development|staging|production]

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "[$timestamp] Starting deployment for $Environment environment"

# Set environment-specific variables
$envFile = ".env.$Environment"
if (Test-Path $envFile) {
    Write-Host "[$timestamp] Loading environment variables from $envFile"
    Get-Content $envFile | ForEach-Object {
        if (!$_.StartsWith("#") -and $_.Contains("=")) {
            $key, $value = $_ -split '=', 2
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "[$timestamp] Warning: $envFile not found"
}

# Build the application
Write-Host "[$timestamp] Building application for $Environment environment"
$env:NODE_ENV = $Environment
npm run build

# Create deployment directory if it doesn't exist
$deployDir = "D:\deployments\stock-analysis-web\$Environment"
if (!(Test-Path $deployDir)) {
    Write-Host "[$timestamp] Creating deployment directory: $deployDir"
    New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
}

# Copy build files to deployment directory
Write-Host "[$timestamp] Copying build files to deployment directory"
Copy-Item -Path ".\dist\*" -Destination $deployDir -Recurse -Force

# Copy server files if needed
if ($Environment -ne "development") {
    Write-Host "[$timestamp] Copying server files"
    Copy-Item -Path ".\server\*" -Destination "$deployDir\server" -Recurse -Force -Exclude "node_modules"
    
    # Copy environment files
    Copy-Item -Path ".\.env.$Environment" -Destination "$deployDir\.env" -Force
    Copy-Item -Path ".\.env.$Environment.local" -Destination "$deployDir\.env.local" -Force
    
    # Copy PM2 configuration
    Copy-Item -Path ".\server\pm2.config.js" -Destination "$deployDir\server\pm2.config.js" -Force
}

# Create deployment marker
Write-Host "[$timestamp] Creating deployment marker"
$version = (Get-Content .\package.json | ConvertFrom-Json).version
$deploymentInfo = @{
    version = $version
    environment = $Environment
    timestamp = $timestamp
} | ConvertTo-Json

Set-Content -Path "$deployDir\deployment-info.json" -Value $deploymentInfo

# Restart services if needed
if ($Environment -ne "development") {
    Write-Host "[$timestamp] Restarting services"
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        Set-Location $deployDir
        pm2 reload server/pm2.config.js --env $Environment
    } else {
        Write-Host "[$timestamp] Warning: PM2 not found, skipping service restart"
    }
}

Write-Host "[$timestamp] Deployment completed successfully"