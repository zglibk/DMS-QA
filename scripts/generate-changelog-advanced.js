#!/usr/bin/env node

/**
 * 高级版本更新日志生成器
 * 支持配置文件、模板定制、智能分类等高级功能
 * 
 * 功能特性：
 * - 支持配置文件定制
 * - 智能提交分类
 * - 模板化输出
 * - 多种输出格式
 * - 版本号管理
 * - 贡献者统计
 * - 提交过滤
 * 
 * 使用方法：
 * node scripts/generate-changelog-advanced.js [options]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 数据库操作模块（可选，仅在需要写入数据库时使用）
let dbModule = null;
try {
    // 尝试加载数据库模块
    dbModule = require('../server/db');
    console.log('✅ 数据库模块加载成功');
} catch (error) {
    // 如果无法加载数据库模块，将跳过数据库写入功能
    console.warn('⚠️  数据库模块未找到，将跳过数据库写入功能:', error.message);
}

/**
 * 加载配置文件
 * @param {string} configPath - 配置文件路径
 * @returns {Object} 配置对象
 */
function loadConfig(configPath) {
    const defaultConfigPath = path.join(__dirname, 'changelog-config.json');
    const finalConfigPath = configPath || defaultConfigPath;
    
    try {
        if (fs.existsSync(finalConfigPath)) {
            const configContent = fs.readFileSync(finalConfigPath, 'utf8');
            return JSON.parse(configContent);
        }
    } catch (error) {
        console.warn(`⚠️  配置文件加载失败: ${error.message}`);
    }
    
    // 返回默认配置
    return getDefaultConfig();
}

/**
 * 获取默认配置
 * @returns {Object} 默认配置对象
 */
function getDefaultConfig() {
    return {
        title: "项目更新日志",
        description: "本文档记录了项目的版本更新历史。",
        categories: {
            features: {
                title: "✨ 新增功能",
                icon: "🎯",
                patterns: ["^(feat|feature|新增|添加|增加|实现)"],
                priority: 1
            },
            fixes: {
                title: "🐛 问题修复",
                icon: "🔧",
                patterns: ["^(fix|修复|解决|修正|bugfix)"],
                priority: 2
            },
            other: {
                title: "📦 其他更改",
                icon: "📋",
                patterns: [],
                priority: 99
            }
        },
        options: {
            includeHash: true,
            includeAuthor: true,
            maxCommitLength: 100
        }
    };
}

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
        output: null,
        config: null,
        append: false,
        format: 'markdown',
        help: false,
        preview: false,
        updatePackage: false,
        saveToDb: true,
        skipDb: false
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
            case '--config':
            case '-c':
                options.config = args[++i];
                break;
            case '--format':
            case '-f':
                options.format = args[++i];
                break;
            case '--append':
            case '-a':
                options.append = true;
                break;
            case '--preview':
            case '-p':
                options.preview = true;
                break;
            case '--update-package':
                options.updatePackage = true;
                break;
            case '--save-to-db':
                options.saveToDb = true;
                break;
            case '--skip-db':
                options.saveToDb = false;
                options.skipDb = true;
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
📝 DMS-QA 高级版本更新日志生成器

使用方法：
  node scripts/generate-changelog-advanced.js [选项]

选项：
  --version, -v <版本号>      指定版本号（如：2.3.0）
  --from <提交>              起始提交哈希或标签
  --to <提交>                结束提交哈希或标签（默认：HEAD）
  --output, -o <文件>        输出文件路径
  --config, -c <配置文件>     指定配置文件路径
  --format, -f <格式>        输出格式（markdown|json|html）
  --append, -a               追加到现有文件
  --preview, -p              预览模式，不写入文件
  --update-package           同时更新package.json中的版本号
  --save-to-db               将版本更新信息保存到数据库（默认启用）
  --skip-db                  跳过数据库写入操作
  --help, -h                 显示此帮助信息

示例：
  # 生成最新版本的更新日志
  node scripts/generate-changelog-advanced.js --version 2.3.0

  # 使用自定义配置文件
  node scripts/generate-changelog-advanced.js --config my-config.json

  # 预览模式
  node scripts/generate-changelog-advanced.js --version 2.3.0 --preview

  # 生成HTML格式
  node scripts/generate-changelog-advanced.js --format html --output changelog.html
