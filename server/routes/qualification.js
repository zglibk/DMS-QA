/**
 * 人员资质管理系统 API v2.0
 * 
 * 功能模块：
 * 1. 资质类型管理 (QualificationType)
 * 2. 人员资质管理 (PersonnelQualification)
 * 3. 资质认证管理 (PersonnelCertification)
 * 4. 考核测试管理 (QualificationTest) - 包含FM100
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getDynamicConfig } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const uploadDir = path.join(__dirname, '..', 'uploads', 'qualification');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// =====================================================================
// 资质类型管理 API
// =====================================================================

/**
 * 获取资质类型列表
 * GET /api/qualification/types
 */
router.get('/types', async (req, res) => {
  try {
    const { category, active } = req.query;
    let pool = await sql.connect(await getDynamicConfig());

    let whereClause = 'WHERE 1=1';
    if (category) whereClause += ` AND CategoryCode = @category`;
    if (active !== undefined) whereClause += ` AND IsActive = @active`;

    const request = pool.request();
    if (category) request.input('category', sql.NVarChar, category);
    if (active !== undefined) request.input('active', sql.Bit, active === 'true' ? 1 : 0);

    const result = await request.query(`
      SELECT 
        ID as id, CategoryCode as categoryCode, CategoryName as categoryName,
        TypeCode as typeCode, TypeName as typeName, Description as description,
        RequiresTest as requiresTest, TestType as testType,
        ValidityPeriod as validityPeriod, CertLevels as certLevels,
        SortOrder as sortOrder, IsActive as isActive
      FROM QualificationType
      ${whereClause}
      ORDER BY SortOrder, CategoryCode
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('获取资质类型列表失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 获取资质类型(按类别分组)
 * GET /api/qualification/types/grouped
 */
router.get('/types/grouped', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request().query(`
      SELECT 
        ID as id, CategoryCode as categoryCode, CategoryName as categoryName,
        TypeCode as typeCode, TypeName as typeName, Description as description,
        RequiresTest as requiresTest, TestType as testType,
        ValidityPeriod as validityPeriod, CertLevels as certLevels,
        SortOrder as sortOrder, IsActive as isActive
      FROM QualificationType
      WHERE IsActive = 1
      ORDER BY SortOrder, CategoryCode
    `);

    // 按类别分组
    const grouped = {};
    result.recordset.forEach(item => {
      if (!grouped[item.categoryCode]) {
        grouped[item.categoryCode] = {
          categoryCode: item.categoryCode,
          categoryName: item.categoryName,
          types: []
        };
      }
      grouped[item.categoryCode].types.push(item);
    });

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    console.error('获取分组资质类型失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 新增/更新资质类型
 * POST /api/qualification/types
 */
router.post('/types', async (req, res) => {
  try {
    const { id, categoryCode, categoryName, typeCode, typeName, description,
            requiresTest, testType, validityPeriod, certLevels, sortOrder, isActive } = req.body;

    let pool = await sql.connect(await getDynamicConfig());

    if (id) {
      // 更新
      await pool.request()
        .input('id', sql.Int, id)
        .input('categoryCode', sql.NVarChar, categoryCode)
        .input('categoryName', sql.NVarChar, categoryName)
        .input('typeCode', sql.NVarChar, typeCode)
        .input('typeName', sql.NVarChar, typeName)
        .input('description', sql.NVarChar, description)
        .input('requiresTest', sql.Bit, requiresTest ? 1 : 0)
        .input('testType', sql.NVarChar, testType)
        .input('validityPeriod', sql.Int, validityPeriod || 12)
        .input('certLevels', sql.NVarChar, certLevels)
        .input('sortOrder', sql.Int, sortOrder || 0)
        .input('isActive', sql.Bit, isActive ? 1 : 0)
        .query(`
          UPDATE QualificationType SET
            CategoryCode = @categoryCode, CategoryName = @categoryName,
            TypeCode = @typeCode, TypeName = @typeName, Description = @description,
            RequiresTest = @requiresTest, TestType = @testType,
            ValidityPeriod = @validityPeriod, CertLevels = @certLevels,
            SortOrder = @sortOrder, IsActive = @isActive, UpdatedAt = GETDATE()
          WHERE ID = @id
        `);
    } else {
      // 新增
      await pool.request()
        .input('categoryCode', sql.NVarChar, categoryCode)
        .input('categoryName', sql.NVarChar, categoryName)
        .input('typeCode', sql.NVarChar, typeCode)
        .input('typeName', sql.NVarChar, typeName)
        .input('description', sql.NVarChar, description)
        .input('requiresTest', sql.Bit, requiresTest ? 1 : 0)
        .input('testType', sql.NVarChar, testType)
        .input('validityPeriod', sql.Int, validityPeriod || 12)
        .input('certLevels', sql.NVarChar, certLevels)
        .input('sortOrder', sql.Int, sortOrder || 0)
        .input('isActive', sql.Bit, isActive !== false ? 1 : 0)
        .query(`
          INSERT INTO QualificationType 
          (CategoryCode, CategoryName, TypeCode, TypeName, Description, RequiresTest, TestType, ValidityPeriod, CertLevels, SortOrder, IsActive)
          VALUES (@categoryCode, @categoryName, @typeCode, @typeName, @description, @requiresTest, @testType, @validityPeriod, @certLevels, @sortOrder, @isActive)
        `);
    }

    res.json({ success: true, message: id ? '更新成功' : '新增成功' });
  } catch (error) {
    console.error('保存资质类型失败:', error);
    res.status(500).json({ success: false, message: '保存失败: ' + error.message });
  }
});

// =====================================================================
// 人员资质管理 API
// =====================================================================

/**
 * 获取人员资质列表(带资质概览)
 * GET /api/qualification/personnel
 */
router.get('/personnel', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, name, department, positionType, status, hasQualification } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let pool = await sql.connect(await getDynamicConfig());

    // 构建查询条件
    let whereClause = 'WHERE p.IsActive = 1';
    if (name) whereClause += ` AND p.Name LIKE '%' + @name + '%'`;
    if (department) whereClause += ' AND p.Department = @department';
    if (positionType) whereClause += ' AND p.PositionType = @positionType';
    if (status) whereClause += ' AND p.OverallStatus = @status';

    // 查询总数
    const countRequest = pool.request();
    if (name) countRequest.input('name', sql.NVarChar, name);
    if (department) countRequest.input('department', sql.NVarChar, department);
    if (positionType) countRequest.input('positionType', sql.NVarChar, positionType);
    if (status) countRequest.input('status', sql.NVarChar, status);

    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total FROM PersonnelQualification p ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    // 查询数据(使用ROW_NUMBER分页，兼容旧版SQL Server)
    const dataRequest = pool.request();
    if (name) dataRequest.input('name', sql.NVarChar, name);
    if (department) dataRequest.input('department', sql.NVarChar, department);
    if (positionType) dataRequest.input('positionType', sql.NVarChar, positionType);
    if (status) dataRequest.input('status', sql.NVarChar, status);

    const dataResult = await dataRequest.query(`
      SELECT * FROM (
        SELECT 
          p.ID as id, p.PersonID as personId, p.EmployeeNo as employeeNo,
          p.Name as name, p.Department as department, p.Position as position,
          p.PositionType as positionType, p.HireDate as hireDate,
          p.OverallStatus as overallStatus, p.Remarks as remarks,
          p.CreatedAt as createdAt,
          -- 有效资质数量
          (SELECT COUNT(*) FROM PersonnelCertification c WHERE c.PersonnelID = p.ID AND c.CertStatus = '有效') AS validCertCount,
          -- 已过期资质数量
          (SELECT COUNT(*) FROM PersonnelCertification c WHERE c.PersonnelID = p.ID AND c.CertStatus = '已过期') AS expiredCertCount,
          -- 即将到期数量(30天内)
          (SELECT COUNT(*) FROM PersonnelCertification c WHERE c.PersonnelID = p.ID AND c.CertStatus = '有效' 
           AND c.ExpiryDate IS NOT NULL AND c.ExpiryDate <= DATEADD(DAY, 30, GETDATE())) AS expiringCount,
          -- FM100测试结果
          (SELECT TOP 1 t.ExtendedData FROM QualificationTest t 
           JOIN QualificationType qt ON t.QualificationTypeID = qt.ID 
           WHERE t.PersonnelID = p.ID AND qt.TypeCode = 'FM100' ORDER BY t.TestDate DESC) AS fm100ExtendedData,
          -- 最近测试日期
          (SELECT TOP 1 t.TestDate FROM QualificationTest t WHERE t.PersonnelID = p.ID ORDER BY t.TestDate DESC) AS lastTestDate,
          ROW_NUMBER() OVER (ORDER BY p.Name) as RowNum
        FROM PersonnelQualification p
        ${whereClause}
      ) AS temp
      WHERE RowNum > ${offset} AND RowNum <= ${offset + limit}
      ORDER BY RowNum
    `);

    // 获取每个人员的资质认证摘要列表
    const personnelIds = dataResult.recordset.map(r => r.id);
    let certSummaryMap = {};
    
    if (personnelIds.length > 0) {
      const certSummaryResult = await pool.request().query(`
        SELECT 
          c.PersonnelID as personnelId,
          qt.TypeCode as typeCode,
          qt.TypeName as typeName,
          qt.CategoryCode as categoryCode,
          qt.CategoryName as categoryName,
          c.CertLevel as certLevel,
          c.CertStatus as certStatus,
          c.ExpiryDate as expiryDate,
          DATEDIFF(DAY, GETDATE(), c.ExpiryDate) as daysUntilExpiry
        FROM PersonnelCertification c
        JOIN QualificationType qt ON c.QualificationTypeID = qt.ID
        WHERE c.PersonnelID IN (${personnelIds.join(',')})
        ORDER BY c.PersonnelID, qt.SortOrder
      `);
      
      // 按人员ID分组
      certSummaryResult.recordset.forEach(cert => {
        if (!certSummaryMap[cert.personnelId]) {
          certSummaryMap[cert.personnelId] = [];
        }
        certSummaryMap[cert.personnelId].push({
          typeCode: cert.typeCode,
          typeName: cert.typeName,
          categoryCode: cert.categoryCode,
          categoryName: cert.categoryName,
          certLevel: cert.certLevel,
          certStatus: cert.certStatus,
          expiryDate: cert.expiryDate,
          daysUntilExpiry: cert.daysUntilExpiry
        });
      });
    }
    
    // 将资质摘要附加到每个人员记录
    const dataWithCerts = dataResult.recordset.map(person => {
      // 解析FM100诊断建议
      let fm100Diagnosis = '';
      if (person.fm100ExtendedData) {
        try {
          const ext = JSON.parse(person.fm100ExtendedData);
          fm100Diagnosis = ext.diagnosis || '';
        } catch (e) {
          // ignore
        }
      }

      return {
        ...person,
        certifications: certSummaryMap[person.id] || [],
        fm100Diagnosis
      };
    });

    res.json({
      success: true,
      data: dataWithCerts,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('获取人员资质列表失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败: ' + error.message });
  }
});

/**
 * 获取所有人员(用于下拉选择)
 * GET /api/qualification/personnel/all
 */
router.get('/personnel/all', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request().query(`
      SELECT ID as id, EmployeeNo as employeeNo, Name as name, Department as department, Position as position
      FROM PersonnelQualification
      WHERE IsActive = 1
      ORDER BY Name
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('获取人员列表失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 获取人员详情(包含所有资质)
 * GET /api/qualification/personnel/:id
 */
router.get('/personnel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let pool = await sql.connect(await getDynamicConfig());

    // 获取人员基本信息
    const personResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          ID as id, PersonID as personId, EmployeeNo as employeeNo,
          Name as name, Department as department, Position as position,
          PositionType as positionType, HireDate as hireDate,
          OverallStatus as overallStatus, Remarks as remarks, CreatedAt as createdAt
        FROM PersonnelQualification WHERE ID = @id
      `);

    if (personResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    const person = personResult.recordset[0];

    // 获取该人员的所有资质认证
    const certResult = await pool.request()
      .input('personnelId', sql.Int, id)
      .query(`
        SELECT 
          c.ID as id, c.QualificationTypeID as qualificationTypeId,
          qt.CategoryName as categoryName, qt.TypeCode as typeCode, qt.TypeName as typeName,
          c.CertLevel as certLevel, c.CertDate as certDate, c.ExpiryDate as expiryDate,
          c.CertNo as certNo, c.CertStatus as certStatus, c.Issuer as issuer,
          c.AttachmentPath as attachmentPath, c.Remarks as remarks,
          DATEDIFF(DAY, GETDATE(), c.ExpiryDate) AS daysUntilExpiry
        FROM PersonnelCertification c
        JOIN QualificationType qt ON c.QualificationTypeID = qt.ID
        WHERE c.PersonnelID = @personnelId
        ORDER BY qt.SortOrder, c.CertDate DESC
      `);

    // 获取该人员的测试记录
    const testResult = await pool.request()
      .input('personnelId', sql.Int, id)
      .query(`
        SELECT TOP 10
          t.ID as id, t.QualificationTypeID as qualificationTypeId,
          qt.TypeCode as typeCode, qt.TypeName as typeName,
          t.TestDate as testDate, t.TestType as testType,
          t.Score as score, t.Grade as grade, t.TestResult as testResult,
          t.Duration as duration, t.Examiner as examiner
        FROM QualificationTest t
        JOIN QualificationType qt ON t.QualificationTypeID = qt.ID
        WHERE t.PersonnelID = @personnelId
        ORDER BY t.TestDate DESC
      `);

    person.certifications = certResult.recordset;
    person.testRecords = testResult.recordset;

    res.json({ success: true, data: person });

  } catch (error) {
    console.error('获取人员详情失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 新增人员资质
 * POST /api/qualification/personnel
 */
router.post('/personnel', async (req, res) => {
  try {
    const { personId, employeeNo, name, department, position, positionType, hireDate, remarks } = req.body;

    let pool = await sql.connect(await getDynamicConfig());

    // 检查是否已存在
    if (employeeNo) {
      const checkResult = await pool.request()
        .input('employeeNo', sql.NVarChar, employeeNo)
        .query('SELECT ID FROM PersonnelQualification WHERE EmployeeNo = @employeeNo');
      if (checkResult.recordset.length > 0) {
        return res.status(400).json({ success: false, message: '该工号已存在' });
      }
    }

    const result = await pool.request()
      .input('personId', sql.Int, personId || null)
      .input('employeeNo', sql.NVarChar, employeeNo || null)
      .input('name', sql.NVarChar, name)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('positionType', sql.NVarChar, positionType)
      .input('hireDate', sql.Date, hireDate || null)
      .input('remarks', sql.NVarChar, remarks || null)
      .query(`
        INSERT INTO PersonnelQualification 
        (PersonID, EmployeeNo, Name, Department, Position, PositionType, HireDate, Remarks, OverallStatus)
        OUTPUT INSERTED.ID
        VALUES (@personId, @employeeNo, @name, @department, @position, @positionType, @hireDate, @remarks, '待评估')
      `);

    res.json({ success: true, message: '新增成功', id: result.recordset[0].ID });

  } catch (error) {
    console.error('新增人员资质失败:', error);
    res.status(500).json({ success: false, message: '新增失败: ' + error.message });
  }
});

/**
 * 更新人员资质
 * PUT /api/qualification/personnel/:id
 */
router.put('/personnel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeNo, name, department, position, positionType, hireDate, overallStatus, remarks } = req.body;

    let pool = await sql.connect(await getDynamicConfig());

    await pool.request()
      .input('id', sql.Int, id)
      .input('employeeNo', sql.NVarChar, employeeNo || null)
      .input('name', sql.NVarChar, name)
      .input('department', sql.NVarChar, department)
      .input('position', sql.NVarChar, position)
      .input('positionType', sql.NVarChar, positionType)
      .input('hireDate', sql.Date, hireDate || null)
      .input('overallStatus', sql.NVarChar, overallStatus || '待评估')
      .input('remarks', sql.NVarChar, remarks || null)
      .query(`
        UPDATE PersonnelQualification SET
          EmployeeNo = @employeeNo, Name = @name, Department = @department,
          Position = @position, PositionType = @positionType, HireDate = @hireDate,
          OverallStatus = @overallStatus, Remarks = @remarks, UpdatedAt = GETDATE()
        WHERE ID = @id
      `);

    res.json({ success: true, message: '更新成功' });

  } catch (error) {
    console.error('更新人员资质失败:', error);
    res.status(500).json({ success: false, message: '更新失败: ' + error.message });
  }
});

/**
 * 删除人员资质
 * DELETE /api/qualification/personnel/:id
 */
router.delete('/personnel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let pool = await sql.connect(await getDynamicConfig());

    // 软删除
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE PersonnelQualification SET IsActive = 0, UpdatedAt = GETDATE() WHERE ID = @id');

    res.json({ success: true, message: '删除成功' });

  } catch (error) {
    console.error('删除人员资质失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// =====================================================================
// 资质认证管理 API
// =====================================================================

/**
 * 获取资质认证列表
 * GET /api/qualification/certifications
 */
router.get('/certifications', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, personnelId, typeId, status, expiring } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let pool = await sql.connect(await getDynamicConfig());

    let whereClause = 'WHERE 1=1';
    if (personnelId) whereClause += ' AND c.PersonnelID = @personnelId';
    if (typeId) whereClause += ' AND c.QualificationTypeID = @typeId';
    if (status) whereClause += ' AND c.CertStatus = @status';
    if (expiring === 'true') {
      whereClause += ` AND c.CertStatus = '有效' AND c.ExpiryDate IS NOT NULL AND c.ExpiryDate <= DATEADD(DAY, 90, GETDATE())`;
    }

    const countRequest = pool.request();
    if (personnelId) countRequest.input('personnelId', sql.Int, personnelId);
    if (typeId) countRequest.input('typeId', sql.Int, typeId);
    if (status) countRequest.input('status', sql.NVarChar, status);

    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total 
      FROM PersonnelCertification c
      JOIN PersonnelQualification p ON c.PersonnelID = p.ID
      ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    const dataRequest = pool.request();
    if (personnelId) dataRequest.input('personnelId', sql.Int, personnelId);
    if (typeId) dataRequest.input('typeId', sql.Int, typeId);
    if (status) dataRequest.input('status', sql.NVarChar, status);

    const dataResult = await dataRequest.query(`
      SELECT * FROM (
        SELECT 
          c.ID as id, c.PersonnelID as personnelId, c.QualificationTypeID as qualificationTypeId,
          p.Name as personnelName, p.EmployeeNo as employeeNo, p.Department as department,
          qt.CategoryName as categoryName, qt.TypeCode as typeCode, qt.TypeName as typeName,
          c.CertLevel as certLevel, c.CertDate as certDate, c.ExpiryDate as expiryDate,
          c.CertNo as certNo, c.CertStatus as certStatus, c.Issuer as issuer,
          c.AttachmentPath as attachmentPath, c.Remarks as remarks,
          DATEDIFF(DAY, GETDATE(), c.ExpiryDate) AS daysUntilExpiry,
          ROW_NUMBER() OVER (ORDER BY c.ExpiryDate, p.Name) as RowNum
        FROM PersonnelCertification c
        JOIN PersonnelQualification p ON c.PersonnelID = p.ID
        JOIN QualificationType qt ON c.QualificationTypeID = qt.ID
        ${whereClause}
      ) AS temp
      WHERE RowNum > ${offset} AND RowNum <= ${offset + limit}
      ORDER BY RowNum
    `);

    res.json({
      success: true,
      data: dataResult.recordset,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('获取资质认证列表失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 新增资质认证
 * POST /api/qualification/certifications
 */
router.post('/certifications', upload.single('attachment'), async (req, res) => {
  try {
    const { personnelId, qualificationTypeId, certLevel, certDate, expiryDate, certNo, issuer, remarks } = req.body;
    const attachmentPath = req.file ? `qualification/${req.file.filename}` : null;

    let pool = await sql.connect(await getDynamicConfig());

    await pool.request()
      .input('personnelId', sql.Int, personnelId)
      .input('qualificationTypeId', sql.Int, qualificationTypeId)
      .input('certLevel', sql.NVarChar, certLevel)
      .input('certDate', sql.Date, certDate)
      .input('expiryDate', sql.Date, expiryDate || null)
      .input('certNo', sql.NVarChar, certNo || null)
      .input('issuer', sql.NVarChar, issuer || null)
      .input('attachmentPath', sql.NVarChar, attachmentPath)
      .input('remarks', sql.NVarChar, remarks || null)
      .query(`
        INSERT INTO PersonnelCertification 
        (PersonnelID, QualificationTypeID, CertLevel, CertDate, ExpiryDate, CertNo, CertStatus, Issuer, AttachmentPath, Remarks)
        VALUES (@personnelId, @qualificationTypeId, @certLevel, @certDate, @expiryDate, @certNo, '有效', @issuer, @attachmentPath, @remarks)
      `);

    // 更新人员综合状态
    await updatePersonnelOverallStatus(pool, personnelId);

    res.json({ success: true, message: '资质认证添加成功' });

  } catch (error) {
    console.error('新增资质认证失败:', error);
    res.status(500).json({ success: false, message: '新增失败: ' + error.message });
  }
});

/**
 * 更新资质认证状态
 * PUT /api/qualification/certifications/:id/status
 */
router.put('/certifications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    let pool = await sql.connect(await getDynamicConfig());

    // 获取人员ID
    const certResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT PersonnelID FROM PersonnelCertification WHERE ID = @id');

    if (certResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .input('remarks', sql.NVarChar, remarks || null)
      .query(`
        UPDATE PersonnelCertification SET CertStatus = @status, Remarks = @remarks, UpdatedAt = GETDATE()
        WHERE ID = @id
      `);

    // 更新人员综合状态
    await updatePersonnelOverallStatus(pool, certResult.recordset[0].PersonnelID);

    res.json({ success: true, message: '状态更新成功' });

  } catch (error) {
    console.error('更新资质认证状态失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

/**
 * 删除资质认证
 * DELETE /api/qualification/certifications/:id
 */
router.delete('/certifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let pool = await sql.connect(await getDynamicConfig());

    // 获取人员ID和附件路径
    const certResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT PersonnelID, AttachmentPath FROM PersonnelCertification WHERE ID = @id');

    if (certResult.recordset.length > 0) {
      const { PersonnelID, AttachmentPath } = certResult.recordset[0];

      // 删除附件文件
      if (AttachmentPath) {
        const filePath = path.join(__dirname, '..', 'uploads', AttachmentPath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      // 删除记录
      await pool.request().input('id', sql.Int, id).query('DELETE FROM PersonnelCertification WHERE ID = @id');

      // 更新人员综合状态
      await updatePersonnelOverallStatus(pool, PersonnelID);
    }

    res.json({ success: true, message: '删除成功' });

  } catch (error) {
    console.error('删除资质认证失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// =====================================================================
// 辅助函数
// =====================================================================

/**
 * 更新人员综合资质状态
 */
async function updatePersonnelOverallStatus(pool, personnelId) {
  try {
    // 查询该人员的资质情况
    const result = await pool.request()
      .input('personnelId', sql.Int, personnelId)
      .query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN CertStatus = '有效' THEN 1 ELSE 0 END) as validCount,
          SUM(CASE WHEN CertStatus = '已过期' THEN 1 ELSE 0 END) as expiredCount,
          SUM(CASE WHEN CertStatus = '已撤销' THEN 1 ELSE 0 END) as revokedCount
        FROM PersonnelCertification WHERE PersonnelID = @personnelId
      `);

    const { total, validCount, expiredCount, revokedCount } = result.recordset[0];

    let status = '待评估';
    if (total === 0) {
      status = '待评估';
    } else if (validCount === total) {
      status = '合格';
    } else if (validCount > 0) {
      status = '部分合格';
    } else {
      status = '不合格';
    }

    await pool.request()
      .input('personnelId', sql.Int, personnelId)
      .input('status', sql.NVarChar, status)
      .query('UPDATE PersonnelQualification SET OverallStatus = @status, UpdatedAt = GETDATE() WHERE ID = @personnelId');

  } catch (error) {
    console.error('更新人员综合状态失败:', error);
  }
}

// ========== 以下内容来自 qualification-tests.js ==========

// =====================================================================
// 考核测试记录 API
// =====================================================================

/**
 * 获取考核测试记录列表
 * GET /api/qualification/tests
 */
router.get('/tests', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, personnelId, typeId, typeCode, result, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let pool = await sql.connect(await getDynamicConfig());

    let whereClause = 'WHERE 1=1';
    if (personnelId) whereClause += ' AND t.PersonnelID = @personnelId';
    if (typeId) whereClause += ' AND t.QualificationTypeID = @typeId';
    if (typeCode) whereClause += ' AND qt.TypeCode = @typeCode';
    if (result) whereClause += ' AND t.TestResult = @result';
    if (startDate) whereClause += ' AND t.TestDate >= @startDate';
    if (endDate) whereClause += ' AND t.TestDate <= @endDate';

    const countRequest = pool.request();
    if (personnelId) countRequest.input('personnelId', sql.Int, personnelId);
    if (typeId) countRequest.input('typeId', sql.Int, typeId);
    if (typeCode) countRequest.input('typeCode', sql.NVarChar, typeCode);
    if (result) countRequest.input('result', sql.NVarChar, result);
    if (startDate) countRequest.input('startDate', sql.DateTime, new Date(startDate));
    if (endDate) countRequest.input('endDate', sql.DateTime, new Date(endDate));

    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total 
      FROM QualificationTest t
      JOIN PersonnelQualification p ON t.PersonnelID = p.ID
      JOIN QualificationType qt ON t.QualificationTypeID = qt.ID
      ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    const dataRequest = pool.request();
    if (personnelId) dataRequest.input('personnelId', sql.Int, personnelId);
    if (typeId) dataRequest.input('typeId', sql.Int, typeId);
    if (typeCode) dataRequest.input('typeCode', sql.NVarChar, typeCode);
    if (result) dataRequest.input('result', sql.NVarChar, result);
    if (startDate) dataRequest.input('startDate', sql.DateTime, new Date(startDate));
    if (endDate) dataRequest.input('endDate', sql.DateTime, new Date(endDate));

    const dataResult = await dataRequest.query(`
      SELECT * FROM (
        SELECT 
          t.ID as id, t.PersonnelID as personnelId, t.QualificationTypeID as qualificationTypeId,
          p.Name as personnelName, p.EmployeeNo as employeeNo, p.Department as department,
          qt.CategoryName as categoryName, qt.TypeCode as typeCode, qt.TypeName as typeName,
          t.TestDate as testDate, t.TestType as testType,
          t.Score as score, t.MaxScore as maxScore, t.PassScore as passScore,
          t.Grade as grade, t.TestResult as testResult,
          t.Duration as duration, t.Examiner as examiner, t.TestLocation as testLocation,
          t.AttachmentPath as attachmentPath, t.Remarks as remarks,
          ROW_NUMBER() OVER (ORDER BY t.TestDate DESC) as RowNum
        FROM QualificationTest t
        JOIN PersonnelQualification p ON t.PersonnelID = p.ID
        JOIN QualificationType qt ON t.QualificationTypeID = qt.ID
        ${whereClause}
      ) AS temp
      WHERE RowNum > ${offset} AND RowNum <= ${offset + limit}
      ORDER BY RowNum
    `);

    res.json({
      success: true,
      data: dataResult.recordset,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('获取考核测试记录失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败: ' + error.message });
  }
});

/**
 * 获取考核测试详情
 * GET /api/qualification/tests/:id
 */
router.get('/tests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let pool = await sql.connect(await getDynamicConfig());

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          t.ID as id, t.PersonnelID as personnelId, t.QualificationTypeID as qualificationTypeId,
          p.Name as personnelName, p.EmployeeNo as employeeNo, p.Department as department, p.Position as position,
          qt.CategoryName as categoryName, qt.TypeCode as typeCode, qt.TypeName as typeName,
          t.TestDate as testDate, t.TestType as testType,
          t.Score as score, t.MaxScore as maxScore, t.PassScore as passScore,
          t.Grade as grade, t.TestResult as testResult,
          t.Duration as duration, t.Examiner as examiner, t.TestLocation as testLocation,
          t.ExtendedData as extendedData,
          t.AttachmentPath as attachmentPath, t.Remarks as remarks, t.CreatedAt as createdAt
        FROM QualificationTest t
        JOIN PersonnelQualification p ON t.PersonnelID = p.ID
        JOIN QualificationType qt ON t.QualificationTypeID = qt.ID
        WHERE t.ID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const testData = result.recordset[0];
    
    // 解析扩展数据
    if (testData.extendedData) {
      try {
        testData.extendedData = JSON.parse(testData.extendedData);
      } catch (e) {
        // 保持原样
      }
    }

    res.json({ success: true, data: testData });

  } catch (error) {
    console.error('获取考核测试详情失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 新增考核测试记录
 * POST /api/qualification/tests
 */
router.post('/tests', upload.single('attachment'), async (req, res) => {
  try {
    const {
      personnelId, qualificationTypeId, testDate, testType,
      score, maxScore, passScore, grade, testResult,
      duration, examiner, testLocation, extendedData, remarks
    } = req.body;

    const attachmentPath = req.file ? `qualification/${req.file.filename}` : null;

    let pool = await sql.connect(await getDynamicConfig());

    await pool.request()
      .input('personnelId', sql.Int, personnelId)
      .input('qualificationTypeId', sql.Int, qualificationTypeId)
      .input('testDate', sql.DateTime, new Date(testDate))
      .input('testType', sql.NVarChar, testType || null)
      .input('score', sql.Decimal(5, 2), score || null)
      .input('maxScore', sql.Decimal(5, 2), maxScore || 100)
      .input('passScore', sql.Decimal(5, 2), passScore || 60)
      .input('grade', sql.NVarChar, grade || null)
      .input('testResult', sql.NVarChar, testResult || null)
      .input('duration', sql.Int, duration || null)
      .input('examiner', sql.NVarChar, examiner || null)
      .input('testLocation', sql.NVarChar, testLocation || null)
      .input('extendedData', sql.NVarChar, extendedData ? JSON.stringify(extendedData) : null)
      .input('attachmentPath', sql.NVarChar, attachmentPath)
      .input('remarks', sql.NVarChar, remarks || null)
      .query(`
        INSERT INTO QualificationTest 
        (PersonnelID, QualificationTypeID, TestDate, TestType, Score, MaxScore, PassScore, 
         Grade, TestResult, Duration, Examiner, TestLocation, ExtendedData, AttachmentPath, Remarks)
        VALUES 
        (@personnelId, @qualificationTypeId, @testDate, @testType, @score, @maxScore, @passScore,
         @grade, @testResult, @duration, @examiner, @testLocation, @extendedData, @attachmentPath, @remarks)
      `);

    res.json({ success: true, message: '考核记录添加成功' });

  } catch (error) {
    console.error('新增考核测试记录失败:', error);
    res.status(500).json({ success: false, message: '新增失败: ' + error.message });
  }
});

/**
 * 删除考核测试记录
 * DELETE /api/qualification/tests/:id
 */
router.delete('/tests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let pool = await sql.connect(await getDynamicConfig());

    // 获取附件路径
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT AttachmentPath FROM QualificationTest WHERE ID = @id');

    if (result.recordset.length > 0 && result.recordset[0].AttachmentPath) {
      const filePath = path.join(__dirname, '..', 'uploads', result.recordset[0].AttachmentPath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.request().input('id', sql.Int, id).query('DELETE FROM QualificationTest WHERE ID = @id');

    res.json({ success: true, message: '删除成功' });

  } catch (error) {
    console.error('删除考核测试记录失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// =====================================================================
// FM100 色觉测试专项 API
// =====================================================================

/**
 * 获取FM100测试记录列表
 * GET /api/qualification/fm100
 */
router.get('/fm100', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, name, grade, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let pool = await sql.connect(await getDynamicConfig());

    let whereClause = `WHERE qt.TypeCode = 'FM100'`;
    if (name) whereClause += ` AND p.Name LIKE '%' + @name + '%'`;
    if (grade) whereClause += ' AND t.Grade = @grade';
    if (startDate) whereClause += ' AND t.TestDate >= @startDate';
    if (endDate) whereClause += ' AND t.TestDate <= @endDate';

    const countRequest = pool.request();
    if (name) countRequest.input('name', sql.NVarChar, name);
    if (grade) countRequest.input('grade', sql.NVarChar, grade);
    if (startDate) countRequest.input('startDate', sql.DateTime, new Date(startDate));
    if (endDate) countRequest.input('endDate', sql.DateTime, new Date(endDate));

    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total 
      FROM QualificationTest t
      JOIN PersonnelQualification p ON t.PersonnelID = p.ID
      JOIN QualificationType qt ON t.QualificationTypeID = qt.ID
      ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    const dataRequest = pool.request();
    if (name) dataRequest.input('name', sql.NVarChar, name);
    if (grade) dataRequest.input('grade', sql.NVarChar, grade);
    if (startDate) dataRequest.input('startDate', sql.DateTime, new Date(startDate));
    if (endDate) dataRequest.input('endDate', sql.DateTime, new Date(endDate));

    const dataResult = await dataRequest.query(`
      SELECT * FROM (
        SELECT 
          t.ID as id, t.PersonnelID as personnelId,
          p.Name as personnelName, p.EmployeeNo as employeeNo, p.Department as department,
          t.TestDate as testDate, t.Duration as duration,
          t.Score as tes, t.Grade as grade, t.TestResult as testResult,
          t.ExtendedData as extendedData, t.AttachmentPath as screenshotPath,
          t.Remarks as remarks,
          ROW_NUMBER() OVER (ORDER BY t.TestDate DESC) as RowNum
        FROM QualificationTest t
        JOIN PersonnelQualification p ON t.PersonnelID = p.ID
        JOIN QualificationType qt ON t.QualificationTypeID = qt.ID
        ${whereClause}
      ) AS temp
      WHERE RowNum > ${offset} AND RowNum <= ${offset + limit}
      ORDER BY RowNum
    `);

    // 解析扩展数据
    const data = dataResult.recordset.map(row => {
      if (row.extendedData) {
        try {
          const ext = JSON.parse(row.extendedData);
          return { ...row, ...ext };
        } catch (e) {
          return row;
        }
      }
      return row;
    });

    res.json({
      success: true,
      data,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });

  } catch (error) {
    console.error('获取FM100测试记录失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败: ' + error.message });
  }
});

/**
 * 新增FM100测试记录
 * POST /api/qualification/fm100
 */
router.post('/fm100', upload.single('screenshot'), async (req, res) => {
  try {
    const {
      personnelId, personName, employeeNo, department,
      testDate, duration, tes, sqrtTes, category,
      pctUnselected, pctFactory, pctExperienced,
      angle, cIndex, sIndex, diagnosis, grade, remarks
    } = req.body;

    const screenshotPath = req.file ? `qualification/${req.file.filename}` : null;

    let pool = await sql.connect(await getDynamicConfig());

    // 获取FM100资质类型ID
    const typeResult = await pool.request()
      .query(`SELECT ID FROM QualificationType WHERE TypeCode = 'FM100'`);
    
    if (typeResult.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'FM100资质类型未配置' });
    }
    const qualificationTypeId = typeResult.recordset[0].ID;

    // 查找或创建人员记录
    let targetPersonnelId = personnelId;
    if (!targetPersonnelId && personName) {
      // 尝试查找现有人员
      const findRequest = pool.request();
      findRequest.input('name', sql.NVarChar, personName);
      if (employeeNo) findRequest.input('employeeNo', sql.NVarChar, employeeNo);

      const findQuery = employeeNo 
        ? 'SELECT ID FROM PersonnelQualification WHERE EmployeeNo = @employeeNo'
        : 'SELECT ID FROM PersonnelQualification WHERE Name = @name';
      
      const findResult = await findRequest.query(findQuery);

      if (findResult.recordset.length > 0) {
        targetPersonnelId = findResult.recordset[0].ID;
      } else {
        // 创建新人员记录
        const createResult = await pool.request()
          .input('name', sql.NVarChar, personName)
          .input('employeeNo', sql.NVarChar, employeeNo || null)
          .input('department', sql.NVarChar, department || null)
          .query(`
            INSERT INTO PersonnelQualification (Name, EmployeeNo, Department, OverallStatus)
            OUTPUT INSERTED.ID
            VALUES (@name, @employeeNo, @department, '待评估')
          `);
        targetPersonnelId = createResult.recordset[0].ID;
      }
    }

    if (!targetPersonnelId) {
      return res.status(400).json({ success: false, message: '请选择或输入人员信息' });
    }

    // 构建扩展数据(FM100特有数据)
    const extendedData = JSON.stringify({
      sqrtTes: parseFloat(sqrtTes) || 0,
      category: category || '',
      pctUnselected: parseInt(pctUnselected) || 0,
      pctFactory: parseInt(pctFactory) || 0,
      pctExperienced: parseInt(pctExperienced) || 0,
      angle: parseFloat(angle) || 0,
      cIndex: parseFloat(cIndex) || 0,
      sIndex: parseFloat(sIndex) || 0,
      diagnosis: diagnosis || '',
      errorCapNo: req.body.errorCapNo || '',
      reportNo: req.body.reportNo || ''
    });

    // 生成报告编号逻辑 (如果前端未传)
    // 格式：FM + YYYY + MM + 3位流水号 (例如: FM202512001)
    if (!extendedData.includes('"reportNo"')) {
      const date = new Date(testDate);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      
      // 查询当月已有的最大流水号
      // 这里需要解析 ExtendedData 中的 reportNo，比较复杂，
      // 简化处理：查询当月该类型的测试数量 + 1
      const countResult = await pool.request()
        .input('typeId', sql.Int, qualificationTypeId)
        .input('year', sql.Int, date.getFullYear())
        .input('month', sql.Int, date.getMonth() + 1)
        .query(`
          SELECT COUNT(*) as count 
          FROM QualificationTest 
          WHERE QualificationTypeID = @typeId 
          AND YEAR(TestDate) = @year 
          AND MONTH(TestDate) = @month
        `);
      
      const seq = String(countResult.recordset[0].count + 1).padStart(3, '0');
      const newReportNo = `FM${yyyy}${mm}${seq}`;
      
      const temp = JSON.parse(extendedData);
      temp.reportNo = newReportNo;
      extendedData = JSON.stringify(temp);
    }

    // 自动诊断逻辑 (如果前端未传或需要后端校验)
    // 规则：
    // Tritan (蓝色弱): 错误峰值在 46-52 或 85-5
    // Protan (红色弱): 错误峰值在 62-70 或 17-24
    // Deutan (绿色弱): 错误峰值在 56-61 或 12-17
    // 此处仅做存储，具体诊断逻辑在前端实现或在此处增强
    if (!diagnosis && req.body.errorCapNo) {
      // 简单的后端自动诊断逻辑
      const caps = req.body.errorCapNo.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n));
      // 统计落在各区间的数量
      let tritanCount = 0, protanCount = 0, deutanCount = 0;
      
      caps.forEach(cap => {
        if ((cap >= 45 && cap <= 55) || cap >= 83 || cap <= 7) tritanCount++;
        if ((cap >= 62 && cap <= 70) || (cap >= 17 && cap <= 24)) protanCount++;
        if ((cap >= 56 && cap <= 61) || (cap >= 12 && cap <= 17)) deutanCount++;
      });
      
      // 简单的判定逻辑，取最大值
      if (tritanCount > protanCount && tritanCount > deutanCount && tritanCount >= 2) {
         extendedData = JSON.parse(extendedData);
         extendedData.diagnosis = 'Tritan Deficiency';
         extendedData = JSON.stringify(extendedData);
      } else if (protanCount > tritanCount && protanCount > deutanCount && protanCount >= 2) {
         extendedData = JSON.parse(extendedData);
         extendedData.diagnosis = 'Protan Deficiency';
         extendedData = JSON.stringify(extendedData);
      } else if (deutanCount > tritanCount && deutanCount > protanCount && deutanCount >= 2) {
         extendedData = JSON.parse(extendedData);
         extendedData.diagnosis = 'Deutan Deficiency';
         extendedData = JSON.stringify(extendedData);
      } else if (caps.length > 0 && req.body.grade === '需关注') {
         extendedData = JSON.parse(extendedData);
         extendedData.diagnosis = 'Low Discrimination';
         extendedData = JSON.stringify(extendedData);
      } else if (caps.length === 0) {
         extendedData = JSON.parse(extendedData);
         extendedData.diagnosis = 'Normal';
         extendedData = JSON.stringify(extendedData);
      }
    }

    // 计算测试结果
    const testResult = (grade === '优异' || grade === '良好') ? '通过' : '未通过';

    // 插入测试记录
    await pool.request()
      .input('personnelId', sql.Int, targetPersonnelId)
      .input('qualificationTypeId', sql.Int, qualificationTypeId)
      .input('testDate', sql.DateTime, new Date(testDate))
      .input('testType', sql.NVarChar, 'FM100')
      .input('score', sql.Decimal(5, 2), parseFloat(tes) || 0)
      .input('grade', sql.NVarChar, grade)
      .input('testResult', sql.NVarChar, testResult)
      .input('duration', sql.Int, parseInt(duration) || null)
      .input('extendedData', sql.NVarChar, extendedData)
      .input('attachmentPath', sql.NVarChar, screenshotPath)
      .input('remarks', sql.NVarChar, remarks || null)
      .query(`
        INSERT INTO QualificationTest 
        (PersonnelID, QualificationTypeID, TestDate, TestType, Score, Grade, TestResult, Duration, ExtendedData, AttachmentPath, Remarks)
        VALUES 
        (@personnelId, @qualificationTypeId, @testDate, @testType, @score, @grade, @testResult, @duration, @extendedData, @attachmentPath, @remarks)
      `);

    // 如果测试通过，自动创建/更新资质认证
    if (testResult === '通过') {
      // 检查是否已有FM100认证
      const certCheck = await pool.request()
        .input('personnelId', sql.Int, targetPersonnelId)
        .input('typeId', sql.Int, qualificationTypeId)
        .query(`SELECT ID FROM PersonnelCertification WHERE PersonnelID = @personnelId AND QualificationTypeID = @typeId`);

      const expiryDate = new Date(testDate);
      expiryDate.setMonth(expiryDate.getMonth() + 12); // 有效期12个月

      if (certCheck.recordset.length > 0) {
        // 更新现有认证
        await pool.request()
          .input('id', sql.Int, certCheck.recordset[0].ID)
          .input('certLevel', sql.NVarChar, grade)
          .input('certDate', sql.Date, new Date(testDate))
          .input('expiryDate', sql.Date, expiryDate)
          .query(`
            UPDATE PersonnelCertification SET
              CertLevel = @certLevel, CertDate = @certDate, ExpiryDate = @expiryDate,
              CertStatus = '有效', UpdatedAt = GETDATE()
            WHERE ID = @id
          `);
      } else {
        // 创建新认证
        await pool.request()
          .input('personnelId', sql.Int, targetPersonnelId)
          .input('typeId', sql.Int, qualificationTypeId)
          .input('certLevel', sql.NVarChar, grade)
          .input('certDate', sql.Date, new Date(testDate))
          .input('expiryDate', sql.Date, expiryDate)
          .query(`
            INSERT INTO PersonnelCertification 
            (PersonnelID, QualificationTypeID, CertLevel, CertDate, ExpiryDate, CertStatus)
            VALUES (@personnelId, @typeId, @certLevel, @certDate, @expiryDate, '有效')
          `);
      }
    }

    res.json({ success: true, message: '测试记录保存成功' });

  } catch (error) {
    console.error('新增FM100测试记录失败:', error);
    res.status(500).json({ success: false, message: '保存失败: ' + error.message });
  }
});

/**
 * 更新FM100测试记录
 * PUT /api/qualification/fm100/:id
 */
router.put('/fm100/:id', upload.single('screenshot'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      personnelId, testDate, duration, tes, sqrtTes, category,
      pctUnselected, pctFactory, pctExperienced,
      angle, cIndex, sIndex, diagnosis, grade, remarks
    } = req.body;

    const screenshotPath = req.file ? `qualification/${req.file.filename}` : undefined;

    let pool = await sql.connect(await getDynamicConfig());

    // 检查记录是否存在
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT PersonnelID, QualificationTypeID, AttachmentPath, ExtendedData FROM QualificationTest WHERE ID = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const currentRecord = checkResult.recordset[0];
    const currentPersonnelId = currentRecord.PersonnelID;
    const qualificationTypeId = currentRecord.QualificationTypeID;

    // 如果上传了新截图，删除旧截图
    if (screenshotPath && currentRecord.AttachmentPath) {
      const oldFilePath = path.join(__dirname, '..', 'uploads', currentRecord.AttachmentPath);
      if (fs.existsSync(oldFilePath)) {
        try { fs.unlinkSync(oldFilePath); } catch (e) { console.error('删除旧截图失败:', e); }
      }
    }

    // 构建扩展数据
    const extendedDataObj = {
      sqrtTes: parseFloat(sqrtTes) || 0,
      category: category || '',
      pctUnselected: parseInt(pctUnselected) || 0,
      pctFactory: parseInt(pctFactory) || 0,
      pctExperienced: parseInt(pctExperienced) || 0,
      angle: parseFloat(angle) || 0,
      cIndex: parseFloat(cIndex) || 0,
      sIndex: parseFloat(sIndex) || 0,
      diagnosis: diagnosis || '',
      errorCapNo: req.body.errorCapNo || ''
    };
    
    // 保留原有的 reportNo，如果原来有的话
    if (currentRecord.ExtendedData) {
       try {
         const oldExt = JSON.parse(currentRecord.ExtendedData);
         if (oldExt.reportNo) {
           extendedDataObj.reportNo = oldExt.reportNo;
         }
       } catch (e) {}
    }
    
    let extendedData = JSON.stringify(extendedDataObj);

    // 自动诊断逻辑 (如果前端未传或需要后端校验)
    if (!diagnosis && req.body.errorCapNo) {
       const caps = req.body.errorCapNo.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n));
       let tritanCount = 0, protanCount = 0, deutanCount = 0;
       
       caps.forEach(cap => {
         if ((cap >= 45 && cap <= 55) || cap >= 83 || cap <= 7) tritanCount++;
         if ((cap >= 62 && cap <= 70) || (cap >= 17 && cap <= 24)) protanCount++;
         if ((cap >= 56 && cap <= 61) || (cap >= 12 && cap <= 17)) deutanCount++;
       });
       
       // 简单的判定逻辑，取最大值
       let newDiagnosis = '';
       if (tritanCount > protanCount && tritanCount > deutanCount && tritanCount >= 2) {
          newDiagnosis = 'Tritan Deficiency';
       } else if (protanCount > tritanCount && protanCount > deutanCount && protanCount >= 2) {
          newDiagnosis = 'Protan Deficiency';
       } else if (deutanCount > tritanCount && deutanCount > protanCount && deutanCount >= 2) {
          newDiagnosis = 'Deutan Deficiency';
       } else if (caps.length > 0 && req.body.grade === '需关注') {
          newDiagnosis = 'Low Discrimination';
       } else if (caps.length === 0) {
          newDiagnosis = 'Normal';
       }
       
       if (newDiagnosis) {
         const temp = JSON.parse(extendedData);
         temp.diagnosis = newDiagnosis;
         extendedData = JSON.stringify(temp);
         
         // 同时也需要更新 SQL 参数中的 diagnosis 变量，虽然下面 SQL 语句用的是 diagnosis 变量而不是从 extendedData 取
         // 但下面的 UPDATE 语句使用的是 @extendedData 参数，所以 JSON 字符串更新了就足够了
         // 不过要注意，UPDATE 语句里并没有单独更新 Diagnosis 列(如果有的话)，
         // 检查发现数据库设计中 Diagnosis 存储在 ExtendedData JSON 中，没有单独列，所以只需更新 JSON
       }
    }

    // 计算测试结果
    const testResult = (grade === '优异' || grade === '良好') ? '通过' : '未通过';

    // 构建更新SQL
    let updateQuery = `
      UPDATE QualificationTest SET
        TestDate = @testDate, Duration = @duration, Score = @score, Grade = @grade,
        TestResult = @testResult, ExtendedData = @extendedData, Remarks = @remarks
    `;
    
    if (screenshotPath) {
      updateQuery += `, AttachmentPath = @attachmentPath`;
    }
    
    updateQuery += ` WHERE ID = @id`;

    const request = pool.request()
      .input('id', sql.Int, id)
      .input('testDate', sql.DateTime, new Date(testDate))
      .input('duration', sql.Int, parseInt(duration) || null)
      .input('score', sql.Decimal(5, 2), parseFloat(tes) || 0)
      .input('grade', sql.NVarChar, grade)
      .input('testResult', sql.NVarChar, testResult)
      .input('extendedData', sql.NVarChar, extendedData)
      .input('remarks', sql.NVarChar, remarks || null);

    if (screenshotPath) {
      request.input('attachmentPath', sql.NVarChar, screenshotPath);
    }

    await request.query(updateQuery);

    // 如果测试通过，且是最新的一次测试，则更新资质认证状态
    if (testResult === '通过') {
      // 检查这是否是该人员该类型最新的测试记录
      const latestTestCheck = await pool.request()
        .input('personnelId', sql.Int, currentPersonnelId)
        .input('typeId', sql.Int, qualificationTypeId)
        .query(`SELECT TOP 1 ID FROM QualificationTest WHERE PersonnelID = @personnelId AND QualificationTypeID = @typeId ORDER BY TestDate DESC`);

      if (latestTestCheck.recordset.length > 0 && latestTestCheck.recordset[0].ID == id) {
        // 是最新记录，更新认证信息
        const certCheck = await pool.request()
          .input('personnelId', sql.Int, currentPersonnelId)
          .input('typeId', sql.Int, qualificationTypeId)
          .query(`SELECT ID FROM PersonnelCertification WHERE PersonnelID = @personnelId AND QualificationTypeID = @typeId`);

        const expiryDate = new Date(testDate);
        expiryDate.setMonth(expiryDate.getMonth() + 12); // 有效期12个月

        if (certCheck.recordset.length > 0) {
          // 更新现有认证
          await pool.request()
            .input('id', sql.Int, certCheck.recordset[0].ID)
            .input('certLevel', sql.NVarChar, grade)
            .input('certDate', sql.Date, new Date(testDate))
            .input('expiryDate', sql.Date, expiryDate)
            .query(`
              UPDATE PersonnelCertification SET
                CertLevel = @certLevel, CertDate = @certDate, ExpiryDate = @expiryDate,
                CertStatus = '有效', UpdatedAt = GETDATE()
              WHERE ID = @id
            `);
        } else {
          // 创建新认证
          await pool.request()
            .input('personnelId', sql.Int, currentPersonnelId)
            .input('typeId', sql.Int, qualificationTypeId)
            .input('certLevel', sql.NVarChar, grade)
            .input('certDate', sql.Date, new Date(testDate))
            .input('expiryDate', sql.Date, expiryDate)
            .query(`
              INSERT INTO PersonnelCertification 
              (PersonnelID, QualificationTypeID, CertLevel, CertDate, ExpiryDate, CertStatus)
              VALUES (@personnelId, @typeId, @certLevel, @certDate, @expiryDate, '有效')
            `);
        }
      }
    }

    res.json({ success: true, message: '更新成功' });

  } catch (error) {
    console.error('更新FM100测试记录失败:', error);
    res.status(500).json({ success: false, message: '更新失败: ' + error.message });
  }
});

