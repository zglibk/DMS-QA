/**
 * ERP管理菜单添加脚本
 * 功能：在系统管理模块下添加ERP管理菜单
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

const sql = require('mssql');
const { getConnection } = require('../db');
const { createPermissionRefreshHelper } = require('./utils/permission-refresh-helper');

/**
 * 添加ERP管理菜单到数据库
 */
async function addErpManagementMenu() {
  let pool;
  
  try {
    console.log('🚀 开始添加ERP管理菜单...');
    
    // 获取数据库连接
    pool = await getConnection();
    
    // 1. 获取系统管理菜单ID
    console.log('\n📋 步骤1：查找系统管理菜单...');
    const systemMenuResult = await pool.request()
      .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'system'");
    
    if (systemMenuResult.recordset.length === 0) {
      throw new Error('❌ 未找到系统管理菜单，请先确保系统管理菜单存在');
    }
    
    const systemMenuId = systemMenuResult.recordset[0].ID;
    console.log(`✅ 找到系统管理菜单，ID: ${systemMenuId}`);
    
    // 2. 检查ERP管理菜单是否已存在
    console.log('\n📋 步骤2：检查ERP管理菜单是否已存在...');
    const existingMenuResult = await pool.request()
      .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'erp-management'");
    
    let erpMenuId;
    
    if (existingMenuResult.recordset.length > 0) {
      erpMenuId = existingMenuResult.recordset[0].ID;
      console.log(`⚠️ ERP管理菜单已存在，ID: ${erpMenuId}，跳过添加`);
    } else {
      // 3. 添加ERP管理子菜单
      console.log('\n📋 步骤3：添加ERP管理菜单...');
      const insertMenuResult = await pool.request()
        .input('ParentID', sql.Int, systemMenuId)
        .input('MenuCode', sql.NVarChar(50), 'erp-management')
        .input('MenuName', sql.NVarChar(100), 'ERP管理')
        .input('MenuType', sql.NVarChar(20), 'menu')
        .input('Icon', sql.NVarChar(50), 'Connection')
        .input('Path', sql.NVarChar(200), '/system/erp')
        .input('Component', sql.NVarChar(200), 'admin/ErpManagement')
        .input('Permission', sql.NVarChar(100), 'system:erp:view')
        .input('SortOrder', sql.Int, 60)
        .input('Visible', sql.Bit, 1)
        .input('Status', sql.Bit, 1)
        .input('Description', sql.NVarChar(500), 'ERP系统配置管理和同步日志查看')
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
      
      erpMenuId = insertMenuResult.recordset[0].NewMenuId;
      console.log(`✅ ERP管理菜单添加成功，ID: ${erpMenuId}`);
    }
    
    // 4. 为管理员角色分配菜单权限
    console.log('\n📋 步骤4：为管理员角色分配权限...');
    const adminRoleResult = await pool.request()
      .query("SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin'");
    
    if (adminRoleResult.recordset.length === 0) {
      console.log('⚠️ 未找到管理员角色，跳过权限分配');
    } else {
      const adminRoleId = adminRoleResult.recordset[0].ID;
      
      // 检查权限是否已分配
      const existingPermissionResult = await pool.request()
        .input('RoleID', sql.Int, adminRoleId)
        .input('MenuID', sql.Int, erpMenuId)
        .query("SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @RoleID AND MenuID = @MenuID");
      
      if (existingPermissionResult.recordset.length > 0) {
        console.log('⚠️ 管理员角色已拥有ERP管理权限，跳过分配');
      } else {
        await pool.request()
          .input('RoleID', sql.Int, adminRoleId)
          .input('MenuID', sql.Int, erpMenuId)
          .query(`
            INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
            VALUES (@RoleID, @MenuID, GETDATE())
          `);
        console.log('✅ 管理员角色ERP管理权限分配完成');
        
        // 5. 刷新管理员用户权限缓存
        console.log('\n📋 步骤5：刷新管理员用户权限缓存...');
        const permissionHelper = createPermissionRefreshHelper();
        const refreshResult = await permissionHelper.refreshAdminUsersPermissions();
        
        if (refreshResult.success) {
          console.log('✅ 管理员用户权限缓存刷新完成');
          if (refreshResult.refreshedUsers.length > 0) {
            permissionHelper.showRefreshSuggestions(refreshResult.refreshedUsers);
          }
        } else {
          console.log('⚠️ 权限缓存刷新失败:', refreshResult.message);
        }
        
        // 记录权限变更日志
        await permissionHelper.logPermissionChange(
          'MENU_PERMISSION_ASSIGNED',
          `为管理员角色分配ERP管理菜单权限 (MenuID: ${erpMenuId})`,
          null
        );
      }
    }
    
    // 6. 验证菜单添加结果
    console.log('\n📋 步骤5：验证菜单结构...');
    const verifyResult = await pool.request()
      .query(`
        SELECT 
          p.MenuName AS ParentMenu,
          m.MenuName AS MenuName,
          m.MenuCode,
          m.Path,
          m.Component,
          m.Icon,
          m.Permission,
          m.SortOrder,
          CASE WHEN m.Status = 1 THEN '启用' ELSE '禁用' END AS Status
        FROM [dbo].[Menus] m
        LEFT JOIN [dbo].[Menus] p ON m.ParentID = p.ID
        WHERE m.MenuCode = 'erp-management'
        ORDER BY m.SortOrder
      `);
    
    if (verifyResult.recordset.length > 0) {
      const menu = verifyResult.recordset[0];
      console.log('\n✅ 菜单验证成功：');
      console.log(`   父菜单: ${menu.ParentMenu}`);
      console.log(`   菜单名称: ${menu.MenuName}`);
      console.log(`   菜单编码: ${menu.MenuCode}`);
      console.log(`   访问路径: ${menu.Path}`);
      console.log(`   Vue组件: ${menu.Component}`);
      console.log(`   权限标识: ${menu.Permission}`);
      console.log(`   状态: ${menu.Status}`);
    }
    
    // 7. 显示完成信息
    console.log('\n🎉 ERP管理菜单添加完成！');
    console.log('\n📁 菜单结构：');
    console.log('  系统管理 (system)');
    console.log('    └── ERP管理 (erp-management)');
    console.log('\n🔑 权限配置：');
    console.log('  ✅ 菜单访问权限：system:erp:view');
    console.log('  ✅ 管理员角色权限分配完成');
    console.log('\n🌐 访问路径：');
    console.log('  前端路由：/system/erp');
    console.log('  Vue组件：admin/ErpManagement');
    console.log('\n📝 功能说明：');
    console.log('  - ERP配置管理（关联erp_config表）');
    console.log('  - ERP同步日志（关联erp_sync_logs表）');
    console.log('  - 配置管理和同步日志在同一页面，通过按钮切换');
    console.log('\n下一步：');
    console.log('  1. 重启前端应用以加载新菜单');
    console.log('  2. 确保后端API接口正常工作');
    console.log('  3. 为其他角色分配相应权限（如需要）');
    
  } catch (error) {
    console.error('❌ 添加ERP管理菜单失败：', error.message);
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('⚠️ 关闭数据库连接时出错：', closeError.message);
      }
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addErpManagementMenu()
    .then(() => {
      console.log('\n✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 脚本执行失败：', error.message);
      process.exit(1);
    });
}

module.exports = { addErpManagementMenu };