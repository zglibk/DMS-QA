/**
 * 质量目标管理路由
 * 功能：处理质量目标相关的API请求
 * 包括目标录入、统计分析、图表展示等业务
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getConnection } = require('../db');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { estimateTextLines } = require('../utils/textUtils');

/**
 * 解析目标值字符串，提取比较符号和数值
 * @param {string} targetValue - 目标值字符串，如 "≤95.00"、"≥98%"、"≤2%"、"≤1次"、"≥2次"
 * @returns {object} - 返回 { operator: string, value: number, isPercentage: boolean, unit: string }
 */
function parseTargetValue(targetValue) {
  if (!targetValue || typeof targetValue !== 'string') {
    return { operator: null, value: null, isPercentage: false, unit: null };
  }
  
  // 移除空格
  const cleanValue = targetValue.trim();
  
  // 匹配模式：比较符号 + 数字 + 可选的单位（%或次）
  const match = cleanValue.match(/^([≤≥<>=]+)([0-9.]+)(%|次?)$/);
  
  if (!match) {
    // 如果没有比较符号，尝试直接解析数字和单位
    const numMatch = cleanValue.match(/^([0-9.]+)(%|次?)$/);
    if (numMatch) {
      const unit = numMatch[2];
      return {
        operator: '=',
        value: parseFloat(numMatch[1]),
        isPercentage: unit === '%',
        unit: unit || null
      };
    }
    return { operator: null, value: null, isPercentage: false, unit: null };
  }
  
  const operator = match[1];
  const value = parseFloat(match[2]);
  const unit = match[3];
  const isPercentage = unit === '%';
  
  // 标准化操作符
  let normalizedOperator = operator;
  if (operator === '≤') normalizedOperator = '<=';
  if (operator === '≥') normalizedOperator = '>=';
  
  return {
    operator: normalizedOperator,
    value: value,
    isPercentage: isPercentage,
    unit: unit || null
  };
}

/**
 * 判断实际值是否达成目标
 * @param {number} actualValue - 实际值
 * @param {string} targetValue - 目标值字符串
 * @returns {string} - 返回达成状态：'达成'、'接近'、'未达成'
 */
function checkAchievement(actualValue, targetValue) {
  if (actualValue === null || actualValue === undefined) {
    return '无数据';
  }
  
  const parsed = parseTargetValue(targetValue);
  if (parsed.operator === null || parsed.value === null) {
    return '目标值格式错误';
  }
  
  let targetNum = parsed.value;
  let actualNum = parseFloat(actualValue);
  
  // 修复百分比处理逻辑
  if (parsed.isPercentage) {
    // 如果目标值是百分比，确保实际值也是相同的百分比格式
    // 检查实际值是否包含%符号或者是否为小数形式
    const actualStr = String(actualValue).trim();
    if (actualStr.includes('%')) {
      // 如果实际值包含%符号，提取数字部分
      actualNum = parseFloat(actualStr.replace('%', ''));
    } else if (actualNum <= 1 && actualNum > 0) {
      // 如果实际值是0-1之间的小数，转换为百分比
      actualNum = actualNum * 100;
    }
    // 如果实际值大于1且不包含%，假设已经是百分比形式，保持不变
  }
  
  let isAchieved = false;
  let isApproaching = false;
  
  switch (parsed.operator) {
    case '>=':
    case '≥':
      isAchieved = actualNum >= targetNum;
      isApproaching = actualNum >= targetNum * 0.9; // 90%以上算接近
      break;
    case '<=':
    case '≤':
      isAchieved = actualNum <= targetNum;
      isApproaching = actualNum <= targetNum * 1.1; // 110%以内算接近
      break;
    case '>':
      isAchieved = actualNum > targetNum;
      isApproaching = actualNum > targetNum * 0.9;
      break;
    case '<':
      isAchieved = actualNum < targetNum;
      isApproaching = actualNum < targetNum * 1.1;
      break;
    case '=':
    default:
      const tolerance = targetNum * 0.05; // 5%容差
      isAchieved = Math.abs(actualNum - targetNum) <= tolerance;
      isApproaching = Math.abs(actualNum - targetNum) <= tolerance * 2;
      break;
  }
  
  if (isAchieved) return '达成';
  if (isApproaching) return '接近';
  return '未达成';
}

/**
 * 计算达成率
 * @param {number} actualValue - 实际值
 * @param {string} targetValue - 目标值字符串
 * @returns {number} - 达成率百分比
 */
function calculateAchievementRate(actualValue, targetValue) {
  if (actualValue === null || actualValue === undefined) {
    return 0;
  }
  
  const parsed = parseTargetValue(targetValue);
  if (parsed.operator === null || parsed.value === null) {
    return 0;
  }
  
  let targetNum = parsed.value;
  let actualNum = parseFloat(actualValue);
  
  // 修复百分比处理逻辑
  if (parsed.isPercentage) {
    // 如果目标值是百分比，确保实际值也是相同的百分比格式
    // 检查实际值是否包含%符号或者是否为小数形式
    const actualStr = String(actualValue).trim();
    if (actualStr.includes('%')) {
      // 如果实际值包含%符号，提取数字部分
      actualNum = parseFloat(actualStr.replace('%', ''));
    } else if (actualNum <= 1 && actualNum > 0) {
      // 如果实际值是0-1之间的小数，转换为百分比
      actualNum = actualNum * 100;
    }
    // 如果实际值大于1且不包含%，假设已经是百分比形式，保持不变
  }
  
  // 根据操作符计算达成率
  switch (parsed.operator) {
    case '>=':
    case '≥':
    case '>':
      return targetNum > 0 ? Math.min((actualNum / targetNum) * 100, 200) : 0;
    case '<=':
    case '≤':
    case '<':
      // 对于小于等于的目标，达成率计算方式不同
      if (actualNum <= targetNum) {
        return 100; // 达成目标
      } else {
        // 超出目标，达成率递减
        return Math.max(100 - ((actualNum - targetNum) / targetNum) * 100, 0);
      }
    case '=':
    default:
      return targetNum > 0 ? Math.min((actualNum / targetNum) * 100, 200) : 0;
  }
}

// 配置文件上传（用于导入Excel等）
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/quality-targets');
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
    const allowedTypes = /xlsx|xls|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('spreadsheet');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传Excel和CSV文件'));
    }
  }
});

// =====================================================
// 质量目标管理 API
// =====================================================

/**
 * 获取质量目标列表
 * GET /api/quality-targets
 * 支持分页、搜索、筛选
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      category = '',
      assessmentUnit = '',
      responsiblePerson = '',
      statisticsFrequency = '',
      year = new Date().getFullYear()
    } = req.query;
    
    const offset = (page - 1) * size;
    const pool = await getConnection();
    
    // 构建查询条件
    let whereConditions = ['qt.IsDeleted = 0']; // 排除已删除的记录
    let queryParams = [];
    
    if (keyword) {
      whereConditions.push('(qt.QualityTarget LIKE @keyword OR qt.CalculationFormula LIKE @keyword OR qt.Measures LIKE @keyword)');
      queryParams.push({ name: 'keyword', type: sql.NVarChar(100), value: `%${keyword}%` });
    }
    
    if (category) {
      whereConditions.push('qt.TargetCategory = @category');
      queryParams.push({ name: 'category', type: sql.NVarChar(50), value: category });
    }
    
    if (assessmentUnit) {
      whereConditions.push('qt.AssessmentUnit = @assessmentUnit');
      queryParams.push({ name: 'assessmentUnit', type: sql.NVarChar(100), value: assessmentUnit });
    }
    
    if (responsiblePerson) {
      whereConditions.push('qt.ResponsiblePerson = @responsiblePerson');
      queryParams.push({ name: 'responsiblePerson', type: sql.NVarChar(50), value: responsiblePerson });
    }
    
    if (statisticsFrequency) {
      whereConditions.push('qt.StatisticsFrequency = @statisticsFrequency');
      queryParams.push({ name: 'statisticsFrequency', type: sql.NVarChar(20), value: statisticsFrequency });
    }
    
    if (year) {
      whereConditions.push('qt.TargetYear = @year');
      queryParams.push({ name: 'year', type: sql.Int, value: parseInt(year) });
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM QualityTargets qt
      WHERE ${whereClause}
    `;
    
    // 查询数据 - 使用ROW_NUMBER()实现分页以兼容SQL Server 2008R2
    const dataQuery = `
      SELECT * FROM (
        SELECT 
          qt.ID,
          qt.TargetYear,
          qt.TargetCategory,
          qt.AssessmentUnit,
          qt.QualityTarget,
          qt.CalculationFormula,
          qt.TargetValue,
          qt.Measures,
          qt.ResponsiblePerson,
          qt.StatisticsFrequency,
          qt.Status,
          qt.Description,
          qt.CreatedAt,
          qt.UpdatedAt,
          qt.CreatedBy,
          qt.UpdatedBy,
          ROW_NUMBER() OVER (ORDER BY qt.CreatedAt DESC) as RowNum
        FROM QualityTargets qt
        WHERE ${whereClause}
      ) AS PagedResults
      WHERE RowNum > @offset AND RowNum <= (@offset + @size)
    `;
    
    // 执行查询
    const countRequest = pool.request();
    const dataRequest = pool.request();
    
    // 添加参数
    queryParams.forEach(param => {
      countRequest.input(param.name, param.type, param.value);
      dataRequest.input(param.name, param.type, param.value);
    });
    
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('size', sql.Int, parseInt(size));
    
    const [countResult, dataResult] = await Promise.all([
      countRequest.query(countQuery),
      dataRequest.query(dataQuery)
    ]);
    
    const total = countResult.recordset[0].total;
    const records = dataResult.recordset;
    
    // 质量目标列表查询完成
    
    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          size: parseInt(size),
          total,
          pages: Math.ceil(total / size)
        }
      }
    });
    
  } catch (error) {
    console.error('获取质量目标列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取质量目标列表失败',
      error: error.message
    });
  }
});

/**
 * 获取所有选项数据
 * GET /api/quality-targets/options
 */
