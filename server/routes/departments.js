/**
 * 部门管理路由
 * 提供部门的增删改查功能
 */

const express = require('express')
const router = express.Router()
const sql = require('mssql')
const { poolPromise } = require('../config/database')

// 获取部门列表
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise
    const result = await pool.request()
      .query(`
        SELECT 
          ID,
          Name,
          DeptCode,
          ParentID,
          DeptType,
          Leader,
          Phone,
          Email,
          Description,
          SortOrder,
          Status,
          CreatedAt,
          UpdatedAt
        FROM Department 
        WHERE Status = 1
        ORDER BY SortOrder ASC, CreatedAt DESC
      `)
    
    res.json({
      success: true,
      data: result.recordset
    })
  } catch (error) {
    console.error('获取部门列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取部门列表失败',
      error: error.message
    })
  }
})

// 根据ID获取部门详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await poolPromise
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          ID,
          Name,
          DeptCode,
          ParentID,
          DeptType,
          Leader,
          Phone,
          Email,
          Description,
          SortOrder,
          Status,
          CreatedAt,
          UpdatedAt
        FROM Department 
        WHERE ID = @id
      `)
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      })
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    })
  } catch (error) {
    console.error('获取部门详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取部门详情失败',
      error: error.message
    })
  }
})

// 创建部门
router.post('/', async (req, res) => {
  try {
    const {
      Name,
      DeptCode,
      ParentID,
      DeptType = 'department',
      Leader,
      Phone,
      Email,
      Description,
      SortOrder = 0,
      Status = true
    } = req.body
    
    // 验证必填字段
    if (!Name || !DeptCode) {
      return res.status(400).json({
        success: false,
        message: '部门名称和部门编码为必填项'
      })
    }
    
    const pool = await poolPromise
    
    // 检查部门编码是否已存在
    const checkResult = await pool.request()
      .input('deptCode', sql.NVarChar(20), DeptCode)
      .query('SELECT COUNT(*) as count FROM Department WHERE DeptCode = @deptCode')
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '部门编码已存在'
      })
    }
    
    // 插入新部门
    const result = await pool.request()
      .input('name', sql.NVarChar(50), Name)
      .input('deptCode', sql.NVarChar(20), DeptCode)
      .input('parentId', sql.Int, ParentID)
      .input('deptType', sql.NVarChar(20), DeptType)
      .input('leader', sql.NVarChar(50), Leader)
      .input('phone', sql.NVarChar(20), Phone)
      .input('email', sql.NVarChar(100), Email)
      .input('description', sql.NVarChar(500), Description)
      .input('sortOrder', sql.Int, SortOrder)
      .input('status', sql.Bit, Status)
      .query(`
        INSERT INTO Department (
          Name, DeptCode, ParentID, DeptType, Leader, Phone, Email, 
          Description, SortOrder, Status, CreatedAt, UpdatedAt
        ) 
        OUTPUT INSERTED.ID
        VALUES (
          @name, @deptCode, @parentId, @deptType, @leader, @phone, @email,
          @description, @sortOrder, @status, GETDATE(), GETDATE()
        )
      `)
    
    res.status(201).json({
      success: true,
      message: '部门创建成功',
      data: { id: result.recordset[0].ID }
    })
  } catch (error) {
    console.error('创建部门失败:', error)
    res.status(500).json({
      success: false,
      message: '创建部门失败',
      error: error.message
    })
  }
})

// 更新部门
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      Name,
      DeptCode,
      ParentID,
      DeptType,
      Leader,
      Phone,
      Email,
      Description,
      SortOrder,
      Status
    } = req.body
    
    // 验证必填字段
    if (!Name || !DeptCode) {
      return res.status(400).json({
        success: false,
        message: '部门名称和部门编码为必填项'
      })
    }
    
    const pool = await poolPromise
    
    // 检查部门是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Department WHERE ID = @id')
    
    if (existResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      })
    }
    
    // 检查部门编码是否已被其他部门使用
    const checkResult = await pool.request()
      .input('deptCode', sql.NVarChar(20), DeptCode)
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Department WHERE DeptCode = @deptCode AND ID != @id')
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '部门编码已存在'
      })
    }
    
    // 更新部门
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(50), Name)
      .input('deptCode', sql.NVarChar(20), DeptCode)
      .input('parentId', sql.Int, ParentID)
      .input('deptType', sql.NVarChar(20), DeptType)
      .input('leader', sql.NVarChar(50), Leader)
      .input('phone', sql.NVarChar(20), Phone)
      .input('email', sql.NVarChar(100), Email)
      .input('description', sql.NVarChar(500), Description)
      .input('sortOrder', sql.Int, SortOrder)
      .input('status', sql.Bit, Status)
      .query(`
        UPDATE Department SET
          Name = @name,
          DeptCode = @deptCode,
          ParentID = @parentId,
          DeptType = @deptType,
          Leader = @leader,
          Phone = @phone,
          Email = @email,
          Description = @description,
          SortOrder = @sortOrder,
          Status = @status,
          UpdatedAt = GETDATE()
        WHERE ID = @id
      `)
    
    res.json({
      success: true,
      message: '部门更新成功'
    })
  } catch (error) {
    console.error('更新部门失败:', error)
    res.status(500).json({
      success: false,
      message: '更新部门失败',
      error: error.message
    })
  }
})

// 删除部门
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await poolPromise
    
    // 检查部门是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Department WHERE ID = @id')
    
    if (existResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      })
    }
    
    // 检查是否有子部门
    const childResult = await pool.request()
      .input('parentId', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Department WHERE ParentID = @parentId')
    
    if (childResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该部门下还有子部门，无法删除'
      })
    }
    
    // 检查是否有用户关联
    const userResult = await pool.request()
      .input('deptId', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM [User] WHERE DepartmentID = @deptId')
    
    if (userResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该部门下还有用户，无法删除'
      })
    }
    
    // 删除部门
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Department WHERE ID = @id')
    
    res.json({
      success: true,
      message: '部门删除成功'
    })
  } catch (error) {
    console.error('删除部门失败:', error)
    res.status(500).json({
      success: false,
      message: '删除部门失败',
      error: error.message
    })
  }
})

module.exports = router