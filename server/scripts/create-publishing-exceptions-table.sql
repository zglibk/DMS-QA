-- 删除已存在的表（如果存在）
IF OBJECT_ID('publishing_exceptions', 'U') IS NOT NULL
    DROP TABLE publishing_exceptions;

-- 创建出版异常表
CREATE TABLE publishing_exceptions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    registration_date DATE NOT NULL,
    publishing_date DATE,
    customer_code NVARCHAR(50),
    work_order_number NVARCHAR(100),
    product_name NVARCHAR(200),
    plate_type NVARCHAR(50),
    publishing_sheets INT,
    exception_description NVARCHAR(MAX),
    image_path NVARCHAR(MAX),
    responsible_unit NVARCHAR(50),
    responsible_person NVARCHAR(50),
    length_cm DECIMAL(10,2),
    width_cm DECIMAL(10,2),
    piece_count INT,
    area_cm2 DECIMAL(15,2),
    unit_price DECIMAL(10,4),
    amount DECIMAL(15,2),
    created_by NVARCHAR(50),
    created_date DATETIME DEFAULT GETDATE(),
    updated_by NVARCHAR(50),
    updated_date DATETIME,
    isDeleted BIT DEFAULT 0,
    error_type NVARCHAR(50)
);

-- 创建索引
CREATE INDEX IX_publishing_exceptions_registration_date ON publishing_exceptions(registration_date);
CREATE INDEX IX_publishing_exceptions_customer_code ON publishing_exceptions(customer_code);
CREATE INDEX IX_publishing_exceptions_work_order ON publishing_exceptions(work_order_number);
CREATE INDEX IX_publishing_exceptions_isDeleted ON publishing_exceptions(isDeleted);
CREATE INDEX IX_publishing_exceptions_error_type ON publishing_exceptions(error_type);

-- 添加外键约束
-- 为 responsible_unit 字段添加与 Department 表的外键约束
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Department')
BEGIN
    ALTER TABLE publishing_exceptions
    ADD CONSTRAINT FK_publishing_exceptions_responsible_unit
    FOREIGN KEY (responsible_unit) REFERENCES Department(Name);
END