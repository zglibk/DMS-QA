const sql = require('mssql');

console.log('=================================');
console.log('DMS-QA 数据库连接测试工具');
console.log('=================================');
console.log();

// 测试配置
const testConfigs = [
    {
        name: '当前配置（从db.js读取）',
        config: null // 将从db.js动态读取
    },
    {
        name: '直接连接配置',
        config: {
            user: 'sa',
            password: 'Qa369*',
            server: '192.168.1.57',
            database: 'DMS-QA',
            options: {
                encrypt: false,
                trustServerCertificate: true,
                enableArithAbort: true,
                useUTC: false,
                requestTimeout: 30000,
                connectionTimeout: 30000
            }
        }
    },
    {
        name: '本地回环测试',
        config: {
            user: 'sa',
            password: 'Qa369*',
            server: 'localhost',
            database: 'DMS-QA',
            options: {
                encrypt: false,
                trustServerCertificate: true,
                enableArithAbort: true,
                useUTC: false,
                requestTimeout: 30000,
                connectionTimeout: 30000
            }
        }
    },
    {
        name: '127.0.0.1测试',
        config: {
            user: 'sa',
            password: 'Qa369*',
            server: '127.0.0.1',
            database: 'DMS-QA',
            options: {
                encrypt: false,
                trustServerCertificate: true,
                enableArithAbort: true,
                useUTC: false,
                requestTimeout: 30000,
                connectionTimeout: 30000
            }
        }
    }
];

// 测试单个配置
async function testConnection(name, config) {
    console.log(`\n🔍 测试: ${name}`);
    console.log('配置信息:');
    console.log(`  服务器: ${config.server}`);
    console.log(`  数据库: ${config.database}`);
    console.log(`  用户名: ${config.user}`);
    console.log(`  密码: ${config.password ? '***' : '未设置'}`);
    console.log('-----------------------------------');

    let pool = null;
    try {
        // 创建连接池
        pool = new sql.ConnectionPool(config);
        
        console.log('⏳ 正在连接数据库...');
        const startTime = Date.now();
        
        // 尝试连接
        await pool.connect();
        const connectTime = Date.now() - startTime;
        
        console.log(`✅ 连接成功！耗时: ${connectTime}ms`);
        
        // 测试查询
        console.log('⏳ 测试基本查询...');
        const queryStartTime = Date.now();
        
        const result = await pool.request().query('SELECT @@VERSION as SqlVersion, GETDATE() as CurrentTime, DB_NAME() as DatabaseName');
        const queryTime = Date.now() - queryStartTime;
        
        console.log(`✅ 查询成功！耗时: ${queryTime}ms`);
        console.log('查询结果:');
        if (result.recordset && result.recordset.length > 0) {
            const record = result.recordset[0];
            console.log(`  SQL Server版本: ${record.SqlVersion}`);
            console.log(`  当前时间: ${record.CurrentTime}`);
            console.log(`  数据库名: ${record.DatabaseName}`);
        }
        
        // 测试DMS-QA特定表
        console.log('⏳ 测试DMS-QA表访问...');
        try {
            const tableTest = await pool.request().query(`
                SELECT 
                    COUNT(*) as ComplaintCount 
                FROM ComplaintRegister
            `);
            console.log(`✅ 表访问成功！投诉记录数: ${tableTest.recordset[0].ComplaintCount}`);
        } catch (tableErr) {
            console.log(`❌ 表访问失败: ${tableErr.message}`);
        }
        
        // 测试DbConfig表
        console.log('⏳ 测试DbConfig表...');
        try {
            const configTest = await pool.request().query(`
                SELECT TOP 1 
                    Host, DatabaseName, DbUser, FileStoragePath
                FROM DbConfig 
                WHERE IsCurrent = 1 
                ORDER BY ID DESC
            `);
            if (configTest.recordset.length > 0) {
                const dbConfig = configTest.recordset[0];
                console.log(`✅ DbConfig表访问成功！`);
                console.log(`  配置的主机: ${dbConfig.Host}`);
                console.log(`  配置的数据库: ${dbConfig.DatabaseName}`);
                console.log(`  配置的用户: ${dbConfig.DbUser}`);
                console.log(`  文件存储路径: ${dbConfig.FileStoragePath}`);
            } else {
                console.log(`⚠️  DbConfig表为空或无当前配置`);
            }
        } catch (configErr) {
            console.log(`❌ DbConfig表访问失败: ${configErr.message}`);
        }
        
        return { success: true, connectTime, queryTime };
        
    } catch (error) {
        console.log(`❌ 连接失败: ${error.message}`);
        console.log(`错误代码: ${error.code || '未知'}`);
        console.log(`错误号: ${error.number || '未知'}`);
        
        // 详细错误分析
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 分析: 连接被拒绝，可能原因:');
            console.log('   - SQL Server服务未启动');
            console.log('   - TCP/IP协议未启用');
            console.log('   - 端口1433被防火墙阻止');
        } else if (error.code === 'ETIMEOUT') {
            console.log('💡 分析: 连接超时，可能原因:');
            console.log('   - 网络连接问题');
            console.log('   - SQL Server未监听指定端口');
            console.log('   - 防火墙阻止连接');
        } else if (error.code === 'ELOGIN') {
            console.log('💡 分析: 登录失败，可能原因:');
            console.log('   - 用户名或密码错误');
            console.log('   - SQL Server身份验证模式问题');
            console.log('   - 用户权限不足');
        } else if (error.code === 'ENOTFOUND') {
            console.log('💡 分析: 服务器未找到，可能原因:');
            console.log('   - 服务器地址错误');
            console.log('   - DNS解析问题');
            console.log('   - 网络连接问题');
        }
        
        return { success: false, error: error.message };
        
    } finally {
        // 确保连接池被关闭
        if (pool) {
            try {
                await pool.close();
                console.log('🔒 连接池已关闭');
            } catch (closeErr) {
                console.log(`⚠️  关闭连接池失败: ${closeErr.message}`);
            }
        }
    }
}