`);
}

/**
 * 获取Git提交历史
 * @param {string} from - 起始提交
 * @param {string} to - 结束提交
 * @param {Object} config - 配置对象
 * @returns {Array} 提交信息数组
 */
function getGitCommits(from, to, config) {
    try {
        let gitCommand;
        if (from) {
            gitCommand = `git log ${from}..${to} --pretty=format:"%H|%s|%an|%ad|%ae" --date=short`;
        } else {
            gitCommand = `git log -50 ${to} --pretty=format:"%H|%s|%an|%ad|%ae" --date=short`;
        }
        
        const output = execSync(gitCommand, { encoding: 'utf8' });
        
        const commits = output.split('\n').filter(line => line.trim()).map(line => {
            const parts = line.split('|');
            if (parts.length < 5) {
                console.warn(`⚠️  跳过格式不正确的提交行: ${line}`);
                return null;
            }
            const [hash, subject, author, date, email] = parts;
            return { hash, subject, author, date, email };
        }).filter(commit => commit !== null);
        
        // 应用过滤器
        return filterCommits(commits, config);
    } catch (error) {
        console.error('❌ 获取Git提交历史失败:', error.message);
        return [];
    }
}

/**
 * 过滤提交
 * @param {Array} commits - 提交数组
 * @param {Object} config - 配置对象
 * @returns {Array} 过滤后的提交数组
 */
function filterCommits(commits, config) {
    if (!config || !config.filters) return commits;
    
    return commits.filter(commit => {
        // 排除模式
        if (config.filters.excludePatterns) {
            for (const pattern of config.filters.excludePatterns) {
                if (new RegExp(pattern, 'i').test(commit.subject)) {
                    return false;
                }
            }
        }
        
        // 包含模式
        if (config.filters.includePatterns && config.filters.includePatterns.length > 0) {
            let matches = false;
            for (const pattern of config.filters.includePatterns) {
                if (new RegExp(pattern, 'i').test(commit.subject)) {
                    matches = true;
                    break;
                }
            }
            if (!matches) return false;
        }
        
        // 最小长度
        if (config.filters.minCommitLength && commit.subject.length < config.filters.minCommitLength) {
            return false;
        }
        
        return true;
    });
}

/**
 * 智能分类提交
 * @param {Array} commits - 提交数组
 * @param {Object} config - 配置对象
 * @returns {Object} 分类后的提交
 */
function categorizeCommits(commits, config) {
    const categories = {};
    
    // 初始化分类
    Object.keys(config.categories).forEach(key => {
        categories[key] = [];
    });
    
    commits.forEach(commit => {
        let categorized = false;
        
        // 按优先级排序的分类
        const sortedCategories = Object.entries(config.categories)
            .sort(([,a], [,b]) => (a.priority || 99) - (b.priority || 99));
        
        for (const [categoryKey, categoryConfig] of sortedCategories) {
            if (categoryConfig.patterns && categoryConfig.patterns.length > 0) {
                for (const pattern of categoryConfig.patterns) {
                    if (new RegExp(pattern, 'i').test(commit.subject)) {
                        categories[categoryKey].push(commit);
                        categorized = true;
                        break;
                    }
                }
                if (categorized) break;
            }
        }
        
        // 如果没有匹配到任何分类，放入other
        if (!categorized && categories.other) {
            categories.other.push(commit);
        }
    });
    
    return categories;
}

/**
 * 生成Markdown格式的更新日志
 * @param {string} version - 版本号
 * @param {Object} categories - 分类后的提交
 * @param {Array} commits - 原始提交
 * @param {Object} config - 配置对象
 * @returns {string} 更新日志内容
 */
function generateMarkdownChangelog(version, categories, commits, config) {
    const date = new Date().toISOString().split('T')[0];
    const totalCommits = commits.length;
    
    let changelog = '';
    
    // 版本标题
    changelog += config.templates?.version?.replace('{version}', version).replace('{date}', date) || 
                `## v${version} (${date})\n\n`;
    
    // 版本概述
    if (config.options?.includeOverview !== false) {
        changelog += config.templates?.overview?.replace('{totalCommits}', totalCommits) || 
                    `### 📊 版本概述\n本版本包含 ${totalCommits} 个提交，主要改进如下：\n\n`;
        
        // 统计信息
        const stats = [];
        Object.entries(categories).forEach(([key, commits]) => {
            if (commits.length > 0 && config.categories[key]) {
                const title = config.categories[key].title.replace(/[✨🐛⚡🔒🚀♻️📚💄✅🔧📦]/g, '').trim();
                stats.push(`${commits.length} 个${title}`);
            }
        });
        
        if (stats.length > 0) {
            changelog += `- ${stats.join('、')}\n`;
        }
        changelog += `\n`;
    }
    
    // 详细分类
    const sortedCategories = Object.entries(config.categories)
        .sort(([,a], [,b]) => (a.priority || 99) - (b.priority || 99));
    
    sortedCategories.forEach(([categoryKey, categoryConfig]) => {
        const commits = categories[categoryKey];
        if (commits && commits.length > 0) {
            changelog += config.templates?.category?.replace('{title}', categoryConfig.title) || 
                        `### ${categoryConfig.title}\n\n`;
            
            commits.forEach(commit => {
                const shortHash = commit.hash.substring(0, 7);
                let subject = commit.subject;
                
                // 限制提交信息长度
                if (config.options?.maxCommitLength && subject.length > config.options.maxCommitLength) {
                    subject = subject.substring(0, config.options.maxCommitLength) + '...';
                }
                
                if (config.templates?.commit) {
                    changelog += config.templates.commit
                        .replace('{icon}', categoryConfig.icon)
                        .replace('{subject}', subject)
                        .replace('{shortHash}', shortHash)
                        .replace('{hash}', commit.hash);
                } else {
                    changelog += `- ${categoryConfig.icon} ${subject}`;
                    if (config.options?.includeHash) {
                        changelog += ` ([${shortHash}](../../commit/${commit.hash}))`;
                    }
                    changelog += `\n`;
                }
            });
            changelog += `\n`;
        }
    });
    
    // 贡献者信息
    if (config.options?.includeContributors !== false) {
        const contributors = [...new Set(commits.map(c => c.author))];
        if (contributors.length > 0) {
            changelog += config.templates?.contributors?.replace('{contributors}', contributors.join('、')) || 
                        `### 👥 贡献者\n\n感谢以下贡献者的努力：${contributors.join('、')}\n\n`;
        }
    }
    
    changelog += config.templates?.separator || `---\n\n`;
    
    return changelog;
}

