#!/usr/bin/env node

/**
 * 更新日志生成器使用示例
 * 展示各种使用场景和配置选项
 * 
 * 使用方法：
 * node scripts/changelog-examples.js [示例名称]
 */

const { execSync } = require('child_process');
const path = require('path');

/**
 * 显示所有可用示例
 */
function showExamples() {
    console.log(`
📚 更新日志生成器使用示例

可用示例：
  1. basic          - 基础使用示例
  2. advanced       - 高级功能示例
  3. custom-config  - 自定义配置示例
  4. multiple-format - 多格式输出示例
  5. version-bump   - 版本号管理示例
  6. filter-commits - 提交过滤示例
  7. template-custom - 自定义模板示例
  8. batch-generate - 批量生成示例

使用方法：
  node scripts/changelog-examples.js [示例名称]
  
  例如：
  node scripts/changelog-examples.js basic
`);
}

/**
 * 基础使用示例
 */
function basicExample() {
    console.log('\n🎯 基础使用示例');
    console.log('=' .repeat(50));
    
    console.log('\n1. 生成当前版本的更新日志：');
    console.log('   node scripts/generate-changelog.js');
    
    console.log('\n2. 指定版本号：');
    console.log('   node scripts/generate-changelog.js --version 2.3.0');
    
    console.log('\n3. 预览模式（不写入文件）：');
    console.log('   node scripts/generate-changelog.js --version 2.3.0 --preview');
    
    console.log('\n4. 指定输出文件：');
    console.log('   node scripts/generate-changelog.js --output RELEASE_NOTES.md');
    
    console.log('\n5. 追加到现有文件：');
    console.log('   node scripts/generate-changelog.js --append');
    
    // 实际执行基础示例
    console.log('\n🚀 执行基础示例...');
    try {
        execSync('node scripts/generate-changelog.js --version 2.3.0-example --preview', {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

/**
 * 高级功能示例
 */
function advancedExample() {
    console.log('\n🚀 高级功能示例');
    console.log('=' .repeat(50));
    
    console.log('\n1. 使用高级生成器：');
    console.log('   node scripts/generate-changelog-advanced.js --version 2.3.0');
    
    console.log('\n2. 指定提交范围：');
    console.log('   node scripts/generate-changelog-advanced.js --from v2.2.0 --to HEAD');
    
    console.log('\n3. 生成JSON格式：');
    console.log('   node scripts/generate-changelog-advanced.js --format json --output changelog.json');
    
    console.log('\n4. 生成HTML格式：');
    console.log('   node scripts/generate-changelog-advanced.js --format html --output changelog.html');
    
    console.log('\n5. 同时更新package.json版本：');
    console.log('   node scripts/generate-changelog-advanced.js --version 2.3.0 --update-package');
    
    // 实际执行高级示例
    console.log('\n🚀 执行高级示例（JSON格式）...');
    try {
        execSync('node scripts/generate-changelog-advanced.js --version 2.3.0-advanced --format json --preview', {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

/**
 * 自定义配置示例
 */
function customConfigExample() {
    console.log('\n⚙️  自定义配置示例');
    console.log('=' .repeat(50));
    
    // 创建自定义配置文件
    const customConfig = {
        "title": "DMS-QA 质量管理系统更新日志",
        "description": "记录DMS-QA系统的功能更新、问题修复和性能优化。",
        "categories": {
            "features": {
                "title": "🎯 新增功能",
                "icon": "✨",
                "patterns": ["^(feat|feature|新增|添加|增加|实现)"],
                "priority": 1
            },
            "fixes": {
                "title": "🔧 问题修复",
                "icon": "🐛",
                "patterns": ["^(fix|修复|解决|修正|bugfix)"],
                "priority": 2
            },
            "performance": {
                "title": "⚡ 性能优化",
                "icon": "🚀",
                "patterns": ["^(perf|performance|优化|提升)"],
                "priority": 3
            },
            "security": {
                "title": "🔒 安全更新",
                "icon": "🛡️",
                "patterns": ["^(security|安全|权限)"],
                "priority": 4
            },
            "docs": {
                "title": "📚 文档更新",
                "icon": "📖",
                "patterns": ["^(docs|doc|文档|说明)"],
                "priority": 5
            },
            "style": {
                "title": "💄 样式调整",
                "icon": "🎨",
                "patterns": ["^(style|样式|UI|界面)"],
                "priority": 6
            },
            "test": {
                "title": "✅ 测试相关",
                "icon": "🧪",
                "patterns": ["^(test|测试|单元测试)"],
                "priority": 7
            },
            "build": {
                "title": "📦 构建相关",
                "icon": "🔨",
                "patterns": ["^(build|构建|打包|部署)"],
                "priority": 8
            },
            "other": {
                "title": "📋 其他更改",
                "icon": "📝",
                "patterns": [],
                "priority": 99
            }
        },
        "templates": {
            "version": "## 🏷️ v{version} ({date})\n\n",
            "overview": "### 📊 版本概述\n\n本版本包含 **{totalCommits}** 个提交，主要改进如下：\n\n",
            "category": "### {title}\n\n",
            "commit": "- {icon} **{subject}** ([{shortHash}](../../commit/{hash}))\n",
            "contributors": "### 👥 贡献者\n\n感谢以下开发者的贡献：**{contributors}**\n\n",
            "separator": "---\n\n"
        },
        "options": {
            "includeHash": true,
            "includeAuthor": true,
            "includeOverview": true,
            "includeContributors": true,
            "maxCommitLength": 80
        },
        "filters": {
            "excludePatterns": [
                "^Merge",
                "^merge",
                "^Initial commit",
                "^Update README",
                "^\\."
            ],
            "minCommitLength": 10
        },
        "output": {
            "defaultFile": "CHANGELOG.md",
            "encoding": "utf8"
        }
    };
    
    const fs = require('fs');
    const configPath = path.join(__dirname, 'custom-changelog-config.json');
    
    try {
        fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2), 'utf8');
        console.log(`✅ 已创建自定义配置文件: ${configPath}`);
        
        console.log('\n使用自定义配置：');
        console.log(`   node scripts/generate-changelog-advanced.js --config ${configPath}`);
        
        // 实际执行自定义配置示例
        console.log('\n🚀 执行自定义配置示例...');
        execSync(`node scripts/generate-changelog-advanced.js --config "${configPath}" --version 2.3.0-custom --preview`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
    } catch (error) {
        console.error('创建配置文件失败:', error.message);
    }
}

/**
 * 多格式输出示例
 */
function multipleFormatExample() {
    console.log('\n📄 多格式输出示例');
    console.log('=' .repeat(50));
    
    const version = '2.3.0-multi';
    
    console.log('\n生成多种格式的更新日志：');
    
    // Markdown格式
    console.log('\n1. 📝 Markdown格式：');
    console.log(`   node scripts/generate-changelog-advanced.js --version ${version} --format markdown --output changelog-${version}.md`);
    
    // JSON格式
    console.log('\n2. 📊 JSON格式：');
    console.log(`   node scripts/generate-changelog-advanced.js --version ${version} --format json --output changelog-${version}.json`);
    
    // HTML格式
    console.log('\n3. 🌐 HTML格式：');
    console.log(`   node scripts/generate-changelog-advanced.js --version ${version} --format html --output changelog-${version}.html`);
    
    // 实际执行多格式示例
    console.log('\n🚀 执行多格式示例（预览模式）...');
    
    const formats = ['markdown', 'json', 'html'];
    formats.forEach(format => {
        try {
            console.log(`\n--- ${format.toUpperCase()} 格式 ---`);
            execSync(`node scripts/generate-changelog-advanced.js --version ${version} --format ${format} --preview`, {
                stdio: 'inherit',
                cwd: process.cwd()
            });
        } catch (error) {
            console.error(`${format}格式生成失败:`, error.message);
        }
    });
}

/**
 * 版本号管理示例
 */
function versionBumpExample() {
    console.log('\n🔢 版本号管理示例');
    console.log('=' .repeat(50));
    
    console.log('\n版本号自动递增：');
    console.log('1. 补丁版本（2.2.0 → 2.2.1）：');
    console.log('   node scripts/generate-changelog-advanced.js --update-package');
    
    console.log('\n2. 次版本（2.2.0 → 2.3.0）：');
    console.log('   # 需要手动指定版本号');
    console.log('   node scripts/generate-changelog-advanced.js --version 2.3.0 --update-package');
    
    console.log('\n3. 主版本（2.2.0 → 3.0.0）：');
    console.log('   # 需要手动指定版本号');
    console.log('   node scripts/generate-changelog-advanced.js --version 3.0.0 --update-package');
    
    // 显示当前版本
    try {
        const packageJson = require(path.join(process.cwd(), 'package.json'));
        console.log(`\n📦 当前版本: ${packageJson.version}`);
        
        // 模拟版本递增
        const [major, minor, patch] = packageJson.version.split('.').map(Number);
        console.log(`\n版本递增预览：`);
        console.log(`  补丁版本: ${major}.${minor}.${patch + 1}`);
        console.log(`  次版本: ${major}.${minor + 1}.0`);
        console.log(`  主版本: ${major + 1}.0.0`);
        
    } catch (error) {
        console.error('读取package.json失败:', error.message);
    }
}

/**
 * 提交过滤示例
 */
function filterCommitsExample() {
    console.log('\n🔍 提交过滤示例');
    console.log('=' .repeat(50));
    
    // 创建过滤配置
    const filterConfig = {
        "title": "过滤示例配置",
        "categories": {
            "features": {
                "title": "✨ 新增功能",
                "icon": "🎯",
                "patterns": ["^(feat|feature|新增|添加|增加|实现)"],
                "priority": 1
            },
            "fixes": {
                "title": "🐛 问题修复",
                "icon": "🔧",
                "patterns": ["^(fix|修复|解决|修正|bugfix)"],
                "priority": 2
            }
        },
        "filters": {
            "excludePatterns": [
                "^Merge branch",
                "^Merge pull request",
                "^Initial commit",
                "^Update README",
                "^\\.",
                "^WIP",
                "^temp",
                "^临时"
            ],
            "includePatterns": [
                "^(feat|fix|新增|修复|实现|解决)"
            ],
            "minCommitLength": 8
        }
    };
    
    const fs = require('fs');
    const configPath = path.join(__dirname, 'filter-config.json');
    
    try {
        fs.writeFileSync(configPath, JSON.stringify(filterConfig, null, 2), 'utf8');
        console.log(`✅ 已创建过滤配置文件: ${configPath}`);
        
        console.log('\n过滤规则说明：');
        console.log('- 排除: Merge提交、初始提交、README更新、临时提交等');
        console.log('- 包含: 只包含功能和修复相关的提交');
        console.log('- 最小长度: 提交信息至少8个字符');
        
        console.log('\n使用过滤配置：');
        console.log(`   node scripts/generate-changelog-advanced.js --config "${configPath}" --preview`);
        
        // 实际执行过滤示例
        console.log('\n🚀 执行过滤示例...');
        execSync(`node scripts/generate-changelog-advanced.js --config "${configPath}" --version 2.3.0-filtered --preview`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
    } catch (error) {
        console.error('创建过滤配置失败:', error.message);
    }
}

/**
 * 自定义模板示例
 */
function templateCustomExample() {
    console.log('\n🎨 自定义模板示例');
    console.log('=' .repeat(50));
    
    // 创建自定义模板配置
    const templateConfig = {
        "title": "DMS-QA 发布说明",
        "description": "质量管理系统版本发布详情",
        "categories": {
            "features": {
                "title": "🚀 新功能",
                "icon": "⭐",
                "patterns": ["^(feat|feature|新增|添加|增加|实现)"],
                "priority": 1
            },
            "fixes": {
                "title": "🔧 修复内容",
                "icon": "✅",
                "patterns": ["^(fix|修复|解决|修正|bugfix)"],
                "priority": 2
            }
        },
        "templates": {
            "version": "# 🏷️ 版本 {version}\n\n> 发布日期: {date}\n\n",
            "overview": "## 📋 本次更新\n\n本版本共包含 **{totalCommits}** 项改进，详情如下：\n\n",
            "category": "## {title}\n\n",
            "commit": "- {icon} **{subject}**\n  > 提交: [{shortHash}](../../commit/{hash})\n\n",
            "contributors": "## 🙏 致谢\n\n本版本由以下开发者贡献：\n\n{contributors}\n\n感谢大家的努力！\n\n",
            "separator": "\n---\n\n"
        },
        "options": {
            "includeHash": true,
            "includeAuthor": true,
            "includeOverview": true,
            "includeContributors": true,
            "maxCommitLength": 60
        }
    };
    
    const fs = require('fs');
    const configPath = path.join(__dirname, 'template-config.json');
    
    try {
        fs.writeFileSync(configPath, JSON.stringify(templateConfig, null, 2), 'utf8');
        console.log(`✅ 已创建模板配置文件: ${configPath}`);
        
        console.log('\n自定义模板特点：');
        console.log('- 使用发布说明风格的标题');
        console.log('- 每个提交包含详细的格式化信息');
        console.log('- 特殊的贡献者致谢部分');
        console.log('- 限制提交信息长度为60字符');
        
        console.log('\n使用自定义模板：');
        console.log(`   node scripts/generate-changelog-advanced.js --config "${configPath}" --preview`);
        
        // 实际执行模板示例
        console.log('\n🚀 执行自定义模板示例...');
        execSync(`node scripts/generate-changelog-advanced.js --config "${configPath}" --version 2.3.0-template --preview`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
    } catch (error) {
        console.error('创建模板配置失败:', error.message);
    }
}

/**
 * 批量生成示例
 */
function batchGenerateExample() {
    console.log('\n📦 批量生成示例');
    console.log('=' .repeat(50));
    
    console.log('\n批量生成不同版本的更新日志：');
    
    const versions = ['2.3.0', '2.3.1', '2.3.2'];
    const formats = ['markdown', 'json', 'html'];
    
    console.log('\n生成脚本示例：');
    console.log('```bash');
    console.log('#!/bin/bash');
    console.log('# 批量生成更新日志');
    console.log('');
    
    versions.forEach(version => {
        formats.forEach(format => {
            const ext = format === 'json' ? '.json' : format === 'html' ? '.html' : '.md';
            console.log(`node scripts/generate-changelog-advanced.js --version ${version} --format ${format} --output "releases/changelog-${version}${ext}"`);
        });
        console.log('');
    });
    
    console.log('```');
    
    console.log('\n或者使用Node.js脚本：');
    
    const batchScript = `
// batch-generate.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const versions = ['2.3.0', '2.3.1', '2.3.2'];
const formats = ['markdown', 'json', 'html'];
const outputDir = 'releases';

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

versions.forEach(version => {
    formats.forEach(format => {
        const ext = format === 'json' ? '.json' : format === 'html' ? '.html' : '.md';
        const outputFile = path.join(outputDir, \`changelog-\${version}\${ext}\`);
        
        try {
            console.log(\`生成 \${version} (\${format})...\`);
            execSync(\`node scripts/generate-changelog-advanced.js --version \${version} --format \${format} --output "\${outputFile}"\`, {
                stdio: 'inherit'
            });
        } catch (error) {
            console.error(\`生成 \${version} (\${format}) 失败:\`, error.message);
        }
    });
});

console.log('✅ 批量生成完成！');
`;
    
    console.log(batchScript);
    
    // 创建批量生成脚本
    const batchScriptPath = path.join(__dirname, 'batch-generate.js');
    try {
        fs.writeFileSync(batchScriptPath, batchScript.trim(), 'utf8');
        console.log(`\n✅ 已创建批量生成脚本: ${batchScriptPath}`);
        console.log('\n使用方法：');
        console.log(`   node ${batchScriptPath}`);
    } catch (error) {
        console.error('创建批量脚本失败:', error.message);
    }
}

/**
 * 主函数
 */
function main() {
    const exampleName = process.argv[2];
    
    if (!exampleName) {
        showExamples();
        return;
    }
    
    switch (exampleName.toLowerCase()) {
        case 'basic':
            basicExample();
            break;
        case 'advanced':
            advancedExample();
            break;
        case 'custom-config':
            customConfigExample();
            break;
        case 'multiple-format':
            multipleFormatExample();
            break;
        case 'version-bump':
            versionBumpExample();
            break;
        case 'filter-commits':
            filterCommitsExample();
            break;
        case 'template-custom':
            templateCustomExample();
            break;
        case 'batch-generate':
            batchGenerateExample();
            break;
        default:
            console.log(`❌ 未知示例: ${exampleName}`);
            showExamples();
            break;
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = {
    showExamples,
    basicExample,
    advancedExample,
    customConfigExample,
    multipleFormatExample,
    versionBumpExample,
    filterCommitsExample,
    templateCustomExample,
    batchGenerateExample
};