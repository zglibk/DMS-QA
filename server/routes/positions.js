/**
 * 岗位管理路由
 * 提供岗位的增删改查功能
 */

const express = require('express')
const router = express.Router()
const sql = require('mssql')
const { getConnection, executeQuery } = require('../db')

// 获取岗位列表（支持分页和搜索）
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      departmentId = null,
      status = null
    } = req.query
    
    const offset = (page - 1) * size
    
    const result = await executeQuery(async (pool) => {
      // 构建查询条件
      let whereConditions = ['p.Status = 1']
      let queryParams = []
      
      if (keyword) {
        whereConditions.push('(p.PositionName LIKE @keyword OR p.PositionCode LIKE @keyword)')
        queryParams.push({ name: 'keyword', type: sql.NVarChar(100), value: `%${keyword}%` })
      }
      
      if (departmentId) {
        whereConditions.push('p.DepartmentID = @departmentId')
        queryParams.push({ name: 'departmentId', type: sql.Int, value: parseInt(departmentId) })
      }
      
      if (status !== null && status !== '') {
        whereConditions.push('p.Status = @status')
        queryParams.push({ name: 'status', type: sql.Bit, value: status === 'true' })
      }
      
      const whereClause = whereConditions.join(' AND ')
      
      // 获取总数
      let countRequest = pool.request()
      queryParams.forEach(param => {
        countRequest.input(param.name, param.type, param.value)
      })
      
      const countResult = await countRequest.query(`
        SELECT COUNT(*) as total
        FROM Positions p
        LEFT JOIN Department d ON p.DepartmentID = d.ID
        WHERE ${whereClause}
      `)
      
      // 获取分页数据
      let dataRequest = pool.request()
      queryParams.forEach(param => {
        dataRequest.input(param.name, param.type, param.value)
      })
      dataRequest.input('offset', sql.Int, offset)
      dataRequest.input('size', sql.Int, parseInt(size))
      
      const dataResult = await dataRequest.query(`
        SELECT * FROM (
          SELECT 
            ROW_NUMBER() OVER (ORDER BY p.SortOrder ASC, p.CreatedAt DESC) as RowNum,
            p.ID,
            p.PositionName as Name,
            p.PositionCode as Code,
            p.DepartmentID,
            d.Name as DepartmentName,
            p.Level,
            p.Description,
            p.Requirements,
            p.SortOrder,
            p.Status,
            p.CreatedAt,
            p.UpdatedAt
          FROM Positions p
          LEFT JOIN Department d ON p.DepartmentID = d.ID
          WHERE ${whereClause}
        ) AS T
        WHERE T.RowNum BETWEEN @offset + 1 AND @offset + @size
        ORDER BY T.RowNum
      `)
      
      return {
        list: dataResult.recordset,
        total: countResult.recordset[0].total,
        page: parseInt(page),
        size: parseInt(size)
      }
    })
    
    // 检查executeQuery是否返回null（数据库连接失败）
    if (!result) {
      console.error('获取岗位列表失败: executeQuery返回null，可能是数据库连接问题')
      return res.json({
        success: true,
        data: {
          list: [],
          total: 0,
          page: parseInt(page),
          size: parseInt(size)
        }
      })
    }
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取岗位列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取岗位列表失败',
      error: error.message
    })
  }
})

