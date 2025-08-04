/**
 * 添加二次开发菜单的Node.js脚本
 * 功能：为项目添加"二次开发"顶级菜单和相关子菜单
 * 执行方式：node add-development-menus.js
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

/**
 * 添加二次开发菜单
 */
async function addDevelopmentMenus() {
  let pool;
  
  try {
    console.log('正在连接数据库...');
    pool = await sql.connect(dbConfig);
    console.log('数据库连接成功');

    // 开始事务
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. 添加"二次开发"顶级菜单
      console.log('添加"二次开发"顶级菜单...');
      const developmentMenuResult = await transaction.request()
        .input('menuCode', sql.NVarChar(50), 'development')
        .input('menuName', sql.NVarChar(50), '二次开发')
        .input('menuType', sql.NVarChar(10), 'menu')
        .input('icon', sql.NVarChar(50), 'Tools')
        .input('path', sql.NVarChar(200), '/development')
        .input('permission', sql.NVarChar(100), 'development:view')
        .input('sortOrder', sql.Int, 100)
        .input('visible', sql.Bit, 1)
        .input('status', sql.Bit, 1)
        .input('description', sql.NVarChar(500), '二次开发相关的组件和工具')
        .query(`
          INSERT INTO [dbo].[Menus] (
            [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
            [Permission], [SortOrder], [Visible], [Status], [Description]
          ) 
          OUTPUT INSERTED.ID
          VALUES (
            @menuCode, @menuName, @menuType, @icon, @path,
            @permission, @sortOrder, @visible, @status, @description
          )
        `);

      const developmentMenuId = developmentMenuResult.recordset[0].ID;
      console.log(`"二次开发"菜单添加成功，ID: ${developmentMenuId}`);

      // 2. 添加"结构组件"子菜单
      console.log('添加"结构组件"子菜单...');
      const structureComponentsResult = await transaction.request()
        .input('parentId', sql.Int, developmentMenuId)
        .input('menuCode', sql.NVarChar(50), 'structure-components')
        .input('menuName', sql.NVarChar(50), '结构组件')
        .input('menuType', sql.NVarChar(10), 'menu')
        .input('icon', sql.NVarChar(50), 'Grid')
        .input('path', sql.NVarChar(200), '/development/structure-components')
        .input('component', sql.NVarChar(200), 'development/StructureComponents')
        .input('permission', sql.NVarChar(100), 'development:structure:view')
        .input('sortOrder', sql.Int, 10)
        .input('visible', sql.Bit, 1)
        .input('status', sql.Bit, 1)
        .input('description', sql.NVarChar(500), '可复用的结构组件展示和说明')
        .query(`
          INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
            [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
          ) 
          OUTPUT INSERTED.ID
          VALUES (
            @parentId, @menuCode, @menuName, @menuType, @icon, @path,
            @component, @permission, @sortOrder, @visible, @status, @description
          )
        `);

      const structureComponentsMenuId = structureComponentsResult.recordset[0].ID;
      console.log(`"结构组件"菜单添加成功，ID: ${structureComponentsMenuId}`);

      // 3. 获取管理员角色ID
      console.log('获取管理员角色ID...');
      const adminRoleResult = await transaction.request()
        .input('roleCode', sql.NVarChar(20), 'admin')
        .query('SELECT ID FROM [dbo].[Roles] WHERE RoleCode = @roleCode');

      if (adminRoleResult.recordset.length === 0) {
        throw new Error('未找到管理员角色');
      }

      const adminRoleId = adminRoleResult.recordset[0].ID;
      console.log(`管理员角色ID: ${adminRoleId}`);

      // 4. 为管理员角色分配"二次开发"菜单权限
      console.log('为管理员角色分配"二次开发"菜单权限...');
      const existingDevelopmentPermission = await transaction.request()
        .input('roleId', sql.Int, adminRoleId)
        .input('menuId', sql.Int, developmentMenuId)
        .query('SELECT COUNT(*) as count FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');

      if (existingDevelopmentPermission.recordset[0].count === 0) {
        await transaction.request()
          .input('roleId', sql.Int, adminRoleId)
          .input('menuId', sql.Int, developmentMenuId)
          .query(`
            INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
            VALUES (@roleId, @menuId, GETDATE())
          `);
        console.log('"二次开发"菜单权限分配成功');
      } else {
        console.log('"二次开发"菜单权限已存在，跳过');
      }

      // 5. 为管理员角色分配"结构组件"菜单权限
      console.log('为管理员角色分配"结构组件"菜单权限...');
      const existingStructurePermission = await transaction.request()
        .input('roleId', sql.Int, adminRoleId)
        .input('menuId', sql.Int, structureComponentsMenuId)
        .query('SELECT COUNT(*) as count FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');

      if (existingStructurePermission.recordset[0].count === 0) {
        await transaction.request()
          .input('roleId', sql.Int, adminRoleId)
          .input('menuId', sql.Int, structureComponentsMenuId)
          .query(`
            INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
            VALUES (@roleId, @menuId, GETDATE())
          `);
        console.log('"结构组件"菜单权限分配成功');
      } else {
        console.log('"结构组件"菜单权限已存在，跳过');
      }

      // 提交事务
      await transaction.commit();
      console.log('\n=== 菜单添加完成 ===');
      console.log('✓ 已添加"二次开发"顶级菜单');
      console.log('✓ 已添加"结构组件"子菜单');
      console.log('✓ 已为系统管理员角色分配相应权限');

      // 验证结果
      console.log('\n=== 验证结果 ===');
      const verifyResult = await pool.request().query(`
        SELECT 
          m.ID,
          m.ParentID,
          m.MenuCode,
          m.MenuName,
          m.Icon,
          m.Path,
          m.Component,
          m.Permission,
          m.SortOrder,
          CASE WHEN m.ParentID IS NULL THEN N'顶级菜单' ELSE N'子菜单' END AS MenuLevel
        FROM [dbo].[Menus] m
        WHERE m.MenuCode IN ('development', 'structure-components')
        ORDER BY m.ParentID, m.SortOrder
      `);

      console.table(verifyResult.recordset);

    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('添加菜单失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行脚本
if (require.main === module) {
  addDevelopmentMenus();
}

module.exports = { addDevelopmentMenus };