-- ERP系统集成相关数据表创建脚本
-- 用于存储从迅越ERP系统同步的生产和交付数据

-- 1. ERP生产数据表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='erp_production_data' AND xtype='U')
BEGIN
    CREATE TABLE erp_production_data (
        id INT IDENTITY(1,1) PRIMARY KEY,
        batch_number NVARCHAR(50) NOT NULL, -- 生产批次号
        production_date DATE NOT NULL, -- 生产日期
        product_line NVARCHAR(100), -- 产品线
        quantity INT DEFAULT 0, -- 生产数量
        quality_grade NVARCHAR(20), -- 质量等级
        created_at DATETIME DEFAULT GETDATE(), -- 创建时间
        updated_at DATETIME DEFAULT GETDATE() -- 更新时间
    );
    
    -- 创建索引
    CREATE INDEX idx_batch_date ON erp_production_data (batch_number, production_date);
    CREATE INDEX idx_production_date ON erp_production_data (production_date);
    CREATE INDEX idx_product_line ON erp_production_data (product_line);
    
    PRINT 'ERP生产数据表创建成功';
END
ELSE
BEGIN
    PRINT 'ERP生产数据表已存在';
END
GO

-- 2. ERP交付数据表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='erp_delivery_data' AND xtype='U')
BEGIN
    CREATE TABLE erp_delivery_data (
        id INT IDENTITY(1,1) PRIMARY KEY,
        delivery_number NVARCHAR(50) NOT NULL, -- 交付单号
        delivery_date DATE NOT NULL, -- 交付日期
        customer_code NVARCHAR(50), -- 客户代码
        quantity INT DEFAULT 0, -- 交付数量
        delivery_status NVARCHAR(20) DEFAULT 'pending', -- 交付状态
        created_at DATETIME DEFAULT GETDATE(), -- 创建时间
        updated_at DATETIME DEFAULT GETDATE() -- 更新时间
    );
    
    -- 创建索引
    CREATE INDEX idx_delivery_date ON erp_delivery_data (delivery_date);
    CREATE INDEX idx_customer_code ON erp_delivery_data (customer_code);
    CREATE INDEX idx_delivery_number ON erp_delivery_data (delivery_number);
    
    PRINT 'ERP交付数据表创建成功';
END
ELSE
BEGIN
    PRINT 'ERP交付数据表已存在';
END
GO

-- 3. 质量指标表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='quality_metrics' AND xtype='U')
BEGIN
    CREATE TABLE quality_metrics (
        id INT IDENTITY(1,1) PRIMARY KEY,
        metric_name NVARCHAR(50) NOT NULL, -- 指标名称
        metric_value DECIMAL(10,4) NOT NULL, -- 指标值
        calculation_date DATE NOT NULL, -- 计算日期
        created_at DATETIME DEFAULT GETDATE() -- 创建时间
    );
    
    -- 创建索引
    CREATE INDEX idx_metric_name ON quality_metrics (metric_name);
    CREATE INDEX idx_calculation_date ON quality_metrics (calculation_date);
    
    PRINT '质量指标表创建成功';
END
ELSE
BEGIN
    PRINT '质量指标表已存在';
END
GO

-- 4. ERP同步日志表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='erp_sync_logs' AND xtype='U')
BEGIN
    CREATE TABLE erp_sync_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sync_id NVARCHAR(50) NOT NULL, -- 同步ID
        start_time DATETIME NOT NULL, -- 开始时间
        end_time DATETIME, -- 结束时间
        duration INT, -- 持续时间(毫秒)
        status NVARCHAR(20) NOT NULL, -- 同步状态
        sync_types NVARCHAR(200), -- 同步类型
        results NTEXT, -- 同步结果详情
        created_at DATETIME DEFAULT GETDATE() -- 创建时间
    );
    
    -- 创建索引
    CREATE INDEX idx_sync_id ON erp_sync_logs (sync_id);
    CREATE INDEX idx_start_time ON erp_sync_logs (start_time);
    CREATE INDEX idx_status ON erp_sync_logs (status);
    
    PRINT 'ERP同步日志表创建成功';
END
ELSE
BEGIN
    PRINT 'ERP同步日志表已存在';
END
GO

