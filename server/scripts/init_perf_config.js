const { sql, executeQuery } = require('../db');

async function init() {
    try {
        console.log('Initializing PerformanceItemConfigs table...');
        
        await executeQuery(async (pool) => {
            // Check if table exists
            const checkTable = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PerformanceItemConfigs'");
            
            if (checkTable.recordset.length === 0) {
                console.log('Creating table...');
                await pool.request().query(`
                    CREATE TABLE PerformanceItemConfigs (
                        ID INT IDENTITY(1,1) PRIMARY KEY,
                        ItemName NVARCHAR(100) NOT NULL,
                        ItemCode NVARCHAR(50) NOT NULL, -- Make Code NOT unique strictly if we want multiple items to map to same code? No, Code should be unique for logic? Or maybe not. Let's allow duplicates or rely on ID. But Code is used in frontend as key. Let's keep it unique for now or just indexed.
                        ComponentType NVARCHAR(50) NOT NULL,
                        SortOrder INT DEFAULT 0,
                        IsEnabled BIT DEFAULT 1,
                        Description NVARCHAR(255),
                        CreatedBy NVARCHAR(50) DEFAULT 'system',
                        CreatedAt DATETIME DEFAULT GETDATE(),
                        UpdatedBy NVARCHAR(50),
                        UpdatedAt DATETIME DEFAULT GETDATE()
                    )
                `);
                console.log('Table created.');
            } else {
                console.log('Table already exists.');
            }
            
            // Seed data
            const configs = [
                { ItemName: '初粘性/持粘力/高低温', ItemCode: 'Adhesion', ComponentType: 'AdhesionForm', SortOrder: 1 },
                { ItemName: '剥离力/离型力', ItemCode: 'Peel', ComponentType: 'PeelForm', SortOrder: 2 },
                { ItemName: '耐磨测试', ItemCode: 'Abrasion', ComponentType: 'AbrasionForm', SortOrder: 3 },
                { ItemName: '耐醇性测试', ItemCode: 'Alcohol', ComponentType: 'AlcoholForm', SortOrder: 4 }
            ];
            
            for (const config of configs) {
                const check = await pool.request()
                    .input('ItemCode', sql.NVarChar, config.ItemCode)
                    .query("SELECT ID FROM PerformanceItemConfigs WHERE ItemCode = @ItemCode");
                
                if (check.recordset.length === 0) {
                    await pool.request()
                        .input('ItemName', sql.NVarChar, config.ItemName)
                        .input('ItemCode', sql.NVarChar, config.ItemCode)
                        .input('ComponentType', sql.NVarChar, config.ComponentType)
                        .input('SortOrder', sql.Int, config.SortOrder)
                        .query(`
                            INSERT INTO PerformanceItemConfigs (ItemName, ItemCode, ComponentType, SortOrder)
                            VALUES (@ItemName, @ItemCode, @ComponentType, @SortOrder)
                        `);
                    console.log(`Inserted ${config.ItemName}`);
                } else {
                    // Update existing to ensure ComponentType is correct?
                    // Optional.
                    console.log(`Skipped ${config.ItemName} (Exists)`);
                }
            }
        });
        
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

init();
