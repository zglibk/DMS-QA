/**
 * 客户投诉记录管理路由
 * 功能：提供客户投诉记录的增删改查API接口
 */

const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/complaints');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
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
      cb(new Error('不支持的文件类型'));
    }
  }
});

/**
 * 获取客户投诉记录列表
 * GET /api/customer-complaints
 * 支持分页、搜索和筛选
 */
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const { 
      page = 1, 
      pageSize = 10, 
      search = '', 
      status = '', 
      customerCode = '',
      workOrderNo = '',
      productName = '',
      startDate = '',
      endDate = '',
      // 高级搜索参数
      specification = '',
      complaintMethod = '',
      responsibleDepartment = '',
      responsiblePerson = '',
      feedbackPerson = '',
      processor = '',
      createdBy = '',
      defectQuantityMin = '',
      defectQuantityMax = '',
      defectRateMin = '',
      defectRateMax = '',
      processingDeadlineStart = '',
      processingDeadlineEnd = '',
      replyDateStart = '',
      replyDateEnd = '',
      feedbackDateStart = '',
      feedbackDateEnd = '',
      verificationDateStart = '',
      verificationDateEnd = ''
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    
    // 构建WHERE条件
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(
        CustomerCode LIKE @param${paramIndex} OR 
        WorkOrderNo LIKE @param${paramIndex + 1} OR 
        ProductName LIKE @param${paramIndex + 2} OR 
        ProblemDescription LIKE @param${paramIndex + 3}
      )`);
      params.push(
        { name: `param${paramIndex}`, type: 'NVarChar', value: `%${search}%` },
        { name: `param${paramIndex + 1}`, type: 'NVarChar', value: `%${search}%` },
        { name: `param${paramIndex + 2}`, type: 'NVarChar', value: `%${search}%` },
        { name: `param${paramIndex + 3}`, type: 'NVarChar', value: `%${search}%` }
      );
      paramIndex += 4;
    }
    
    if (status) {
      whereConditions.push(`Status = @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: status });
      paramIndex++;
    }
    
    if (customerCode) {
      whereConditions.push(`CustomerCode = @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: customerCode });
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`Date >= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: startDate });
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`Date <= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: endDate });
      paramIndex++;
    }
    
    // 高级搜索条件
    if (workOrderNo) {
      whereConditions.push(`WorkOrderNo LIKE @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: `%${workOrderNo}%` });
      paramIndex++;
    }
    
    if (productName) {
      whereConditions.push(`ProductName LIKE @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: `%${productName}%` });
      paramIndex++;
    }
    
    if (specification) {
      whereConditions.push(`Specification LIKE @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: `%${specification}%` });
      paramIndex++;
    }
    
    if (complaintMethod) {
      whereConditions.push(`ComplaintMethod = @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: complaintMethod });
      paramIndex++;
    }
    
    if (responsibleDepartment) {
      whereConditions.push(`ResponsibleDepartment LIKE @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: `%${responsibleDepartment}%` });
      paramIndex++;
    }
    
    if (responsiblePerson) {
      whereConditions.push(`ResponsiblePerson LIKE @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: `%${responsiblePerson}%` });
      paramIndex++;
    }
    
    if (feedbackPerson) {
      whereConditions.push(`FeedbackPerson LIKE @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: `%${feedbackPerson}%` });
      paramIndex++;
    }
    
    if (processor) {
      whereConditions.push(`Processor LIKE @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: `%${processor}%` });
      paramIndex++;
    }
    
    if (createdBy) {
      whereConditions.push(`CreatedBy LIKE @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: `%${createdBy}%` });
      paramIndex++;
    }
    
    // 数值范围条件
    if (defectQuantityMin) {
      whereConditions.push(`DefectQuantity >= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Int', value: parseInt(defectQuantityMin) });
      paramIndex++;
    }
    
    if (defectQuantityMax) {
      whereConditions.push(`DefectQuantity <= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Int', value: parseInt(defectQuantityMax) });
      paramIndex++;
    }
    
    if (defectRateMin) {
      whereConditions.push(`DefectRate >= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Decimal', value: parseFloat(defectRateMin) });
      paramIndex++;
    }
    
    if (defectRateMax) {
      whereConditions.push(`DefectRate <= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Decimal', value: parseFloat(defectRateMax) });
      paramIndex++;
    }
    
    // 日期范围条件
    if (processingDeadlineStart) {
      whereConditions.push(`ProcessingDeadline >= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: processingDeadlineStart });
      paramIndex++;
    }
    
    if (processingDeadlineEnd) {
      whereConditions.push(`ProcessingDeadline <= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: processingDeadlineEnd });
      paramIndex++;
    }
    
    if (replyDateStart) {
      whereConditions.push(`ReplyDate >= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: replyDateStart });
      paramIndex++;
    }
    
    if (replyDateEnd) {
      whereConditions.push(`ReplyDate <= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: replyDateEnd });
      paramIndex++;
    }
    
    if (feedbackDateStart) {
      whereConditions.push(`FeedbackDate >= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: feedbackDateStart });
      paramIndex++;
    }
    
    if (feedbackDateEnd) {
      whereConditions.push(`FeedbackDate <= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: feedbackDateEnd });
      paramIndex++;
    }
    
    if (verificationDateStart) {
      whereConditions.push(`VerificationDate >= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: verificationDateStart });
      paramIndex++;
    }
    
    if (verificationDateEnd) {
      whereConditions.push(`VerificationDate <= @param${paramIndex}`);
      params.push({ name: `param${paramIndex}`, type: 'Date', value: verificationDateEnd });
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM CustomerComplaints ${whereClause}`;
    const countRequest = pool.request();
    params.forEach(param => {
      countRequest.input(param.name, sql[param.type], param.value);
    });
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    // 查询数据 - 使用ROW_NUMBER()方式兼容SQL Server 2008 R2
    const startRow = offset + 1;
    const endRow = offset + parseInt(pageSize);
    
    const dataQuery = `
      SELECT * FROM (
        SELECT 
          ID, Date, CustomerCode, WorkOrderNo, ProductName, Specification,
          OrderQuantity, ProblemDescription, DefectQuantity, DefectRate,
          ComplaintMethod, ProcessingDeadline, RequireReport, CauseAnalysis,
          CorrectiveActions, DisposalMeasures, ResponsibleDepartment, ResponsiblePerson,
          ReplyDate, FeedbackPerson, FeedbackDate, Processor, ImprovementVerification,
          VerificationDate, Status, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy,
          ROW_NUMBER() OVER (ORDER BY CreatedAt DESC, ID DESC) AS RowNum
        FROM CustomerComplaints 
        ${whereClause}
      ) AS T
      WHERE T.RowNum BETWEEN @startRow AND @endRow
      ORDER BY T.RowNum
    `;
    
    const dataRequest = pool.request();
    params.forEach(param => {
      dataRequest.input(param.name, sql[param.type], param.value);
    });
    dataRequest.input('startRow', sql.Int, startRow);
    dataRequest.input('endRow', sql.Int, endRow);
    
    const dataResult = await dataRequest.query(dataQuery);
    
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
    console.error('获取客户投诉记录失败:', error);
    res.status(500).json({ success: false, message: '获取客户投诉记录失败', error: error.message });
  }
});

