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

const express = require('express');
const { sql, getDynamicConfig } = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ===================== 获取部门树形列表 =====================
router.get('/tree', authMiddleware, async (req, res) => {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
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
    `);
    
    // 构建树形结构
    const departments = result.recordset;
    const tree = buildDepartmentTree(departments);
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('获取部门树失败:', error);
    res.status(500).json({ error: '获取部门树失败', details: error.message });
  }
});

// ===================== 获取部门列表（平铺） =====================
router.get('/list', authMiddleware, async (req, res) => {
  const { page = 1, pageSize = 10, name, status } = req.query;
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 构建查询条件
    let whereConditions = [];
    if (name) {
      whereConditions.push(`d.Name LIKE N'%${name}%'`);
    }
    if (status !== undefined && status !== '') {
      whereConditions.push(`d.Status = ${status}`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询总数
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM Department d ${whereClause}
    `);
    const total = countResult.recordset[0].total;
    
    // 分页查询
    const offset = (page - 1) * pageSize;
    const listResult = await pool.request().query(`
      SELECT 
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
      ORDER BY d.SortOrder, d.ID
      OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `);
    
    res.json({
      success: true,
      data: listResult.recordset,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: total
      }
    });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({ error: '获取部门列表失败', details: error.message });
  }
});

// ===================== 获取部门详情 =====================
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
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
        WHERE d.ID = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: '部门不存在' });
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('获取部门详情失败:', error);
    res.status(500).json({ error: '获取部门详情失败', details: error.message });
  }
});

// ===================== 新增部门 =====================
router.post('/', authMiddleware, async (req, res) => {
  const { 
    name, 
    deptCode, 
    deptType = 'department', 
    parentId, 
    leader, 
    phone, 
    email, 
    description, 
    sortOrder = 0 
  } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '部门名称不能为空' });
  }
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查部门名称是否已存在
    const existResult = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('SELECT ID FROM Department WHERE Name = @name');
    
    if (existResult.recordset.length > 0) {
      return res.status(400).json({ error: '部门名称已存在' });
    }
    
    // 检查部门编码是否已存在
    if (deptCode) {
      const codeExistResult = await pool.request()
        .input('deptCode', sql.NVarChar, deptCode)
        .query('SELECT ID FROM Department WHERE DeptCode = @deptCode');
      
      if (codeExistResult.recordset.length > 0) {
        return res.status(400).json({ error: '部门编码已存在' });
      }
    }
    
    // 验证父部门是否存在
    if (parentId) {
      const parentResult = await pool.request()
        .input('parentId', sql.Int, parentId)
        .query('SELECT ID FROM Department WHERE ID = @parentId');
      
      if (parentResult.recordset.length === 0) {
        return res.status(400).json({ error: '父部门不存在' });
      }
    }
    
    // 插入新部门
    const insertResult = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('deptCode', sql.NVarChar, deptCode)
      .input('deptType', sql.NVarChar, deptType)
      .input('parentId', sql.Int, parentId)
      .input('leader', sql.NVarChar, leader)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email)
      .input('description', sql.NVarChar, description)
      .input('sortOrder', sql.Int, sortOrder)
      .query(`
        INSERT INTO Department (
          Name, DeptCode, DeptType, ParentID, Leader, Phone, Email, 
          Description, SortOrder, Status, CreatedAt, UpdatedAt
        ) 
        OUTPUT INSERTED.ID
        VALUES (
          @name, @deptCode, @deptType, @parentId, @leader, @phone, @email,
          @description, @sortOrder, 1, GETDATE(), GETDATE()
        )
      `);
    
    res.json({
      success: true,
      message: '部门创建成功',
      data: { id: insertResult.recordset[0].ID }
    });
  } catch (error) {
    console.error('创建部门失败:', error);
    res.status(500).json({ error: '创建部门失败', details: error.message });
  }
});

