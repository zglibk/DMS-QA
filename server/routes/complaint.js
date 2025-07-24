const express = require('express');
const router = express.Router();
const { sql, config, getDynamicConfig } = require('../db');
const auth = require('../middleware/auth');

// 添加请求日志中间件
router.use((req, res, next) => {
  console.log(`=== Complaint路由收到请求 ===`);
  console.log(`方法: ${req.method}`);
  console.log(`路径: ${req.path}`);
  console.log(`完整URL: ${req.originalUrl}`);
  next();
});

router.use(auth);

// ===================== 新增投诉登记 =====================
// POST /api/complaint
// 参数: 投诉表单所有字段
// 返回: { success, message, id }
router.post('/', async (req, res) => {
  const data = req.body;
  // 必填字段校验（取消主责部门和主责人的必填校验）
  const requiredFields = [
    'Date', 'Customer', 'OrderNo', 'ProductName', 'Workshop', 'ProductionQty',
    'ComplaintCategory', 'DefectiveCategory', 'DefectiveDescription', 'DefectiveItem',
    'Disposition'
  ];
  for (const field of requiredFields) {
    if (!data[field] && data[field] !== 0) {
      return res.status(400).json({ message: `${field}为必填项` });
    }
  }
  try {
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request()
      .input('Date', sql.Date, data.Date)
      .input('Customer', sql.NVarChar, data.Customer)
      .input('OrderNo', sql.NVarChar, data.OrderNo)
      .input('ProductName', sql.NVarChar, data.ProductName)
      .input('Specification', sql.NVarChar, data.Specification)
      .input('Workshop', sql.NVarChar, data.Workshop)
      .input('ProductionQty', sql.Int, data.ProductionQty)
      .input('DefectiveQty', sql.Int, data.DefectiveQty)
      .input('DefectiveRate', sql.Decimal(5,2), data.DefectiveRate)
      .input('ComplaintCategory', sql.NVarChar, data.ComplaintCategory)
      .input('CustomerComplaintType', sql.NVarChar, data.CustomerComplaintType)
      .input('DefectiveCategory', sql.NVarChar, data.DefectiveCategory)
      .input('DefectiveItem', sql.NVarChar, data.DefectiveItem)
      .input('DefectiveDescription', sql.NVarChar, data.DefectiveDescription)
      .input('AttachmentFile', sql.NVarChar, data.AttachmentFile)
      .input('DefectiveReason', sql.NVarChar, data.DefectiveReason)
      .input('Disposition', sql.NVarChar, data.Disposition)
      .input('ReturnGoods', sql.Bit, data.ReturnGoods === true ? 1 : 0)
      .input('IsReprint', sql.Bit, data.IsReprint === true ? 1 : 0)
      .input('ReprintQty', sql.Int, data.ReprintQty)
      .input('Paper', sql.NVarChar, data.Paper)
      .input('PaperSpecification', sql.NVarChar, data.PaperSpecification)
      .input('PaperQty', sql.Int, data.PaperQty)
      .input('PaperUnitPrice', sql.Decimal(10,2), data.PaperUnitPrice)
      .input('MaterialA', sql.NVarChar, data.MaterialA)
      .input('MaterialASpec', sql.NVarChar, data.MaterialASpec)
      .input('MaterialAQty', sql.Int, data.MaterialAQty)
      .input('MaterialAUnitPrice', sql.Decimal(10,2), data.MaterialAUnitPrice)
      .input('MaterialB', sql.NVarChar, data.MaterialB)
      .input('MaterialBSpec', sql.NVarChar, data.MaterialBSpec)
      .input('MaterialBQty', sql.Int, data.MaterialBQty)
      .input('MaterialBUnitPrice', sql.Decimal(10,2), data.MaterialBUnitPrice)
      .input('MaterialC', sql.NVarChar, data.MaterialC)
      .input('MaterialCSpec', sql.NVarChar, data.MaterialCSpec)
      .input('MaterialCQty', sql.Int, data.MaterialCQty)
      .input('MaterialCUnitPrice', sql.Decimal(10,2), data.MaterialCUnitPrice)
      .input('LaborCost', sql.Decimal(10,2), data.LaborCost)
      .input('TotalCost', sql.Decimal(10,2), data.TotalCost)
      .input('MainDept', sql.NVarChar, data.MainDept)
      .input('MainPerson', sql.NVarChar, data.MainPerson)
      .input('MainPersonAssessment', sql.Decimal(10,2), data.MainPersonAssessment)
      .input('SecondPerson', sql.NVarChar, data.SecondPerson)
      .input('SecondPersonAssessment', sql.Decimal(10,2), data.SecondPersonAssessment)
      .input('Manager', sql.NVarChar, data.Manager)
      .input('ManagerAssessment', sql.Decimal(10,2), data.ManagerAssessment)
      .input('AssessmentDescription', sql.NVarChar, data.AssessmentDescription)
      .query(`INSERT INTO ComplaintRegister (
        Date, Customer, OrderNo, ProductName, Specification, Workshop, ProductionQty, DefectiveQty, DefectiveRate, ComplaintCategory, CustomerComplaintType, DefectiveCategory, DefectiveItem, DefectiveDescription, AttachmentFile, DefectiveReason, Disposition, ReturnGoods, IsReprint, ReprintQty, Paper, PaperSpecification, PaperQty, PaperUnitPrice, MaterialA, MaterialASpec, MaterialAQty, MaterialAUnitPrice, MaterialB, MaterialBSpec, MaterialBQty, MaterialBUnitPrice, MaterialC, MaterialCSpec, MaterialCQty, MaterialCUnitPrice, LaborCost, TotalCost, MainDept, MainPerson, MainPersonAssessment, SecondPerson, SecondPersonAssessment, Manager, ManagerAssessment, AssessmentDescription
      ) VALUES (
        @Date, @Customer, @OrderNo, @ProductName, @Specification, @Workshop, @ProductionQty, @DefectiveQty, @DefectiveRate, @ComplaintCategory, @CustomerComplaintType, @DefectiveCategory, @DefectiveItem, @DefectiveDescription, @AttachmentFile, @DefectiveReason, @Disposition, @ReturnGoods, @IsReprint, @ReprintQty, @Paper, @PaperSpecification, @PaperQty, @PaperUnitPrice, @MaterialA, @MaterialASpec, @MaterialAQty, @MaterialAUnitPrice, @MaterialB, @MaterialBSpec, @MaterialBQty, @MaterialBUnitPrice, @MaterialC, @MaterialCSpec, @MaterialCQty, @MaterialCUnitPrice, @LaborCost, @TotalCost, @MainDept, @MainPerson, @MainPersonAssessment, @SecondPerson, @SecondPersonAssessment, @Manager, @ManagerAssessment, @AssessmentDescription
      ); SELECT SCOPE_IDENTITY() AS id`);
    res.json({ success: true, message: '投诉登记成功', id: result.recordset[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 查询所有投诉登记 =====================
// GET /api/complaint
// 返回: 投诉登记列表
router.get('/', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request().query('SELECT * FROM ComplaintRegister');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ===================== 获取不良项（级联） =====================
// GET /api/complaint/defective-items/:categoryId
// 返回: 指定类别下的不良项
router.get('/defective-items/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log('获取不良项请求 - CategoryID:', categoryId);

    let pool = await sql.connect(await getDynamicConfig());

    // 先查询所有不良项以便调试
    const allItemsResult = await pool.request()
      .query('SELECT ID, Name, CategoryID FROM DefectiveItem');
    console.log('所有不良项:', allItemsResult.recordset);

    // 查询指定类别的不良项
    const result = await pool.request()
      .input('CategoryID', sql.Int, categoryId)
      .query('SELECT Name FROM DefectiveItem WHERE CategoryID = @CategoryID');

    console.log('匹配的不良项:', result.recordset);
    const items = result.recordset.map(r => r.Name);
    console.log('返回的不良项数组:', items);

    res.json(items);
  } catch (err) {
    console.error('获取不良项失败:', err);
    res.status(500).json({ message: err.message });
  }
});

// ===================== 投诉分页与统计 =====================
// GET /api/complaint/list
// 参数: page, pageSize, search(简单搜索) 或 高级查询参数
// 高级查询参数: customer, orderNo, workshop, complaintCategory, startDate, endDate, defectiveRateMin, defectiveRateMax
// 返回: { success, data, total }
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // console.log('分页参数:', { page, pageSize, offset, originalPageSize: req.query.pageSize });

    // 获取查询参数
    const {
      search,           // 简单搜索
      customer,         // 客户名称
      orderNo,          // 工单号
      productName,      // 产品名称
      workshop,         // 车间
      complaintCategory, // 投诉类别
      customerComplaintType, // 客诉类型
      defectiveCategory, // 不良类别
      mainDept,         // 主责部门
      mainPerson,       // 主责人
      startDate,        // 开始日期
      endDate,          // 结束日期
      defectiveRateMin, // 最小不良率
      defectiveRateMax, // 最大不良率
      returnGoods,      // 退货状态
      isReprint,        // 补印状态
      timeRange,        // 时间范围
      // 钻取参数
      period,           // 时间段钻取
      category          // 类别钻取（这里的category指的是defectiveCategory）
    } = req.query;

    let pool = await sql.connect(await getDynamicConfig());

    // 构建基础时间范围条件
    let whereClause = '';
    const now = new Date();

    // 处理timeRange参数
    if (timeRange) {
      let timeStartDate = '';
      switch (timeRange) {
        case '2months':
          const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          timeStartDate = twoMonthsAgo.toISOString().split('T')[0];
          break;
        case '3months':
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          timeStartDate = threeMonthsAgo.toISOString().split('T')[0];
          break;
        case '4months':
          const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1);
          timeStartDate = fourMonthsAgo.toISOString().split('T')[0];
          break;
        case '5months':
          const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          timeStartDate = fiveMonthsAgo.toISOString().split('T')[0];
          break;
        case '6months':
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          timeStartDate = sixMonthsAgo.toISOString().split('T')[0];
          break;
        case '1year':
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          timeStartDate = oneYearAgo.toISOString().split('T')[0];
          break;
        case '2years':
          const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);
          timeStartDate = twoYearsAgo.toISOString().split('T')[0];
          break;
        default:
          const defaultStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          timeStartDate = defaultStart.toISOString().split('T')[0];
      }
      whereClause = `WHERE Date >= '${timeStartDate}'`;
    } else {
      // 默认显示近1年数据
      whereClause = 'WHERE Date >= DATEADD(year, -1, GETDATE()) AND Date <= GETDATE()';
    }

    // 如果有高级查询参数或钻取参数，则使用高级查询
    if (customer || orderNo || productName || workshop || complaintCategory || customerComplaintType ||
        defectiveCategory || mainDept || mainPerson || startDate || endDate ||
        defectiveRateMin !== undefined || defectiveRateMax !== undefined ||
        returnGoods !== undefined || isReprint !== undefined || timeRange ||
        period || category) {

      // 客户查询
      if (customer) {
        whereClause += ` AND Customer LIKE N'%${customer}%'`;
      }

      // 工单号查询
      if (orderNo) {
        whereClause += ` AND OrderNo LIKE N'%${orderNo}%'`;
      }

      // 产品名称查询
      if (productName) {
        whereClause += ` AND ProductName LIKE N'%${productName}%'`;
      }

      // 车间查询
      if (workshop) {
        whereClause += ` AND Workshop = N'${workshop}'`;
      }

      // 投诉类别查询
      if (complaintCategory) {
        whereClause += ` AND ComplaintCategory = N'${complaintCategory}'`;
      }

      // 客诉类型查询
      if (customerComplaintType) {
        whereClause += ` AND CustomerComplaintType = N'${customerComplaintType}'`;
      }

      // 不良类别查询
      if (defectiveCategory) {
        whereClause += ` AND DefectiveCategory = N'${defectiveCategory}'`;
      }

      // 主责部门查询
      if (mainDept) {
        whereClause += ` AND MainDept = N'${mainDept}'`;
      }

      // 主责人查询
      if (mainPerson) {
        whereClause += ` AND MainPerson = N'${mainPerson}'`;
      }

      // 日期范围查询
      if (startDate && endDate) {
        whereClause += ` AND Date >= '${startDate}' AND Date <= '${endDate}'`;
      } else if (startDate) {
        whereClause += ` AND Date >= '${startDate}'`;
      } else if (endDate) {
        whereClause += ` AND Date <= '${endDate}'`;
      }

      // 不良率范围查询
      if (defectiveRateMin !== undefined && defectiveRateMax !== undefined) {
        whereClause += ` AND DefectiveRate >= ${defectiveRateMin} AND DefectiveRate <= ${defectiveRateMax}`;
      } else if (defectiveRateMin !== undefined) {
        whereClause += ` AND DefectiveRate >= ${defectiveRateMin}`;
      } else if (defectiveRateMax !== undefined) {
        whereClause += ` AND DefectiveRate <= ${defectiveRateMax}`;
      }

      // 退货状态查询
      if (returnGoods !== undefined && returnGoods !== '') {
        whereClause += ` AND ReturnGoods = ${returnGoods === '1' ? 1 : 0}`;
      }

      // 补印状态查询
      if (isReprint !== undefined && isReprint !== '') {
        whereClause += ` AND IsReprint = ${isReprint === '1' ? 1 : 0}`;
      }

      // 钻取参数处理
      // 时间段钻取
      if (period) {
        // period格式可能是 "2024年12月"、"25年5月" 或 "2024-12"
        if (period.includes('年') && period.includes('月')) {
          // 处理中文格式 "2024年12月" 或 "25年5月"
          const yearMatch = period.match(/(\d{2,4})年/);
          const monthMatch = period.match(/(\d{1,2})月/);
          if (yearMatch && monthMatch) {
            let year = yearMatch[1];
            // 如果是2位年份，转换为4位年份
            if (year.length === 2) {
              year = '20' + year;
            }
            const month = monthMatch[1].padStart(2, '0');
            whereClause += ` AND YEAR(Date) = ${year} AND MONTH(Date) = ${parseInt(month)}`;
          }
        } else if (period.includes('-')) {
          // 处理格式 "2024-12"
          const [year, month] = period.split('-');
          if (year && month) {
            whereClause += ` AND YEAR(Date) = ${year} AND MONTH(Date) = ${parseInt(month)}`;
          }
        }
      }

      // 类别钻取（不良类别）
      if (category) {
        whereClause += ` AND DefectiveCategory = N'${category}'`;
      }

    } else if (search) {
      // 简单搜索
      whereClause += ` AND (
        Customer LIKE N'%${search}%' OR
        OrderNo LIKE N'%${search}%' OR
        ProductName LIKE N'%${search}%' OR
        Workshop LIKE N'%${search}%' OR
        ComplaintCategory LIKE N'%${search}%' OR
        DefectiveCategory LIKE N'%${search}%' OR
        DefectiveItem LIKE N'%${search}%' OR
        MainDept LIKE N'%${search}%' OR
        MainPerson LIKE N'%${search}%'
      )`;
    }

    // 获取总数
    const countResult = await pool.request()
      .query(`SELECT COUNT(*) AS total FROM ComplaintRegister ${whereClause}`);
    const total = countResult.recordset[0].total;

    // ROW_NUMBER分页
    const sqlQuery = `SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (ORDER BY Date DESC, ID DESC) AS RowNum
        FROM ComplaintRegister
        ${whereClause}
      ) AS T
      WHERE T.RowNum BETWEEN ${offset + 1} AND ${offset + pageSize}
      ORDER BY T.RowNum`;

    // console.log('执行SQL查询:', sqlQuery);
    // console.log('查询范围:', `${offset + 1} 到 ${offset + pageSize}`);

    const result = await pool.request().query(sqlQuery);

    // console.log('查询结果数量:', result.recordset.length);
    // console.log('总记录数:', total);

    res.json({
      success: true,
      data: result.recordset,
      total,
      page,
      pageSize,
      search
    });
  } catch (err) {
    console.error('获取投诉列表失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 获取单个投诉记录详情 =====================
// GET /api/complaint/detail/:id
// 参数: id (投诉记录ID)
// 返回: { success, data }
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }

    let pool = await sql.connect(await getDynamicConfig());

    const result = await pool.request()
      .input('ID', sql.Int, parseInt(id))
      .query('SELECT * FROM ComplaintRegister WHERE ID = @ID');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (err) {
    console.error('获取投诉详情失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 更新投诉记录 =====================
// PUT /api/complaint/:id
// 参数: id (投诉记录ID), 投诉表单所有字段
// 返回: { success, message }
router.put('/:id', async (req, res) => {
  console.log('=== PUT路由被调用 ===');
  console.log('请求方法:', req.method);
  console.log('请求路径:', req.path);
  console.log('请求参数:', req.params);

  try {
    const { id } = req.params;
    const data = req.body;

    console.log('更新投诉记录 - ID:', id);
    console.log('更新投诉记录 - 数据:', JSON.stringify(data, null, 2));

    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }

    // 必填字段校验（更宽松的验证）
    const requiredFields = [
      'Date', 'Customer', 'OrderNo', 'ProductName', 'Workshop'
    ];

    for (const field of requiredFields) {
      if (!data[field] || data[field] === '' || data[field] === null || data[field] === undefined) {
        return res.status(400).json({ success: false, message: `${field}为必填项，当前值: ${data[field]}` });
      }
    }

    // 数字字段的特殊处理
    if (data.ProductionQty === null || data.ProductionQty === undefined || data.ProductionQty === '') {
      data.ProductionQty = 0;
    }

    let pool = await sql.connect(await getDynamicConfig());

    // 先检查记录是否存在
    const checkResult = await pool.request()
      .input('ID', sql.Int, parseInt(id))
      .query('SELECT ID FROM ComplaintRegister WHERE ID = @ID');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    // 更新记录
    const result = await pool.request()
      .input('ID', sql.Int, parseInt(id))
      .input('Date', sql.Date, data.Date)
      .input('Customer', sql.NVarChar, data.Customer)
      .input('OrderNo', sql.NVarChar, data.OrderNo)
      .input('ProductName', sql.NVarChar, data.ProductName)
      .input('Specification', sql.NVarChar, data.Specification)
      .input('Workshop', sql.NVarChar, data.Workshop)
      .input('ProductionQty', sql.Int, data.ProductionQty)
      .input('DefectiveQty', sql.Int, data.DefectiveQty)
      .input('DefectiveRate', sql.Decimal(5,2), data.DefectiveRate)
      .input('ComplaintCategory', sql.NVarChar, data.ComplaintCategory)
      .input('CustomerComplaintType', sql.NVarChar, data.CustomerComplaintType)
      .input('DefectiveCategory', sql.NVarChar, data.DefectiveCategory)
      .input('DefectiveItem', sql.NVarChar, data.DefectiveItem)
      .input('DefectiveDescription', sql.NVarChar, data.DefectiveDescription)
      .input('AttachmentFile', sql.NVarChar, data.AttachmentFile)
      .input('DefectiveReason', sql.NVarChar, data.DefectiveReason)
      .input('Disposition', sql.NVarChar, data.Disposition)
      .input('ReturnGoods', sql.Bit, data.ReturnGoods === true ? 1 : 0)
      .input('IsReprint', sql.Bit, data.IsReprint === true ? 1 : 0)
      .input('ReprintQty', sql.Int, data.ReprintQty)
      .input('Paper', sql.NVarChar, data.Paper)
      .input('PaperSpecification', sql.NVarChar, data.PaperSpecification)
      .input('PaperQty', sql.Int, data.PaperQty)
      .input('PaperUnitPrice', sql.Decimal(10,2), data.PaperUnitPrice)
      .input('MaterialA', sql.NVarChar, data.MaterialA)
      .input('MaterialASpec', sql.NVarChar, data.MaterialASpec)
      .input('MaterialAQty', sql.Int, data.MaterialAQty)
      .input('MaterialAUnitPrice', sql.Decimal(10,2), data.MaterialAUnitPrice)
      .input('MaterialB', sql.NVarChar, data.MaterialB)
      .input('MaterialBSpec', sql.NVarChar, data.MaterialBSpec)
      .input('MaterialBQty', sql.Int, data.MaterialBQty)
      .input('MaterialBUnitPrice', sql.Decimal(10,2), data.MaterialBUnitPrice)
      .input('MaterialC', sql.NVarChar, data.MaterialC)
      .input('MaterialCSpec', sql.NVarChar, data.MaterialCSpec)
      .input('MaterialCQty', sql.Int, data.MaterialCQty)
      .input('MaterialCUnitPrice', sql.Decimal(10,2), data.MaterialCUnitPrice)
      .input('LaborCost', sql.Decimal(10,2), data.LaborCost)
      .input('TotalCost', sql.Decimal(10,2), data.TotalCost)
      .input('MainDept', sql.NVarChar, data.MainDept)
      .input('MainPerson', sql.NVarChar, data.MainPerson)
      .input('MainPersonAssessment', sql.Decimal(10,2), data.MainPersonAssessment)
      .input('SecondPerson', sql.NVarChar, data.SecondPerson)
      .input('SecondPersonAssessment', sql.Decimal(10,2), data.SecondPersonAssessment)
      .input('Manager', sql.NVarChar, data.Manager)
      .input('ManagerAssessment', sql.Decimal(10,2), data.ManagerAssessment)
      .input('AssessmentDescription', sql.NVarChar, data.AssessmentDescription)
      .query(`
        UPDATE ComplaintRegister SET
          Date = @Date,
          Customer = @Customer,
          OrderNo = @OrderNo,
          ProductName = @ProductName,
          Specification = @Specification,
          Workshop = @Workshop,
          ProductionQty = @ProductionQty,
          DefectiveQty = @DefectiveQty,
          DefectiveRate = @DefectiveRate,
          ComplaintCategory = @ComplaintCategory,
          CustomerComplaintType = @CustomerComplaintType,
          DefectiveCategory = @DefectiveCategory,
          DefectiveItem = @DefectiveItem,
          DefectiveDescription = @DefectiveDescription,
          AttachmentFile = @AttachmentFile,
          DefectiveReason = @DefectiveReason,
          Disposition = @Disposition,
          ReturnGoods = @ReturnGoods,
          IsReprint = @IsReprint,
          ReprintQty = @ReprintQty,
          Paper = @Paper,
          PaperSpecification = @PaperSpecification,
          PaperQty = @PaperQty,
          PaperUnitPrice = @PaperUnitPrice,
          MaterialA = @MaterialA,
          MaterialASpec = @MaterialASpec,
          MaterialAQty = @MaterialAQty,
          MaterialAUnitPrice = @MaterialAUnitPrice,
          MaterialB = @MaterialB,
          MaterialBSpec = @MaterialBSpec,
          MaterialBQty = @MaterialBQty,
          MaterialBUnitPrice = @MaterialBUnitPrice,
          MaterialC = @MaterialC,
          MaterialCSpec = @MaterialCSpec,
          MaterialCQty = @MaterialCQty,
          MaterialCUnitPrice = @MaterialCUnitPrice,
          LaborCost = @LaborCost,
          TotalCost = @TotalCost,
          MainDept = @MainDept,
          MainPerson = @MainPerson,
          MainPersonAssessment = @MainPersonAssessment,
          SecondPerson = @SecondPerson,
          SecondPersonAssessment = @SecondPersonAssessment,
          Manager = @Manager,
          ManagerAssessment = @ManagerAssessment,
          AssessmentDescription = @AssessmentDescription
        WHERE ID = @ID
      `);

    res.json({
      success: true,
      message: '投诉记录更新成功',
      id: parseInt(id)
    });
  } catch (err) {
    console.error('更新投诉记录失败:', err);
    console.error('错误堆栈:', err.stack);
    res.status(500).json({
      success: false,
      message: '更新投诉记录失败: ' + err.message,
      error: err.toString()
    });
  }
});

// ===================== 删除投诉记录 =====================
// DELETE /api/complaint/:id
// 参数: id (投诉记录ID)
// 返回: { success, message }
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }

    let pool = await sql.connect(await getDynamicConfig());

    // 先检查记录是否存在
    const checkResult = await pool.request()
      .input('ID', sql.Int, parseInt(id))
      .query('SELECT ID, Customer, OrderNo, ProductName FROM ComplaintRegister WHERE ID = @ID');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const record = checkResult.recordset[0];

    // 删除记录
    await pool.request()
      .input('ID', sql.Int, parseInt(id))
      .query('DELETE FROM ComplaintRegister WHERE ID = @ID');

    res.json({
      success: true,
      message: `投诉记录删除成功 (客户: ${record.Customer}, 工单: ${record.OrderNo})`,
      deletedRecord: {
        id: parseInt(id),
        customer: record.Customer,
        orderNo: record.OrderNo,
        productName: record.ProductName
      }
    });
  } catch (err) {
    console.error('删除投诉记录失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 首页统计卡片数据接口 =====================
// GET /api/complaint/month-stats
// 参数: month (可选，格式: YYYY-MM，默认当前月份)
// 返回: 今日投诉数、指定月份投诉数、各单位统计
router.get('/month-stats', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());

    // 获取月份参数，默认为当前月份
    const { month } = req.query;
    let targetYear, targetMonth;

    console.log('收到统计请求，月份参数:', month);

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      // 使用指定月份
      [targetYear, targetMonth] = month.split('-').map(Number);
      console.log('使用指定月份:', targetYear, targetMonth);
    } else {
      // 使用当前月份
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
      console.log('使用当前月份:', targetYear, targetMonth);
    }

    console.log(`获取统计数据 - 目标月份: ${targetYear}年${targetMonth}月`);

    // 获取主页卡片配置
    let config = {};
    try {
      console.log('开始检查HomeCardConfig表是否存在...');
      // 检查表是否存在
      const tableCheckResult = await pool.request()
        .query(`SELECT COUNT(*) as count FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HomeCardConfig]') AND type in (N'U')`);

      console.log('HomeCardConfig表检查结果:', tableCheckResult.recordset[0]);

      if (tableCheckResult.recordset[0].count > 0) {
        // 表存在，获取配置
        console.log('HomeCardConfig表存在，开始获取配置...');
        const configResult = await pool.request()
          .query(`SELECT ConfigKey, ConfigValue FROM HomeCardConfig WHERE IsActive = 1`);

        console.log('HomeCardConfig配置查询结果:', configResult.recordset);

        configResult.recordset.forEach(row => {
          const key = row.ConfigKey;
          let value = row.ConfigValue;

          if (key === 'displayUnits') {
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error('解析displayUnits配置失败:', e);
              value = [];
            }
          } else if (value === 'true') {
            value = true;
          } else if (value === 'false') {
            value = false;
          }

          config[key] = value;
        });
        console.log('解析后的配置:', config);
      } else {
        console.log('HomeCardConfig表不存在，使用默认配置');
      }
    } catch (configError) {
      console.error('获取配置失败，使用默认配置:', configError);
    }

    // 设置默认值
    const showTodayCount = config.showTodayCount !== false;
    const showMonthCount = config.showMonthCount !== false;
    const displayUnits = config.displayUnits || [
      { name: '数码印刷', type: 'workshop', enabled: true },
      { name: '轮转机', type: 'workshop', enabled: true },
      { name: '跟单', type: 'department', enabled: true },
      { name: '设计', type: 'department', enabled: true },
      { name: '品检', type: 'department', enabled: true }
    ];

    let todayCount = 0;
    let todayInnerCount = 0;
    let todayOuterCount = 0;
    let monthCount = 0;
    let monthInnerCount = 0;
    let monthOuterCount = 0;

    // 根据配置获取统计数据
    if (showTodayCount) {
      const todayResult = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE Date = CONVERT(date, GETDATE())`);
      todayCount = todayResult.recordset[0].cnt;

      // 今日内诉统计
      const todayInnerResult = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE Date = CONVERT(date, GETDATE()) AND ComplaintCategory = N'内诉'`);
      todayInnerCount = todayInnerResult.recordset[0].cnt;

      // 今日客诉统计
      const todayOuterResult = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE Date = CONVERT(date, GETDATE()) AND ComplaintCategory = N'客诉'`);
      todayOuterCount = todayOuterResult.recordset[0].cnt;
    }

    if (showMonthCount) {
      const monthResult = await pool.request()
        .input('TargetYear', sql.Int, targetYear)
        .input('TargetMonth', sql.Int, targetMonth)
        .query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE YEAR(Date) = @TargetYear AND MONTH(Date) = @TargetMonth`);
      monthCount = monthResult.recordset[0].cnt;

      // 月份内诉统计
      const monthInnerResult = await pool.request()
        .input('TargetYear', sql.Int, targetYear)
        .input('TargetMonth', sql.Int, targetMonth)
        .query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE YEAR(Date) = @TargetYear AND MONTH(Date) = @TargetMonth AND ComplaintCategory = N'内诉'`);
      monthInnerCount = monthInnerResult.recordset[0].cnt;

      // 月份客诉统计
      const monthOuterResult = await pool.request()
        .input('TargetYear', sql.Int, targetYear)
        .input('TargetMonth', sql.Int, targetMonth)
        .query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE YEAR(Date) = @TargetYear AND MONTH(Date) = @TargetMonth AND ComplaintCategory = N'客诉'`);
      monthOuterCount = monthOuterResult.recordset[0].cnt;
    }

    // 统计启用的单位的内诉/客诉
    const unitStats = [];
    const enabledUnits = displayUnits.filter(unit => unit.enabled);

    for (const unit of enabledUnits) {
      // 目前数据库只有Workshop字段，所以都使用Workshop字段查询
      // 如果需要区分部门，需要在数据库中添加Department字段
      const fieldName = 'Workshop';

      // 内诉
      const innerRes = await pool.request()
        .input('TargetYear', sql.Int, targetYear)
        .input('TargetMonth', sql.Int, targetMonth)
        .input('UnitName', sql.NVarChar, unit.name)
        .query(`
          SELECT COUNT(*) AS cnt
          FROM ComplaintRegister
          WHERE YEAR(Date) = @TargetYear
            AND MONTH(Date) = @TargetMonth
            AND ${fieldName} = @UnitName
            AND ComplaintCategory = N'内诉'
        `);

      // 客诉
      const outerRes = await pool.request()
        .input('TargetYear', sql.Int, targetYear)
        .input('TargetMonth', sql.Int, targetMonth)
        .input('UnitName', sql.NVarChar, unit.name)
        .query(`
          SELECT COUNT(*) AS cnt
          FROM ComplaintRegister
          WHERE YEAR(Date) = @TargetYear
            AND MONTH(Date) = @TargetMonth
            AND ${fieldName} = @UnitName
            AND ComplaintCategory = N'客诉'
        `);

      unitStats.push({
        unit: unit.name,
        type: unit.type,
        inner: innerRes.recordset[0].cnt,
        outer: outerRes.recordset[0].cnt
      });
    }

    res.json({
      success: true,
      showTodayCount,
      showMonthCount,
      todayCount,
      todayInnerCount,
      todayOuterCount,
      monthCount,
      monthInnerCount,
      monthOuterCount,
      units: unitStats,
      targetMonth: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`, // 返回目标月份
      config: {
        displayUnits: enabledUnits
      }
    });
  } catch (err) {
    console.error('获取月度统计失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 获取车间选项 =====================
// GET /api/complaint/workshop-options
// 返回: { success, data }
router.get('/workshop-options', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());

    // 获取所有不同的车间名称
    const result = await pool.request().query(`
      SELECT DISTINCT Workshop
      FROM ComplaintRegister
      WHERE Workshop IS NOT NULL AND Workshop != ''
      ORDER BY Workshop
    `);

    const workshops = result.recordset.map(row => row.Workshop);

    res.json({
      success: true,
      data: workshops
    });
  } catch (err) {
    console.error('获取车间选项失败:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 重置自增ID =====================
// POST /api/complaint/reset-identity
// 返回: { success, message }
router.post('/reset-identity', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());

    // 获取当前表中的最大ID
    const maxIdResult = await pool.request()
      .query('SELECT ISNULL(MAX(ID), 0) AS MaxId FROM ComplaintRegister');

    const maxId = maxIdResult.recordset[0].MaxId;

    // 重置自增ID为最大ID值
    await pool.request()
      .query(`DBCC CHECKIDENT('ComplaintRegister', RESEED, ${maxId})`);

    res.json({
      success: true,
      message: `自增ID已重置，下一个ID将从 ${maxId + 1} 开始`,
      nextId: maxId + 1
    });
  } catch (err) {
    console.error('重置自增ID失败:', err);
    res.status(500).json({
      success: false,
      message: '重置自增ID失败: ' + err.message
    });
  }
});

// ===================== 清空表并重置自增ID =====================
// POST /api/complaint/truncate-table
// 返回: { success, message }
router.post('/truncate-table', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());

    // 使用TRUNCATE TABLE清空表并自动重置自增ID
    await pool.request()
      .query('TRUNCATE TABLE ComplaintRegister');

    res.json({
      success: true,
      message: '表已清空，自增ID已重置为1',
      nextId: 1
    });
  } catch (err) {
    console.error('清空表失败:', err);
    res.status(500).json({
      success: false,
      message: '清空表失败: ' + err.message
    });
  }
});

// 获取所有下拉选项
router.get('/options', async (req, res) => {
  console.log('=== 开始获取下拉选项 ===');
  try {
    const pool = await sql.connect(await getDynamicConfig());
    console.log('数据库连接成功');

    // 获取车间选项
    console.log('正在获取车间选项...');
    const workshopResult = await pool.request()
      .query('SELECT Name FROM Workshop ORDER BY Name');
    console.log('车间选项结果:', workshopResult.recordset);

    // 获取投诉类别选项 - 从ComplaintRegister表中获取不重复的值
    console.log('正在获取投诉类别选项...');
    const complaintCategoryResult = await pool.request()
      .query('SELECT DISTINCT ComplaintCategory as Name FROM ComplaintRegister WHERE ComplaintCategory IS NOT NULL AND ComplaintCategory != \'\' ORDER BY ComplaintCategory');
    console.log('投诉类别选项结果:', complaintCategoryResult.recordset);

    // 获取客诉类型选项 - 从CustomerComplaintType表获取
    console.log('正在获取客诉类型选项...');
    const customerComplaintTypeResult = await pool.request()
      .query('SELECT Name FROM CustomerComplaintType ORDER BY Name');
    console.log('客诉类型选项结果:', customerComplaintTypeResult.recordset);

    // 获取不良类别选项 - 从DefectiveCategory表获取（包含ID）
    console.log('正在获取不良类别选项...');
    const defectiveCategoryResult = await pool.request()
      .query('SELECT ID, Name FROM DefectiveCategory ORDER BY Name');
    console.log('不良类别选项结果:', defectiveCategoryResult.recordset);

    // 获取部门选项 - 从Department表获取
    console.log('正在获取部门选项...');
    const departmentResult = await pool.request()
      .query('SELECT Name FROM Department ORDER BY Name');
    console.log('部门选项结果:', departmentResult.recordset);

    // 获取人员选项 - 从Person表获取
    console.log('正在获取人员选项...');
    const personResult = await pool.request()
      .query('SELECT Name FROM Person ORDER BY Name');
    console.log('人员选项结果:', personResult.recordset);

    const result = {
      workshops: workshopResult.recordset || [],
      complaintCategories: complaintCategoryResult.recordset || [],
      customerComplaintTypes: customerComplaintTypeResult.recordset || [],
      defectiveCategories: defectiveCategoryResult.recordset || [],
      departments: departmentResult.recordset || [],
      persons: personResult.recordset || []
    };

    console.log('=== 最终返回结果 ===:', {
      workshops: result.workshops.length,
      complaintCategories: result.complaintCategories.length,
      customerComplaintTypes: result.customerComplaintTypes.length,
      defectiveCategories: result.defectiveCategories.length,
      departments: result.departments.length,
      persons: result.persons.length
    });
    console.log('完整结果数据:', JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error('=== 获取下拉选项失败 ===:', error);
    res.status(500).json({ error: '获取下拉选项失败', details: error.message });
  }
});

// ===================== 获取表字段信息 =====================
// GET /api/complaint/fields
// 返回: { success, data: [{ key, label, type, required }] }
router.get('/fields', async (req, res) => {
  try {
    // 定义字段映射，包含中文标签和属性
    const fieldMapping = {
      'ID': { label: 'ID', type: 'number', required: false, exportable: false },
      'Date': { label: '日期', type: 'date', required: true, exportable: true },
      'Customer': { label: '客户编号', type: 'string', required: true, exportable: true },
      'OrderNo': { label: '工单号', type: 'string', required: true, exportable: true },
      'ProductName': { label: '产品名称', type: 'string', required: true, exportable: true },
      'Specification': { label: '规格', type: 'string', required: false, exportable: true },
      'Workshop': { label: '车间', type: 'string', required: false, exportable: true },
      'ProductionQty': { label: '生产数量', type: 'number', required: true, exportable: true },
      'DefectiveQty': { label: '不良数量', type: 'number', required: false, exportable: true },
      'DefectiveRate': { label: '不良率(%)', type: 'decimal', required: false, exportable: true },
      'ComplaintCategory': { label: '投诉类别', type: 'string', required: false, exportable: true },
      'CustomerComplaintType': { label: '客诉类型', type: 'string', required: false, exportable: true },
      'DefectiveCategory': { label: '不良类别', type: 'string', required: false, exportable: true },
      'DefectiveItem': { label: '不良项', type: 'string', required: false, exportable: true },
      'DefectiveDescription': { label: '不良描述', type: 'string', required: false, exportable: true },
      'AttachmentFile': { label: '附件文件', type: 'string', required: false, exportable: true },
      'DefectiveReason': { label: '不良原因', type: 'string', required: false, exportable: true },
      'Disposition': { label: '处置措施', type: 'string', required: false, exportable: true },
      'ReturnGoods': { label: '退货', type: 'boolean', required: false, exportable: true },
      'IsReprint': { label: '补印', type: 'boolean', required: false, exportable: true },
      'ReprintQty': { label: '补印数量', type: 'number', required: false, exportable: true },
      'Paper': { label: '纸张', type: 'string', required: false, exportable: true },
      'PaperSpecification': { label: '纸张规格', type: 'string', required: false, exportable: true },
      'PaperQty': { label: '纸张数量', type: 'number', required: false, exportable: true },
      'PaperUnitPrice': { label: '纸张单价', type: 'decimal', required: false, exportable: true },
      'MaterialA': { label: '材料A', type: 'string', required: false, exportable: true },
      'MaterialASpec': { label: '材料A规格', type: 'string', required: false, exportable: true },
      'MaterialAQty': { label: '材料A数量', type: 'number', required: false, exportable: true },
      'MaterialAUnitPrice': { label: '材料A单价', type: 'decimal', required: false, exportable: true },
      'MaterialB': { label: '材料B', type: 'string', required: false, exportable: true },
      'MaterialBSpec': { label: '材料B规格', type: 'string', required: false, exportable: true },
      'MaterialBQty': { label: '材料B数量', type: 'number', required: false, exportable: true },
      'MaterialBUnitPrice': { label: '材料B单价', type: 'decimal', required: false, exportable: true },
      'MaterialC': { label: '材料C', type: 'string', required: false, exportable: true },
      'MaterialCSpec': { label: '材料C规格', type: 'string', required: false, exportable: true },
      'MaterialCQty': { label: '材料C数量', type: 'number', required: false, exportable: true },
      'MaterialCUnitPrice': { label: '材料C单价', type: 'decimal', required: false, exportable: true },
      'LaborCost': { label: '人工成本', type: 'decimal', required: false, exportable: true },
      'TotalCost': { label: '总成本', type: 'decimal', required: false, exportable: true },
      'MainDept': { label: '主责部门', type: 'string', required: false, exportable: true },
      'MainPerson': { label: '主责人', type: 'string', required: false, exportable: true },
      'MainPersonAssessment': { label: '主责人考核', type: 'decimal', required: false, exportable: true },
      'SecondPerson': { label: '次责人', type: 'string', required: false, exportable: true },
      'SecondPersonAssessment': { label: '次责人考核', type: 'decimal', required: false, exportable: true },
      'Manager': { label: '经理', type: 'string', required: false, exportable: true },
      'ManagerAssessment': { label: '经理考核', type: 'decimal', required: false, exportable: true },
      'AssessmentDescription': { label: '考核说明', type: 'string', required: false, exportable: true }
    };

    // 转换为前端需要的格式
    const fields = Object.keys(fieldMapping)
      .filter(key => fieldMapping[key].exportable)
      .map(key => ({
        key,
        label: fieldMapping[key].label,
        type: fieldMapping[key].type,
        required: fieldMapping[key].required,
        // 设置默认选中状态
        checked: getDefaultCheckedStatus(key)
      }));

    // 添加序号字段（前端特有）
    fields.unshift({
      key: 'index',
      label: '序号',
      type: 'number',
      required: true,
      checked: true
    });

    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    console.error('获取字段信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取字段信息失败: ' + error.message
    });
  }
});

// 获取字段默认选中状态的辅助函数
function getDefaultCheckedStatus(key) {
  // 默认选中的核心字段
  const defaultSelectedFields = [
    'Date', 'Customer', 'OrderNo', 'ProductName', 'Specification', 'Workshop',
    'ProductionQty', 'DefectiveQty', 'DefectiveRate', 'ComplaintCategory',
    'CustomerComplaintType', 'DefectiveCategory', 'DefectiveItem',
    'ReturnGoods', 'IsReprint', 'MainDept', 'MainPerson'
  ];

  return defaultSelectedFields.includes(key);
}

// ===================== 投诉数据分析接口 =====================
// GET /api/complaint/analysis
// 参数: dimension, timeRange, complaintType
// 返回: { success, chartData, tableData, summaryData }
router.get('/analysis', async (req, res) => {
  try {
    const { dimension = 'time', timeRange = '6months', complaintType = '' } = req.query;

    console.log('投诉数据分析请求:', { dimension, timeRange, complaintType });

    let pool = await sql.connect(await getDynamicConfig());

    // 计算时间范围
    let dateCondition = '';
    let startDate = '';
    let endDate = '';
    const now = new Date();

    switch (timeRange) {
      case '2months':
        // 近2个月：当前月份 + 前1个月 = 2个月（7、6月）
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = twoMonthsAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        dateCondition = `Date >= '${startDate}'`;
        break;
      case '3months':
        // 近3个月：当前月份 + 前2个月 = 3个月（7、6、5月）
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        startDate = threeMonthsAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        dateCondition = `Date >= '${startDate}'`;
        break;
      case '4months':
        // 近4个月：当前月份 + 前3个月 = 4个月（7、6、5、4月）
        const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        startDate = fourMonthsAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        dateCondition = `Date >= '${startDate}'`;
        break;
      case '5months':
        // 近5个月：当前月份 + 前4个月 = 5个月（7、6、5、4、3月）
        const fiveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1);
        startDate = fiveMonthsAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        dateCondition = `Date >= '${startDate}'`;
        break;
      case '6months':
        // 近6个月：当前月份 + 前5个月 = 6个月（7、6、5、4、3、2月）
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        startDate = sixMonthsAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        dateCondition = `Date >= '${startDate}'`;
        break;
      case '1year':
        // 近1年：当前月份 + 前11个月 = 12个月
        const oneYearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        startDate = oneYearAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        dateCondition = `Date >= '${startDate}'`;
        break;
      case '2years':
        // 近2年：当前月份 + 前23个月 = 24个月
        const twoYearsAgo = new Date(now.getFullYear(), now.getMonth() - 23, 1);
        startDate = twoYearsAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        dateCondition = `Date >= '${startDate}'`;
        break;
      default:
        // 默认近6个月：当前月份 + 前5个月 = 6个月（7、6、5、4、3、2月）
        const defaultStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        startDate = defaultStart.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        dateCondition = `Date >= '${startDate}'`;
    }

    // 投诉类型条件
    let complaintCondition = '';
    if (complaintType) {
      complaintCondition = `AND ComplaintCategory = N'${complaintType}'`;
    }

    let chartData = [];
    let tableData = [];
    let summaryData = {};

    // 获取汇总数据 - 投诉数据
    const complaintSummaryQuery = `
      SELECT
        COUNT(*) as totalComplaints,
        SUM(CASE WHEN ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) as innerComplaints,
        SUM(CASE WHEN ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) as outerComplaints
      FROM ComplaintRegister
      WHERE ${dateCondition} ${complaintCondition}
    `;

    // 获取批次统计数据 - 根据时间范围筛选
    let batchStartDate, batchEndDate;

    switch (timeRange) {
      case '2months':
        const twoMonthsAgo2 = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        batchStartDate = twoMonthsAgo2.toISOString().split('T')[0];
        batchEndDate = now.toISOString().split('T')[0];
        break;
      case '3months':
        const threeMonthsAgo2 = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        batchStartDate = threeMonthsAgo2.toISOString().split('T')[0];
        batchEndDate = now.toISOString().split('T')[0];
        break;
      case '4months':
        const fourMonthsAgo2 = new Date(now.getFullYear(), now.getMonth() - 4, 1);
        batchStartDate = fourMonthsAgo2.toISOString().split('T')[0];
        batchEndDate = now.toISOString().split('T')[0];
        break;
      case '5months':
        const fiveMonthsAgo2 = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        batchStartDate = fiveMonthsAgo2.toISOString().split('T')[0];
        batchEndDate = now.toISOString().split('T')[0];
        break;
      case '6months':
        const sixMonthsAgo2 = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        batchStartDate = sixMonthsAgo2.toISOString().split('T')[0];
        batchEndDate = now.toISOString().split('T')[0];
        break;
      case '1year':
        const oneYearAgo2 = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        batchStartDate = oneYearAgo2.toISOString().split('T')[0];
        batchEndDate = now.toISOString().split('T')[0];
        break;
      case '2years':
        const twoYearsAgo2 = new Date(now.getFullYear() - 2, now.getMonth(), 1);
        batchStartDate = twoYearsAgo2.toISOString().split('T')[0];
        batchEndDate = now.toISOString().split('T')[0];
        break;
      default:
        const defaultStart2 = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        batchStartDate = defaultStart2.toISOString().split('T')[0];
        batchEndDate = now.toISOString().split('T')[0];
    }

    const startYear = new Date(batchStartDate).getFullYear();
    const startMonth = new Date(batchStartDate).getMonth() + 1;
    const endYear = new Date(batchEndDate).getFullYear();
    const endMonth = new Date(batchEndDate).getMonth() + 1;

    const batchSummaryQuery = `
      SELECT
        SUM(InspectionBatches) as totalInspectionBatches,
        SUM(DeliveryBatches) as totalDeliveryBatches
      FROM MonthlyBatchStats
      WHERE (StatYear = ${startYear} AND StatMonth >= ${startMonth})
         OR (StatYear > ${startYear} AND StatYear < ${endYear})
         OR (StatYear = ${endYear} AND StatMonth <= ${endMonth})
    `;

    const [complaintResult, batchResult] = await Promise.all([
      pool.request().query(complaintSummaryQuery),
      pool.request().query(batchSummaryQuery)
    ]);

    const complaintSummary = complaintResult.recordset[0];
    const batchSummary = batchResult.recordset[0];

    // 计算一次交检合格率和客诉率
    const totalInspectionBatches = batchSummary.totalInspectionBatches || 0;
    const totalDeliveryBatches = batchSummary.totalDeliveryBatches || 0;
    const innerComplaints = complaintSummary.innerComplaints || 0;
    const outerComplaints = complaintSummary.outerComplaints || 0;

    // 一次交检合格率 = (总交检批次 - 内诉批次) / 总交检批次 * 100%
    const firstPassRate = totalInspectionBatches > 0 ?
      (((totalInspectionBatches - innerComplaints) / totalInspectionBatches) * 100).toFixed(1) : '0.0';

    // 客诉率 = 客诉批次 / 总交货批次 * 100%
    const customerComplaintRate = totalDeliveryBatches > 0 ?
      ((outerComplaints / totalDeliveryBatches) * 100).toFixed(2) : '0.00';

    summaryData = {
      totalComplaints: complaintSummary.totalComplaints || 0,
      innerComplaints: innerComplaints,
      outerComplaints: outerComplaints,
      totalInspectionBatches: totalInspectionBatches,
      totalDeliveryBatches: totalDeliveryBatches,
      firstPassRate: firstPassRate,
      customerComplaintRate: customerComplaintRate,
      // 保留原有的投诉率计算（客诉占总投诉比例）
      complaintRate: complaintSummary.totalComplaints > 0 ?
        ((outerComplaints / complaintSummary.totalComplaints) * 100).toFixed(1) : '0.0'
    };

    // 根据维度获取不同的数据
    switch (dimension) {
      case 'time':
        // 计算需要返回的月份数量
        let monthCount = 6; // 默认6个月
        switch (timeRange) {
          case '2months': monthCount = 2; break;
          case '3months': monthCount = 3; break;
          case '4months': monthCount = 4; break;
          case '5months': monthCount = 5; break;
          case '6months': monthCount = 6; break;
          case '1year': monthCount = 12; break;
          case '2years': monthCount = 24; break;
        }

        const timeQuery = `
          SELECT
            YEAR(Date) as year,
            MONTH(Date) as month,
            RIGHT(CAST(YEAR(Date) AS nvarchar(4)), 2) + N'年' + CAST(MONTH(Date) AS nvarchar(2)) + N'月' as period,
            COUNT(*) as totalCount,
            SUM(CASE WHEN ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) as innerCount,
            SUM(CASE WHEN ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) as outerCount
          FROM ComplaintRegister
          WHERE ${dateCondition} ${complaintCondition}
          GROUP BY YEAR(Date), MONTH(Date)
          ORDER BY YEAR(Date), MONTH(Date)
        `;

        const timeResult = await pool.request().query(timeQuery);
        // 只取最近的指定月份数量
        chartData = timeResult.recordset.slice(-monthCount);
        tableData = chartData.map(item => ({
          ...item,
          rate: summaryData.totalComplaints > 0 ?
            ((item.totalCount / summaryData.totalComplaints) * 100).toFixed(1) : '0.0'
        }));
        break;

      case 'workshop':
        const workshopQuery = `
          SELECT
            Workshop as workshop,
            COUNT(*) as totalCount,
            SUM(CASE WHEN ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) as innerCount,
            SUM(CASE WHEN ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) as outerCount
          FROM ComplaintRegister
          WHERE ${dateCondition} ${complaintCondition} AND Workshop IS NOT NULL AND Workshop != ''
          GROUP BY Workshop
          ORDER BY COUNT(*) DESC
        `;

        const workshopResult = await pool.request().query(workshopQuery);
        chartData = workshopResult.recordset;
        tableData = chartData.map(item => ({
          ...item,
          rate: summaryData.totalComplaints > 0 ?
            ((item.totalCount / summaryData.totalComplaints) * 100).toFixed(1) : '0.0'
        }));
        break;

      case 'category':
        const categoryQuery = `
          SELECT
            DefectiveCategory as category,
            COUNT(*) as count
          FROM ComplaintRegister
          WHERE ${dateCondition} ${complaintCondition} AND DefectiveCategory IS NOT NULL AND DefectiveCategory != ''
          GROUP BY DefectiveCategory
          ORDER BY COUNT(*) DESC
        `;

        const categoryResult = await pool.request().query(categoryQuery);
        chartData = categoryResult.recordset;
        tableData = chartData.map(item => ({
          ...item,
          rate: summaryData.totalComplaints > 0 ?
            ((item.count / summaryData.totalComplaints) * 100).toFixed(1) : '0.0'
        }));
        break;

      case 'customer':
        const customerQuery = `
          SELECT
            Customer as customer,
            COUNT(*) as totalCount,
            SUM(CASE WHEN ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) as innerCount,
            SUM(CASE WHEN ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) as outerCount
          FROM ComplaintRegister
          WHERE ${dateCondition} ${complaintCondition} AND Customer IS NOT NULL AND Customer != ''
          GROUP BY Customer
          ORDER BY COUNT(*) DESC
        `;

        const customerResult = await pool.request().query(customerQuery);
        chartData = customerResult.recordset;
        tableData = chartData.map(item => ({
          ...item,
          rate: summaryData.totalComplaints > 0 ?
            ((item.totalCount / summaryData.totalComplaints) * 100).toFixed(1) : '0.0'
        }));
        break;
    }

    console.log('投诉数据分析结果:', {
      dimension,
      chartDataCount: chartData.length,
      tableDataCount: tableData.length,
      summaryData
    });

    res.json({
      success: true,
      chartData,
      tableData,
      summaryData
    });

  } catch (err) {
    console.error('投诉数据分析失败:', err);
    res.status(500).json({
      success: false,
      message: err.message,
      chartData: [],
      tableData: [],
      summaryData: {}
    });
  }
});

// ===================== 旧的附件路径处理（已废弃）=====================
// 注意：此路由已被下面的新版本替代，使用convertRelativePathToServerPath函数
// 删除此重复路由，避免与新版本冲突

// 标准化路径处理函数 - 统一处理数据库中的两种路径格式
function normalizeAttachmentPath(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') {
    return null;
  }

  let normalizedPath = pathValue.trim();

  // 修复HTML实体编码问题（&amp; -> &）
  normalizedPath = normalizedPath.replace(/&amp;/g, '&');

  // 处理格式1：file:///\\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\...
  if (normalizedPath.startsWith('file:///\\\\tj_server\\工作\\')) {
    // 移除file:///前缀，保留网络路径
    normalizedPath = normalizedPath.substring(8); // 移除'file:///'
    return {
      type: 'network_path',
      originalPath: pathValue,
      networkPath: normalizedPath,
      isAccessible: true,
      displayPath: normalizedPath.replace(/\\\\/g, '\\')
    };
  }

  // 处理格式2：2025年异常汇总\3月份\不良图片\...（相对路径）
  if (!normalizedPath.includes(':\\') && !normalizedPath.startsWith('\\\\')) {
    // 检查是否只是文件名（没有路径分隔符）
    if (!normalizedPath.includes('\\') && !normalizedPath.includes('/')) {
      // 纯文件名，尝试在默认的不良图片目录中查找
      const defaultPath = `2025年异常汇总\\不良图片&资料`;
      const serverIP = process.env.FILE_SERVER_IP || 'tj_server';
      const fullNetworkPath = `\\\\${serverIP}\\工作\\品质部\\生产异常周报考核统计\\${defaultPath}\\${normalizedPath}`;
      return {
        type: 'filename_only',
        originalPath: pathValue,
        networkPath: fullNetworkPath,
        isAccessible: true,
        displayPath: fullNetworkPath
      };
    } else {
      // 包含路径的相对路径
      const serverIP = process.env.FILE_SERVER_IP || 'tj_server';
      const fullNetworkPath = `\\\\${serverIP}\\工作\\品质部\\生产异常周报考核统计\\${normalizedPath}`;
      return {
        type: 'relative_path',
        originalPath: pathValue,
        networkPath: fullNetworkPath,
        isAccessible: true,
        displayPath: fullNetworkPath
      };
    }
  }

  // 处理其他格式（本地路径等）
  return {
    type: 'other',
    originalPath: pathValue,
    networkPath: normalizedPath,
    isAccessible: false,
    displayPath: normalizedPath
  };
}

// ===================== 旧的文件访问服务（已废弃）=====================
// 注意：此路由已被下面的新版本替代，使用convertRelativePathToServerPath函数
// 删除此重复路由，避免与新版本冲突

// ===================== 打开文件夹 =====================
// POST /api/complaint/open-folder
// 参数: { recordId, openFile }
// 返回: { success, message }
router.post('/open-folder', async (req, res) => {
  const { recordId, openFile = false } = req.body;

  console.log(`=== 打开文件夹服务 ===`);
  console.log(`投诉记录ID: ${recordId}`);
  console.log(`是否选中文件: ${openFile}`);

  if (!recordId) {
    return res.status(400).json({
      success: false,
      message: '缺少投诉记录ID'
    });
  }

  try {
    // 获取投诉记录的附件路径
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request()
      .input('id', sql.Int, recordId)
      .query('SELECT AttachmentPath FROM Complaint WHERE ID = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '投诉记录不存在'
      });
    }

    const attachmentPath = result.recordset[0].AttachmentPath;
    if (!attachmentPath) {
      return res.status(400).json({
        success: false,
        message: '该记录没有附件路径'
      });
    }

    // 构建完整的网络路径
    const fullPath = attachmentPath.startsWith('\\\\')
      ? attachmentPath
      : `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\2025年异常汇总\\${attachmentPath}`;

    console.log(`完整路径: ${fullPath}`);

    // 使用child_process执行Windows命令打开文件夹
    const { exec } = require('child_process');

    let command;
    if (openFile) {
      // 打开文件夹并选中文件
      command = `explorer /select,"${fullPath}"`;
    } else {
      // 只打开文件夹（获取文件夹路径）
      const folderPath = fullPath.substring(0, fullPath.lastIndexOf('\\'));
      command = `explorer "${folderPath}"`;
    }

    console.log(`执行命令: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('执行命令失败:', error);
        return res.status(500).json({
          success: false,
          message: '打开文件夹失败: ' + error.message
        });
      }

      console.log('文件夹打开成功');
      res.json({
        success: true,
        message: '文件夹已打开'
      });
    });

  } catch (error) {
    console.error('打开文件夹失败:', error);
    res.status(500).json({
      success: false,
      message: '打开文件夹失败: ' + error.message
    });
  }
});