router.get('/options', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // 获取目标分类选项：根据数据库CHECK约束，只允许'公司'和'部门'
    const categories = ['公司', '部门'];
    
    // 获取部门数据用于考核单位选项
    const departmentsQuery = `
      SELECT Name
      FROM Department
      ORDER BY Name
    `;
    const departmentsResult = await pool.request().query(departmentsQuery);
    const departmentNames = departmentsResult.recordset.map(row => row.Name);
    
    // 获取考核单位选项：部门数据（包含珠海腾佳）
    const units = departmentNames;
    
    // 获取责任人选项：从人员表获取"人员（部门）"格式
    const personsQuery = `
      SELECT p.Name as PersonName, d.Name as DepartmentName
      FROM Person p
      LEFT JOIN Department d ON p.DepartmentID = d.ID
      ORDER BY p.Name
    `;
    const personsResult = await pool.request().query(personsQuery);
    const persons = personsResult.recordset.map(row => {
      const departmentName = row.DepartmentName || '未分配部门';
      return `${row.PersonName}（${departmentName}）`;
    });
    
    const responseData = {
      success: true,
      data: {
        categories,
        units,
        persons
      }
    };
    
    // 质量目标选项数据获取完成
    
    res.json(responseData);
    
  } catch (error) {
    console.error('获取选项数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取选项数据失败',
      error: error.message
    });
  }
});

/**
 * 导出质量目标数据
 * GET /api/quality-targets/export
 */
