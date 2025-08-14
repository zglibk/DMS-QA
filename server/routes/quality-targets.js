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
      whereConditions.push('YEAR(qt.CreatedAt) = @year');
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
    
    // 添加调试日志
    console.log('质量目标列表查询结果:', {
      总记录数: total,
      当前页记录数: records.length,
      前3条记录样本: records.slice(0, 3).map(record => ({
        ID: record.ID,
        QualityTarget: record.QualityTarget,
        TargetValue: record.TargetValue,
        TargetValueType: typeof record.TargetValue,
        Status: record.Status,
        StatusType: typeof record.Status
      }))
    });
    
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
    
    console.log('质量目标选项数据响应:', {
      categoriesCount: categories.length,
      unitsCount: units.length,
      personsCount: persons.length,
      sampleCategories: categories.slice(0, 3),
      sampleUnits: units.slice(0, 3),
      samplePersons: persons.slice(0, 3)
    });
    
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
    request.input('createdBy', sql.NVarChar(50), req.user?.username || 'system');
    request.input('updatedBy', sql.NVarChar(50), req.user?.username || 'system');
    
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
    request.input('updatedBy', sql.NVarChar(50), req.user?.username || 'system');
    
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
    request.input('updatedBy', sql.NVarChar(50), req.user?.username || 'system');
    
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
    request.input('updatedBy', sql.NVarChar(50), req.user?.username || 'system');
    
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
        AND YEAR(CreatedAt) = @year
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
        AND YEAR(CreatedAt) = @year
      GROUP BY TargetCategory
      ORDER BY count DESC
    `;
    
    const request = pool.request();
    request.input('year', sql.Int, parseInt(year));
    
    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset
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
      month = null
    } = req.query;
    
    const pool = await getConnection();
    
    // 构建时间条件
    let timeCondition = 'YEAR(qts.StatisticsPeriod) = @year';
    const params = [{ name: 'year', type: sql.Int, value: parseInt(year) }];
    
    if (quarter) {
      timeCondition += ' AND DATEPART(QUARTER, qts.StatisticsPeriod) = @quarter';
      params.push({ name: 'quarter', type: sql.Int, value: parseInt(quarter) });
    }
    
    if (month) {
      timeCondition += ' AND MONTH(qts.StatisticsPeriod) = @month';
      params.push({ name: 'month', type: sql.Int, value: parseInt(month) });
    }
    
    const query = `
      SELECT 
        qt.ID,
        qt.TargetCategory,
        qt.QualityTarget,
        qt.TargetValue,

        qt.ResponsiblePerson,
        qts.ActualValue,
        qts.StatisticsPeriod,
        CASE 
          WHEN qts.ActualValue >= qt.TargetValue THEN '达成'
          WHEN qts.ActualValue >= qt.TargetValue * 0.8 THEN '接近'
          ELSE '未达成'
        END as AchievementStatus,
        CASE 
          WHEN qt.TargetValue > 0 THEN 
            CAST((qts.ActualValue / qt.TargetValue) * 100 AS DECIMAL(5,2))
          ELSE 0
        END as AchievementRate
      FROM QualityTargets qt
      LEFT JOIN QualityTargetStatistics qts ON qt.ID = qts.TargetID
      WHERE qt.IsDeleted = 0
        AND (qts.ID IS NULL OR (${timeCondition}))
      ORDER BY qt.TargetCategory, qt.QualityTarget
    `;
    
    const request = pool.request();
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    // 计算汇总统计
    const records = result.recordset;
    const summary = {
      total: records.length,
      achieved: records.filter(r => r.AchievementStatus === '达成').length,
      approaching: records.filter(r => r.AchievementStatus === '接近').length,
      notAchieved: records.filter(r => r.AchievementStatus === '未达成').length,
      noData: records.filter(r => r.ActualValue === null).length
    };
    
    summary.achievementRate = summary.total > 0 ? 
      ((summary.achieved / summary.total) * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        records,
        summary
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
        qt.Unit,
        qts.ActualValue,
        qts.StatisticsPeriod,
        YEAR(qts.StatisticsPeriod) as Year,
        MONTH(qts.StatisticsPeriod) as Month,
        CASE 
          WHEN qts.ActualValue >= qt.TargetValue THEN '达成'
          WHEN qts.ActualValue >= qt.TargetValue * 0.8 THEN '接近'
          ELSE '未达成'
        END as AchievementStatus
      FROM QualityTargets qt
      LEFT JOIN QualityTargetStatistics qts ON qt.ID = qts.TargetID
      WHERE qt.ID = @targetId
        AND qt.IsDeleted = 0
        AND (qts.ID IS NULL OR (
          YEAR(qts.StatisticsPeriod) = @year
          AND qts.StatisticsPeriod >= DATEADD(MONTH, -@months, GETDATE())
        ))
      ORDER BY qts.StatisticsPeriod
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
      actualValue,
      statisticsPeriod,
      remarks
    } = req.body;
    
    if (!targetId || actualValue === undefined || !statisticsPeriod) {
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
        AND YEAR(StatisticsPeriod) = YEAR(@statisticsPeriod)
        AND MONTH(StatisticsPeriod) = MONTH(@statisticsPeriod)
    `;
    
    const existRequest = pool.request();
    existRequest.input('targetId', sql.Int, targetId);
    existRequest.input('statisticsPeriod', sql.Date, statisticsPeriod);
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
        TargetID, ActualValue, StatisticsPeriod, Remarks,
        CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
      ) VALUES (
        @targetId, @actualValue, @statisticsPeriod, @description,
        GETDATE(), GETDATE(), @createdBy, @updatedBy
      );
      SELECT SCOPE_IDENTITY() as newId;
    `;
    
    const request = pool.request();
    request.input('targetId', sql.Int, targetId);
    request.input('actualValue', sql.Decimal(10, 2), actualValue);
    request.input('statisticsPeriod', sql.Date, statisticsPeriod);
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
      actualValue,
      statisticsPeriod,
      remarks
    } = req.body;
    
    if (actualValue === undefined || !statisticsPeriod) {
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
        ActualValue = @actualValue,
        StatisticsPeriod = @statisticsPeriod,
        Description = @description,
        UpdatedAt = GETDATE(),
        UpdatedBy = @updatedBy
      WHERE ID = @id
    `;
    
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('actualValue', sql.Decimal(10, 2), actualValue);
    request.input('statisticsPeriod', sql.Date, statisticsPeriod);
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
      year = new Date().getFullYear()
    } = req.query;
    
    const pool = await getConnection();
    
    // 构建查询条件
    let whereConditions = ['qt.IsDeleted = 0'];
    let queryParams = [];
    
    if (category) {
      whereConditions.push('qt.Category = @category');
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
    
    if (year) {
      whereConditions.push('YEAR(qt.CreatedAt) = @year');
      queryParams.push({ name: 'year', type: sql.Int, value: parseInt(year) });
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const query = `
      SELECT 
        qt.TargetCategory as '目标分类',
        qt.AssessmentUnit as '考核单位',
        qt.QualityTarget as '质量目标',
        qt.CalculationFormula as '计算公式',
        qt.TargetValue as '目标值',
        qt.Measures as '措施',
        qt.ResponsiblePerson as '责任人',
        qt.StatisticsFrequency as '统计频次',
        qt.Remarks as '备注',
        FORMAT(qt.CreatedAt, 'yyyy-MM-dd HH:mm:ss') as '创建时间',
        qt.CreatedBy as '创建人'
      FROM QualityTargets qt
      WHERE ${whereClause}
      ORDER BY qt.TargetCategory, qt.CreatedAt DESC
    `;
    
    const request = pool.request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    
    // 设置响应头
    const filename = `质量目标数据_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // 生成CSV内容
    const records = result.recordset;
    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到符合条件的数据'
      });
    }
    
    // CSV头部（BOM + 列名）
    const headers = Object.keys(records[0]);
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    
    // CSV数据行
    records.forEach(record => {
      const row = headers.map(header => {
        const value = record[header] || '';
        // 处理包含逗号或引号的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += row.join(',') + '\n';
    });
    
    res.send(csvContent);
    
  } catch (error) {
    console.error('导出质量目标数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出质量目标数据失败',
      error: error.message
    });
  }
});

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

module.exports = router;