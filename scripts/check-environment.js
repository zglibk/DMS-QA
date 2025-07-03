#!/usr/bin/env node

/**
 * DMS-QA 环境检查脚本
 * 检查Node.js、npm版本是否符合项目要求
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkVersion(command, minVersion, recommendedVersion) {
  try {
    const version = execSync(command, { encoding: 'utf8' }).trim();
    const versionNumber = version.replace(/[^\d.]/g, '');
    
    log(`✓ ${command}: ${version}`, 'green');
    
    if (versionNumber === recommendedVersion) {
      log(`  推荐版本 ✓`, 'green');
    } else if (compareVersions(versionNumber, minVersion) >= 0) {
      log(`  版本符合要求 (最低要求: ${minVersion})`, 'yellow');
      log(`  建议升级到推荐版本: ${recommendedVersion}`, 'yellow');
    } else {
      log(`  ✗ 版本过低! 最低要求: ${minVersion}, 推荐版本: ${recommendedVersion}`, 'red');
      return false;
    }
    return true;
  } catch (error) {
    log(`✗ ${command} 未安装或无法执行`, 'red');
    return false;
  }
}

function compareVersions(version1, version2) {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part > v2part) return 1;
    if (v1part < v2part) return -1;
  }
  return 0;
}

function checkPackageJson() {
  const frontendPackage = path.join(__dirname, '../frontend/package.json');
  const serverPackage = path.join(__dirname, '../server/package.json');
  
  log('\n📦 检查package.json配置...', 'blue');
  
  [frontendPackage, serverPackage].forEach(packagePath => {
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const relativePath = path.relative(process.cwd(), packagePath);
      
      log(`✓ ${relativePath}`, 'green');
      
      if (pkg.engines) {
        log(`  Node.js要求: ${pkg.engines.node}`, 'blue');
        log(`  npm要求: ${pkg.engines.npm}`, 'blue');
      } else {
        log(`  ⚠️ 未配置engines字段`, 'yellow');
      }
    }
  });
}

function checkDependencies() {
  log('\n📋 检查关键依赖...', 'blue');
  
  const frontendNodeModules = path.join(__dirname, '../frontend/node_modules');
  const serverNodeModules = path.join(__dirname, '../server/node_modules');
  
  if (fs.existsSync(frontendNodeModules)) {
    log('✓ 前端依赖已安装', 'green');
  } else {
    log('✗ 前端依赖未安装，请运行: cd frontend && npm install', 'red');
  }
  
  if (fs.existsSync(serverNodeModules)) {
    log('✓ 后端依赖已安装', 'green');
  } else {
    log('✗ 后端依赖未安装，请运行: cd server && npm install', 'red');
  }
}

function main() {
  log('🔍 DMS-QA 环境检查', 'bold');
  log('='.repeat(50), 'blue');
  
  let allPassed = true;
  
  // 检查Node.js版本
  log('\n🟢 检查Node.js...', 'blue');
  allPassed &= checkVersion('node --version', '16.0.0', '18.20.8');
  
  // 检查npm版本
  log('\n📦 检查npm...', 'blue');
  allPassed &= checkVersion('npm --version', '8.0.0', '10.8.2');
  
  // 检查Git版本
  log('\n🔧 检查Git...', 'blue');
  checkVersion('git --version', '2.0.0', '最新版本');
  
  // 检查package.json配置
  checkPackageJson();
  
  // 检查依赖安装情况
  checkDependencies();
  
  // 输出结果
  log('\n' + '='.repeat(50), 'blue');
  if (allPassed) {
    log('🎉 环境检查通过！可以开始开发了。', 'green');
  } else {
    log('❌ 环境检查失败，请根据上述提示修复问题。', 'red');
    log('\n📖 详细配置指南: docs/环境配置指南.md', 'yellow');
    process.exit(1);
  }
  
  log('\n💡 提示:', 'yellow');
  log('- 如需安装依赖: npm run setup', 'yellow');
  log('- 如需启动开发服务器: npm run dev', 'yellow');
  log('- 如遇问题请查看: docs/环境配置指南.md', 'yellow');
}

if (require.main === module) {
  main();
}

module.exports = { checkVersion, compareVersions };
