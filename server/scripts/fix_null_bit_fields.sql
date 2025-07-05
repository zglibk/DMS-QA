-- 修复 ComplaintRegister 表中的 NULL bit 字段
-- 将 ReturnGoods 和 IsReprint 字段的 NULL 值设置为 0

USE [DMS-QA]
GO

-- 更新 ReturnGoods 字段的 NULL 值为 0
UPDATE ComplaintRegister 
SET ReturnGoods = 0 
WHERE ReturnGoods IS NULL;

-- 更新 IsReprint 字段的 NULL 值为 0  
UPDATE ComplaintRegister 
SET IsReprint = 0 
WHERE IsReprint IS NULL;

-- 查看更新结果
SELECT 
    COUNT(*) as TotalRecords,
    SUM(CASE WHEN ReturnGoods IS NULL THEN 1 ELSE 0 END) as ReturnGoods_NullCount,
    SUM(CASE WHEN IsReprint IS NULL THEN 1 ELSE 0 END) as IsReprint_NullCount,
    SUM(CASE WHEN ReturnGoods = 1 THEN 1 ELSE 0 END) as ReturnGoods_TrueCount,
    SUM(CASE WHEN IsReprint = 1 THEN 1 ELSE 0 END) as IsReprint_TrueCount
FROM ComplaintRegister;

PRINT '数据修复完成！';
