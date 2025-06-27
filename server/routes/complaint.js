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
// 参数: page, pageSize
// 返回: { success, data, total }
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    let pool = await sql.connect(await getDynamicConfig());
    // 获取总数
    const countResult = await pool.request()
      .query(`SELECT COUNT(*) AS total FROM ComplaintRegister WHERE Date >= DATEADD(year, -1, GETDATE()) AND Date <= GETDATE()`);
    const total = countResult.recordset[0].total;
    // ROW_NUMBER分页
    const result = await pool.request()
      .query(`SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (ORDER BY Date DESC, ID DESC) AS RowNum
        FROM ComplaintRegister
        WHERE Date >= DATEADD(year, -1, GETDATE()) AND Date <= GETDATE()
      ) AS T
      WHERE T.RowNum BETWEEN ${offset + 1} AND ${offset + pageSize}
      ORDER BY T.RowNum`);
    res.json({ success: true, data: result.recordset, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================== 首页统计卡片数据接口 =====================
// GET /api/complaint/month-stats
// 返回: 今日投诉数、本月投诉数、各单位统计
router.get('/month-stats', async (req, res) => {
  try {
    let pool = await sql.connect(await getDynamicConfig());
    // 今日投诉数
    const todayResult = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE Date = CONVERT(date, GETDATE())`);
    // 本月总投诉数
    const monthResult = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE YEAR(Date) = YEAR(GETDATE()) AND MONTH(Date) = MONTH(GETDATE())`);
    // 单位列表
    const units = ['数码印刷', '轮转机', '跟单', '设计', '品检', '品检'];
    // 统计每个单位的内诉/客诉
    const unitStats = [];
    for (const unit of units) {
      // 内诉
      const innerRes = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE YEAR(Date) = YEAR(GETDATE()) AND MONTH(Date) = MONTH(GETDATE()) AND Workshop = N'${unit}' AND ComplaintCategory = N'内诉'`);
      // 客诉
      const outerRes = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ComplaintRegister WHERE YEAR(Date) = YEAR(GETDATE()) AND MONTH(Date) = MONTH(GETDATE()) AND Workshop = N'${unit}' AND ComplaintCategory = N'客诉'`);
      unitStats.push({ unit, inner: innerRes.recordset[0].cnt, outer: outerRes.recordset[0].cnt });
    }
    res.json({
      success: true,
      todayCount: todayResult.recordset[0].cnt,
      monthCount: monthResult.recordset[0].cnt,
      units: unitStats
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router; 