/**
 * 获取单个客户投诉记录详情
 * GET /api/customer-complaints/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const { id } = req.params;
    
    const query = `
      SELECT 
        ID, Date, CustomerCode, WorkOrderNo, ProductName, Specification,
        OrderQuantity, ProblemDescription, ProblemImages, DefectQuantity, DefectRate,
        ComplaintMethod, ProcessingDeadline, RequireReport, CauseAnalysis,
        CorrectiveActions, DisposalMeasures, ResponsibleDepartment, ResponsiblePerson,
        ReplyDate, ReportAttachments, FeedbackPerson, FeedbackDate, Processor, 
        ImprovementVerification, VerificationDate, Status, 
        CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
      FROM CustomerComplaints 
      WHERE ID = @id
    `;
    
    const result = await pool.request()
      .input('id', pool.types.Int, id)
      .query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '客户投诉记录不存在' });
    }
    
    const complaint = result.recordset[0];
    
    // 解析JSON字段
    if (complaint.ProblemImages) {
      try {
        complaint.ProblemImages = JSON.parse(complaint.ProblemImages);
      } catch (e) {
        complaint.ProblemImages = [];
      }
    } else {
      complaint.ProblemImages = [];
    }
    
    if (complaint.ReportAttachments) {
      try {
        complaint.ReportAttachments = JSON.parse(complaint.ReportAttachments);
      } catch (e) {
        complaint.ReportAttachments = [];
      }
    } else {
      complaint.ReportAttachments = [];
    }
    
    res.json({ success: true, data: complaint });
  } catch (error) {
    console.error('获取客户投诉记录详情失败:', error);
    res.status(500).json({ success: false, message: '获取客户投诉记录详情失败', error: error.message });
  }
});

/**
 * 创建客户投诉记录
 * POST /api/customer-complaints
 */
