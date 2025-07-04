const express = require('express');
const router = express.Router();
const { sql, config, getDynamicConfig } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// ===================== 新增投诉登记 =====================
// POST /api/complaint
// 参数: 投诉表单所有字段
// 返回: { success, message, id }
router.post('/', async (req, res) => {
  const data = req.body;
  // 必填字段校验
  const requiredFields = [
    'Date', 'Customer', 'OrderNo', 'ProductName', 'Workshop', 'ProductionQty',
    'ComplaintCategory', 'DefectiveCategory', 'DefectiveDescription', 'DefectiveItem',
    'Disposition', 'MainDept', 'MainPerson'
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
      .input('ReturnGoods', sql.Bit, data.ReturnGoods)
      .input('IsReprint', sql.Bit, data.IsReprint)
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
      isReprint         // 补印状态
    } = req.query;

    let pool = await sql.connect(await getDynamicConfig());

    // 构建搜索条件
    let whereClause = 'WHERE Date >= DATEADD(year, -1, GETDATE()) AND Date <= GETDATE()';

    // 如果有高级查询参数，则使用高级查询
    if (customer || orderNo || productName || workshop || complaintCategory || customerComplaintType ||
        defectiveCategory || mainDept || mainPerson || startDate || endDate ||
        defectiveRateMin !== undefined || defectiveRateMax !== undefined ||
        returnGoods !== undefined || isReprint !== undefined) {

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
      // 检查表是否存在
      const tableCheckResult = await pool.request()
        .query(`SELECT COUNT(*) as count FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HomeCardConfig]') AND type in (N'U')`);

      if (tableCheckResult.recordset[0].count > 0) {
        // 表存在，获取配置
        const configResult = await pool.request()
          .query(`SELECT ConfigKey, ConfigValue FROM HomeCardConfig WHERE IsActive = 1`);

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
    let monthCount = 0;

    // 根据配置获取统计数据
    if (showTodayCount) {
      const todayResult = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE Date = CONVERT(date, GETDATE())`);
      todayCount = todayResult.recordset[0].cnt;
    }

    if (showMonthCount) {
      const monthResult = await pool.request()
        .input('TargetYear', sql.Int, targetYear)
        .input('TargetMonth', sql.Int, targetMonth)
        .query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE YEAR(Date) = @TargetYear AND MONTH(Date) = @TargetMonth`);
      monthCount = monthResult.recordset[0].cnt;
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
      monthCount,
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

module.exports = router;