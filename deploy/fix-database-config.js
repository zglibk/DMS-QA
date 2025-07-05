const fs = require('fs');
const path = require('path');

console.log('=================================');
console.log('DMS-QA 数据库配置修复工具');
console.log('=================================');
console.log();

// 配置文件路径
const dbConfigPath = path.join(__dirname, 'server', 'db.js');

// 检查文件是否存在
if (!fs.existsSync(dbConfigPath)) {
    console.error('❌ 错误：找不到数据库配置文件');
    console.error('文件路径:', dbConfigPath);
    process.exit(1);
}

// 读取当前配置
let configContent = fs.readFileSync(dbConfigPath, 'utf8');
console.log('📖 读取当前数据库配置...');

// 显示当前配置
const serverMatch = configContent.match(/server:\s*['"`]([^'"`]+)['"`]/);
const databaseMatch = configContent.match(/database:\s*['"`]([^'"`]+)['"`]/);
const userMatch = configContent.match(/user:\s*['"`]([^'"`]+)['"`]/);

if (serverMatch) {
    console.log('当前服务器地址:', serverMatch[1]);
}
if (databaseMatch) {
    console.log('当前数据库名:', databaseMatch[1]);
}
if (userMatch) {
    console.log('当前用户名:', userMatch[1]);
}
console.log();

// 新的配置参数
const newConfig = {
    server: '192.168.1.57',
    database: 'DMS-QA',
    user: 'sa',
    password: 'Qa369*'
};

console.log('🔧 应用新的数据库配置...');
console.log('新服务器地址:', newConfig.server);
console.log('新数据库名:', newConfig.database);
console.log('新用户名:', newConfig.user);
console.log();

// 备份原配置文件
const backupPath = dbConfigPath + '.backup.' + Date.now();
fs.copyFileSync(dbConfigPath, backupPath);
console.log('✅ 已备份原配置文件:', backupPath);

// 替换配置
let newContent = configContent;

// 替换服务器地址
newContent = newContent.replace(
    /server:\s*['"`][^'"`]+['"`]/g,
    `server: '${newConfig.server}'`
);

// 替换数据库名
newContent = newContent.replace(
    /database:\s*['"`][^'"`]+['"`]/g,
    `database: '${newConfig.database}'`
);

// 替换用户名
newContent = newContent.replace(
    /user:\s*['"`][^'"`]+['"`]/g,
    `user: '${newConfig.user}'`
);

// 替换密码
newContent = newContent.replace(
    /password:\s*['"`][^'"`]+['"`]/g,
    `password: '${newConfig.password}'`
);

// 写入新配置
fs.writeFileSync(dbConfigPath, newContent, 'utf8');
console.log('✅ 数据库配置已更新');
console.log();

console.log('🔄 请重启DMS-QA服务以应用新配置：');
console.log('方法1: net stop DMS-QA-Backend && net start DMS-QA-Backend');
console.log('方法2: pm2 restart dms-qa-backend');
console.log('方法3: 使用 service-manager.bat 重启服务');
console.log();

console.log('🌐 配置完成后的访问地址：');
console.log('前端: http://192.168.1.57:8080');
console.log('后端: http://192.168.1.57:3001/api');
console.log();

console.log('✅ 配置修复完成！');
