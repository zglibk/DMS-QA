/**
 * ERP接口文档管理 - 后端API
 * 路径: routes/erpApiDoc.js
 */

const express = require('express');
const router = express.Router();
const { executeQuery } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ==================== 权限验证中间件 ====================

/**
 * 验证是否有ERP接口文档访问权限
 */
const checkErpApiDocPermission = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    // admin用户直接放行
    if (user.username === 'admin' || user.role === 'admin' || user.isAdmin) {
      return next();
    }
    
    // 其他用户暂时也放行（可根据需要添加权限检查）
    return next();
  } catch (error) {
    console.error('权限验证失败:', error);
    return res.status(500).json({ success: false, message: '权限验证失败' });
  }
};

/**
 * 验证是否有编辑权限（仅admin）
 */
const checkEditPermission = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    // 仅admin用户可编辑
    if (user.username === 'admin' || user.role === 'admin' || user.isAdmin) {
      return next();
    }
    
    return res.status(403).json({ success: false, message: '仅管理员可编辑' });
  } catch (error) {
    console.error('权限验证失败:', error);
    return res.status(500).json({ success: false, message: '权限验证失败' });
  }
};

// ==================== 权限检查接口 ====================

/**
 * 检查当前用户权限
 */
router.get('/check-permission', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.json({ success: true, data: { hasAccess: false, canEdit: false } });
    }
    
    // admin用户拥有所有权限
    if (user.username === 'admin' || user.role === 'admin' || user.isAdmin) {
      return res.json({ success: true, data: { hasAccess: true, canEdit: true } });
    }
    
    // 其他用户只有访问权限
    return res.json({ success: true, data: { hasAccess: true, canEdit: false } });
  } catch (error) {
    console.error('权限检查失败:', error);
    res.status(500).json({ success: false, message: '权限检查失败' });
  }
});

// ==================== 配置相关接口 ====================

/**
 * 获取文档配置
 */
router.get('/config', authenticateToken, checkErpApiDocPermission, async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      return await request.query('SELECT ConfigKey, ConfigValue, Description FROM ErpApiDocConfig');
    });
    
    const config = {};
    if (result && result.recordset) {
      result.recordset.forEach(row => {
        config[row.ConfigKey] = row.ConfigValue;
      });
    }
    
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * 更新文档配置
 */
router.put('/config', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const { key, value } = req.body;
    const user = req.user;
    
    await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('key', key);
      request.input('value', value);
      request.input('updatedBy', user.username || 'admin');
      return await request.query(`
        UPDATE ErpApiDocConfig 
        SET ConfigValue = @value, UpdatedBy = @updatedBy, UpdatedAt = GETDATE()
        WHERE ConfigKey = @key
      `);
    });
    
    res.json({ success: true, message: '配置更新成功' });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

// ==================== 分组相关接口 ====================

/**
 * 获取所有分组（含接口数量）
 */
router.get('/groups', authenticateToken, checkErpApiDocPermission, async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      return await request.query(`
        SELECT 
          g.Id, g.GroupName, g.GroupIcon, g.Description, g.SortOrder, g.IsActive,
          g.CreatedAt, g.UpdatedAt,
          (SELECT COUNT(*) FROM ErpApiDocItem WHERE GroupId = g.Id AND IsActive = 1) as ApiCount
        FROM ErpApiDocGroup g
        WHERE g.IsActive = 1
        ORDER BY g.SortOrder, g.Id
      `);
    });
    
    res.json({ success: true, data: result?.recordset || [] });
  } catch (error) {
    console.error('获取分组列表失败:', error);
    res.status(500).json({ success: false, message: '获取分组列表失败' });
  }
});

/**
 * 创建分组
 */
router.post('/groups', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const { GroupName, GroupIcon, Description, SortOrder } = req.body;
    const user = req.user;
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('groupName', GroupName);
      request.input('groupIcon', GroupIcon || 'Folder');
      request.input('description', Description || '');
      request.input('sortOrder', SortOrder || 0);
      request.input('createdBy', user.username || 'admin');
      return await request.query(`
        INSERT INTO ErpApiDocGroup (GroupName, GroupIcon, Description, SortOrder, CreatedBy, UpdatedBy)
        OUTPUT INSERTED.Id
        VALUES (@groupName, @groupIcon, @description, @sortOrder, @createdBy, @createdBy)
      `);
    });
    
    const newId = result?.recordset?.[0]?.Id;
    res.json({ success: true, message: '分组创建成功', data: { id: newId } });
  } catch (error) {
    console.error('创建分组失败:', error);
    res.status(500).json({ success: false, message: '创建分组失败' });
  }
});

