/**
 * 角色管理路由
 * 提供角色的增删改查功能，包括角色权限分配
 */

const express = require('express')
const router = express.Router()
const sql = require('mssql')
const { getConnection, executeQuery } = require('../db')

// 获取角色列表（支持分页和搜索）
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      status = null
    } = req.query
    
    const offset = (page - 1) * size
    
    const result = await executeQuery(async (pool) => {
      // 构建查询条件
      let whereConditions = ['1=1']  // 移除硬编码的状态过滤
      let queryParams = []
      
      if (keyword) {
        whereConditions.push('(r.RoleName LIKE @keyword OR r.RoleCode LIKE @keyword)')
        queryParams.push({ name: 'keyword', type: sql.NVarChar(100), value: `%${keyword}%` })
      }
      
      if (status !== null && status !== '') {
        whereConditions.push('r.Status = @status')
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
        FROM Roles r
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
            ROW_NUMBER() OVER (ORDER BY r.SortOrder ASC, r.CreatedAt DESC) as RowNum,
            r.ID,
            r.RoleName as Name,
            r.RoleCode as Code,
            r.Description,
            r.SortOrder,
            r.Status,
            r.CreatedAt,
            r.UpdatedAt,
            COUNT(ur.UserID) as UserCount
          FROM Roles r
          LEFT JOIN UserRoles ur ON r.ID = ur.RoleID
          WHERE ${whereClause}
          GROUP BY r.ID, r.RoleName, r.RoleCode, r.Description, r.SortOrder, r.Status, r.CreatedAt, r.UpdatedAt
        ) AS T
        WHERE T.RowNum BETWEEN @offset + 1 AND @offset + @size
        ORDER BY T.RowNum
      `)
      
      return { countResult, dataResult }
    })
    
    // 检查executeQuery是否返回null（数据库连接失败）
    if (!result) {
      console.error('获取角色列表失败: executeQuery返回null，可能是数据库连接问题')
      return res.json({ success: true, data: [], total: 0, page: parseInt(page), size: parseInt(size) })
    }
    
    const { countResult, dataResult } = result
    
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
    console.error('获取角色列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取角色列表失败',
      error: error.message
    })
  }
})

// 根据ID获取角色详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    
    // 获取角色基本信息
    const roleResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          ID,
          RoleName as Name,
          RoleCode as Code,
          Description,
          SortOrder,
          Status,
          CreatedAt,
          UpdatedAt
        FROM Roles
        WHERE ID = @id
      `)
    
    if (roleResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      })
    }
    
    // 获取角色关联的菜单权限
    const menuResult = await pool.request()
      .input('roleId', sql.Int, id)
      .query(`
        SELECT MenuID
        FROM RoleMenus
        WHERE RoleID = @roleId
      `)
    
    // 获取角色关联的部门
    const deptResult = await pool.request()
      .input('roleId', sql.Int, id)
      .query(`
        SELECT DepartmentID
        FROM RoleDepartments
        WHERE RoleID = @roleId
      `)
    
    const role = roleResult.recordset[0]
    role.MenuIDs = menuResult.recordset.map(item => item.MenuID)
    role.DepartmentIDs = deptResult.recordset.map(item => item.DepartmentID)
    
    res.json({
      success: true,
      data: role
    })
  } catch (error) {
    console.error('获取角色详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取角色详情失败',
      error: error.message
    })
  }
})

// 创建角色
router.post('/', async (req, res) => {
  try {
    const {
      Name,
      Code,
      Description,
      SortOrder = 0,
      Status = true,
      MenuIDs = [],
      DepartmentIDs = []
    } = req.body
    
    // 验证必填字段
    if (!Name || !Code) {
      return res.status(400).json({
        success: false,
        message: '角色名称和角色编码为必填项'
      })
    }

    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    
    try {
      await transaction.begin()
      
      // 检查角色编码是否已存在
      const checkResult = await transaction.request()
        .input('code', sql.NVarChar(20), Code)
        .query('SELECT COUNT(*) as count FROM Roles WHERE RoleCode = @code')
      
      if (checkResult.recordset[0].count > 0) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          message: '角色编码已存在'
        })
      }
      
      // 插入新角色
      const roleResult = await transaction.request()
        .input('name', sql.NVarChar(50), Name)
        .input('code', sql.NVarChar(20), Code)
        .input('description', sql.NVarChar(500), Description)
        .input('sortOrder', sql.Int, SortOrder)
        .input('status', sql.Bit, Status)
        .query(`
          INSERT INTO Roles (
            RoleName, RoleCode, Description, SortOrder, Status, CreatedAt, UpdatedAt
          ) 
          OUTPUT INSERTED.ID
          VALUES (
            @name, @code, @description, @sortOrder, @status, GETDATE(), GETDATE()
          )
        `)
      
      const roleId = roleResult.recordset[0].ID
      
      // 插入角色菜单关联
      if (MenuIDs && MenuIDs.length > 0) {
        for (const menuId of MenuIDs) {
          await transaction.request()
            .input('roleId', sql.Int, roleId)
            .input('menuId', sql.Int, menuId)
            .query(`
              INSERT INTO RoleMenus (RoleID, MenuID, CreatedAt)
              VALUES (@roleId, @menuId, GETDATE())
            `)
        }
      }
      
      // 插入角色部门关联
      if (DepartmentIDs && DepartmentIDs.length > 0) {
        for (const deptId of DepartmentIDs) {
          await transaction.request()
            .input('roleId', sql.Int, roleId)
            .input('deptId', sql.Int, deptId)
            .query(`
              INSERT INTO RoleDepartments (RoleID, DepartmentID, CreatedAt)
              VALUES (@roleId, @deptId, GETDATE())
            `)
        }
      }
      
      await transaction.commit()
      
      res.status(201).json({
        success: true,
        message: '角色创建成功',
        data: { id: roleId }
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error('创建角色失败:', error)
    res.status(500).json({
      success: false,
      message: '创建角色失败',
      error: error.message
    })
  }
})

