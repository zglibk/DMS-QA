/**
 * 不良类别和不良项管理路由
 * 
 * 功能说明：
 * 1. 不良类别的增删改查
 * 2. 不良项的增删改查
 * 3. 不良项与类别的多对多关联管理
 * 4. 级联查询支持
 * 
 * 权限标识：
 * - quality:defective:view - 查看权限
 * - quality:defective:category:add - 新增类别
 * - quality:defective:category:edit - 编辑类别
 * - quality:defective:category:delete - 删除类别
 * - quality:defective:item:add - 新增不良项
 * - quality:defective:item:edit - 编辑不良项
 * - quality:defective:item:delete - 删除不良项
 * 
 * 版本：v1.0
 * 创建日期：2025-12-16
 */

const express = require('express');
const router = express.Router();
const { sql, getDynamicConfig, executeQuery } = require('../db');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// =====================================================
// 不良类别相关接口
// =====================================================

/**
 * 获取所有不良类别列表
 * GET /api/defective/categories
 * 查询参数：
 *   - includeInactive: 是否包含已禁用的类别，默认false
 *   - keyword: 搜索关键字
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { includeInactive, keyword } = req.query;
    
    const result = await executeQuery(async (pool) => {
      // 首先检查表结构，判断是否有新字段
      const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'DefectiveCategory' AND COLUMN_NAME = 'IsActive'
      `);
      const hasNewFields = columnCheck.recordset.length > 0;
      
      // 检查关联表是否存在
      const tableCheck = await pool.request().query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'DefectiveItemCategory'
      `);
      const hasRelationTable = tableCheck.recordset[0].count > 0;
      
      let query;
      if (hasNewFields && hasRelationTable) {
        // 新表结构
        query = `
          SELECT 
            dc.ID,
            dc.Name,
            dc.Description,
            dc.SortOrder,
            dc.IsActive,
            dc.CreatedAt,
            dc.UpdatedAt,
            (SELECT COUNT(*) FROM DefectiveItemCategory dic WHERE dic.CategoryID = dc.ID) AS ItemCount
          FROM DefectiveCategory dc
          WHERE 1=1
        `;
      } else if (hasNewFields) {
        // 有新字段但没有关联表
        query = `
          SELECT 
            dc.ID,
            dc.Name,
            dc.Description,
            dc.SortOrder,
            dc.IsActive,
            dc.CreatedAt,
            dc.UpdatedAt,
            (SELECT COUNT(*) FROM DefectiveItem di WHERE di.CategoryID = dc.ID) AS ItemCount
          FROM DefectiveCategory dc
          WHERE 1=1
        `;
      } else {
        // 旧表结构
        query = `
          SELECT 
            dc.ID,
            dc.Name,
            NULL AS Description,
            0 AS SortOrder,
            1 AS IsActive,
            NULL AS CreatedAt,
            NULL AS UpdatedAt,
            (SELECT COUNT(*) FROM DefectiveItem di WHERE di.CategoryID = dc.ID) AS ItemCount
          FROM DefectiveCategory dc
          WHERE 1=1
        `;
      }
      
      const request = pool.request();
      
      // 是否包含已禁用（仅在有新字段时生效）
      if (includeInactive !== 'true' && hasNewFields) {
        query += ' AND (dc.IsActive = 1 OR dc.IsActive IS NULL)';
      }
      
      // 关键字搜索
      if (keyword) {
        if (hasNewFields) {
          query += ' AND (dc.Name LIKE @keyword OR dc.Description LIKE @keyword)';
        } else {
          query += ' AND dc.Name LIKE @keyword';
        }
        request.input('keyword', sql.NVarChar, `%${keyword}%`);
      }
      
      query += ' ORDER BY dc.SortOrder ASC, dc.ID ASC';
      
      return await request.query(query);
    });
    
    res.json({
      code: 200,
      message: '获取成功',
      data: result?.recordset || []
    });
  } catch (error) {
    console.error('获取不良类别列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取不良类别列表失败',
      error: error.message
    });
  }
});

/**
 * 获取单个不良类别详情
 * GET /api/defective/categories/:id
 */