/**
 * 更新分组
 */
router.put('/groups/:id', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const { GroupName, GroupIcon, Description, SortOrder } = req.body;
    const user = req.user;
    
    await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', parseInt(id));
      request.input('groupName', GroupName);
      request.input('groupIcon', GroupIcon || 'Folder');
      request.input('description', Description || '');
      request.input('sortOrder', SortOrder || 0);
      request.input('updatedBy', user.username || 'admin');
      return await request.query(`
        UPDATE ErpApiDocGroup 
        SET GroupName = @groupName, GroupIcon = @groupIcon, Description = @description,
            SortOrder = @sortOrder, UpdatedBy = @updatedBy, UpdatedAt = GETDATE()
        WHERE Id = @id
      `);
    });
    
    res.json({ success: true, message: '分组更新成功' });
  } catch (error) {
    console.error('更新分组失败:', error);
    res.status(500).json({ success: false, message: '更新分组失败' });
  }
});

/**
 * 删除分组（软删除）
 */
router.delete('/groups/:id', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const { id } = req.params;
    
    await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', parseInt(id));
      // 同时软删除分组下的所有接口
      await request.query('UPDATE ErpApiDocItem SET IsActive = 0 WHERE GroupId = @id');
      return await request.query('UPDATE ErpApiDocGroup SET IsActive = 0 WHERE Id = @id');
    });
    
    res.json({ success: true, message: '分组删除成功' });
  } catch (error) {
    console.error('删除分组失败:', error);
    res.status(500).json({ success: false, message: '删除分组失败' });
  }
});

// ==================== 接口项相关接口 ====================

/**
 * 获取所有接口项
 */
router.get('/items', authenticateToken, checkErpApiDocPermission, async (req, res) => {
  try {
    const { groupId } = req.query;
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      let sql = `
        SELECT 
          i.*, g.GroupName
        FROM ErpApiDocItem i
        LEFT JOIN ErpApiDocGroup g ON i.GroupId = g.Id
        WHERE i.IsActive = 1
      `;
      
      if (groupId) {
        request.input('groupId', parseInt(groupId));
        sql += ' AND i.GroupId = @groupId';
      }
      
      sql += ' ORDER BY i.GroupId, i.SortOrder, i.Id';
      return await request.query(sql);
    });
    
    res.json({ success: true, data: result?.recordset || [] });
  } catch (error) {
    console.error('获取接口列表失败:', error);
    res.status(500).json({ success: false, message: '获取接口列表失败' });
  }
});

/**
 * 获取单个接口详情
 */
router.get('/items/:id', authenticateToken, checkErpApiDocPermission, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', parseInt(id));
      return await request.query(`
        SELECT i.*, g.GroupName
        FROM ErpApiDocItem i
        LEFT JOIN ErpApiDocGroup g ON i.GroupId = g.Id
        WHERE i.Id = @id
      `);
    });
    
    if (!result?.recordset?.[0]) {
      return res.status(404).json({ success: false, message: '接口不存在' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('获取接口详情失败:', error);
    res.status(500).json({ success: false, message: '获取接口详情失败' });
  }
});

/**
 * 创建接口
 */
router.post('/items', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const {
      GroupId, ApiName, ApiPath, HttpMethod,
      ApiDescription, RequestParams, ResponseParams,
      RequestExample, ResponseExample, Remark, SortOrder
    } = req.body;
    const user = req.user;
    
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('groupId', GroupId);
      request.input('apiName', ApiName);
      request.input('apiPath', ApiPath || '');
      request.input('httpMethod', HttpMethod || 'GET');
      request.input('apiDescription', ApiDescription || '');
      request.input('requestParams', RequestParams || '');
      request.input('responseParams', ResponseParams || '');
      request.input('requestExample', RequestExample || '');
      request.input('responseExample', ResponseExample || '');
      request.input('remark', Remark || '');
      request.input('sortOrder', SortOrder || 0);
      request.input('createdBy', user.username || 'admin');
      return await request.query(`
        INSERT INTO ErpApiDocItem (
          GroupId, ApiName, ApiPath, HttpMethod,
          ApiDescription, RequestParams, ResponseParams,
          RequestExample, ResponseExample, Remark, SortOrder, CreatedBy, UpdatedBy
        )
        OUTPUT INSERTED.Id
        VALUES (
          @groupId, @apiName, @apiPath, @httpMethod,
          @apiDescription, @requestParams, @responseParams,
          @requestExample, @responseExample, @remark, @sortOrder, @createdBy, @createdBy
        )
      `);
    });
    
    const newId = result?.recordset?.[0]?.Id;
    res.json({ success: true, message: '接口创建成功', data: { id: newId } });
  } catch (error) {
    console.error('创建接口失败:', error);
    res.status(500).json({ success: false, message: '创建接口失败' });
  }
});

