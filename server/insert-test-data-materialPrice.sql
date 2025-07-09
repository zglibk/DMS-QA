-- 插入MaterialPrice表测试数据
-- 请确保已经执行过表结构升级脚本

USE [你的数据库名称];  -- 请替换为实际的数据库名称
GO

PRINT '开始插入MaterialPrice表测试数据...';

-- 检查表是否存在
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MaterialPrice')
BEGIN
    PRINT '错误: MaterialPrice表不存在，请先执行表结构升级脚本';
    RETURN;
END

-- 检查是否已有数据
DECLARE @ExistingCount INT;
SELECT @ExistingCount = COUNT(*) FROM MaterialPrice;

IF @ExistingCount > 0
BEGIN
    PRINT '警告: MaterialPrice表中已有 ' + CAST(@ExistingCount AS VARCHAR(10)) + ' 条记录';
    PRINT '是否继续添加测试数据？(请手动确认)';
    -- 如果不想覆盖现有数据，请注释掉下面的INSERT语句
END

-- 清空现有数据（可选，如果需要重新开始）
-- DELETE FROM MaterialPrice;
-- PRINT '已清空现有数据';

-- 插入测试数据
PRINT '正在插入测试数据...';

-- 纸张类材料
INSERT INTO MaterialPrice (MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate, IsActive, Version, CreatedBy, UpdatedBy)
VALUES 
('铜版纸 128g', 8.50, '华泰纸业', '高品质铜版纸，适用于高档印刷', GETDATE(), 1, 1, 'admin', 'admin'),
('铜版纸 157g', 9.20, '华泰纸业', '厚度适中，印刷效果佳', GETDATE(), 1, 1, 'admin', 'admin'),
('铜版纸 200g', 11.80, '华泰纸业', '厚重铜版纸，适用于封面印刷', GETDATE(), 1, 1, 'admin', 'admin'),
('胶版纸 70g', 6.30, '晨鸣纸业', '标准胶版纸，适用于内页印刷', GETDATE(), 1, 1, 'admin', 'admin'),
('胶版纸 80g', 6.80, '晨鸣纸业', '常用胶版纸规格', GETDATE(), 1, 1, 'admin', 'admin'),
('新闻纸 45g', 4.20, '华泰纸业', '经济型新闻纸', GETDATE(), 1, 1, 'admin', 'admin'),
('白卡纸 250g', 15.60, '博汇纸业', '高白度白卡纸', GETDATE(), 1, 1, 'admin', 'admin'),
('白卡纸 300g', 18.90, '博汇纸业', '厚重白卡纸，适用于包装', GETDATE(), 1, 1, 'admin', 'admin');

-- 油墨类材料
INSERT INTO MaterialPrice (MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate, IsActive, Version, CreatedBy, UpdatedBy)
VALUES 
('四色油墨套装', 280.00, '东洋油墨', '标准CMYK四色油墨', GETDATE(), 1, 1, 'admin', 'admin'),
('专色油墨-红', 45.00, '东洋油墨', '专色红油墨', GETDATE(), 1, 1, 'admin', 'admin'),
('专色油墨-蓝', 45.00, '东洋油墨', '专色蓝油墨', GETDATE(), 1, 1, 'admin', 'admin'),
('专色油墨-绿', 45.00, '东洋油墨', '专色绿油墨', GETDATE(), 1, 1, 'admin', 'admin'),
('金色油墨', 120.00, '东洋油墨', '金属色油墨，特殊效果', GETDATE(), 1, 1, 'admin', 'admin'),
('银色油墨', 110.00, '东洋油墨', '银色金属油墨', GETDATE(), 1, 1, 'admin', 'admin');

-- 胶水类材料
INSERT INTO MaterialPrice (MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate, IsActive, Version, CreatedBy, UpdatedBy)
VALUES 
('PUR热熔胶', 25.80, '汉高胶水', '高强度装订胶水', GETDATE(), 1, 1, 'admin', 'admin'),
('EVA热熔胶', 18.50, '汉高胶水', '标准装订胶水', GETDATE(), 1, 1, 'admin', 'admin'),
('冷胶', 12.30, '汉高胶水', '冷装订专用胶水', GETDATE(), 1, 1, 'admin', 'admin');