router.get('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            dc.ID,
            dc.Name,
            dc.Description,
            dc.SortOrder,
            dc.IsActive,
            dc.CreatedAt,
            dc.UpdatedAt
          FROM DefectiveCategory dc
          WHERE dc.ID = @id
        `);
    });
    
    if (!result?.recordset || result.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '不良类别不存在'
      });
    }
    
    res.json({
      code: 200,
      message: '获取成功',
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('获取不良类别详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取不良类别详情失败',
      error: error.message
    });
  }
});

/**
 * 新增不良类别
 * POST /api/defective/categories
 * 请求体：{ name, description, sortOrder, isActive }
 */
router.post('/categories', authenticateToken, async (req, res) => {
  try {
    const { name, description, sortOrder, isActive } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        code: 400,
        message: '类别名称不能为空'
      });
    }
    
    const result = await executeQuery(async (pool) => {
      // 检查名称是否已存在
      const existCheck = await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .query('SELECT ID FROM DefectiveCategory WHERE Name = @name');
      
      if (existCheck.recordset.length > 0) {
        throw new Error('类别名称已存在');
      }
      
      // 插入新记录
      const insertResult = await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .input('description', sql.NVarChar, description || null)
        .input('sortOrder', sql.Int, sortOrder || 0)
        .input('isActive', sql.Bit, isActive !== false ? 1 : 0)
        .query(`
          INSERT INTO DefectiveCategory (Name, Description, SortOrder, IsActive, CreatedAt, UpdatedAt)
          VALUES (@name, @description, @sortOrder, @isActive, GETDATE(), GETDATE());
          SELECT SCOPE_IDENTITY() AS ID;
        `);
      
      return insertResult;
    });
    
    res.json({
      code: 200,
      message: '新增成功',
      data: { id: result.recordset[0].ID }
    });
  } catch (error) {
    console.error('新增不良类别失败:', error);
    res.status(error.message === '类别名称已存在' ? 400 : 500).json({
      code: error.message === '类别名称已存在' ? 400 : 500,
      message: error.message || '新增不良类别失败'
    });
  }
});

/**
 * 更新不良类别
 * PUT /api/defective/categories/:id
 * 请求体：{ name, description, sortOrder, isActive }
 */
router.put('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sortOrder, isActive } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        code: 400,
        message: '类别名称不能为空'
      });
    }
    
    await executeQuery(async (pool) => {
      // 检查名称是否已被其他记录使用
      const existCheck = await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .input('id', sql.Int, id)
        .query('SELECT ID FROM DefectiveCategory WHERE Name = @name AND ID != @id');
      
      if (existCheck.recordset.length > 0) {
        throw new Error('类别名称已存在');
      }
      
      // 更新记录
      const updateResult = await pool.request()
        .input('id', sql.Int, id)
        .input('name', sql.NVarChar, name.trim())
        .input('description', sql.NVarChar, description || null)
        .input('sortOrder', sql.Int, sortOrder || 0)
        .input('isActive', sql.Bit, isActive !== false ? 1 : 0)
        .query(`
          UPDATE DefectiveCategory
          SET Name = @name,
              Description = @description,
              SortOrder = @sortOrder,
              IsActive = @isActive,
              UpdatedAt = GETDATE()
          WHERE ID = @id
        `);
      
      if (updateResult.rowsAffected[0] === 0) {
        throw new Error('类别不存在');
      }
      
      return updateResult;
    });
    
    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新不良类别失败:', error);
    const statusCode = ['类别名称已存在', '类别不存在'].includes(error.message) ? 400 : 500;
    res.status(statusCode).json({
      code: statusCode,
      message: error.message || '更新不良类别失败'
    });
  }
});

/**
 * 删除不良类别
 * DELETE /api/defective/categories/:id
 */
router.delete('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await executeQuery(async (pool) => {
      // 检查是否有关联的不良项
      const relatedItems = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) AS count FROM DefectiveItemCategory WHERE CategoryID = @id');
      
      if (relatedItems.recordset[0].count > 0) {
        throw new Error('该类别下存在关联的不良项，无法删除。请先解除关联关系。');
      }
      
      // 删除记录
      const deleteResult = await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM DefectiveCategory WHERE ID = @id');
      
      if (deleteResult.rowsAffected[0] === 0) {
        throw new Error('类别不存在');
      }
      
      return deleteResult;
    });
    
    // 如果 executeQuery 返回 null，说明重试多次后失败（非逻辑错误）
    if (!result && res.headersSent === false) {
       return res.status(500).json({
         code: 500,
         message: '删除不良类别失败（数据库连接异常）'
       });
    }
    
    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除不良类别失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '删除不良类别失败'
    });
  }
});

/**
 * 批量更新类别状态
 * POST /api/defective/categories/batch-status
 * 请求体：{ ids: [1, 2, 3], isActive: true/false }
 */
router.post('/categories/batch-status', authenticateToken, async (req, res) => {
  try {
    const { ids, isActive } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请选择要操作的类别'
      });
    }
    
    const result = await executeQuery(async (pool) => {
      const idList = ids.join(',');
      const updateResult = await pool.request()
        .input('isActive', sql.Bit, isActive ? 1 : 0)
        .query(`
          UPDATE DefectiveCategory 
          SET IsActive = @isActive, UpdatedAt = GETDATE()
          WHERE ID IN (${idList})
        `);
      
      return updateResult.rowsAffected[0];
    });
    
    res.json({
      code: 200,
      message: `成功${isActive ? '启用' : '禁用'} ${result} 个类别`,
      data: { successCount: result }
    });
  } catch (error) {
    console.error('批量更新类别状态失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '批量更新失败'
    });
  }
});

/**
 * 批量删除类别
 * POST /api/defective/categories/batch-delete
 * 请求体：{ ids: [1, 2, 3] }
 */
router.post('/categories/batch-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请选择要删除的类别'
      });
    }
    
    const result = await executeQuery(async (pool) => {
      const idList = ids.join(',');
      
      // 检查是否有关联的不良项
      const relatedCheck = await pool.request()
        .query(`
          SELECT CategoryID, COUNT(*) as cnt 
          FROM DefectiveItemCategory 
          WHERE CategoryID IN (${idList}) 
          GROUP BY CategoryID
        `);
      
      // 也检查旧的单一关联
      const legacyCheck = await pool.request()
        .query(`
          SELECT CategoryID, COUNT(*) as cnt 
          FROM DefectiveItem 
          WHERE CategoryID IN (${idList}) 
          GROUP BY CategoryID
        `);
      
      const hasRelated = relatedCheck.recordset.length > 0 || legacyCheck.recordset.length > 0;
      if (hasRelated) {
        throw new Error('选中的类别中存在有关联不良项的类别，无法删除');
      }
      
      // 执行删除
      const deleteResult = await pool.request()
        .query(`DELETE FROM DefectiveCategory WHERE ID IN (${idList})`);
      
      return deleteResult.rowsAffected[0];
    });
    
    res.json({
      code: 200,
      message: `成功删除 ${result} 个类别`,
      data: { successCount: result }
    });
  } catch (error) {
    console.error('批量删除类别失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '批量删除失败'
    });
  }
});

// =====================================================
// 不良项相关接口
// =====================================================

/**
 * 获取所有不良项列表
 * GET /api/defective/items
 * 查询参数：
 *   - categoryId: 按类别筛选
 *   - includeInactive: 是否包含已禁用的项
 *   - keyword: 搜索关键字
 */
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const { categoryId, includeInactive, keyword } = req.query;
    
    const result = await executeQuery(async (pool) => {
      // 首先检查表结构，判断是否有新字段
      const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'DefectiveItem' AND COLUMN_NAME = 'IsActive'
      `);
      const hasNewFields = columnCheck.recordset.length > 0;
      
      // 检查关联表是否存在
      const tableCheck = await pool.request().query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'DefectiveItemCategory'
      `);
      const hasRelationTable = tableCheck.recordset[0].count > 0;
      
      const request = pool.request();
      let query;
      
      if (hasNewFields) {
        // 新表结构
        if (categoryId && hasRelationTable) {
          // 按类别筛选（使用多对多关联表）
          query = `
            SELECT DISTINCT
              di.ID,
              di.Name,
              di.Description,
              di.SortOrder,
              di.IsActive,
              di.CreatedAt,
              di.UpdatedAt,
              di.CategoryID AS LegacyCategoryID
            FROM DefectiveItem di
            INNER JOIN DefectiveItemCategory dic ON di.ID = dic.ItemID
            WHERE dic.CategoryID = @categoryId
          `;
          request.input('categoryId', sql.Int, categoryId);
        } else if (categoryId) {
          // 按类别筛选（使用旧的单一关联）
          query = `
            SELECT 
              di.ID,
              di.Name,
              di.Description,
              di.SortOrder,
              di.IsActive,
              di.CreatedAt,
              di.UpdatedAt,
              di.CategoryID AS LegacyCategoryID
            FROM DefectiveItem di
            WHERE di.CategoryID = @categoryId
          `;
          request.input('categoryId', sql.Int, categoryId);
        } else {
          query = `
            SELECT 
              di.ID,
              di.Name,
              di.Description,
              di.SortOrder,
              di.IsActive,
              di.CreatedAt,
              di.UpdatedAt,
              di.CategoryID AS LegacyCategoryID
            FROM DefectiveItem di
            WHERE 1=1
          `;
        }
        
        // 是否包含已禁用
        if (includeInactive !== 'true') {
          query += ' AND (di.IsActive = 1 OR di.IsActive IS NULL)';
        }
        
        // 关键字搜索
        if (keyword) {
          query += ' AND (di.Name LIKE @keyword OR di.Description LIKE @keyword)';
          request.input('keyword', sql.NVarChar, `%${keyword}%`);
        }
      } else {
        // 旧表结构
        if (categoryId) {
          query = `
            SELECT 
              di.ID,
              di.Name,
              NULL AS Description,
              0 AS SortOrder,
              1 AS IsActive,
              NULL AS CreatedAt,
              NULL AS UpdatedAt,
              di.CategoryID AS LegacyCategoryID
            FROM DefectiveItem di
            WHERE di.CategoryID = @categoryId
          `;
          request.input('categoryId', sql.Int, categoryId);
        } else {
          query = `
            SELECT 
              di.ID,
              di.Name,
              NULL AS Description,
              0 AS SortOrder,
              1 AS IsActive,
              NULL AS CreatedAt,
              NULL AS UpdatedAt,
              di.CategoryID AS LegacyCategoryID
            FROM DefectiveItem di
            WHERE 1=1
          `;
        }
        
        // 关键字搜索
        if (keyword) {
          query += ' AND di.Name LIKE @keyword';
          request.input('keyword', sql.NVarChar, `%${keyword}%`);
        }
      }
      
      query += ' ORDER BY di.SortOrder ASC, di.ID ASC';
      
      const itemsResult = await request.query(query);
      
      // 获取每个不良项关联的所有类别
      if (itemsResult.recordset.length > 0) {
        console.log('=== 开始获取不良项关联的类别 ===');
        console.log('hasRelationTable:', hasRelationTable);
        console.log('不良项数量:', itemsResult.recordset.length);
        
        if (hasRelationTable) {
          // 使用多对多关联表
          const itemIds = itemsResult.recordset.map(item => item.ID);
          console.log('查询的ItemIDs:', itemIds);
          
          const categoriesResult = await pool.request()
            .query(`
              SELECT 
                dic.ItemID,
                dc.ID AS CategoryID,
                dc.Name AS CategoryName
              FROM DefectiveItemCategory dic
              INNER JOIN DefectiveCategory dc ON dic.CategoryID = dc.ID
              WHERE dic.ItemID IN (${itemIds.join(',')})
              ORDER BY dc.ID ASC
            `);
          
          console.log('DefectiveItemCategory查询结果:', categoriesResult.recordset);
          
          // 将类别信息附加到不良项上
          const categoryMap = {};
          categoriesResult.recordset.forEach(row => {
            if (!categoryMap[row.ItemID]) {
              categoryMap[row.ItemID] = [];
            }
            categoryMap[row.ItemID].push({
              id: row.CategoryID,
              name: row.CategoryName
            });
          });
          
          console.log('categoryMap:', categoryMap);
          
          itemsResult.recordset.forEach(item => {
            item.categories = categoryMap[item.ID] || [];
            item.categoryIds = item.categories.map(c => c.id);
          });
          
          console.log('处理后的第一条数据:', itemsResult.recordset[0]);
        } else {
          // 使用旧的单一关联
          const categoryIds = [...new Set(itemsResult.recordset.map(item => item.LegacyCategoryID).filter(id => id))];
          if (categoryIds.length > 0) {
            const categoriesResult = await pool.request()
              .query(`
                SELECT ID, Name FROM DefectiveCategory WHERE ID IN (${categoryIds.join(',')})
              `);
            
            const categoryMap = {};
            categoriesResult.recordset.forEach(row => {
              categoryMap[row.ID] = row.Name;
            });
            
            itemsResult.recordset.forEach(item => {
              if (item.LegacyCategoryID && categoryMap[item.LegacyCategoryID]) {
                item.categories = [{
                  id: item.LegacyCategoryID,
                  name: categoryMap[item.LegacyCategoryID]
                }];
                item.categoryIds = [item.LegacyCategoryID];
              } else {
                item.categories = [];
                item.categoryIds = [];
              }
            });
          } else {
            itemsResult.recordset.forEach(item => {
              item.categories = [];
              item.categoryIds = [];
            });
          }
        }
      }
      
      return itemsResult;
    });
    
    res.json({
      code: 200,
      message: '获取成功',
      data: result?.recordset || []
    });
  } catch (error) {
    console.error('获取不良项列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取不良项列表失败',
      error: error.message
    });
  }
});

/**
 * 获取单个不良项详情
 * GET /api/defective/items/:id
 */
router.get('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(async (pool) => {
      const itemResult = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            di.ID,
            di.Name,
            di.Description,
            di.SortOrder,
            di.IsActive,
            di.CreatedAt,
            di.UpdatedAt,
            di.CategoryID AS LegacyCategoryID
          FROM DefectiveItem di
          WHERE di.ID = @id
        `);
      
      if (itemResult.recordset.length === 0) {
        return null;
      }
      
      // 获取关联的类别
      const categoriesResult = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            dc.ID AS CategoryID,
            dc.Name AS CategoryName
          FROM DefectiveItemCategory dic
          INNER JOIN DefectiveCategory dc ON dic.CategoryID = dc.ID
          WHERE dic.ItemID = @id
          ORDER BY dc.SortOrder ASC
        `);
      
      const item = itemResult.recordset[0];
      item.categories = categoriesResult.recordset.map(row => ({
        id: row.CategoryID,
        name: row.CategoryName
      }));
      item.categoryIds = item.categories.map(c => c.id);
      
      return item;
    });
    
    if (!result) {
      return res.status(404).json({
        code: 404,
        message: '不良项不存在'
      });
    }
    
    res.json({
      code: 200,
      message: '获取成功',
      data: result
    });
  } catch (error) {
    console.error('获取不良项详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取不良项详情失败',
      error: error.message
    });
  }
});

/**
 * 新增不良项
 * POST /api/defective/items
 * 请求体：{ name, description, sortOrder, isActive, categoryIds: [1, 2, 3] }
 */
router.post('/items', authenticateToken, async (req, res) => {
  try {
    const { name, description, sortOrder, isActive, categoryIds } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        code: 400,
        message: '不良项名称不能为空'
      });
    }
    
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请至少选择一个不良类别'
      });
    }
    
    const result = await executeQuery(async (pool) => {
      // 检查名称是否已存在
      const existCheck = await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .query('SELECT ID FROM DefectiveItem WHERE Name = @name');
      
      if (existCheck.recordset.length > 0) {
        throw new Error('不良项名称已存在');
      }
      
      // 插入不良项记录（CategoryID 设为第一个选中的类别，保持向后兼容）
      const insertResult = await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .input('description', sql.NVarChar, description || null)
        .input('sortOrder', sql.Int, sortOrder || 0)
        .input('isActive', sql.Bit, isActive !== false ? 1 : 0)
        .input('categoryId', sql.Int, categoryIds[0])
        .query(`
          INSERT INTO DefectiveItem (Name, Description, SortOrder, IsActive, CategoryID, CreatedAt, UpdatedAt)
          VALUES (@name, @description, @sortOrder, @isActive, @categoryId, GETDATE(), GETDATE());
          SELECT SCOPE_IDENTITY() AS ID;
        `);
      
      const newItemId = insertResult.recordset[0].ID;
      
      // 插入多对多关联关系
      for (const catId of categoryIds) {
        await pool.request()
          .input('itemId', sql.Int, newItemId)
          .input('categoryId', sql.Int, catId)
          .query(`
            INSERT INTO DefectiveItemCategory (ItemID, CategoryID, CreatedAt)
            VALUES (@itemId, @categoryId, GETDATE())
          `);
      }
      
      return { id: newItemId };
    });
    
    res.json({
      code: 200,
      message: '新增成功',
      data: result
    });
  } catch (error) {
    console.error('新增不良项失败:', error);
    res.status(error.message === '不良项名称已存在' ? 400 : 500).json({
      code: error.message === '不良项名称已存在' ? 400 : 500,
      message: error.message || '新增不良项失败'
    });
  }
});

/**
 * 更新不良项
 * PUT /api/defective/items/:id
 * 请求体：{ name, description, sortOrder, isActive, categoryIds: [1, 2, 3] }
 */
router.put('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sortOrder, isActive, categoryIds } = req.body;
    
    console.log('=== 更新不良项请求 ===');
    console.log('ID:', id);
    console.log('请求体:', { name, description, sortOrder, isActive, categoryIds });
    console.log('isActive 原始值:', isActive, '类型:', typeof isActive);
    console.log('isActive 转换后:', isActive !== false ? 1 : 0);
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        code: 400,
        message: '不良项名称不能为空'
      });
    }
    
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请至少选择一个不良类别'
      });
    }
    
    await executeQuery(async (pool) => {
      // 检查名称是否已被其他记录使用
      const existCheck = await pool.request()
        .input('name', sql.NVarChar, name.trim())
        .input('id', sql.Int, id)
        .query('SELECT ID FROM DefectiveItem WHERE Name = @name AND ID != @id');
      
      if (existCheck.recordset.length > 0) {
        throw new Error('不良项名称已存在');
      }
      
      // 更新不良项记录
      const updateResult = await pool.request()
        .input('id', sql.Int, id)
        .input('name', sql.NVarChar, name.trim())
        .input('description', sql.NVarChar, description || null)
        .input('sortOrder', sql.Int, sortOrder || 0)
        .input('isActive', sql.Bit, isActive !== false ? 1 : 0)
        .input('categoryId', sql.Int, categoryIds[0])
        .query(`
          UPDATE DefectiveItem
          SET Name = @name,
              Description = @description,
              SortOrder = @sortOrder,
              IsActive = @isActive,
              CategoryID = @categoryId,
              UpdatedAt = GETDATE()
          WHERE ID = @id
        `);
      
      if (updateResult.rowsAffected[0] === 0) {
        throw new Error('不良项不存在');
      }
      
      // 删除旧的关联关系
      await pool.request()
        .input('itemId', sql.Int, id)
        .query('DELETE FROM DefectiveItemCategory WHERE ItemID = @itemId');
      
      // 插入新的关联关系
      for (const catId of categoryIds) {
        await pool.request()
          .input('itemId', sql.Int, id)
          .input('categoryId', sql.Int, catId)
          .query(`
            INSERT INTO DefectiveItemCategory (ItemID, CategoryID, CreatedAt)
            VALUES (@itemId, @categoryId, GETDATE())
          `);
      }
      
      return updateResult;
    });
    
    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新不良项失败:', error);
    const statusCode = ['不良项名称已存在', '不良项不存在'].includes(error.message) ? 400 : 500;
    res.status(statusCode).json({
      code: statusCode,
      message: error.message || '更新不良项失败'
    });
  }
});

/**
 * 删除不良项
 * DELETE /api/defective/items/:id
 */
router.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await executeQuery(async (pool) => {
      // 检查是否被投诉记录引用
      const usageCheck = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT di.Name 
          FROM DefectiveItem di
          WHERE di.ID = @id
        `);
      
      if (usageCheck.recordset.length === 0) {
        throw new Error('不良项不存在');
      }
      
      const itemName = usageCheck.recordset[0].Name;
      
      // 检查是否在投诉记录中被使用
      const complaintCheck = await pool.request()
        .input('name', sql.NVarChar, itemName)
        .query('SELECT COUNT(*) AS count FROM ComplaintRegister WHERE DefectiveItem = @name');
      
      if (complaintCheck.recordset[0].count > 0) {
        throw new Error('该不良项已被投诉记录引用，无法删除');
      }
      
      // 删除关联关系
      await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM DefectiveItemCategory WHERE ItemID = @id');
      
      // 删除不良项记录
      await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM DefectiveItem WHERE ID = @id');
      
      return true;
    });
    
    // 如果 executeQuery 返回 null，说明重试多次后失败（非逻辑错误）
    if (!result && res.headersSent === false) {
       return res.status(500).json({
         code: 500,
         message: '删除不良项失败（数据库连接异常）'
       });
    }
    
    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除不良项失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '删除不良项失败'
    });
  }
});

