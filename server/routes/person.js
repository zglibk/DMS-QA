const express = require('express');
const sql = require('mssql');
const { getDynamicConfig } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ===================== 获取用户列表 =====================
// GET /api/person?page=1&pageSize=10&search=xxx&includeInactive=false
router.get('/', authenticateToken, async (req, res) => {
  const { page = 1, pageSize = 10, search = '', includeInactive = 'false' } = req.query;
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 构建WHERE条件
    let whereConditions = [];
    
    // 搜索条件
    if (search) {
      whereConditions.push(`(u.Username LIKE N'%${search}%' OR u.RealName LIKE N'%${search}%' OR d.Name LIKE N'%${search}%')`);
    }
    
    // 是否包含非活跃用户
    if (includeInactive === 'false' || includeInactive === false) {
      whereConditions.push('u.Status = 1');
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 获取总数
    const countResult = await pool.request().query(`
      SELECT COUNT(*) AS total 
      FROM [User] u 
      LEFT JOIN Department d ON u.DepartmentID = d.ID 
      ${whereClause}
    `);
    const total = countResult.recordset[0].total;
    
    // 分页查询
    const offset = (page - 1) * pageSize;
    const sqlQuery = `
      SELECT * FROM (
        SELECT 
          u.ID, u.Username, u.RealName, u.DepartmentID, u.Status,
          ISNULL(d.Name, '未分配') as DepartmentName,
          ROW_NUMBER() OVER (ORDER BY u.Username) AS RowNum
        FROM [User] u 
        LEFT JOIN Department d ON u.DepartmentID = d.ID
        ${whereClause}
      ) AS NumberedResult
      WHERE RowNum BETWEEN ${offset + 1} AND ${offset + parseInt(pageSize)}
      ORDER BY RowNum
    `;
    
    const result = await pool.request().query(sqlQuery);
    
    // 转换数据格式
    const processedData = result.recordset.map(user => ({
      ID: user.ID,
      Username: user.Username,
      RealName: user.RealName || user.Username,
      Name: user.RealName || user.Username, // 兼容前端期望的Name字段
      DepartmentID: user.DepartmentID,
      DepartmentName: user.DepartmentName,
      IsActive: user.Status === 1, // 转换Status为IsActive
      Status: user.Status
    }));
    
    res.json({
      success: true,
      data: processedData,
      total: total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取用户列表失败', 
      details: error.message 
    });
  }
});