// 根据ID获取岗位详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          p.ID,
          p.PositionName as Name,
          p.PositionCode as Code,
          p.DepartmentID,
          d.Name as DepartmentName,
          p.Level,
          p.Description,
          p.Requirements,
          p.SortOrder,
          p.Status,
          p.CreatedAt,
          p.UpdatedAt
        FROM Positions p
        LEFT JOIN Department d ON p.DepartmentID = d.ID
        WHERE p.ID = @id
      `)
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      })
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    })
  } catch (error) {
    console.error('获取岗位详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取岗位详情失败',
      error: error.message
    })
  }
})

// 创建岗位
router.post('/', async (req, res) => {
  try {
    const {
      Name,
      Code,
      DepartmentID,
      Level,
      Description,
      Requirements,
      SortOrder = 0,
      Status = true
    } = req.body
    
    // 验证必填字段
    if (!Name || !Code || !DepartmentID) {
      return res.status(400).json({
        success: false,
        message: '岗位名称、岗位编码和所属部门为必填项'
      })
    }

    const pool = await getConnection()
    
    // 检查岗位编码是否已存在
    const checkResult = await pool.request()
      .input('code', sql.NVarChar(20), Code)
      .query('SELECT COUNT(*) as count FROM Positions WHERE PositionCode = @code')
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '岗位编码已存在'
      })
    }
    
    // 检查部门是否存在
    const deptResult = await pool.request()
      .input('deptId', sql.Int, DepartmentID)
      .query('SELECT COUNT(*) as count FROM Department WHERE ID = @deptId')
    
    if (deptResult.recordset[0].count === 0) {
      return res.status(400).json({
        success: false,
        message: '所属部门不存在'
      })
    }
    
    // 插入新岗位
    const result = await pool.request()
      .input('name', sql.NVarChar(50), Name)
      .input('code', sql.NVarChar(20), Code)
      .input('departmentId', sql.Int, DepartmentID)
      .input('level', sql.Int, Level)
      .input('description', sql.NVarChar(500), Description)
      .input('requirements', sql.NVarChar(1000), Requirements)
      .input('sortOrder', sql.Int, SortOrder)
      .input('status', sql.Bit, Status)
      .query(`
        INSERT INTO Positions (
          PositionName, PositionCode, DepartmentID, Level, Description, Requirements,
          SortOrder, Status, CreatedAt, UpdatedAt
        ) 
        OUTPUT INSERTED.ID
        VALUES (
          @name, @code, @departmentId, @level, @description, @requirements,
          @sortOrder, @status, GETDATE(), GETDATE()
        )
      `)
    
    res.status(201).json({
      success: true,
      message: '岗位创建成功',
      data: { id: result.recordset[0].ID }
    })
  } catch (error) {
    console.error('创建岗位失败:', error)
    res.status(500).json({
      success: false,
      message: '创建岗位失败',
      error: error.message
    })
  }
})

// 更新岗位
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      Name,
      Code,
      DepartmentID,
      Level,
      Description,
      Requirements,
      SortOrder,
      Status
    } = req.body
    
    // 验证必填字段
    if (!Name || !Code || !DepartmentID) {
      return res.status(400).json({
        success: false,
        message: '岗位名称、岗位编码和所属部门为必填项'
      })
    }

    const pool = await getConnection()
    
    // 检查岗位是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Positions WHERE ID = @id')
    
    if (existResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      })
    }
    
    // 检查岗位编码是否已被其他岗位使用
    const checkResult = await pool.request()
      .input('code', sql.NVarChar(20), Code)
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Positions WHERE PositionCode = @code AND ID != @id')
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '岗位编码已存在'
      })
    }
    
    // 检查部门是否存在
    const deptResult = await pool.request()
      .input('deptId', sql.Int, DepartmentID)
      .query('SELECT COUNT(*) as count FROM Department WHERE ID = @deptId')
    
    if (deptResult.recordset[0].count === 0) {
      return res.status(400).json({
        success: false,
        message: '所属部门不存在'
      })
    }
    
    // 更新岗位
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(50), Name)
      .input('code', sql.NVarChar(20), Code)
      .input('departmentId', sql.Int, DepartmentID)
      .input('level', sql.Int, Level)
      .input('description', sql.NVarChar(500), Description)
      .input('requirements', sql.NVarChar(1000), Requirements)
      .input('sortOrder', sql.Int, SortOrder)
      .input('status', sql.Bit, Status)
      .query(`
        UPDATE Positions SET
          PositionName = @name,
          PositionCode = @code,
          DepartmentID = @departmentId,
          Level = @level,
          Description = @description,
          Requirements = @requirements,
          SortOrder = @sortOrder,
          Status = @status,
          UpdatedAt = GETDATE()
        WHERE ID = @id
      `)
    
    res.json({
      success: true,
      message: '岗位更新成功'
    })
  } catch (error) {
    console.error('更新岗位失败:', error)
    res.status(500).json({
      success: false,
      message: '更新岗位失败',
      error: error.message
    })
  }
})

// 删除岗位
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    
    // 检查岗位是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Positions WHERE ID = @id')
    
    if (existResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: '岗位不存在'
      })
    }
    
    // 检查是否有用户关联
    const userResult = await pool.request()
      .input('positionId', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM [User] WHERE PositionID = @positionId')
    
    if (userResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该岗位下还有用户，无法删除'
      })
    }
    
    // 删除岗位
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Positions WHERE ID = @id')
    
    res.json({
      success: true,
      message: '岗位删除成功'
    })
  } catch (error) {
    console.error('删除岗位失败:', error)
    res.status(500).json({
      success: false,
      message: '删除岗位失败',
      error: error.message
    })
  }
})

module.exports = router