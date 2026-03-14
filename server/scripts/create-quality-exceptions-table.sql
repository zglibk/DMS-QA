
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QualityExceptions')
BEGIN
    CREATE TABLE QualityExceptions (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        ExceptionNumber NVARCHAR(50) NOT NULL UNIQUE, -- 异常单号 QCYMMDD-001
        ReportDate DATETIME, -- 填报日期
        Reporter NVARCHAR(50), -- 填报人
        ProductName NVARCHAR(255), -- 产品名称
        MaterialCode NVARCHAR(100), -- 物料编码
        ModelSpec NVARCHAR(255), -- 型号/规格
        CustomerCode NVARCHAR(50), -- 客户编码
        WorkOrderNum NVARCHAR(50), -- 工单号
        ProductionQuantity DECIMAL(18, 2), -- 生产数量
        ExceptionQuantity DECIMAL(18, 2), -- 异常数量
        DiscoveryStage NVARCHAR(50), -- 异常发现阶段 (Incoming, Process, Finished, Shipment)
        Description NVARCHAR(MAX), -- 异常描述
        Images NVARCHAR(MAX), -- 不良品图片 (JSON array)
        PreliminaryCause NVARCHAR(MAX), -- 初步原因分析
        ResponsibleDepartment NVARCHAR(100), -- 责任部门
        HandlingMethod NVARCHAR(50), -- 处理方式 (Rework, Scrap, Concession, Selection)
        TemporaryCountermeasure NVARCHAR(MAX), -- 临时对策
        PermanentCountermeasure NVARCHAR(MAX), -- 永久对策
        CompletionDeadline DATETIME, -- 完成期限
        Executor NVARCHAR(50), -- 对策执行人
        Verifier NVARCHAR(50), -- 验证人
        VerificationResult NVARCHAR(50), -- 验证结果 (Pass, Fail)
        CloseDate DATETIME, -- 关闭日期
        Remarks NVARCHAR(MAX), -- 备注
        Status NVARCHAR(50) DEFAULT 'Open', -- 状态 (Open, Closed)
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
END
