const { sql, executeQuery } = require('../db');

async function run() {
    try {
        await executeQuery(async (pool) => {
            // 1. Find Parent: Performance Inspection Menu
            // If not found, create it (assuming it exists, but let's be safe)
            // Typically 'quality:performance:list' is the page permission
            // We need to find the Menu ID for the Performance Report Page
            
            let parentId;
            const parentRes = await pool.request()
                .query("SELECT ID FROM Menus WHERE Permission = 'quality:performance:list'");
            
            if (parentRes.recordset.length === 0) {
                console.log('Performance Inspection Menu not found. Trying to find Quality Menu...');
                // Fallback: Find 'Quality' menu and add Performance Menu if missing (Optional, usually manual)
                // For now, assuming user has created the page menu.
                // If permission string is different, let's search by path or code
                const pathRes = await pool.request()
                    .query("SELECT ID FROM Menus WHERE Path LIKE '%/quality/performance%' OR MenuCode = 'performance-inspection'");
                if (pathRes.recordset.length > 0) {
                    parentId = pathRes.recordset[0].ID;
                } else {
                    console.error('Cannot find Performance Inspection Menu. Please ensure the page menu exists first.');
                    return;
                }
            } else {
                parentId = parentRes.recordset[0].ID;
            }
            
            console.log(`Found Parent Menu ID: ${parentId}`);

            // 2. Define Buttons to Add
            const buttons = [
                {
                    code: 'performance:add',
                    name: '新增报告',
                    perm: 'quality:performance:add',
                    sort: 1
                },
                {
                    code: 'performance:edit',
                    name: '编辑报告',
                    perm: 'quality:performance:edit',
                    sort: 2
                },
                {
                    code: 'performance:delete',
                    name: '删除报告',
                    perm: 'quality:performance:delete',
                    sort: 3
                },
                {
                    code: 'performance:audit',
                    name: '审核报告',
                    perm: 'quality:performance:audit',
                    sort: 4
                },
                {
                    code: 'performance:print',
                    name: '打印报告',
                    perm: 'quality:performance:print',
                    sort: 5
                },
                {
                    code: 'performance:config', // Existing one, ensure update if needed
                    name: '实验配置',
                    perm: 'quality:performance:config',
                    sort: 6
                }
            ];

            // 3. Insert/Update Buttons
            for (const btn of buttons) {
                // Check if exists
                const check = await pool.request()
                    .input('Permission', btn.perm)
                    .query("SELECT ID FROM Menus WHERE Permission = @Permission");
                
                if (check.recordset.length > 0) {
                    console.log(`Button ${btn.name} (${btn.perm}) already exists. Updating...`);
                    // Optional: Update parent if needed or name
                    await pool.request()
                        .input('ID', check.recordset[0].ID)
                        .input('ParentID', parentId)
                        .input('MenuName', btn.name)
                        .input('SortOrder', btn.sort)
                        .query("UPDATE Menus SET ParentID = @ParentID, MenuName = @MenuName, SortOrder = @SortOrder, MenuType='button', Visible=0 WHERE ID = @ID");
                } else {
                    console.log(`Inserting Button ${btn.name} (${btn.perm})...`);
                    const insert = await pool.request()
                        .input('ParentID', parentId)
                        .input('MenuName', btn.name)
                        .input('MenuCode', btn.code)
                        .input('Permission', btn.perm)
                        .input('SortOrder', btn.sort)
                        .query(`
                            INSERT INTO Menus (ParentID, MenuName, MenuCode, MenuType, Permission, SortOrder, Visible, Status)
                            OUTPUT INSERTED.ID
                            VALUES (@ParentID, @MenuName, @MenuCode, 'button', @Permission, @SortOrder, 0, 1)
                        `);
                    
                    const newId = insert.recordset[0].ID;
                    
                    // 4. Assign to Admin Role
                    const roleRes = await pool.request().query("SELECT ID FROM Roles WHERE RoleCode = 'admin' OR RoleName = '系统管理员'");
                    if (roleRes.recordset.length > 0) {
                        const roleId = roleRes.recordset[0].ID;
                        const mappingCheck = await pool.request()
                            .input('RoleID', roleId)
                            .input('MenuID', newId)
                            .query("SELECT * FROM RoleMenus WHERE RoleID = @RoleID AND MenuID = @MenuID");
                        
                        if (mappingCheck.recordset.length === 0) {
                            await pool.request()
                                .input('RoleID', roleId)
                                .input('MenuID', newId)
                                .query("INSERT INTO RoleMenus (RoleID, MenuID) VALUES (@RoleID, @MenuID)");
                            console.log(`-- Assigned to Admin Role ID: ${roleId}`);
                        }
                    }
                }
            }
            
            console.log('Done.');
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