router.get('/export', async (req, res) => {
  try {
    const {
      category = '',
      assessmentUnit = '',
      responsiblePerson = '',
      year = new Date().getFullYear(),
      targetName = '',
      keyword = '',
      statisticsFrequency = ''
    } = req.query;
    
    const pool = await getConnection();
    
    // 构建查询条件
    let whereConditions = ['qt.IsDeleted = 0'];
    let queryParams = [];
    
    // 处理关键词搜索 (支持 targetName 或 keyword 参数)
    const searchKeyword = targetName || keyword;
    if (searchKeyword) {
      whereConditions.push('(qt.QualityTarget LIKE @keyword OR qt.CalculationFormula LIKE @keyword OR qt.Measures LIKE @keyword)');
      queryParams.push({ name: 'keyword', type: sql.NVarChar(100), value: `%${searchKeyword}%` });
    }
    
    if (category) {
      whereConditions.push('qt.TargetCategory = @category');
      queryParams.push({ name: 'category', type: sql.NVarChar(50), value: category });
    }
    
    if (assessmentUnit) {
      whereConditions.push('qt.AssessmentUnit = @assessmentUnit');
      queryParams.push({ name: 'assessmentUnit', type: sql.NVarChar(100), value: assessmentUnit });
    }
    
    if (responsiblePerson) {
      whereConditions.push('qt.ResponsiblePerson = @responsiblePerson');
      queryParams.push({ name: 'responsiblePerson', type: sql.NVarChar(50), value: responsiblePerson });
    }
    
    if (statisticsFrequency) {
      whereConditions.push('qt.StatisticsFrequency = @statisticsFrequency');
      queryParams.push({ name: 'statisticsFrequency', type: sql.NVarChar(20), value: statisticsFrequency });
    }
    
    if (year) {
      whereConditions.push('qt.TargetYear = @year');
      queryParams.push({ name: 'year', type: sql.Int, value: parseInt(year) });
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
      SELECT 
        qt.TargetCategory,
        qt.AssessmentUnit,
        qt.QualityTarget,
        qt.CalculationFormula,
        qt.TargetValue,
        qt.Measures,
        qt.ResponsiblePerson,
        qt.StatisticsFrequency,
        qt.Description,
        qt.CreatedAt,
        qt.CreatedBy
      FROM QualityTargets qt
      WHERE ${whereClause}
      ORDER BY 
        CASE WHEN qt.TargetCategory = '公司' THEN 0 ELSE 1 END,
        qt.AssessmentUnit, 
        qt.ID
    `;
    
    const request = pool.request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    const records = result.recordset;

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到符合条件的数据'
      });
    }

    // 分离总目标和部门目标
    const companyTargets = records.filter(r => r.TargetCategory === '公司');
    const departmentTargets = records.filter(r => r.TargetCategory !== '公司');

    // 计算生效日期：取该年度最早创建的目标的日期，并推迟一周（7天）作为生效日期
    let effectiveDate = `${year}-01-08`; // 默认值（假设1月1日创建，推迟7天）
    if (records.length > 0) {
      // 找到最早的 CreatedAt
      const earliestDate = records.reduce((min, p) => {
         const pDate = new Date(p.CreatedAt);
         return pDate < min ? pDate : min;
      }, new Date(records[0].CreatedAt));
      
      // 找到最早的记录 (逻辑修正：确保是按CreatedAt排序后的第一条)
      // 为了稳妥，我们手动对records按CreatedAt进行一次排序，取第一条
      const sortedRecords = [...records].sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));
      const earliestRecord = sortedRecords[0];
      
      // 推迟7天作为生效日期
      const targetDate = new Date(earliestRecord.CreatedAt);
      targetDate.setDate(targetDate.getDate() + 7);
      
      // 格式化为 YYYY-MM-DD
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getDate()).padStart(2, '0');
      effectiveDate = `${y}-${m}-${d}`;
    }

    // 计算编制信息：取该年度最早创建的目标的创建人和创建日期
    let makerName = '系统管理员';
    let makerDate = new Date().toISOString().slice(0, 10);
    
    if (records.length > 0) {
      // 找到最早的记录
      const sortedRecords = [...records].sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));
      const earliestRecord = sortedRecords[0];
      
      // 通过CreatedBy（用户名）查询用户真实姓名
      if (earliestRecord.CreatedBy && earliestRecord.CreatedBy.trim() !== '') {
        try {
          const userResult = await pool.request()
            .input('username', sql.NVarChar, earliestRecord.CreatedBy.trim())
            .query('SELECT RealName FROM [User] WHERE Username = @username');
          if (userResult.recordset.length > 0 && userResult.recordset[0].RealName) {
            makerName = userResult.recordset[0].RealName.trim();
          } else {
            // 如果找不到真实姓名，使用CreatedBy原值
            makerName = earliestRecord.CreatedBy;
          }
        } catch (e) {
          // 查询失败时使用CreatedBy原值
          makerName = earliestRecord.CreatedBy;
        }
      }
      
      const eDate = new Date(earliestRecord.CreatedAt);
      makerDate = eDate.toISOString().slice(0, 10);
    }

    // 使用ExcelJS生成Excel文件
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('质量目标');

    // 设置页面边距 (单位：英寸，0.3英寸约等于0.76厘米，0.5英寸约等于1.27厘米)
    // 用户期望页边距：左0.5厘米，右0.3厘米
    // 换算为英寸：0.5cm ≈ 0.2inch, 0.3cm ≈ 0.12inch
    worksheet.pageSetup.margins = {
      left: 0.2, right: 0.12,
      top: 0.4, bottom: 0.4,
      header: 0.3, footer: 0.3
    };
    
    // 设置列 (A-J列)
    // A: 部门名称, B: 质量目标, C+D: 计算公式, E: 目标值, F+G+H: 保证达标的措施, I: 责任人, J: 统计频次
    // 用户期望列宽: A=5.5, B=9.25, C=8.75, D=11.38, E=6.75, F=14.5, G=11, H=12, I=8.38, J=9.88
    // ExcelJS设置值需补偿偏差(+0.63): A=6.13, B=9.88, C=9.38, D=12.01, E=7.38, F=15.13, G=11.63, H=12.63, I=9.01, J=10.51
    worksheet.columns = [
      { key: 'AssessmentUnit', width: 6.13 },       // A 部门名称
      { key: 'QualityTarget', width: 9.88 },        // B 质量目标
      { key: 'CalculationFormula', width: 9.38 },   // C 计算公式 (合并起始)
      { key: 'FormulaPlaceholder', width: 12.01 },  // D (合并)
      { key: 'TargetValue', width: 7.38 },          // E 目标值
      { key: 'Measures', width: 15.13 },            // F 措施 (合并起始)
      { key: 'MeasuresPlaceholder1', width: 11.63 },// G (合并)
      { key: 'MeasuresPlaceholder2', width: 12.63 },// H (合并)
      { key: 'ResponsiblePerson', width: 9.01 },    // I 责任人
      { key: 'StatisticsFrequency', width: 10.51 }  // J 统计频次
    ];
    
    // 全局默认字体
    worksheet.eachRow(row => {
      row.font = { name: '宋体', size: 10 };
    });

    // ==========================================
    // 1. 设置复杂表头 (Row 1 & Row 2)
    // ==========================================
    
    // 设置行高
    worksheet.getRow(1).height = 24.75;
    worksheet.getRow(2).height = 36;
    worksheet.getRow(3).height = 4.5; // 空白间隔行

    // ---------------- Row 1 ----------------
    // A1:F1 合并 -> "珠海腾佳印务有限公司"
    worksheet.mergeCells('A1:F1');
    const cellA1 = worksheet.getCell('A1');
    cellA1.value = '珠海腾佳印务有限公司';
    cellA1.font = { name: '宋体', size: 11 };
    cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

    // G1 -> "文件编号"
    const cellG1 = worksheet.getCell('G1');
    cellG1.value = '文件编号';
    cellG1.font = { name: '宋体', size: 11, bold: true };
    cellG1.alignment = { horizontal: 'center', vertical: 'middle' };

    // H1 -> "WI-XZ-01"
    const cellH1 = worksheet.getCell('H1');
    cellH1.value = 'WI-XZ-01';
    cellH1.font = { name: '宋体', size: 11 };
    cellH1.alignment = { horizontal: 'center', vertical: 'middle' };

    // I1 -> "版本"
    const cellI1 = worksheet.getCell('I1');
    cellI1.value = '版本';
    cellI1.font = { name: '宋体', size: 11, bold: true };
    cellI1.alignment = { horizontal: 'center', vertical: 'middle' };

    // J1 -> "B/0"
    const cellJ1 = worksheet.getCell('J1');
    cellJ1.value = 'B/0';
    cellJ1.font = { name: '宋体', size: 11 };
    cellJ1.alignment = { horizontal: 'center', vertical: 'middle' };

    // ---------------- Row 2 ----------------
    // A2 -> "标题"
    const cellA2 = worksheet.getCell('A2');
    cellA2.value = '标题';
    cellA2.font = { name: '宋体', size: 11, bold: true };
    cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

    // B2:F2 合并 -> "公司及各部门质量目标"
    worksheet.mergeCells('B2:F2');
    const cellB2 = worksheet.getCell('B2');
    cellB2.value = '公司及各部门质量目标';
    cellB2.font = { name: '宋体', size: 16, bold: true };
    cellB2.alignment = { horizontal: 'center', vertical: 'middle' };

    // G2 -> "页      码"
    const cellG2 = worksheet.getCell('G2');
    cellG2.value = '页    码';
    cellG2.font = { name: '宋体', size: 11, bold: true };
    cellG2.alignment = { horizontal: 'center', vertical: 'middle' };

    // H2 -> "第1页,共1页"
    const cellH2 = worksheet.getCell('H2');
    cellH2.value = '第1页,共1页';
    cellH2.font = { name: '宋体', size: 11 };
    cellH2.alignment = { horizontal: 'center', vertical: 'middle' };

    // I2 -> "生效日期"
    const cellI2 = worksheet.getCell('I2');
    cellI2.value = '生效日期';
    cellI2.font = { name: '宋体', size: 11, bold: true };
    cellI2.alignment = { horizontal: 'center', vertical: 'middle' };

    // J2 -> "（空）" (实际内容应为生效日期值，或者留空等待填写，此处根据需求设为空或具体日期)
    // 根据"J1 (空)"的描述，可能是指J2填空内容，这里填入具体的生效日期
    const cellJ2 = worksheet.getCell('J2');
    cellJ2.value = effectiveDate; 
    cellJ2.font = { name: '宋体', size: 11 };
    cellJ2.alignment = { horizontal: 'center', vertical: 'middle' };

    // 为表头区域添加边框 (A1:J2)
    for (let r = 1; r <= 2; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= 10; c++) {
        const cell = row.getCell(c);
        // 如果不是合并单元格的一部分（或者合并单元格的主单元格），添加边框
        // ExcelJS会自动处理合并单元格的边框，只要给主单元格设置即可
        if (cell.isMerged && cell.address !== cell.master.address) continue;
        
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }


    // 4. 总目标行 (合并 A4:J4)
    let totalTargetText = '总目标：\n';
    companyTargets.forEach((t, index) => {
        totalTargetText += `${index + 1}、${t.QualityTarget}${t.TargetValue}；  `;
    });
    if (companyTargets.length === 0) {
      totalTargetText += '（暂无设定）';
    }

    worksheet.mergeCells('A4:J4');
    const totalTargetCell = worksheet.getCell('A4');
    totalTargetCell.value = totalTargetText;
    totalTargetCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    totalTargetCell.font = { name: '宋体', size: 11 };
    totalTargetCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    worksheet.getRow(4).height = 39.75; // 更新为39.75

    // 5. 表头行 (从第5行开始)
    const headerRow = worksheet.getRow(5);
    headerRow.values = ['部门名称', '质量目标', '计算公式', '', '目标值', '保证达标的措施', '', '', '责任人', '统计频次'];
    // 合并表头单元格
    worksheet.mergeCells('C5:D5'); // 计算公式
    worksheet.mergeCells('F5:H5'); // 保证达标的措施
    
    headerRow.height = 40;
    headerRow.eachCell((cell) => {
      cell.font = { name: '黑体', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000080' } // 深蓝色背景
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      // 优化：表头自动换行
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // 6. 数据行 (从第6行开始)
    let currentRowIndex = 6;
    let unitStartRow = 6;
    let personStartRow = 6;
    
    if (departmentTargets.length > 0) {
        departmentTargets.forEach((record, index) => {
            // 处理责任人名称：去除括号及其中内容
            const rawPerson = record.ResponsiblePerson || '';
            const cleanPerson = rawPerson.replace(/[\(\（].*?[\)\）]/g, '').trim();

            const row = worksheet.addRow([
                record.AssessmentUnit,        // A
                record.QualityTarget,         // B
                record.CalculationFormula || '', // C
                '',                           // D (merged with C)
                record.TargetValue,           // E
                record.Measures || '',        // F
                '',                           // G (merged with F)
                '',                           // H (merged with F)
                cleanPerson,                  // I
                record.StatisticsFrequency    // J
            ]);
            
            // 合并当前行的单元格
            worksheet.mergeCells(`C${currentRowIndex}:D${currentRowIndex}`); // 计算公式
            worksheet.mergeCells(`F${currentRowIndex}:H${currentRowIndex}`); // 措施
            
            // 设置数据行样式
            row.eachCell((cell) => {
                cell.font = { name: '宋体', size: 10 };
                cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // 强制设置合并单元格的对齐方式 (左对齐)
            // C列 (计算公式)
            const formulaCell = worksheet.getCell(`C${currentRowIndex}`);
            formulaCell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
            
            // F列 (保证达标的措施)
            const measuresCell = worksheet.getCell(`F${currentRowIndex}`);
            measuresCell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'left' };
            
            // 自动计算行高
            let maxLines = 1;

            // 根据新的列宽调整估算参数 (近似值)
            // A=5.5, B=9.25, C+D=5.75+11.38=17.13, E=5, F+G+H=13.5+11+12=36.5, I=8.38
            // 稍微放宽宽度参数，避免临界值导致多算一行
            maxLines = Math.max(maxLines, estimateTextLines(record.AssessmentUnit, 6));
            maxLines = Math.max(maxLines, estimateTextLines(record.QualityTarget, 10));
            // 放宽计算公式和措施的宽度估算，防止过度换行
            maxLines = Math.max(maxLines, estimateTextLines((record.CalculationFormula || '').trim(), 20)); 
            maxLines = Math.max(maxLines, estimateTextLines((record.Measures || '').trim(), 42)); 
            maxLines = Math.max(maxLines, estimateTextLines(cleanPerson, 9));

            // 优化行高计算：10号字体单行约13.5，减少空距
            // 进一步压缩行高公式：单行20，多行时每行12+2padding
            // 调整：稍微增加一点padding，解决空距过小的问题
            row.height = Math.max(22, maxLines * 12.5 + 4);

            // 合并逻辑判断 (纵向合并)
            const isLastRow = index === departmentTargets.length - 1;
            let shouldMergeUnit = isLastRow;
            let shouldMergePerson = isLastRow;

            if (!isLastRow) {
                const nextRecord = departmentTargets[index + 1];
                const nextUnit = nextRecord.AssessmentUnit;
                const nextRawPerson = nextRecord.ResponsiblePerson || '';
                const nextCleanPerson = nextRawPerson.replace(/[\(\（].*?[\)\）]/g, '').trim();

                if (nextUnit !== record.AssessmentUnit) {
                    shouldMergeUnit = true;
                    // 部门变了，责任人合并组也必须结束（即使名字一样，也不跨部门合并）
                    shouldMergePerson = true;
                } else {
                    // 部门没变，检查责任人是否变了
                    if (nextCleanPerson !== cleanPerson) {
                        shouldMergePerson = true;
                    }
                }
            }

            // 执行部门列合并 (A列)
            if (shouldMergeUnit) {
                if (currentRowIndex > unitStartRow) {
                    worksheet.mergeCells(`A${unitStartRow}:A${currentRowIndex}`);
                }
                unitStartRow = currentRowIndex + 1;
            }

            // 执行责任人列合并 (I列 - 原F列)
            if (shouldMergePerson) {
                if (currentRowIndex > personStartRow) {
                    worksheet.mergeCells(`I${personStartRow}:I${currentRowIndex}`);
                }
                personStartRow = currentRowIndex + 1;
            }

            currentRowIndex++;
        });
    }

    // 6. 页脚签名行
    const footerRowIndex = currentRowIndex + 1; // 增加一行间隔，美观
    const footerRow = worksheet.getRow(footerRowIndex);
    footerRow.height = 30;

    // B列: 编制/日期：
    const makerLabelCell = worksheet.getCell(`B${footerRowIndex}`);
    makerLabelCell.value = '编制/日期：';
    makerLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
    makerLabelCell.font = { name: '宋体', size: 11, bold: true };

    // C列: 创建人
    const makerNameCell = worksheet.getCell(`C${footerRowIndex}`);
    makerNameCell.value = makerName;
    makerNameCell.alignment = { vertical: 'middle', horizontal: 'center' };
    makerNameCell.font = { name: '宋体', size: 11 };
    // 添加下划线边框
    makerNameCell.border = { bottom: { style: 'thin' } };

    // D列: 创建日期
    const makerDateCell = worksheet.getCell(`D${footerRowIndex}`);
    makerDateCell.value = makerDate;
    makerDateCell.alignment = { vertical: 'middle', horizontal: 'center' };
    makerDateCell.font = { name: '宋体', size: 11 };
    // 添加下划线边框
    makerDateCell.border = { bottom: { style: 'thin' } };

    // F列: 审核/日期：
    const checkerLabelCell = worksheet.getCell(`F${footerRowIndex}`);
    checkerLabelCell.value = '审核/日期：';
    checkerLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
    checkerLabelCell.font = { name: '宋体', size: 11, bold: true };

    // G列: 审核签字位 (预留)
    const checkerSignCell = worksheet.getCell(`G${footerRowIndex}`);
    checkerSignCell.border = { bottom: { style: 'thin' } };

    // H列: 批准/日期：
    const approverLabelCell = worksheet.getCell(`H${footerRowIndex}`);
    approverLabelCell.value = '批准/日期：';
    approverLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };
    approverLabelCell.font = { name: '宋体', size: 11, bold: true };

    // I列+J列: 批准签字位 (预留，合并)
    worksheet.mergeCells(`I${footerRowIndex}:J${footerRowIndex}`);
    const approverSignCell = worksheet.getCell(`I${footerRowIndex}`);
    approverSignCell.border = { bottom: { style: 'thin' } };

    // 发送响应
    const now = new Date();
    const yearStr = String(now.getFullYear()).slice(-2);
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const dayStr = String(now.getDate()).padStart(2, '0');
    const hourStr = String(now.getHours()).padStart(2, '0');
    const minuteStr = String(now.getMinutes()).padStart(2, '0');
    const secondStr = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${yearStr}${monthStr}${dayStr}${hourStr}${minuteStr}${secondStr}`;

    const filename = `${year}年质量目标表-${timestamp}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('导出质量目标数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出质量目标数据失败',
      error: error.message
    });
  }
});

/**
 * 获取单个质量目标详情
 * GET /api/quality-targets/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const query = `
      SELECT 
        qt.ID,
        qt.TargetYear,
        qt.TargetCategory,
        qt.AssessmentUnit,
        qt.QualityTarget,
        qt.CalculationFormula,
        qt.TargetValue,
        qt.Measures,
        qt.ResponsiblePerson,
        qt.StatisticsFrequency,
        qt.Description,
        qt.CreatedAt,
        qt.UpdatedAt,
        qt.CreatedBy,
        qt.UpdatedBy
      FROM QualityTargets qt
      WHERE qt.ID = @id AND qt.IsDeleted = 0
    `;
    
    const request = pool.request();
    request.input('id', sql.Int, id);
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '质量目标不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    });
    
  } catch (error) {
    console.error('获取质量目标详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取质量目标详情失败',
      error: error.message
    });
  }
});

/**
 * 创建新的质量目标
 * POST /api/quality-targets
 */
router.post('/', async (req, res) => {
  try {
    const {
      targetYear,
      targetCategory,
      assessmentUnit,
      qualityTarget,
      calculationFormula,
      targetValue,
      measures,
      responsiblePerson,
      statisticsFrequency,
      description
    } = req.body;
    
    // 验证必填字段
    if (!targetCategory || !assessmentUnit || !qualityTarget || !targetValue || !responsiblePerson || !statisticsFrequency) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // 验证统计频次
    const allowedFrequencies = ['每月', '每季度', '每半年', '每年'];
    if (!allowedFrequencies.includes(statisticsFrequency)) {
      return res.status(400).json({
        success: false,
        message: '统计频次无效，必须为：每月、每季度、每半年、每年'
      });
    }
    
    const pool = await getConnection();
    
    const query = `
      INSERT INTO QualityTargets (
        TargetYear, TargetCategory, AssessmentUnit, QualityTarget, CalculationFormula, 
        TargetValue, Measures, ResponsiblePerson, 
        StatisticsFrequency, Description, CreatedAt, UpdatedAt, 
        CreatedBy, UpdatedBy, IsDeleted
      ) VALUES (
        @targetYear,@targetCategory, @assessmentUnit, @qualityTarget, @calculationFormula,
        @targetValue, @measures, @responsiblePerson,
        @statisticsFrequency, @description, GETDATE(), GETDATE(),
        @createdBy, @updatedBy, 0
      );
      SELECT SCOPE_IDENTITY() as newId;
    `;
    
    const request = pool.request();
    request.input('targetYear', sql.Int, targetYear || new Date().getFullYear());
    request.input('targetCategory', sql.NVarChar(50), targetCategory);
    request.input('assessmentUnit', sql.NVarChar(100), assessmentUnit);
    request.input('qualityTarget', sql.NVarChar(200), qualityTarget);
    request.input('calculationFormula', sql.NVarChar(500), calculationFormula || '');
    request.input('targetValue', sql.NVarChar(50), targetValue);

    request.input('measures', sql.NVarChar(1000), measures || '');
    request.input('responsiblePerson', sql.NVarChar(50), responsiblePerson);
    request.input('statisticsFrequency', sql.NVarChar(20), statisticsFrequency);
    request.input('description', sql.NVarChar(500), description || '');
    
    // 优先使用用户的真实姓名，如果没有则使用用户名
    const creatorName = req.user?.name || req.user?.username || 'system';
    request.input('createdBy', sql.NVarChar(50), creatorName);
    request.input('updatedBy', sql.NVarChar(50), creatorName);
    
    const result = await request.query(query);
    const newId = result.recordset[0].newId;
    
    res.status(201).json({
      success: true,
      message: '质量目标创建成功',
      data: { id: newId }
    });
    
  } catch (error) {
    console.error('创建质量目标失败:', error);
    res.status(500).json({
      success: false,
      message: '创建质量目标失败',
      error: error.message
    });
  }
});

/**
 * 更新质量目标
 * PUT /api/quality-targets/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      targetYear,
      targetCategory,
      assessmentUnit,
      qualityTarget,
      calculationFormula,
      targetValue,
      measures,
      responsiblePerson,
      statisticsFrequency,
      description
    } = req.body;
    
    // 验证必填字段
    if (!targetCategory || !assessmentUnit || !qualityTarget || !targetValue || !responsiblePerson || !statisticsFrequency) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // 验证统计频次
    const allowedFrequencies = ['每月', '每季度', '每半年', '每年'];
    if (!allowedFrequencies.includes(statisticsFrequency)) {
      return res.status(400).json({
        success: false,
        message: '统计频次无效，必须为：每月、每季度、每半年、每年'
      });
    }
    
    const pool = await getConnection();
    
    // 检查记录是否存在
    const checkQuery = 'SELECT ID FROM QualityTargets WHERE ID = @id AND IsDeleted = 0';
    const checkRequest = pool.request();
    checkRequest.input('id', sql.Int, id);
    const checkResult = await checkRequest.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '质量目标不存在'
      });
    }
    
    const updateQuery = `
      UPDATE QualityTargets SET
        TargetYear = @targetYear,
        TargetCategory = @targetCategory,
        AssessmentUnit = @assessmentUnit,
        QualityTarget = @qualityTarget,
        CalculationFormula = @calculationFormula,
        TargetValue = @targetValue,
        Measures = @measures,
        ResponsiblePerson = @responsiblePerson,
        StatisticsFrequency = @statisticsFrequency,
        Description = @description,
        UpdatedAt = GETDATE(),
        UpdatedBy = @updatedBy
      WHERE ID = @id AND IsDeleted = 0
    `;
    
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('targetYear', sql.Int, targetYear || new Date().getFullYear());
    request.input('targetCategory', sql.NVarChar(50), targetCategory);
    request.input('assessmentUnit', sql.NVarChar(100), assessmentUnit);
    request.input('qualityTarget', sql.NVarChar(200), qualityTarget);
    request.input('calculationFormula', sql.NVarChar(500), calculationFormula || '');
    request.input('targetValue', sql.NVarChar(50), targetValue);
    request.input('measures', sql.NVarChar(1000), measures || '');
    request.input('responsiblePerson', sql.NVarChar(50), responsiblePerson);
    request.input('statisticsFrequency', sql.NVarChar(20), statisticsFrequency);
    request.input('description', sql.NVarChar(500), description || '');
    
    // 优先使用用户的真实姓名，如果没有则使用用户名
    const updaterName = req.user?.name || req.user?.username || 'system';
    request.input('updatedBy', sql.NVarChar(50), updaterName);
    
    await request.query(updateQuery);
    
    res.json({
      success: true,
      message: '质量目标更新成功'
    });
    
  } catch (error) {
    console.error('更新质量目标失败:', error);
    res.status(500).json({
      success: false,
      message: '更新质量目标失败',
      error: error.message
    });
  }
});

/**
 * 删除质量目标（软删除）
 * DELETE /api/quality-targets/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    // 检查记录是否存在
    const checkQuery = 'SELECT ID FROM QualityTargets WHERE ID = @id AND IsDeleted = 0';
    const checkRequest = pool.request();
    checkRequest.input('id', sql.Int, id);
    const checkResult = await checkRequest.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '质量目标不存在'
      });
    }
    
    // 软删除
    const deleteQuery = `
      UPDATE QualityTargets SET
        IsDeleted = 1,
        UpdatedAt = GETDATE(),
        UpdatedBy = @updatedBy
      WHERE ID = @id
    `;
    
    const request = pool.request();
    request.input('id', sql.Int, id);
    
    // 优先使用用户的真实姓名
    const deleterName = req.user?.name || req.user?.username || 'system';
    request.input('updatedBy', sql.NVarChar(50), deleterName);
    
    await request.query(deleteQuery);
    
    res.json({
      success: true,
      message: '质量目标删除成功'
    });
    
  } catch (error) {
    console.error('删除质量目标失败:', error);
    res.status(500).json({
      success: false,
      message: '删除质量目标失败',
      error: error.message
    });
  }
});

/**
 * 批量删除质量目标
 * POST /api/quality-targets/batch-delete
 */
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    

    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {

      return res.status(400).json({
        success: false,
        message: '请选择要删除的记录'
      });
    }
    
    const pool = await getConnection();
    
    const deleteQuery = `
      UPDATE QualityTargets SET
        IsDeleted = 1,
        UpdatedAt = GETDATE(),
        UpdatedBy = @updatedBy
      WHERE ID IN (${ids.map((_, index) => `@id${index}`).join(', ')})
        AND IsDeleted = 0
    `;
    
    const request = pool.request();
    
    // 优先使用用户的真实姓名
    const deleterName = req.user?.name || req.user?.username || 'system';
    request.input('updatedBy', sql.NVarChar(50), deleterName);
    
    ids.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, id);
    });
    
    const result = await request.query(deleteQuery);
    
    res.json({
      success: true,
      message: `成功删除 ${result.rowsAffected[0]} 条记录`
    });
    
  } catch (error) {
    console.error('批量删除质量目标失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除质量目标失败',
      error: error.message
    });
  }
});

// =====================================================
// 质量目标统计分析 API
// =====================================================

/**
 * 获取质量目标统计概览
 * GET /api/quality-targets/statistics/overview
 */
router.get('/statistics/overview', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const pool = await getConnection();
    
    // 获取统计数据
    const query = `
      SELECT 
        COUNT(*) as totalTargets,
        COUNT(CASE WHEN StatisticsFrequency = '月度' THEN 1 END) as monthlyTargets,
        COUNT(CASE WHEN StatisticsFrequency = '季度' THEN 1 END) as quarterlyTargets,
        COUNT(CASE WHEN StatisticsFrequency = '年度' THEN 1 END) as yearlyTargets,
        COUNT(DISTINCT TargetCategory) as categoryCount,
        COUNT(DISTINCT AssessmentUnit) as unitCount,
        COUNT(DISTINCT ResponsiblePerson) as personCount
      FROM QualityTargets
      WHERE IsDeleted = 0
        AND TargetYear = @year
    `;
    
    const request = pool.request();
    request.input('year', sql.Int, parseInt(year));
    
    const result = await request.query(query);
    const stats = result.recordset[0];
    
    res.json({
      success: true,
      data: {
        totalTargets: stats.totalTargets || 0,
        monthlyTargets: stats.monthlyTargets || 0,
        quarterlyTargets: stats.quarterlyTargets || 0,
        yearlyTargets: stats.yearlyTargets || 0,
        categoryCount: stats.categoryCount || 0,
        unitCount: stats.unitCount || 0,
        personCount: stats.personCount || 0
      }
    });
    
  } catch (error) {
    console.error('获取质量目标统计概览失败:', error);
    res.status(500).json({
      success: false,
      message: '获取质量目标统计概览失败',
      error: error.message
    });
  }
});

/**
 * 获取质量目标分类统计
 * GET /api/quality-targets/statistics/category
 */
router.get('/statistics/category', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const pool = await getConnection();
    
    const query = `
      SELECT 
        TargetCategory,
        COUNT(*) as count,
        CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) as percentage
      FROM QualityTargets
      WHERE IsDeleted = 0
        AND TargetYear = @year
      GROUP BY TargetCategory
      ORDER BY count DESC
    `;
    
    const request = pool.request();
    request.input('year', sql.Int, parseInt(year));
    
    const result = await request.query(query);
    
    // 处理查询结果，使用新的解析函数计算达成状态
    const processedData = result.recordset.map(record => {
      const achievementStatus = checkAchievement(record.ActualValue, record.TargetValue);
      const achievementRate = calculateAchievementRate(record.ActualValue, record.TargetValue);
      
      return {
        ...record,
        AchievementStatus: achievementStatus,
        AchievementRate: parseFloat(achievementRate.toFixed(2))
      };
    });
    
    res.json({
      success: true,
      data: processedData
    });
    
  } catch (error) {
    console.error('获取质量目标分类统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取质量目标分类统计失败',
      error: error.message
    });
  }
});

/**
 * 获取质量目标达成情况统计
 * GET /api/quality-targets/statistics/achievement
 */
router.get('/statistics/achievement', async (req, res) => {
  try {
    const { 
      year = new Date().getFullYear(),
      quarter = null,
      month = null,
      category = null,
      assessmentUnit = null,
      responsiblePerson = null,
      achievementStatus = null,
      page = 1,
      pageSize = 10
    } = req.query;
    
    const pool = await getConnection();
    
    // 构建时间条件
    let timeCondition = 'qts.Year = @year';
    const params = [{ name: 'year', type: sql.Int, value: parseInt(year) }];
    
    if (quarter) {
      timeCondition += ' AND qts.Quarter = @quarter';
      params.push({ name: 'quarter', type: sql.Int, value: parseInt(quarter) });
    }
    
    if (month) {
      timeCondition += ' AND qts.Month = @month';
      params.push({ name: 'month', type: sql.Int, value: parseInt(month) });
    }
    
    // 构建筛选条件
    let filterConditions = [];
    
    if (category) {
      filterConditions.push('qt.TargetCategory = @category');
      params.push({ name: 'category', type: sql.NVarChar, value: category });
    }
    
    if (assessmentUnit) {
      filterConditions.push('qt.AssessmentUnit = @assessmentUnit');
      params.push({ name: 'assessmentUnit', type: sql.NVarChar, value: assessmentUnit });
    }
    
    if (responsiblePerson) {
      filterConditions.push('qt.ResponsiblePerson = @responsiblePerson');
      params.push({ name: 'responsiblePerson', type: sql.NVarChar, value: responsiblePerson });
    }
    
    // 修复年份筛选逻辑：只显示指定年份的目标和统计数据
    const whereClause = filterConditions.length > 0 
      ? `qt.IsDeleted = 0 AND qt.TargetYear = @year AND ${filterConditions.join(' AND ')} AND (qts.ID IS NULL OR (${timeCondition}))`
      : `qt.IsDeleted = 0 AND qt.TargetYear = @year AND (qts.ID IS NULL OR (${timeCondition}))`;
    
    // 先获取总记录数（用于分页）
    const countQuery = `
      SELECT COUNT(*) as total
      FROM QualityTargets qt
      LEFT JOIN QualityTargetStatistics qts ON qt.ID = qts.TargetID
      WHERE ${whereClause}
    `;
    
    const countRequest = pool.request();
    params.forEach(param => {
      countRequest.input(param.name, param.type, param.value);
    });
    
    const countResult = await countRequest.query(countQuery);
    const totalRecords = countResult.recordset[0].total;
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    // 获取分页数据
    const query = `
      SELECT * FROM (
        SELECT 
          qt.ID,
          qt.TargetCategory,
          qt.QualityTarget,
          qt.TargetValue,
          qt.ResponsiblePerson,
          qt.AssessmentUnit,
          qt.StatisticsFrequency,
          qts.ActualValue,
          qts.Year,
          qts.Quarter,
          qts.Month,
          ROW_NUMBER() OVER (ORDER BY qt.TargetCategory, qt.QualityTarget) as RowNum
        FROM QualityTargets qt
        LEFT JOIN QualityTargetStatistics qts ON qt.ID = qts.TargetID
        WHERE ${whereClause}
      ) AS PagedResults
      WHERE RowNum > @offset AND RowNum <= (@offset + @pageSize)
      ORDER BY RowNum
    `;
    
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, parseInt(pageSize));
    
    const result = await request.query(query);
    
    // 处理查询结果，使用新的解析函数计算达成状态和达成率
    let records = result.recordset.map(record => {
      const achievementStatus = checkAchievement(record.ActualValue, record.TargetValue);
      const achievementRate = calculateAchievementRate(record.ActualValue, record.TargetValue);
      
      return {
        ...record,
        AchievementStatus: achievementStatus,
        AchievementRate: parseFloat(achievementRate.toFixed(2))
      };
    });
    
    // 根据达成状态筛选（需要重新查询以获取准确的分页结果）
    if (achievementStatus) {
      // 如果有达成状态筛选，需要在SQL层面进行筛选以确保分页准确性
      // 这里暂时在应用层筛选，但这会影响分页准确性
      records = records.filter(record => record.AchievementStatus === achievementStatus);
    }
    
    // 为了计算准确的汇总统计，需要查询所有符合条件的记录
    const allRecordsQuery = `
      SELECT 
        qt.ID,
        qt.TargetValue,
        qts.ActualValue
      FROM QualityTargets qt
      LEFT JOIN QualityTargetStatistics qts ON qt.ID = qts.TargetID
      WHERE ${whereClause}
    `;
    
    const allRecordsRequest = pool.request();
    params.forEach(param => {
      allRecordsRequest.input(param.name, param.type, param.value);
    });
    
    const allRecordsResult = await allRecordsRequest.query(allRecordsQuery);
    const allRecords = allRecordsResult.recordset.map(record => {
      const achievementStatus = checkAchievement(record.ActualValue, record.TargetValue);
      return {
        ...record,
        AchievementStatus: achievementStatus
      };
    });
    
    // 计算汇总统计（基于所有记录）
    const summary = {
      total: allRecords.length,
      achieved: allRecords.filter(r => r.AchievementStatus === '达成').length,
      approaching: allRecords.filter(r => r.AchievementStatus === '接近').length,
      notAchieved: allRecords.filter(r => r.AchievementStatus === '未达成').length,
      noData: allRecords.filter(r => r.AchievementStatus === '无数据').length,
      formatError: allRecords.filter(r => r.AchievementStatus === '目标值格式错误').length
    };
    
    summary.achievementRate = summary.total > 0 ? 
      ((summary.achieved / summary.total) * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        records,
        summary,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / parseInt(pageSize))
        }
      }
    });
    
  } catch (error) {
    console.error('获取质量目标达成情况统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取质量目标达成情况统计失败',
      error: error.message
    });
  }
});

/**
 * 获取质量目标趋势数据
 * GET /api/quality-targets/statistics/trends
 */
router.get('/statistics/trends', async (req, res) => {
  try {
    const { 
      targetId,
      year = new Date().getFullYear(),
      months = 12
    } = req.query;
    
    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: '请指定目标ID'
      });
    }
    
    const pool = await getConnection();
    
    const query = `
      SELECT 
        qt.QualityTarget,
        qt.TargetValue,
        qts.ActualValue,
        qts.Year,
        qts.Quarter,
        qts.Month
      FROM QualityTargets qt
      LEFT JOIN QualityTargetStatistics qts ON qt.ID = qts.TargetID
      WHERE qt.ID = @targetId
        AND qt.IsDeleted = 0
        AND (qts.ID IS NULL OR qts.Year = @year)
      ORDER BY qts.Year, qts.Quarter, qts.Month
    `;
    
    const request = pool.request();
    request.input('targetId', sql.Int, parseInt(targetId));
    request.input('year', sql.Int, parseInt(year));
    request.input('months', sql.Int, parseInt(months));
    
    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('获取质量目标趋势数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取质量目标趋势数据失败',
      error: error.message
    });
  }
});

// =====================================================
// 质量目标统计数据管理 API
// =====================================================

/**
 * 添加质量目标统计数据
 * POST /api/quality-targets/statistics
 */
router.post('/statistics', async (req, res) => {
  try {
    const {
      targetId,
      year,
      quarter,
      month,
      actualValue,
      remarks
    } = req.body;
    
    if (!targetId || !year || actualValue === undefined) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }
    
    const pool = await getConnection();
    
    // 检查目标是否存在
    const checkQuery = 'SELECT ID FROM QualityTargets WHERE ID = @targetId AND IsDeleted = 0';
    const checkRequest = pool.request();
    checkRequest.input('targetId', sql.Int, targetId);
    const checkResult = await checkRequest.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '质量目标不存在'
      });
    }
    
    // 检查是否已存在相同期间的统计数据
    const existQuery = `
      SELECT ID FROM QualityTargetStatistics 
      WHERE TargetID = @targetId 
        AND Year = @year
        AND (Quarter = @quarter OR (@quarter IS NULL AND Quarter IS NULL))
        AND (Month = @month OR (@month IS NULL AND Month IS NULL))
    `;
    
    const existRequest = pool.request();
    existRequest.input('targetId', sql.Int, targetId);
    existRequest.input('year', sql.Int, year);
    existRequest.input('quarter', sql.Int, quarter);
    existRequest.input('month', sql.Int, month);
    const existResult = await existRequest.query(existQuery);
    
    if (existResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该期间的统计数据已存在，请使用更新功能'
      });
    }
    
    // 插入统计数据
    const insertQuery = `
      INSERT INTO QualityTargetStatistics (
        TargetID, Year, Quarter, Month, ActualValue, Remarks,
        CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
      ) VALUES (
        @targetId, @year, @quarter, @month, @actualValue, @remarks,
        GETDATE(), GETDATE(), @createdBy, @updatedBy
      );
      SELECT SCOPE_IDENTITY() as newId;
    `;
    
    const request = pool.request();
    request.input('targetId', sql.Int, targetId);
    request.input('year', sql.Int, year);
    request.input('quarter', sql.Int, quarter);
    request.input('month', sql.Int, month);
    request.input('actualValue', sql.NVarChar(50), actualValue);
    request.input('remarks', sql.NVarChar(500), remarks || '');
    request.input('createdBy', sql.NVarChar(50), req.user?.username || 'system');
    request.input('updatedBy', sql.NVarChar(50), req.user?.username || 'system');
    
    const result = await request.query(insertQuery);
    const newId = result.recordset[0].newId;
    
    res.status(201).json({
      success: true,
      message: '统计数据添加成功',
      data: { id: newId }
    });
    
  } catch (error) {
    console.error('添加质量目标统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '添加质量目标统计数据失败',
      error: error.message
    });
  }
});

/**
 * 更新质量目标统计数据
 * PUT /api/quality-targets/statistics/:id
 */
router.put('/statistics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      year,
      quarter,
      month,
      actualValue,
      remarks
    } = req.body;
    
    if (!year || actualValue === undefined) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }
    
    const pool = await getConnection();
    
    // 检查记录是否存在
    const checkQuery = 'SELECT ID FROM QualityTargetStatistics WHERE ID = @id';
    const checkRequest = pool.request();
    checkRequest.input('id', sql.Int, id);
    const checkResult = await checkRequest.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '统计数据不存在'
      });
    }
    
    const updateQuery = `
      UPDATE QualityTargetStatistics SET
        Year = @year,
        Quarter = @quarter,
        Month = @month,
        ActualValue = @actualValue,
        Remarks = @remarks,
        UpdatedAt = GETDATE(),
        UpdatedBy = @updatedBy
      WHERE ID = @id
    `;
    
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('year', sql.Int, year);
    request.input('quarter', sql.Int, quarter);
    request.input('month', sql.Int, month);
    request.input('actualValue', sql.NVarChar(50), actualValue);
    request.input('remarks', sql.NVarChar(500), remarks || '');
    request.input('updatedBy', sql.NVarChar(50), req.user?.username || 'system');
    
    await request.query(updateQuery);
    
    res.json({
      success: true,
      message: '统计数据更新成功'
    });
    
  } catch (error) {
    console.error('更新质量目标统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '更新质量目标统计数据失败',
      error: error.message
    });
  }
});

// =====================================================
// 数据导出功能
// =====================================================



// =====================================================
// 辅助功能 API
// =====================================================

/**
 * 获取目标分类选项
 * GET /api/quality-targets/options/categories
 */
router.get('/options/categories', async (req, res) => {
  try {
    const pool = await getConnection();
    
    const query = `
      SELECT DISTINCT TargetCategory
      FROM QualityTargets
      WHERE IsDeleted = 0 AND TargetCategory IS NOT NULL AND TargetCategory != ''
      ORDER BY TargetCategory
    `;
    
    const result = await pool.request().query(query);
    const categories = result.recordset.map(row => row.TargetCategory);
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('获取目标分类选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取目标分类选项失败',
      error: error.message
    });
  }
});

/**
 * 获取考核单位选项
 * GET /api/quality-targets/options/units
 */
router.get('/options/units', async (req, res) => {
  try {
    const pool = await getConnection();
    
    const query = `
      SELECT DISTINCT AssessmentUnit
      FROM QualityTargets
      WHERE IsDeleted = 0 AND AssessmentUnit IS NOT NULL AND AssessmentUnit != ''
      ORDER BY AssessmentUnit
    `;
    
    const result = await pool.request().query(query);
    const units = result.recordset.map(row => row.AssessmentUnit);
    
    res.json({
      success: true,
      data: units
    });
    
  } catch (error) {
    console.error('获取考核单位选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取考核单位选项失败',
      error: error.message
    });
  }
});

/**
 * 获取责任人选项
 * GET /api/quality-targets/options/persons
 */
router.get('/options/persons', async (req, res) => {
  try {
    const pool = await getConnection();
    
    const query = `
      SELECT DISTINCT ResponsiblePerson
      FROM QualityTargets
      WHERE IsDeleted = 0 AND ResponsiblePerson IS NOT NULL AND ResponsiblePerson != ''
      ORDER BY ResponsiblePerson
    `;
    
    const result = await pool.request().query(query);
    const persons = result.recordset.map(row => row.ResponsiblePerson);
    
    res.json({
      success: true,
      data: persons
    });
    
  } catch (error) {
    console.error('获取责任人选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取责任人选项失败',
      error: error.message
    });
  }
});

/**
 * 获取特定目标的统计数据列表
 * GET /api/quality-targets/:targetId/statistics
 */
router.get('/:targetId/statistics', async (req, res) => {
  try {
    const { targetId } = req.params;
    const { 
      year = new Date().getFullYear(),
      page = 1,
      pageSize = 10
    } = req.query;
    
    const pool = await getConnection();
    
    // 检查目标是否存在
    const checkQuery = 'SELECT ID, QualityTarget, TargetValue FROM QualityTargets WHERE ID = @targetId AND IsDeleted = 0';
    const checkRequest = pool.request();
    checkRequest.input('targetId', sql.Int, parseInt(targetId));
    const checkResult = await checkRequest.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '质量目标不存在'
      });
    }
    
    const targetInfo = checkResult.recordset[0];
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    // 获取统计数据总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM QualityTargetStatistics qts
      WHERE qts.TargetID = @targetId
        AND qts.Year = @year
    `;
    
    const countRequest = pool.request();
    countRequest.input('targetId', sql.Int, parseInt(targetId));
    countRequest.input('year', sql.Int, parseInt(year));
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    // 获取分页统计数据 - 使用兼容的分页语法
    const dataQuery = `
      SELECT TOP (@pageSize) *
      FROM (
        SELECT 
          qts.ID,
          qts.ActualValue,
          qts.Year,
          qts.Quarter,
          qts.Month,
          qts.Remarks,
          qts.CreatedAt,
          qts.CreatedBy,
          qt.TargetValue,
          ROW_NUMBER() OVER (ORDER BY qts.Year DESC, qts.Quarter DESC, qts.Month DESC) as RowNum
        FROM QualityTargetStatistics qts
        INNER JOIN QualityTargets qt ON qts.TargetID = qt.ID
        WHERE qts.TargetID = @targetId
          AND qts.Year = @year
      ) AS PagedResults
      WHERE RowNum > @offset
      ORDER BY RowNum
    `;
    
    const dataRequest = pool.request();
    dataRequest.input('targetId', sql.Int, parseInt(targetId));
    dataRequest.input('year', sql.Int, parseInt(year));
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('pageSize', sql.Int, parseInt(pageSize));
    
    const dataResult = await dataRequest.query(dataQuery);
    
    // 处理查询结果，使用新的解析函数计算达成状态和达成率
    const processedStatistics = dataResult.recordset.map(record => {
      const achievementStatus = checkAchievement(record.ActualValue, record.TargetValue);
      const achievementRate = calculateAchievementRate(record.ActualValue, record.TargetValue);
      
      return {
        ...record,
        AchievementStatus: achievementStatus,
        AchievementRate: parseFloat(achievementRate.toFixed(2))
      };
    });
    
    res.json({
      success: true,
      data: {
        targetInfo,
        statistics: processedStatistics,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize))
        }
      }
    });
    
  } catch (error) {
    console.error('获取目标统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取目标统计数据失败',
      error: error.message
    });
  }
});