/**
 * 批量更新不良项状态
 * POST /api/defective/items/batch-status
 * 请求体：{ ids: [1, 2, 3], isActive: true/false }
 */
router.post('/items/batch-status', authenticateToken, async (req, res) => {
  try {
    const { ids, isActive } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请选择要操作的不良项'
      });
    }
    
    const result = await executeQuery(async (pool) => {
      const idList = ids.join(',');
      const updateResult = await pool.request()
        .input('isActive', sql.Bit, isActive ? 1 : 0)
        .query(`
          UPDATE DefectiveItem 
          SET IsActive = @isActive, UpdatedAt = GETDATE()
          WHERE ID IN (${idList})
        `);
      
      return updateResult.rowsAffected[0];
    });
    
    res.json({
      code: 200,
      message: `成功${isActive ? '启用' : '禁用'} ${result} 个不良项`,
      data: { successCount: result }
    });
  } catch (error) {
    console.error('批量更新不良项状态失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '批量更新失败'
    });
  }
});

/**
 * 批量删除不良项
 * POST /api/defective/items/batch-delete
 * 请求体：{ ids: [1, 2, 3] }
 */
router.post('/items/batch-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '请选择要删除的不良项'
      });
    }
    
    const result = await executeQuery(async (pool) => {
      let successCount = 0;
      let failedCount = 0;
      
      for (const id of ids) {
        try {
          // 获取不良项名称
          const itemResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT Name FROM DefectiveItem WHERE ID = @id');
          
          if (itemResult.recordset.length === 0) {
            failedCount++;
            continue;
          }
          
          const itemName = itemResult.recordset[0].Name;
          
          // 检查是否在投诉记录中被使用
          const complaintCheck = await pool.request()
            .input('name', sql.NVarChar, itemName)
            .query('SELECT COUNT(*) AS count FROM ComplaintRegister WHERE DefectiveItem = @name');
          
          if (complaintCheck.recordset[0].count > 0) {
            failedCount++;
            continue;
          }
          
          // 删除关联关系
          await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM DefectiveItemCategory WHERE ItemID = @id');
          
          // 删除不良项记录
          await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM DefectiveItem WHERE ID = @id');
          
          successCount++;
        } catch (err) {
          console.error(`删除不良项 ${id} 失败:`, err.message);
          failedCount++;
        }
      }
      
      return { successCount, failedCount };
    });
    
    if (result.failedCount > 0 && result.successCount === 0) {
      return res.status(400).json({
        code: 400,
        message: '所选不良项均被投诉记录引用，无法删除'
      });
    }
    
    res.json({
      code: 200,
      message: result.failedCount > 0 
        ? `成功删除 ${result.successCount} 个，${result.failedCount} 个因被引用无法删除`
        : `成功删除 ${result.successCount} 个不良项`,
      data: result
    });
  } catch (error) {
    console.error('批量删除不良项失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '批量删除失败'
    });
  }
});

