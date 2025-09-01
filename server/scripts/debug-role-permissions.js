/**
 * 调试角色权限分配对话框的bug
 * 检查RoleMenus表中的数据与前端显示是否一致
 */

const sql = require('mssql')
const { getConnection } = require('../db')

/**
 * 检查角色权限分配的数据一致性
 */
async function debugRolePermissions() {
  try {
    console.log('🔍 开始检查角色权限分配数据一致性...')
    
    const pool = await getConnection()
    
    // 1. 检查所有角色的基本信息
    console.log('\n=== 1. 角色基本信息 ===')
    const rolesResult = await pool.request().query(`
      SELECT 
        ID,
        RoleName,
        RoleCode,
        Status,
        CreatedAt
      FROM Roles
      ORDER BY ID
    `)
    
    console.log('角色列表:')
    rolesResult.recordset.forEach(role => {
      console.log(`  - ID: ${role.ID}, 名称: ${role.RoleName}, 编码: ${role.RoleCode}, 状态: ${role.Status ? '启用' : '禁用'}`)
    })
    
    // 2. 检查所有菜单的基本信息
    console.log('\n=== 2. 菜单基本信息 ===')
    const menusResult = await pool.request().query(`
      SELECT 
        ID,
        MenuName,
        MenuCode,
        ParentID,
        MenuType,
        Status,
        Visible
      FROM Menus
      ORDER BY ParentID, SortOrder, ID
    `)
    
    console.log('菜单列表:')
    menusResult.recordset.forEach(menu => {
      const parentInfo = menu.ParentID ? `父菜单ID: ${menu.ParentID}` : '顶级菜单'
      console.log(`  - ID: ${menu.ID}, 名称: ${menu.MenuName}, 编码: ${menu.MenuCode}, ${parentInfo}, 类型: ${menu.MenuType}, 状态: ${menu.Status ? '启用' : '禁用'}, 可见: ${menu.Visible ? '是' : '否'}`)
    })
    
    // 3. 检查RoleMenus表的数据
    console.log('\n=== 3. 角色菜单权限关联数据 ===')
    const roleMenusResult = await pool.request().query(`
      SELECT 
        rm.ID as RoleMenuID,
        rm.RoleID,
        r.RoleName,
        rm.MenuID,
        m.MenuName,
        m.MenuCode,
        rm.CreatedAt
      FROM RoleMenus rm
      INNER JOIN Roles r ON rm.RoleID = r.ID
      INNER JOIN Menus m ON rm.MenuID = m.ID
      ORDER BY rm.RoleID, m.ParentID, m.SortOrder, m.ID
    `)
    
    console.log('角色菜单权限关联:')
    let currentRoleId = null
    roleMenusResult.recordset.forEach(rm => {
      if (currentRoleId !== rm.RoleID) {
        currentRoleId = rm.RoleID
        console.log(`\n  角色: ${rm.RoleName} (ID: ${rm.RoleID})`)
      }
      console.log(`    - 菜单: ${rm.MenuName} (ID: ${rm.MenuID}, 编码: ${rm.MenuCode})`)
    })
    
    // 4. 检查特定角色的权限（如果有参数指定）
    const targetRoleId = process.argv[2] // 从命令行参数获取角色ID
    if (targetRoleId) {
      console.log(`\n=== 4. 详细检查角色ID ${targetRoleId} 的权限 ===`)
      
      // 检查角色是否存在
      const roleCheckResult = await pool.request()
        .input('roleId', sql.Int, targetRoleId)
        .query('SELECT * FROM Roles WHERE ID = @roleId')
      
      if (roleCheckResult.recordset.length === 0) {
        console.log(`❌ 角色ID ${targetRoleId} 不存在`)
        return
      }
      
      const targetRole = roleCheckResult.recordset[0]
      console.log(`目标角色: ${targetRole.RoleName} (${targetRole.RoleCode})`)
      
      // 获取该角色的菜单权限（模拟前端API调用）
      const roleMenusApiResult = await pool.request()
        .input('roleId', sql.Int, targetRoleId)
        .query(`
          SELECT MenuID
          FROM RoleMenus
          WHERE RoleID = @roleId
        `)
      
      const menuIds = roleMenusApiResult.recordset.map(row => row.MenuID)
      console.log('API返回的菜单ID列表:', menuIds)
      
      // 获取这些菜单的详细信息
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
            ORDER BY ParentID, SortOrder, ID
          `)
        
        console.log('\n该角色拥有的菜单权限详情:')
        menuDetailsResult.recordset.forEach(menu => {
          const parentInfo = menu.ParentID ? `父菜单ID: ${menu.ParentID}` : '顶级菜单'
          const statusInfo = menu.Status ? '启用' : '禁用'
          const visibleInfo = menu.Visible ? '可见' : '隐藏'
          console.log(`  - ${menu.MenuName} (ID: ${menu.ID}, 编码: ${menu.MenuCode}, ${parentInfo}, ${statusInfo}, ${visibleInfo})`)
        })
      } else {
        console.log('该角色没有分配任何菜单权限')
      }
      
      // 5. 检查菜单树结构的完整性
      console.log('\n=== 5. 检查菜单树结构完整性 ===')
      
      // 获取所有菜单构建树形结构
      const allMenusResult = await pool.request().query(`
        SELECT 
          ID,
          MenuName,
          MenuCode,
          ParentID,
          MenuType,
          Status,
          Visible,
          SortOrder
        FROM Menus
        WHERE Status = 1 AND Visible = 1
        ORDER BY SortOrder ASC, CreatedAt ASC
      `)
      
      const allMenus = allMenusResult.recordset
      console.log(`总共有 ${allMenus.length} 个可用菜单`)
      
      // 检查是否有孤儿菜单（父菜单不存在或不可用）
      const orphanMenus = []
      allMenus.forEach(menu => {
        if (menu.ParentID) {
          const parent = allMenus.find(m => m.ID === menu.ParentID)
          if (!parent) {
            orphanMenus.push(menu)
          }
        }
      })
      
      if (orphanMenus.length > 0) {
        console.log('\n⚠️ 发现孤儿菜单（父菜单不存在或不可用）:')
        orphanMenus.forEach(menu => {
          console.log(`  - ${menu.MenuName} (ID: ${menu.ID}, 父菜单ID: ${menu.ParentID})`)
        })
      } else {
        console.log('✅ 菜单树结构完整，没有孤儿菜单')
      }
      
      // 6. 模拟前端菜单树构建过程
      console.log('\n=== 6. 模拟前端菜单树构建 ===')
      
      // 构建菜单映射
      const menuMap = new Map()
      const rootMenus = []
      
      // 先创建所有菜单的映射
      allMenus.forEach(menu => {
        menu.children = []
        menuMap.set(menu.ID, menu)
      })
      
      // 构建父子关系
      allMenus.forEach(menu => {
        if (menu.ParentID && menuMap.has(menu.ParentID)) {
          menuMap.get(menu.ParentID).children.push(menu)
        } else {
          rootMenus.push(menu)
        }
      })
      
      console.log(`构建完成: ${rootMenus.length} 个顶级菜单`)
      
      // 显示树形结构
      function printMenuTree(menus, level = 0) {
        menus.forEach(menu => {
          const indent = '  '.repeat(level)
          const hasPermission = menuIds.includes(menu.ID) ? '✅' : '❌'
          console.log(`${indent}${hasPermission} ${menu.MenuName} (ID: ${menu.ID})`)
          if (menu.children && menu.children.length > 0) {
            printMenuTree(menu.children, level + 1)
          }
        })
      }
      
      console.log('\n菜单树结构（✅表示该角色有权限，❌表示无权限）:')
      printMenuTree(rootMenus)
    }
    
    console.log('\n✅ 角色权限数据一致性检查完成！')
    
  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

// 执行检查
debugRolePermissions()