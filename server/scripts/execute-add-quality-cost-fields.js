/**
 * 执行添加质量成本字段的数据库脚本
 * 
 * 功能说明：
 * 1. 连接到SQL Server数据库
 * 2. 执行SQL脚本添加质量成本相关字段
 * 3. 为新字段创建索引和注释
 * 4. 输出执行结果
 */

const fs = require('fs');
const path = require('path');
// 引入项目的数据库连接函数
const { executeQuery } = require('../db');

/**
 * 执行添加质量成本字段的SQL脚本
 */
async function addQualityCostFields() {
    try {
        console.log('开始执行质量成本字段添加脚本...');
        
        // 读取SQL脚本文件
        const sqlFilePath = path.join(__dirname, 'add-quality-cost-fields.sql');
        const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('开始执行质量成本字段SQL脚本...');
        
        // 分割SQL脚本（按GO分割）
        const sqlCommands = sqlScript.split(/\bGO\b/gi).filter(cmd => cmd.trim());
        
        // 逐个执行SQL命令
        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i].trim();
            if (command) {
                console.log(`执行SQL命令 ${i + 1}/${sqlCommands.length}...`);
                try {
                    await executeQuery(async (pool) => {
                        return await pool.request().query(command);
                    });
                } catch (cmdError) {
                    // 如果是字段已存在的错误，可以忽略
                    if (cmdError.message.includes('already exists') || 
                        cmdError.message.includes('已存在') ||
                        cmdError.message.includes('Column names in each table must be unique')) {
                        console.log(`⚠️ 跳过已存在的字段: ${cmdError.message}`);
                    } else {
                        throw cmdError;
                    }
                }
            }
        }
        
        console.log('✅ 质量成本字段添加脚本执行成功！');
        
        // 验证字段是否创建成功
        console.log('\n验证质量成本字段...');
        const verifyResult = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'CustomerComplaints' 
                AND COLUMN_NAME IN (
                    'QualityPenalty', 'ReworkCost', 'CustomerCompensation', 
                    'QualityLossCost', 'InspectionCost', 'TransportationCost', 
                    'PreventionCost', 'TotalQualityCost', 'CostRemarks'
                )
                ORDER BY COLUMN_NAME
            `);
        });
        
        if (verifyResult.recordset.length > 0) {
            console.log('\n✅ 质量成本字段验证成功:');
            verifyResult.recordset.forEach(field => {
                console.log(`  - ${field.COLUMN_NAME}: ${field.DATA_TYPE} (可空: ${field.IS_NULLABLE})`);
            });
        } else {
            console.log('⚠️ 未找到质量成本字段，请检查执行结果');
        }
        
        console.log('\n🎉 质量成本字段添加完成！');
        console.log('已添加的字段包括：');
        console.log('1. QualityPenalty - 质量罚款');
        console.log('2. ReworkCost - 返工成本');
        console.log('3. CustomerCompensation - 客户赔偿');
        console.log('4. QualityLossCost - 质量损失成本');
        console.log('5. InspectionCost - 检验成本');
        console.log('6. TransportationCost - 运输成本');
        console.log('7. PreventionCost - 预防成本');
        console.log('8. TotalQualityCost - 总质量成本（计算字段）');
        console.log('9. CostRemarks - 成本备注');
        
    } catch (error) {
        console.error('❌ 质量成本字段添加失败:', error.message);
        console.error('错误详情:', error);
        throw error;
    }
}

// 执行脚本
if (require.main === module) {
    addQualityCostFields()
        .then(() => {
            console.log('\n脚本执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n脚本执行失败:', error.message);
            process.exit(1);
        });
}

module.exports = { addQualityCostFields };