// =====================================================
// 级联查询接口（用于前端下拉框）
// =====================================================

/**
 * 获取级联数据（类别 -> 不良项）
 * GET /api/defective/cascade
 * 返回完整的级联结构，用于前端级联选择器
 */
router.get('/cascade', authenticateToken, async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      // 获取所有启用的类别
      const categoriesResult = await pool.request()
        .query(`
          SELECT ID, Name, SortOrder
          FROM DefectiveCategory
          WHERE IsActive = 1
          ORDER BY SortOrder ASC, ID ASC
        `);
      
      // 获取所有启用的不良项及其关联的类别
      const itemsResult = await pool.request()
        .query(`
          SELECT 
            di.ID AS ItemID,
            di.Name AS ItemName,
            dic.CategoryID
          FROM DefectiveItem di
          INNER JOIN DefectiveItemCategory dic ON di.ID = dic.ItemID
          WHERE di.IsActive = 1
          ORDER BY di.SortOrder ASC, di.ID ASC
        `);
      
      // 构建级联数据结构
      const cascadeData = categoriesResult.recordset.map(category => {
        const items = itemsResult.recordset
          .filter(item => item.CategoryID === category.ID)
          .map(item => ({
            value: item.ItemID,
            label: item.ItemName
          }));
        
        return {
          value: category.ID,
          label: category.Name,
          children: items
        };
      });
      
      return cascadeData;
    });
    
    res.json({
      code: 200,
      message: '获取成功',
      data: result || []
    });
  } catch (error) {
    console.error('获取级联数据失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取级联数据失败',
      error: error.message
    });
  }
});

/**
 * 根据类别ID获取不良项列表（用于级联选择）
 * GET /api/defective/items-by-category/:categoryId
 * 兼容旧接口，返回不良项名称数组
 */
router.get('/items-by-category/:categoryId', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const result = await executeQuery(async (pool) => {
      return await pool.request()
        .input('categoryId', sql.Int, categoryId)
        .query(`
          SELECT DISTINCT di.Name
          FROM DefectiveItem di
          INNER JOIN DefectiveItemCategory dic ON di.ID = dic.ItemID
          WHERE dic.CategoryID = @categoryId AND di.IsActive = 1
          ORDER BY di.Name
        `);
    });
    
    const items = result?.recordset?.map(r => r.Name) || [];
    
    res.json(items);
  } catch (error) {
    console.error('获取不良项列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取不良项列表失败',
      error: error.message
    });
  }
});

module.exports = router;
