const jwt = require('jsonwebtoken');
const SECRET = 'dms-secret';

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: '未提供token，拒绝访问' });
  }

  // 提取 Bearer token
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    // 验证JWT token
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // 将用户信息添加到请求对象中
    next();
  } catch (err) {
    return res.status(401).json({ message: 'token无效或已过期' });
  }
};