-- 其他材料
INSERT INTO MaterialPrice (MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate, IsActive, Version, CreatedBy, UpdatedBy)
VALUES 
('不干胶标签', 0.15, '艾利丹尼森', '单价按张计算', GETDATE(), 1, 1, 'admin', 'admin'),
('塑料薄膜', 8.90, '金发科技', '包装用塑料薄膜', GETDATE(), 1, 1, 'admin', 'admin'),
('装订线', 2.50, '本地供应商', '装订用线材', GETDATE(), 1, 1, 'admin', 'admin'),
('封面材料', NULL, '待定供应商', '封面特殊材料，价格待定', GETDATE(), 1, 1, 'admin', 'admin'),
('特殊纸张', NULL, '进口供应商', '进口特殊纸张，价格需询价', GETDATE(), 1, 1, 'admin', 'admin');

-- 添加一些历史价格记录示例
PRINT '正在添加历史价格记录示例...';

-- 为铜版纸128g添加价格历史
-- 先将当前记录设为历史
UPDATE MaterialPrice 
SET IsActive = 0, ExpiryDate = DATEADD(day, -30, GETDATE()), UpdatedDate = DATEADD(day, -30, GETDATE())
WHERE MaterialName = '铜版纸 128g' AND Supplier = '华泰纸业' AND IsActive = 1;

-- 添加历史价格
INSERT INTO MaterialPrice (MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate, ExpiryDate, IsActive, Version, CreatedBy, UpdatedBy, CreatedDate, UpdatedDate)
VALUES 
('铜版纸 128g', 8.00, '华泰纸业', '第一季度价格', DATEADD(day, -90, GETDATE()), DATEADD(day, -60, GETDATE()), 0, 1, 'admin', 'admin', DATEADD(day, -90, GETDATE()), DATEADD(day, -60, GETDATE())),
('铜版纸 128g', 8.30, '华泰纸业', '第二季度价格调整', DATEADD(day, -60, GETDATE()), DATEADD(day, -30, GETDATE()), 0, 2, 'admin', 'admin', DATEADD(day, -60, GETDATE()), DATEADD(day, -30, GETDATE()));

-- 添加当前价格
INSERT INTO MaterialPrice (MaterialName, UnitPrice, Supplier, Remarks, EffectiveDate, IsActive, Version, CreatedBy, UpdatedBy)
VALUES 
('铜版纸 128g', 8.50, '华泰纸业', '当前价格，第三季度调整', DATEADD(day, -30, GETDATE()), 1, 3, 'admin', 'admin');

-- 验证插入结果
PRINT '验证插入结果...';

DECLARE @TotalCount INT, @ActiveCount INT, @HistoryCount INT;

SELECT @TotalCount = COUNT(*) FROM MaterialPrice;
SELECT @ActiveCount = COUNT(*) FROM MaterialPrice WHERE IsActive = 1;
SELECT @HistoryCount = COUNT(*) FROM MaterialPrice WHERE IsActive = 0;

PRINT '=== 数据插入完成 ===';
PRINT '总记录数: ' + CAST(@TotalCount AS VARCHAR(10));
PRINT '当前有效记录: ' + CAST(@ActiveCount AS VARCHAR(10));
PRINT '历史记录: ' + CAST(@HistoryCount AS VARCHAR(10));

-- 显示插入的数据样例
PRINT '';
PRINT '当前有效价格记录样例:';
SELECT TOP 5 
    MaterialName as '材料名称',
    UnitPrice as '单价',
    Supplier as '供应商',
    Remarks as '备注',
    Version as '版本'
FROM MaterialPrice 
WHERE IsActive = 1
ORDER BY MaterialName;

PRINT '';
PRINT '历史价格记录样例:';
SELECT TOP 3
    MaterialName as '材料名称',
    UnitPrice as '单价',
    Version as '版本',
    EffectiveDate as '生效日期',
    ExpiryDate as '失效日期'
FROM MaterialPrice 
WHERE IsActive = 0
ORDER BY MaterialName, Version;

PRINT '';
PRINT '测试数据插入完成！现在可以测试材料价格管理功能了。';

GO
