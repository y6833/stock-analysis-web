#!/usr/bin/env node

/**
 * Deployment History Management Script
 * Manages deployment history and provides rollback capabilities
 * 
 * Usage:
 *   node deployment-history.js list [environment]
 *   node deployment-history.js show [environment] [version]
 *   node deployment-history.js clean [environment] [keep-count]
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const environment = args[1];
const param = args[2];

// Validate arguments
if (!command) {
  console.error('Error: Command not specified');
  showUsage();
  process.exit(1);
}

if (!environment) {
  console.error('Error: Environment not specified');
  showUsage();
  process.exit(1);
}

// Define paths
const deploymentsDir = path.resolve(process.cwd(), 'deployments');
const backupBaseDir = environment === 'production' 
  ? '/var/backups/stock-analysis-web' 
  : '/var/backups/stock-analysis-web-staging';

// Ensure deployments directory exists
if (!fs.existsSync(deploymentsDir)) {
  fs.mkdirSync(deploymentsDir, { recursive: true });
}

// Execute command
switch (command) {
  case 'list':
    listDeployments(environment);
    break;
  case 'show':
    showDeployment(environment, param);
    break;
  case 'clean':
    cleanDeployments(environment, parseInt(param, 10) || 10);
    break;
  default:
    console.error(`Error: Unknown command '${command}'`);
    showUsage();
    process.exit(1);
}

/**
 * Show usage information
 */
function showUsage() {
  console.log('Usage:');
  console.log('  node deployment-history.js list [environment]');
  console.log('  node deployment-history.js show [environment] [version]');
  console.log('  node deployment-history.js clean [environment] [keep-count]');
  console.log('');
  console.log('Examples:');
  console.log('  node deployment-history.js list production');
  console.log('  node deployment-history.js show staging 42');
  console.log('  node deployment-history.js clean production 10');
}

/**
 * List deployments for the specified environment
 * @param {string} env Environment name
 */
function listDeployments(env) {
  console.log(`Deployment history for ${env} environment:`);
  
  // Get deployment info files
  const pattern = new RegExp(`^${env}_\\d+\\.txt$`);
  const files = fs.readdirSync(deploymentsDir)
    .filter(file => pattern.test(file))
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[1], 10);
      const numB = parseInt(b.split('_')[1], 10);
      return numB - numA; // Sort descending
    });
  
  if (files.length === 0) {
    console.log('No deployments found');
    return;
  }
  
  // Get latest deployment
  let latestBuild = '';
  try {
    const latestBuildFile = path.join(deploymentsDir, `${env}_latest_build`);
    if (fs.existsSync(latestBuildFile)) {
      latestBuild = fs.readFileSync(latestBuildFile, 'utf8').trim();
    }
  } catch (error) {
    // Ignore error
  }
  
  // Display deployments
  console.log('Version | Date       | Commit      | Status');
  console.log('--------|------------|-------------|-------');
  
  files.forEach(file => {
    try {
      const filePath = path.join(deploymentsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract info from filename and content
      const version = file.split('_')[1].replace('.txt', '');
      const dateMatch = content.match(/Timestamp: (.+)/);
      const commitMatch = content.match(/Commit: (.+)/);
      
      const date = dateMatch ? dateMatch[1].substring(0, 10) : 'Unknown';
      const commit = commitMatch ? commitMatch[1].substring(0, 10) : 'Unknown';
      const status = version === latestBuild ? 'Current' : '';
      
      console.log(`${version.padEnd(8)} | ${date} | ${commit} | ${status}`);
    } catch (error) {
      console.log(`${file} | Error reading file`);
    }
  });
  
  // List available backups
  console.log('\nAvailable backups:');
  try {
    if (fs.existsSync(backupBaseDir)) {
      const backups = fs.readdirSync(backupBaseDir)
        .filter(dir => dir.startsWith('backup_'))
        .sort((a, b) => b.localeCompare(a)); // Sort descending
      
      if (backups.length === 0) {
        console.log('No backups found');
      } else {
        backups.forEach(backup => {
          const stats = fs.statSync(path.join(backupBaseDir, backup));
          const date = new Date(stats.mtime).toISOString().substring(0, 10);
          console.log(`${backup} | ${date}`);
        });
      }
    } else {
      console.log('Backup directory not found');
    }
  } catch (error) {
    console.log(`Error listing backups: ${error.message}`);
  }
}

/**
 * Show details of a specific deployment
 * @param {string} env Environment name
 * @param {string} version Deployment version
 */
function showDeployment(env, version) {
  if (!version) {
    console.error('Error: Version not specified');
    showUsage();
    process.exit(1);
  }
  
  // Check if it's a deployment info file
  const infoFile = path.join(deploymentsDir, `${env}_${version}.txt`);
  if (fs.existsSync(infoFile)) {
    console.log(`Deployment details for ${env} version ${version}:`);
    console.log(fs.readFileSync(infoFile, 'utf8'));
    return;
  }
  
  // Check if it's a backup directory
  if (version.startsWith('backup_')) {
    const backupDir = path.join(backupBaseDir, version);
    if (fs.existsSync(backupDir)) {
      console.log(`Backup details for ${version}:`);
      
      // Get directory stats
      const stats = fs.statSync(backupDir);
      console.log(`Created: ${stats.mtime}`);
      
      // List files in backup
      console.log('\nFiles:');
      const files = fs.readdirSync(backupDir);
      files.forEach(file => {
        const fileStat = fs.statSync(path.join(backupDir, file));
        const isDir = fileStat.isDirectory();
        console.log(`${isDir ? '[DIR]' : '[FILE]'} ${file}`);
      });
      
      return;
    }
  }
  
  console.error(`Error: Deployment version ${version} not found for ${env} environment`);
  process.exit(1);
}

/**
 * Clean old deployments, keeping the specified number
 * @param {string} env Environment name
 * @param {number} keepCount Number of deployments to keep
 */
function cleanDeployments(env, keepCount) {
  if (isNaN(keepCount) || keepCount < 1) {
    console.error('Error: Invalid keep-count, must be a positive number');
    showUsage();
    process.exit(1);
  }
  
  console.log(`Cleaning deployment history for ${env} environment, keeping ${keepCount} most recent deployments`);
  
  // Get deployment info files
  const pattern = new RegExp(`^${env}_\\d+\\.txt$`);
  const files = fs.readdirSync(deploymentsDir)
    .filter(file => pattern.test(file))
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[1], 10);
      const numB = parseInt(b.split('_')[1], 10);
      return numB - numA; // Sort descending
    });
  
  if (files.length === 0) {
    console.log('No deployments found');
    return;
  }
  
  // Keep the most recent ones and delete the rest
  const filesToKeep = files.slice(0, keepCount);
  const filesToDelete = files.slice(keepCount);
  
  if (filesToDelete.length === 0) {
    console.log(`No deployments to delete (found ${files.length}, keeping ${keepCount})`);
    return;
  }
  
  console.log(`Deleting ${filesToDelete.length} old deployment records`);
  filesToDelete.forEach(file => {
    try {
      fs.unlinkSync(path.join(deploymentsDir, file));
      console.log(`Deleted ${file}`);
    } catch (error) {
      console.error(`Error deleting ${file}: ${error.message}`);
    }
  });
  
  console.log('Deployment history cleanup completed');
}