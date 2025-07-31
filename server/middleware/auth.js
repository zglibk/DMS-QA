const jwt = require('jsonwebtoken');
const SECRET = 'dms-secret';

module.exports = function (req, res, next) {
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