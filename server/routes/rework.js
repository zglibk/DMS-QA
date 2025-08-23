/*
 * 生产不良返工登记模块路由
 * 
 * 功能说明：
 * 1. 返工记录的增删改查操作
 * 2. 返工统计数据查询
 * 3. 返工分析图表数据
 * 4. 返工类别和方法管理
 * 5. 年度返工汇总统计
 * 
 * 作者：DMS-QA系统
 * 创建时间：2025年
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getConnection } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/rework-attachments');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: function (req, file, cb) {
    // 允许的文件类型
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片、PDF和Office文档'));
    }
  }
});

// =====================================================
// 返工记录管理 API
// =====================================================

/**
 * @route GET /api/rework/export
 * @desc 导出返工记录数据
 * @access Private
 */
router.get('/export', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // 日期范围筛选
    if (req.query.startDate && req.query.endDate) {
      whereClause += ` AND ReworkDate >= @startDate AND ReworkDate <= @endDate`;
      params.push({ name: 'startDate', type: sql.Date, value: req.query.startDate });
      params.push({ name: 'endDate', type: sql.Date, value: req.query.endDate });
    }
    
    // 客户编号筛选
    if (req.query.customerCode) {
      whereClause += ` AND CustomerCode LIKE @customerCode`;
      params.push({ name: 'customerCode', type: sql.NVarChar, value: `%${req.query.customerCode}%` });
    }
    
    // 工单号筛选
    if (req.query.orderNo) {
      whereClause += ` AND OrderNo LIKE @orderNo`;
      params.push({ name: 'orderNo', type: sql.NVarChar, value: `%${req.query.orderNo}%` });
    }
    
    // 责任人筛选
    if (req.query.responsiblePerson) {
      whereClause += ` AND ResponsiblePerson = @responsiblePerson`;
      params.push({ name: 'responsiblePerson', type: sql.NVarChar, value: req.query.responsiblePerson });
    }
    
    // 返工状态筛选
    if (req.query.reworkStatus) {
      whereClause += ` AND ReworkStatus = @reworkStatus`;
      params.push({ name: 'reworkStatus', type: sql.NVarChar, value: req.query.reworkStatus });
    }
    
    // 关键词搜索
    if (req.query.keyword) {
      whereClause += ` AND (ProductName LIKE @keyword OR DefectiveReason LIKE @keyword OR ReworkMethod LIKE @keyword)`;
      params.push({ name: 'keyword', type: sql.NVarChar, value: `%${req.query.keyword}%` });
    }
    
    const query = `
      SELECT 
        ID,
        ReworkDate,
        CustomerCode,
        OrderNo,
        ProductName,
        ProductSpec,
        Workshop,
        TotalQty,
        DefectiveQty,
        GoodQty,
        DefectiveRate,
        DefectiveReason,
        DefectiveCategory,
        ResponsiblePerson,
        ResponsibleDept,
        ReworkCategory,
        ReworkPersonnel,
        ReworkHours,
        ReworkMethod,
        ReworkStatus,
        MaterialCost,
        LaborCost,
        OtherCost,
        TotalCost,
        QualityLevel,
        FinalResult,
        Remarks,
        CreatedAt,
        UpdatedAt
      FROM ProductionReworkRegister
      ${whereClause}
      ORDER BY ReworkDate DESC, ID DESC
    `;
    
    const request = pool.request();
    
    // 添加参数
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset,
      message: '导出数据获取成功'
    });
    
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出数据失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rework/list
 * @desc 获取返工记录列表（支持分页和筛选）
 * @access Private
 */
