#!/usr/bin/env node

/**
 * 自动生成版本更新日志脚本
 * 根据Git提交历史自动生成结构化的版本更新日志
 * 
 * 功能特性：
 * - 分析Git提交信息
 * - 按类型分类提交（新功能、修复、优化等）
 * - 生成Markdown格式的更新日志
 * - 支持版本号自动递增
 * - 支持自定义日期范围
 * 
 * 使用方法：
 * node scripts/generate-changelog.js [options]
 * 
 * 选项：
 * --version, -v: 指定版本号（如：2.3.0）
 * --from: 起始提交哈希或标签
 * --to: 结束提交哈希或标签（默认：HEAD）
 * --output, -o: 输出文件路径（默认：CHANGELOG.md）
 * --append, -a: 追加到现有文件而不是覆盖
 * --help, -h: 显示帮助信息
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 解析命令行参数
 * @returns {Object} 解析后的参数对象
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        version: null,
        from: null,
        to: 'HEAD',
        output: 'CHANGELOG.md',
        append: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--version':
            case '-v':
                options.version = args[++i];
                break;
            case '--from':
                options.from = args[++i];
                break;
            case '--to':
                options.to = args[++i];
                break;
            case '--output':
            case '-o':
                options.output = args[++i];
                break;
            case '--append':
            case '-a':
                options.append = true;
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
        }
    }

    return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log(`
📝 DMS-QA 版本更新日志生成器

使用方法：
  node scripts/generate-changelog.js [选项]

选项：
  --version, -v <版本号>    指定版本号（如：2.3.0）
  --from <提交>            起始提交哈希或标签
  --to <提交>              结束提交哈希或标签（默认：HEAD）
  --output, -o <文件>      输出文件路径（默认：CHANGELOG.md）
  --append, -a             追加到现有文件而不是覆盖
  --help, -h               显示此帮助信息

示例：
  # 生成最新版本的更新日志
  node scripts/generate-changelog.js --version 2.3.0

  # 生成指定范围的更新日志
  node scripts/generate-changelog.js --version 2.3.0 --from v2.2.0 --to HEAD

  # 追加到现有文件
  node scripts/generate-changelog.js --version 2.3.0 --append
`);
}

/**
 * 获取Git提交历史
 * @param {string} from - 起始提交
 * @param {string} to - 结束提交
 * @returns {Array} 提交信息数组
 */
function getGitCommits(from, to) {
    try {
        let gitCommand;
        if (from) {
            gitCommand = `git log ${from}..${to} --pretty=format:"%H|%s|%an|%ad" --date=short`;
        } else {
            // 如果没有指定起始点，获取最近20个提交
            gitCommand = `git log -20 ${to} --pretty=format:"%H|%s|%an|%ad" --date=short`;
        }
        
        const output = execSync(gitCommand, { encoding: 'utf8' });
        
        return output.split('\n').filter(line => line.trim()).map(line => {
            const [hash, subject, author, date] = line.split('|');
            return { hash, subject, author, date };
        });
    } catch (error) {
        console.error('❌ 获取Git提交历史失败:', error.message);
        return [];
    }
}

/**
 * 分类提交信息
 * @param {Array} commits - 提交信息数组
 * @returns {Object} 分类后的提交信息
 */
function categorizeCommits(commits) {
    const categories = {
        features: [],      // 新功能
        fixes: [],         // 修复
        improvements: [],  // 优化改进
        docs: [],         // 文档
        refactor: [],     // 重构
        style: [],        // 样式
        test: [],         // 测试
        chore: [],        // 构建/工具
        other: []         // 其他
    };

    const patterns = {
        features: /^(feat|feature|新增|添加|增加|实现)/i,
        fixes: /^(fix|修复|解决|修正|bugfix)/i,
        improvements: /^(improve|优化|改进|提升|完善|增强)/i,
        docs: /^(docs|文档|说明|readme)/i,
        refactor: /^(refactor|重构|重写|调整)/i,
        style: /^(style|样式|格式|美化|ui)/i,
        test: /^(test|测试|单元测试)/i,
        chore: /^(chore|构建|工具|配置|依赖|build)/i
    };

    commits.forEach(commit => {
        let categorized = false;
        
        for (const [category, pattern] of Object.entries(patterns)) {
            if (pattern.test(commit.subject)) {
                categories[category].push(commit);
                categorized = true;
                break;
            }
        }
        
        if (!categorized) {
            categories.other.push(commit);
        }
    });

    return categories;
}

/**
 * 生成更新日志内容
 * @param {string} version - 版本号
 * @param {Object} categories - 分类后的提交信息
 * @param {Array} commits - 原始提交信息
 * @returns {string} 更新日志内容
 */