// ===================== 获取附件文件路径信息 =====================
// GET /api/complaint/attachment-path/:id
// 参数: id (投诉记录ID)
// 返回: { success, path, displayPath, isAccessible, type }
router.get('/attachment-path/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }

    let pool = await sql.connect(await getDynamicConfig());

    const result = await pool.request()
      .input('ID', sql.Int, parseInt(id))
      .query('SELECT AttachmentFile FROM ComplaintRegister WHERE ID = @ID');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const attachmentFile = result.recordset[0].AttachmentFile;

    if (!attachmentFile) {
      return res.json({
        success: true,
        path: null,
        displayPath: '无附件文件',
        isAccessible: false,
        type: 'none'
      });
    }

    // 将相对路径转换为服务器路径
    const serverPath = await convertRelativePathToServerPath(attachmentFile);

    res.json({
      success: true,
      path: attachmentFile, // 原始相对路径
      displayPath: serverPath.displayPath, // 显示路径
      serverPath: serverPath.fullPath, // 服务器完整路径
      isAccessible: serverPath.isAccessible,
      type: 'relative_path'
    });

  } catch (error) {
    console.error('获取附件路径失败:', error);
    res.status(500).json({
      success: false,
      message: '获取附件路径失败: ' + error.message
    });
  }
});

