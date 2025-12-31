const express = require('express');
const router = express.Router();
const { sql, executeQuery } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// 获取所有检验项目
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      return await pool.request().query('SELECT * FROM InspectionItems WHERE Status = 1 ORDER BY SortOrder ASC');
    });
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('获取检验项目失败:', error);
    res.status(500).json({ success: false, message: '获取检验项目失败' });
  }
});

// 新增检验项目
router.post('/', authenticateToken, async (req, res) => {
  const { ItemName, Description, SortOrder, DataType, AcceptanceCriteria, MaterialCategory, AutoGenerateRule, Unit, InspectionBasis } = req.body;
  try {
    await executeQuery(async (pool) => {
      return await pool.request()
        .input('ItemName', sql.NVarChar, ItemName)
        .input('Description', sql.NVarChar, Description)
        .input('SortOrder', sql.Int, SortOrder || 0)
        .input('DataType', sql.NVarChar, DataType || 'Normal')
        .input('AcceptanceCriteria', sql.NVarChar, AcceptanceCriteria)
        .input('MaterialCategory', sql.NVarChar, MaterialCategory)
        .input('AutoGenerateRule', sql.NVarChar, AutoGenerateRule)
        .input('Unit', sql.NVarChar, Unit)
        .input('InspectionBasis', sql.NVarChar, InspectionBasis) // Added
        .input('CreatedBy', sql.NVarChar, req.user.username)
        .query(`
          INSERT INTO InspectionItems (ItemName, Description, SortOrder, DataType, AcceptanceCriteria, MaterialCategory, AutoGenerateRule, Unit, InspectionBasis, CreatedBy, Status)
          VALUES (@ItemName, @Description, @SortOrder, @DataType, @AcceptanceCriteria, @MaterialCategory, @AutoGenerateRule, @Unit, @InspectionBasis, @CreatedBy, 1)
        `);
    });
    res.json({ success: true, message: '添加成功' });
  } catch (error) {
    console.error('添加检验项目失败:', error);
    res.status(500).json({ success: false, message: '添加检验项目失败' });
  }
});

// 更新检验项目
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { ItemName, Description, SortOrder, DataType, AcceptanceCriteria, MaterialCategory, AutoGenerateRule, Unit, InspectionBasis } = req.body;
  try {
    await executeQuery(async (pool) => {
      return await pool.request()
        .input('ID', sql.Int, id)
        .input('ItemName', sql.NVarChar, ItemName)
        .input('Description', sql.NVarChar, Description)
        .input('SortOrder', sql.Int, SortOrder)
        .input('DataType', sql.NVarChar, DataType)
        .input('AcceptanceCriteria', sql.NVarChar, AcceptanceCriteria)
        .input('MaterialCategory', sql.NVarChar, MaterialCategory)
        .input('AutoGenerateRule', sql.NVarChar, AutoGenerateRule)
        .input('Unit', sql.NVarChar, Unit)
        .input('InspectionBasis', sql.NVarChar, InspectionBasis) // Added
        .input('UpdatedBy', sql.NVarChar, req.user.username)
        .query(`
          UPDATE InspectionItems 
          SET ItemName = @ItemName, 
              Description = @Description, 
              SortOrder = @SortOrder, 
              DataType = @DataType,
              AcceptanceCriteria = @AcceptanceCriteria,
              MaterialCategory = @MaterialCategory,
              AutoGenerateRule = @AutoGenerateRule,
              Unit = @Unit,
              InspectionBasis = @InspectionBasis,
              UpdatedBy = @UpdatedBy,
              UpdatedAt = GETDATE()
          WHERE ID = @ID
        `);
    });
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新检验项目失败:', error);
    res.status(500).json({ success: false, message: '更新检验项目失败' });
  }
});

// 删除检验项目 (软删除)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await executeQuery(async (pool) => {
      return await pool.request()
        .input('ID', sql.Int, id)
        .query('UPDATE InspectionItems SET Status = 0 WHERE ID = @ID');
    });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除检验项目失败:', error);
    res.status(500).json({ success: false, message: '删除检验项目失败' });
  }
});

module.exports = router;