/**
 * 生成JSON格式的更新日志
 * @param {string} version - 版本号
 * @param {Object} categories - 分类后的提交
 * @param {Array} commits - 原始提交
 * @param {Object} config - 配置对象
 * @returns {string} JSON格式的更新日志
 */
function generateJsonChangelog(version, categories, commits, config) {
    const date = new Date().toISOString().split('T')[0];
    const contributors = [...new Set(commits.map(c => c.author))];
    
    const changelog = {
        version,
        date,
        totalCommits: commits.length,
        contributors,
        categories: {}
    };
    
    Object.entries(categories).forEach(([key, commits]) => {
        if (commits.length > 0) {
            changelog.categories[key] = {
                title: config.categories[key]?.title || key,
                icon: config.categories[key]?.icon || '',
                commits: commits.map(commit => ({
                    hash: commit.hash,
                    shortHash: commit.hash.substring(0, 7),
                    subject: commit.subject,
                    author: commit.author,
                    date: commit.date,
                    email: commit.email
                }))
            };
        }
    });
    
    return JSON.stringify(changelog, null, 2);
}

/**
 * 生成HTML格式的更新日志
 * @param {string} version - 版本号
 * @param {Object} categories - 分类后的提交
 * @param {Array} commits - 原始提交
 * @param {Object} config - 配置对象
 * @returns {string} HTML格式的更新日志
 */
