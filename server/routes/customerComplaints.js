/**
 * 客户投诉记录管理路由
 * 功能：提供客户投诉记录的增删改查API接口
 */

const express = require('express');
const router = express.Router();
const { getConnection, sql, executeQuery } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const customerComplaintDir = path.join(__dirname, '../uploads/customer-complaint');

// 确保客诉目录存在
if (!fs.existsSync(customerComplaintDir)) {
  fs.mkdirSync(customerComplaintDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, customerComplaintDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳-随机字符串.扩展名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    
    // 处理中文文件名编码问题
    let originalName;
    try {
      // 尝试解码文件名，处理中文字符
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      originalName = path.parse(originalName).name;
    } catch (error) {
      // 如果解码失败，使用原始文件名
      originalName = path.parse(file.originalname).name;
    }
    
    // 为了确保文件名唯一性，始终添加时间戳和随机字符串
    let finalName;
    if (originalName === 'image' || /[^\x00-\x7F]/.test(originalName)) {
      // 对于默认的image文件名或包含非ASCII字符的文件名，使用时间戳和随机字符串
      finalName = `file_${timestamp}_${randomStr}`;
    } else {
      // 对于其他文件名，保留原名但添加时间戳确保唯一性
      finalName = `${originalName}_${timestamp}_${randomStr}`;
    }
    
    const extension = path.extname(file.originalname); // 获取扩展名
    cb(null, `${finalName}${extension}`);
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
    
    const result = await executeQuery(async (pool) => {
    
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
    
    // 创建统一的request对象
    const request = pool.request();
    
    // 添加所有参数
    params.forEach(param => {
      request.input(param.name, sql[param.type], param.value);
    });
    
    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM CustomerComplaints ${whereClause}`;
    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    // 查询数据 - 使用ROW_NUMBER()方式兼容SQL Server 2008 R2
    const startRow = offset + 1;
    const endRow = offset + parseInt(pageSize);
    
    // 为分页查询添加额外参数
    request.input('startRow', sql.Int, startRow);
    request.input('endRow', sql.Int, endRow);

    const dataQuery = `
      SELECT * FROM (
        SELECT 
          ID, Date, CustomerCode, WorkOrderNo, ProductName, Specification,
          OrderQuantity, ProblemDescription, ProblemImages, DefectQuantity, DefectRate,
          ComplaintMethod, ComplaintType, ProcessingDeadline, RequireReport, CauseAnalysis,
          CorrectiveActions, DisposalMeasures, ResponsibleDepartment, ResponsiblePerson,
          ReplyDate, ReportAttachments, FeedbackPerson, FeedbackDate, Processor, ImprovementVerification,
          VerificationDate, Status, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy,
          QualityPenalty, ReworkCost, CustomerCompensation, QualityLossCost,
          InspectionCost, TransportationCost, PreventionCost, TotalQualityCost, CostRemarks,
          ROW_NUMBER() OVER (ORDER BY CreatedAt DESC, ID DESC) AS RowNum
        FROM CustomerComplaints 
        ${whereClause}
      ) AS T
      WHERE T.RowNum BETWEEN @startRow AND @endRow
      ORDER BY T.RowNum
    `;

    const dataResult = await request.query(dataQuery);
    
    // 处理JSON字段解析
    const processedData = dataResult.recordset.map(record => {
      // 解析问题图片JSON字段
      if (record.ProblemImages) {
        try {
          record.ProblemImages = JSON.parse(record.ProblemImages);
        } catch (e) {
          record.ProblemImages = [];
        }
      } else {
        record.ProblemImages = [];
      }
      
      // 解析报告附件JSON字段
      if (record.ReportAttachments) {
        try {
          record.ReportAttachments = JSON.parse(record.ReportAttachments);
        } catch (e) {
          record.ReportAttachments = [];
        }
      } else {
        record.ReportAttachments = [];
      }
      
      return record;
    });
    
      return {
        success: true,
        data: processedData,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(pageSize),
          total: total,
          pages: Math.ceil(total / pageSize)
        }
      };
    });

    if (result) {
      res.json(result);
    } else {
      // executeQuery返回null时的默认处理
      res.json({
        success: true,
        data: [],
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(pageSize),
          total: 0,
          pages: 0
        }
      });
    }
  } catch (error) {
    console.error('获取客户投诉记录失败:', error);
    res.status(500).json({ success: false, message: '获取客户投诉记录失败', error: error.message });
  }
});

/**
 * 获取投诉类型选项
 * GET /api/customer-complaints/complaint-types
 */
router.get('/complaint-types', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      const query = `
        SELECT Name 
        FROM CustomerComplaintType 
        ORDER BY Name
      `;
      
      const queryResult = await pool.request().query(query);
      return queryResult.recordset;
    });
    
    // 返回包含Name字段的对象数组
    res.json({
      success: true,
      data: result,
      message: '获取投诉类型选项成功'
    });
  } catch (error) {
    console.error('获取投诉类型选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取投诉类型选项失败',
      error: error.message
    });
  }
});

/**
 * 获取部门列表
 * GET /api/customer-complaints/departments
 * 功能：获取所有部门信息，支持级联选择
 */
router.get('/departments', async (req, res) => {
  console.log('开始获取部门列表...');
  try {
    const result = await executeQuery(async (pool) => {
      console.log('连接池获取成功，开始执行查询...');
      const query = `
        SELECT ID, Name, ParentID
        FROM Department 
        ORDER BY Name
      `;
      console.log('执行SQL查询:', query);
      
      const queryResult = await pool.request().query(query);
      console.log('查询结果:', queryResult.recordset?.length || 0, '条记录');
      return queryResult.recordset;
    });
    
    console.log('部门列表获取成功');
    res.json({
      success: true,
      data: result || [],
      message: '获取部门列表成功'
    });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '获取部门列表失败',
      error: error.message
    });
  }
});

/**
 * 根据部门获取人员列表
 * GET /api/customer-complaints/persons/:departmentId
 * 功能：根据部门ID获取该部门下的所有人员
 */
router.get('/persons/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      const query = `
        SELECT ID, Name, DepartmentID
        FROM Person 
        WHERE DepartmentID = @departmentId
        ORDER BY Name
      `;
      
      request.input('departmentId', sql.Int, departmentId);
      const queryResult = await request.query(query);
      return queryResult.recordset;
    });
    
    res.json({
      success: true,
      data: result,
      message: '获取人员列表成功'
    });
  } catch (error) {
    console.error('获取人员列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取人员列表失败',
      error: error.message
    });
  }
});

/**
 * 获取客户选项
 * GET /api/customer-complaints/customers
 * 功能：获取所有客户信息用于筛选
 */
router.get('/customers', async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      const query = `
        SELECT DISTINCT 
          CustomerCode as id,
          CustomerCode as name
        FROM CustomerComplaints 
        WHERE CustomerCode IS NOT NULL AND CustomerCode != ''
        ORDER BY CustomerCode
      `;
      
      const queryResult = await request.query(query);
      return queryResult;
    });
    
    // 检查executeQuery是否返回null（数据库连接失败）
    if (!result) {
      console.error('获取客户选项失败: executeQuery返回null，可能是数据库连接问题');
      return res.json({ success: true, data: [] }); // 返回空数组而不是错误
    }
    
    res.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('获取客户选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取客户选项失败',
      error: error.message
    });
  }
});

/**
 * 获取质量成本统计数据
 * GET /api/customer-complaints/cost-statistics
 * 功能：提供质量成本的多维度统计分析
 */
router.get('/cost-statistics', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      dimension = 'month',
      customerId,
      page = 1,
      pageSize = 20
    } = req.query;

    // 确保page和pageSize是有效的数字
    const validPage = Math.max(1, parseInt(page) || 1);
    const validPageSize = Math.max(1, Math.min(100, parseInt(pageSize) || 20));
    const offset = (validPage - 1) * validPageSize;

    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      
      // 构建基础查询条件
      let whereConditions = ['1=1'];
      
      if (startDate) {
        whereConditions.push('Date >= @startDate');
        request.input('startDate', sql.Date, startDate);
      }
      
      if (endDate) {
        whereConditions.push('Date <= @endDate');
        request.input('endDate', sql.Date, endDate);
      }
      
      if (customerId) {
        whereConditions.push('CustomerCode = @customerId');
        request.input('customerId', sql.NVarChar, customerId);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // 获取概览数据
      const overviewQuery = `
        SELECT 
          ISNULL(SUM(TotalQualityCost), 0) as totalCost,
          ISNULL(SUM(QualityPenalty), 0) as penaltyCost,
          ISNULL(SUM(CustomerCompensation), 0) as compensationCost,
          ISNULL(SUM(ReworkCost), 0) as reworkCost,
          COUNT(*) as totalComplaints
        FROM CustomerComplaints 
        WHERE ${whereClause}
      `;
      
      const overviewResult = await request.query(overviewQuery);
      const overview = overviewResult.recordset[0];
      
      // 计算趋势（与上期对比）
      let trendQuery = '';
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
        
        const prevStartDate = new Date(startDateObj);
        prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
        const prevEndDate = new Date(startDateObj);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        
        request.input('prevStartDate', sql.Date, prevStartDate.toISOString().slice(0, 10));
        request.input('prevEndDate', sql.Date, prevEndDate.toISOString().slice(0, 10));
        
        trendQuery = `
          SELECT ISNULL(SUM(TotalQualityCost), 0) as prevTotalCost
          FROM CustomerComplaints 
          WHERE Date >= @prevStartDate AND Date <= @prevEndDate
          ${customerId ? 'AND CustomerCode = @customerId' : ''}
        `;
        
        const trendResult = await request.query(trendQuery);
        const prevTotalCost = trendResult.recordset[0].prevTotalCost;
        
        if (prevTotalCost > 0) {
          const trendValue = ((overview.totalCost - prevTotalCost) / prevTotalCost * 100);
          overview.totalTrend = isNaN(trendValue) ? 0 : parseFloat(trendValue.toFixed(1));
        } else {
          overview.totalTrend = 0;
        }
      } else {
        overview.totalTrend = 0;
      }
      
      // 获取趋势数据
      let periodFormat = '';
      switch (dimension) {
        case 'month':
          periodFormat = "CONVERT(VARCHAR(7), Date, 120)";
          break;
        case 'quarter':
          periodFormat = "CAST(YEAR(Date) AS VARCHAR) + '-Q' + CAST(DATEPART(QUARTER, Date) AS VARCHAR)";
          break;
        case 'year':
          periodFormat = "YEAR(Date)";
          break;
        default:
          periodFormat = "CONVERT(VARCHAR(7), Date, 120)";
      }
      
      const trendDataQuery = `
        SELECT 
          ${periodFormat} as period,
          ISNULL(SUM(QualityPenalty), 0) as qualityPenalty,
          ISNULL(SUM(ReworkCost), 0) as reworkCost,
          ISNULL(SUM(CustomerCompensation), 0) as customerCompensation,
          ISNULL(SUM(TotalQualityCost), 0) as totalCost
        FROM CustomerComplaints 
        WHERE ${whereClause}
        GROUP BY ${periodFormat}
        ORDER BY ${periodFormat}
      `;
      
      const trendDataResult = await request.query(trendDataQuery);
      
      // 获取成本构成数据
      const compositionQuery = `
        SELECT 
          '质量罚款' as name, ISNULL(SUM(QualityPenalty), 0) as value
        FROM CustomerComplaints WHERE ${whereClause}
        UNION ALL
        SELECT 
          '返工成本' as name, ISNULL(SUM(ReworkCost), 0) as value
        FROM CustomerComplaints WHERE ${whereClause}
        UNION ALL
        SELECT 
          '客户赔偿' as name, ISNULL(SUM(CustomerCompensation), 0) as value
        FROM CustomerComplaints WHERE ${whereClause}
        UNION ALL
        SELECT 
          '质量损失' as name, ISNULL(SUM(QualityLossCost), 0) as value
        FROM CustomerComplaints WHERE ${whereClause}
        UNION ALL
        SELECT 
          '检验成本' as name, ISNULL(SUM(InspectionCost), 0) as value
        FROM CustomerComplaints WHERE ${whereClause}
        UNION ALL
        SELECT 
          '运输成本' as name, ISNULL(SUM(TransportationCost), 0) as value
        FROM CustomerComplaints WHERE ${whereClause}
        UNION ALL
        SELECT 
          '预防成本' as name, ISNULL(SUM(PreventionCost), 0) as value
        FROM CustomerComplaints WHERE ${whereClause}
      `;
      
      const compositionResult = await request.query(compositionQuery);
      const costComposition = compositionResult.recordset.filter(item => item.value > 0);
      
      // 获取客户排行数据
      const customerRankingQuery = `
        SELECT TOP 10
          CustomerCode as customerName,
          ISNULL(SUM(TotalQualityCost), 0) as totalCost,
          COUNT(*) as complaintCount
        FROM CustomerComplaints 
        WHERE ${whereClause} AND CustomerCode IS NOT NULL AND CustomerCode != ''
        GROUP BY CustomerCode
        ORDER BY SUM(TotalQualityCost) DESC
      `;
      
      const customerRankingResult = await request.query(customerRankingQuery);
      
      // 获取详细统计数据（分页）
      request.input('offset', sql.Int, offset);
      request.input('pageSize', sql.Int, validPageSize);
      
      const statisticsQuery = `
        SELECT 
          ${periodFormat} as period,
          CustomerCode as customerName,
          COUNT(*) as complaintCount,
          ISNULL(SUM(QualityPenalty), 0) as qualityPenalty,
          ISNULL(SUM(ReworkCost), 0) as reworkCost,
          ISNULL(SUM(CustomerCompensation), 0) as customerCompensation,
          ISNULL(SUM(QualityLossCost), 0) as qualityLossCost,
          ISNULL(SUM(InspectionCost), 0) as inspectionCost,
          ISNULL(SUM(TransportationCost), 0) as transportationCost,
          ISNULL(SUM(PreventionCost), 0) as preventionCost,
          ISNULL(SUM(TotalQualityCost), 0) as totalCost
        FROM CustomerComplaints 
        WHERE ${whereClause}
        GROUP BY ${periodFormat}, CustomerCode
        ORDER BY SUM(TotalQualityCost) DESC
      `;
      
      const statisticsResult = await request.query(statisticsQuery);
      
      // 获取总记录数
      const countQuery = `
        SELECT COUNT(DISTINCT (${periodFormat} + '-' + CustomerCode)) as total
        FROM CustomerComplaints 
        WHERE ${whereClause}
      `;
      
      const countResult = await request.query(countQuery);
      
      return {
        overview,
        trendData: trendDataResult.recordset,
        costComposition,
        customerRanking: customerRankingResult.recordset,
        statistics: statisticsResult.recordset,
        total: countResult.recordset[0].total
      };
    });
    
    // 检查executeQuery是否返回null（数据库连接失败）
    if (!result) {
      console.error('获取质量成本统计数据失败: executeQuery返回null，可能是数据库连接问题');
      return res.json({ 
        success: true, 
        data: {
          overview: { totalCost: 0, totalComplaints: 0, avgCostPerComplaint: 0 },
          trendData: [],
          costComposition: [],
          customerRanking: [],
          statistics: [],
          total: 0
        }
      });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取质量成本统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取质量成本统计数据失败', error: error.message });
  }
});

/**
 * 导出质量成本统计数据
 * GET /api/customer-complaints/cost-statistics/export
 * 功能：导出质量成本统计数据为Excel文件
 */
router.get('/cost-statistics/export', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      dimension = 'month',
      customerId
    } = req.query;

    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      
      // 构建查询条件
      let whereConditions = ['1=1'];
      
      if (startDate) {
        whereConditions.push('Date >= @startDate');
        request.input('startDate', sql.Date, startDate);
      }
      
      if (endDate) {
        whereConditions.push('Date <= @endDate');
        request.input('endDate', sql.Date, endDate);
      }
      
      if (customerId) {
        whereConditions.push('CustomerCode = @customerId');
        request.input('customerId', sql.NVarChar, customerId);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // 获取详细数据用于导出
      let periodFormat = '';
      switch (dimension) {
        case 'month':
          periodFormat = "CONVERT(VARCHAR(7), Date, 120)";
          break;
        case 'quarter':
          periodFormat = "CAST(YEAR(Date) AS VARCHAR) + '-Q' + CAST(DATEPART(QUARTER, Date) AS VARCHAR)";
          break;
        case 'year':
          periodFormat = "YEAR(Date)";
          break;
        default:
          periodFormat = "CONVERT(VARCHAR(7), Date, 120)";
      }
      
      const exportQuery = `
        SELECT 
          ${periodFormat} as 统计期间,
          CustomerCode as 客户名称,
          COUNT(*) as 投诉数量,
          ISNULL(SUM(QualityPenalty), 0) as 质量罚款,
          ISNULL(SUM(ReworkCost), 0) as 返工成本,
          ISNULL(SUM(CustomerCompensation), 0) as 客户赔偿,
          ISNULL(SUM(QualityLossCost), 0) as 质量损失成本,
          ISNULL(SUM(InspectionCost), 0) as 检验成本,
          ISNULL(SUM(TransportationCost), 0) as 运输成本,
          ISNULL(SUM(PreventionCost), 0) as 预防成本,
          ISNULL(SUM(TotalQualityCost), 0) as 总质量成本
        FROM CustomerComplaints 
        WHERE ${whereClause}
        GROUP BY ${periodFormat}, CustomerCode
        ORDER BY SUM(TotalQualityCost) DESC
      `;
      
      const queryResult = await request.query(exportQuery);
      return queryResult.recordset;
    });
    
    // 使用简单的CSV格式导出（可以后续升级为Excel）
    const csvHeader = '统计期间,客户名称,投诉数量,质量罚款,返工成本,客户赔偿,质量损失成本,检验成本,运输成本,预防成本,总质量成本\n';
    const csvData = result.map(row => {
      return `${row.统计期间},${row.客户名称},${row.投诉数量},${row.质量罚款},${row.返工成本},${row.客户赔偿},${row.质量损失成本},${row.检验成本},${row.运输成本},${row.预防成本},${row.总质量成本}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvData;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="质量成本统计_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csvContent); // 添加BOM以支持中文
  } catch (error) {
    console.error('导出质量成本统计数据失败:', error);
    res.status(500).json({ success: false, message: '导出质量成本统计数据失败', error: error.message });
  }
});

/**
 * 获取单个客户投诉记录详情
 * GET /api/customer-complaints/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证ID参数
    const validId = parseInt(id);
    if (isNaN(validId) || validId <= 0) {
      return res.status(400).json({ success: false, message: '无效的ID参数' });
    }
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      const query = `
        SELECT 
          ID, Date, CustomerCode, WorkOrderNo, ProductName, Specification,
          OrderQuantity, ProblemDescription, ProblemImages, DefectQuantity, DefectRate,
          ComplaintMethod, ComplaintType, ProcessingDeadline, RequireReport, CauseAnalysis,
          CorrectiveActions, DisposalMeasures, ResponsibleDepartment, ResponsiblePerson,
          ReplyDate, ReportAttachments, FeedbackPerson, FeedbackDate, Processor, 
          ImprovementVerification, VerificationDate, Status, 
          CreatedAt, CreatedBy, UpdatedAt, UpdatedBy,
          QualityPenalty, ReworkCost, CustomerCompensation, QualityLossCost,
          InspectionCost, TransportationCost, PreventionCost, TotalQualityCost, CostRemarks
        FROM CustomerComplaints 
        WHERE ID = @id
      `;
      
      request.input('id', sql.Int, validId);
      const queryResult = await request.query(query);
      
      return queryResult;
    });
    
    if (!result || result.recordset.length === 0) {
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
    const {
      date, customerCode, workOrderNo, productName, specification,
      orderQuantity, problemDescription, problemImages, defectQuantity, defectRate,
      complaintMethod, complaintType, processingDeadline, requireReport, causeAnalysis,
      correctiveActions, disposalMeasures, responsibleDepartment, responsiblePerson,
      replyDate, reportAttachments, feedbackPerson, feedbackDate, processor,
      improvementVerification, verificationDate, status,
      // 质量成本相关字段
      qualityPenalty, reworkCost, customerCompensation, qualityLossCost,
      inspectionCost, transportationCost, preventionCost, totalQualityCost, costRemarks
    } = req.body;
    
    const currentUser = req.user?.username || '系统用户';
    
    // 调试日志：查看responsibleDepartment的值和类型
    console.log('DEBUG - responsibleDepartment:', responsibleDepartment, 'type:', typeof responsibleDepartment);
    console.log('DEBUG - responsiblePerson:', responsiblePerson, 'type:', typeof responsiblePerson);
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      const query = `
        INSERT INTO CustomerComplaints (
          Date, CustomerCode, WorkOrderNo, ProductName, Specification,
          OrderQuantity, ProblemDescription, ProblemImages, DefectQuantity, DefectRate,
          ComplaintMethod, ComplaintType, ProcessingDeadline, RequireReport, CauseAnalysis,
          CorrectiveActions, DisposalMeasures, ResponsibleDepartment, ResponsiblePerson,
          ReplyDate, ReportAttachments, FeedbackPerson, FeedbackDate, Processor,
          ImprovementVerification, VerificationDate, Status,
          QualityPenalty, ReworkCost, CustomerCompensation, QualityLossCost,
          InspectionCost, TransportationCost, PreventionCost, CostRemarks,
          CreatedBy, UpdatedBy
        ) VALUES (
          @date, @customerCode, @workOrderNo, @productName, @specification,
          @orderQuantity, @problemDescription, @problemImages, @defectQuantity, @defectRate,
          @complaintMethod, @complaintType, @processingDeadline, @requireReport, @causeAnalysis,
          @correctiveActions, @disposalMeasures, @responsibleDepartment, @responsiblePerson,
          @replyDate, @reportAttachments, @feedbackPerson, @feedbackDate, @processor,
          @improvementVerification, @verificationDate, @status,
          @qualityPenalty, @reworkCost, @customerCompensation, @qualityLossCost,
          @inspectionCost, @transportationCost, @preventionCost, @costRemarks,
          @createdBy, @updatedBy
        );
        SELECT SCOPE_IDENTITY() as ID;
      `;
      
      request.input('date', sql.Date, date);
      request.input('customerCode', sql.NVarChar, customerCode);
      request.input('workOrderNo', sql.NVarChar, workOrderNo);
      request.input('productName', sql.NVarChar, productName);
      request.input('specification', sql.NVarChar, specification);
      request.input('orderQuantity', sql.Int, orderQuantity || 0);
      request.input('problemDescription', sql.NVarChar, problemDescription);
      request.input('problemImages', sql.NVarChar, JSON.stringify(problemImages || []));
      request.input('defectQuantity', sql.Int, defectQuantity || 0);
      request.input('defectRate', sql.Decimal(5, 2), defectRate || 0);
      request.input('complaintMethod', sql.NVarChar, complaintMethod);
      request.input('complaintType', sql.NVarChar, complaintType || null);
      request.input('processingDeadline', sql.Date, processingDeadline || null);
      request.input('requireReport', sql.Bit, requireReport || false);
      request.input('causeAnalysis', sql.NVarChar, causeAnalysis || null);
      request.input('correctiveActions', sql.NVarChar, correctiveActions || null);
      request.input('disposalMeasures', sql.NVarChar, disposalMeasures || null);
      request.input('responsibleDepartment', sql.NVarChar, responsibleDepartment ? String(responsibleDepartment) : null);
      request.input('responsiblePerson', sql.NVarChar, responsiblePerson ? String(responsiblePerson) : null);
      request.input('replyDate', sql.Date, replyDate || null);
      request.input('reportAttachments', sql.NVarChar, JSON.stringify(reportAttachments || []));
      request.input('feedbackPerson', sql.NVarChar, feedbackPerson ? String(feedbackPerson) : null);
      request.input('feedbackDate', sql.Date, feedbackDate || null);
      request.input('processor', sql.NVarChar, processor ? String(processor) : null);
      request.input('improvementVerification', sql.NVarChar, improvementVerification || null);
      request.input('verificationDate', sql.Date, verificationDate || null);
      request.input('status', sql.NVarChar, status || 'pending');
      // 质量成本字段参数绑定
      request.input('qualityPenalty', sql.Decimal(10, 2), qualityPenalty || 0);
      request.input('reworkCost', sql.Decimal(10, 2), reworkCost || 0);
      request.input('customerCompensation', sql.Decimal(10, 2), customerCompensation || 0);
      request.input('qualityLossCost', sql.Decimal(10, 2), qualityLossCost || 0);
      request.input('inspectionCost', sql.Decimal(10, 2), inspectionCost || 0);
      request.input('transportationCost', sql.Decimal(10, 2), transportationCost || 0);
      request.input('preventionCost', sql.Decimal(10, 2), preventionCost || 0);
      // TotalQualityCost是计算列，不需要手动插入
      // request.input('totalQualityCost', sql.Decimal(10, 2), totalQualityCost || 0);
      request.input('costRemarks', sql.NVarChar, costRemarks || null);
      request.input('createdBy', sql.NVarChar, currentUser);
      request.input('updatedBy', sql.NVarChar, currentUser);
      
      const queryResult = await request.query(query);
      
      return queryResult;
    });
    
    if (result && result.recordset && result.recordset.length > 0) {
      const newId = result.recordset[0].ID;
      res.json({ success: true, message: '客户投诉记录创建成功', data: { id: newId } });
    } else {
      res.status(500).json({ success: false, message: '创建客户投诉记录失败' });
    }
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
    const { id } = req.params;
    
    // 验证ID参数是否为有效数字
    const validId = parseInt(id);
    if (isNaN(validId) || validId <= 0) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }
    const {
      date, customerCode, workOrderNo, productName, specification,
      orderQuantity, problemDescription, problemImages, defectQuantity, defectRate,
      complaintMethod, complaintType, processingDeadline, requireReport, causeAnalysis,
      correctiveActions, disposalMeasures, responsibleDepartment, responsiblePerson,
      replyDate, reportAttachments, feedbackPerson, feedbackDate, processor,
      improvementVerification, verificationDate, status,
      // 质量成本相关字段
      qualityPenalty, reworkCost, customerCompensation, qualityLossCost,
      inspectionCost, transportationCost, preventionCost, totalQualityCost, costRemarks,
      removedFiles  // 接收前端传递的被删除文件列表
    } = req.body;
    
    console.log('更新接收到的数据:', req.body);
    console.log('更新图片数据:', problemImages);
    console.log('被删除的文件:', removedFiles);
    console.log('责任部门字段值:', responsibleDepartment, '类型:', typeof responsibleDepartment);
    console.log('责任人字段值:', responsiblePerson, '类型:', typeof responsiblePerson);
    
    const currentUser = req.user?.username || '系统用户';
    
    const result = await executeQuery(async (pool) => {
      // 检查记录是否存在并获取原有图片数据
      const checkRequest = pool.request();
      checkRequest.input('checkId', sql.Int, validId);
      const checkResult = await checkRequest.query('SELECT ProblemImages FROM CustomerComplaints WHERE ID = @checkId');
      
      if (checkResult.recordset.length === 0) {
        throw new Error('客户投诉记录不存在');
      }
      
      // 处理被删除的文件 - 删除物理文件
      // 只在编辑模式下且确实有文件需要删除时才执行删除操作
      if (removedFiles && Array.isArray(removedFiles) && removedFiles.length > 0) {
        console.log('开始删除被标记的文件:', removedFiles.length, '个文件');
        
        for (const removedFile of removedFiles) {
          try {
            // 确保removedFile有filename属性且不为空
            if (!removedFile.filename) {
              console.log('跳过无效的删除文件项:', removedFile);
              continue;
            }
            
            // 构建文件的完整路径
            const filePath = path.join(__dirname, '../uploads/customer-complaint', removedFile.filename);
            
            // 检查文件是否存在
            if (fs.existsSync(filePath)) {
              // 删除物理文件
              fs.unlinkSync(filePath);
              console.log('成功删除文件:', removedFile.filename);
            } else {
              console.log('文件不存在，跳过删除:', removedFile.filename);
            }
          } catch (deleteError) {
            console.error('删除文件失败:', removedFile.filename, deleteError.message);
            // 继续处理其他文件，不中断整个更新流程
          }
        }
      }
      
      const request = pool.request();
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
          ComplaintType = @complaintType,
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
          QualityPenalty = @qualityPenalty,
          ReworkCost = @reworkCost,
          CustomerCompensation = @customerCompensation,
          QualityLossCost = @qualityLossCost,
          InspectionCost = @inspectionCost,
          TransportationCost = @transportationCost,
          PreventionCost = @preventionCost,
          CostRemarks = @costRemarks,
          UpdatedAt = GETDATE(),
          UpdatedBy = @updatedBy
        WHERE ID = @id
      `;
      
      request.input('id', sql.Int, validId);
      request.input('date', sql.Date, date);
      request.input('customerCode', sql.NVarChar, customerCode);
      request.input('workOrderNo', sql.NVarChar, workOrderNo);
      request.input('productName', sql.NVarChar, productName);
      request.input('specification', sql.NVarChar, specification);
      request.input('orderQuantity', sql.Int, orderQuantity || 0);
      request.input('problemDescription', sql.NVarChar, problemDescription);
      request.input('problemImages', sql.NVarChar, JSON.stringify(problemImages || []));
      request.input('defectQuantity', sql.Int, defectQuantity || 0);
      request.input('defectRate', sql.Decimal(5, 2), defectRate || 0);
      request.input('complaintMethod', sql.NVarChar, complaintMethod);
      request.input('complaintType', sql.NVarChar, complaintType);
      request.input('processingDeadline', sql.Date, processingDeadline || null);
      request.input('requireReport', sql.Bit, requireReport || false);
      request.input('causeAnalysis', sql.NVarChar, causeAnalysis || null);
      request.input('correctiveActions', sql.NVarChar, correctiveActions || null);
      request.input('disposalMeasures', sql.NVarChar, disposalMeasures || null);
      request.input('responsibleDepartment', sql.NVarChar, responsibleDepartment ? String(responsibleDepartment) : null);
      request.input('responsiblePerson', sql.NVarChar, responsiblePerson ? String(responsiblePerson) : null);
      request.input('replyDate', sql.Date, replyDate || null);
      request.input('reportAttachments', sql.NVarChar, JSON.stringify(reportAttachments || []));
      request.input('feedbackPerson', sql.NVarChar, feedbackPerson ? String(feedbackPerson) : null);
      request.input('feedbackDate', sql.Date, feedbackDate || null);
      request.input('processor', sql.NVarChar, processor ? String(processor) : null);
      request.input('improvementVerification', sql.NVarChar, improvementVerification || null);
      request.input('verificationDate', sql.Date, verificationDate || null);
      request.input('status', sql.NVarChar, status || 'pending');
      // 质量成本字段参数绑定
      request.input('qualityPenalty', sql.Decimal(10, 2), qualityPenalty || 0);
      request.input('reworkCost', sql.Decimal(10, 2), reworkCost || 0);
      request.input('customerCompensation', sql.Decimal(10, 2), customerCompensation || 0);
      request.input('qualityLossCost', sql.Decimal(10, 2), qualityLossCost || 0);
      request.input('inspectionCost', sql.Decimal(10, 2), inspectionCost || 0);
      request.input('transportationCost', sql.Decimal(10, 2), transportationCost || 0);
      request.input('preventionCost', sql.Decimal(10, 2), preventionCost || 0);
      request.input('costRemarks', sql.NVarChar, costRemarks || null);
      request.input('updatedBy', sql.NVarChar, currentUser);
      
      const queryResult = await request.query(query);
      
      return queryResult;
    });
    
    if (!result || result.rowsAffected[0] === 0) {
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
    const { id } = req.params;
    
    // 验证ID参数是否为有效数字
    const validId = parseInt(id);
    if (isNaN(validId) || validId <= 0) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      const query = 'DELETE FROM CustomerComplaints WHERE ID = @id';
      request.input('id', sql.Int, validId);
      const queryResult = await request.query(query);
      
      return queryResult;
    });
    
    if (!result || result.rowsAffected[0] === 0) {
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
 * 客户投诉图片上传接口
 * POST /api/customer-complaints/upload-image
 */
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    // 处理文件名编码问题
    let originalName = req.file.originalname;
    try {
      // 尝试解码文件名，处理中文字符
      originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    } catch (error) {
      console.log('文件名解码失败，使用原始文件名:', error.message);
    }

    // 构建文件信息对象，与出版异常页面格式保持一致
    const fileInfo = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: path.parse(originalName).name + path.extname(originalName),
      originalName: originalName,
      filename: req.file.filename,
      relativePath: `customer-complaint/${req.file.filename}`,
      accessUrl: `/files/customer-complaint/${req.file.filename}`,
      fullUrl: `${req.protocol}://${req.get('host')}/files/customer-complaint/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadTime: new Date().toISOString(),
      fileType: 'image',
      category: 'complaint_evidence',
      url: `/files/customer-complaint/${req.file.filename}`,
      path: `customer-complaint/${req.file.filename}`,
      size: req.file.size
    };

    res.json({
      success: true,
      message: '图片上传成功',
      data: fileInfo
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({
      success: false,
      message: '图片上传失败',
      error: error.message
    });
  }
});

/**
 * 获取统计数据
 * GET /api/customer-complaints/statistics
 */
router.get('/statistics/overview', async (req, res) => {
  try {
    const result = await executeQuery(async (request) => {
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
      
      const queryResult = await request.query(query);
      
      return queryResult;
    });
    
    if (result && result.recordset && result.recordset.length > 0) {
      res.json({ success: true, data: result.recordset[0] });
    } else {
      // 返回默认统计数据
      res.json({ 
        success: true, 
        data: {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          closed: 0,
          avgDefectRate: 0,
          totalDefects: 0
        }
      });
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败', error: error.message });
  }
});

/**
 * 获取投诉类型选项
 * GET /api/customer-complaints/complaint-types
 * 功能：从CustomerComplaintType表中获取所有投诉类型的Name字段作为下拉选项
 */

module.exports = router;