/**
 * 删除质量目标统计数据
 * DELETE /api/quality-targets/statistics/:id
 */
router.delete('/statistics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await getConnection();
    
    // 检查统计数据是否存在
    const checkQuery = 'SELECT ID FROM QualityTargetStatistics WHERE ID = @id';
    const checkRequest = pool.request();
    checkRequest.input('id', sql.Int, parseInt(id));
    const checkResult = await checkRequest.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '统计数据不存在'
      });
    }
    
    // 删除统计数据
    const deleteQuery = 'DELETE FROM QualityTargetStatistics WHERE ID = @id';
    const deleteRequest = pool.request();
    deleteRequest.input('id', sql.Int, parseInt(id));
    await deleteRequest.query(deleteQuery);
    
    res.json({
      success: true,
      message: '删除成功'
    });
    
  } catch (error) {
    console.error('删除统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '删除统计数据失败',
      error: error.message
    });
  }
});

/**
 * 获取指定年份的目标名称和部门信息（用于分类统计图表）
 * GET /api/quality-targets/statistics/chart-options
 */
router.get('/statistics/chart-options', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const pool = await getConnection();
    
    // 获取指定年份的所有目标名称
    const targetsQuery = `
      SELECT DISTINCT QualityTarget
      FROM QualityTargets
      WHERE IsDeleted = 0
        AND TargetYear = @year
      ORDER BY QualityTarget
    `;
    
    // 获取指定年份的所有部门名称（评估单位）
    const unitsQuery = `
      SELECT DISTINCT AssessmentUnit
      FROM QualityTargets
      WHERE IsDeleted = 0
        AND TargetYear = @year
        AND AssessmentUnit IS NOT NULL
        AND AssessmentUnit != ''
      ORDER BY AssessmentUnit
    `;
    
    const targetsRequest = pool.request();
    targetsRequest.input('year', sql.Int, parseInt(year));
    
    const unitsRequest = pool.request();
    unitsRequest.input('year', sql.Int, parseInt(year));
    
    const [targetsResult, unitsResult] = await Promise.all([
      targetsRequest.query(targetsQuery),
      unitsRequest.query(unitsQuery)
    ]);
    
    const targets = targetsResult.recordset.map(record => record.QualityTarget);
    const units = unitsResult.recordset.map(record => record.AssessmentUnit);
    
    res.json({
      success: true,
      data: {
        targets,
        units
      }
    });
    
  } catch (error) {
    console.error('获取图表选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图表选项失败',
      error: error.message
    });
  }
});