// GET /api/person/list?page=1&pageSize=10&search=xxx&includeInactive=false&departmentId=1
router.get('/list', authenticateToken, async (req, res) => {
  const { page = 1, pageSize = 10, search = '', includeInactive = 'false', departmentId } = req.query;
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查 PersonDepartment 表是否存在
    let useNewTable = false;
    try {
      const checkTable = await pool.request().query(`
        SELECT TOP 1 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PersonDepartment'
      `);
      useNewTable = checkTable.recordset.length > 0;
    } catch (e) {
      useNewTable = false;
    }
    
    // 构建WHERE条件
    let whereConditions = [];
    
    // 是否包含离职员工
    if (includeInactive === 'false' || includeInactive === false) {
      whereConditions.push('p.IsActive = 1');
    }
    
    if (useNewTable) {
      // ===== 使用新的 PersonDepartment 多对多表 =====
      
      // 搜索条件
      if (search) {
        whereConditions.push(`(p.Name LIKE N'%${search}%' OR EXISTS (
          SELECT 1 FROM PersonDepartment pd2 
          JOIN Department d2 ON pd2.DepartmentID = d2.ID 
          WHERE pd2.PersonID = p.ID AND d2.Name LIKE N'%${search}%'
        ))`);
      }
      
      // 部门筛选 - 通过PersonDepartment表查询（包含兼职）
      if (departmentId) {
        whereConditions.push(`EXISTS (SELECT 1 FROM PersonDepartment pd3 WHERE pd3.PersonID = p.ID AND pd3.DepartmentID = ${parseInt(departmentId)})`);
      }
      
      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
      
      // 获取总数
      const countResult = await pool.request().query(`
        SELECT COUNT(DISTINCT p.ID) AS total FROM Person p ${whereClause}
      `);
      const total = countResult.recordset[0].total;
      
      // 分页查询 - 使用 FOR XML PATH 替代 STRING_AGG（兼容旧版SQL Server）
      const offset = (page - 1) * pageSize;
      const sqlQuery = `
        SELECT * FROM (
          SELECT 
            p.ID, p.Name, p.DepartmentID, p.IsActive,
            ISNULL(
              STUFF((
                SELECT ', ' + d.Name
                FROM PersonDepartment pd
                JOIN Department d ON pd.DepartmentID = d.ID
                WHERE pd.PersonID = p.ID
                ORDER BY pd.IsPrimary DESC, d.Name
                FOR XML PATH(''), TYPE
              ).value('.', 'NVARCHAR(MAX)'), 1, 2, ''),
              ISNULL(d_old.Name, N'未分配')
            ) AS DepartmentName,
            ISNULL(
              STUFF((
                SELECT ',' + CAST(pd.DepartmentID AS VARCHAR)
                FROM PersonDepartment pd
                WHERE pd.PersonID = p.ID
                ORDER BY pd.IsPrimary DESC
                FOR XML PATH(''), TYPE
              ).value('.', 'NVARCHAR(MAX)'), 1, 1, ''),
              CAST(p.DepartmentID AS VARCHAR)
            ) AS DepartmentIds,
            ROW_NUMBER() OVER (ORDER BY p.Name) AS RowNum
          FROM Person p 
          LEFT JOIN Department d_old ON p.DepartmentID = d_old.ID
          ${whereClause}
        ) AS T
        WHERE T.RowNum BETWEEN ${offset + 1} AND ${offset + pageSize}
        ORDER BY T.RowNum
      `;
      
      const result = await pool.request().query(sqlQuery);
      
      // 转换DepartmentIds为数组
      const data = result.recordset.map(row => ({
        ...row,
        DepartmentIds: row.DepartmentIds ? row.DepartmentIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : []
      }));
      
      res.json({
        success: true,
        data: data,
        pagination: { current: parseInt(page), pageSize: parseInt(pageSize), total: total }
      });
      
    } else {
      // ===== 降级：使用旧的 Person.DepartmentID 单字段 =====
      
      if (search) {
        whereConditions.push(`(p.Name LIKE N'%${search}%' OR d.Name LIKE N'%${search}%')`);
      }
      if (departmentId) {
        whereConditions.push(`p.DepartmentID = ${parseInt(departmentId)}`);
      }
      
      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
      
      const countResult = await pool.request().query(`
        SELECT COUNT(*) AS total FROM Person p LEFT JOIN Department d ON p.DepartmentID = d.ID ${whereClause}
      `);
      const total = countResult.recordset[0].total;
      
      const offset = (page - 1) * pageSize;
      const result = await pool.request().query(`
        SELECT * FROM (
          SELECT p.ID, p.Name, p.DepartmentID, p.IsActive, ISNULL(d.Name, N'未分配') as DepartmentName,
          ROW_NUMBER() OVER (ORDER BY p.Name) AS RowNum
          FROM Person p LEFT JOIN Department d ON p.DepartmentID = d.ID ${whereClause}
        ) AS T WHERE T.RowNum BETWEEN ${offset + 1} AND ${offset + pageSize} ORDER BY T.RowNum
      `);
      
      res.json({
        success: true,
        data: result.recordset.map(r => ({ ...r, DepartmentIds: r.DepartmentID ? [r.DepartmentID] : [] })),
        pagination: { current: parseInt(page), pageSize: parseInt(pageSize), total: total }
      });
    }
  } catch (error) {
    console.error('获取人员列表失败:', error);
    res.status(500).json({ error: '获取人员列表失败', details: error.message });
  }
});

