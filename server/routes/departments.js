/**
 * 部门管理路由模块
 *
 * 功能说明：
 * 1. 部门的增删改查
 * 2. 树形结构部门管理
 * 3. 部门层级关系维护
 * 4. 部门状态管理
 *
 * 技术特性：
 * - 支持树形结构
 * - 递归查询子部门
 * - 部门权限控制
 * - 数据完整性验证
 */

const express = require('express')
const router = express.Router()
const { sql, getDynamicConfig } = require('../db')
const { authenticateToken } = require('../middleware/auth')

// ===================== 获取部门树形列表 =====================
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const pool = await sql.connect(await getDynamicConfig())
    
    // 查询所有部门
    const result = await pool.request().query(`
      SELECT 
        ID,
        Name,
        DeptCode,
        DeptType,
        ParentID,
        Leader,
        Phone,
        Email,
        Description,
        SortOrder,
        Status,
        CreatedAt,
        UpdatedAt
      FROM Department
      ORDER BY SortOrder, ID
    `)
    
    // 构建树形结构
    const departments = result.recordset
    const tree = buildDepartmentTree(departments)
    
    res.json({
      success: true,
      data: tree
    })
  } catch (error) {
    console.error('获取部门树失败:', error)
    res.status(500).json({ error: '获取部门树失败', details: error.message })
  }
})