router.get('/list', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      startDate,
      endDate,
      customerCode,
      orderNo,
      responsiblePerson,
      department,
      workshop,
      reworkStatus,
      approvalStatus,
      keyword
    } = req.query;

    const offset = (page - 1) * pageSize;
    
    let whereConditions = [];
    let parameters = [];
    
    // 构建查询条件
    if (startDate) {
      whereConditions.push('ReworkDate >= @startDate');
      parameters.push({ name: 'startDate', type: sql.Date, value: startDate });
    }
    
    if (endDate) {
      whereConditions.push('ReworkDate <= @endDate');
      parameters.push({ name: 'endDate', type: sql.Date, value: endDate });
    }
    
    if (customerCode) {
      whereConditions.push('CustomerCode LIKE @customerCode');
      parameters.push({ name: 'customerCode', type: sql.NVarChar, value: `%${customerCode}%` });
    }
    
    if (orderNo) {
      whereConditions.push('OrderNo LIKE @orderNo');
      parameters.push({ name: 'orderNo', type: sql.NVarChar, value: `%${orderNo}%` });
    }
    
    if (responsiblePerson) {
      whereConditions.push('ResponsiblePerson LIKE @responsiblePerson');
      parameters.push({ name: 'responsiblePerson', type: sql.NVarChar, value: `%${responsiblePerson}%` });
    }
    
    if (department) {
      whereConditions.push('ResponsibleDept = @department');
      parameters.push({ name: 'department', type: sql.NVarChar, value: department });
    }
    
    if (workshop) {
      whereConditions.push('Workshop = @workshop');
      parameters.push({ name: 'workshop', type: sql.NVarChar, value: workshop });
    }
    
    if (reworkStatus) {
      whereConditions.push('ReworkStatus = @reworkStatus');
      parameters.push({ name: 'reworkStatus', type: sql.NVarChar, value: reworkStatus });
    }
    
    if (approvalStatus) {
      whereConditions.push('ApprovalStatus = @approvalStatus');
      parameters.push({ name: 'approvalStatus', type: sql.NVarChar, value: approvalStatus });
    }
    
    if (keyword) {
      whereConditions.push('(ProductName LIKE @keyword OR DefectiveReason LIKE @keyword OR DefectiveDescription LIKE @keyword)');
      parameters.push({ name: 'keyword', type: sql.NVarChar, value: `%${keyword}%` });
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const pool = await getConnection();
    const request = pool.request();
    
    // 添加参数
    parameters.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM ProductionReworkRegister ${whereClause}`;
    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;
    
    // 查询数据
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, parseInt(pageSize));
    
    // 使用兼容SQL Server 2008 R2的分页语法
    const dataQuery = `
      SELECT * FROM (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY ReworkDate DESC, ID DESC) as RowNum,
          ID, ReworkDate, CustomerCode, OrderNo, ProductName, ProductSpec,
          TotalQty, DefectiveQty, GoodQty, DefectiveReason, DefectiveCategory,
          ResponsiblePerson, ResponsibleDept, Workshop, ReworkCategory, ReworkPersonnel,
          ReworkHours, ReworkMethod, ReworkResult, ReworkStatus,
          MaterialCost, LaborCost, OtherCost, TotalCost,
          QualityLevel, ReworkTimes, FinalResult,
          CreatedBy, CreatedAt, UpdatedBy, UpdatedAt,
          ApprovedBy, ApprovedAt, ApprovalStatus,
          DefectiveRate, ReworkEfficiency
        FROM ProductionReworkRegister 
        ${whereClause}
      ) AS PagedResults
      WHERE RowNum > @offset AND RowNum <= (@offset + @pageSize)
      ORDER BY RowNum
    `;
    
    const dataResult = await request.query(dataQuery);
    
    // 返工记录列表查询完成
    
    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: total,
        pages: Math.ceil(total / pageSize)
      }
    });
    
  } catch (error) {
    console.error('获取返工记录列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取返工记录列表失败',
      error: error.message
    });
  }
});

// =====================================================
// 下拉选项数据 API
// =====================================================

/**
 * @route GET /api/rework/options
 * @desc 获取表单下拉选项数据
 * @access Private
 */
router.get('/options', async (req, res) => {
  try {
    // 获取返工选项数据
    const pool = await getConnection();
    
    // 默认选项数据
    const defaultOptions = {
      workshops: ['车间一', '车间二', '车间三', '装配车间', '包装车间'],
      departments: ['生产部', '质量部', '技术部', '设备部', '仓储部'],
      persons: [
        { Name: '张三', Department: '生产部' },
        { Name: '李四', Department: '质量部' },
        { Name: '王五', Department: '技术部' },
        { Name: '赵六', Department: '设备部' }
      ],
      defectiveCategories: ['外观不良', '尺寸不良', '功能不良', '材料不良', '工艺不良'],
      reworkStatuses: ['进行中', '已完成', '已取消'],
      approvalStatuses: ['待审批', '已审批', '已拒绝'],
      qualityLevels: ['A', 'B', 'C', 'D'],
      finalResults: ['合格', '报废', '降级']
    };
    
    let options = { ...defaultOptions };
    
    try {
      // 尝试获取车间列表
      const workshopResult = await pool.request().query(`
        SELECT Name FROM Workshop WHERE Name IS NOT NULL ORDER BY Name
      `);
      if (workshopResult.recordset.length > 0) {
        options.workshops = workshopResult.recordset.map(item => item.Name);
      }
    } catch (err) {
      // Workshop表不存在，使用默认数据
    }
    
    try {
      // 尝试获取部门列表
      const deptResult = await pool.request().query(`
        SELECT Name FROM Department WHERE Name IS NOT NULL ORDER BY Name
      `);
      if (deptResult.recordset.length > 0) {
        options.departments = deptResult.recordset.map(item => item.Name);
      }
    } catch (err) {
      // Department表不存在，使用默认数据
    }
    
    try {
      // 尝试获取人员列表（包含所有人员，不限制IsActive状态）
      const personResult = await pool.request().query(`
        SELECT p.Name, ISNULL(d.Name, '未分配') as Department, p.IsActive
        FROM Person p 
        LEFT JOIN Department d ON p.DepartmentID = d.ID 
        WHERE p.Name IS NOT NULL
        ORDER BY p.IsActive DESC, p.Name
      `);
      if (personResult.recordset.length > 0) {
        options.persons = personResult.recordset;
      }
    } catch (err) {
      // Person表不存在，使用默认数据
    }
    
    try {
      // 尝试获取不良类别
      const defectiveCategoryResult = await pool.request().query(`
        SELECT Name FROM DefectiveCategory WHERE Name IS NOT NULL ORDER BY Name
      `);
      if (defectiveCategoryResult.recordset.length > 0) {
        options.defectiveCategories = defectiveCategoryResult.recordset.map(item => item.Name);
      }
    } catch (err) {
      // DefectiveCategory表不存在，使用默认数据
    }
    
    // 返工选项数据获取成功
    res.json({
      success: true,
      data: options
    });
    
  } catch (error) {
    console.error('获取下拉选项数据失败:', error);
    // 即使出错也返回默认数据，确保前端能正常工作
    res.json({
      success: true,
      data: {
        workshops: ['车间一', '车间二', '车间三', '装配车间', '包装车间'],
        departments: ['生产部', '质量部', '技术部', '设备部', '仓储部'],
        persons: [
          { Name: '张三', Department: '生产部' },
          { Name: '李四', Department: '质量部' },
          { Name: '王五', Department: '技术部' },
          { Name: '赵六', Department: '设备部' }
        ],
        defectiveCategories: ['外观不良', '尺寸不良', '功能不良', '材料不良', '工艺不良'],
        reworkStatuses: ['进行中', '已完成', '已取消'],
        approvalStatuses: ['待审批', '已审批', '已拒绝'],
        qualityLevels: ['A', 'B', 'C', 'D'],
        finalResults: ['合格', '报废', '降级']
      }
    });
  }
});

/**
 * @route GET /api/rework/quality-levels
 * @desc 获取质量等级设定列表
 * @access Private
 */
router.get('/quality-levels', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // 尝试从数据库获取质量等级设定
    try {
      const result = await pool.request().query(`
        SELECT ID, Grade, Title, Description, Range, CreatedAt, UpdatedAt
        FROM QualityLevelSettings
        ORDER BY 
          CASE Grade 
            WHEN 'A' THEN 1 
            WHEN 'B' THEN 2 
            WHEN 'C' THEN 3 
            WHEN 'D' THEN 4 
            ELSE 5 
          END
      `);
      
      if (result.recordset.length > 0) {
        res.json({
          success: true,
          data: result.recordset
        });
        return;
      }
    } catch (dbError) {
      // QualityLevelSettings表不存在，返回默认数据
    }
    
    // 如果数据库中没有数据或表不存在，返回默认数据
    const defaultLevels = [
      {
        id: 1,
        grade: 'A',
        title: '优秀',
        description: '产品质量完全符合标准，无任何缺陷',
        range: '合格率 ≥ 99%'
      },
      {
        id: 2,
        grade: 'B',
        title: '良好',
        description: '产品质量基本符合标准，存在轻微缺陷',
        range: '合格率 95-99%'
      },
      {
        id: 3,
        grade: 'C',
        title: '一般',
        description: '产品质量勉强符合标准，存在明显缺陷',
        range: '合格率 90-95%'
      },
      {
        id: 4,
        grade: 'D',
        title: '不合格',
        description: '产品质量不符合标准，存在严重缺陷',
        range: '合格率 < 90%'
      }
    ];
    
    res.json({
      success: true,
      data: defaultLevels
    });
    
  } catch (error) {
    console.error('获取质量等级设定失败:', error);
    res.status(500).json({
      success: false,
      message: '获取质量等级设定失败',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/rework/quality-levels/batch
 * @desc 批量更新质量等级设定
 * @access Private
 */
router.put('/quality-levels/batch', async (req, res) => {
  try {
    const { levels } = req.body;
    
    if (!levels || !Array.isArray(levels)) {
      return res.status(400).json({
        success: false,
        message: '无效的等级数据'
      });
    }
    
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // 先清空现有数据
      const deleteRequest = new sql.Request(transaction);
      await deleteRequest.query('DELETE FROM QualityLevelSettings');
      
      // 插入新数据
      for (const level of levels) {
        const { grade, title, description, range } = level;
        
        if (!grade || !title || !description || !range) {
          throw new Error(`等级数据不完整: ${JSON.stringify(level)}`);
        }
        
        const request = new sql.Request(transaction);
        request.input('grade', sql.NVarChar, grade);
        request.input('title', sql.NVarChar, title);
        request.input('description', sql.NVarChar, description);
        request.input('range', sql.NVarChar, range);
        request.input('createdAt', sql.DateTime, new Date());
        request.input('updatedAt', sql.DateTime, new Date());
        
        await request.query(`
          INSERT INTO QualityLevelSettings (Grade, Title, Description, Range, CreatedAt, UpdatedAt)
          VALUES (@grade, @title, @description, @range, @createdAt, @updatedAt)
        `);
      }
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: '批量更新质量等级设定成功'
      });
      
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
    
  } catch (error) {
    console.error('批量更新质量等级设定失败:', error);
    res.status(500).json({
      success: false,
      message: '批量更新质量等级设定失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/rework/quality-levels
 * @desc 新增质量等级设定
 * @access Private
 */
router.post('/quality-levels', async (req, res) => {
  try {
    const { grade, title, description, range } = req.body;
    
    if (!grade || !title) {
      return res.status(400).json({
        success: false,
        message: '等级和标题不能为空'
      });
    }
    
    const pool = await getConnection();
    
    // 检查等级是否已存在
    const checkRequest = pool.request();
    checkRequest.input('grade', sql.NVarChar, grade);
    const checkResult = await checkRequest.query(`
      SELECT COUNT(*) as count FROM QualityLevelSettings WHERE Grade = @grade
    `);
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该等级已存在'
      });
    }
    
    const request = pool.request();
    request.input('grade', sql.NVarChar, grade);
    request.input('title', sql.NVarChar, title);
    request.input('description', sql.NVarChar, description || '');
    request.input('range', sql.NVarChar, range || '');
    request.input('createdAt', sql.DateTime, new Date());
    request.input('updatedAt', sql.DateTime, new Date());
    
    const result = await request.query(`
      INSERT INTO QualityLevelSettings (Grade, Title, Description, Range, CreatedAt, UpdatedAt)
      OUTPUT INSERTED.ID
      VALUES (@grade, @title, @description, @range, @createdAt, @updatedAt)
    `);
    
    res.json({
      success: true,
      message: '新增质量等级设定成功',
      data: { id: result.recordset[0].ID }
    });
    
  } catch (error) {
    console.error('新增质量等级设定失败:', error);
    res.status(500).json({
      success: false,
      message: '新增质量等级设定失败',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/rework/quality-levels/:id
 * @desc 更新单个质量等级设定
 * @access Private
 */
router.put('/quality-levels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, range } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: '标题不能为空'
      });
    }
    
    const pool = await getConnection();
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id));
    request.input('title', sql.NVarChar, title);
    request.input('description', sql.NVarChar, description || '');
    request.input('range', sql.NVarChar, range || '');
    request.input('updatedAt', sql.DateTime, new Date());
    
    const result = await request.query(`
      UPDATE QualityLevelSettings 
      SET Title = @title, Description = @description, Range = @range, UpdatedAt = @updatedAt
      OUTPUT INSERTED.ID
      WHERE ID = @id
    `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: '质量等级设定不存在'
      });
    }
    
    res.json({
      success: true,
      message: '质量等级设定更新成功'
    });
    
  } catch (error) {
    console.error('更新质量等级设定失败:', error);
    res.status(500).json({
      success: false,
      message: '更新质量等级设定失败',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/rework/quality-levels/:id
 * @desc 删除质量等级设定
 * @access Private
 */
router.delete('/quality-levels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }
    
    const pool = await getConnection();
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id));
    
    const result = await request.query(`
      DELETE FROM QualityLevelSettings WHERE ID = @id
    `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: '质量等级设定不存在'
      });
    }
    
    res.json({
      success: true,
      message: '删除质量等级设定成功'
    });
    
  } catch (error) {
    console.error('删除质量等级设定失败:', error);
    res.status(500).json({
      success: false,
      message: '删除质量等级设定失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rework/rework-categories
 * @desc 获取返工类别列表
 * @access Private
 */
router.get('/rework-categories', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        ID,
        Name,
        Description
      FROM ReworkCategory
      ORDER BY ID
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('获取返工类别列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取返工类别列表失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rework/:id
 * @desc 获取单个返工记录详情
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证ID参数
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }
    
    const pool = await getConnection();
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id));
    
    const result = await request.query(`
      SELECT * FROM ProductionReworkRegister WHERE ID = @id
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '返工记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    });
    
  } catch (error) {
    console.error('获取返工记录详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取返工记录详情失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/rework
 * @desc 创建新的返工记录
 * @access Private
 */
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      reworkDate, customerCode, orderNo, productName, productSpec,
      totalQty, defectiveQty, goodQty, defectiveReason, defectiveCategory,
      defectiveDescription, responsiblePerson, responsibleDept, workshop,
      reworkCategory, reworkPersonnel, reworkHours, reworkMethod, reworkResult, reworkStatus,
      materialCost, laborCost, otherCost, qualityLevel, reworkTimes,
      finalResult, remarks, processNotes, createdBy, attachmentPath
    } = req.body;
    
    // 处理附件路径 - 优先使用前端传来的attachmentPath
    let attachmentFiles = attachmentPath || '';
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => file.filename).join(';');
      attachmentFiles = attachmentFiles ? `${attachmentFiles};${newFiles}` : newFiles;
    }
    
    // 计算总成本
    const totalCost = (parseFloat(materialCost) || 0) + (parseFloat(laborCost) || 0) + (parseFloat(otherCost) || 0);
    
    const pool = await getConnection();
    const request = pool.request();
    
    // 添加参数
    request.input('reworkDate', sql.Date, reworkDate);
    request.input('customerCode', sql.NVarChar, customerCode);
    request.input('orderNo', sql.NVarChar, orderNo);
    request.input('productName', sql.NVarChar, productName);
    request.input('productSpec', sql.NVarChar, productSpec);
    request.input('totalQty', sql.Int, totalQty);
    request.input('defectiveQty', sql.Int, defectiveQty);
    request.input('goodQty', sql.Int, goodQty);
    request.input('defectiveReason', sql.NVarChar, defectiveReason);
    request.input('defectiveCategory', sql.NVarChar, defectiveCategory);
    request.input('defectiveDescription', sql.NVarChar, defectiveDescription);
    request.input('responsiblePerson', sql.NVarChar, responsiblePerson);
    request.input('responsibleDept', sql.NVarChar, responsibleDept);
    request.input('workshop', sql.NVarChar, workshop);
    request.input('reworkCategory', sql.NVarChar, reworkCategory);
    request.input('reworkPersonnel', sql.NVarChar, reworkPersonnel);
    request.input('reworkHours', sql.Decimal(8,2), reworkHours);
    request.input('reworkMethod', sql.NVarChar, reworkMethod);
    request.input('reworkResult', sql.NVarChar, reworkResult);
    request.input('reworkStatus', sql.NVarChar, reworkStatus || '进行中');
    request.input('materialCost', sql.Decimal(10,2), materialCost || 0);
    request.input('laborCost', sql.Decimal(10,2), laborCost || 0);
    request.input('otherCost', sql.Decimal(10,2), otherCost || 0);
    request.input('totalCost', sql.Decimal(10,2), totalCost);
    request.input('qualityLevel', sql.NVarChar, qualityLevel);
    request.input('reworkTimes', sql.Int, reworkTimes || 1);
    request.input('finalResult', sql.NVarChar, finalResult);
    request.input('attachmentFiles', sql.NVarChar, attachmentFiles);
    request.input('remarks', sql.NVarChar, remarks);
    request.input('processNotes', sql.NVarChar, processNotes);
    request.input('createdBy', sql.NVarChar, createdBy || 'admin');
    
    const result = await request.query(`
      INSERT INTO ProductionReworkRegister (
        ReworkDate, CustomerCode, OrderNo, ProductName, ProductSpec,
        TotalQty, DefectiveQty, GoodQty, DefectiveReason, DefectiveCategory,
        DefectiveDescription, ResponsiblePerson, ResponsibleDept, Workshop,
        ReworkCategory, ReworkPersonnel, ReworkHours, ReworkMethod, ReworkResult, ReworkStatus,
        MaterialCost, LaborCost, OtherCost, TotalCost,
        QualityLevel, ReworkTimes, FinalResult,
        AttachmentFiles, Remarks, ProcessNotes, CreatedBy
      ) VALUES (
        @reworkDate, @customerCode, @orderNo, @productName, @productSpec,
        @totalQty, @defectiveQty, @goodQty, @defectiveReason, @defectiveCategory,
        @defectiveDescription, @responsiblePerson, @responsibleDept, @workshop,
        @reworkCategory, @reworkPersonnel, @reworkHours, @reworkMethod, @reworkResult, @reworkStatus,
        @materialCost, @laborCost, @otherCost, @totalCost,
        @qualityLevel, @reworkTimes, @finalResult,
        @attachmentFiles, @remarks, @processNotes, @createdBy
      );
      SELECT SCOPE_IDENTITY() as newId;
    `);
    
    const newId = result.recordset[0].newId;
    
    res.json({
      success: true,
      message: '返工记录创建成功',
      data: { id: newId }
    });
    
  } catch (error) {
    console.error('创建返工记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建返工记录失败',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/rework/:id
 * @desc 更新返工记录
 * @access Private
 */
router.put('/:id', upload.array('attachments', 5), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证ID参数
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }
    const {
      reworkDate, customerCode, orderNo, productName, productSpec,
      totalQty, defectiveQty, goodQty, defectiveReason, defectiveCategory,
      defectiveDescription, responsiblePerson, responsibleDept, workshop,
      reworkCategory, reworkPersonnel, reworkHours, reworkMethod, reworkResult, reworkStatus,
      materialCost, laborCost, otherCost, qualityLevel, reworkTimes,
      finalResult, remarks, processNotes, updatedBy, attachmentPath
    } = req.body;
    
    // 处理附件路径 - 优先使用前端传来的attachmentPath，兼容existingAttachments
    let attachmentFiles = attachmentPath || req.body.existingAttachments || '';
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => file.filename).join(';');
      attachmentFiles = attachmentFiles ? `${attachmentFiles};${newFiles}` : newFiles;
    }
    
    // 计算总成本
    const totalCost = (parseFloat(materialCost) || 0) + (parseFloat(laborCost) || 0) + (parseFloat(otherCost) || 0);
    
    const pool = await getConnection();
    const request = pool.request();
    
    // 添加参数
    request.input('id', sql.Int, parseInt(id));
    request.input('reworkDate', sql.Date, reworkDate);
    request.input('customerCode', sql.NVarChar, customerCode);
    request.input('orderNo', sql.NVarChar, orderNo);
    request.input('productName', sql.NVarChar, productName);
    request.input('productSpec', sql.NVarChar, productSpec);
    request.input('totalQty', sql.Int, totalQty);
    request.input('defectiveQty', sql.Int, defectiveQty);
    request.input('goodQty', sql.Int, goodQty);
    request.input('defectiveReason', sql.NVarChar, defectiveReason);
    request.input('defectiveCategory', sql.NVarChar, defectiveCategory);
    request.input('defectiveDescription', sql.NVarChar, defectiveDescription);
    request.input('responsiblePerson', sql.NVarChar, responsiblePerson);
    request.input('responsibleDept', sql.NVarChar, responsibleDept);
    request.input('workshop', sql.NVarChar, workshop);
    request.input('reworkCategory', sql.NVarChar, reworkCategory);
    request.input('reworkPersonnel', sql.NVarChar, reworkPersonnel);
    request.input('reworkHours', sql.Decimal(8,2), reworkHours);
    request.input('reworkMethod', sql.NVarChar, reworkMethod);
    request.input('reworkResult', sql.NVarChar, reworkResult);
    request.input('reworkStatus', sql.NVarChar, reworkStatus);
    request.input('materialCost', sql.Decimal(10,2), materialCost || 0);
    request.input('laborCost', sql.Decimal(10,2), laborCost || 0);
    request.input('otherCost', sql.Decimal(10,2), otherCost || 0);
    request.input('totalCost', sql.Decimal(10,2), totalCost);
    request.input('qualityLevel', sql.NVarChar, qualityLevel);
    request.input('reworkTimes', sql.Int, reworkTimes);
    request.input('finalResult', sql.NVarChar, finalResult);
    request.input('attachmentFiles', sql.NVarChar, attachmentFiles);
    request.input('remarks', sql.NVarChar, remarks);
    request.input('processNotes', sql.NVarChar, processNotes);
    request.input('updatedBy', sql.NVarChar, updatedBy || 'admin');
    
    const result = await request.query(`
      UPDATE ProductionReworkRegister SET
        ReworkDate = @reworkDate,
        CustomerCode = @customerCode,
        OrderNo = @orderNo,
        ProductName = @productName,
        ProductSpec = @productSpec,
        TotalQty = @totalQty,
        DefectiveQty = @defectiveQty,
        GoodQty = @goodQty,
        DefectiveReason = @defectiveReason,
        DefectiveCategory = @defectiveCategory,
        DefectiveDescription = @defectiveDescription,
        ResponsiblePerson = @responsiblePerson,
        ResponsibleDept = @responsibleDept,
        Workshop = @workshop,
        ReworkCategory = @reworkCategory,
        ReworkPersonnel = @reworkPersonnel,
        ReworkHours = @reworkHours,
        ReworkMethod = @reworkMethod,
        ReworkResult = @reworkResult,
        ReworkStatus = @reworkStatus,
        MaterialCost = @materialCost,
        LaborCost = @laborCost,
        OtherCost = @otherCost,
        TotalCost = @totalCost,
        QualityLevel = @qualityLevel,
        ReworkTimes = @reworkTimes,
        FinalResult = @finalResult,
        AttachmentFiles = @attachmentFiles,
        Remarks = @remarks,
        ProcessNotes = @processNotes,
        UpdatedBy = @updatedBy,
        UpdatedAt = GETDATE()
      WHERE ID = @id
    `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: '返工记录不存在'
      });
    }
    
    res.json({
      success: true,
      message: '返工记录更新成功'
    });
    
  } catch (error) {
    console.error('更新返工记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新返工记录失败',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/rework/:id
 * @desc 删除返工记录
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证ID参数
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }
    
    const pool = await getConnection();
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id));
    
    // 先获取附件信息，用于删除文件
    const attachmentResult = await request.query(`
      SELECT AttachmentFiles FROM ProductionReworkRegister WHERE ID = @id
    `);
    
    if (attachmentResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '返工记录不存在'
      });
    }
    
    // 删除记录
    const deleteResult = await request.query(`
      DELETE FROM ProductionReworkRegister WHERE ID = @id
    `);
    
    // 删除相关附件文件
    const attachmentFiles = attachmentResult.recordset[0].AttachmentFiles;
    if (attachmentFiles) {
      const files = attachmentFiles.split(';');
      files.forEach(filename => {
        if (filename.trim()) {
          const filePath = path.join(__dirname, '../uploads/rework-attachments', filename.trim());
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      });
    }
    
    res.json({
      success: true,
      message: '返工记录删除成功'
    });
    
  } catch (error) {
    console.error('删除返工记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除返工记录失败',
      error: error.message
    });
  }
});

