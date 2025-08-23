/**
 * 用户权限管理路由模块
 *
 * 功能说明：
 * 1. 用户权限的增删改查
 * 2. 权限授予和撤销
 * 3. 权限历史记录查询
 * 4. 用户完整权限查询
 *
 * 权限设计：
 * - 用户权限可以覆盖角色权限
 * - 支持权限的授予(grant)和拒绝(deny)
 * - 支持菜单级权限和操作级权限
 * - 支持权限过期时间设置
 *
 * 技术栈：
 * - Express Router
 * - SQL Server数据库
 * - JWT认证中间件
 */

const express = require('express');
const { sql, getDynamicConfig } = require('../db');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const router = express.Router();

/**
 * 获取用户权限列表
 * GET /api/user-permissions/:userId
 * 查询指定用户的所有权限配置
 */
router.get('/:userId', authenticateToken, checkPermission('user-permission:view'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { menuId, permissionType, status = '1' } = req.query;
    
    const pool = await sql.connect(await getDynamicConfig());
    let query = `
      SELECT 
        up.ID,
        up.UserID,
        u.Username,
        u.RealName as UserRealName,
        up.MenuID,
        m.MenuName,
        m.MenuCode,
        m.Path as MenuPath,
        up.PermissionType,
        up.PermissionLevel,
        up.ActionCode,
        up.GrantedAt,
        up.ExpiresAt,
        up.Reason,
        up.Status,
        gb.RealName as GrantedByName,
        CASE 
          WHEN up.ExpiresAt IS NULL THEN '永久有效'
          WHEN up.ExpiresAt > GETDATE() THEN '有效'
          ELSE '已过期'
        END as PermissionStatus
      FROM [UserPermissions] up
      INNER JOIN [User] u ON up.UserID = u.ID
      INNER JOIN [Menus] m ON up.MenuID = m.ID
      LEFT JOIN [User] gb ON up.GrantedBy = gb.ID
      WHERE up.UserID = @UserID
    `;
    
    const request = pool.request().input('UserID', sql.Int, userId);
    
    // 添加可选过滤条件
    if (menuId) {
      query += ' AND up.MenuID = @MenuID';
      request.input('MenuID', sql.Int, menuId);
    }
    
    if (permissionType) {
      query += ' AND up.PermissionType = @PermissionType';
      request.input('PermissionType', sql.NVarChar, permissionType);
    }
    
    if (status) {
      query += ' AND up.Status = @Status';
      request.input('Status', sql.Bit, status === '1');
    }
    
    query += ' ORDER BY up.GrantedAt DESC';
    
    const result = await request.query(query);
    
    res.json({
      success: true,
      data: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    console.error('获取用户权限列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户权限列表失败',
      error: error.message
    });
  }
});

/**
 * 获取用户完整权限信息
 * GET /api/user-permissions/:userId/complete
 * 返回用户的完整权限信息，包括角色权限和用户权限的合并结果
 */