// ===================== 获取部门列表（平铺） =====================
router.get('/list', authenticateToken, async (req, res) => {
  const { page = 1, pageSize = 10, name, status } = req.query
  
  try {
    const pool = await sql.connect(await getDynamicConfig())
    
    // 构建查询条件
    let whereConditions = []
    if (name) {
      whereConditions.push(`d.Name LIKE N'%${name}%'`)
    }
    if (status !== undefined && status !== '') {
      whereConditions.push(`d.Status = ${status}`)
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // 查询总数
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM Department d ${whereClause}
    `)
    const total = countResult.recordset[0].total
    
    // 分页查询
    const offset = (page - 1) * pageSize
    const listResult = await pool.request()
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize)
      .query(`
      SELECT * FROM (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY d.SortOrder, d.ID) as RowNum,
          d.ID,
          d.Name,
          d.DeptCode,
          d.DeptType,
          d.ParentID,
          p.Name as ParentName,
          d.Leader,
          d.Phone,
          d.Email,
          d.Description,
          d.SortOrder,
          d.Status,
          d.CreatedAt,
          d.UpdatedAt
        FROM Department d
        LEFT JOIN Department p ON d.ParentID = p.ID
        ${whereClause}
      ) T
      WHERE T.RowNum BETWEEN @offset + 1 AND @offset + @pageSize
    `)
    
    res.json({
      success: true,
      data: listResult.recordset,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: total
      }
    })
  } catch (error) {
    console.error('获取部门列表失败:', error)
    res.status(500).json({ error: '获取部门列表失败', details: error.message })
  }
})

// 获取部门列表（兼容旧接口）
router.get('/', async (req, res) => {
  try {
    const pool = await sql.connect(await getDynamicConfig())
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
    
    // 构建适合el-cascader的树形结构数据
    const departments = result.recordset
    const tree = buildDepartmentTreeForCascader(departments)
    
    res.json({
      success: true,
      data: tree,
      message: '部门列表获取成功'
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
    const pool = await sql.connect(await getDynamicConfig())
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

    const pool = await sql.connect(await getDynamicConfig())
    
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
    
    // 处理唯一键约束冲突
    if (error.number === 2627) {
      return res.status(400).json({
        success: false,
        message: '部门编码已存在，请使用其他编码'
      })
    }
    
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

    const pool = await sql.connect(await getDynamicConfig())
    
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

// 递归获取所有子部门ID
async function getAllChildDepartmentIds(pool, parentId) {
  const childIds = []
  
  const childResult = await pool.request()
    .input('parentId', sql.Int, parentId)
    .query('SELECT ID FROM Department WHERE ParentID = @parentId')
  
  for (const child of childResult.recordset) {
    childIds.push(child.ID)
    // 递归获取子部门的子部门
    const grandChildIds = await getAllChildDepartmentIds(pool, child.ID)
    childIds.push(...grandChildIds)
  }
  
  return childIds
}

// 删除部门（支持级联删除）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { cascade = false } = req.query // 是否级联删除
    const pool = await sql.connect(await getDynamicConfig())
    
    // 检查部门是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT Name FROM Department WHERE ID = @id')
    
    if (existResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      })
    }
    
    const departmentName = existResult.recordset[0].Name
    
    // 获取所有需要删除的部门ID（包括子部门）
    const allDeptIds = [parseInt(id)]
    const childIds = await getAllChildDepartmentIds(pool, parseInt(id))
    allDeptIds.push(...childIds)
    
    // 如果不是级联删除，检查是否有子部门
    if (!cascade && childIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `该部门下还有 ${childIds.length} 个子部门，无法删除。如需删除整个部门树，请使用级联删除功能。`
      })
    }
    
    // 检查所有部门是否有用户或人员关联
    const userCheckPromises = allDeptIds.map(deptId => 
      pool.request()
        .input('deptId', sql.Int, deptId)
        .query('SELECT COUNT(*) as count, (SELECT Name FROM Department WHERE ID = @deptId) as deptName FROM [User] WHERE DepartmentID = @deptId')
    )
    
    const personCheckPromises = allDeptIds.map(deptId => 
      pool.request()
        .input('deptId', sql.Int, deptId)
        .query('SELECT COUNT(*) as count, (SELECT Name FROM Department WHERE ID = @deptId) as deptName FROM Person WHERE DepartmentID = @deptId')
    )
    
    const [userResults, personResults] = await Promise.all([
      Promise.all(userCheckPromises),
      Promise.all(personCheckPromises)
    ])
    
    const deptsWithUsers = userResults.filter(result => result.recordset[0].count > 0)
    const deptsWithPersons = personResults.filter(result => result.recordset[0].count > 0)
    
    if (deptsWithUsers.length > 0 || deptsWithPersons.length > 0) {
      const userDeptNames = deptsWithUsers.map(result => result.recordset[0].deptName)
      const personDeptNames = deptsWithPersons.map(result => result.recordset[0].deptName)
      const allAffectedDepts = [...new Set([...userDeptNames, ...personDeptNames])]
      
      return res.status(400).json({
        success: false,
        message: `以下部门下还有用户或人员，无法删除：${allAffectedDepts.join('、')}。请先转移或删除相关用户和人员。`
      })
    }
    
    // 按照从子到父的顺序删除部门（避免外键约束问题）
    const sortedDeptIds = [...allDeptIds].reverse()
    
    for (const deptId of sortedDeptIds) {
      await pool.request()
        .input('id', sql.Int, deptId)
        .query('DELETE FROM Department WHERE ID = @id')
    }
    
    const deletedCount = allDeptIds.length
    const message = deletedCount === 1 
      ? `部门"${departmentName}"删除成功`
      : `成功删除部门"${departmentName}"及其 ${deletedCount - 1} 个子部门`
    
    res.json({
      success: true,
      message: message,
      deletedCount: deletedCount
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

// ===================== 获取部门选项列表 =====================
router.get('/options/list', authenticateToken, async (req, res) => {
  try {
    const pool = await sql.connect(await getDynamicConfig())
    
    const result = await pool.request().query(`
      SELECT 
        ID as value,
        Name as label,
        ParentID,
        DeptType
      FROM Department
      WHERE Status = 1
      ORDER BY SortOrder, ID
    `)
    
    // 构建树形选项
    const options = buildDepartmentTree(result.recordset.map(item => ({
      ...item,
      value: item.value,
      label: item.label
    })))
    
    res.json({
      success: true,
      data: options
    })
  } catch (error) {
    console.error('获取部门选项失败:', error)
    res.status(500).json({ error: '获取部门选项失败', details: error.message })
  }
})

// ===================== 辅助函数：构建树形结构 =====================
function buildDepartmentTree(departments, parentId = null) {
  const tree = []
  
  for (const dept of departments) {
    if (dept.ParentID === parentId) {
      const children = buildDepartmentTree(departments, dept.ID || dept.value)
      const node = {
        ...dept,
        children: children.length > 0 ? children : undefined
      }
      tree.push(node)
    }
  }
  
  return tree
}

/**
 * 构建适合el-cascader组件的部门树形结构数据
 * @param {Array} departments - 部门数据数组
 * @param {Number} parentId - 父部门ID，默认为null（根节点）
 * @returns {Array} 树形结构的部门数据，格式为{value, label, children}
 */
function buildDepartmentTreeForCascader(departments, parentId = null) {
  const tree = []
  
  for (const dept of departments) {
    if (dept.ParentID === parentId) {
      const children = buildDepartmentTreeForCascader(departments, dept.ID)
      const node = {
        value: dept.ID,
        label: dept.Name,
        children: children.length > 0 ? children : undefined
      }
      tree.push(node)
    }
  }
  
  return tree
}

module.exports = router