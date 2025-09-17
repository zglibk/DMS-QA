/**
 * 检查publishing_exceptions表的结构和字段名
 * 用于了解异常表的具体字段，以便在存储过程中正确引用
 */

const { executeQuery, sql } = require('./config/database');

/**
 * 检查publishing_exceptions表的结构
 * 查看表的字段定义、数据类型和样本数据
 */
async function checkPublishingExceptionsStructure() {
    try {
        console.log('使用现有数据库连接池...');

        // 1. 检查表是否存在
        console.log('\n=== 检查publishing_exceptions表是否存在 ===');
        const tableExists = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'publishing_exceptions'
            `);
        });

        if (tableExists.recordset.length === 0) {
            console.log('❌ publishing_exceptions表不存在');
            return;
        }

        console.log('✓ publishing_exceptions表存在');

        // 2. 查看表结构
        console.log('\n=== publishing_exceptions表结构 ===');
        const tableStructure = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT,
                    CHARACTER_MAXIMUM_LENGTH
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'publishing_exceptions'
                ORDER BY ORDINAL_POSITION
            `);
        });

        console.log('表字段结构:');
        tableStructure.recordset.forEach(column => {
            console.log(`  ${column.COLUMN_NAME}: ${column.DATA_TYPE}${column.CHARACTER_MAXIMUM_LENGTH ? `(${column.CHARACTER_MAXIMUM_LENGTH})` : ''} ${column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // 3. 查看数据总数
        console.log('\n=== 数据统计 ===');
        const dataCount = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT COUNT(*) as TotalCount 
                FROM publishing_exceptions
            `);
        });

        console.log(`总记录数: ${dataCount.recordset[0].TotalCount} 条`);

        // 4. 查看样本数据（前5条）
        if (dataCount.recordset[0].TotalCount > 0) {
            console.log('\n=== 样本数据（前5条）===');
            const sampleData = await executeQuery(async (pool) => {
                return await pool.request().query(`
                    SELECT TOP 5 * 
                    FROM publishing_exceptions
                    ORDER BY 1 DESC
                `);
            });

            console.log('样本记录:');
            sampleData.recordset.forEach((record, index) => {
                console.log(`\n记录 ${index + 1}:`);
                Object.keys(record).forEach(key => {
                    let value = record[key];
                    if (value instanceof Date) {
                        value = value.toISOString().split('T')[0];
                    }
                    console.log(`  ${key}: ${value}`);
                });
            });

            // 5. 查看可能的责任人字段
            console.log('\n=== 查找可能的责任人相关字段 ===');
            const possiblePersonFields = tableStructure.recordset.filter(column => 
                column.COLUMN_NAME.toLowerCase().includes('person') ||
                column.COLUMN_NAME.toLowerCase().includes('responsible') ||
                column.COLUMN_NAME.toLowerCase().includes('user') ||
                column.COLUMN_NAME.toLowerCase().includes('name') ||
                column.COLUMN_NAME.toLowerCase().includes('operator')
            );

            if (possiblePersonFields.length > 0) {
                console.log('可能的责任人字段:');
                possiblePersonFields.forEach(field => {
                    console.log(`  ${field.COLUMN_NAME}: ${field.DATA_TYPE}`);
                });
            } else {
                console.log('未找到明显的责任人字段，需要查看具体数据内容');
            }

            // 6. 查看可能的金额字段
            console.log('\n=== 查找可能的金额相关字段 ===');
            const possibleAmountFields = tableStructure.recordset.filter(column => 
                column.COLUMN_NAME.toLowerCase().includes('amount') ||
                column.COLUMN_NAME.toLowerCase().includes('cost') ||
                column.COLUMN_NAME.toLowerCase().includes('price') ||
                column.COLUMN_NAME.toLowerCase().includes('money') ||
                column.COLUMN_NAME.toLowerCase().includes('fee') ||
                column.DATA_TYPE.toLowerCase().includes('money') ||
                column.DATA_TYPE.toLowerCase().includes('decimal')
            );

            if (possibleAmountFields.length > 0) {
                console.log('可能的金额字段:');
                possibleAmountFields.forEach(field => {
                    console.log(`  ${field.COLUMN_NAME}: ${field.DATA_TYPE}`);
                });
            } else {
                console.log('未找到明显的金额字段');
            }

            // 7. 查看可能的日期字段
            console.log('\n=== 查找可能的日期相关字段 ===');
            const possibleDateFields = tableStructure.recordset.filter(column => 
                column.DATA_TYPE.toLowerCase().includes('date') ||
                column.DATA_TYPE.toLowerCase().includes('time') ||
                column.COLUMN_NAME.toLowerCase().includes('date') ||
                column.COLUMN_NAME.toLowerCase().includes('time') ||
                column.COLUMN_NAME.toLowerCase().includes('created')
            );

            if (possibleDateFields.length > 0) {
                console.log('可能的日期字段:');
                possibleDateFields.forEach(field => {
                    console.log(`  ${field.COLUMN_NAME}: ${field.DATA_TYPE}`);
                });
            }
        }

        console.log('\n=== 检查完成 ===');

    } catch (error) {
        console.error('检查过程中发生错误:', error.message);
        console.error('错误详情:', error);
    }
}

// 执行检查
checkPublishingExceptionsStructure();