/**
 * 更新接口
 */
router.put('/items/:id', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      GroupId, ApiName, ApiPath, HttpMethod,
      ApiDescription, RequestParams, ResponseParams,
      RequestExample, ResponseExample, Remark, SortOrder
    } = req.body;
    const user = req.user;
    
    await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', parseInt(id));
      request.input('groupId', GroupId);
      request.input('apiName', ApiName);
      request.input('apiPath', ApiPath || '');
      request.input('httpMethod', HttpMethod || 'GET');
      request.input('apiDescription', ApiDescription || '');
      request.input('requestParams', RequestParams || '');
      request.input('responseParams', ResponseParams || '');
      request.input('requestExample', RequestExample || '');
      request.input('responseExample', ResponseExample || '');
      request.input('remark', Remark || '');
      request.input('sortOrder', SortOrder || 0);
      request.input('updatedBy', user.username || 'admin');
      return await request.query(`
        UPDATE ErpApiDocItem 
        SET GroupId = @groupId, ApiName = @apiName, ApiPath = @apiPath, HttpMethod = @httpMethod,
            ApiDescription = @apiDescription, RequestParams = @requestParams, 
            ResponseParams = @responseParams, RequestExample = @requestExample,
            ResponseExample = @responseExample, Remark = @remark, SortOrder = @sortOrder, 
            UpdatedBy = @updatedBy, UpdatedAt = GETDATE()
        WHERE Id = @id
      `);
    });
    
    res.json({ success: true, message: '接口更新成功' });
  } catch (error) {
    console.error('更新接口失败:', error);
    res.status(500).json({ success: false, message: '更新接口失败' });
  }
});

/**
 * 删除接口（软删除）
 */
router.delete('/items/:id', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const { id } = req.params;
    
    await executeQuery(async (pool) => {
      const request = pool.request();
      request.input('id', parseInt(id));
      return await request.query('UPDATE ErpApiDocItem SET IsActive = 0 WHERE Id = @id');
    });
    
    res.json({ success: true, message: '接口删除成功' });
  } catch (error) {
    console.error('删除接口失败:', error);
    res.status(500).json({ success: false, message: '删除接口失败' });
  }
});

// ==================== 导入导出接口 ====================

/**
 * 导出全部数据
 */
