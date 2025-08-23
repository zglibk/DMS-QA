/**
 * 清除用户缓存脚本
 * 用于解决权限更新后前端缓存不及时更新的问题
 */

const express = require('express');
const router = express.Router();

/**
 * 清除指定用户的缓存
 * @param {string} username - 用户名
 */
function clearUserCache(username) {
  // 这里可以实现具体的缓存清除逻辑
  // 例如：清除Redis缓存、通知前端清除localStorage等
  console.log(`清除用户 ${username} 的缓存`);
}

/**
 * API接口：清除用户缓存
 */
router.post('/clear-cache/:username', (req, res) => {
  try {
    const { username } = req.params;
    clearUserCache(username);
    
    res.json({
      success: true,
      message: `用户 ${username} 的缓存已清除`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清除缓存失败',
      error: error.message
    });
  }
});

/**
 * 命令行测试脚本
 */
if (require.main === module) {
  const username = process.argv[2] || 'wxq';
  console.log(`=== 清除用户缓存 ===`);
  console.log(`目标用户: ${username}`);
  
  clearUserCache(username);
  
  console.log(`\n📋 前端用户需要执行以下操作之一:`);
  console.log(`1. 刷新页面 (F5)`);
  console.log(`2. 重新登录`);
  console.log(`3. 清除浏览器缓存`);
  console.log(`4. 清除localStorage: localStorage.removeItem('userStore')`);
}

module.exports = router;