/**
 * 获取FM100测试详情
 * GET /api/qualification/fm100/:id
 */
router.get('/fm100/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let pool = await sql.connect(await getDynamicConfig());

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          t.ID as id, t.PersonnelID as personnelId,
          p.Name as personnelName, p.EmployeeNo as employeeNo, 
          p.Department as department, p.Position as position,
          t.TestDate as testDate, t.Duration as duration,
          t.Score as tes, t.Grade as grade, t.TestResult as testResult,
          t.ExtendedData as extendedData, t.AttachmentPath as screenshotPath,
          t.Remarks as remarks, t.CreatedAt as createdAt
        FROM QualificationTest t
        JOIN PersonnelQualification p ON t.PersonnelID = p.ID
        WHERE t.ID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const data = result.recordset[0];
    
    // 解析扩展数据
    if (data.extendedData) {
      try {
        const ext = JSON.parse(data.extendedData);
        Object.assign(data, ext);
      } catch (e) {
        // 保持原样
      }
    }

    res.json({ success: true, data });

  } catch (error) {
    console.error('获取FM100测试详情失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 删除FM100测试记录
 * DELETE /api/qualification/fm100/:id
 */
router.delete('/fm100/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let pool = await sql.connect(await getDynamicConfig());

    // 获取附件路径
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT AttachmentPath FROM QualificationTest WHERE ID = @id');

    if (result.recordset.length > 0 && result.recordset[0].AttachmentPath) {
      const filePath = path.join(__dirname, '..', 'uploads', result.recordset[0].AttachmentPath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.request().input('id', sql.Int, id).query('DELETE FROM QualificationTest WHERE ID = @id');

    res.json({ success: true, message: '删除成功' });

  } catch (error) {
    console.error('删除FM100测试记录失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// =====================================================================
// 统计分析 API
// =====================================================================

/**
 * 获取资质统计概览
 * GET /api/qualification/statistics/overview
 */
router.get('/statistics/overview', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());

    const result = await pool.request().query(`
      SELECT
        -- 人员统计
        (SELECT COUNT(*) FROM PersonnelQualification WHERE IsActive = 1) AS totalPersonnel,
        (SELECT COUNT(*) FROM PersonnelQualification WHERE IsActive = 1 AND OverallStatus = '合格') AS qualifiedPersonnel,
        (SELECT COUNT(*) FROM PersonnelQualification WHERE IsActive = 1 AND OverallStatus = '待评估') AS pendingPersonnel,
        -- 认证统计
        (SELECT COUNT(*) FROM PersonnelCertification WHERE CertStatus = '有效') AS validCertifications,
        (SELECT COUNT(*) FROM PersonnelCertification WHERE CertStatus = '有效' 
         AND ExpiryDate IS NOT NULL AND ExpiryDate <= DATEADD(DAY, 30, GETDATE())) AS expiringSoon,
        (SELECT COUNT(*) FROM PersonnelCertification WHERE CertStatus = '已过期') AS expiredCertifications,
        -- 本月测试统计
        (SELECT COUNT(*) FROM QualificationTest WHERE MONTH(TestDate) = MONTH(GETDATE()) AND YEAR(TestDate) = YEAR(GETDATE())) AS testsThisMonth,
        (SELECT COUNT(*) FROM QualificationTest WHERE MONTH(TestDate) = MONTH(GETDATE()) AND YEAR(TestDate) = YEAR(GETDATE()) AND TestResult = '通过') AS passedThisMonth
    `);

    res.json({ success: true, data: result.recordset[0] });

  } catch (error) {
    console.error('获取统计概览失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 获取各资质类型统计
 * GET /api/qualification/statistics/by-type
 */
router.get('/statistics/by-type', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());

    const result = await pool.request().query(`
      SELECT 
        qt.ID as typeId,
        qt.CategoryName as categoryName,
        qt.TypeCode as typeCode,
        qt.TypeName as typeName,
        COUNT(DISTINCT c.PersonnelID) AS certifiedCount,
        SUM(CASE WHEN c.CertStatus = '有效' THEN 1 ELSE 0 END) AS validCount,
        SUM(CASE WHEN c.CertStatus = '已过期' THEN 1 ELSE 0 END) AS expiredCount
      FROM QualificationType qt
      LEFT JOIN PersonnelCertification c ON qt.ID = c.QualificationTypeID
      WHERE qt.IsActive = 1
      GROUP BY qt.ID, qt.CategoryName, qt.TypeCode, qt.TypeName, qt.SortOrder
      ORDER BY qt.SortOrder
    `);

    res.json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('获取资质类型统计失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

/**
 * 获取即将到期的资质列表
 * GET /api/qualification/expiring
 */
router.get('/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    let pool = await sql.connect(await getDynamicConfig());

    const result = await pool.request()
      .input('days', sql.Int, parseInt(days))
      .query(`
        SELECT TOP 50
          c.ID as id, c.PersonnelID as personnelId,
          p.Name as personnelName, p.EmployeeNo as employeeNo, p.Department as department,
          qt.TypeName as qualificationName, qt.CategoryName as categoryName,
          c.CertLevel as certLevel, c.CertDate as certDate, c.ExpiryDate as expiryDate,
          DATEDIFF(DAY, GETDATE(), c.ExpiryDate) AS daysUntilExpiry
        FROM PersonnelCertification c
        JOIN PersonnelQualification p ON c.PersonnelID = p.ID
        JOIN QualificationType qt ON c.QualificationTypeID = qt.ID
        WHERE c.CertStatus = '有效' 
          AND c.ExpiryDate IS NOT NULL
          AND c.ExpiryDate <= DATEADD(DAY, @days, GETDATE())
          AND c.ExpiryDate >= GETDATE()
        ORDER BY c.ExpiryDate
      `);

    res.json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('获取即将到期资质失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

module.exports = router;
