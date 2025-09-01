/**
 * 菜单管理路由
 * 提供菜单的增删改查功能，支持树形结构
 */

const express = require('express')
const router = express.Router()
const sql = require('mssql')
const { getConnection, executeQuery } = require('../db')
const { authenticateToken } = require('../middleware/auth')

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
          CAST(Status as BIT) as Status,
          CreatedAt,
          UpdatedAt
        FROM Menus
        ORDER BY SortOrder ASC, CreatedAt ASC
      `)
    
    // 将bit类型的Status字段转换为布尔值
    const processedMenus = result.recordset.map(menu => ({
      ...menu,
      Status: Boolean(menu.Status)
    }))
    
    // 构建树形结构
    const menuMap = new Map()
    const rootMenus = []
    
    // 先创建所有菜单的映射
    processedMenus.forEach(menu => {
      menu.children = []
      menuMap.set(menu.ID, menu)
    })
    
    // 构建父子关系
    processedMenus.forEach(menu => {
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

// 获取菜单列表
router.get('/', authenticateToken, async (req, res) => {
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
    
    const result = await executeQuery(async (pool) => {
      // 构建查询条件
      let whereConditions = ['1=1'] // 移除Status=1的硬编码限制，允许显示所有状态的菜单
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
      
      // 获取总数（只计算顶级菜单数量，用于分页）
      let countRequest = pool.request()
      queryParams.forEach(param => {
        countRequest.input(param.name, param.type, param.value)
      })
      
      const countResult = await countRequest.query(`
        SELECT COUNT(*) as total
        FROM Menus m
        WHERE ${whereClause} AND (m.ParentID IS NULL OR m.ParentID = 0)
      `)
      
      // 获取分页数据
      let dataRequest = pool.request()
      queryParams.forEach(param => {
        dataRequest.input(param.name, param.type, param.value)
      })
      dataRequest.input('offset', sql.Int, offset)
      dataRequest.input('size', sql.Int, parseInt(size))
    
      // 先获取分页的顶级菜单ID
      const topMenuResult = await dataRequest.query(`
        SELECT * FROM (
          SELECT
            ROW_NUMBER() OVER (ORDER BY m.SortOrder ASC, m.CreatedAt DESC) as RowNum,
            m.ID
          FROM Menus m
          WHERE ${whereClause} AND (m.ParentID IS NULL OR m.ParentID = 0)
        ) AS T
        WHERE T.RowNum BETWEEN @offset + 1 AND @offset + @size
        ORDER BY T.RowNum
      `)
      
      const topMenuIds = topMenuResult.recordset.map(item => item.ID)
      
      // 如果没有顶级菜单，返回空结果
      if (topMenuIds.length === 0) {
        return {
          list: [],
          total: countResult.recordset[0].total,
          page: parseInt(page),
          size: parseInt(size)
        }
      }
      
      // 获取这些顶级菜单及其所有子菜单
      const allMenusRequest = pool.request()
      queryParams.forEach(param => {
        allMenusRequest.input(param.name, param.type, param.value)
      })
      
      const dataResult = await allMenusRequest.query(`
        WITH MenuHierarchy AS (
          -- 获取分页的顶级菜单
          SELECT
            m.ID,
            m.MenuName as Name,
            m.MenuCode as Code,
            m.ParentID,
            m.MenuType as Type,
            m.Icon,
            m.Path,
            m.Component,
            m.Permission,
            m.SortOrder,
            CAST(m.Status as BIT) as Status,
            m.CreatedAt,
            m.UpdatedAt,
            0 as Level
          FROM Menus m
          WHERE m.ID IN (${topMenuIds.join(',')}) AND ${whereClause}
          
          UNION ALL
          
          -- 递归获取所有子菜单（不应用筛选条件，只获取子菜单）
          SELECT
            m.ID,
            m.MenuName as Name,
            m.MenuCode as Code,
            m.ParentID,
            m.MenuType as Type,
            m.Icon,
            m.Path,
            m.Component,
            m.Permission,
            m.SortOrder,
            CAST(m.Status as BIT) as Status,
            m.CreatedAt,
            m.UpdatedAt,
            mh.Level + 1
          FROM Menus m
          INNER JOIN MenuHierarchy mh ON m.ParentID = mh.ID
        )
        SELECT * FROM MenuHierarchy
        ORDER BY Level ASC, SortOrder ASC, CreatedAt DESC
      `)
      
      // 将bit类型的Status字段转换为布尔值
      const processedData = dataResult.recordset.map(item => ({
        ...item,
        Status: Boolean(item.Status)
      }))
      
      return {
        list: processedData,
        total: countResult.recordset[0].total,
        page: parseInt(page),
        size: parseInt(size)
      }
    })
    
    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (!result) {
      console.error('获取菜单列表失败: executeQuery 返回 null，可能是数据库连接问题')
      return res.status(500).json({
        success: false,
        message: '获取菜单列表失败，数据库连接异常',
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
    console.error('获取菜单列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取菜单列表失败',
      error: error.message
    })
  }
})

// 获取所有操作代码选项
router.get('/action-codes', async (req, res) => {
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .query(`
        SELECT DISTINCT Permission 
        FROM Menus 
        WHERE Permission IS NOT NULL AND Permission != ''
      `)
    
    // 从Permission字段中提取操作代码
    const actionCodes = new Set()
    result.recordset.forEach(row => {
      const permission = row.Permission
      if (permission && permission.includes(':')) {
        const parts = permission.split(':')
        const actionCode = parts[parts.length - 1] // 取最后一部分作为操作代码
        if (actionCode) {
          actionCodes.add(actionCode)
        }
      }
    })
    
    // 转换为前端需要的格式
    const options = Array.from(actionCodes).map(code => ({
      label: getActionLabel(code),
      value: code
    }))
    
    res.json({
      success: true,
      data: options
    })
  } catch (error) {
    console.error('获取操作代码失败:', error)
    res.status(500).json({
      success: false,
      message: '获取操作代码失败'
    })
  }
})

// 获取用户权限菜单
router.get('/user-menus', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id
    const username = req.user?.username
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录'
      })
    }

    const result = await executeQuery(async (pool) => {
      let queryResult
      
      // 对admin用户只使用角色权限，对其他用户同时考虑角色权限和用户权限
      if (username === 'admin') {
        // admin用户：只通过角色权限获取菜单
        queryResult = await pool.request()
          .input('userId', sql.Int, userId)
          .query(`
            SELECT DISTINCT
              m.ID,
              m.MenuName as Name,
              m.MenuCode as Code,
              m.ParentID,
              m.MenuType as Type,
              m.Icon,
              CASE 
                WHEN m.Path LIKE '/admin/%' THEN m.Path
                WHEN m.Path = '/' THEN '/admin/dashboard'
                ELSE '/admin' + m.Path
              END as Path,
              m.Component,
              m.Permission,
              m.SortOrder,
              m.Status
            FROM Menus m
            INNER JOIN RoleMenus rm ON m.ID = rm.MenuID
            INNER JOIN [UserRoles] ur ON rm.RoleID = ur.RoleID AND ur.UserID = @userId
            WHERE m.Status = 1 
              AND m.Visible = 1
              AND m.MenuType IN ('catalog', 'menu')
            ORDER BY m.SortOrder ASC, m.ID ASC
          `)
      } else {
        // 其他用户：同时考虑角色权限和用户权限
        queryResult = await pool.request()
          .input('userId', sql.Int, userId)
          .query(`
            SELECT DISTINCT
              m.ID,
              m.MenuName as Name,
              m.MenuCode as Code,
              m.ParentID,
              m.MenuType as Type,
              m.Icon,
              CASE 
                WHEN m.Path LIKE '/admin/%' THEN m.Path
                WHEN m.Path = '/' THEN '/admin/dashboard'
                ELSE '/admin' + m.Path
              END as Path,
              m.Component,
              m.Permission,
              m.SortOrder,
              m.Status
            FROM Menus m
            WHERE m.Status = 1 
              AND m.Visible = 1
              AND m.MenuType IN ('catalog', 'menu')
              AND (
                -- 通过角色权限获得的菜单
                EXISTS (
                  SELECT 1 FROM RoleMenus rm 
                  INNER JOIN [UserRoles] ur ON rm.RoleID = ur.RoleID 
                  WHERE rm.MenuID = m.ID AND ur.UserID = @userId
                )
                OR
                -- 通过用户权限获得的菜单（允许访问且未过期，且权限级别为menu，且状态有效）
                EXISTS (
                  SELECT 1 FROM UserPermissions up 
                  WHERE up.UserID = @userId 
                    AND up.MenuID = m.ID 
                    AND up.PermissionLevel = 'menu'
                    AND up.Status = 1
                    AND (up.ExpiresAt IS NULL OR up.ExpiresAt > GETDATE())
                )
              )
              -- 排除被用户权限明确拒绝的菜单（且状态有效）
              AND NOT EXISTS (
                SELECT 1 FROM UserPermissions up 
                WHERE up.UserID = @userId 
                  AND up.MenuID = m.ID 
                  AND up.PermissionLevel = 'deny'
                  AND up.Status = 1
                  AND (up.ExpiresAt IS NULL OR up.ExpiresAt > GETDATE())
              )
            ORDER BY m.SortOrder ASC, m.ID ASC
          `)
      }
      
      // 构建树形结构
      const menuMap = new Map()
      const rootMenus = []
      
      // 先创建所有菜单的映射
      queryResult.recordset.forEach(menu => {
        menu.children = []
        menuMap.set(menu.ID, menu)
      })
      
      // 构建父子关系
      queryResult.recordset.forEach(menu => {
        if (menu.ParentID && menuMap.has(menu.ParentID)) {
          menuMap.get(menu.ParentID).children.push(menu)
        } else {
          rootMenus.push(menu)
        }
      })
      
      return rootMenus
    })
    
    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (!result) {
      console.error('获取用户菜单失败: executeQuery 返回 null，可能是数据库连接问题')
      return res.json({
        success: true,
        data: getDefaultMenus()
      })
    }
    
    // 如果没有查询到菜单数据，返回默认菜单
    if (result.length === 0) {
      return res.json({
        success: true,
        data: getDefaultMenus()
      })
    }
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取用户菜单失败:', error)
    // 出错时返回默认菜单
    res.json({
      success: true,
      data: getDefaultMenus()
    })
  }
})



// 根据ID获取菜单详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await executeQuery(async (pool) => {
      const queryResult = await pool.request()
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
      
      return queryResult.recordset[0] || null
    })
    
    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (result === null) {
      console.error('获取菜单详情失败: executeQuery 返回 null，可能是数据库连接问题')
      return res.status(500).json({
        success: false,
        message: '获取菜单详情失败，数据库连接异常'
      })
    }
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在'
      })
    }
    
    res.json({
      success: true,
      data: result
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

    const result = await executeQuery(async (pool) => {
      // 检查菜单编码是否已存在
      const checkResult = await pool.request()
        .input('code', sql.NVarChar(50), Code)
        .query('SELECT COUNT(*) as count FROM Menus WHERE MenuCode = @code')
      
      if (checkResult.recordset[0].count > 0) {
        throw new Error('菜单编码已存在')
      }
      
      // 如果有父菜单，检查父菜单是否存在
      if (ParentID) {
        const parentResult = await pool.request()
          .input('parentId', sql.Int, ParentID)
          .query('SELECT COUNT(*) as count FROM Menus WHERE ID = @parentId')
        
        if (parentResult.recordset[0].count === 0) {
          throw new Error('父菜单不存在')
        }
      }
      
      // 插入新菜单
      const insertResult = await pool.request()
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
      
      return insertResult.recordset[0].ID
    })
    
    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (result === null) {
      console.error('创建菜单失败: executeQuery 返回 null，可能是数据库连接问题')
      return res.status(500).json({
        success: false,
        message: '创建菜单失败，数据库连接异常'
      })
    }
    
    res.status(201).json({
      success: true,
      message: '菜单创建成功',
      data: { id: result }
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

    const result = await executeQuery(async (pool) => {
      // 检查菜单是否存在
      const existResult = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Menus WHERE ID = @id')
      
      if (existResult.recordset[0].count === 0) {
        throw new Error('菜单不存在')
      }
      
      // 检查菜单编码是否已被其他菜单使用
      const checkResult = await pool.request()
        .input('code', sql.NVarChar(50), Code)
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Menus WHERE MenuCode = @code AND ID != @id')
      
      if (checkResult.recordset[0].count > 0) {
        throw new Error('菜单编码已存在')
      }
      
      // 如果有父菜单，检查父菜单是否存在且不是自己
      if (ParentID) {
        if (ParentID == id) {
          throw new Error('不能将自己设为父菜单')
        }
        
        const parentResult = await pool.request()
          .input('parentId', sql.Int, ParentID)
          .query('SELECT COUNT(*) as count FROM Menus WHERE ID = @parentId')
        
        if (parentResult.recordset[0].count === 0) {
          throw new Error('父菜单不存在')
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
      
      return true
    })
    
    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (result === null) {
      console.error('更新菜单失败: executeQuery 返回 null，可能是数据库连接问题')
      return res.status(500).json({
        success: false,
        message: '更新菜单失败，数据库连接异常'
      })
    }
    
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
    
    const result = await executeQuery(async (pool) => {
      // 检查菜单是否存在
      const existResult = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Menus WHERE ID = @id')
      
      if (existResult.recordset[0].count === 0) {
        throw new Error('菜单不存在')
      }
      
      // 检查是否有子菜单
      const childResult = await pool.request()
        .input('parentId', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM Menus WHERE ParentID = @parentId')
      
      if (childResult.recordset[0].count > 0) {
        throw new Error('该菜单下还有子菜单，无法删除')
      }
      
      // 检查是否有角色关联
      const roleResult = await pool.request()
        .input('menuId', sql.Int, id)
        .query('SELECT COUNT(*) as count FROM RoleMenus WHERE MenuID = @menuId')
      
      if (roleResult.recordset[0].count > 0) {
        throw new Error('该菜单已分配给角色，无法删除')
      }
      
      // 删除菜单
      await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM Menus WHERE ID = @id')
      
      return true
    })
    
    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (result === null) {
      console.error('删除菜单失败: executeQuery 返回 null，可能是数据库连接问题')
      return res.status(500).json({
        success: false,
        message: '删除菜单失败，数据库连接异常'
      })
    }
    
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
    const result = await executeQuery(async (pool) => {
      const queryResult = await pool.request()
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
      
      return queryResult.recordset
    })
    
    // 检查 executeQuery 是否返回 null（数据库连接失败）
    if (result === null) {
      console.error('获取菜单选项失败: executeQuery 返回 null，可能是数据库连接问题')
      return res.status(500).json({
        success: false,
        message: '获取菜单选项失败，数据库连接异常'
      })
    }
    
    res.json({
      success: true,
      data: result
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

// 默认菜单数据（当数据库查询失败时的后备方案）
/**
 * 获取默认菜单列表
 * 当数据库查询失败或用户没有任何菜单权限时的后备方案
 * 只包含基础的、对所有后台用户开放的菜单
 */
function getDefaultMenus() {
  return [
    {
      ID: 1,
      Name: '仪表盘',
      Code: 'dashboard',
      Path: '/admin/dashboard',
      Icon: 'HomeFilled',
      Type: 'menu',
      children: []
    }
    // 注意：移除了用户管理、供应商管理等需要特定权限的菜单
    // 这些菜单应该通过数据库权限控制，而不是在默认菜单中提供
  ]
}



/**
 * 根据操作代码获取中文标签
 * @param {string} actionCode - 操作代码
 * @returns {string} 中文标签
 */
function getActionLabel(actionCode) {
  const labelMap = {
    'view': '查看',
    'add': '新增',
    'edit': '编辑',
    'delete': '删除',
    'export': '导出',
    'import': '导入',
    'audit': '审核',
    'manage': '管理',
    'upload': '上传',
    'download': '下载',
    'approve': '审批',
    'reject': '拒绝',
    'submit': '提交',
    'cancel': '取消',
    'update': '更新',
    'create': '创建',
    'list': '列表',
    'detail': '详情',
    'filter': '筛选',
    'clear': '清空',
    'manual': '手动同步',
    'mark-all-read': '全部标记已读',
    'mark-read': '标记已读',
    'statistics': '统计',
    'close': '关闭',
    'process': '处理投诉',
    'grant': '用户授权'
  }
  
  return labelMap[actionCode] || actionCode
}

module.exports = router