// 更新角色
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      Name,
      Code,
      Description,
      SortOrder,
      Status,
      MenuIDs = [],
      DepartmentIDs = []
    } = req.body
    
    // 验证必填字段
    if (!Name || !Code) {
      return res.status(400).json({
        success: false,
        message: '角色名称和角色编码为必填项'
      })
    }

    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    
    try {
      await transaction.begin()
      
      // 检查角色是否存在
      const existResult = await transaction.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Roles WHERE ID = @id')
      
      if (existResult.recordset[0].count === 0) {
        await transaction.rollback()
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        })
      }
      
      // 检查角色编码是否已被其他角色使用
      const checkResult = await transaction.request()
        .input('code', sql.NVarChar(20), Code)
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Roles WHERE RoleCode = @code AND ID != @id')
      
      if (checkResult.recordset[0].count > 0) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          message: '角色编码已存在'
        })
      }
      
      // 更新角色基本信息
      await transaction.request()
        .input('id', sql.Int, id)
        .input('name', sql.NVarChar(50), Name)
        .input('code', sql.NVarChar(20), Code)
        .input('description', sql.NVarChar(500), Description)
        .input('sortOrder', sql.Int, SortOrder)
        .input('status', sql.Bit, Status)
        .query(`
          UPDATE Roles SET
            RoleName = @name,
            RoleCode = @code,
            Description = @description,
            SortOrder = @sortOrder,
            Status = @status,
            UpdatedAt = GETDATE()
          WHERE ID = @id
        `)
      
      // 删除原有的角色菜单关联
      await transaction.request()
        .input('roleId', sql.Int, id)
        .query('DELETE FROM RoleMenus WHERE RoleID = @roleId')
      
      // 插入新的角色菜单关联
      if (MenuIDs && MenuIDs.length > 0) {
        for (const menuId of MenuIDs) {
          await transaction.request()
            .input('roleId', sql.Int, id)
            .input('menuId', sql.Int, menuId)
            .query(`
              INSERT INTO RoleMenus (RoleID, MenuID, CreatedAt)
              VALUES (@roleId, @menuId, GETDATE())
            `)
        }
      }
      
      // 删除原有的角色部门关联
      await transaction.request()
        .input('roleId', sql.Int, id)
        .query('DELETE FROM RoleDepartments WHERE RoleID = @roleId')
      
      // 插入新的角色部门关联
      if (DepartmentIDs && DepartmentIDs.length > 0) {
        for (const deptId of DepartmentIDs) {
          await transaction.request()
            .input('roleId', sql.Int, id)
            .input('deptId', sql.Int, deptId)
            .query(`
              INSERT INTO RoleDepartments (RoleID, DepartmentID, CreatedAt)
              VALUES (@roleId, @deptId, GETDATE())
            `)
        }
      }
      
      await transaction.commit()
      
      res.json({
        success: true,
        message: '角色更新成功'
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error('更新角色失败:', error)
    res.status(500).json({
      success: false,
      message: '更新角色失败',
      error: error.message
    })
  }
})

