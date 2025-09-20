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
  let pool;
  
  try {
    // 开始检查角色权限分配数据一致性
    pool = await getConnection()
    
    // 1. 检查所有角色的基本信息
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
    
    // 角色列表
    rolesResult.recordset.forEach(role => {
      // 角色信息记录
    })
    
    // 2. 检查所有菜单的基本信息
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
    
    // 菜单列表
    menusResult.recordset.forEach(menu => {
      const parentInfo = menu.ParentID ? `父菜单ID: ${menu.ParentID}` : '顶级菜单'
      // 菜单信息记录
    })
    
    // 3. 检查RoleMenus表的数据
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
    
    // 角色菜单权限关联
    let currentRoleId = null
    roleMenusResult.recordset.forEach(rm => {
      if (currentRoleId !== rm.RoleID) {
        currentRoleId = rm.RoleID
        // 角色权限信息记录
      }
      // 菜单权限信息记录
    })
    
    // 4. 检查特定角色的权限（如果有参数指定）
    const targetRoleId = process.argv[2] // 从命令行参数获取角色ID
    if (targetRoleId) {
      // 详细检查角色权限
      
      // 检查角色是否存在
      const roleCheckResult = await pool.request()
        .input('roleId', sql.Int, targetRoleId)
        .query('SELECT * FROM Roles WHERE ID = @roleId')
      
      if (roleCheckResult.recordset.length === 0) {
        // 角色不存在
        return
      }
      
      const targetRole = roleCheckResult.recordset[0]
      // 目标角色信息记录
      
      // 获取该角色的菜单权限（模拟前端API调用）
      const roleMenusApiResult = await pool.request()
        .input('roleId', sql.Int, targetRoleId)
        .query(`
          SELECT MenuID
          FROM RoleMenus
          WHERE RoleID = @roleId
        `)
      
      const menuIds = roleMenusApiResult.recordset.map(row => row.MenuID)
      // API返回的菜单ID列表记录
      
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
        
        // 该角色拥有的菜单权限详情
        menuDetailsResult.recordset.forEach(menu => {
          const parentInfo = menu.ParentID ? `父菜单ID: ${menu.ParentID}` : '顶级菜单'
          const statusInfo = menu.Status ? '启用' : '禁用'
          const visibleInfo = menu.Visible ? '可见' : '隐藏'
          // 菜单权限详情记录
        })
      } else {
        // 该角色没有分配任何菜单权限
      }
      
      // 5. 检查菜单树结构的完整性
      // 检查菜单树结构完整性
      
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
      // 总共菜单数量记录
      
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
        // 发现孤儿菜单（父菜单不存在或不可用）
        orphanMenus.forEach(menu => {
          // 孤儿菜单信息记录
        })
      } else {
        // 菜单树结构完整，没有孤儿菜单
      }
      
      // 6. 模拟前端菜单树构建过程
      // 模拟前端菜单树构建
      
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
      
      // 构建完成的顶级菜单数量记录
      
      // 显示树形结构
      function printMenuTree(menus, level = 0) {
        menus.forEach(menu => {
          const indent = '  '.repeat(level)
          const hasPermission = menuIds.includes(menu.ID) ? '✅' : '❌'
          // 菜单树结构记录
          if (menu.children && menu.children.length > 0) {
            printMenuTree(menu.children, level + 1)
          }
        })
      }
      
      // 菜单树结构（表示该角色权限）
      printMenuTree(rootMenus)
    }
    
    // 角色权限数据一致性检查完成
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    console.error('详细错误信息:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// 执行检查
debugRolePermissions()