router.post('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const {
      date, customerCode, workOrderNo, productName, specification,
      orderQuantity, problemDescription, problemImages, defectQuantity, defectRate,
      complaintMethod, processingDeadline, requireReport, causeAnalysis,
      correctiveActions, disposalMeasures, responsibleDepartment, responsiblePerson,
      replyDate, reportAttachments, feedbackPerson, feedbackDate, processor,
      improvementVerification, verificationDate, status
    } = req.body;
    
    const currentUser = req.user?.username || '系统用户';
    
    const query = `
      INSERT INTO CustomerComplaints (
        Date, CustomerCode, WorkOrderNo, ProductName, Specification,
        OrderQuantity, ProblemDescription, ProblemImages, DefectQuantity, DefectRate,
        ComplaintMethod, ProcessingDeadline, RequireReport, CauseAnalysis,
        CorrectiveActions, DisposalMeasures, ResponsibleDepartment, ResponsiblePerson,
        ReplyDate, ReportAttachments, FeedbackPerson, FeedbackDate, Processor,
        ImprovementVerification, VerificationDate, Status,
        CreatedBy, UpdatedBy
      ) VALUES (
        @date, @customerCode, @workOrderNo, @productName, @specification,
        @orderQuantity, @problemDescription, @problemImages, @defectQuantity, @defectRate,
        @complaintMethod, @processingDeadline, @requireReport, @causeAnalysis,
        @correctiveActions, @disposalMeasures, @responsibleDepartment, @responsiblePerson,
        @replyDate, @reportAttachments, @feedbackPerson, @feedbackDate, @processor,
        @improvementVerification, @verificationDate, @status,
        @createdBy, @updatedBy
      );
      SELECT SCOPE_IDENTITY() as ID;
    `;
    
    const result = await pool.request()
      .input('date', sql.Date, date)
      .input('customerCode', sql.NVarChar, customerCode)
      .input('workOrderNo', sql.NVarChar, workOrderNo)
      .input('productName', sql.NVarChar, productName)
      .input('specification', sql.NVarChar, specification)
      .input('orderQuantity', sql.Int, orderQuantity || 0)
      .input('problemDescription', sql.NVarChar, problemDescription)
      .input('problemImages', sql.NVarChar, JSON.stringify(problemImages || []))
      .input('defectQuantity', sql.Int, defectQuantity || 0)
      .input('defectRate', sql.Decimal(5, 2), defectRate || 0)
      .input('complaintMethod', sql.NVarChar, complaintMethod)
      .input('processingDeadline', sql.Date, processingDeadline)
      .input('requireReport', sql.Bit, requireReport || false)
      .input('causeAnalysis', sql.NVarChar, causeAnalysis || null)
      .input('correctiveActions', sql.NVarChar, correctiveActions || null)
      .input('disposalMeasures', sql.NVarChar, disposalMeasures || null)
      .input('responsibleDepartment', sql.NVarChar, responsibleDepartment)
      .input('responsiblePerson', sql.NVarChar, responsiblePerson)
      .input('replyDate', sql.Date, replyDate || null)
      .input('reportAttachments', sql.NVarChar, JSON.stringify(reportAttachments || []))
      .input('feedbackPerson', sql.NVarChar, feedbackPerson || null)
      .input('feedbackDate', sql.Date, feedbackDate || null)
      .input('processor', sql.NVarChar, processor || null)
      .input('improvementVerification', sql.NVarChar, improvementVerification || null)
      .input('verificationDate', sql.Date, verificationDate || null)
      .input('status', sql.NVarChar, status || 'pending')
      .input('createdBy', sql.NVarChar, currentUser)
      .input('updatedBy', sql.NVarChar, currentUser)
      .query(query);
    
    const newId = result.recordset[0].ID;
    
    res.json({ success: true, message: '客户投诉记录创建成功', data: { id: newId } });
  } catch (error) {
    console.error('创建客户投诉记录失败:', error);
    res.status(500).json({ success: false, message: '创建客户投诉记录失败', error: error.message });
  }
});