-- 5. ERP配置表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='erp_config' AND xtype='U')
BEGIN
    CREATE TABLE erp_config (
        id INT IDENTITY(1,1) PRIMARY KEY,
        config_key NVARCHAR(50) NOT NULL UNIQUE, -- 配置键
        config_value NVARCHAR(500), -- 配置值
        description NVARCHAR(200), -- 配置描述
        created_at DATETIME DEFAULT GETDATE(), -- 创建时间
        updated_at DATETIME DEFAULT GETDATE() -- 更新时间
    );
    
    -- 创建索引
    CREATE INDEX idx_config_key ON erp_config (config_key);
    
    PRINT 'ERP配置表创建成功';
END
ELSE
BEGIN
    PRINT 'ERP配置表已存在';
END
GO

-- 插入默认配置数据
IF NOT EXISTS (SELECT * FROM erp_config WHERE config_key = 'sync_enabled')
BEGIN
    INSERT INTO erp_config (config_key, config_value, description) VALUES
    ('sync_enabled', 'true', '是否启用自动同步'),
    ('sync_interval', '0 */1 * * *', '同步间隔(cron表达式)'),
    ('sync_time_range', '24', '同步时间范围(小时)'),
    ('erp_api_url', 'http://api.xinyueerp.com', 'ERP系统API地址'),
    ('erp_app_id', 'your_app_id', 'ERP系统应用ID'),
    ('erp_app_secret', 'your_app_secret', 'ERP系统应用密钥');
    
    PRINT '默认ERP配置数据插入成功';
END
ELSE
BEGIN
    PRINT 'ERP配置数据已存在';
END
GO

-- 创建视图：客户投诉率统计
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='v_complaint_rate_stats' AND xtype='V')
BEGIN
    EXEC('CREATE VIEW v_complaint_rate_stats AS
    SELECT 
        CONVERT(DATE, d.delivery_date) as stat_date,
        COUNT(d.id) as total_deliveries,
        SUM(d.quantity) as total_quantity,
        COUNT(c.id) as total_complaints,
        CASE 
            WHEN COUNT(d.id) > 0 THEN CAST(COUNT(c.id) * 100.0 / COUNT(d.id) AS DECIMAL(10,2))
            ELSE 0 
        END as complaint_rate
    FROM erp_delivery_data d
    LEFT JOIN CustomerComplaints c ON CONVERT(DATE, d.delivery_date) = CONVERT(DATE, c.Date)
    WHERE d.delivery_date >= DATEADD(day, -30, GETDATE())
    GROUP BY CONVERT(DATE, d.delivery_date)');
    
    PRINT '客户投诉率统计视图创建成功';
END
ELSE
BEGIN
    PRINT '客户投诉率统计视图已存在';
END
GO

-- 创建存储过程：手动触发ERP数据同步
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sp_trigger_erp_sync' AND xtype='P')
BEGIN
    EXEC('CREATE PROCEDURE sp_trigger_erp_sync
        @sync_types NVARCHAR(200) = ''production,delivery'',
        @time_range INT = 24
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @sync_id NVARCHAR(50) = CAST(GETDATE() AS NVARCHAR(50));
        DECLARE @start_time DATETIME = GETDATE();
        
        -- 记录同步开始
        INSERT INTO erp_sync_logs (sync_id, start_time, status, sync_types)
        VALUES (@sync_id, @start_time, ''manual_triggered'', @sync_types);
        
        -- 返回同步ID供外部程序使用
        SELECT @sync_id as sync_id, @start_time as start_time;
        
        PRINT ''手动ERP同步已触发，同步ID: '' + @sync_id;
    END');
    
    PRINT '手动触发ERP同步存储过程创建成功';
END
ELSE
BEGIN
    PRINT '手动触发ERP同步存储过程已存在';
END
GO

PRINT '===================================';
PRINT 'ERP系统集成数据表创建完成！';
PRINT '包含以下表和对象：';
PRINT '1. erp_production_data - ERP生产数据表';
PRINT '2. erp_delivery_data - ERP交付数据表';
PRINT '3. quality_metrics - 质量指标表';
PRINT '4. erp_sync_logs - ERP同步日志表';
PRINT '5. erp_config - ERP配置表';
PRINT '6. v_complaint_rate_stats - 客户投诉率统计视图';
PRINT '7. sp_trigger_erp_sync - 手动触发同步存储过程';
PRINT '===================================';