const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { getDynamicConfig } = require('../db');
const SECRET = process.env.JWT_SECRET || 'dms-secret';

/**
 * JWT Token 验证中间件
 * 功能：验证用户身份令牌
 */
const authenticateToken = function (req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ message: '未提供token，拒绝访问' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '用户未登录' });
  }
};

/**
 * 检查用户是否为管理员
 * @param {Object} user - 用户信息
 * @returns {boolean} 是否为管理员
 */
function isAdmin(user) {
  if (!user) return false;
  
  // 检查用户角色信息
  if (user.isAdmin === true) return true;
  if (user.role === 'admin' || user.roleCode === 'admin') return true;
  
  // 检查角色数组
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some(role => 
      role === 'admin' || 
      role.code === 'admin' || 
      role.roleCode === 'admin'
    );
  }
  
  return false;
}

/**
 * 查询用户权限（支持用户级权限覆盖角色权限）
 * @param {number} userId - 用户ID
 * @param {string} permission - 权限标识
 * @returns {Promise<boolean>} 是否具有权限
 */
async function checkUserPermission(userId, permission) {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 使用用户完整权限视图查询权限
    // 该视图已经处理了用户权限覆盖角色权限的逻辑
    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .input('Permission', sql.NVarChar, permission)
      .query(`
        SELECT COUNT(*) as count
        FROM [V_UserCompletePermissions] v
        WHERE v.UserID = @UserId 
          AND v.Permission = @Permission 
          AND v.HasPermission = 1
          AND (v.ExpiresAt IS NULL OR v.ExpiresAt > GETDATE())
      `);
    
    return result.recordset[0].count > 0;
  } catch (error) {
    console.error('查询用户权限失败:', error);
    
    // 如果视图不存在，回退到原有的角色权限查询
    try {
      const fallbackResult = await pool.request()
        .input('UserId', sql.Int, userId)
        .input('Permission', sql.NVarChar, permission)
        .query(`
          SELECT COUNT(*) as count
          FROM [UserRoles] ur
          INNER JOIN [RoleMenus] rm ON ur.RoleID = rm.RoleID
          INNER JOIN [Menus] m ON rm.MenuID = m.ID
          WHERE ur.UserID = @UserId 
            AND m.Permission = @Permission 
            AND m.Status = 1
        `);
      
      return fallbackResult.recordset[0].count > 0;
    } catch (fallbackError) {
      console.error('回退权限查询也失败:', fallbackError);
      return false;
    }
  }
}

/**
 * 查询用户操作权限（支持用户级权限覆盖角色权限）
 * @param {number} userId - 用户ID
 * @param {string} menuCode - 菜单代码
 * @param {string} actionCode - 操作代码
 * @returns {Promise<boolean>} 是否具有操作权限
 */
async function checkUserActionPermission(userId, menuCode, actionCode) {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    // 使用用户完整权限视图查询操作权限
    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .input('MenuCode', sql.NVarChar, menuCode)
      .input('ActionCode', sql.NVarChar, actionCode)
      .query(`
        SELECT COUNT(*) as count
        FROM [V_UserCompletePermissions] v
        WHERE v.UserID = @UserId 
          AND v.MenuCode = @MenuCode 
          AND v.ActionCode = @ActionCode
          AND v.HasPermission = 1
          AND (v.ExpiresAt IS NULL OR v.ExpiresAt > GETDATE())
      `);
    
    return result.recordset[0].count > 0;
  } catch (error) {
    console.error('查询用户操作权限失败:', error);
    return false;
  }
}

/**
 * 权限检查中间件
 * 功能：检查用户是否具有指定权限
 * @param {string} permission - 需要检查的权限代码
 */
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // 检查用户是否已登录
      if (!req.user) {
        return res.status(401).json({ message: '用户未登录' });
      }

      // 检查是否为管理员，管理员拥有所有权限
      if (isAdmin(req.user)) {
        return next();
      }

      // 如果没有指定权限标识，则拒绝访问
      if (!permission) {
        return res.status(403).json({ message: '权限不足，拒绝访问' });
      }

      // 查询用户是否具有指定权限
      const hasPermission = await checkUserPermission(req.user.id, permission);
      
      if (hasPermission) {
        next();
      } else {
        return res.status(403).json({ 
          message: '权限不足，拒绝访问',
          requiredPermission: permission
        });
      }
    } catch (error) {
      console.error('权限验证失败:', error);
      return res.status(500).json({ message: '权限验证失败' });
    }
  };
};

/**
 * 管理员权限检查中间件
 * 功能：检查用户是否为管理员
 */
const requireAdmin = (req, res, next) => {
  try {
    // 检查用户是否已登录
    if (!req.user) {
      return res.status(401).json({ message: '用户未登录' });
    }

    // 检查是否为管理员
    if (isAdmin(req.user)) {
      return next();
    } else {
      return res.status(403).json({ 
        message: '需要管理员权限，拒绝访问'
      });
    }
  } catch (error) {
    console.error('管理员权限验证失败:', error);
    return res.status(500).json({ message: '权限验证失败' });
  }
};

// 导出中间件函数
module.exports = {
  authenticateToken,
  checkPermission,
  checkUserPermission,
  checkUserActionPermission,
  isAdmin,
  requireAdmin
};