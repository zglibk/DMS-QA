/**
 * 修复主页菜单路径脚本
 * 
 * 功能说明：
 * 1. 修复数据库中主页菜单的路径配置
 * 2. 将路径从 '/admin' 修改为 '/admin/'
 * 3. 解决路由冲突问题
 */

const sql = require('mssql')
const { getConnection } = require('../db')

async function fixHomeMenuPath() {
  let pool
  
  try {
    console.log('开始修复主页菜单路径...')
    
    // 获取数据库连接
    pool = await getConnection()
    
    // 查找主页菜单
    const homeMenu = await pool.request()
      .input('menuCode', sql.NVarChar(50), 'home')
      .query(`
        SELECT ID, Path FROM [dbo].[Menus] 
        WHERE MenuCode = @menuCode
      `)
    
    if (homeMenu.recordset.length === 0) {
      console.log('未找到主页菜单，无需修复')
      return
    }
    
    const currentPath = homeMenu.recordset[0].Path
    console.log(`当前主页菜单路径: ${currentPath}`)
    
    if (currentPath === '/admin/') {
      console.log('主页菜单路径已正确，无需修复')
      return
    }
    
    // 更新主页菜单路径
    await pool.request()
      .input('menuCode', sql.NVarChar(50), 'home')
      .input('newPath', sql.NVarChar(200), '/admin/')
      .query(`
        UPDATE [dbo].[Menus] 
        SET Path = @newPath, UpdatedAt = GETDATE()
        WHERE MenuCode = @menuCode
      `)
    
    console.log('主页菜单路径修复成功: /admin -> /admin/')
    
  } catch (error) {
    console.error('修复主页菜单路径失败:', error)
    throw error
  } finally {
    if (pool) {
      await pool.close()
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixHomeMenuPath()
    .then(() => {
      console.log('脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { fixHomeMenuPath }