// 网络连通性测试
async function testNetworkConnectivity() {
    console.log('\n🌐 网络连通性测试');
    console.log('===================================');
    
    const { spawn } = require('child_process');
    
    // 测试ping
    console.log('⏳ 测试ping连通性...');
    try {
        await new Promise((resolve, reject) => {
            const ping = spawn('ping', ['-n', '4', '192.168.1.57']);
            let output = '';
            
            ping.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            ping.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Ping测试成功');
                    const lines = output.split('\n');
                    const statsLine = lines.find(line => line.includes('平均'));
                    if (statsLine) {
                        console.log(`📊 ${statsLine.trim()}`);
                    }
                } else {
                    console.log('❌ Ping测试失败');
                    console.log(output);
                }
                resolve();
            });
            
            ping.on('error', (err) => {
                console.log(`❌ Ping命令执行失败: ${err.message}`);
                resolve();
            });
        });
    } catch (err) {
        console.log(`❌ Ping测试异常: ${err.message}`);
    }
    
    // 测试端口连通性
    console.log('\n⏳ 测试SQL Server端口(1433)连通性...');
    try {
        const net = require('net');
        const socket = new net.Socket();
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                socket.destroy();
                console.log('❌ 端口1433连接超时');
                resolve();
            }, 5000);
            
            socket.connect(1433, '192.168.1.57', () => {
                clearTimeout(timeout);
                console.log('✅ 端口1433连接成功');
                socket.destroy();
                resolve();
            });
            
            socket.on('error', (err) => {
                clearTimeout(timeout);
                console.log(`❌ 端口1433连接失败: ${err.message}`);
                resolve();
            });
        });
    } catch (err) {
        console.log(`❌ 端口测试异常: ${err.message}`);
    }
}

// 主测试函数
async function runTests() {
    console.log(`🕐 测试开始时间: ${new Date().toLocaleString()}`);
    console.log(`📍 当前工作目录: ${process.cwd()}`);
    console.log(`🖥️  Node.js版本: ${process.version}`);
    console.log();
    
    // 网络连通性测试
    await testNetworkConnectivity();
    
    // 尝试读取db.js配置
    try {
        const dbModule = require('./db.js');
        testConfigs[0].config = dbModule.config;
        console.log('\n✅ 成功读取db.js配置');
    } catch (err) {
        console.log(`\n❌ 读取db.js配置失败: ${err.message}`);
        testConfigs.shift(); // 移除第一个配置
    }
    
    // 测试所有配置
    const results = [];
    for (const testConfig of testConfigs) {
        const result = await testConnection(testConfig.name, testConfig.config);
        results.push({ name: testConfig.name, ...result });
    }
    
    // 汇总结果
    console.log('\n📊 测试结果汇总');
    console.log('===================================');
    results.forEach(result => {
        const status = result.success ? '✅ 成功' : '❌ 失败';
        const time = result.connectTime ? ` (${result.connectTime}ms)` : '';
        console.log(`${result.name}: ${status}${time}`);
        if (!result.success && result.error) {
            console.log(`   错误: ${result.error}`);
        }
    });
    
    console.log(`\n🕐 测试结束时间: ${new Date().toLocaleString()}`);
}

// 运行测试
runTests().catch(err => {
    console.error('测试执行失败:', err);
    process.exit(1);
});