// ===================== 获取附件文件内容 =====================
// GET /api/complaint/file/:id
// 参数: id (投诉记录ID)
// 返回: 文件内容流
router.get('/file/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }

    let pool = await sql.connect(await getDynamicConfig());

    const result = await pool.request()
      .input('ID', sql.Int, parseInt(id))
      .query('SELECT AttachmentFile FROM ComplaintRegister WHERE ID = @ID');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const attachmentFile = result.recordset[0].AttachmentFile;

    if (!attachmentFile) {
      return res.status(404).json({ success: false, message: '无附件文件' });
    }

    // 将相对路径转换为服务器文件路径
    const serverPath = await convertRelativePathToServerPath(attachmentFile);

    if (!serverPath.isAccessible) {
      return res.status(404).json({ success: false, message: '文件不存在或无法访问' });
    }

    const fs = require('fs');
    const path = require('path');

    // 检查文件是否存在
    if (!fs.existsSync(serverPath.fullPath)) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }

    // 获取文件信息
    const stat = fs.statSync(serverPath.fullPath);
    const fileName = path.basename(serverPath.fullPath);
    const ext = path.extname(fileName).toLowerCase();

    // 设置响应头
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);

    // 根据文件类型设置Content-Type
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // 创建文件流并发送
    const fileStream = fs.createReadStream(serverPath.fullPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('文件流错误:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: '文件读取失败' });
      }
    });

  } catch (error) {
    console.error('获取文件失败:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '获取文件失败: ' + error.message
      });
    }
  }
});

