/**
 * 添加测试数据脚本
 * 为仪器表和校准结果表添加测试数据来重现"无效的仪器ID"问题
 */

const sql = require('./server/node_modules/mssql');

// 数据库配置
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Qa369*',
  server: process.env.DB_SERVER || '192.168.1.57',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'DMS-QA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    useUTC: false,
    requestTimeout: 30000,
    connectionTimeout: 30000
  }
};

async function addTestData() {
  try {
    console.log('连接数据库...');
    const pool = await sql.connect(config);
    
    // 首先检查是否存在仪器类别数据
    console.log('\n=== 检查仪器类别数据 ===');
    const categoryQuery = `SELECT COUNT(*) as count FROM InstrumentCategories WHERE IsActive = 1`;
    const categoryResult = await pool.request().query(categoryQuery);
    const categoryCount = categoryResult.recordset[0].count;
    
    let categoryId = 1;
    if (categoryCount === 0) {
      console.log('添加仪器类别数据...');
      const insertCategoryQuery = `
        INSERT INTO InstrumentCategories (CategoryName, Description, IsActive, CreatedBy, CreatedAt, UpdatedAt)
        VALUES ('测量仪器', '用于测量的各类仪器设备', 1, 1, GETDATE(), GETDATE())
      `;
      await pool.request().query(insertCategoryQuery);
      
      // 获取刚插入的类别ID
      const getCategoryIdQuery = `SELECT TOP 1 ID FROM InstrumentCategories WHERE CategoryName = '测量仪器'`;
      const categoryIdResult = await pool.request().query(getCategoryIdQuery);
      categoryId = categoryIdResult.recordset[0].ID;
      console.log(`仪器类别添加成功，ID: ${categoryId}`);
    } else {
      // 获取现有类别ID
      const getCategoryIdQuery = `SELECT TOP 1 ID FROM InstrumentCategories WHERE IsActive = 1`;
      const categoryIdResult = await pool.request().query(getCategoryIdQuery);
      categoryId = categoryIdResult.recordset[0].ID;
      console.log(`使用现有仪器类别，ID: ${categoryId}`);
    }
    
    // 首先添加必要的依赖数据
    console.log('\n=== 添加依赖数据 ===');
    
    // 添加部门数据
    try {
      const deptRequest = pool.request();
      await deptRequest.query(`
        IF NOT EXISTS (SELECT 1 FROM Department WHERE ID = 1)
        BEGIN
          INSERT INTO Department (ID, DepartmentName, IsActive, CreatedBy, CreatedAt, UpdatedAt)
          VALUES (1, '质量部', 1, 1, GETDATE(), GETDATE())
        END
      `);
      console.log('✅ 部门数据添加成功');
    } catch (error) {
      console.log('⚠️ 部门数据添加失败（可能已存在）:', error.message);
    }

    // 添加人员数据
    try {
      const personRequest = pool.request();
      await personRequest.query(`
        IF NOT EXISTS (SELECT 1 FROM Person WHERE ID = 1)
        BEGIN
          INSERT INTO Person (ID, PersonName, IsActive, CreatedBy, CreatedAt, UpdatedAt)
          VALUES (1, '张三', 1, 1, GETDATE(), GETDATE())
        END
      `);
      console.log('✅ 人员数据添加成功');
    } catch (error) {
      console.log('⚠️ 人员数据添加失败（可能已存在）:', error.message);
    }

    // 添加用户数据
    try {
      const userRequest = pool.request();
      await userRequest.query(`
        IF NOT EXISTS (SELECT 1 FROM [User] WHERE ID = 1)
        BEGIN
          INSERT INTO [User] (ID, Username, IsActive, CreatedAt, UpdatedAt)
          VALUES (1, 'admin', 1, GETDATE(), GETDATE())
        END
      `);
      console.log('✅ 用户数据添加成功');
    } catch (error) {
      console.log('⚠️ 用户数据添加失败（可能已存在）:', error.message);
    }
    console.log('\n=== 添加仪器数据 ===');
    const instrumentsData = [
      {
        code: 'YQ001',
        managementCode: 'GL001',
        name: '数字万用表',
        model: 'DT-9205A',
        manufacturer: '优利德',
        category: '测量仪器',
        departmentId: 1,
        responsiblePerson: 1,
        status: 'normal'
      },
      {
        code: 'YQ002',
        managementCode: 'GL002',
        name: '游标卡尺',
        model: '0-150mm',
        manufacturer: '三丰',
        category: '测量仪器',
        departmentId: 1,
        responsiblePerson: 1,
        status: 'normal'
      },
      {
        code: 'YQ003',
        managementCode: 'GL003',
        name: '电子天平',
        model: 'FA2004',
        manufacturer: '上海精科',
        category: '测量仪器',
        departmentId: 1,
        responsiblePerson: 1,
        status: 'retired'
      }
    ];
    
    const instrumentIds = [];
    for (const instrument of instrumentsData) {
      try {
        const insertInstrumentQuery = `
          IF NOT EXISTS (SELECT 1 FROM Instruments WHERE InstrumentCode = @code)
          BEGIN
            INSERT INTO Instruments (
              InstrumentCode, ManagementCode, InstrumentName, Model, Manufacturer,
              Category, DepartmentID, ResponsiblePerson, Status, IsActive,
              CreatedBy, CreatedAt, UpdatedAt
            ) VALUES (
              @code, @managementCode, @name, @model, @manufacturer,
              @category, @departmentId, @responsiblePerson, @status, 1,
              1, GETDATE(), GETDATE()
            )
          END
        `;
        
        const request = pool.request();
        request.input('code', sql.NVarChar, instrument.code);
        request.input('managementCode', sql.NVarChar, instrument.managementCode);
        request.input('name', sql.NVarChar, instrument.name);
        request.input('model', sql.NVarChar, instrument.model);
        request.input('manufacturer', sql.NVarChar, instrument.manufacturer);
        request.input('category', sql.NVarChar, instrument.category);
        request.input('departmentId', sql.Int, instrument.departmentId);
        request.input('responsiblePerson', sql.Int, instrument.responsiblePerson);
        request.input('status', sql.NVarChar, instrument.status);
        
        await request.query(insertInstrumentQuery);
        
        // 获取刚插入的仪器ID
        const getInstrumentIdQuery = `SELECT TOP 1 ID FROM Instruments WHERE InstrumentCode = @code`;
        const idRequest = pool.request();
        idRequest.input('code', sql.NVarChar, instrument.code);
        const idResult = await idRequest.query(getInstrumentIdQuery);
        instrumentIds.push(idResult.recordset[0].ID);
        
        console.log(`仪器 ${instrument.name} 添加成功，ID: ${idResult.recordset[0].ID}`);
      } catch (error) {
        console.log(`⚠️ 仪器 ${instrument.name} 添加失败:`, error.message);
      }
    }
    
    // 添加校准结果数据（包括一些无效的InstrumentID）
    console.log('\n=== 添加校准结果数据 ===');
    const calibrationData = [
      {
        instrumentId: instrumentIds[0],
        resultCode: 'JZ001',
        calibrationDate: '2024-01-15',
        calibrationAgency: '国家计量院',
        certificateNumber: 'JZ2024001',
        calibrationResult: '合格',
        expiryDate: '2025-01-15',
        calibrationCost: 500.00
      },
      {
        instrumentId: instrumentIds[1],
        resultCode: 'JZ002',
        calibrationDate: '2024-02-20',
        calibrationAgency: '省计量院',
        certificateNumber: 'JZ2024002',
        calibrationResult: '合格',
        expiryDate: '2025-02-20',
        calibrationCost: 300.00
      },
      {
        instrumentId: 999, // 无效的仪器ID
        resultCode: 'JZ003',
        calibrationDate: '2024-03-10',
        calibrationAgency: '第三方机构',
        certificateNumber: 'JZ2024003',
        calibrationResult: '不合格',
        expiryDate: '2024-12-31',
        calibrationCost: 800.00
      },
      {
        instrumentId: instrumentIds[2], // 停用仪器的校准结果
        resultCode: 'JZ004',
        calibrationDate: '2024-04-05',
        calibrationAgency: '市计量院',
        certificateNumber: 'JZ2024004',
        calibrationResult: '限制使用',
        expiryDate: '2024-10-05',
        calibrationCost: 400.00
      }
    ];
    
    for (const calibration of calibrationData) {
      try {
        const insertCalibrationQuery = `
          IF NOT EXISTS (SELECT 1 FROM CalibrationResults WHERE ResultCode = @resultCode)
          BEGIN
            INSERT INTO CalibrationResults (
              InstrumentID, ResultCode, CalibrationDate, CalibrationAgency,
              CertificateNumber, CalibrationResult, ExpiryDate, CalibrationCost,
              CreatedBy, CreatedAt, UpdatedAt
            ) VALUES (
              @instrumentId, @resultCode, @calibrationDate, @calibrationAgency,
              @certificateNumber, @calibrationResult, @expiryDate, @calibrationCost,
              1, GETDATE(), GETDATE()
            )
          END
        `;
        
        const request = pool.request();
        request.input('instrumentId', sql.Int, calibration.instrumentId);
        request.input('resultCode', sql.NVarChar, calibration.resultCode);
        request.input('calibrationDate', sql.DateTime, new Date(calibration.calibrationDate));
        request.input('calibrationAgency', sql.NVarChar, calibration.calibrationAgency);
        request.input('certificateNumber', sql.NVarChar, calibration.certificateNumber);
        request.input('calibrationResult', sql.NVarChar, calibration.calibrationResult);
        request.input('expiryDate', sql.DateTime, new Date(calibration.expiryDate));
        request.input('calibrationCost', sql.Decimal(10, 2), calibration.calibrationCost);
        
        await request.query(insertCalibrationQuery);
        console.log(`✅ 校准结果 ${calibration.resultCode} 添加成功`);
      } catch (error) {
        console.log(`⚠️ 校准结果 ${calibration.resultCode} 添加失败:`, error.message);
      }
    }
    
    // 验证数据
    console.log('\n=== 验证添加的数据 ===');
    const verifyQuery = `
      SELECT 
        cr.ID,
        cr.InstrumentID,
        i.InstrumentName,
        cr.CalibrationResult,
        cr.CalibrationDate,
        CASE WHEN i.ID IS NULL THEN '无效仪器ID' 
             WHEN i.IsActive = 0 THEN '仪器已停用' 
             ELSE '正常' END as Status
      FROM CalibrationResults cr
      LEFT JOIN Instruments i ON cr.InstrumentID = i.ID
      ORDER BY cr.CreatedAt DESC
    `;
    
    const verifyResult = await pool.request().query(verifyQuery);
    console.log('校准结果数据验证:');
    console.log(JSON.stringify(verifyResult.recordset, null, 2));
    
    await sql.close();
    console.log('\n测试数据添加完成！');
    
  } catch (error) {
    console.error('添加测试数据时发生错误:', error);
    await sql.close();
  }
}

addTestData();