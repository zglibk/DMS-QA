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

// ===================== 下拉选项数据接口 =====================
// GET /api/complaint/options
// 返回: 各类下拉选项数据
router.get('/options', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());
    const [workshops, depts, persons, complaintCats, customerTypes, defectiveCats] = await Promise.all([
      pool.request().query('SELECT Name FROM Workshop'),
      pool.request().query('SELECT Name FROM Department'),
      pool.request().query('SELECT Name FROM Person'),
      pool.request().query('SELECT Name FROM ComplaintCategory'),
      pool.request().query('SELECT Name FROM CustomerComplaintType'),
      pool.request().query('SELECT ID, Name FROM DefectiveCategory')
    ]);
    res.json({
      workshops: workshops.recordset.map(r => r.Name),
      departments: depts.recordset.map(r => r.Name),
      persons: persons.recordset.map(r => r.Name),
      complaintCategories: complaintCats.recordset.map(r => r.Name),
      customerComplaintTypes: customerTypes.recordset.map(r => r.Name),
      defectiveCategories: defectiveCats.recordset,
      defectiveItems: []
    });
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
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request()
      .input('CategoryID', sql.Int, categoryId)
      .query('SELECT Name FROM DefectiveItem WHERE CategoryID = @CategoryID');
    res.json(result.recordset.map(r => r.Name));
  } catch (err) {
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
      workshop,         // 车间
      complaintCategory, // 投诉类别
      startDate,        // 开始日期
      endDate,          // 结束日期
      defectiveRateMin, // 最小不良率
      defectiveRateMax  // 最大不良率
    } = req.query;

    let pool = await sql.connect(await getDynamicConfig());

    // 构建搜索条件
    let whereClause = 'WHERE Date >= DATEADD(year, -1, GETDATE()) AND Date <= GETDATE()';

    // 如果有高级查询参数，则使用高级查询
    if (customer || orderNo || workshop || complaintCategory || startDate || endDate ||
        defectiveRateMin !== undefined || defectiveRateMax !== undefined) {

      // 客户查询
      if (customer) {
        whereClause += ` AND Customer LIKE N'%${customer}%'`;
      }

      // 工单号查询
      if (orderNo) {
        whereClause += ` AND OrderNo LIKE N'%${orderNo}%'`;
      }

      // 车间查询
      if (workshop) {
        whereClause += ` AND Workshop = N'${workshop}'`;
      }

      // 投诉类别查询
      if (complaintCategory) {
        whereClause += ` AND ComplaintCategory = N'${complaintCategory}'`;
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
// 返回: 今日投诉数、本月投诉数、各单位统计
router.get('/month-stats', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());

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
      const monthResult = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE YEAR(Date) = YEAR(GETDATE()) AND MONTH(Date) = MONTH(GETDATE())`);
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
      const innerRes = await pool.request().query(`
        SELECT COUNT(*) AS cnt
        FROM ComplaintRegister
        WHERE YEAR(Date) = YEAR(GETDATE())
          AND MONTH(Date) = MONTH(GETDATE())
          AND ${fieldName} = N'${unit.name}'
          AND ComplaintCategory = N'内诉'
      `);

      // 客诉
      const outerRes = await pool.request().query(`
        SELECT COUNT(*) AS cnt
        FROM ComplaintRegister
        WHERE YEAR(Date) = YEAR(GETDATE())
          AND MONTH(Date) = MONTH(GETDATE())
          AND ${fieldName} = N'${unit.name}'
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

module.exports = router;