/**
 * 获取目标分类统计数据（新版本 - 按目标名称和部门分组）
 * GET /api/quality-targets/statistics/category-by-targets
 */
router.get('/statistics/category-by-targets', async (req, res) => {
  try {
    const { 
      year = new Date().getFullYear(),
      selectedUnits = '' // 选中的部门，用逗号分隔
    } = req.query;
    
    const pool = await getConnection();
    
    // 构建部门筛选条件
    let unitCondition = '';
    const params = [{ name: 'year', type: sql.Int, value: parseInt(year) }];
    
    if (selectedUnits && selectedUnits.trim() !== '') {
      const units = selectedUnits.split(',').map(unit => unit.trim()).filter(unit => unit !== '');
      if (units.length > 0) {
        // 添加"公司"选项的处理
        if (units.includes('公司')) {
          // 如果选择了"公司"，包含所有记录
          const otherUnits = units.filter(unit => unit !== '公司');
          if (otherUnits.length > 0) {
            const placeholders = otherUnits.map((_, index) => `@unit${index}`).join(',');
            unitCondition = `AND (AssessmentUnit IN (${placeholders}) OR 1=1)`;
            otherUnits.forEach((unit, index) => {
              params.push({ name: `unit${index}`, type: sql.NVarChar, value: unit });
            });
          }
          // 如果只选择了"公司"，不添加额外条件
        } else {
          // 只选择了具体部门
          const placeholders = units.map((_, index) => `@unit${index}`).join(',');
          unitCondition = `AND AssessmentUnit IN (${placeholders})`;
          units.forEach((unit, index) => {
            params.push({ name: `unit${index}`, type: sql.NVarChar, value: unit });
          });
        }
      }
    }
    
    const query = `
      SELECT 
        qt.QualityTarget,
        qt.AssessmentUnit,
        COUNT(*) as count,
        qt.TargetValue as targetValue,
        COALESCE(qts.ActualValue, '0') as actualValue
      FROM QualityTargets qt
      LEFT JOIN QualityTargetStatistics qts ON qt.ID = qts.TargetID
        AND qts.Year = @year
      WHERE qt.IsDeleted = 0
        AND qt.TargetYear = @year
        ${unitCondition}
      GROUP BY qt.QualityTarget, qt.AssessmentUnit, qt.TargetValue, qts.ActualValue
      ORDER BY qt.QualityTarget, qt.AssessmentUnit
    `;
    
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('获取目标分类统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取目标分类统计数据失败',
      error: error.message
    });
  }
});

