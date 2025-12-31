-- Clear existing items
DELETE FROM InspectionItems;

-- Reset Identity (Optional, but good for clean IDs)
DBCC CHECKIDENT ('InspectionItems', RESEED, 0);

-- 纸张 Items
INSERT INTO InspectionItems (ItemName, MaterialCategory, DataType, SortOrder, Description, InspectionStandard, AcceptanceCriteria, Unit, Status, CreatedBy) VALUES
('包装标识', '纸张', 'Normal', 1, '检查包装完整性和标识清晰度', '目视', '包装完好，标识清晰', '', 1, 'system'),
('表面', '纸张', 'Normal', 2, '检查产品表面是否有污渍、破损', '目视', '无污渍、无破损', '', 1, 'system'),
('尺寸', '纸张', 'Dimension', 3, '测量长宽或直径', '图纸', '符合图纸要求', 'mm', 1, 'system'),
('初粘性', '纸张', 'InitialAdhesion', 4, '滚球法测试', 'GB/T 4852', '≥ 8#', '', 1, 'system'),
('持粘性', '纸张', 'HoldingPower', 5, '挂重法测试', 'GB/T 4851', '≥ 24h', 'h', 1, 'system'),
('剥离力(180°)', '纸张', 'Force', 6, '180度剥离强度测试', 'GB/T 2792', '≥ 5.0 N/25mm', 'N/25mm', 1, 'system');

-- 膜类 Items
INSERT INTO InspectionItems (ItemName, MaterialCategory, DataType, SortOrder, Description, InspectionStandard, AcceptanceCriteria, Unit, Status, CreatedBy) VALUES
('包装标识', '膜类', 'Normal', 1, '检查包装完整性和标识清晰度', '目视', '包装完好，标识清晰', '', 1, 'system'),
('表面', '膜类', 'Normal', 2, '检查产品表面是否有污渍、破损', '目视', '无污渍、无破损', '', 1, 'system'),
('尺寸', '膜类', 'Dimension', 3, '测量长宽或直径', '图纸', '符合图纸要求', 'mm', 1, 'system'),
('初粘性', '膜类', 'InitialAdhesion', 4, '滚球法测试', 'GB/T 4852', '≥ 6#', '', 1, 'system'),
('持粘性', '膜类', 'HoldingPower', 5, '挂重法测试', 'GB/T 4851', '≥ 48h', 'h', 1, 'system'),
('剥离力(180°)', '膜类', 'Force', 6, '180度剥离强度测试', 'GB/T 2792', '≥ 3.0 N/25mm', 'N/25mm', 1, 'system');

-- 油墨 Items
INSERT INTO InspectionItems (ItemName, MaterialCategory, DataType, SortOrder, Description, InspectionStandard, AcceptanceCriteria, Unit, Status, CreatedBy) VALUES
('外观', '油墨', 'Normal', 1, '检查油墨颜色、状态', '目视', '色泽正常，无沉淀结块', '', 1, 'system');
