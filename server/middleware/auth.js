const jwt = require('jsonwebtoken');
const SECRET = 'dms-secret';

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
 * 权限检查中间件
 * 功能：检查用户是否具有指定权限
 * @param {string} permission - 需要检查的权限代码
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    // 简化权限检查，实际项目中应该查询数据库验证用户权限
    // 这里假设管理员拥有所有权限
    if (req.user && (req.user.role === 'admin' || req.user.roleCode === 'admin')) {
      next();
    } else {
      return res.status(403).json({ message: '权限不足，拒绝访问' });
    }
  };
};

// 导出中间件函数
module.exports = {
  authenticateToken,
  checkPermission
};