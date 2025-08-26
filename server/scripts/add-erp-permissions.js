/**
 * ERP权限数据添加脚本
 * 功能：为ERP配置管理页面添加详细的操作权限
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

const sql = require('mssql');
const { getConnection } = require('../db');

/**
 * 添加ERP权限数据到数据库
 */
async function addErpPermissions() {
  let pool;
  
  try {
    console.log('🚀 开始添加ERP权限数据...');
    
    // 获取数据库连接
    pool = await getConnection();
    
    // 1. 获取ERP管理菜单ID
    console.log('\n📋 步骤1：查找ERP管理菜单...');
    const erpMenuResult = await pool.request()
      .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'erp-management'");
    
    if (erpMenuResult.recordset.length === 0) {
      throw new Error('❌ 未找到ERP管理菜单，请先执行add-erp-management-menu.sql脚本');
    }
    
    const erpMenuId = erpMenuResult.recordset[0].ID;
    console.log(`✅ 找到ERP管理菜单，ID: ${erpMenuId}`);
    
    // 2. 定义ERP权限配置
    const erpPermissions = [
      {
        menuCode: 'erp-config-add',
        menuName: '新增ERP配置',
        permission: 'erp:config:add',
        sortOrder: 10,
        description: '新增ERP配置的权限'
      },
      {
        menuCode: 'erp-config-edit',
        menuName: '编辑ERP配置',
        permission: 'erp:config:edit',
        sortOrder: 20,
        description: '编辑ERP配置的权限'
      },
      {
        menuCode: 'erp-config-delete',
        menuName: '删除ERP配置',
        permission: 'erp:config:delete',
        sortOrder: 30,
        description: '删除ERP配置的权限'
      },
      {
        menuCode: 'erp-sync-manual',
        menuName: '手动同步ERP',
        permission: 'erp:sync:manual',
        sortOrder: 40,
        description: '手动触发ERP同步的权限'
      },
      {
        menuCode: 'erp-logs-clear',
        menuName: '清理ERP日志',
        permission: 'erp:logs:clear',
        sortOrder: 50,
        description: '清理ERP同步日志的权限'
      }
    ];
    
    // 3. 添加ERP权限菜单项
    console.log('\n📋 步骤2：添加ERP权限菜单项...');
    const addedPermissions = [];
    
    for (const permConfig of erpPermissions) {
      // 检查权限是否已存在
      const existingResult = await pool.request()
        .input('MenuCode', sql.NVarChar(50), permConfig.menuCode)
        .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @MenuCode");
      
      if (existingResult.recordset.length > 0) {
        console.log(`⚠️ ${permConfig.menuName}权限已存在，跳过添加`);
        addedPermissions.push(existingResult.recordset[0].ID);
      } else {
        // 添加权限菜单项
        const insertResult = await pool.request()
          .input('ParentID', sql.Int, erpMenuId)
          .input('MenuCode', sql.NVarChar(50), permConfig.menuCode)
          .input('MenuName', sql.NVarChar(100), permConfig.menuName)
          .input('MenuType', sql.NVarChar(20), 'button')
          .input('Icon', sql.NVarChar(50), '')
          .input('Path', sql.NVarChar(200), '')
          .input('Component', sql.NVarChar(200), '')
          .input('Permission', sql.NVarChar(100), permConfig.permission)
          .input('SortOrder', sql.Int, permConfig.sortOrder)
          .input('Visible', sql.Bit, 0)
          .input('Status', sql.Bit, 1)
          .input('Description', sql.NVarChar(500), permConfig.description)
          .query(`
            INSERT INTO [dbo].[Menus] (
              [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
              [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
            ) VALUES (
              @ParentID, @MenuCode, @MenuName, @MenuType, @Icon, @Path, 
              @Component, @Permission, @SortOrder, @Visible, @Status, @Description
            );
            SELECT SCOPE_IDENTITY() AS NewMenuId;
          `);
        
        const newMenuId = insertResult.recordset[0].NewMenuId;
        addedPermissions.push(newMenuId);
        console.log(`✅ ${permConfig.menuName}权限添加成功，ID: ${newMenuId}`);
      }
    }
    
    // 4. 为管理员角色分配所有ERP权限
    console.log('\n📋 步骤3：为管理员角色分配权限...');
    const adminRoleResult = await pool.request()
      .query("SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin'");
    
    if (adminRoleResult.recordset.length === 0) {
      console.log('⚠️ 未找到管理员角色，跳过权限分配');
    } else {
      const adminRoleId = adminRoleResult.recordset[0].ID;
      
      // 包含ERP管理菜单本身
      const allErpMenuIds = [erpMenuId, ...addedPermissions];
      
      for (const menuId of allErpMenuIds) {
        // 检查权限是否已分配
        const existingPermissionResult = await pool.request()
          .input('RoleID', sql.Int, adminRoleId)
          .input('MenuID', sql.Int, menuId)
          .query("SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @RoleID AND MenuID = @MenuID");
        
        if (existingPermissionResult.recordset.length === 0) {
          await pool.request()
            .input('RoleID', sql.Int, adminRoleId)
            .input('MenuID', sql.Int, menuId)
            .query(`
              INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
              VALUES (@RoleID, @MenuID, GETDATE())
            `);
        }
      }
      
      console.log('✅ 管理员角色ERP权限分配完成');
    }
    
    // 5. 验证权限添加结果
    console.log('\n📋 步骤4：验证ERP权限结构...');
    const verifyResult = await pool.request()
      .query(`
        SELECT 
          p.MenuName AS ParentMenu,
          m.MenuName AS PermissionName,
          m.MenuCode,
          m.Permission,
          m.MenuType,
          CASE WHEN m.Status = 1 THEN '启用' ELSE '禁用' END AS Status
        FROM [dbo].[Menus] m
        LEFT JOIN [dbo].[Menus] p ON m.ParentID = p.ID
        WHERE m.MenuCode LIKE 'erp-%'
        ORDER BY m.SortOrder
      `);
    
    if (verifyResult.recordset.length > 0) {
      console.log('\n✅ 权限验证成功：');
      verifyResult.recordset.forEach(perm => {
        console.log(`   ${perm.PermissionName} (${perm.Permission}) - ${perm.Status}`);
      });
    }
    
    // 6. 显示完成信息
    console.log('\n🎉 ERP权限数据添加完成！');
    console.log('\n🔑 已添加的权限：');
    console.log('  ✅ erp:config:add - 新增ERP配置');
    console.log('  ✅ erp:config:edit - 编辑ERP配置');
    console.log('  ✅ erp:config:delete - 删除ERP配置');
    console.log('  ✅ erp:sync:manual - 手动同步ERP');
    console.log('  ✅ erp:logs:clear - 清理ERP日志');
    console.log('\n👥 权限分配：');
    console.log('  ✅ 管理员角色已获得所有ERP权限');
    console.log('\n📝 使用说明：');
    console.log('  1. 前端页面已配置权限检查逻辑');
    console.log('  2. 管理员用户可以看到所有按钮');
    console.log('  3. 其他角色需要单独分配相应权限');
    console.log('  4. 可通过用户权限管理页面为特定用户分配权限');
    console.log('\n下一步：');
    console.log('  1. 重启前端应用以加载权限配置');
    console.log('  2. 测试不同角色用户的按钮显示');
    console.log('  3. 根据需要为其他角色分配权限');
    
  } catch (error) {
    console.error('❌ 添加ERP权限数据失败:', error.message);
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError.message);
      }
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addErpPermissions()
    .then(() => {
      console.log('\n✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 脚本执行失败:', error.message);
      process.exit(1);
    });
}

module.exports = { addErpPermissions };