// 批量复制年度目标
router.post('/copy', authenticateToken, async (req, res) => {
  try {
    const { ids, targetYear } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要复制的目标' });
    }
    
    if (!targetYear) {
      return res.status(400).json({ success: false, message: '请指定目标年份' });
    }
    
    const pool = await getConnection();
    
    // 不使用显式事务，直接执行，避免复杂的事务状态管理
    try {
      const request = new sql.Request(pool);
      
      // 优先使用用户的真实姓名
      const creatorName = req.user?.name || req.user?.username || 'system';
      
      // 生成 ID 列表参数
      ids.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, id);
      });
      
      request.input('targetYear', sql.Int, targetYear);
      request.input('createdBy', sql.NVarChar(50), creatorName);
      
      const idParams = ids.map((_, index) => `@id${index}`).join(',');
      
      const query = `
        INSERT INTO QualityTargets (
          TargetYear, TargetCategory, AssessmentUnit, QualityTarget, 
          CalculationFormula, TargetValue, Measures, ResponsiblePerson, 
          StatisticsFrequency, Status, Description, 
          IsDeleted, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
        )
        SELECT 
          @targetYear, TargetCategory, AssessmentUnit, QualityTarget, 
          CalculationFormula, TargetValue, Measures, ResponsiblePerson, 
          StatisticsFrequency, 1, Description, 
          0, GETDATE(), @createdBy, GETDATE(), @createdBy
        FROM QualityTargets
        WHERE ID IN (${idParams})
      `;
      
      await request.query(query);
      
      res.json({ success: true, message: `成功复制 ${ids.length} 条目标到 ${targetYear} 年` });
      
    } catch (err) {
      throw err;
    }
  } catch (error) {
    console.error('复制年度目标失败:', error);
    res.status(500).json({ success: false, message: '复制年度目标失败: ' + error.message });
  }
});

module.exports = router;