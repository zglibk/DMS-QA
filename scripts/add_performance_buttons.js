const { sql, getDynamicConfig } = require('../server/db');

async function run() {
    try {
        console.log("Connecting to DB...");
        const pool = await sql.connect(await getDynamicConfig());
        
        // 1. Find parent menu '性能实验报告'
        console.log("Finding parent menu...");
        const parentRes = await pool.request()
            .query("SELECT ID, MenuType FROM Menus WHERE MenuName = '性能实验报告' OR MenuName = 'Performance Test Report'");
            
        if (parentRes.recordset.length === 0) {
            console.log("Parent menu '性能实验报告' not found!");
            
            // Try to find '检验报告' -> '性能实验报告' structure?
            // Maybe name is slightly different?
            // User screenshot says "性能实验报告".
            process.exit(1);
        }
        const parentId = parentRes.recordset[0].ID;
        console.log("Found Parent ID:", parentId);

        // 2. Check existing children to see MenuType format
        const childrenRes = await pool.request()
            .input('ParentID', sql.Int, parentId)
            .query("SELECT Top 1 MenuName, MenuType FROM Menus WHERE ParentID = @ParentID");
            
        let buttonType = 'Button'; // Default
        if (childrenRes.recordset.length > 0) {
            console.log("Existing child example:", childrenRes.recordset[0]);
            // If existing child is '实验项目配置', check its type.
            // Screenshot shows it as "按钮".
            // If DB has 'Button', great. If '2', use 2.
            const type = childrenRes.recordset[0].MenuType;
            if (type !== 'Menu' && type !== 'Directory') {
                 buttonType = type;
            }
        }
        console.log("Using Button Type:", buttonType);

        // 3. Insert missing buttons
        const buttons = [
            { name: '查询', code: 'quality:performance:query', sort: 0 },
            { name: '新增', code: 'quality:performance:add', sort: 1 },
            { name: '修改', code: 'quality:performance:edit', sort: 2 },
            { name: '删除', code: 'quality:performance:delete', sort: 3 },
            { name: '审核', code: 'quality:performance:audit', sort: 4 },
            { name: '导出', code: 'quality:performance:export', sort: 5 }
        ];

        for (const btn of buttons) {
            // Check if exists (by Name or Code)
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
