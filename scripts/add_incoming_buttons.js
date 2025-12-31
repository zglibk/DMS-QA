const { sql, getDynamicConfig } = require('../server/db');

async function run() {
    try {
        console.log("Connecting to DB...");
        const pool = await sql.connect(await getDynamicConfig());
        
        // 1. Find parent menu '来料检验报告'
        console.log("Finding parent menu...");
        const parentRes = await pool.request()
            .query("SELECT ID, MenuType FROM Menus WHERE MenuName = '来料检验报告'");
            
        if (parentRes.recordset.length === 0) {
            console.log("Parent menu '来料检验报告' not found!");
            process.exit(1);
        }
        const parentId = parentRes.recordset[0].ID;
        console.log("Found Parent ID:", parentId);

        // 2. Determine Button Type (same logic as before)
        const childrenRes = await pool.request()
            .input('ParentID', sql.Int, parentId)
            .query("SELECT Top 1 MenuName, MenuType FROM Menus WHERE ParentID = @ParentID");
            
        let buttonType = 'Button'; 
        if (childrenRes.recordset.length > 0) {
            const type = childrenRes.recordset[0].MenuType;
            if (type !== 'Menu' && type !== 'Directory') {
                 buttonType = type;
            }
        }
        console.log("Using Button Type:", buttonType);

        // 3. Insert missing buttons
        const buttons = [
            { name: '查询', code: 'quality:incoming:query', sort: 0 },
            { name: '新增', code: 'quality:incoming:add', sort: 1 },
            { name: '修改', code: 'quality:incoming:edit', sort: 2 },
            { name: '删除', code: 'quality:incoming:delete', sort: 3 },
            { name: '审核', code: 'quality:incoming:audit', sort: 4 },
            { name: '打印', code: 'quality:incoming:print', sort: 5 },
            { name: '导出', code: 'quality:incoming:export', sort: 6 }
        ];

        for (const btn of buttons) {
            // Check if exists
            const check = await pool.request()
                .input('ParentID', sql.Int, parentId)
                .input('MenuName', sql.NVarChar, btn.name)
                .query("SELECT ID FROM Menus WHERE ParentID = @ParentID AND MenuName = @MenuName");
            
            if (check.recordset.length === 0) {
                await pool.request()
                    .input('ParentID', sql.Int, parentId)
                    .input('MenuName', sql.NVarChar, btn.name)
                    .input('MenuCode', sql.NVarChar, btn.code)
                    .input('Permission', sql.NVarChar, btn.code)
                    .input('MenuType', sql.NVarChar, buttonType)
                    .input('SortOrder', sql.Int, btn.sort)
                    .input('Status', sql.Int, 1)
                    .query(`
                        INSERT INTO Menus (ParentID, MenuName, MenuCode, Permission, MenuType, SortOrder, Status, CreatedAt, Path, Component)
                        VALUES (@ParentID, @MenuName, @MenuCode, @Permission, @MenuType, @SortOrder, @Status, GETDATE(), '', '')
                    `);
                console.log(`Added button: ${btn.name}`);
            } else {
                console.log(`Skipped button: ${btn.name} (already exists)`);
            }
        }
        
        console.log("Done! Please refresh the permission assignment page.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
