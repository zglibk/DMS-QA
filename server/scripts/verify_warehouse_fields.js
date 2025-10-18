/**
 * 验证入库数字段是否成功添加到数据库表中
 */
const sql = require('mssql');
const config = require('../config/database');

async function verifyWarehouseFields() {
    let pool;
    try {
        console.log('连接数据库...');
        pool = await sql.connect(config.config);
        console.log('数据库连接成功');

        // 验证QrScanRecords表的新字段
        console.log('\n=== 验证QrScanRecords表结构 ===');
        const recordsQuery = `
            SELECT 
                COLUMN_NAME, 
                DATA_TYPE, 
                IS_NULLABLE, 
                COLUMN_DEFAULT,
                CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'QrScanRecords' 
            AND COLUMN_NAME IN (
                'WarehouseQuantity', 
                'WarehouseStatus', 
                'WarehouseConfirmedAt', 
                'WarehouseConfirmedBy', 
                'WarehouseRemark'
            ) 
            ORDER BY COLUMN_NAME
        `;
        
        const recordsResult = await pool.request().query(recordsQuery);
        console.log('QrScanRecords新增字段:');
        recordsResult.recordset.forEach(field => {
            console.log(`  - ${field.COLUMN_NAME}: ${field.DATA_TYPE}${field.CHARACTER_MAXIMUM_LENGTH ? `(${field.CHARACTER_MAXIMUM_LENGTH})` : ''}, 可空: ${field.IS_NULLABLE}, 默认值: ${field.COLUMN_DEFAULT || 'NULL'}`);
        });

        // 验证QrScanMaterials表的新字段
        console.log('\n=== 验证QrScanMaterials表结构 ===');
        const materialsQuery = `
            SELECT 
                COLUMN_NAME, 
                DATA_TYPE, 
                IS_NULLABLE, 
                COLUMN_DEFAULT,
                CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'QrScanMaterials' 
            AND COLUMN_NAME IN (
                'ActualQuantity', 
                'QuantityDifference', 
                'DifferenceReason'
            ) 
            ORDER BY COLUMN_NAME
        `;
        
        const materialsResult = await pool.request().query(materialsQuery);
        console.log('QrScanMaterials新增字段:');
        materialsResult.recordset.forEach(field => {
            console.log(`  - ${field.COLUMN_NAME}: ${field.DATA_TYPE}${field.CHARACTER_MAXIMUM_LENGTH ? `(${field.CHARACTER_MAXIMUM_LENGTH})` : ''}, 可空: ${field.IS_NULLABLE}, 默认值: ${field.COLUMN_DEFAULT || 'NULL'}`);
        });

        // 验证索引是否创建成功
        console.log('\n=== 验证索引创建情况 ===');
        const indexQuery = `
            SELECT 
                i.name AS IndexName,
                t.name AS TableName,
                c.name AS ColumnName
            FROM sys.indexes i
            INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            WHERE i.name IN ('IX_QrScanRecords_WarehouseStatus', 'IX_QrScanRecords_WarehouseConfirmedAt')
            ORDER BY i.name, ic.key_ordinal
        `;
        
        const indexResult = await pool.request().query(indexQuery);
        console.log('入库相关索引:');
        indexResult.recordset.forEach(index => {
            console.log(`  - ${index.IndexName} on ${index.TableName}.${index.ColumnName}`);
        });

        console.log('\n✅ 字段验证完成');
        
    } catch (error) {
        console.error('验证失败:', error.message);
        console.error('错误详情:', error);
    } finally {
        if (pool) {
            await pool.close();
            console.log('数据库连接已关闭');
        }
    }
}

// 执行验证
verifyWarehouseFields();