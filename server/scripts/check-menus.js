const sql = require('mssql');
const { getDynamicConfig } = require('../db');

async function checkMenus() {
    try {
        const config = await getDynamicConfig();
        const pool = await sql.connect(config);
        
        const result = await pool.request()
            .query(`SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'work-plan' OR ParentID IN (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'work-plan') ORDER BY SortOrder`);
        
        console.log('数据库中的工作计划菜单:');
        console.table(result.recordset.map(r => ({
            ID: r.ID,
            MenuCode: r.MenuCode,
            MenuName: r.MenuName,
            ParentID: r.ParentID,
            Path: r.Path,
            Status: r.Status,
            Visible: r.Visible
        })));
        
        process.exit(0);
    } catch (error) {
        console.error('查询失败:', error.message);
        process.exit(1);
    }
}

checkMenus();