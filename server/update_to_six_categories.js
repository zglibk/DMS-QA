/**
 * 更新仪器分类为指定的6个分类
 * 清空现有数据并插入新的6个标准分类
 */

const sql = require('mssql');
require('dotenv').config();

// 数据库配置
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Qa369*',
  server: process.env.DB_SERVER || '192.168.1.57',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'DMS-QA',|| 1433,
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true
    }
};

/**
 * 主函数：更新仪器分类数据
 */
async function updateInstrumentCategories() {
    let pool;
    
    try {
        console.log('连接数据库...');
        pool = await sql.connect(config);
        console.log('数据库连接成功\n');

        // 1. 查询当前分类数据
        console.log('=== 更新前的分类数据 ===');
        const currentResult = await pool.request().query(`
            SELECT ID, CategoryCode, CategoryName, Description, IsActive, CreatedAt
            FROM InstrumentCategories 
            ORDER BY ID
        `);
        
        console.log(`当前共有 ${currentResult.recordset.length} 个分类：`);
        currentResult.recordset.forEach((category, index) => {
            console.log(`${index + 1}. ${category.CategoryName} (${category.CategoryCode})`);
        });
        console.log('');

        // 2. 清空现有分类数据
        console.log('清空现有分类数据...');
        await pool.request().query('DELETE FROM InstrumentCategories');
        console.log('✅ 清空完成');

        // 3. 重置自增ID
        console.log('重置自增ID...');
        await pool.request().query('DBCC CHECKIDENT (\'InstrumentCategories\', RESEED, 0)');
        console.log('✅ ID重置完成');

        // 4. 插入新的6个分类
        console.log('插入新的6个标准分类...');
        const insertQuery = `
            INSERT INTO InstrumentCategories (CategoryCode, CategoryName, Description, IsActive, CreatedAt, UpdatedAt) 
            VALUES 
            ('ELECTROMAGNETIC', '电磁', '电磁测量仪器设备', 1, GETDATE(), GETDATE()),
            ('TIME_FREQUENCY', '时间频率', '时间频率测量仪器设备', 1, GETDATE(), GETDATE()),
            ('LENGTH', '长度', '长度测量仪器设备', 1, GETDATE(), GETDATE()),
            ('MECHANICS', '力学', '力学测量仪器设备', 1, GETDATE(), GETDATE()),
            ('THERMAL', '热工', '热工测量仪器设备', 1, GETDATE(), GETDATE()),
            ('PHYSICOCHEMICAL', '理化', '理化测量仪器设备', 1, GETDATE(), GETDATE())
        `;
        
        await pool.request().query(insertQuery);
        console.log('✅ 新分类插入完成');

        // 5. 验证更新结果
        console.log('\n=== 更新后的分类数据 ===');
        const newResult = await pool.request().query(`
            SELECT ID, CategoryCode, CategoryName, Description, IsActive, CreatedAt
            FROM InstrumentCategories 
            ORDER BY ID
        `);
        
        console.log(`更新后共有 ${newResult.recordset.length} 个分类：`);
        newResult.recordset.forEach((category, index) => {
            console.log(`${index + 1}. ID: ${category.ID} | 编码: ${category.CategoryCode} | 名称: ${category.CategoryName}`);
            console.log(`   描述: ${category.Description}`);
            console.log(`   状态: ${category.IsActive ? '有效' : '无效'}`);
            console.log(`   创建时间: ${category.CreatedAt}`);
            console.log('   ' + '-'.repeat(60));
        });

        console.log('\n🎉 仪器分类更新完成！');
        console.log('现在数据库中只包含指定的6个标准分类：');
        console.log('1. 电磁');
        console.log('2. 时间频率');
        console.log('3. 长度');
        console.log('4. 力学');
        console.log('5. 热工');
        console.log('6. 理化');

    } catch (error) {
        console.error('❌ 更新失败:', error.message);
        console.error('错误详情:', error);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n数据库连接已关闭');
        }
    }
}

// 执行更新
updateInstrumentCategories();