function generateChangelog(version, categories, commits) {
    const date = new Date().toISOString().split('T')[0];
    const totalCommits = commits.length;
    
    // 确保版本号只有一个v前缀
    const displayVersion = version.startsWith('v') ? version : `v${version}`;
    
    let changelog = `## ${displayVersion} (${date})\n\n`;
    
    // 版本概述
    changelog += `### 📊 版本概述\n`;
    changelog += `本版本包含 ${totalCommits} 个提交，主要改进如下：\n\n`;
    
    // 统计信息
    const stats = [];
    if (categories.features.length > 0) stats.push(`${categories.features.length} 个新功能`);
    if (categories.fixes.length > 0) stats.push(`${categories.fixes.length} 个问题修复`);
    if (categories.improvements.length > 0) stats.push(`${categories.improvements.length} 个优化改进`);
    
    if (stats.length > 0) {
        changelog += `- ${stats.join('、')}\n`;
    }
    changelog += `\n`;
    
    // 详细分类
    const categoryConfig = {
        features: { title: '✨ 新增功能', icon: '🎯' },
        fixes: { title: '🐛 问题修复', icon: '🔧' },
        improvements: { title: '⚡ 优化改进', icon: '📈' },
        refactor: { title: '♻️ 代码重构', icon: '🔄' },
        docs: { title: '📚 文档更新', icon: '📝' },
        style: { title: '💄 样式调整', icon: '🎨' },
        test: { title: '✅ 测试相关', icon: '🧪' },
        chore: { title: '🔧 构建工具', icon: '⚙️' },
        other: { title: '📦 其他更改', icon: '📋' }
    };
    
    Object.entries(categoryConfig).forEach(([category, config]) => {
        const commits = categories[category];
        if (commits.length > 0) {
            changelog += `### ${config.title}\n\n`;
            commits.forEach(commit => {
                const shortHash = commit.hash.substring(0, 7);
                changelog += `- ${config.icon} ${commit.subject} ([${shortHash}](../../commit/${commit.hash}))\n`;
            });
            changelog += `\n`;
        }
    });
    
    // 贡献者信息
    const contributors = [...new Set(commits.map(c => c.author))];
    if (contributors.length > 0) {
        changelog += `### 👥 贡献者\n\n`;
        changelog += `感谢以下贡献者的努力：${contributors.join('、')}\n\n`;
    }
    
    changelog += `---\n\n`;
    
    return changelog;
}

/**
 * 获取当前版本号
 * @returns {string} 当前版本号
 */
function getCurrentVersion() {
    try {
        const packagePath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageJson.version;
    } catch (error) {
        return '1.0.0';
    }
}

/**
 * 自动递增版本号
 * @param {string} currentVersion - 当前版本号
 * @param {string} type - 递增类型 (major|minor|patch)
 * @returns {string} 新版本号
 */
function incrementVersion(currentVersion, type = 'patch') {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
            return `${major}.${minor}.${patch + 1}`;
    }
}

/**
 * 主函数
 */
function main() {
    const options = parseArguments();
    
    if (options.help) {
        showHelp();
        return;
    }
    
    console.log('🚀 开始生成版本更新日志...');
    
    // 确定版本号
    let version = options.version;
    if (!version) {
        const currentVersion = getCurrentVersion();
        version = incrementVersion(currentVersion);
        console.log(`📦 自动递增版本号: ${currentVersion} → ${version}`);
    }
    
    // 获取提交历史
    console.log('📋 获取Git提交历史...');
    const commits = getGitCommits(options.from, options.to);
    
    if (commits.length === 0) {
        console.log('⚠️  未找到提交记录');
        return;
    }
    
    console.log(`📊 找到 ${commits.length} 个提交`);
    
    // 分类提交
    console.log('🏷️  分类提交信息...');
    const categories = categorizeCommits(commits);
    
    // 生成更新日志
    console.log('📝 生成更新日志内容...');
    const changelog = generateChangelog(version, categories, commits);
    
    // 写入文件
    const outputPath = path.resolve(options.output);
    
    try {
        if (options.append && fs.existsSync(outputPath)) {
            const existingContent = fs.readFileSync(outputPath, 'utf8');
            const newContent = changelog + existingContent;
            fs.writeFileSync(outputPath, newContent, 'utf8');
            console.log(`✅ 更新日志已追加到: ${outputPath}`);
        } else {
            // 如果是新文件，添加标题
            const header = `# DMS-QA 更新日志\n\n本文档记录了 DMS-QA 质量管理系统的版本更新历史。\n\n`;
            fs.writeFileSync(outputPath, header + changelog, 'utf8');
            console.log(`✅ 更新日志已生成: ${outputPath}`);
        }
        
        // 显示统计信息
        console.log('\n📈 统计信息:');
        Object.entries(categories).forEach(([category, commits]) => {
            if (commits.length > 0) {
                console.log(`  ${category}: ${commits.length} 个提交`);
            }
        });
        
    } catch (error) {
        console.error('❌ 写入文件失败:', error.message);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = {
    parseArguments,
    getGitCommits,
    categorizeCommits,
    generateChangelog,
    getCurrentVersion,
    incrementVersion
};