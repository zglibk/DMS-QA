INSERT INTO InspectionItems (ItemName, Description, SortOrder, DataType, InspectionStandard, AcceptanceCriteria, MaterialCategory, Status)
VALUES 
('外观', '检查包装是否完好，有无脏污', 1, 'Normal', '目视', '无脏污破损', '通用', 1),
('厚度', '测量材料厚度', 2, 'Dimension', '0.05', '±0.005mm', '薄膜', 1),
('宽度', '测量材料宽度', 3, 'Dimension', '500', '±2mm', '薄膜', 1),
('克重', '测量每平方米重量', 2, 'Normal', '157', '±5g', '纸张', 1),
('白度', '测量纸张白度', 3, 'Normal', '90', '≥85', '纸张', 1),
('粘性', '初粘力测试', 4, 'InitialAdhesion', 'Ball No.', '≥8#', '胶水', 1);