/**
 * 更新客户投诉记录
 * PUT /api/customer-complaints/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const { id } = req.params;
    const {
      date, customerCode, workOrderNo, productName, specification,
      orderQuantity, problemDescription, problemImages, defectQuantity, defectRate,
      complaintMethod, processingDeadline, requireReport, causeAnalysis,
      correctiveActions, disposalMeasures, responsibleDepartment, responsiblePerson,
      replyDate, reportAttachments, feedbackPerson, feedbackDate, processor,
      improvementVerification, verificationDate, status
    } = req.body;
    
    const currentUser = req.user?.username || '系统用户';
    
    const query = `
      UPDATE CustomerComplaints SET
        Date = @date,
        CustomerCode = @customerCode,
        WorkOrderNo = @workOrderNo,
        ProductName = @productName,
        Specification = @specification,
        OrderQuantity = @orderQuantity,
        ProblemDescription = @problemDescription,
        ProblemImages = @problemImages,
        DefectQuantity = @defectQuantity,
        DefectRate = @defectRate,
        ComplaintMethod = @complaintMethod,
        ProcessingDeadline = @processingDeadline,
        RequireReport = @requireReport,
        CauseAnalysis = @causeAnalysis,
        CorrectiveActions = @correctiveActions,
        DisposalMeasures = @disposalMeasures,
        ResponsibleDepartment = @responsibleDepartment,
        ResponsiblePerson = @responsiblePerson,
        ReplyDate = @replyDate,
        ReportAttachments = @reportAttachments,
        FeedbackPerson = @feedbackPerson,
        FeedbackDate = @feedbackDate,
        Processor = @processor,
        ImprovementVerification = @improvementVerification,
        VerificationDate = @verificationDate,
        Status = @status,
        UpdatedAt = GETDATE(),
        UpdatedBy = @updatedBy
      WHERE ID = @id
    `;
    
    const result = await pool.request()
      .input('id', pool.types.Int, id)
      .input('date', pool.types.Date, date)
      .input('customerCode', pool.types.NVarChar, customerCode)
      .input('workOrderNo', pool.types.NVarChar, workOrderNo)
      .input('productName', pool.types.NVarChar, productName)
      .input('specification', pool.types.NVarChar, specification)
      .input('orderQuantity', pool.types.Int, orderQuantity || 0)
      .input('problemDescription', pool.types.NVarChar, problemDescription)
      .input('problemImages', pool.types.NVarChar, JSON.stringify(problemImages || []))
      .input('defectQuantity', pool.types.Int, defectQuantity || 0)
      .input('defectRate', pool.types.Decimal(5, 2), defectRate || 0)
      .input('complaintMethod', pool.types.NVarChar, complaintMethod)
      .input('processingDeadline', pool.types.Date, processingDeadline)
      .input('requireReport', pool.types.Bit, requireReport || false)
      .input('causeAnalysis', pool.types.NVarChar, causeAnalysis || null)
      .input('correctiveActions', pool.types.NVarChar, correctiveActions || null)
      .input('disposalMeasures', pool.types.NVarChar, disposalMeasures || null)
      .input('responsibleDepartment', pool.types.NVarChar, responsibleDepartment)
      .input('responsiblePerson', pool.types.NVarChar, responsiblePerson)
      .input('replyDate', pool.types.Date, replyDate || null)
      .input('reportAttachments', pool.types.NVarChar, JSON.stringify(reportAttachments || []))
      .input('feedbackPerson', pool.types.NVarChar, feedbackPerson || null)
      .input('feedbackDate', pool.types.Date, feedbackDate || null)
      .input('processor', pool.types.NVarChar, processor || null)
      .input('improvementVerification', pool.types.NVarChar, improvementVerification || null)
      .input('verificationDate', pool.types.Date, verificationDate || null)
      .input('status', pool.types.NVarChar, status || 'pending')
      .input('updatedBy', pool.types.NVarChar, currentUser)
      .query(query);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: '客户投诉记录不存在' });
    }
    
    res.json({ success: true, message: '客户投诉记录更新成功' });
  } catch (error) {
    console.error('更新客户投诉记录失败:', error);
    res.status(500).json({ success: false, message: '更新客户投诉记录失败', error: error.message });
  }
});

/**
 * 删除客户投诉记录
 * DELETE /api/customer-complaints/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const { id } = req.params;
    
    const query = 'DELETE FROM CustomerComplaints WHERE ID = @id';
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(query);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: '客户投诉记录不存在' });
    }
    
    res.json({ success: true, message: '客户投诉记录删除成功' });
  } catch (error) {
    console.error('删除客户投诉记录失败:', error);
    res.status(500).json({ success: false, message: '删除客户投诉记录失败', error: error.message });
  }
});

/**
 * 批量导出客户投诉记录
 * POST /api/customer-complaints/export
 */
