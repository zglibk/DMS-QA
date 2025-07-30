/**
 * 菜单管理路由
 * 提供菜单的增删改查功能，支持树形结构
 */

const express = require('express')
const router = express.Router()
const sql = require('mssql')
const { getConnection } = require('../db')

// 获取菜单树形列表
router.get('/tree', async (req, res) => {
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .query(`
        SELECT
          ID,
          MenuName as Name,
          MenuCode as Code,
          ParentID,
          MenuType as Type,
          Icon,
          Path,
          Component,
          Permission,
          SortOrder,
          Status,
          CreatedAt,
          UpdatedAt
        FROM Menus
        WHERE Status = 1
        ORDER BY SortOrder ASC, CreatedAt ASC
      `)
    
    // 构建树形结构
    const menuMap = new Map()
    const rootMenus = []
    
    // 先创建所有菜单的映射
    result.recordset.forEach(menu => {
      menu.children = []
      menuMap.set(menu.ID, menu)
    })
    
    // 构建父子关系
    result.recordset.forEach(menu => {
      if (menu.ParentID && menuMap.has(menu.ParentID)) {
        menuMap.get(menu.ParentID).children.push(menu)
      } else {
        rootMenus.push(menu)
      }
    })
    
    res.json({
      success: true,
      data: rootMenus
    })
  } catch (error) {
    console.error('获取菜单树失败:', error)
    res.status(500).json({
      success: false,
      message: '获取菜单树失败',
      error: error.message
    })
  }
})

// 获取菜单列表（支持分页和搜索）
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      type = null,
      parentId = null,
      status = null
    } = req.query
    
    const offset = (page - 1) * size
    const pool = await getConnection()
    
    // 构建查询条件
    let whereConditions = ['m.Status = 1']
    let queryParams = []
    
    if (keyword) {
      whereConditions.push('(m.MenuName LIKE @keyword OR m.MenuCode LIKE @keyword)')
      queryParams.push({ name: 'keyword', type: sql.NVarChar(100), value: `%${keyword}%` })
    }

    if (type) {
      whereConditions.push('m.MenuType = @type')
      queryParams.push({ name: 'type', type: sql.NVarChar(20), value: type })
    }
    
    if (parentId !== null && parentId !== '') {
      if (parentId === '0') {
        whereConditions.push('m.ParentID IS NULL')
      } else {
        whereConditions.push('m.ParentID = @parentId')
        queryParams.push({ name: 'parentId', type: sql.Int, value: parseInt(parentId) })
      }
    }
    
    if (status !== null && status !== '') {
      whereConditions.push('m.Status = @status')
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
      FROM Menus m
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
          ROW_NUMBER() OVER (ORDER BY m.SortOrder ASC, m.CreatedAt DESC) as RowNum,
          m.ID,
          m.MenuName as Name,
          m.MenuCode as Code,
          m.ParentID,
          p.MenuName as ParentName,
          m.MenuType as Type,
          m.Icon,
          m.Path,
          m.Component,
          m.Permission,
          m.SortOrder,
          m.Status,
          m.CreatedAt,
          m.UpdatedAt
        FROM Menus m
        LEFT JOIN Menus p ON m.ParentID = p.ID
        WHERE ${whereClause}
      ) AS T
      WHERE T.RowNum BETWEEN @offset + 1 AND @offset + @size
      ORDER BY T.RowNum
    `)
    
    res.json({
      success: true,
      data: {
        list: dataResult.recordset,
        total: countResult.recordset[0].total,
        page: parseInt(page),
        size: parseInt(size)
      }
    })
  } catch (error) {
    console.error('获取菜单列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取菜单列表失败',
      error: error.message
    })
  }
})

// 根据ID获取菜单详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          m.ID,
          m.MenuName as Name,
          m.MenuCode as Code,
          m.ParentID,
          p.MenuName as ParentName,
          m.MenuType as Type,
          m.Icon,
          m.Path,
          m.Component,
          m.Permission,
          m.SortOrder,
          m.Status,
          m.CreatedAt,
          m.UpdatedAt
        FROM Menus m
        LEFT JOIN Menus p ON m.ParentID = p.ID
        WHERE m.ID = @id
      `)
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在'
      })
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    })
  } catch (error) {
    console.error('获取菜单详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取菜单详情失败',
      error: error.message
    })
  }
})