router.get('/:userId/complete', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 查询用户的完整权限信息
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT 
          UserID,
          Username,
          RealName,
          MenuID,
          MenuName,
          MenuCode,
          Path,
          Permission,
          PermissionSource,
          PermissionType,
          HasPermission,
          ActionCode,
          ExpiresAt,
          GrantedBy,
          GrantedAt
        FROM [V_UserCompletePermissions]
        WHERE UserID = @UserID
          AND HasPermission = 1
        ORDER BY MenuName, ActionCode
      `);
    
    // 按菜单分组权限
    const permissionsByMenu = {};
    result.recordset.forEach(permission => {
      const menuKey = permission.MenuID;
      if (!permissionsByMenu[menuKey]) {
        permissionsByMenu[menuKey] = {
          menuId: permission.MenuID,
          menuName: permission.MenuName,
          menuCode: permission.MenuCode,
          path: permission.Path,
          permission: permission.Permission,
          actions: []
        };
      }
      
      if (permission.ActionCode) {
        permissionsByMenu[menuKey].actions.push({
          actionCode: permission.ActionCode,
          permissionSource: permission.PermissionSource,
          permissionType: permission.PermissionType,
          expiresAt: permission.ExpiresAt,
          grantedAt: permission.GrantedAt
        });
      }
    });
    
    res.json({
      success: true,
      data: {
        userId: parseInt(userId),
        permissions: Object.values(permissionsByMenu)
      }
    });
  } catch (error) {
    console.error('获取用户完整权限失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户完整权限失败',
      error: error.message
    });
  }
});

/**
 * 授予用户权限
 * POST /api/user-permissions
 * 为用户授予特定的菜单或操作权限
 */
router.post('/', authenticateToken, checkPermission('user-permission:grant'), async (req, res) => {
  try {
    const {
      userId,
      menuId,
      permissionType = 'grant', // grant 或 deny
      permissionLevel = 'menu', // menu 或 action
      actionCode,
      expiresAt,
      reason
    } = req.body;
    
    // 参数验证
    if (!userId || !menuId) {
      return res.status(400).json({
        success: false,
        message: '用户ID和菜单ID不能为空'
      });
    }
    
    if (!['grant', 'deny'].includes(permissionType)) {
      return res.status(400).json({
        success: false,
        message: '权限类型必须是grant或deny'
      });
    }
    
    if (!['menu', 'action'].includes(permissionLevel)) {
      return res.status(400).json({
        success: false,
        message: '权限级别必须是menu或action'
      });
    }
    
    if (permissionLevel === 'action' && !actionCode) {
      return res.status(400).json({
        success: false,
        message: '操作级权限必须指定操作代码'
      });
    }
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查是否已存在相同权限
    const existingResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('MenuID', sql.Int, menuId)
      .input('PermissionLevel', sql.NVarChar, permissionLevel)
      .input('ActionCode', sql.NVarChar, actionCode || null)
      .query(`
        SELECT ID FROM [UserPermissions]
        WHERE UserID = @UserID 
          AND MenuID = @MenuID 
          AND PermissionLevel = @PermissionLevel 
          AND ISNULL(ActionCode, '') = ISNULL(@ActionCode, '')
          AND Status = 1
      `);
    
    if (existingResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该权限配置已存在'
      });
    }
    
    // 插入新权限
    const insertResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('MenuID', sql.Int, menuId)
      .input('PermissionType', sql.NVarChar, permissionType)
      .input('PermissionLevel', sql.NVarChar, permissionLevel)
      .input('ActionCode', sql.NVarChar, actionCode || null)
      .input('GrantedBy', sql.Int, req.user.id)
      .input('ExpiresAt', sql.DateTime2, expiresAt || null)
      .input('Reason', sql.NVarChar, reason || null)
      .query(`
        INSERT INTO [UserPermissions] (
          UserID, MenuID, PermissionType, PermissionLevel, ActionCode,
          GrantedBy, ExpiresAt, Reason, Status
        )
        OUTPUT INSERTED.ID
        VALUES (
          @UserID, @MenuID, @PermissionType, @PermissionLevel, @ActionCode,
          @GrantedBy, @ExpiresAt, @Reason, 1
        )
      `);
    
    res.json({
      success: true,
      message: '权限授予成功',
      data: {
        id: insertResult.recordset[0].ID,
        userId,
        menuId,
        permissionType,
        permissionLevel,
        actionCode
      }
    });
  } catch (error) {
    console.error('授予用户权限失败:', error);
    res.status(500).json({
      success: false,
      message: '授予用户权限失败',
      error: error.message
    });
  }
});

/**
 * 撤销用户权限
 * DELETE /api/user-permissions/:id
 * 撤销指定的用户权限
 */
router.delete('/:id', authenticateToken, checkPermission('user-permission:revoke'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查权限是否存在
    const checkResult = await pool.request()
      .input('ID', sql.Int, id)
      .query('SELECT * FROM [UserPermissions] WHERE ID = @ID AND Status = 1');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '权限不存在或已被撤销'
      });
    }
    
    // 撤销权限（设置状态为无效）
    await pool.request()
      .input('ID', sql.Int, id)
      .query(`
        UPDATE [UserPermissions] 
        SET Status = 0, UpdatedAt = GETDATE()
        WHERE ID = @ID
      `);
    
    res.json({
      success: true,
      message: '权限撤销成功'
    });
  } catch (error) {
    // 撤销用户权限失败
    res.status(500).json({
      success: false,
      message: '撤销用户权限失败',
      error: error.message
    });
  }
});

/**
 * 批量授予用户权限
 * POST /api/user-permissions/batch
 * 批量为用户授予多个权限
 */
router.post('/batch', authenticateToken, checkPermission('user-permission:grant'), async (req, res) => {
  try {
    const { userId, permissions, reason } = req.body;
    
    if (!userId || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: '用户ID和权限列表不能为空'
      });
    }
    
    const pool = await sql.connect(await getDynamicConfig());
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      const results = [];
      
      for (const permission of permissions) {
        const {
          menuId,
          permissionType = 'grant',
          permissionLevel = 'menu',
          actionCode,
          expiresAt
        } = permission;
        
        // 检查是否已存在
        const existingResult = await transaction.request()
          .input('UserID', sql.Int, userId)
          .input('MenuID', sql.Int, menuId)
          .input('PermissionLevel', sql.NVarChar, permissionLevel)
          .input('ActionCode', sql.NVarChar, actionCode || null)
          .query(`
            SELECT ID FROM [UserPermissions]
            WHERE UserID = @UserID 
              AND MenuID = @MenuID 
              AND PermissionLevel = @PermissionLevel 
              AND ISNULL(ActionCode, '') = ISNULL(@ActionCode, '')
              AND Status = 1
          `);
        
        if (existingResult.recordset.length === 0) {
          // 插入新权限
          const insertResult = await transaction.request()
            .input('UserID', sql.Int, userId)
            .input('MenuID', sql.Int, menuId)
            .input('PermissionType', sql.NVarChar, permissionType)
            .input('PermissionLevel', sql.NVarChar, permissionLevel)
            .input('ActionCode', sql.NVarChar, actionCode || null)
            .input('GrantedBy', sql.Int, req.user.id)
            .input('ExpiresAt', sql.DateTime2, expiresAt || null)
            .input('Reason', sql.NVarChar, reason || null)
            .query(`
              INSERT INTO [UserPermissions] (
                UserID, MenuID, PermissionType, PermissionLevel, ActionCode,
                GrantedBy, ExpiresAt, Reason, Status
              )
              OUTPUT INSERTED.ID
              VALUES (
                @UserID, @MenuID, @PermissionType, @PermissionLevel, @ActionCode,
                @GrantedBy, @ExpiresAt, @Reason, 1
              )
            `);
          
          results.push({
            menuId,
            permissionLevel,
            actionCode,
            status: 'created',
            id: insertResult.recordset[0].ID
          });
        } else {
          results.push({
            menuId,
            permissionLevel,
            actionCode,
            status: 'exists'
          });
        }
      }
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: '批量权限授予完成',
        data: results
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    // 批量授予用户权限失败
    res.status(500).json({
      success: false,
      message: '批量授予用户权限失败',
      error: error.message
    });
  }
});

/**
 * 获取权限变更历史
 * GET /api/user-permissions/:userId/history
 * 查询用户权限的变更历史记录
 */
router.get('/:userId/history', authenticateToken, checkPermission('user-permission:view'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 查询总数
    const countResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query('SELECT COUNT(*) as total FROM [UserPermissionHistory] WHERE UserID = @UserID');
    
    const total = countResult.recordset[0].total;
    
    // 查询历史记录 - 使用ROW_NUMBER()分页（兼容SQL Server 2008）
    const startRow = (page - 1) * pageSize + 1;
    const endRow = page * pageSize;
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('StartRow', sql.Int, startRow)
      .input('EndRow', sql.Int, endRow)
      .query(`
        SELECT * FROM (
          SELECT 
            h.ID,
            h.UserPermissionID,
            h.UserID,
            u.Username,
            u.RealName as UserRealName,
            h.MenuID,
            m.MenuName,
            m.MenuCode,
            h.PermissionType,
            h.PermissionLevel,
            h.ActionCode,
            h.Action,
            h.OldValue,
            h.NewValue,
            h.OperatedAt,
            h.Reason,
            op.RealName as OperatorName,
            ROW_NUMBER() OVER (ORDER BY h.OperatedAt DESC) as RowNum
          FROM [UserPermissionHistory] h
          INNER JOIN [User] u ON h.UserID = u.ID
          INNER JOIN [Menus] m ON h.MenuID = m.ID
          LEFT JOIN [User] op ON h.OperatorID = op.ID
          WHERE h.UserID = @UserID
        ) AS T
        WHERE T.RowNum BETWEEN @StartRow AND @EndRow
        ORDER BY T.RowNum
      `);
    
    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    // 获取权限历史失败
    res.status(500).json({
      success: false,
      message: '获取权限历史失败',
      error: error.message
    });
  }
});

/**
 * 清理过期权限
 * POST /api/user-permissions/cleanup-expired
 * 清理所有过期的用户权限
 */
router.post('/cleanup-expired', authenticateToken, checkPermission('user-permission:manage'), async (req, res) => {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    const result = await pool.request().query(`
      UPDATE [UserPermissions]
      SET Status = 0, UpdatedAt = GETDATE()
      WHERE ExpiresAt IS NOT NULL 
        AND ExpiresAt <= GETDATE() 
        AND Status = 1
    `);
    
    res.json({
      success: true,
      message: `已清理 ${result.rowsAffected[0]} 条过期权限`
    });
  } catch (error) {
    // 清理过期权限失败
    res.status(500).json({
      success: false,
      message: '清理过期权限失败',
      error: error.message
    });
  }
});

module.exports = router;