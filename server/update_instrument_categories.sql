-- =====================================================
-- 更新仪器分类数据脚本
-- 基于公司实际仪器清单重新设计分类
-- 执行日期：2025年
-- =====================================================

USE [DMS-QA];

PRINT '开始更新仪器分类数据...';

-- 清空现有分类数据（保留表结构）
DELETE FROM InstrumentCategories;
PRINT '✅ 清空现有分类数据完成';

-- 重置自增ID
DBCC CHECKIDENT ('InstrumentCategories', RESEED, 0);
PRINT '✅ 重置ID序列完成';

-- 插入新的仪器分类数据
INSERT INTO InstrumentCategories (CategoryCode, CategoryName, Description, IsActive, CreatedAt, UpdatedAt) VALUES
-- 环境测试仪器
('ENV_TEST', '环境测试仪器', '用于环境条件测试和控制的仪器设备', 1, GETDATE(), GETDATE()),
-- 力学测试仪器  
('MECH_TEST', '力学测试仪器', '用于材料力学性能测试的仪器设备', 1, GETDATE(), GETDATE()),
-- 胶粘性能测试仪器
('ADHESIVE_TEST', '胶粘性能测试仪器', '用于胶带、胶水等粘性材料测试的仪器设备', 1, GETDATE(), GETDATE()),
-- 耐磨耐久测试仪器
('DURABILITY_TEST', '耐磨耐久测试仪器', '用于材料耐磨性和耐久性测试的仪器设备', 1, GETDATE(), GETDATE()),
-- 条码检测仪器
('BARCODE_TEST', '条码检测仪器', '用于条码质量检测和验证的仪器设备', 1, GETDATE(), GETDATE()),
-- 电学测试仪器
('ELECTRICAL_TEST', '电学测试仪器', '用于电阻、静电等电学性能测试的仪器设备', 1, GETDATE(), GETDATE()),
-- 光学测试仪器
('OPTICAL_TEST', '光学测试仪器', '用于颜色、色差等光学性能测试的仪器设备', 1, GETDATE(), GETDATE()),
-- 精密测量仪器
('PRECISION_MEASURE', '精密测量仪器', '用于长度、厚度等精密尺寸测量的仪器设备', 1, GETDATE(), GETDATE()),
-- 称重测量仪器
('WEIGHING_MEASURE', '称重测量仪器', '用于重量测量的各类电子秤具', 1, GETDATE(), GETDATE()),
-- 基础测量工具
('BASIC_MEASURE', '基础测量工具', '基础的测量工具和量具', 1, GETDATE(), GETDATE());

PRINT '✅ 新仪器分类数据插入完成';

-- 验证插入结果
SELECT 
    ID,
    CategoryCode,
    CategoryName,
    Description,
    IsActive,
    CreatedAt
FROM InstrumentCategories 
ORDER BY ID;

PRINT '🎉 仪器分类数据更新完成！';
PRINT '';
PRINT '新增分类说明：';
PRINT '1. ENV_TEST - 环境测试仪器（数显温湿度计、恒温恒湿试验箱）';
PRINT '2. MECH_TEST - 力学测试仪器（剥离力试验机）';
PRINT '3. ADHESIVE_TEST - 胶粘性能测试仪器（初粘性测试仪、胶带持粘性测试仪）';
PRINT '4. DURABILITY_TEST - 耐磨耐久测试仪器（多功能耐磨擦试验机）';
PRINT '5. BARCODE_TEST - 条码检测仪器（RJS条码检测仪、条码测试仪）';
PRINT '6. ELECTRICAL_TEST - 电学测试仪器（表面电阻测试仪、静电测试仪）';
PRINT '7. OPTICAL_TEST - 光学测试仪器（X-Rite色差仪）';
PRINT '8. PRECISION_MEASURE - 精密测量仪器（数显卡尺、数显外径千分尺、数显千分测厚规）';
PRINT '9. WEIGHING_MEASURE - 称重测量仪器（电子计重称、电子台称）';
PRINT '10. BASIC_MEASURE - 基础测量工具（钢直尺）';