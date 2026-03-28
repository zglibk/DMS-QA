const { sql, executeQuery } = require('../db')

async function run() {
  try {
    await executeQuery(async (pool) => {
      const parentCandidates = await pool.request().query(`
        SELECT TOP 1 ID
        FROM Menus
        WHERE Status = 1
          AND (
            MenuCode IN ('inspection', 'inspection-report')
            OR Path = '/admin/inspection'
            OR Permission = 'inspection:report:view'
            OR MenuName = '检验报告'
          )
        ORDER BY ID ASC
      `)
      if (!parentCandidates.recordset.length) {
        throw new Error('未找到“检验报告”父级菜单，请先确认菜单基础数据')
      }
      const parentId = Number(parentCandidates.recordset[0].ID)

      const upsertMenu = async (menu) => {
        const exists = await pool.request()
          .input('MenuCode', sql.NVarChar(100), menu.MenuCode)
          .query(`SELECT ID FROM Menus WHERE MenuCode = @MenuCode`)
        if (exists.recordset.length) {
          const id = Number(exists.recordset[0].ID)
          await pool.request()
            .input('ID', sql.Int, id)
            .input('ParentID', sql.Int, menu.ParentID)
            .input('MenuName', sql.NVarChar(100), menu.MenuName)
            .input('MenuType', sql.NVarChar(20), menu.MenuType)
            .input('Icon', sql.NVarChar(100), menu.Icon)
            .input('Path', sql.NVarChar(255), menu.Path)
            .input('Component', sql.NVarChar(255), menu.Component)
            .input('Permission', sql.NVarChar(120), menu.Permission)
            .input('SortOrder', sql.Int, menu.SortOrder)
            .input('Visible', sql.Bit, menu.Visible)
            .input('Status', sql.Bit, menu.Status)
            .query(`
              UPDATE Menus
              SET ParentID=@ParentID,
                  MenuName=@MenuName,
                  MenuType=@MenuType,
                  Icon=@Icon,
                  Path=@Path,
                  Component=@Component,
                  Permission=@Permission,
                  SortOrder=@SortOrder,
                  Visible=@Visible,
                  Status=@Status
              WHERE ID=@ID
            `)
          return id
        }
        const inserted = await pool.request()
          .input('ParentID', sql.Int, menu.ParentID)
          .input('MenuName', sql.NVarChar(100), menu.MenuName)
          .input('MenuCode', sql.NVarChar(100), menu.MenuCode)
          .input('MenuType', sql.NVarChar(20), menu.MenuType)
          .input('Icon', sql.NVarChar(100), menu.Icon)
          .input('Path', sql.NVarChar(255), menu.Path)
          .input('Component', sql.NVarChar(255), menu.Component)
          .input('Permission', sql.NVarChar(120), menu.Permission)
          .input('SortOrder', sql.Int, menu.SortOrder)
          .input('Visible', sql.Bit, menu.Visible)
          .input('Status', sql.Bit, menu.Status)
          .query(`
            INSERT INTO Menus (ParentID, MenuName, MenuCode, MenuType, Icon, Path, Component, Permission, SortOrder, Visible, Status)
            OUTPUT INSERTED.ID
            VALUES (@ParentID, @MenuName, @MenuCode, @MenuType, @Icon, @Path, @Component, @Permission, @SortOrder, @Visible, @Status)
          `)
        return Number(inserted.recordset[0].ID)
      }

      const pageMenuId = await upsertMenu({
        ParentID: parentId,
        MenuName: '成品检验属性设置',
        MenuCode: 'inspection:finished-attributes',
        MenuType: 'menu',
        Icon: 'SetUp',
        Path: '/admin/inspection/finished-attributes',
        Component: 'quality/inspection/FinishedInspectionAttributeConfig',
        Permission: 'quality:finished-attributes:list',
        SortOrder: 65,
        Visible: 1,
        Status: 1
      })

      const buttons = [
        { MenuName: '类型新增', MenuCode: 'inspection:finished-attributes:type:add', Permission: 'quality:finished-attributes:type:add', SortOrder: 1 },
        { MenuName: '类型编辑', MenuCode: 'inspection:finished-attributes:type:edit', Permission: 'quality:finished-attributes:type:edit', SortOrder: 2 },
        { MenuName: '类型删除', MenuCode: 'inspection:finished-attributes:type:delete', Permission: 'quality:finished-attributes:type:delete', SortOrder: 3 },
        { MenuName: '项目新增', MenuCode: 'inspection:finished-attributes:item:add', Permission: 'quality:finished-attributes:item:add', SortOrder: 4 },
        { MenuName: '项目编辑', MenuCode: 'inspection:finished-attributes:item:edit', Permission: 'quality:finished-attributes:item:edit', SortOrder: 5 },
        { MenuName: '项目删除', MenuCode: 'inspection:finished-attributes:item:delete', Permission: 'quality:finished-attributes:item:delete', SortOrder: 6 }
      ]

      for (const btn of buttons) {
        await upsertMenu({
          ParentID: pageMenuId,
          MenuName: btn.MenuName,
          MenuCode: btn.MenuCode,
          MenuType: 'button',
          Icon: '',
          Path: '',
          Component: '',
          Permission: btn.Permission,
          SortOrder: btn.SortOrder,
          Visible: 0,
          Status: 1
        })
      }

      const adminRoles = await pool.request().query(`
        SELECT ID FROM Roles WHERE RoleName IN ('admin', '系统管理员') OR RoleCode = 'admin'
      `)
      const menuIdsResult = await pool.request().query(`
        SELECT ID
        FROM Menus
        WHERE MenuCode = 'inspection:finished-attributes'
           OR ParentID = ${pageMenuId}
      `)
      const menuIds = menuIdsResult.recordset.map(r => Number(r.ID))

      for (const role of adminRoles.recordset) {
        const roleId = Number(role.ID)
        for (const menuId of menuIds) {
          const exists = await pool.request()
            .input('RoleID', sql.Int, roleId)
            .input('MenuID', sql.Int, menuId)
            .query(`SELECT 1 FROM RoleMenus WHERE RoleID=@RoleID AND MenuID=@MenuID`)
          if (!exists.recordset.length) {
            await pool.request()
              .input('RoleID', sql.Int, roleId)
              .input('MenuID', sql.Int, menuId)
              .query(`INSERT INTO RoleMenus (RoleID, MenuID) VALUES (@RoleID, @MenuID)`)
          }
        }
      }

      console.log('成品检验属性设置菜单与按钮权限已写入/更新完成')
    })
  } catch (e) {
    console.error('执行失败:', e.message)
    process.exit(1)
  }
  process.exit(0)
}

run()