router.get('/export', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const configResult = await executeQuery(async (pool) => {
      return await pool.request().query('SELECT ConfigKey, ConfigValue FROM ErpApiDocConfig');
    });
    
    const groupsResult = await executeQuery(async (pool) => {
      return await pool.request().query('SELECT * FROM ErpApiDocGroup WHERE IsActive = 1 ORDER BY SortOrder');
    });
    
    const itemsResult = await executeQuery(async (pool) => {
      return await pool.request().query('SELECT * FROM ErpApiDocItem WHERE IsActive = 1 ORDER BY GroupId, SortOrder');
    });
    
    const config = {};
    if (configResult?.recordset) {
      configResult.recordset.forEach(row => {
        config[row.ConfigKey] = row.ConfigValue;
      });
    }
    
    const exportData = {
      exportTime: new Date().toISOString(),
      version: '1.0',
      config,
      groups: groupsResult?.recordset || [],
      items: itemsResult?.recordset || []
    };
    
    res.json({ success: true, data: exportData });
  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

/**
 * 导入数据
 */
router.post('/import', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const { config, groups, items } = req.body;
    const user = req.user;
    
    // 导入配置
    if (config) {
      for (const [key, value] of Object.entries(config)) {
        await executeQuery(async (pool) => {
          const request = pool.request();
          request.input('key', key);
          request.input('value', value);
          request.input('updatedBy', user.username || 'admin');
          return await request.query(`
            UPDATE ErpApiDocConfig SET ConfigValue = @value, UpdatedBy = @updatedBy, UpdatedAt = GETDATE()
            WHERE ConfigKey = @key
          `);
        });
      }
    }
    
    // 导入分组和接口项的ID映射
    const groupIdMap = {};
    
    if (groups && groups.length > 0) {
      for (const group of groups) {
        const result = await executeQuery(async (pool) => {
          const request = pool.request();
          request.input('groupName', group.GroupName);
          request.input('groupIcon', group.GroupIcon || 'Folder');
          request.input('description', group.Description || '');
          request.input('sortOrder', group.SortOrder || 0);
          request.input('createdBy', user.username || 'admin');
          return await request.query(`
            INSERT INTO ErpApiDocGroup (GroupName, GroupIcon, Description, SortOrder, CreatedBy, UpdatedBy)
            OUTPUT INSERTED.Id
            VALUES (@groupName, @groupIcon, @description, @sortOrder, @createdBy, @createdBy)
          `);
        });
        groupIdMap[group.Id] = result?.recordset?.[0]?.Id;
      }
    }
    
    if (items && items.length > 0) {
      for (const item of items) {
        const newGroupId = groupIdMap[item.GroupId] || item.GroupId;
        await executeQuery(async (pool) => {
          const request = pool.request();
          request.input('groupId', newGroupId);
          request.input('apiName', item.ApiName);
          request.input('apiPath', item.ApiPath || '');
          request.input('httpMethod', item.HttpMethod || 'GET');
          request.input('apiDescription', item.ApiDescription || '');
          request.input('requestParams', item.RequestParams || '');
          request.input('responseParams', item.ResponseParams || '');
          request.input('requestExample', item.RequestExample || '');
          request.input('responseExample', item.ResponseExample || '');
          request.input('remark', item.Remark || '');
          request.input('sortOrder', item.SortOrder || 0);
          request.input('createdBy', user.username || 'admin');
          return await request.query(`
            INSERT INTO ErpApiDocItem (
              GroupId, ApiName, ApiPath, HttpMethod,
              ApiDescription, RequestParams, ResponseParams,
              RequestExample, ResponseExample, Remark, SortOrder, CreatedBy, UpdatedBy
            )
            VALUES (
              @groupId, @apiName, @apiPath, @httpMethod,
              @apiDescription, @requestParams, @responseParams,
              @requestExample, @responseExample, @remark, @sortOrder, @createdBy, @createdBy
            )
          `);
        });
      }
    }
    
    res.json({ success: true, message: '导入成功' });
  } catch (error) {
    console.error('导入失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
});

// ==================== 数据清空接口 ====================

/**
 * 清空所有ERP接口文档数据（硬删除）
 * 用于全版本更新前清理旧数据
 */
router.delete('/clear-all', authenticateToken, checkEditPermission, async (req, res) => {
  try {
    const { confirmCode } = req.query;
    
    // 验证确认码，防止误操作
    if (confirmCode !== 'CONFIRM_DELETE_ALL') {
      return res.status(400).json({ 
        success: false, 
        message: '确认码错误，操作已取消' 
      });
    }
    
    // 获取删除前的统计信息
    const statsResult = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM ErpApiDocGroup) as groupCount,
          (SELECT COUNT(*) FROM ErpApiDocItem) as itemCount
      `);
    });
    
    const stats = statsResult?.recordset?.[0] || { groupCount: 0, itemCount: 0 };
    
    // 执行删除操作（先删除子表，再删除主表）
    await executeQuery(async (pool) => {
      const request = pool.request();
      // 1. 删除所有接口项
      await request.query('DELETE FROM ErpApiDocItem');
      // 2. 删除所有分组
      await request.query('DELETE FROM ErpApiDocGroup');
      return { success: true };
    });
    
    // 记录操作日志
    const user = req.user;
    console.log(`[ERP接口文档] 用户 ${user.username} 执行了清空所有数据操作，删除了 ${stats.groupCount} 个分组和 ${stats.itemCount} 个接口`);
    
    res.json({ 
      success: true, 
      message: '所有数据已清空',
      data: {
        deletedGroups: stats.groupCount,
        deletedItems: stats.itemCount
      }
    });
  } catch (error) {
    console.error('清空数据失败:', error);
    res.status(500).json({ success: false, message: '清空数据失败: ' + error.message });
  }
});

/**
 * 获取数据统计信息（用于清空前确认）
 */
router.get('/stats', authenticateToken, checkErpApiDocPermission, async (req, res) => {
  try {
    const result = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM ErpApiDocGroup WHERE IsActive = 1) as activeGroupCount,
          (SELECT COUNT(*) FROM ErpApiDocGroup) as totalGroupCount,
          (SELECT COUNT(*) FROM ErpApiDocItem WHERE IsActive = 1) as activeItemCount,
          (SELECT COUNT(*) FROM ErpApiDocItem) as totalItemCount
      `);
    });
    
    res.json({ success: true, data: result?.recordset?.[0] || {} });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ success: false, message: '获取统计信息失败' });
  }
});

module.exports = router;