// ===================== 新增人员 =====================
// POST /api/person
router.post('/', authenticateToken, async (req, res) => {
  const { name, departmentId, departmentIds, isActive = true } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '人员姓名不能为空' });
  }
  
  const trimmedName = name.trim();
  
  // 兼容单部门和多部门参数
  const deptIds = departmentIds || (departmentId ? [departmentId] : []);
  
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查姓名是否已存在
    const existResult = await pool.request()
      .input('name', sql.NVarChar, trimmedName)
      .query('SELECT ID FROM Person WHERE Name = @name');
    
    if (existResult.recordset.length > 0) {
      return res.status(400).json({ error: `人员姓名"${trimmedName}"已存在` });
    }
    
    // 插入新人员（保留DepartmentID兼容旧代码，存第一个部门）
    const primaryDeptId = deptIds.length > 0 ? deptIds[0] : null;
    const insertResult = await pool.request()
      .input('name', sql.NVarChar, trimmedName)
      .input('departmentId', sql.Int, primaryDeptId)
      .input('isActive', sql.Bit, isActive)
      .query(`
        INSERT INTO Person (Name, DepartmentID, IsActive) 
        OUTPUT INSERTED.ID
        VALUES (@name, @departmentId, @isActive)
      `);
    
    const newId = insertResult.recordset[0].ID;
    
    // 插入多部门关联
    for (let i = 0; i < deptIds.length; i++) {
      try {
        await pool.request()
          .input('personId', sql.Int, newId)
          .input('deptId', sql.Int, deptIds[i])
          .input('isPrimary', sql.Bit, i === 0 ? 1 : 0)
          .query(`INSERT INTO PersonDepartment (PersonID, DepartmentID, IsPrimary) VALUES (@personId, @deptId, @isPrimary)`);
      } catch (e) {
        // PersonDepartment表可能不存在，静默忽略
      }
    }
    
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
  const { name, departmentId, departmentIds, isActive } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '人员姓名不能为空' });
  }
  
  // 兼容单部门和多部门参数
  const deptIds = departmentIds || (departmentId ? [departmentId] : []);
  
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
    
    // 更新人员信息（保留DepartmentID兼容旧代码）
    const primaryDeptId = deptIds.length > 0 ? deptIds[0] : null;
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('departmentId', sql.Int, primaryDeptId)
      .input('isActive', sql.Bit, isActive)
      .query(`
        UPDATE Person 
        SET Name = @name, DepartmentID = @departmentId, IsActive = @isActive
        WHERE ID = @id
      `);
    
    // 更新多部门关联（先删后插）
    try {
      await pool.request()
        .input('personId', sql.Int, id)
        .query('DELETE FROM PersonDepartment WHERE PersonID = @personId');
      
      for (let i = 0; i < deptIds.length; i++) {
        await pool.request()
          .input('personId', sql.Int, id)
          .input('deptId', sql.Int, deptIds[i])
          .input('isPrimary', sql.Bit, i === 0)
          .query(`INSERT INTO PersonDepartment (PersonID, DepartmentID, IsPrimary) VALUES (@personId, @deptId, @isPrimary)`);
      }
    } catch (e) {
      // PersonDepartment表可能不存在，忽略
    }
    
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
    const blockReasons = [];
    
    // 检查关联的投诉记录（表可能不存在）
    try {
      const r = await pool.request()
        .input('personName', sql.NVarChar, personName)
        .query(`SELECT COUNT(*) as count FROM ComplaintRegister WHERE MainPerson = @personName OR SecondPerson = @personName`);
      if (r.recordset[0].count > 0) blockReasons.push(`${r.recordset[0].count} 条投诉记录`);
    } catch (e) { /* 表不存在则跳过 */ }
    
    // 检查关联的返工记录
    try {
      const r = await pool.request()
        .input('personName', sql.NVarChar, personName)
        .query(`SELECT COUNT(*) as count FROM ProductionReworkRegister WHERE ResponsiblePerson = @personName OR ReworkPersonnel LIKE '%' + @personName + '%'`);
      if (r.recordset[0].count > 0) blockReasons.push(`${r.recordset[0].count} 条返工记录`);
    } catch (e) { /* 表不存在则跳过 */ }
    
    // 检查关联的资质记录
    try {
      const r = await pool.request()
        .input('id', sql.Int, id)
        .query(`SELECT COUNT(*) as count FROM PersonQualificationProfile WHERE PersonID = @id`);
      if (r.recordset[0].count > 0) blockReasons.push(`${r.recordset[0].count} 条资质记录`);
    } catch (e) { /* 表不存在则跳过 */ }

    // 检查关联的发布异常记录
    try {
      const r = await pool.request()
        .input('personName', sql.NVarChar, personName)
        .query(`SELECT COUNT(*) as count FROM publishing_exceptions WHERE responsible_person = @personName`);
      if (r.recordset[0].count > 0) blockReasons.push(`${r.recordset[0].count} 条发布异常记录`);
    } catch (e) { /* 表不存在则跳过 */ }

    // 检查关联的仪器设备记录
    try {
      const r = await pool.request()
        .input('id', sql.Int, id)
        .query(`SELECT COUNT(*) as count FROM Instruments WHERE ResponsiblePerson = @id`);
      if (r.recordset[0].count > 0) blockReasons.push(`${r.recordset[0].count} 条仪器设备记录`);
    } catch (e) { /* 表不存在则跳过 */ }
    
    if (blockReasons.length > 0) {
      return res.status(400).json({ 
        error: `无法删除"${personName}"，存在关联数据：${blockReasons.join('、')}。建议将其设置为离职状态。`
      });
    }
    
    // 执行删除
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Person WHERE ID = @id');
    
    res.json({
      success: true,
      message: '人员删除成功'
    });
  } catch (error) {
    console.error('删除人员失败:', error);
    // 捕获外键约束错误（兼容不同mssql库版本的error结构）
    const errNum = error.number || error.originalError?.info?.number;
    if (errNum === 547 || (error.message && error.message.includes('REFERENCE constraint'))) {
      return res.status(400).json({ error: '无法删除该人员，存在其他关联数据。建议将其设置为离职状态。' });
    }
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
    
    // 先检查 PersonDepartment 表是否存在
    let useNewTable = false;
    try {
      const checkTable = await pool.request().query(`
        SELECT TOP 1 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PersonDepartment'
      `);
      useNewTable = checkTable.recordset.length > 0;
    } catch (e) {
      useNewTable = false;
    }
    
    let result;
    if (useNewTable) {
      // 使用递归CTE计算每个部门及其所有子孙部门的去重人数
      result = await pool.request().query(`
        ;WITH DeptHierarchy AS (
          SELECT ID AS RootID, ID AS DescendantID
          FROM Department
          WHERE Status = 1
          UNION ALL
          SELECT h.RootID, d.ID AS DescendantID
          FROM DeptHierarchy h
          JOIN Department d ON d.ParentID = h.DescendantID
          WHERE d.Status = 1
        ),
        DeptPersonCount AS (
          SELECT 
            h.RootID AS DepartmentID,
            COUNT(DISTINCT CASE WHEN p.IsActive = 1 THEN pd.PersonID END) AS TotalCount
          FROM DeptHierarchy h
          LEFT JOIN PersonDepartment pd ON pd.DepartmentID = h.DescendantID
          LEFT JOIN Person p ON pd.PersonID = p.ID
          GROUP BY h.RootID
        ),
        DeptDirectCount AS (
          SELECT 
            pd.DepartmentID,
            COUNT(DISTINCT CASE WHEN p.IsActive = 1 THEN pd.PersonID END) AS DirectCount
          FROM PersonDepartment pd
          JOIN Person p ON pd.PersonID = p.ID
          GROUP BY pd.DepartmentID
        )
        SELECT 
          d.ID, d.Name, d.ParentID, d.DeptType, d.SortOrder,
          ISNULL(pc.TotalCount, 0) AS PersonCount,
          ISNULL(dc.DirectCount, 0) AS DirectCount
        FROM Department d
        LEFT JOIN DeptPersonCount pc ON d.ID = pc.DepartmentID
        LEFT JOIN DeptDirectCount dc ON d.ID = dc.DepartmentID
        WHERE d.Status = 1 
        ORDER BY d.SortOrder, d.Name
      `);
    } else {
      // 旧版：使用 Person.DepartmentID，同样用递归CTE
      result = await pool.request().query(`
        ;WITH DeptHierarchy AS (
          SELECT ID AS RootID, ID AS DescendantID
          FROM Department WHERE Status = 1
          UNION ALL
          SELECT h.RootID, d.ID AS DescendantID
          FROM DeptHierarchy h
          JOIN Department d ON d.ParentID = h.DescendantID
          WHERE d.Status = 1
        ),
        DeptPersonCount AS (
          SELECT 
            h.RootID AS DepartmentID,
            COUNT(DISTINCT CASE WHEN p.IsActive = 1 THEN p.ID END) AS TotalCount
          FROM DeptHierarchy h
          LEFT JOIN Person p ON p.DepartmentID = h.DescendantID
          GROUP BY h.RootID
        ),
        DeptDirectCount AS (
          SELECT DepartmentID, COUNT(*) AS DirectCount
          FROM Person WHERE IsActive = 1
          GROUP BY DepartmentID
        )
        SELECT 
          d.ID, d.Name, d.ParentID, d.DeptType, d.SortOrder,
          ISNULL(pc.TotalCount, 0) AS PersonCount,
          ISNULL(dc.DirectCount, 0) AS DirectCount
        FROM Department d
        LEFT JOIN DeptPersonCount pc ON d.ID = pc.DepartmentID
        LEFT JOIN DeptDirectCount dc ON d.ID = dc.DepartmentID
        WHERE d.Status = 1 
        ORDER BY d.SortOrder, d.Name
      `);
    }
    
    // 构建树形结构（人数已在SQL层计算好，无需JS层累加）
    const departments = result.recordset;
    const tree = buildDepartmentTree(departments, null);
    
    res.json({
      success: true,
      data: tree,
      flatData: departments
    });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({ error: '获取部门列表失败', details: error.message });
  }
});

/**
 * 构建部门树形结构（人数已在SQL层计算，此处只构建树结构）
 */
function buildDepartmentTree(departments, parentId) {
  const tree = [];
  for (const dept of departments) {
    if (dept.ParentID === parentId) {
      const children = buildDepartmentTree(departments, dept.ID);
      tree.push({
        ID: dept.ID,
        Name: dept.Name,
        ParentID: dept.ParentID,
        DeptType: dept.DeptType,
        PersonCount: dept.PersonCount || 0,
        DirectCount: dept.DirectCount || 0,
        children: children.length > 0 ? children : []
      });
    }
  }
  return tree;
}

module.exports = router;