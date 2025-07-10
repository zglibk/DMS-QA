// 更新2025年7月批次数据的Node.js脚本
const sql = require('mssql');
const path = require('path');

// 数据库配置
const config = {
    server: 'localhost',
    database: 'DMS_QA',
    options: {
        trustedConnection: true,
        enableArithAbort: true,
        encrypt: false,
        trustServerCertificate: true
    }
};

async function updateJulyData() {
    try {
        console.log('连接数据库...');
        const pool = await sql.connect(config);
        
        // 更新2025年7月的批次数据
        const updateQuery = `
            UPDATE [dbo].[MonthlyBatchStats] 
            SET 
                [InspectionBatches] = 159,
                [DeliveryBatches] = 151,
                [Remarks] = N'2025年7月数据 - 已更新',
                [UpdatedBy] = N'admin',
                [UpdatedAt] = GETDATE()
            WHERE [StatYear] = 2025 AND [StatMonth] = 7;
        `;
        
        console.log('执行更新SQL...');
        const updateResult = await pool.request().query(updateQuery);
        
        if (updateResult.rowsAffected[0] === 0) {
            // 如果没有更新任何行，说明数据不存在，需要插入
            console.log('7月数据不存在，插入新数据...');
            const insertQuery = `
                INSERT INTO [dbo].[MonthlyBatchStats] 
                ([StatYear], [StatMonth], [InspectionBatches], [DeliveryBatches], [Remarks], [CreatedBy], [CreatedAt])
                VALUES 
                (2025, 7, 159, 151, N'2025年7月数据 - 新增', N'admin', GETDATE());
            `;
            
            await pool.request().query(insertQuery);
            console.log('✅ 2025年7月批次数据已插入');
        } else {
            console.log('✅ 2025年7月批次数据已更新');
        }
        
        // 验证数据
        console.log('验证更新结果...');
        const verifyQuery = `
            SELECT 
                [StatYear] as 年份,
                [StatMonth] as 月份,
                [InspectionBatches] as 交检批次,
                [DeliveryBatches] as 发货批次,
                [Remarks] as 备注,
                [UpdatedAt] as 更新时间
            FROM [dbo].[MonthlyBatchStats] 
            WHERE [StatYear] = 2025 AND [StatMonth] = 7;
        `;
        
        const verifyResult = await pool.request().query(verifyQuery);
        
        if (verifyResult.recordset.length > 0) {
            console.log('📊 验证结果:');
            console.table(verifyResult.recordset);
        } else {
            console.log('❌ 验证失败：未找到7月数据');
        }
        
        await pool.close();
        console.log('🎉 数据更新完成！');
        
    } catch (error) {
        console.error('❌ 更新失败:', error.message);
        process.exit(1);
    }
}

// 执行更新
updateJulyData();
