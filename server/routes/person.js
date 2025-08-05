const express = require('express');
const sql = require('mssql');
const { getDynamicConfig } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ===================== 获取人员列表 =====================
// GET /api/person/list?page=1&pageSize=10&search=xxx&includeInactive=false
router.get('/list', authenticateToken, async (req, res) => {
  const { page = 1, pageSize = 10, search = '', includeInactive = 'false' } = req.query;
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 构建WHERE条件
    let whereConditions = [];
    
    // 搜索条件
    if (search) {
      whereConditions.push(`(p.Name LIKE N'%${search}%' OR d.Name LIKE N'%${search}%')`);
    }
    
    // 是否包含离职员工
    if (includeInactive === 'false' || includeInactive === false) {
      whereConditions.push('p.IsActive = 1');
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 获取总数
    const countResult = await pool.request().query(`
      SELECT COUNT(*) AS total 
      FROM Person p 
      LEFT JOIN Department d ON p.DepartmentID = d.ID 
      ${whereClause}
    `);
    const total = countResult.recordset[0].total;
    
    // 分页查询
    const offset = (page - 1) * pageSize;
    const sqlQuery = `
      SELECT * FROM (
        SELECT 
          p.ID, p.Name, p.DepartmentID, p.IsActive,
          ISNULL(d.Name, '未分配') as DepartmentName,
          ROW_NUMBER() OVER (ORDER BY p.Name) AS RowNum
        FROM Person p 
        LEFT JOIN Department d ON p.DepartmentID = d.ID
        ${whereClause}
      ) AS T
      WHERE T.RowNum BETWEEN ${offset + 1} AND ${offset + pageSize}
      ORDER BY T.RowNum
    `;
    
    const result = await pool.request().query(sqlQuery);
    
    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: total
      }
    });
  } catch (error) {
    console.error('获取人员列表失败:', error);
    res.status(500).json({ error: '获取人员列表失败', details: error.message });
  }
});

// ===================== 新增人员 =====================
// POST /api/person
router.post('/', authenticateToken, async (req, res) => {
  const { name, departmentId, isActive = true } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '人员姓名不能为空' });
  }
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查姓名是否已存在
    const existResult = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('SELECT ID FROM Person WHERE Name = @name');
    
    if (existResult.recordset.length > 0) {
      return res.status(400).json({ error: '人员姓名已存在' });
    }
    
    // 插入新人员
    const insertResult = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('departmentId', sql.Int, departmentId || null)
      .input('isActive', sql.Bit, isActive)
      .query(`
        INSERT INTO Person (Name, DepartmentID, IsActive) 
        OUTPUT INSERTED.ID
        VALUES (@name, @departmentId, @isActive)
      `);
    
    const newId = insertResult.recordset[0].ID;
    
    res.json({
      success: true,
      message: '人员添加成功',
      data: { id: newId }
    });
  } catch (error) {
    console.error('添加人员失败:', error);
    res.status(500).json({ error: '添加人员失败', details: error.message });
  }
});

// ===================== 更新人员信息 =====================
// PUT /api/person/:id
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, departmentId, isActive } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '人员姓名不能为空' });
  }
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查人员是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ID FROM Person WHERE ID = @id');
    
    if (existResult.recordset.length === 0) {
      return res.status(404).json({ error: '人员不存在' });
    }
    
    // 检查姓名是否与其他人员重复
    const nameCheckResult = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('id', sql.Int, id)
      .query('SELECT ID FROM Person WHERE Name = @name AND ID != @id');
    
    if (nameCheckResult.recordset.length > 0) {
      return res.status(400).json({ error: '人员姓名已存在' });
    }
    
    // 更新人员信息
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('departmentId', sql.Int, departmentId || null)
      .input('isActive', sql.Bit, isActive)
      .query(`
        UPDATE Person 
        SET Name = @name, DepartmentID = @departmentId, IsActive = @isActive
        WHERE ID = @id
      `);
    
    res.json({
      success: true,
      message: '人员信息更新成功'
    });
  } catch (error) {
    console.error('更新人员信息失败:', error);
    res.status(500).json({ error: '更新人员信息失败', details: error.message });
  }
});

// ===================== 删除人员 =====================
// DELETE /api/person/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查人员是否存在
    const existResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ID, Name FROM Person WHERE ID = @id');
    
    if (existResult.recordset.length === 0) {
      return res.status(404).json({ error: '人员不存在' });
    }
    
    const personName = existResult.recordset[0].Name;
    
    // 检查是否有关联的投诉记录
    const complaintCheckResult = await pool.request()
      .input('personName', sql.NVarChar, personName)
      .query(`
        SELECT COUNT(*) as count FROM ComplaintRegister 
        WHERE MainPerson = @personName OR SecondPerson = @personName
      `);
    
    // 检查是否有关联的返工记录
    const reworkCheckResult = await pool.request()
      .input('personName', sql.NVarChar, personName)
      .query(`
        SELECT COUNT(*) as count FROM ProductionReworkRegister 
        WHERE ResponsiblePerson = @personName OR ReworkPersonnel LIKE '%' + @personName + '%'
      `);
    
    const hasComplaintRecords = complaintCheckResult.recordset[0].count > 0;
    const hasReworkRecords = reworkCheckResult.recordset[0].count > 0;
    
    if (hasComplaintRecords || hasReworkRecords) {
      return res.status(400).json({ 
        error: '无法删除该人员，存在关联的投诉或返工记录。建议将其设置为离职状态。',
        details: {
          complaintRecords: hasComplaintRecords,
          reworkRecords: hasReworkRecords
        }
      });
    }
    
    // 删除人员
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Person WHERE ID = @id');
    
    res.json({
      success: true,
      message: '人员删除成功'
    });
  } catch (error) {
    console.error('删除人员失败:', error);
    res.status(500).json({ error: '删除人员失败', details: error.message });
  }
});

// ===================== 切换人员状态 =====================
// POST /api/person/:id/toggle-status
router.post('/:id/toggle-status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 获取当前状态
    const currentResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ID, Name, IsActive FROM Person WHERE ID = @id');
    
    if (currentResult.recordset.length === 0) {
      return res.status(404).json({ error: '人员不存在' });
    }
    
    const person = currentResult.recordset[0];
    const newStatus = !person.IsActive;
    
    // 更新状态
    await pool.request()
      .input('id', sql.Int, id)
      .input('isActive', sql.Bit, newStatus)
      .query('UPDATE Person SET IsActive = @isActive WHERE ID = @id');
    
    res.json({
      success: true,
      message: `人员状态已更新为${newStatus ? '在职' : '离职'}`,
      data: {
        id: person.ID,
        name: person.Name,
        isActive: newStatus
      }
    });
  } catch (error) {
    console.error('切换人员状态失败:', error);
    res.status(500).json({ error: '切换人员状态失败', details: error.message });
  }
});

// ===================== 获取部门列表 =====================
// GET /api/person/departments
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    const result = await pool.request().query(`
      SELECT ID, Name FROM Department ORDER BY Name
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({ error: '获取部门列表失败', details: error.message });
  }
});

module.exports = router;