// =====================================================
// 返工统计分析 API
// =====================================================

/**
 * @route GET /api/rework/statistics/summary
 * @desc 获取返工统计汇总数据
 * @access Private
 */
router.get('/statistics/summary', async (req, res) => {
  try {
    const { 
      year = new Date().getFullYear(),
      startDate,
      endDate,
      timeType = 'year',
      department,
      workshop,
      responsiblePerson
    } = req.query;
    
    const pool = await getConnection();
    const request = pool.request();
    
    // 构建查询条件
    let whereConditions = [];
    let parameters = [];
    
    // 时间条件
    if (startDate && endDate) {
      whereConditions.push('ReworkDate >= @startDate AND ReworkDate <= @endDate');
      parameters.push({ name: 'startDate', type: sql.Date, value: startDate });
      parameters.push({ name: 'endDate', type: sql.Date, value: endDate });
      // 查询指定时间范围
    } else {
      whereConditions.push('YEAR(ReworkDate) = @year');
      parameters.push({ name: 'year', type: sql.Int, value: year });
      // 查询指定年份
    }
    
    // 筛选条件
    if (department) {
      whereConditions.push('ResponsibleDept = @department');
      parameters.push({ name: 'department', type: sql.NVarChar, value: department });
    }
    
    if (workshop) {
      whereConditions.push('Workshop = @workshop');
      parameters.push({ name: 'workshop', type: sql.NVarChar, value: workshop });
    }
    
    if (responsiblePerson) {
      whereConditions.push('ResponsiblePerson = @responsiblePerson');
      parameters.push({ name: 'responsiblePerson', type: sql.NVarChar, value: responsiblePerson });
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    // 构建查询条件
    
    // 获取时间范围内的汇总数据
    const summaryRequest = pool.request();
    parameters.forEach(param => {
      summaryRequest.input(param.name, param.type, param.value);
    });
    
    const summaryResult = await summaryRequest.query(`
      SELECT 
        COUNT(*) as TotalReworkCount,
        SUM(DefectiveQty) as TotalDefectiveQty,
        SUM(TotalCost) as TotalCost,
        AVG(CAST(DefectiveQty AS DECIMAL(10,2)) / NULLIF(TotalQty, 0) * 100) as AvgDefectiveRate
      FROM ProductionReworkRegister 
      ${whereClause}
    `);
    
    // 获取责任部门统计
    const deptRequest = pool.request();
    parameters.forEach(param => {
      deptRequest.input(param.name, param.type, param.value);
    });
    
    const deptWhereClause = whereClause ? `${whereClause} AND ResponsibleDept IS NOT NULL` : 'WHERE ResponsibleDept IS NOT NULL';
    const deptResult = await deptRequest.query(`
      SELECT 
        ResponsibleDept,
        COUNT(*) as ReworkCount,
        SUM(DefectiveQty) as TotalDefectiveQty,
        SUM(TotalCost) as TotalCost
      FROM ProductionReworkRegister 
      ${deptWhereClause}
      GROUP BY ResponsibleDept
      ORDER BY ReworkCount DESC
    `);
    
    // 获取返工类别统计
    const categoryRequest = pool.request();
    parameters.forEach(param => {
      categoryRequest.input(param.name, param.type, param.value);
    });
    const categoryResult = await categoryRequest.query(`
      SELECT 
        DefectiveCategory,
        COUNT(*) as ReworkCount,
        SUM(DefectiveQty) as TotalDefectiveQty,
        SUM(TotalCost) as TotalCost
      FROM ProductionReworkRegister 
      ${whereClause} AND DefectiveCategory IS NOT NULL
      GROUP BY DefectiveCategory
      ORDER BY ReworkCount DESC
    `);
    
    // 使用查询结果数据
    const summaryData = summaryResult.recordset[0] || {};

    res.json({
      success: true,
      data: {
        yearly: {
          TotalReworkCount: summaryData.TotalReworkCount || 0,
          TotalDefectiveQty: summaryData.TotalDefectiveQty || 0,
          TotalCost: summaryData.TotalCost || 0,
          AvgDefectiveRate: summaryData.AvgDefectiveRate || 0
        },
        byDepartment: deptResult.recordset,
        byCategory: categoryResult.recordset
      }
    });
    
  } catch (error) {
    console.error('获取返工统计汇总失败:', error);
    res.status(500).json({
      success: false,
      message: '获取返工统计汇总失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rework/statistics/trend
 * @desc 获取返工趋势数据（用于图表）
 * @access Private
 */
router.get('/statistics/trend', async (req, res) => {
  try {
    const { 
      startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      groupBy = 'month', // month, week, day
      department,
      workshop,
      responsiblePerson
    } = req.query;
    
    const pool = await getConnection();
    const request = pool.request();
    
    // 构建查询条件
    let whereConditions = ['ReworkDate >= @startDate AND ReworkDate <= @endDate'];
    let parameters = [
      { name: 'startDate', type: sql.Date, value: startDate },
      { name: 'endDate', type: sql.Date, value: endDate }
    ];
    
    // 筛选条件
    if (department) {
      whereConditions.push('ResponsibleDept = @department');
      parameters.push({ name: 'department', type: sql.NVarChar, value: department });
    }
    
    if (workshop) {
      whereConditions.push('Workshop = @workshop');
      parameters.push({ name: 'workshop', type: sql.NVarChar, value: workshop });
    }
    
    if (responsiblePerson) {
      whereConditions.push('ResponsiblePerson = @responsiblePerson');
      parameters.push({ name: 'responsiblePerson', type: sql.NVarChar, value: responsiblePerson });
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    // 绑定参数
    parameters.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    let groupByClause, dateFormat;
    switch (groupBy) {
      case 'day':
        groupByClause = 'YEAR(ReworkDate), MONTH(ReworkDate), DAY(ReworkDate)';
        dateFormat = 'CONVERT(varchar, ReworkDate, 23) as DateLabel';
        break;
      case 'week':
        groupByClause = 'YEAR(ReworkDate), DATEPART(week, ReworkDate)';
        dateFormat = 'CAST(YEAR(ReworkDate) AS varchar) + \'-W\' + CAST(DATEPART(week, ReworkDate) AS varchar) as DateLabel';
        break;
      default: // month
        groupByClause = 'YEAR(ReworkDate), MONTH(ReworkDate)';
        dateFormat = 'CAST(YEAR(ReworkDate) AS varchar) + \'-\' + RIGHT(\'0\' + CAST(MONTH(ReworkDate) AS varchar), 2) as DateLabel';
    }
    
    const result = await request.query(`
      SELECT 
        ${dateFormat},
        COUNT(*) as ReworkCount,
        SUM(DefectiveQty) as TotalDefectiveQty,
        SUM(GoodQty) as TotalGoodQty,
        SUM(TotalCost) as TotalCost,
        AVG(CAST(DefectiveQty AS DECIMAL(10,2)) / NULLIF(TotalQty, 0) * 100) as AvgDefectiveRate,
        SUM(ReworkHours) as TotalReworkHours
      FROM ProductionReworkRegister 
      ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY MIN(ReworkDate)
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('获取返工趋势数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取返工趋势数据失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/rework/statistics/hours
 * @desc 获取工时损耗统计数据
 * @access Private
 */
router.get('/statistics/hours', async (req, res) => {
  try {
    const { 
      startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      department,
      workshop,
      responsiblePerson
    } = req.query;
    
    // 获取工时损耗统计数据
    
    const pool = await getConnection();
    
    // 构建WHERE条件
    let whereConditions = ['ReworkDate >= @startDate AND ReworkDate <= @endDate'];
    let parameters = [
      { name: 'startDate', type: sql.Date, value: startDate },
      { name: 'endDate', type: sql.Date, value: endDate }
    ];
    
    if (department) {
      whereConditions.push('ResponsibleDept = @department');
      parameters.push({ name: 'department', type: sql.NVarChar, value: department });
    }
    
    if (workshop) {
      whereConditions.push('Workshop = @workshop');
      parameters.push({ name: 'workshop', type: sql.NVarChar, value: workshop });
    }
    
    if (responsiblePerson) {
      whereConditions.push('ResponsiblePerson = @responsiblePerson');
      parameters.push({ name: 'responsiblePerson', type: sql.NVarChar, value: responsiblePerson });
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    // 获取部门统计
    const deptRequest = pool.request();
    parameters.forEach(param => {
      deptRequest.input(param.name, param.type, param.value);
    });
    
    const deptQuery = `
      SELECT 
        ResponsibleDept as name,
        '部门' as type,
        SUM(CAST(ReworkHours as FLOAT)) as totalHours,
        SUM(CAST(TotalCost as FLOAT)) as totalCost,
        AVG(CAST(TotalCost as FLOAT) / NULLIF(CAST(ReworkHours as FLOAT), 0)) as avgHourlyRate
      FROM ProductionReworkRegister 
      ${whereClause}
      AND ResponsibleDept IS NOT NULL AND ResponsibleDept != ''
      GROUP BY ResponsibleDept
    `;
    
    // 获取车间统计
    const workshopRequest = pool.request();
    parameters.forEach(param => {
      workshopRequest.input(param.name, param.type, param.value);
    });
    
    const workshopQuery = `
      SELECT 
        Workshop as name,
        '车间' as type,
        SUM(CAST(ReworkHours as FLOAT)) as totalHours,
        SUM(CAST(TotalCost as FLOAT)) as totalCost,
        AVG(CAST(TotalCost as FLOAT) / NULLIF(CAST(ReworkHours as FLOAT), 0)) as avgHourlyRate
      FROM ProductionReworkRegister 
      ${whereClause}
      AND Workshop IS NOT NULL AND Workshop != ''
      GROUP BY Workshop
    `;
    
    // 获取人员统计
    const personRequest = pool.request();
    parameters.forEach(param => {
      personRequest.input(param.name, param.type, param.value);
    });
    
    const personQuery = `
      SELECT 
        ResponsiblePerson as name,
        '人员' as type,
        SUM(CAST(ReworkHours as FLOAT)) as totalHours,
        SUM(CAST(TotalCost as FLOAT)) as totalCost,
        AVG(CAST(TotalCost as FLOAT) / NULLIF(CAST(ReworkHours as FLOAT), 0)) as avgHourlyRate
      FROM ProductionReworkRegister 
      ${whereClause}
      AND ResponsiblePerson IS NOT NULL AND ResponsiblePerson != ''
      GROUP BY ResponsiblePerson
    `;
    
    // 获取总计用于计算占比
    const totalRequest = pool.request();
    parameters.forEach(param => {
      totalRequest.input(param.name, param.type, param.value);
    });
    
    const totalQuery = `
      SELECT 
        SUM(CAST(ReworkHours as FLOAT)) as totalHours,
        SUM(CAST(TotalCost as FLOAT)) as totalCost
      FROM ProductionReworkRegister 
      ${whereClause}
    `;
    
    // 执行查询
    const [deptResult, workshopResult, personResult, totalResult] = await Promise.all([
      deptRequest.query(deptQuery),
      workshopRequest.query(workshopQuery),
      personRequest.query(personQuery),
      totalRequest.query(totalQuery)
    ]);
    
    const totalHours = totalResult.recordset[0]?.totalHours || 0;
    const totalCost = totalResult.recordset[0]?.totalCost || 0;
    
    // 合并所有结果并计算占比
    const allData = [
      ...deptResult.recordset,
      ...workshopResult.recordset,
      ...personResult.recordset
    ].map(item => ({
      ...item,
      totalHours: item.totalHours || 0,
      totalCost: item.totalCost || 0,
      avgHourlyRate: item.avgHourlyRate || 0,
      percentage: totalHours > 0 ? (item.totalHours / totalHours) * 100 : 0
    }));
    
    // 按工时降序排序
    allData.sort((a, b) => b.totalHours - a.totalHours);
    
    // 工时损耗统计查询完成
    
    res.json({
      success: true,
      data: allData
    });
    
  } catch (error) {
    console.error('获取工时损耗统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工时损耗统计数据失败',
      error: error.message
    });
  }
});

// =====================================================
// 返工类别和方法管理 API
// =====================================================



/**
 * @route GET /api/rework/categories
 * @desc 获取返工类别列表
 * @access Private
 */
router.get('/categories', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT ID, Name, Description, IsActive, CreatedAt 
      FROM ReworkCategory 
      WHERE IsActive = 1 
      ORDER BY Name
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('获取返工类别失败:', error);
    res.status(500).json({
      success: false,
      message: '获取返工类别失败',
      error: error.message
    });
  }
});



/**
 * @route GET /api/rework/methods
 * @desc 获取返工方法列表
 * @access Private
 */
router.get('/methods', async (req, res) => {
  try {
    const { categoryId } = req.query;
    
    const pool = await getConnection();
    const request = pool.request();
    
    let whereClause = 'WHERE rm.IsActive = 1';
    if (categoryId) {
      whereClause += ' AND rm.CategoryID = @categoryId';
      request.input('categoryId', sql.Int, categoryId);
    }
    
    const result = await request.query(`
      SELECT 
        rm.ID, rm.Name, rm.Description, rm.StandardHours, rm.StandardCost,
        rc.Name as CategoryName
      FROM ReworkMethod rm
      LEFT JOIN ReworkCategory rc ON rm.CategoryID = rc.ID
      ${whereClause}
      ORDER BY rc.Name, rm.Name
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('获取返工方法失败:', error);
    res.status(500).json({
      success: false,
      message: '获取返工方法失败',
      error: error.message
    });
  }
});

/**
 * 批量删除返工记录
 * DELETE /api/rework/batch
 */
// 批量删除接口（DELETE方法）
router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的ID列表'
      });
    }

    const pool = await getConnection();
    const request = pool.request();

    // 构建删除查询
    const placeholders = ids.map((_, index) => `@id${index}`).join(',');
    const query = `DELETE FROM ProductionReworkRegister WHERE ID IN (${placeholders})`;
    
    // 绑定参数
    ids.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, parseInt(id));
    });
    
    await request.query(query);

    res.json({
      success: true,
      message: '批量删除成功'
    });
  } catch (error) {
    console.error('批量删除返工记录失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除返工记录失败',
      error: error.message
    });
  }
});

// 批量删除接口（POST方法）- 与客户投诉页面保持一致
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的ID列表'
      });
    }

    const pool = await getConnection();
    const request = pool.request();

    // 构建删除查询
    const placeholders = ids.map((_, index) => `@id${index}`).join(',');
    const query = `DELETE FROM ProductionReworkRegister WHERE ID IN (${placeholders})`;
    
    // 绑定参数
    ids.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, parseInt(id));
    });
    
    const result = await request.query(query);

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 条返工记录`
    });
  } catch (error) {
    console.error('批量删除返工记录失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除返工记录失败',
      error: error.message
    });
  }
});

// =====================================================
// 质量等级管理 API
// =====================================================

module.exports = router;