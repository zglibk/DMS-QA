/**
 * 添加主页菜单项脚本
 * 
 * 功能说明：
 * 1. 在菜单表中添加主页菜单项
 * 2. 为admin角色分配主页菜单权限
 * 3. 不需要权限认证，所有后台用户都可以访问
 */

const sql = require('mssql')
const { getConnection } = require('../db')

async function addHomeMenu() {
  let pool
  
  try {
    console.log('开始添加主页菜单项...')
    
    // 获取数据库连接
    pool = await getConnection()
    
    // 检查主页菜单是否已存在
    const existingMenu = await pool.request()
      .input('menuCode', sql.NVarChar(50), 'home')
      .query(`
        SELECT ID FROM [dbo].[Menus] 
        WHERE MenuCode = @menuCode
      `)
    
    if (existingMenu.recordset.length > 0) {
      console.log('主页菜单已存在，跳过创建')
      return
    }
    
    // 插入主页菜单
    const insertResult = await pool.request()
      .input('menuCode', sql.NVarChar(50), 'home')
      .input('menuName', sql.NVarChar(50), '主页')
      .input('menuType', sql.NVarChar(10), 'menu')
      .input('icon', sql.NVarChar(50), 'HomeFilled')
      .input('path', sql.NVarChar(200), '/admin')
      .input('sortOrder', sql.Int, 1)
      .input('visible', sql.Bit, 1)
      .input('status', sql.Bit, 1)
      .query(`
        INSERT INTO [dbo].[Menus] (
          [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
          [Permission], [SortOrder], [Visible], [Status], [CreatedAt], [UpdatedAt]
        ) VALUES (
          @menuCode, @menuName, @menuType, @icon, @path, 
          NULL, @sortOrder, @visible, @status, GETDATE(), GETDATE()
        );
        SELECT SCOPE_IDENTITY() as MenuID;
      `)
    
    const homeMenuId = insertResult.recordset[0].MenuID
    console.log(`主页菜单创建成功，ID: ${homeMenuId}`)
    
    // 获取admin角色ID
    const adminRole = await pool.request()
      .input('roleCode', sql.NVarChar(20), 'admin')
      .query(`
        SELECT ID FROM [dbo].[Roles] 
        WHERE RoleCode = @roleCode
      `)
    
    if (adminRole.recordset.length === 0) {
      console.log('警告：未找到admin角色，跳过权限分配')
      return
    }
    
    const adminRoleId = adminRole.recordset[0].ID
    
    // 检查角色菜单关联是否已存在
    const existingRoleMenu = await pool.request()
      .input('roleId', sql.Int, adminRoleId)
      .input('menuId', sql.Int, homeMenuId)
      .query(`
        SELECT ID FROM [dbo].[RoleMenus] 
        WHERE RoleID = @roleId AND MenuID = @menuId
      `)
    
    if (existingRoleMenu.recordset.length === 0) {
      // 为admin角色分配主页菜单权限
      await pool.request()
        .input('roleId', sql.Int, adminRoleId)
        .input('menuId', sql.Int, homeMenuId)
        .query(`
          INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt])
          VALUES (@roleId, @menuId, GETDATE())
        `)
      
      console.log('admin角色主页菜单权限分配成功')
    } else {
      console.log('admin角色主页菜单权限已存在，跳过分配')
    }
    
    console.log('主页菜单添加完成！')
    
  } catch (error) {
    console.error('添加主页菜单失败:', error)
    throw error
  } finally {
    if (pool) {
      await pool.close()
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addHomeMenu()
    .then(() => {
      console.log('脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { addHomeMenu }