// ===================== 更新部门 =====================
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    deptCode, 
    deptType, 
    parentId, 
    leader, 
    phone, 
    email, 
    description, 
    sortOrder,
    status 
  } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '部门名称不能为空' });
  }
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查部门是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ID FROM Department WHERE ID = @id');
    
    if (existResult.recordset.length === 0) {
      return res.status(404).json({ error: '部门不存在' });
    }
    
    // 检查部门名称是否已被其他部门使用
    const nameExistResult = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('id', sql.Int, id)
      .query('SELECT ID FROM Department WHERE Name = @name AND ID != @id');
    
    if (nameExistResult.recordset.length > 0) {
      return res.status(400).json({ error: '部门名称已存在' });
    }
    
    // 检查部门编码是否已被其他部门使用
    if (deptCode) {
      const codeExistResult = await pool.request()
        .input('deptCode', sql.NVarChar, deptCode)
        .input('id', sql.Int, id)
        .query('SELECT ID FROM Department WHERE DeptCode = @deptCode AND ID != @id');
      
      if (codeExistResult.recordset.length > 0) {
        return res.status(400).json({ error: '部门编码已存在' });
      }
    }
    
    // 验证父部门（不能设置自己为父部门）
    if (parentId) {
      if (parseInt(parentId) === parseInt(id)) {
        return res.status(400).json({ error: '不能设置自己为父部门' });
      }
      
      const parentResult = await pool.request()
        .input('parentId', sql.Int, parentId)
        .query('SELECT ID FROM Department WHERE ID = @parentId');
      
      if (parentResult.recordset.length === 0) {
        return res.status(400).json({ error: '父部门不存在' });
      }
    }
    
    // 更新部门
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('deptCode', sql.NVarChar, deptCode)
      .input('deptType', sql.NVarChar, deptType)
      .input('parentId', sql.Int, parentId)
      .input('leader', sql.NVarChar, leader)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email)
      .input('description', sql.NVarChar, description)
      .input('sortOrder', sql.Int, sortOrder)
      .input('status', sql.Bit, status)
      .query(`
        UPDATE Department SET 
          Name = @name,
          DeptCode = @deptCode,
          DeptType = @deptType,
          ParentID = @parentId,
          Leader = @leader,
          Phone = @phone,
          Email = @email,
          Description = @description,
          SortOrder = @sortOrder,
          Status = @status,
          UpdatedAt = GETDATE()
        WHERE ID = @id
      `);
    
    res.json({
      success: true,
      message: '部门更新成功'
    });
  } catch (error) {
    console.error('更新部门失败:', error);
    res.status(500).json({ error: '更新部门失败', details: error.message });
  }
});

// ===================== 删除部门 =====================
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查部门是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ID FROM Department WHERE ID = @id');
    
    if (existResult.recordset.length === 0) {
      return res.status(404).json({ error: '部门不存在' });
    }
    
    // 检查是否有子部门
    const childResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ID FROM Department WHERE ParentID = @id');
    
    if (childResult.recordset.length > 0) {
      return res.status(400).json({ error: '该部门下还有子部门，无法删除' });
    }
    
    // 检查是否有关联的用户
    const userResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ID FROM [User] WHERE DepartmentID = @id');
    
    if (userResult.recordset.length > 0) {
      return res.status(400).json({ error: '该部门下还有用户，无法删除' });
    }
    
    // 检查是否有关联的人员
    const personResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT Name FROM Person WHERE DepartmentID = @id');
    
    if (personResult.recordset.length > 0) {
      return res.status(400).json({ error: '该部门下还有人员，无法删除' });
    }
    
    // 删除部门
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Department WHERE ID = @id');
    
    res.json({
      success: true,
      message: '部门删除成功'
    });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({ error: '删除部门失败', details: error.message });
  }
});

// ===================== 获取部门选项（用于下拉选择） =====================
router.get('/options/list', authMiddleware, async (req, res) => {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    const result = await pool.request().query(`
      SELECT 
        ID as value,
        Name as label,
        ParentID,
        DeptType
      FROM Department
      WHERE Status = 1
      ORDER BY SortOrder, ID
    `);
    
    // 构建树形选项
    const options = buildDepartmentTree(result.recordset.map(item => ({
      ...item,
      value: item.value,
      label: item.label
    })));
    
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('获取部门选项失败:', error);
    res.status(500).json({ error: '获取部门选项失败', details: error.message });
  }
});

// ===================== 辅助函数：构建树形结构 =====================
function buildDepartmentTree(departments, parentId = null) {
  const tree = [];
  
  for (const dept of departments) {
    if (dept.ParentID === parentId) {
      const children = buildDepartmentTree(departments, dept.ID || dept.value);
      const node = {
        ...dept,
        children: children.length > 0 ? children : undefined
      };
      tree.push(node);
    }
  }
  
  return tree;
}

module.exports = router;