// 辅助函数：将相对路径转换为服务器路径
async function convertRelativePathToServerPath(relativePath) {
  if (!relativePath) {
    return {
      fullPath: null,
      displayPath: '无附件文件',
      isAccessible: false
    };
  }

  const path = require('path');
  const fs = require('fs');

  // 服务器存储基础路径 - 使用相对于当前工作目录的路径
  const baseServerPath = path.join(__dirname, '..', 'uploads', 'attachments');

  console.log(`=== 路径转换调试信息 ===`);
  console.log(`原始路径: ${relativePath}`);
  console.log(`基础路径: ${baseServerPath}`);

  // 处理特殊情况：如果只是"不良图片"这样的简单路径
  if (relativePath === '不良图片' || relativePath === '不良图片&资料') {
    // 查找最新的月份目录
    const yearDir = path.join(baseServerPath, '2025年异常汇总');
    if (fs.existsSync(yearDir)) {
      const monthDirs = fs.readdirSync(yearDir).filter(dir => {
        const fullPath = path.join(yearDir, dir);
        return fs.statSync(fullPath).isDirectory();
      }).sort().reverse(); // 按名称倒序，获取最新月份

      if (monthDirs.length > 0) {
        const latestMonthPath = path.join(yearDir, monthDirs[0]);
        console.log(`使用最新月份目录: ${latestMonthPath}`);
        return {
          fullPath: latestMonthPath,
          displayPath: `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\2025年异常汇总\\${monthDirs[0]}`,
          isAccessible: true
        };
      }
    }
  }

  // 尝试直接路径匹配
  let fullPath = path.join(baseServerPath, relativePath);
  let isAccessible = fs.existsSync(fullPath);

  console.log(`直接路径匹配: ${fullPath}, 存在: ${isAccessible}`);

  // 如果直接路径不存在，尝试路径映射
  if (!isAccessible) {
    // 尝试将"不良图片&资料"路径映射到实际的月份目录
    if (relativePath.includes('不良图片&资料')) {
      // 提取文件名
      const fileName = path.basename(relativePath);
      console.log(`提取文件名: ${fileName}`);

      // 在所有月份目录中查找文件
      const yearDir = path.join(baseServerPath, '2025年异常汇总');
      if (fs.existsSync(yearDir)) {
        const monthDirs = fs.readdirSync(yearDir).filter(dir => {
          const fullPath = path.join(yearDir, dir);
          return fs.statSync(fullPath).isDirectory();
        });

        for (const monthDir of monthDirs) {
          const searchPath = path.join(yearDir, monthDir, fileName);
          console.log(`搜索路径: ${searchPath}`);
          if (fs.existsSync(searchPath)) {
            fullPath = searchPath;
            isAccessible = true;
            console.log(`找到文件: ${fullPath}`);
            break;
          }
        }
      }
    }
  }

  // 构建显示路径（HTTP访问路径格式）
  // 将服务器本地路径转换为HTTP访问路径
  let displayPath;
  if (isAccessible && fullPath) {
    // 提取相对于uploads目录的路径
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const relativePath = path.relative(uploadsDir, fullPath);
    // 转换为URL路径格式，并进行URL编码
    const urlPath = relativePath.split(path.sep).map(part => encodeURIComponent(part)).join('/');
    displayPath = `/files/${urlPath}`;
    console.log(`生成HTTP访问路径: ${displayPath}`);
  } else {
    // 如果文件不存在，仍然显示原始的网络路径作为参考
    displayPath = `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${relativePath}`;
    console.log(`文件不存在，使用网络路径: ${displayPath}`);
  }

  console.log(`最终结果:
    完整路径: ${fullPath}
    文件存在: ${isAccessible}
    显示路径: ${displayPath}`);
  console.log(`=== 路径转换完成 ===`);

  return {
    fullPath: fullPath,
    displayPath: displayPath,
    isAccessible: isAccessible
  };
}

// 获取流水号API
router.get('/sequence-number', async (req, res) => {
  try {
    const { date, editId } = req.query

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '日期参数不能为空'
      })
    }

    console.log(`获取流水号请求: 日期=${date}, 编辑ID=${editId}`)

    // 查询指定日期的记录数量
    let query = 'SELECT COUNT(*) as count FROM ComplaintRegister WHERE CAST(Date as DATE) = @date'

    const pool = await sql.connect(await getDynamicConfig())
    const request = pool.request()
    request.input('date', sql.Date, date)

    // 如果是编辑模式，排除当前记录
    if (editId) {
      query += ' AND ID != @editId'
      request.input('editId', sql.Int, editId)
    }

    const result = await request.query(query)
    const count = result.recordset[0].count
    const sequenceNumber = count + 1

    console.log(`日期 ${date} 的记录数量: ${count}, 流水号: ${sequenceNumber}`)

    res.json({
      success: true,
      sequenceNumber: sequenceNumber
    })

  } catch (error) {
    console.error('获取流水号失败:', error)
    res.status(500).json({
      success: false,
      message: '获取流水号失败: ' + error.message
    })
  }
})

module.exports = router;