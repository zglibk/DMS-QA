#!/usr/bin/env node

/**
 * DMS-QA 版本兼容性测试脚本
 * 测试项目在不同Node.js版本下的兼容性
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试的Node.js版本列表
const TEST_VERSIONS = [
  '16.0.0',
  '16.20.2',
  '18.17.0',
  '18.20.8',
  '20.0.0',
  '20.11.0'
];

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

function getCurrentNodeVersion() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    return version.replace('v', '');
  } catch (error) {
    return null;
  }
}

function testDependencyInstallation(projectPath) {
  try {
    log(`  📦 测试依赖安装: ${path.basename(projectPath)}`, 'blue');
    
    // 清理现有依赖
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    const packageLockPath = path.join(projectPath, 'package-lock.json');
    
    if (fs.existsSync(nodeModulesPath)) {
      execSync(`rm -rf "${nodeModulesPath}"`, { cwd: projectPath });
    }
    if (fs.existsSync(packageLockPath)) {
      execSync(`rm -f "${packageLockPath}"`, { cwd: projectPath });
    }
    
    // 安装依赖
    execSync('npm install', { 
      cwd: projectPath, 
      stdio: 'pipe',
      timeout: 300000 // 5分钟超时
    });
    
    log(`    ✓ 依赖安装成功`, 'green');
    return true;
  } catch (error) {
    log(`    ✗ 依赖安装失败: ${error.message}`, 'red');
    return false;
  }
}

function testProjectBuild(projectPath) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return true; // 跳过没有package.json的目录
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.build) {
      log(`  🔨 测试项目构建: ${path.basename(projectPath)}`, 'blue');
      
      execSync('npm run build', { 
        cwd: projectPath, 
        stdio: 'pipe',
        timeout: 300000 // 5分钟超时
      });
      
      log(`    ✓ 项目构建成功`, 'green');
    }
    
    return true;
  } catch (error) {
    log(`    ✗ 项目构建失败: ${error.message}`, 'red');
    return false;
  }
}

function testNodeVersion(version) {
  log(`\n🧪 测试Node.js版本: ${version}`, 'bold');
  log('-'.repeat(50), 'blue');
  
  const currentVersion = getCurrentNodeVersion();
  if (currentVersion !== version) {
    log(`⚠️  当前Node.js版本: ${currentVersion}, 需要版本: ${version}`, 'yellow');
    log(`请使用nvm或其他版本管理工具切换到版本 ${version}`, 'yellow');
    return false;
  }
  
  let allPassed = true;
  
  // 测试前端项目
  const frontendPath = path.join(__dirname, '../frontend');
  if (fs.existsSync(frontendPath)) {
    allPassed &= testDependencyInstallation(frontendPath);
    allPassed &= testProjectBuild(frontendPath);
  }
  
  // 测试后端项目
  const serverPath = path.join(__dirname, '../server');
  if (fs.existsSync(serverPath)) {
    allPassed &= testDependencyInstallation(serverPath);
  }
  
  return allPassed;
}

function generateCompatibilityReport(results) {
  log('\n📊 版本兼容性报告', 'bold');
  log('='.repeat(60), 'blue');
  
  const reportPath = path.join(__dirname, '../docs/版本兼容性报告.md');
  let reportContent = `# DMS-QA 版本兼容性报告

生成时间: ${new Date().toLocaleString('zh-CN')}

## 测试结果

| Node.js版本 | 状态 | 说明 |
|-------------|------|------|
`;

  results.forEach(result => {
    const status = result.passed ? '✅ 通过' : '❌ 失败';
    const note = result.passed ? '完全兼容' : '存在兼容性问题';
    
    reportContent += `| ${result.version} | ${status} | ${note} |\n`;
    
    const statusColor = result.passed ? 'green' : 'red';
    log(`Node.js ${result.version}: ${status}`, statusColor);
  });

  reportContent += `
## 推荐版本

基于测试结果，推荐使用以下版本：

- **生产环境**: Node.js v18.20.8 (LTS)
- **开发环境**: Node.js v18.20.8 或更高版本
- **最低要求**: Node.js v16.0.0

## 注意事项

1. 不同版本的Node.js可能存在依赖包兼容性差异
2. 建议团队统一使用推荐版本进行开发
3. 生产部署前请在目标环境进行充分测试

## 故障排除

如果遇到版本兼容性问题：

1. 清理npm缓存: \`npm cache clean --force\`
2. 删除node_modules重新安装: \`rm -rf node_modules package-lock.json && npm install\`
3. 使用推荐版本的Node.js
4. 查看详细错误日志进行针对性修复

---

*此报告由自动化测试脚本生成*
`;

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  log(`\n📄 兼容性报告已生成: ${reportPath}`, 'green');
}

function main() {
  log('🔬 DMS-QA 版本兼容性测试', 'bold');
  log('='.repeat(60), 'blue');
  
  const currentVersion = getCurrentNodeVersion();
  if (!currentVersion) {
    log('❌ 无法获取当前Node.js版本', 'red');
    process.exit(1);
  }
  
  log(`当前Node.js版本: ${currentVersion}`, 'blue');
  
  // 如果当前版本在测试列表中，则进行测试
  if (TEST_VERSIONS.includes(currentVersion)) {
    const result = testNodeVersion(currentVersion);
    
    const results = [{
      version: currentVersion,
      passed: result
    }];
    
    generateCompatibilityReport(results);
    
    if (result) {
      log('\n🎉 当前版本兼容性测试通过！', 'green');
    } else {
      log('\n❌ 当前版本存在兼容性问题', 'red');
      process.exit(1);
    }
  } else {
    log('\n⚠️  当前版本不在标准测试列表中', 'yellow');
    log('建议使用以下推荐版本之一:', 'yellow');
    TEST_VERSIONS.forEach(version => {
      log(`  - Node.js v${version}`, 'yellow');
    });
  }
  
  log('\n💡 提示:', 'blue');
  log('- 使用 nvm 可以轻松切换Node.js版本', 'blue');
  log('- 完整测试需要在多个版本下运行此脚本', 'blue');
  log('- 生产部署前请确保版本兼容性', 'blue');
}

if (require.main === module) {
  main();
}

module.exports = { testNodeVersion, generateCompatibilityReport };
