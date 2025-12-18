const sql = require('mssql');
const { getConnection } = require('../db');

async function updateShipmentMenu() {
  let pool;
  let transaction;

  try {
    console.log('开始更新出货检验报告菜单结构...');
    
    // 1. 获取数据库连接
    pool = await getConnection();
    
    // 2. 开始事务
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 3. 检查或创建"检验报告"一级菜单
      console.log('检查"检验报告"一级菜单...');
      let inspectionReportMenuId;
      
      const inspectionMenuResult = await transaction.request()
        .input('menuCode', sql.NVarChar(50), 'inspection-report')
        .query('SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @menuCode');

      if (inspectionMenuResult.recordset.length > 0) {
        inspectionReportMenuId = inspectionMenuResult.recordset[0].ID;
        console.log(`"检验报告"菜单已存在，ID: ${inspectionReportMenuId}`);
      } else {
        // 创建新菜单
        console.log('创建"检验报告"菜单...');
        const insertResult = await transaction.request()
          .input('menuCode', sql.NVarChar(50), 'inspection-report')
          .input('menuName', sql.NVarChar(50), '检验报告')
          .input('menuType', sql.NVarChar(20), 'menu') // 这里应该是一级菜单，通常也是menu或者catalog，看项目习惯，参考DynamicMenu里是menu
          .input('icon', sql.NVarChar(50), 'DocumentChecked')
          .input('path', sql.NVarChar(200), '') // 一级菜单通常没有路径或者为 layout
          .input('component', sql.NVarChar(200), 'Layout') // 假设使用Layout组件
          .input('permission', sql.NVarChar(100), 'inspection:view')
          .input('sortOrder', sql.Int, 95) // 放在较后的位置
          .input('visible', sql.Bit, 1)
          .input('status', sql.Bit, 1)
          .input('description', sql.NVarChar(200), '检验报告管理')
          .query(`
            INSERT INTO [dbo].[Menus] 
            ([ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], [Component], [Permission], [SortOrder], [Visible], [Status], [Description], [CreatedAt], [UpdatedAt])
            OUTPUT INSERTED.ID
            VALUES 
            (NULL, @menuCode, @menuName, @menuType, @icon, @path, @component, @permission, @sortOrder, @visible, @status, @description, GETDATE(), GETDATE())
          `);
        
        inspectionReportMenuId = insertResult.recordset[0].ID;
        console.log(`"检验报告"菜单创建成功，ID: ${inspectionReportMenuId}`);
      }

      // 4. 查找并更新"出货检验报告"菜单
      console.log('查找"出货检验报告"菜单...');
      
      // 先尝试通过 MenuCode 查找
      let shipmentMenuResult = await transaction.request()
        .input('menuCode', sql.NVarChar(50), 'shipment-report')
        .query('SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @menuCode');
      
      // 如果没找到，尝试通过 Name 查找（因为旧数据可能没有规范的 Code）
      if (shipmentMenuResult.recordset.length === 0) {
         shipmentMenuResult = await transaction.request()
          .input('menuName', sql.NVarChar(50), '出货检验报告')
          .query('SELECT ID FROM [dbo].[Menus] WHERE MenuName = @menuName');
      }

      let shipmentReportMenuId;

      if (shipmentMenuResult.recordset.length > 0) {
        shipmentReportMenuId = shipmentMenuResult.recordset[0].ID;
        console.log(`找到"出货检验报告"菜单，ID: ${shipmentReportMenuId}，正在更新父级ID...`);
        
        // 更新 ParentID
        await transaction.request()
          .input('id', sql.Int, shipmentReportMenuId)
          .input('parentId', sql.Int, inspectionReportMenuId)
          .input('menuCode', sql.NVarChar(50), 'shipment-report') // 确保Code正确
          .input('path', sql.NVarChar(200), '/admin/shipment-report') // 确保Path正确
          .query(`
            UPDATE [dbo].[Menus]
            SET [ParentID] = @parentId,
                [MenuCode] = @menuCode,
                [Path] = @path,
                [UpdatedAt] = GETDATE()
            WHERE [ID] = @id
          `);
        console.log('菜单父级更新成功');
      } else {
        console.log('"出货检验报告"菜单不存在，正在创建...');
        const insertShipmentResult = await transaction.request()
          .input('parentId', sql.Int, inspectionReportMenuId)
          .input('menuCode', sql.NVarChar(50), 'shipment-report')
          .input('menuName', sql.NVarChar(50), '出货检验报告')
          .input('menuType', sql.NVarChar(20), 'menu')
          .input('icon', sql.NVarChar(50), 'Document')
          .input('path', sql.NVarChar(200), '/admin/shipment-report')
          .input('component', sql.NVarChar(200), 'ShipmentReport') // 组件路径
          .input('permission', sql.NVarChar(100), 'shipment:report:view')
          .input('sortOrder', sql.Int, 10)
          .input('visible', sql.Bit, 1)
          .input('status', sql.Bit, 1)
          .input('description', sql.NVarChar(200), '出货检验报告查询与生成')
          .query(`
            INSERT INTO [dbo].[Menus] 
            ([ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], [Component], [Permission], [SortOrder], [Visible], [Status], [Description], [CreatedAt], [UpdatedAt])
            OUTPUT INSERTED.ID
            VALUES 
            (@parentId, @menuCode, @menuName, @menuType, @icon, @path, @component, @permission, @sortOrder, @visible, @status, @description, GETDATE(), GETDATE())
          `);
          
        shipmentReportMenuId = insertShipmentResult.recordset[0].ID;
        console.log(`"出货检验报告"菜单创建成功，ID: ${shipmentReportMenuId}`);
      }

      // 5. 确保管理员角色拥有这两个菜单的权限
      console.log('更新管理员权限...');
      const adminRoleResult = await transaction.request()
        .input('roleCode', sql.NVarChar(20), 'admin')
        .query('SELECT ID FROM [dbo].[Roles] WHERE RoleCode = @roleCode');

      if (adminRoleResult.recordset.length > 0) {
        const adminRoleId = adminRoleResult.recordset[0].ID;
        
        // 检查并添加一级菜单权限
        const checkInspectionPerm = await transaction.request()
          .input('roleId', sql.Int, adminRoleId)
          .input('menuId', sql.Int, inspectionReportMenuId)
          .query('SELECT COUNT(*) as count FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');
          
        if (checkInspectionPerm.recordset[0].count === 0) {
          await transaction.request()
            .input('roleId', sql.Int, adminRoleId)
            .input('menuId', sql.Int, inspectionReportMenuId)
            .query('INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) VALUES (@roleId, @menuId, GETDATE())');
          console.log('管理员"检验报告"权限添加成功');
        }

        // 检查并添加二级菜单权限
        const checkShipmentPerm = await transaction.request()
          .input('roleId', sql.Int, adminRoleId)
          .input('menuId', sql.Int, shipmentReportMenuId)
          .query('SELECT COUNT(*) as count FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');
          
        if (checkShipmentPerm.recordset[0].count === 0) {
          await transaction.request()
            .input('roleId', sql.Int, adminRoleId)
            .input('menuId', sql.Int, shipmentReportMenuId)
            .query('INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) VALUES (@roleId, @menuId, GETDATE())');
          console.log('管理员"出货检验报告"权限添加成功');
        }
      }

      await transaction.commit();
      console.log('所有操作执行成功！');

    } catch (err) {
      console.error('事务执行出错，正在回滚...', err);
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error('脚本执行失败:', err);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

updateShipmentMenu();