// 删除角色
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    
    try {
      await transaction.begin()
      
      // 检查角色是否存在
      const existResult = await transaction.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Roles WHERE ID = @id')
      
      if (existResult.recordset[0].count === 0) {
        await transaction.rollback()
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        })
      }
      
      // 检查是否有用户关联
      const userResult = await transaction.request()
        .input('roleId', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM UserRoles WHERE RoleID = @roleId')
      
      if (userResult.recordset[0].count > 0) {
        await transaction.rollback()
        return res.status(400).json({
          success: false,
          message: '该角色下还有用户，无法删除'
        })
      }
      
      // 删除角色菜单关联
      await transaction.request()
        .input('roleId', sql.Int, id)
        .query('DELETE FROM RoleMenus WHERE RoleID = @roleId')
      
      // 删除角色部门关联
      await transaction.request()
        .input('roleId', sql.Int, id)
        .query('DELETE FROM RoleDepartments WHERE RoleID = @roleId')
      
      // 删除角色
      await transaction.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM Roles WHERE ID = @id')
      
      await transaction.commit()
      
      res.json({
        success: true,
        message: '角色删除成功'
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error('删除角色失败:', error)
    res.status(500).json({
      success: false,
      message: '删除角色失败',
      error: error.message
    })
  }
})

// 获取角色权限（菜单）
router.get('/:id/menus', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    
    // 检查角色是否存在
    const roleResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Roles WHERE ID = @id')
    
    if (roleResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      })
    }
    
    // 获取角色关联的菜单ID列表
    const menuResult = await pool.request()
      .input('roleId', sql.Int, id)
      .query(`
        SELECT MenuID
        FROM RoleMenus
        WHERE RoleID = @roleId
      `)
    
    const menuIds = menuResult.recordset.map(row => row.MenuID)
    
    res.json({
      success: true,
      data: menuIds
    })
  } catch (error) {
    console.error('获取角色权限失败:', error)
    res.status(500).json({
      success: false,
      message: '获取角色权限失败',
      error: error.message
    })
  }
})

// 保存角色权限（菜单）
router.post('/:id/menus', async (req, res) => {
  try {
    const { id } = req.params
    const { menuIds = [] } = req.body
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    
    try {
      await transaction.begin()
      
      // 检查角色是否存在
      const roleResult = await transaction.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Roles WHERE ID = @id')
      
      if (roleResult.recordset[0].count === 0) {
        await transaction.rollback()
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        })
      }
      
      // 删除现有的角色菜单关联
      await transaction.request()
        .input('roleId', sql.Int, id)
        .query('DELETE FROM RoleMenus WHERE RoleID = @roleId')
      
      // 插入新的角色菜单关联
      if (menuIds && menuIds.length > 0) {
        for (const menuId of menuIds) {
          await transaction.request()
            .input('roleId', sql.Int, id)
            .input('menuId', sql.Int, menuId)
            .query(`
              INSERT INTO RoleMenus (RoleID, MenuID, CreatedAt)
              VALUES (@roleId, @menuId, GETDATE())
            `)
        }
      }
      
      await transaction.commit()
      
      res.json({
        success: true,
        message: '权限保存成功'
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error('保存角色权限失败:', error)
    res.status(500).json({
      success: false,
      message: '保存角色权限失败',
      error: error.message
    })
  }
})

// 获取角色部门
router.get('/:id/departments', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    
    // 检查角色是否存在
    const roleResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM Roles WHERE ID = @id')
    
    if (roleResult.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      })
    }
    
    // 获取角色关联的部门ID列表
    const deptResult = await pool.request()
      .input('roleId', sql.Int, id)
      .query(`
        SELECT DepartmentID
        FROM RoleDepartments
        WHERE RoleID = @roleId
      `)
    
    const departmentIds = deptResult.recordset.map(row => row.DepartmentID)
    
    res.json({
      success: true,
      data: departmentIds
    })
  } catch (error) {
    console.error('获取角色部门失败:', error)
    res.status(500).json({
      success: false,
      message: '获取角色部门失败',
      error: error.message
    })
  }
})

// 保存角色部门
router.post('/:id/departments', async (req, res) => {
  try {
    const { id } = req.params
    const { departmentIds = [] } = req.body
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    
    try {
      await transaction.begin()
      
      // 检查角色是否存在
      const roleResult = await transaction.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Roles WHERE ID = @id')
      
      if (roleResult.recordset[0].count === 0) {
        await transaction.rollback()
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        })
      }
      
      // 删除现有的角色部门关联
      await transaction.request()
        .input('roleId', sql.Int, id)
        .query('DELETE FROM RoleDepartments WHERE RoleID = @roleId')
      
      // 插入新的角色部门关联
      if (departmentIds && departmentIds.length > 0) {
        for (const deptId of departmentIds) {
          await transaction.request()
            .input('roleId', sql.Int, id)
            .input('deptId', sql.Int, deptId)
            .query(`
              INSERT INTO RoleDepartments (RoleID, DepartmentID, CreatedAt)
              VALUES (@roleId, @deptId, GETDATE())
            `)
        }
      }
      
      await transaction.commit()
      
      res.json({
        success: true,
        message: '部门保存成功'
      })
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error('保存角色部门失败:', error)
    res.status(500).json({
      success: false,
      message: '保存角色部门失败',
      error: error.message
    })
  }
})

module.exports = router