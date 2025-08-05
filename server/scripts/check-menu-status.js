const sql = require('mssql');
const { getDynamicConfig } = require('../db');

async function checkMenuStatus() {
    try {
        const config = await getDynamicConfig();
        const pool = await sql.connect(config);
        
        const result = await pool.request()
            .query(`SELECT ID, MenuCode, MenuName, Status, Visible FROM [dbo].[Menus] WHERE MenuCode = 'work-plan' OR ParentID IN (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'work-plan') ORDER BY SortOrder`);
        
        console.log('工作计划菜单状态:');
        console.table(result.recordset.map(r => ({
            ID: r.ID,
            MenuCode: r.MenuCode,
            MenuName: r.MenuName,
            Status: r.Status,
            Visible: r.Visible
        })));
        
        // 检查是否有状态为false的菜单
        const disabledMenus = result.recordset.filter(r => !r.Status);
        if (disabledMenus.length > 0) {
            console.log('\n发现禁用的菜单，正在启用...');
            for (const menu of disabledMenus) {
                await pool.request()
                    .input('id', sql.Int, menu.ID)
                    .query('UPDATE [dbo].[Menus] SET Status = 1 WHERE ID = @id');
                console.log(`✅ 已启用菜单: ${menu.MenuName}`);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('查询失败:', error.message);
        process.exit(1);
    }
}

checkMenuStatus();