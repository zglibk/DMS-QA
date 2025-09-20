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
END
GO

-- 5. 成本计算表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cost_calculations' AND xtype='U')
BEGIN
    CREATE TABLE cost_calculations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        calculation_id NVARCHAR(50) NOT NULL, -- 计算ID
        calculation_date DATE NOT NULL, -- 计算日期
        total_cost DECIMAL(15,2) DEFAULT 0, -- 总成本
        material_cost DECIMAL(15,2) DEFAULT 0, -- 材料成本
        labor_cost DECIMAL(15,2) DEFAULT 0, -- 人工成本
        overhead_cost DECIMAL(15,2) DEFAULT 0, -- 管理费用
        quality_cost DECIMAL(15,2) DEFAULT 0, -- 质量成本
        created_at DATETIME DEFAULT GETDATE(), -- 创建时间
        updated_at DATETIME DEFAULT GETDATE() -- 更新时间
    );
    
    -- 创建索引
    CREATE INDEX idx_calculation_date ON cost_calculations (calculation_date);
    CREATE INDEX idx_calculation_id ON cost_calculations (calculation_id);
END
GO

-- 6. 工作计划表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='work_plans' AND xtype='U')
BEGIN
    CREATE TABLE work_plans (
        id INT IDENTITY(1,1) PRIMARY KEY,
        plan_id NVARCHAR(50) NOT NULL, -- 计划ID
        plan_name NVARCHAR(200) NOT NULL, -- 计划名称
        plan_type NVARCHAR(50), -- 计划类型
        start_date DATE, -- 开始日期
        end_date DATE, -- 结束日期
        status NVARCHAR(20) DEFAULT 'pending', -- 状态
        assigned_to NVARCHAR(100), -- 分配给
        description NTEXT, -- 描述
        created_at DATETIME DEFAULT GETDATE(), -- 创建时间
        updated_at DATETIME DEFAULT GETDATE() -- 更新时间
    );
    
    -- 创建索引
    CREATE INDEX idx_plan_id ON work_plans (plan_id);
    CREATE INDEX idx_start_date ON work_plans (start_date);
    CREATE INDEX idx_status ON work_plans (status);
    CREATE INDEX idx_assigned_to ON work_plans (assigned_to);
END
GO

-- 7. 质量检查记录表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='quality_checks' AND xtype='U')
BEGIN
    CREATE TABLE quality_checks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        check_id NVARCHAR(50) NOT NULL, -- 检查ID
        batch_number NVARCHAR(50), -- 批次号
        check_date DATE NOT NULL, -- 检查日期
        check_type NVARCHAR(50), -- 检查类型
        check_result NVARCHAR(20), -- 检查结果
        defect_count INT DEFAULT 0, -- 缺陷数量
        inspector NVARCHAR(100), -- 检查员
        notes NTEXT, -- 备注
        created_at DATETIME DEFAULT GETDATE() -- 创建时间
    );
    
    -- 创建索引
    CREATE INDEX idx_check_id ON quality_checks (check_id);
    CREATE INDEX idx_batch_number ON quality_checks (batch_number);
    CREATE INDEX idx_check_date ON quality_checks (check_date);
    CREATE INDEX idx_check_result ON quality_checks (check_result);
END
GO

-- 8. 系统配置表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_config' AND xtype='U')
BEGIN
    CREATE TABLE system_config (
        id INT IDENTITY(1,1) PRIMARY KEY,
        config_key NVARCHAR(100) NOT NULL UNIQUE, -- 配置键
        config_value NVARCHAR(500), -- 配置值
        config_type NVARCHAR(50) DEFAULT 'string', -- 配置类型
        description NVARCHAR(200), -- 描述
        is_active BIT DEFAULT 1, -- 是否激活
        created_at DATETIME DEFAULT GETDATE(), -- 创建时间
        updated_at DATETIME DEFAULT GETDATE() -- 更新时间
    );
    
    -- 创建索引
    CREATE INDEX idx_config_key ON system_config (config_key);
    CREATE INDEX idx_is_active ON system_config (is_active);
    
    -- 插入默认配置
    INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
    ('erp_sync_interval', '3600', 'number', 'ERP同步间隔时间(秒)'),
    ('quality_threshold', '95.0', 'number', '质量合格阈值(%)'),
    ('cost_calculation_enabled', 'true', 'boolean', '是否启用成本计算'),
    ('notification_enabled', 'true', 'boolean', '是否启用通知功能'),
    ('max_sync_retries', '3', 'number', '最大同步重试次数');
END
GO

-- 创建存储过程：计算质量指标
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sp_calculate_quality_metrics' AND xtype='P')
BEGIN
    EXEC('
    CREATE PROCEDURE sp_calculate_quality_metrics
        @calculation_date DATE = NULL
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- 如果未指定日期，使用当前日期
        IF @calculation_date IS NULL
            SET @calculation_date = CAST(GETDATE() AS DATE);
        
        -- 计算合格率
        DECLARE @pass_rate DECIMAL(10,4);
        SELECT @pass_rate = 
            CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE CAST(SUM(CASE WHEN check_result = ''pass'' THEN 1 ELSE 0 END) AS DECIMAL(10,4)) / COUNT(*) * 100
            END
        FROM quality_checks 
        WHERE check_date = @calculation_date;
        
        -- 插入或更新质量指标
        IF EXISTS (SELECT 1 FROM quality_metrics WHERE metric_name = ''pass_rate'' AND calculation_date = @calculation_date)
        BEGIN
            UPDATE quality_metrics 
            SET metric_value = @pass_rate 
            WHERE metric_name = ''pass_rate'' AND calculation_date = @calculation_date;
        END
        ELSE
        BEGIN
            INSERT INTO quality_metrics (metric_name, metric_value, calculation_date)
            VALUES (''pass_rate'', @pass_rate, @calculation_date);
        END
        
        -- 计算缺陷率
        DECLARE @defect_rate DECIMAL(10,4);
        SELECT @defect_rate = 
            CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE CAST(SUM(defect_count) AS DECIMAL(10,4)) / COUNT(*) 
            END
        FROM quality_checks 
        WHERE check_date = @calculation_date;
        
        -- 插入或更新缺陷率指标
        IF EXISTS (SELECT 1 FROM quality_metrics WHERE metric_name = ''defect_rate'' AND calculation_date = @calculation_date)
        BEGIN
            UPDATE quality_metrics 
            SET metric_value = @defect_rate 
            WHERE metric_name = ''defect_rate'' AND calculation_date = @calculation_date;
        END
        ELSE
        BEGIN
            INSERT INTO quality_metrics (metric_name, metric_value, calculation_date)
            VALUES (''defect_rate'', @defect_rate, @calculation_date);
        END
    END
    ');
END
GO