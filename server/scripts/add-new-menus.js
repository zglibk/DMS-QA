/**
 * 添加新菜单的通用脚本
 * 功能：为项目添加指定的菜单项并分配给管理员角色
 * 使用方法：
 * 1. 在 newMenus 数组中定义要添加的菜单
 * 2. 运行 node add-new-menus.js
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 要添加的新菜单列表
const newMenus = [
  {
    code: 'shipment-report',
    name: '出货检验报告',
    type: 'menu',
    icon: 'Box',
    path: '/shipment-report',
    component: 'ShipmentReport',
    permission: 'shipment:report:view',
    sortOrder: 95,
    visible: 1,
    status: 1,
    description: '出货检验报告生成与管理',
    roles: ['admin'], // 自动分配给这些角色
    children: [
      {
        code: 'shipment-report-search',
        name: '查询',
        type: 'button',
        permission: 'shipment:report:search',
        sortOrder: 10,
        description: '查询工单信息'
      },
      {
        code: 'shipment-template-view',
        name: '模板管理',
        type: 'button',
        permission: 'shipment:template:view',
        sortOrder: 20,
        description: '查看模板列表'
      },
      {
        code: 'shipment-template-add',
        name: '新增模板',
        type: 'button',
        permission: 'shipment:template:add',
        sortOrder: 30,
        description: '上传新模板'
      },
      {
        code: 'shipment-template-edit',
        name: '编辑模板',
        type: 'button',
        permission: 'shipment:template:edit',
        sortOrder: 40,
        description: '编辑模板信息'
      },
      {
        code: 'shipment-template-delete',
        name: '删除模板',
        type: 'button',
        permission: 'shipment:template:delete',
        sortOrder: 50,
        description: '删除模板'
      },
      {
        code: 'shipment-template-mapping',
        name: '模板映射',
        type: 'button',
        permission: 'shipment:template:mapping',
        sortOrder: 60,
        description: '配置模板映射'
      },
      {
        code: 'shipment-report-export',
        name: '导出报告',
        type: 'button',
        permission: 'shipment:report:export',
        sortOrder: 70,
        description: '导出或打印报告'
      }
    ]
  },
  // 可以在此处添加更多菜单...
];

// 数据库配置
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'DMS-QA',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function addNewMenus() {
  let pool;
  
  try {
    console.log('正在连接数据库...');
    pool = await sql.connect(dbConfig);
    console.log('数据库连接成功');

    for (const menu of newMenus) {
      console.log(`\n正在处理菜单: ${menu.name} (${menu.code})...`);
      
      // 开始事务
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        let menuId;

        // 1. 检查菜单是否存在
        const existingMenu = await transaction.request()
          .input('code', sql.NVarChar(50), menu.code)
          .query('SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @code');

        if (existingMenu.recordset.length > 0) {
          menuId = existingMenu.recordset[0].ID;
          console.log(`菜单已存在，ID: ${menuId}，将更新信息...`);
          
          // 更新菜单信息
          await transaction.request()
            .input('id', sql.Int, menuId)
            .input('name', sql.NVarChar(50), menu.name)
            .input('icon', sql.NVarChar(50), menu.icon)
            .input('path', sql.NVarChar(200), menu.path)
            .input('component', sql.NVarChar(200), menu.component)
            .input('permission', sql.NVarChar(100), menu.permission)
            .input('sortOrder', sql.Int, menu.sortOrder)
            .input('description', sql.NVarChar(500), menu.description)
            .query(`
              UPDATE [dbo].[Menus]
              SET MenuName = @name,
                  Icon = @icon,
                  Path = @path,
                  Component = @component,
                  Permission = @permission,
                  SortOrder = @sortOrder,
                  Description = @description
              WHERE ID = @id
            `);
          console.log('菜单信息已更新');
        } else {
          // 插入新菜单
          const result = await transaction.request()
            .input('code', sql.NVarChar(50), menu.code)
            .input('name', sql.NVarChar(50), menu.name)
            .input('type', sql.NVarChar(10), menu.type)
            .input('icon', sql.NVarChar(50), menu.icon)
            .input('path', sql.NVarChar(200), menu.path)
            .input('component', sql.NVarChar(200), menu.component)
            .input('permission', sql.NVarChar(100), menu.permission)
            .input('sortOrder', sql.Int, menu.sortOrder)
            .input('visible', sql.Bit, menu.visible)
            .input('status', sql.Bit, menu.status)
            .input('description', sql.NVarChar(500), menu.description)
            .query(`
              INSERT INTO [dbo].[Menus] (
                [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
                [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
              ) 
              OUTPUT INSERTED.ID
              VALUES (
                @code, @name, @type, @icon, @path,
                @component, @permission, @sortOrder, @visible, @status, @description
              )
            `);
          menuId = result.recordset[0].ID;
          console.log(`菜单添加成功，ID: ${menuId}`);
        }

        // 1.5 处理子菜单/按钮
        if (menu.children && menu.children.length > 0) {
          console.log(`正在处理 ${menu.children.length} 个子项...`);
          for (const child of menu.children) {
            // 检查子项是否存在
            const existingChild = await transaction.request()
              .input('code', sql.NVarChar(50), child.code)
              .query('SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @code');
            
            let childId;
            if (existingChild.recordset.length > 0) {
              childId = existingChild.recordset[0].ID;
              console.log(`  子项 ${child.name} 已存在，ID: ${childId}，更新信息...`);
              await transaction.request()
                .input('id', sql.Int, childId)
                .input('parentId', sql.Int, menuId)
                .input('name', sql.NVarChar(50), child.name)
                .input('permission', sql.NVarChar(100), child.permission)
                .input('sortOrder', sql.Int, child.sortOrder)
                .input('description', sql.NVarChar(500), child.description)
                .query(`
                  UPDATE [dbo].[Menus]
                  SET ParentID = @parentId,
                      MenuName = @name,
                      Permission = @permission,
                      SortOrder = @sortOrder,
                      Description = @description
                  WHERE ID = @id
                `);
            } else {
              console.log(`  添加子项 ${child.name}...`);
              const childResult = await transaction.request()
                .input('parentId', sql.Int, menuId)
                .input('code', sql.NVarChar(50), child.code)
                .input('name', sql.NVarChar(50), child.name)
                .input('type', sql.NVarChar(10), child.type)
                .input('permission', sql.NVarChar(100), child.permission)
                .input('sortOrder', sql.Int, child.sortOrder)
                .input('visible', sql.Bit, 1)
                .input('status', sql.Bit, 1)
                .input('description', sql.NVarChar(500), child.description)
                .query(`
                  INSERT INTO [dbo].[Menus] (
                    [ParentID], [MenuCode], [MenuName], [MenuType], 
                    [Permission], [SortOrder], [Visible], [Status], [Description]
                  ) 
                  OUTPUT INSERTED.ID
                  VALUES (
                    @parentId, @code, @name, @type,
                    @permission, @sortOrder, @visible, @status, @description
                  )
                `);
              childId = childResult.recordset[0].ID;
            }
            
            // 为子项分配权限（跟随父级配置的角色）
            if (menu.roles && menu.roles.length > 0) {
              for (const roleCode of menu.roles) {
                const roleResult = await transaction.request()
                  .input('roleCode', sql.NVarChar(20), roleCode)
                  .query('SELECT ID FROM [dbo].[Roles] WHERE RoleCode = @roleCode');
                
                if (roleResult.recordset.length > 0) {
                  const roleId = roleResult.recordset[0].ID;
                  const existingPermission = await transaction.request()
                    .input('roleId', sql.Int, roleId)
                    .input('menuId', sql.Int, childId)
                    .query('SELECT COUNT(*) as count FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');

                  if (existingPermission.recordset[0].count === 0) {
                    await transaction.request()
                      .input('roleId', sql.Int, roleId)
                      .input('menuId', sql.Int, childId)
                      .query(`
                        INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
                        VALUES (@roleId, @menuId, GETDATE())
                      `);
                  }
                }
              }
            }
          }
        }

        // 2. 为指定角色分配权限
        if (menu.roles && menu.roles.length > 0) {
          for (const roleCode of menu.roles) {
            // 获取角色ID
            const roleResult = await transaction.request()
              .input('roleCode', sql.NVarChar(20), roleCode)
              .query('SELECT ID FROM [dbo].[Roles] WHERE RoleCode = @roleCode');

            if (roleResult.recordset.length === 0) {
              console.warn(`未找到角色: ${roleCode}，跳过权限分配`);
              continue;
            }

            const roleId = roleResult.recordset[0].ID;

            // 检查权限是否存在
            const existingPermission = await transaction.request()
              .input('roleId', sql.Int, roleId)
              .input('menuId', sql.Int, menuId)
              .query('SELECT COUNT(*) as count FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');

            if (existingPermission.recordset[0].count === 0) {
              await transaction.request()
                .input('roleId', sql.Int, roleId)
                .input('menuId', sql.Int, menuId)
                .query(`
                  INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
                  VALUES (@roleId, @menuId, GETDATE())
                `);
              console.log(`已为角色 ${roleCode} 分配菜单权限`);
            } else {
              console.log(`角色 ${roleCode} 已拥有该菜单权限`);
            }
          }
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    console.log('\n=== 所有操作完成 ===');

  } catch (error) {
    console.error('操作失败:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('数据库连接已关闭');
    }
  }
}

addNewMenus();
