#!/usr/bin/env node

/**
 * Build optimization script for stock-analysis-web
 * This script analyzes and optimizes the build output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const distDir = path.resolve(__dirname, '../dist');
const sizeThreshold = 500 * 1024; // 500KB
const environment = process.env.NODE_ENV || 'production';

console.log(`Running build optimization for ${environment} environment`);

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory not found. Run build first.');
  process.exit(1);
}

// Analyze bundle sizes
console.log('Analyzing bundle sizes...');
const jsDir = path.join(distDir, 'assets/js');
const cssDir = path.join(distDir, 'assets/css');

if (fs.existsSync(jsDir)) {
  const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
  
  console.log('\nJavaScript bundles:');
  jsFiles.forEach(file => {
    const filePath = path.join(jsDir, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`${file}: ${sizeMB} MB`);
    
    // Flag large bundles
    if (stats.size > sizeThreshold) {
      console.log(`  ⚠️ Large bundle detected: ${file}`);
    }
  });
}

if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
  
  console.log('\nCSS bundles:');
  cssFiles.forEach(file => {
    const filePath = path.join(cssDir, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`${file}: ${sizeKB} KB`);
  });
}

// Check for duplicate dependencies
console.log('\nChecking for duplicate dependencies...');
try {
  const output = execSync('npm ls --depth=0').toString();
  console.log(output);
} catch (error) {
  console.log('Warning: Some dependencies may have issues or duplicates');
}

// Generate build report
console.log('\nGenerating build report...');
const htmlFiles = fs.readdirSync(distDir).filter(file => file.endsWith('.html'));
const totalJsSize = getTotalSize(jsDir, '.js');
const totalCssSize = getTotalSize(cssDir, '.css');

const report = {
  timestamp: new Date().toISOString(),
  environment,
  htmlFiles: htmlFiles.length,
  jsFiles: fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter(file => file.endsWith('.js')).length : 0,
  cssFiles: fs.existsSync(cssDir) ? fs.readdirSync(cssDir).filter(file => file.endsWith('.css')).length : 0,
  totalJsSizeMB: (totalJsSize / (1024 * 1024)).toFixed(2),
  totalCssSizeKB: (totalCssSize / 1024).toFixed(2),
};

// Save report
fs.writeFileSync(
  path.join(distDir, 'build-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\nBuild optimization completed');
console.log(`Build report saved to ${path.join(distDir, 'build-report.json')}`);

// Helper function to calculate total size
function getTotalSize(directory, extension) {
  if (!fs.existsSync(directory)) {
    return 0;
  }
  
  return fs.readdirSync(directory)
    .filter(file => file.endsWith(extension))
    .reduce((total, file) => {
      return total + fs.statSync(path.join(directory, file)).size;
    }, 0);
}