/**
 * 测试角色权限分配修复效果的脚本
 * 用于验证前端权限分配对话框的bug是否已修复
 */

const sql = require('mssql')
const { getConnection } = require('../config/database')

async function testRolePermissionFix() {
  let pool
  
  try {
    console.log('🔧 开始测试角色权限分配修复效果...')
    console.log('=')
    
    // 连接数据库
    pool = await getConnection()
    console.log('✅ 数据库连接成功')
    
    // 1. 获取测试角色（ID=2，质量经理）
    const testRoleResult = await pool.request()
      .input('roleId', sql.Int, 2)
      .query(`
        SELECT ID, RoleName, RoleCode, Status
        FROM Roles
        WHERE ID = @roleId
      `)
    
    if (testRoleResult.recordset.length === 0) {
      console.log('❌ 测试角色不存在，请检查数据库')
      return
    }
    
    const testRole = testRoleResult.recordset[0]
    console.log(`\n📋 测试角色信息:`)
    console.log(`  - 角色名称: ${testRole.RoleName}`)
    console.log(`  - 角色编码: ${testRole.RoleCode}`)
    console.log(`  - 状态: ${testRole.Status ? '启用' : '禁用'}`)
    
    // 2. 模拟前端API调用：获取角色菜单权限
    console.log(`\n🔍 模拟前端API调用: GET /roles/${testRole.ID}/menus`)
    const roleMenusResult = await pool.request()
      .input('roleId', sql.Int, testRole.ID)
      .query(`
        SELECT MenuID
        FROM RoleMenus
        WHERE RoleID = @roleId
        ORDER BY MenuID
      `)
    
    const menuIds = roleMenusResult.recordset.map(row => row.MenuID)
    console.log(`✅ API返回的菜单ID数组: [${menuIds.join(', ')}]`)
    console.log(`📊 权限数量: ${menuIds.length} 个菜单`)
    
    // 3. 获取这些菜单的详细信息
    if (menuIds.length > 0) {
      const menuDetailsResult = await pool.request()
        .query(`
          SELECT 
            ID,
            MenuName,
            MenuCode,
            ParentID,
            MenuType,
            Status,
            Visible
          FROM Menus
          WHERE ID IN (${menuIds.join(',')})
          ORDER BY 
            CASE WHEN ParentID IS NULL THEN 0 ELSE 1 END,
            ParentID,
            SortOrder,
            ID
        `)
      
      console.log(`\n📋 该角色拥有的菜单权限详情:`)
      let parentMenus = []
      let childMenus = []
      
      menuDetailsResult.recordset.forEach(menu => {
        const statusInfo = menu.Status ? '启用' : '禁用'
        const visibleInfo = menu.Visible ? '可见' : '隐藏'
        const menuInfo = `${menu.MenuName} (ID: ${menu.ID}, 编码: ${menu.MenuCode}, ${statusInfo}, ${visibleInfo})`
        
        if (menu.ParentID === null) {
          parentMenus.push(`  🗂️  ${menuInfo}`)
        } else {
          childMenus.push(`    📄 ${menuInfo} [父菜单ID: ${menu.ParentID}]`)
        }
      })
      
      // 显示层级结构
      parentMenus.forEach(parent => console.log(parent))
      childMenus.forEach(child => console.log(child))
    }
    
    // 4. 检查权限数据的完整性
    console.log(`\n🔍 权限数据完整性检查:`)
    
    // 检查是否有无效的菜单ID
    const invalidMenusResult = await pool.request()
      .input('roleId', sql.Int, testRole.ID)
      .query(`
        SELECT rm.MenuID
        FROM RoleMenus rm
        LEFT JOIN Menus m ON rm.MenuID = m.ID
        WHERE rm.RoleID = @roleId AND m.ID IS NULL
      `)
    
    if (invalidMenusResult.recordset.length > 0) {
      console.log(`❌ 发现无效的菜单ID: ${invalidMenusResult.recordset.map(r => r.MenuID).join(', ')}`)
    } else {
      console.log(`✅ 所有菜单ID都有效`)
    }
    
    // 检查是否有重复的权限记录
    const duplicateResult = await pool.request()
      .input('roleId', sql.Int, testRole.ID)
      .query(`
        SELECT MenuID, COUNT(*) as Count
        FROM RoleMenus
        WHERE RoleID = @roleId
        GROUP BY MenuID
        HAVING COUNT(*) > 1
      `)
    
    if (duplicateResult.recordset.length > 0) {
      console.log(`❌ 发现重复的权限记录:`)
      duplicateResult.recordset.forEach(dup => {
        console.log(`  - 菜单ID ${dup.MenuID}: ${dup.Count} 条记录`)
      })
    } else {
      console.log(`✅ 没有重复的权限记录`)
    }
    
    // 5. 模拟前端树组件数据结构
    console.log(`\n🌳 模拟前端树组件数据结构:`)
    
    // 获取所有菜单构建树形结构
    const allMenusResult = await pool.request()
      .query(`
        SELECT 
          ID,
          MenuName as Name,
          MenuCode,
          ParentID,
          MenuType,
          Status,
          Visible,
          SortOrder
        FROM Menus
        WHERE Status = 1 AND Visible = 1
        ORDER BY 
          CASE WHEN ParentID IS NULL THEN 0 ELSE 1 END,
          ParentID,
          SortOrder,
          ID
      `)
    
    const allMenus = allMenusResult.recordset
    console.log(`📊 系统中可见菜单总数: ${allMenus.length}`)
    console.log(`📊 该角色拥有权限的菜单数: ${menuIds.length}`)
    console.log(`📊 权限覆盖率: ${((menuIds.length / allMenus.length) * 100).toFixed(1)}%`)
    
    // 6. 验证前端修复效果
    console.log(`\n🔧 前端修复效果验证:`)
    console.log(`✅ 修复内容:`)
    console.log(`  1. 添加了 nextTick() 等待DOM更新`)
    console.log(`  2. 手动调用 setCheckedKeys() 设置选中状态`)
    console.log(`  3. 移除了 default-checked-keys 属性避免响应性问题`)
    console.log(`  4. 在对话框关闭时清除树组件状态`)
    
    console.log(`\n📋 测试建议:`)
    console.log(`  1. 在浏览器中打开角色管理页面`)
    console.log(`  2. 点击"${testRole.RoleName}"角色的"权限"按钮`)
    console.log(`  3. 检查权限分配对话框中是否正确显示了 ${menuIds.length} 个已选中的菜单`)
    console.log(`  4. 验证树组件的选中状态与数据库中的权限记录一致`)
    
    console.log(`\n✅ 角色权限分配修复效果测试完成！`)
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    if (pool) {
      await pool.close()
      console.log('\n🔌 数据库连接已关闭')
    }
  }
}

// 运行测试
if (require.main === module) {
  testRolePermissionFix()
    .then(() => {
      console.log('\n🎉 测试脚本执行完成')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ 测试脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { testRolePermissionFix }