router.post('/export', async (req, res) => {
  try {
    const { ids, format = 'excel' } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请提供要导出的记录ID列表' });
    }
    
    const pool = await getConnection();
    
    // 构建查询SQL语句
    const placeholders = ids.map((_, index) => `@id${index}`).join(',');
    const query = `
      SELECT 
        ID, Date, CustomerCode, WorkOrderNo, ProductName, Specification,
        OrderQuantity, ProblemDescription, DefectQuantity, DefectRate,
        ComplaintMethod, ProcessingDeadline, Status, ResponsibleDepartment,
        ResponsiblePerson, ReplyDate, FeedbackPerson, FeedbackDate,
        Processor, VerificationDate, CreatedBy, CreatedAt, UpdatedAt
      FROM CustomerComplaints 
      WHERE ID IN (${placeholders})
      ORDER BY CreatedAt DESC
    `;
    
    const request = pool.request();
     ids.forEach((id, index) => {
       request.input(`id${index}`, require('mssql').Int, parseInt(id));
     });
    
    const result = await request.query(query);
    
    if (format === 'excel') {
      // 简化的CSV格式导出（实际项目中可以使用xlsx库）
      const headers = [
        'ID', '日期', '客户编号', '工单号', '品名', '规格',
        '订单数', '问题描述', '不良数', '不良比例', '投诉方式',
        '处理时限', '状态', '责任部门', '责任人', '回复日期',
        '反馈人', '反馈日期', '处理人', '验证日期', '创建人',
        '创建时间', '更新时间'
      ];
      
      let csvContent = headers.join(',') + '\n';
      
      result.recordset.forEach(row => {
         const values = [
           row.ID, row.Date, row.CustomerCode, row.WorkOrderNo,
           row.ProductName, row.Specification, row.OrderQuantity,
           `"${row.ProblemDescription || ''}"`, row.DefectQuantity,
           row.DefectRate, row.ComplaintMethod, row.ProcessingDeadline,
           row.Status, row.ResponsibleDepartment, row.ResponsiblePerson,
           row.ReplyDate, row.FeedbackPerson, row.FeedbackDate,
           row.Processor, row.VerificationDate, row.CreatedBy,
           row.CreatedAt, row.UpdatedAt
         ];
         csvContent += values.join(',') + '\n';
       });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="customer-complaints-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csvContent);
    } else {
      res.json({ success: true, data: result.recordset });
    }
  } catch (error) {
    console.error('批量导出客户投诉记录失败:', error);
    res.status(500).json({ success: false, message: '批量导出失败' });
  }
});

/**
 * 文件上传接口
 * POST /api/customer-complaints/upload
 */
router.post('/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }
    
    const fileInfos = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/complaints/${file.filename}`
    }));
    
    res.json({ success: true, message: '文件上传成功', data: fileInfos });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ success: false, message: '文件上传失败', error: error.message });
  }
});

/**
 * 获取统计数据
 * GET /api/customer-complaints/statistics
 */
router.get('/statistics/overview', async (req, res) => {
  try {
    const pool = await getConnection();
    
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN Status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN Status = 'closed' THEN 1 ELSE 0 END) as closed,
        AVG(CAST(DefectRate as FLOAT)) as avgDefectRate,
        SUM(DefectQuantity) as totalDefects
      FROM CustomerComplaints
    `;
    
    const result = await pool.request().query(query);
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败', error: error.message });
  }
});

module.exports = router;