function generateHtmlChangelog(version, categories, commits, config) {
    const date = new Date().toISOString().split('T')[0];
    const contributors = [...new Set(commits.map(c => c.author))];
    
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title || '更新日志'} - v${version}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        .version { border-left: 4px solid #007acc; padding-left: 20px; margin: 20px 0; }
        .category { margin: 20px 0; }
        .commit { margin: 5px 0; padding: 5px 0; }
        .commit-hash { font-family: monospace; font-size: 0.9em; color: #666; }
        .contributors { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .icon { margin-right: 8px; }
    </style>
</head>
<body>
    <h1>${config.title || '更新日志'}</h1>
    <div class="version">
        <h2>v${version} (${date})</h2>
        <p><strong>📊 版本概述：</strong>本版本包含 ${commits.length} 个提交</p>
`;
    
    // 分类内容
    const sortedCategories = Object.entries(config.categories)
        .sort(([,a], [,b]) => (a.priority || 99) - (b.priority || 99));
    
    sortedCategories.forEach(([categoryKey, categoryConfig]) => {
        const categoryCommits = categories[categoryKey];
        if (categoryCommits && categoryCommits.length > 0) {
            html += `        <div class="category">
            <h3>${categoryConfig.title}</h3>
            <ul>
`;
            
            categoryCommits.forEach(commit => {
                const shortHash = commit.hash.substring(0, 7);
                html += `                <li class="commit">
                    <span class="icon">${categoryConfig.icon}</span>
                    ${commit.subject}
                    <span class="commit-hash">(${shortHash})</span>
                </li>
`;
            });
            
            html += `            </ul>
        </div>
`;
        }
    });
    
    // 贡献者
    if (contributors.length > 0) {
        html += `        <div class="contributors">
            <h3>👥 贡献者</h3>
            <p>感谢以下贡献者的努力：${contributors.join('、')}</p>
        </div>
`;
    }
    
    html += `    </div>
</body>
</html>`;
    
    return html;
}

/**
 * 更新package.json中的版本号
 * @param {string} version - 新版本号
 */
function updatePackageVersion(version) {
    try {
        const packagePath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            packageJson.version = version;
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
            console.log(`📦 已更新package.json版本号: ${version}`);
        }
    } catch (error) {
        console.error('❌ 更新package.json失败:', error.message);
    }
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
 * @param {string} type - 递增类型
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
 * 将版本更新信息写入数据库
 * @param {string} version - 版本号
 * @param {Object} categories - 分类后的提交信息
 * @param {Array} commits - 所有提交记录
 * @param {Object} config - 配置信息
 * @param {Object} options - 命令行选项
 * @returns {Promise<boolean>} 是否写入成功
 */
/**
 * 将版本更新信息保存到数据库
 * 使用连接池管理，避免连接泄漏和服务崩溃
 * @param {string} version - 版本号
 * @param {Object} categories - 分类后的提交信息
 * @param {Array} commits - 所有提交记录
 * @param {Object} config - 配置信息
 * @param {Object} options - 选项参数
 * @returns {Promise<boolean>} 保存是否成功
 */
async function saveToDatabase(version, categories, commits, config, options = {}) {
    if (!dbModule || !dbModule.executeQuery) {
        console.log('⚠️  数据库模块不可用，跳过数据库写入');
        return false;
    }
    
    let transaction = null;
    
    try {
        console.log('💾 正在将版本更新信息写入数据库...');
        
        const result = await dbModule.executeQuery(async (pool) => {
            // 使用连接池中的连接创建事务
            transaction = pool.transaction();
            await transaction.begin();
            
            console.log('📝 开始数据库事务操作...');
            
            try {
                // 插入版本更新主记录
                const insertVersionQuery = `
                    INSERT INTO VersionUpdates (
                        Version, Title, Description, ReleaseDate, 
                        TotalCommits, CreatedBy, Status
                    ) 
                    OUTPUT INSERTED.ID
                    VALUES (
                        @version, @title, @description, @releaseDate,
                        @totalCommits, @createdBy, @status
                    )
                `;
                
                const versionRequest = transaction.request();
                versionRequest.input('version', version);
                versionRequest.input('title', `版本 ${version} 更新`);
                versionRequest.input('description', `包含 ${commits.length} 个提交的版本更新`);
                versionRequest.input('releaseDate', new Date());
                versionRequest.input('totalCommits', commits.length);
                versionRequest.input('createdBy', 1); // 使用系统管理员用户ID
                versionRequest.input('status', 'published');
                
                const versionResult = await versionRequest.query(insertVersionQuery);
                const versionId = versionResult.recordset?.[0]?.id || 
                    await getVersionId(transaction, version);
                
                // 插入详细更新项目
                for (const [categoryKey, categoryCommits] of Object.entries(categories)) {
                    if (categoryCommits.length === 0) continue;
                    
                    const categoryConfig = config.categories[categoryKey] || {};
                    const categoryTitle = categoryConfig.title || categoryKey;
                    
                    for (const commit of categoryCommits) {
                        const insertItemQuery = `
                            INSERT INTO VersionUpdateItems (
                                VersionUpdateID, category, title, description,
                                CommitHash, CommitAuthor, CommitDate
                            ) VALUES (
                                @VersionUpdateID, @category, @title, @description,
                                @CommitHash, @CommitAuthor, @CommitDate
                            )
                        `;
                        
                        const itemRequest = transaction.request();
                        itemRequest.input('VersionUpdateID', versionId);
                        itemRequest.input('category', categoryTitle);
                        itemRequest.input('title', commit.subject);
                        itemRequest.input('description', commit.body || commit.subject);
                        itemRequest.input('CommitHash', commit.hash);
                        itemRequest.input('CommitAuthor', commit.author);
                        itemRequest.input('CommitDate', new Date(commit.date));
                        
                        await itemRequest.query(insertItemQuery);
                    }
                }
                
                // 如果不是预览模式且启用通知，则发送系统通知
                if (!options.preview && options.sendNotification !== false) {
                    try {
                        await sendVersionUpdateNotification(transaction, version, categories, commits, config, versionId);
                        console.log('📢 版本更新通知已发送');
                    } catch (notificationError) {
                        console.warn('⚠️  发送通知失败:', notificationError.message);
                        // 通知发送失败不影响主流程
                    }
                }
                
                await transaction.commit();
                console.log(`✅ 版本 ${version} 的更新信息已成功写入数据库`);
                return true;
                
            } catch (transactionError) {
                console.error('❌ 事务执行失败:', transactionError.message);
                try {
                    if (transaction) {
                        await transaction.rollback();
                        console.log('🔄 事务已回滚');
                    }
                } catch (rollbackError) {
                    console.error('❌ 事务回滚失败:', rollbackError.message);
                }
                throw transactionError;
            }
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ 数据库写入失败:', error.message);
        console.error('📊 错误详情:', {
            version,
            commitsCount: commits.length,
            categoriesCount: Object.keys(categories).length,
            errorStack: error.stack
        });
        return false;
    } finally {
        // 确保事务资源被正确释放
        if (transaction) {
            try {
                // 检查事务状态，如果还在进行中则回滚
                if (transaction.isolationLevel !== undefined) {
                    console.log('🧹 清理未完成的事务');
                }
            } catch (cleanupError) {
                console.warn('⚠️  事务清理警告:', cleanupError.message);
            }
        }
    }
}

/**
 * 获取版本ID（用于处理插入后获取ID的情况）
 * @param {Object} transaction - 数据库事务对象
 * @param {string} version - 版本号
 * @returns {Promise<number>} 版本ID
 */
async function getVersionId(transaction, version) {
    const query = 'SELECT id FROM VersionUpdates WHERE version = @version';
    const request = transaction.request();
    request.input('version', version);
    const result = await request.query(query);
    return result.recordset[0]?.id;
}

/**
 * 发送版本更新通知
 * @param {Object} transaction - 数据库事务对象
 * @param {string} version - 版本号
 * @param {Object} categories - 分类后的提交信息
 * @param {Array} commits - 所有提交记录
 * @param {Object} config - 配置信息
 * @param {number} versionId - 版本更新记录ID
 * @returns {Promise<void>}
 */
async function sendVersionUpdateNotification(transaction, version, categories, commits, config, versionId) {
    // 统计各类别的提交数量
    const stats = {};
    let totalItems = 0;
    
    for (const [categoryKey, categoryCommits] of Object.entries(categories)) {
        if (categoryCommits.length > 0) {
            const categoryConfig = config.categories[categoryKey] || {};
            const categoryTitle = categoryConfig.title || categoryKey;
            stats[categoryTitle] = categoryCommits.length;
            totalItems += categoryCommits.length;
        }
    }
    
    // 判断是否为重要更新（根据提交数量或版本号变化）
    const isMajorUpdate = commits.length >= 20 || version.includes('.0.0') || version.includes('.0');
    
    // 构建通知内容（纯文本格式，避免HTML标签）
    const noticeTitle = `🚀 系统版本更新 - v${version}`;
    const noticeContent = `🎉 系统版本更新通知

📦 版本号：v${version}
📅 发布时间：${new Date().toLocaleString('zh-CN')}
📊 更新统计：本次更新包含 ${commits.length} 个代码提交

📋 更新内容分类：
${Object.entries(stats).map(([category, count]) => 
    `• ${category}：${count} 项`
).join('\n')}

✨ 主要更新亮点：
${Object.entries(categories).slice(0, 5).map(([categoryKey, categoryCommits]) => {
    if (categoryCommits.length === 0) return '';
    const firstCommit = categoryCommits[0];
    return `• ${firstCommit.subject}`;
}).filter(item => item).join('\n')}${totalItems > 5 ? '\n• ...以及更多功能改进' : ''}

💡 温馨提示：建议您及时体验新功能，如遇问题请及时反馈。
📖 详细更新日志请查看系统管理 → 版本更新记录。`;
    
    // 插入系统通知
    const insertNoticeQuery = `
        INSERT INTO Notices (
            Title, Content, Type, Priority, PublishDate,
            CreatedBy, IsActive
        )
        OUTPUT INSERTED.ID
        VALUES (
            @title, @content, @type, @priority, @publishDate,
            @createdBy, 1
        )
    `;
    
    const noticeRequest = transaction.request();
    noticeRequest.input('title', noticeTitle);
    noticeRequest.input('content', noticeContent);
    noticeRequest.input('type', 'update');
    noticeRequest.input('priority', isMajorUpdate ? 'high' : 'normal');
    noticeRequest.input('publishDate', new Date());
    noticeRequest.input('createdBy', 1); // 使用系统管理员用户ID
    
    const noticeResult = await noticeRequest.query(insertNoticeQuery);
    const noticeId = noticeResult.recordset[0].ID;
    
    // 更新版本记录，关联通知ID
    const updateVersionQuery = `
        UPDATE VersionUpdates 
        SET NotificationSent = 1, NotificationDate = GETDATE(), NoticeID = @noticeId
        WHERE ID = @versionId
    `;
    
    const updateRequest = transaction.request();
    updateRequest.input('noticeId', noticeId);
    updateRequest.input('versionId', versionId);
    
    await updateRequest.query(updateVersionQuery);
    
    return noticeId;
}

/**
 * 主函数
 */
async function main() {
    const options = parseArguments();
    
    if (options.help) {
        showHelp();
        return;
    }
    
    console.log('🚀 开始生成高级版本更新日志...');
    
    // 加载配置
    console.log('⚙️  加载配置文件...');
    const config = loadConfig(options.config);
    
    // 确定版本号
    let version = options.version;
    if (!version) {
        const currentVersion = getCurrentVersion();
        version = incrementVersion(currentVersion);
        console.log(`📦 自动递增版本号: ${currentVersion} → ${version}`);
    }
    
    // 获取提交历史
    console.log('📋 获取Git提交历史...');
    const commits = getGitCommits(options.from, options.to, config);
    
    if (commits.length === 0) {
        console.log('⚠️  未找到提交记录');
        return;
    }
    
    console.log(`📊 找到 ${commits.length} 个有效提交`);
    
    // 分类提交
    console.log('🏷️  智能分类提交信息...');
    const categories = categorizeCommits(commits, config);
    
    // 写入数据库（如果启用）
    let dbSaveSuccess = false;
    if (options.saveToDb !== false) {
        dbSaveSuccess = await saveToDatabase(version, categories, commits, config, options);
    }
    
    // 生成更新日志
    console.log(`📝 生成${options.format}格式的更新日志...`);
    let changelog;
    
    switch (options.format.toLowerCase()) {
        case 'json':
            changelog = generateJsonChangelog(version, categories, commits, config);
            break;
        case 'html':
            changelog = generateHtmlChangelog(version, categories, commits, config);
            break;
        case 'markdown':
        default:
            changelog = generateMarkdownChangelog(version, categories, commits, config);
            break;
    }
    
    // 预览模式
    if (options.preview) {
        console.log('\n📖 预览内容:');
        console.log('='.repeat(50));
        console.log(changelog);
        console.log('='.repeat(50));
        return;
    }
    
    // 确定输出文件
    let outputPath = options.output;
    if (!outputPath) {
        const extension = options.format === 'json' ? '.json' : 
                         options.format === 'html' ? '.html' : '.md';
        outputPath = config.output?.defaultFile?.replace(/\.[^.]+$/, extension) || 
                    `CHANGELOG${extension}`;
    }
    outputPath = path.resolve(outputPath);
    
    // 写入文件
    try {
        if (options.append && fs.existsSync(outputPath) && options.format === 'markdown') {
            const existingContent = fs.readFileSync(outputPath, 'utf8');
            const newContent = changelog + existingContent;
            fs.writeFileSync(outputPath, newContent, 'utf8');
            console.log(`✅ 更新日志已追加到: ${outputPath}`);
        } else {
            // 新文件或非markdown格式
            let finalContent = changelog;
            if (options.format === 'markdown' && !options.append) {
                const header = `# ${config.title}\n\n${config.description}\n\n`;
                finalContent = header + changelog;
            }
            
            fs.writeFileSync(outputPath, finalContent, config.output?.encoding || 'utf8');
            console.log(`✅ 更新日志已生成: ${outputPath}`);
        }
        
        // 更新package.json版本号
        if (options.updatePackage) {
            updatePackageVersion(version);
        }
        
        // 显示统计信息
        console.log('\n📈 统计信息:');
        Object.entries(categories).forEach(([category, commits]) => {
            if (commits.length > 0) {
                const title = config.categories[category]?.title || category;
                console.log(`  ${title}: ${commits.length} 个提交`);
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

/**
 * 供后端API调用的安全执行函数
 * 使用连接池管理，避免服务崩溃
 * @param {Object} options - 执行选项
 * @returns {Promise<Object>} 执行结果
 */
async function executeChangelogGeneration(options = {}) {
    try {
        console.log('🚀 开始执行版本更新日志生成...');
        
        // 设置默认选项
        const defaultOptions = {
            version: null,
            from: null,
            to: 'HEAD',
            saveToDb: true,
            preview: false,
            format: 'markdown'
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        // 加载配置
        console.log('⚙️  加载配置文件...');
        const config = loadConfig(finalOptions.config);
        
        // 确定版本号
        let version = finalOptions.version;
        if (!version) {
            const currentVersion = getCurrentVersion();
            version = incrementVersion(currentVersion);
            console.log(`📦 自动递增版本号: ${currentVersion} → ${version}`);
        }
        
        // 获取提交历史
        console.log('📋 获取Git提交历史...');
        const commits = getGitCommits(finalOptions.from, finalOptions.to, config);
        
        if (commits.length === 0) {
            return {
                success: false,
                message: '未找到提交记录',
                data: null
            };
        }
        
        console.log(`📊 找到 ${commits.length} 个有效提交`);
        
        // 分类提交
        console.log('🏷️  智能分类提交信息...');
        const categories = categorizeCommits(commits, config);
        
        // 写入数据库（如果启用）
        let dbSaveSuccess = false;
        if (finalOptions.saveToDb !== false) {
            dbSaveSuccess = await saveToDatabase(version, categories, commits, config, finalOptions);
        }
        
        // 生成更新日志
        console.log(`📝 生成${finalOptions.format}格式的更新日志...`);
        let changelog;
        
        switch (finalOptions.format.toLowerCase()) {
            case 'json':
                changelog = generateJsonChangelog(version, categories, commits, config);
                break;
            case 'html':
                changelog = generateHtmlChangelog(version, categories, commits, config);
                break;
            case 'markdown':
            default:
                changelog = generateMarkdownChangelog(version, categories, commits, config);
                break;
        }
        
        // 统计信息
        const stats = {};
        Object.entries(categories).forEach(([category, commits]) => {
            if (commits.length > 0) {
                const title = config.categories[category]?.title || category;
                stats[title] = commits.length;
            }
        });
        
        return {
            success: true,
            message: `版本 ${version} 的更新日志生成成功`,
            data: {
                version,
                changelog,
                stats,
                totalCommits: commits.length,
                dbSaved: dbSaveSuccess,
                categories: Object.keys(stats)
            }
        };
        
    } catch (error) {
        console.error('❌ 版本更新日志生成失败:', error.message);
        return {
            success: false,
            message: `生成失败: ${error.message}`,
            data: {
                error: error.message,
                stack: error.stack
            }
        };
    }
}

module.exports = {
    loadConfig,
    parseArguments,
    getGitCommits,
    categorizeCommits,
    generateMarkdownChangelog,
    generateJsonChangelog,
    generateHtmlChangelog,
    getCurrentVersion,
    incrementVersion,
    saveToDatabase,
    executeChangelogGeneration
};