// 创建菜单
router.post('/', async (req, res) => {
  try {
    const {
      Name,
      Code,
      ParentID = null,
      Type,
      Icon,
      Path,
      Component,
      Permission,
      SortOrder = 0,
      Status = true
    } = req.body

    // 验证必填字段
    if (!Name || !Code || !Type) {
      return res.status(400).json({
        success: false,
        message: '菜单名称、菜单编码和菜单类型为必填项'
      })
    }

    const pool = await getConnection()
    
    // 检查菜单编码是否已存在
    const checkResult = await pool.request()
      .input('code', sql.NVarChar(50), Code)
      .query('SELECT COUNT(*) as count FROM Menus WHERE MenuCode = @code')
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '菜单编码已存在'
      })
    }
    
    // 如果有父菜单，检查父菜单是否存在
    if (ParentID) {
      const parentResult = await pool.request()
        .input('parentId', sql.Int, ParentID)
        .query('SELECT COUNT(*) as count FROM Menus WHERE ID = @parentId')
      
      if (parentResult.recordset[0].count === 0) {
        return res.status(400).json({
          success: false,
          message: '父菜单不存在'
        })
      }
    }
    
    // 插入新菜单
    const result = await pool.request()
      .input('name', sql.NVarChar(50), Name)
      .input('code', sql.NVarChar(50), Code)
      .input('parentId', sql.Int, ParentID)
      .input('type', sql.NVarChar(10), Type)
      .input('icon', sql.NVarChar(50), Icon)
      .input('path', sql.NVarChar(200), Path)
      .input('component', sql.NVarChar(200), Component)
      .input('permission', sql.NVarChar(100), Permission)
      .input('sortOrder', sql.Int, SortOrder)
      .input('status', sql.Bit, Status)
      .query(`
        INSERT INTO Menus (
          MenuName, MenuCode, ParentID, MenuType, Icon, Path, Component, Permission,
          SortOrder, Status, CreatedAt, UpdatedAt
        )
        OUTPUT INSERTED.ID
        VALUES (
          @name, @code, @parentId, @type, @icon, @path, @component, @permission,
          @sortOrder, @status, GETDATE(), GETDATE()
        )
      `)
    
    res.status(201).json({
      success: true,
      message: '菜单创建成功',
      data: { id: result.recordset[0].ID }
    })
  } catch (error) {
    console.error('创建菜单失败:', error)
    res.status(500).json({
      success: false,
      message: '创建菜单失败',
      error: error.message
    })
  }
})

// 更新菜单
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      Name,
      Code,
      ParentID,
      Type,
      Icon,
      Path,
      Component,
      Permission,
      SortOrder,
      Status
    } = req.body
    
    // 验证必填字段
    if (!Name || !Code || !Type) {
      return res.status(400).json({
        success: false,
        message: '菜单名称、菜单编码和菜单类型为必填项'
      })
    }

    const pool = await getConnection()
    
    // 检查菜单是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Menus WHERE ID = @id')
    
    if (existResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在'
      })
    }
    
    // 检查菜单编码是否已被其他菜单使用
    const checkResult = await pool.request()
      .input('code', sql.NVarChar(50), Code)
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Menus WHERE MenuCode = @code AND ID != @id')
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '菜单编码已存在'
      })
    }
    
    // 如果有父菜单，检查父菜单是否存在且不是自己
    if (ParentID) {
      if (ParentID == id) {
        return res.status(400).json({
          success: false,
          message: '不能将自己设为父菜单'
        })
      }
      
      const parentResult = await pool.request()
        .input('parentId', sql.Int, ParentID)
        .query('SELECT COUNT(*) as count FROM Menus WHERE ID = @parentId')
      
      if (parentResult.recordset[0].count === 0) {
        return res.status(400).json({
          success: false,
          message: '父菜单不存在'
        })
      }
    }
    
    // 更新菜单
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(50), Name)
      .input('code', sql.NVarChar(50), Code)
      .input('parentId', sql.Int, ParentID)
      .input('type', sql.NVarChar(10), Type)
      .input('icon', sql.NVarChar(50), Icon)
      .input('path', sql.NVarChar(200), Path)
      .input('component', sql.NVarChar(200), Component)
      .input('permission', sql.NVarChar(100), Permission)
      .input('sortOrder', sql.Int, SortOrder)
      .input('status', sql.Bit, Status)
      .query(`
        UPDATE Menus SET
          MenuName = @name,
          MenuCode = @code,
          ParentID = @parentId,
          MenuType = @type,
          Icon = @icon,
          Path = @path,
          Component = @component,
          Permission = @permission,
          SortOrder = @sortOrder,
          Status = @status,
          UpdatedAt = GETDATE()
        WHERE ID = @id
      `)
    
    res.json({
      success: true,
      message: '菜单更新成功'
    })
  } catch (error) {
    console.error('更新菜单失败:', error)
    res.status(500).json({
      success: false,
      message: '更新菜单失败',
      error: error.message
    })
  }
})

// 删除菜单
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    
    // 检查菜单是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Menus WHERE ID = @id')
    
    if (existResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在'
      })
    }
    
    // 检查是否有子菜单
    const childResult = await pool.request()
      .input('parentId', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Menus WHERE ParentID = @parentId')
    
    if (childResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该菜单下还有子菜单，无法删除'
      })
    }
    
    // 检查是否有角色关联
    const roleResult = await pool.request()
      .input('menuId', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM RoleMenus WHERE MenuID = @menuId')
    
    if (roleResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该菜单已分配给角色，无法删除'
      })
    }
    
    // 删除菜单
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Menus WHERE ID = @id')
    
    res.json({
      success: true,
      message: '菜单删除成功'
    })
  } catch (error) {
    console.error('删除菜单失败:', error)
    res.status(500).json({
      success: false,
      message: '删除菜单失败',
      error: error.message
    })
  }
})

// 获取菜单选项（用于下拉选择）
router.get('/options/list', async (req, res) => {
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .query(`
        SELECT
          ID as value,
          MenuName as label,
          ParentID,
          MenuType as Type
        FROM Menus
        WHERE Status = 1
        ORDER BY SortOrder ASC, CreatedAt ASC
      `)
    
    res.json({
      success: true,
      data: result.recordset
    })
  } catch (error) {
    console.error('获取菜单选项失败:', error)
    res.status(500).json({
      success: false,
      message: '获取菜单选项失败',
      error: error.message
    })
  }
})

module.exports = router