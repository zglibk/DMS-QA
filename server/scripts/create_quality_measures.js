const { sql, getConnection } = require('../db');

async function createQualityMeasuresTable() {
    try {
        const pool = await getConnection();
        
        // 检查表是否存在，不存在则创建
        const checkTableQuery = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QualityMeasures' AND xtype='U')
            BEGIN
                CREATE TABLE QualityMeasures (
                    ID INT IDENTITY(1,1) PRIMARY KEY,
                    Category NVARCHAR(50) NOT NULL, -- 分类（印前、印中、印后等）
                    Content NVARCHAR(500) NOT NULL, -- 对策内容
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                )
                
                -- 插入初始数据
                INSERT INTO QualityMeasures (Category, Content) VALUES 
                ('印前', '修改设计文件/重新输出'),
                ('印前', '重新制版/晒版'),
                ('印前', '校对原稿/蓝纸/数码样'),
                ('印中', '停机清洁 (清洗橡皮布/压印滚筒)'),
                ('印中', '调整印刷参数 (压力/水墨平衡/速度)'),
                ('印中', '调整油墨配方 (调色/加助剂)'),
                ('印中', '更换原材料 (纸张/油墨)'),
                ('印后', '调整机器参数 (温度/压力/胶量)'),
                ('印后', '修补刀模/更换刀版'),
                ('印后', '调整分条刀具/尺寸'),
                ('印后', '更换辅料 (胶水/膜/烫金纸)'),
                ('品检', '100%全检 (人工/机器)'),
                ('品检', '增加抽检频率/加大样本量'),
                ('品检', '制作限度样/签样比对'),
                ('品检', '使用治具/设备辅助检测'),
                ('包装', '更换/加固包装材料'),
                ('包装', '重新贴标/更正麦头'),
                ('包装', '不良品隔离/挂红牌'),
                ('包装', '分批次入库/锁定库存'),
                ('出货', '紧急补货/加急生产'),
                ('出货', '申请特采 (让步接收)'),
                ('出货', '协商分批出货'),
                ('出货', '退货重制')
            END
        `;
        
        await pool.request().query(checkTableQuery);
        console.log('QualityMeasures table created/checked successfully.');
        
    } catch (error) {
        console.error('Error creating QualityMeasures table:', error);
    } finally {
        // Close connection if needed, though usually managed by pool
        // sql.close(); 
        process.exit();
    }
}

createQualityMeasuresTable();