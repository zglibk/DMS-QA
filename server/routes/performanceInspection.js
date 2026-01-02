const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sql, executeQuery } = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// --- Upload Config ---
const uploadDir = path.join(__dirname, '../uploads/inspection/performance');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        let originalName = file.originalname;
        try {
            originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        } catch (e) {}
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(originalName);
        cb(null, `perf-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ storage: storage });

router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const fileUrl = `/uploads/inspection/performance/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
});

// --- API Endpoints ---

// List Reports
router.get('/list', authenticateToken, async (req, res) => {
    try {
        const { page = 1, pageSize = 20, keyword, startDate, endDate, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        
        const result = await executeQuery(async (pool) => {
            let whereClause = "WHERE 1=1";
            const inputs = {};
            
            if (keyword) {
                whereClause += " AND (r.ReportNo LIKE @Keyword OR r.SampleName LIKE @Keyword)";
                inputs.Keyword = { type: sql.NVarChar, value: `%${keyword}%` };
            }
            if (startDate) {
                whereClause += " AND r.TestDate >= @StartDate";
                inputs.StartDate = { type: sql.DateTime, value: startDate };
            }
            if (endDate) {
                whereClause += " AND r.TestDate <= @EndDate";
                inputs.EndDate = { type: sql.DateTime, value: endDate };
            }
            if (status) {
                whereClause += " AND r.Status = @Status";
                inputs.Status = { type: sql.NVarChar, value: status };
            }

            // Use CTE for SQL 2008 pagination
            const query = `
                WITH PagedCTE AS (
                    SELECT 
                        r.*,
                        u.RealName as CreatorName,
                        ROW_NUMBER() OVER (ORDER BY r.CreatedAt DESC) AS RowNum
                    FROM PerformanceReports r
                    LEFT JOIN [User] u ON r.CreatedBy = u.Username
                    ${whereClause}
                )
                SELECT 
                    *, 
                    (SELECT COUNT(*) FROM PerformanceReports r ${whereClause}) as TotalCount
                FROM PagedCTE
                WHERE RowNum > @Offset AND RowNum <= @Offset + @PageSize
            `;

            const request = pool.request();
            for (const key in inputs) {
                request.input(key, inputs[key].type, inputs[key].value);
            }
            request.input('Offset', sql.Int, offset);
            request.input('PageSize', sql.Int, parseInt(pageSize));
            
            return await request.query(query);
        });
        
        res.json({ success: true, data: result.recordset, total: result.recordset.length > 0 ? result.recordset[0].TotalCount : 0 });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Fetch failed' });
    }
});

// Helper: Get Instruments
router.get('/instruments', authenticateToken, async (req, res) => {
    try {
        const result = await executeQuery(async (pool) => {
            // Use simple query without status check if unsure about column
            return await pool.request().query('SELECT ID, InstrumentName, ManagementCode FROM Instruments');
        });
        res.json({ success: true, data: result.recordset });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Fetch instruments failed' });
    }
});

// Helper: Get Inspection Items (for auto-fill)
router.get('/inspection-items', authenticateToken, async (req, res) => {
    try {
        const result = await executeQuery(async (pool) => {
            return await pool.request().query('SELECT ItemName, InspectionStandard, InspectionBasis FROM InspectionItems');
        });
        res.json({ success: true, data: result.recordset });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Fetch inspection items failed' });
    }
});

// --- Configs API --- (Moved BEFORE /:id)

// Get Enabled Configs (Public/User)
router.get('/configs', authenticateToken, async (req, res) => {
    try {
        const result = await executeQuery(async (pool) => {
            return await pool.request().query("SELECT * FROM PerformanceItemConfigs WHERE IsEnabled = 1 AND ItemCode != 'ReportHeader' ORDER BY SortOrder");
        });
        res.json({ success: true, data: result.recordset });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Fetch configs failed' });
    }
});

// Get All Configs (Admin)
router.get('/configs/all', authenticateToken, async (req, res) => {
    try {
        const result = await executeQuery(async (pool) => {
            return await pool.request().query('SELECT * FROM PerformanceItemConfigs ORDER BY SortOrder');
        });
        res.json({ success: true, data: result.recordset });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Fetch all configs failed' });
    }
});

// Add Config
router.post('/configs', authenticateToken, async (req, res) => {
    try {
        const { ItemName, ItemCode, ComponentType, SortOrder, IsEnabled, Description, FormConfig } = req.body;
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ItemName', sql.NVarChar, ItemName)
                .input('ItemCode', sql.NVarChar, ItemCode)
                .input('ComponentType', sql.NVarChar, ComponentType)
                .input('SortOrder', sql.Int, SortOrder || 0)
                .input('IsEnabled', sql.Bit, IsEnabled !== undefined ? IsEnabled : 1)
                .input('Description', sql.NVarChar, Description)
                .input('FormConfig', sql.NVarChar, FormConfig ? JSON.stringify(FormConfig) : null)
                .input('CreatedBy', sql.NVarChar, req.user.username)
                .query(`
                    INSERT INTO PerformanceItemConfigs (ItemName, ItemCode, ComponentType, SortOrder, IsEnabled, Description, FormConfig, CreatedBy)
                    VALUES (@ItemName, @ItemCode, @ComponentType, @SortOrder, @IsEnabled, @Description, @FormConfig, @CreatedBy)
                `);
        });
        res.json({ success: true, message: 'Config added' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Add config failed' });
    }
});

// Update Config
router.put('/configs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { ItemName, ItemCode, ComponentType, SortOrder, IsEnabled, Description, FormConfig } = req.body;
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .input('ItemName', sql.NVarChar, ItemName)
                .input('ItemCode', sql.NVarChar, ItemCode)
                .input('ComponentType', sql.NVarChar, ComponentType)
                .input('SortOrder', sql.Int, SortOrder)
                .input('IsEnabled', sql.Bit, IsEnabled)
                .input('Description', sql.NVarChar, Description)
                .input('FormConfig', sql.NVarChar, FormConfig ? JSON.stringify(FormConfig) : null)
                .input('UpdatedBy', sql.NVarChar, req.user.username)
                .query(`
                    UPDATE PerformanceItemConfigs SET 
                    ItemName=@ItemName, ItemCode=@ItemCode, ComponentType=@ComponentType, 
                    SortOrder=@SortOrder, IsEnabled=@IsEnabled, Description=@Description,
                    FormConfig=@FormConfig,
                    UpdatedBy=@UpdatedBy, UpdatedAt=GETDATE()
                    WHERE ID=@ID
                `);
        });
        res.json({ success: true, message: 'Config updated' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Update config failed' });
    }
});

// Delete Config
router.delete('/configs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .query('DELETE FROM PerformanceItemConfigs WHERE ID = @ID');
        });
        res.json({ success: true, message: 'Config deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Delete config failed' });
    }
});

// Get Detail
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await executeQuery(async (pool) => {
            const report = await pool.request()
                .input('ID', sql.Int, id)
                .query(`
                    SELECT r.*, 
                           u1.RealName as CreatorName, 
                           u2.RealName as AuditorName 
                    FROM PerformanceReports r
                    LEFT JOIN [User] u1 ON r.CreatedBy = u1.Username
                    LEFT JOIN [User] u2 ON r.AuditedBy = u2.Username
                    WHERE r.ID = @ID
                `);
            
            const items = await pool.request()
                .input('ReportID', sql.Int, id)
                .query(`
                    SELECT i.*, inst.InstrumentName, inst.ManagementCode 
                    FROM PerformanceReportItems i
                    LEFT JOIN Instruments inst ON i.InstrumentID = inst.ID
                    WHERE i.ReportID = @ReportID
                    ORDER BY i.ID ASC
                `);
                
            return { report: report.recordset[0], items: items.recordset };
        });
        
        if (!result.report) return res.status(404).json({ success: false, message: 'Not found' });
        
        // Parse JSON fields in items
        result.items.forEach(item => {
            try { item.Conditions = JSON.parse(item.Conditions || '{}'); } catch(e) {}
            try { item.ResultData = JSON.parse(item.ResultData || '{}'); } catch(e) {}
            try { item.Images = JSON.parse(item.Images || '[]'); } catch(e) {}
        });
        
        res.json({ success: true, data: { ...result.report, items: result.items } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Fetch detail failed' });
    }
});

// Create Recheck Report
router.post('/:id/recheck', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user.username;

        let newId = null;
        let finalReportNo = '';

        await executeQuery(async (pool) => {
            // 1. Get Original Report
            const originResult = await pool.request()
                .input('ID', sql.Int, id)
                .query('SELECT * FROM PerformanceReports WHERE ID = @ID');
            
            if (originResult.recordset.length === 0) {
                throw new Error('Original report not found');
            }
            const originReport = originResult.recordset[0];

            // 2. Determine Base Report No
            // Check if origin is already a recheck
            const recheckMatch = originReport.ReportNo.match(/^(.*)-R(\d+)$/);
            let baseReportNo = originReport.ReportNo;
            if (recheckMatch) {
                baseReportNo = recheckMatch[1];
            }

            // 3. Generate New Report No
            const prefix = `${baseReportNo}-R`;
            const countResult = await pool.request()
                .input('Prefix', sql.NVarChar, `${prefix}%`)
                .query(`
                    SELECT MAX(ReportNo) as MaxNo 
                    FROM PerformanceReports 
                    WHERE ReportNo LIKE @Prefix + '%'
                `);
            
            let nextSeq = 1;
            if (countResult.recordset[0].MaxNo) {
                const parts = countResult.recordset[0].MaxNo.split('-R');
                const lastSeq = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastSeq)) {
                    nextSeq = lastSeq + 1;
                }
            }
            finalReportNo = `${prefix}${nextSeq}`;

            // 4. Insert New Report
            // Copy fields from originReport, but reset Status, Dates, Creator
            const insertResult = await pool.request()
                .input('ReportNo', sql.NVarChar, finalReportNo)
                .input('TestDate', sql.DateTime, new Date()) // Reset test date to now
                .input('CustomerCode', sql.NVarChar, originReport.CustomerCode)
                .input('SampleName', sql.NVarChar, originReport.SampleName)
                .input('SampleModel', sql.NVarChar, originReport.SampleModel)
                .input('BatchNo', sql.NVarChar, originReport.BatchNo)
                .input('Supplier', sql.NVarChar, originReport.Supplier)
                .input('Specification', sql.NVarChar, originReport.Specification)
                .input('CreatedBy', sql.NVarChar, currentUser)
                .query(`
                    INSERT INTO PerformanceReports (
                        ReportNo, TestDate, CustomerCode, SampleName, SampleModel, 
                        BatchNo, Supplier, Specification, CreatedBy, Status
                    )
                    OUTPUT INSERTED.ID
                    VALUES (
                        @ReportNo, @TestDate, @CustomerCode, @SampleName, @SampleModel, 
                        @BatchNo, @Supplier, @Specification, @CreatedBy, 'Draft'
                    )
                `);
            newId = insertResult.recordset[0].ID;

            // 5. Copy Items
            const itemsResult = await pool.request()
                .input('OriginID', sql.Int, id)
                .query('SELECT * FROM PerformanceReportItems WHERE ReportID = @OriginID');
            
            const items = itemsResult.recordset;
            if (items.length > 0) {
                const transaction = new sql.Transaction(pool);
                await transaction.begin();
                try {
                    for (const item of items) {
                        const req = transaction.request();
                        req.input('ReportID', sql.Int, newId)
                           .input('TestType', sql.NVarChar, item.TestType)
                           .input('InstrumentID', sql.Int, item.InstrumentID)
                           .input('Standard', sql.NVarChar, item.Standard)
                           .input('Method', sql.NVarChar, item.Method)
                           .input('Conditions', sql.NVarChar, item.Conditions) // Keep conditions
                           .input('ResultData', sql.NVarChar, '{}') // Clear data
                           .input('Conclusion', sql.NVarChar, null) // Clear conclusion
                           .input('Images', sql.NVarChar, '[]'); // Clear images
                        
                        await req.query(`
                            INSERT INTO PerformanceReportItems (
                                ReportID, TestType, InstrumentID, Standard, Method, 
                                Conditions, ResultData, Conclusion, Images
                            )
                            VALUES (
                                @ReportID, @TestType, @InstrumentID, @Standard, @Method, 
                                @Conditions, @ResultData, @Conclusion, @Images
                            )
                        `);
                    }
                    await transaction.commit();
                } catch (err) {
                    await transaction.rollback();
                    throw err;
                }
            }
        });

        res.json({ success: true, message: 'Recheck report created', id: newId, reportNo: finalReportNo });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Create recheck failed: ' + e.message });
    }
});

// Create Report
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            ReportNo, TestDate, CustomerCode, SampleName, SampleModel, 
            BatchNo, Supplier, Specification,
            ReportType, OriginalReportNo // Optional fields for recheck logic
        } = req.body;
        
        let newId = null;
        let finalReportNo = ReportNo;

        await executeQuery(async (pool) => {
            // Auto-generate ReportNo if not provided
            if (!finalReportNo) {
                // --- Recheck Number Rule ---
                // If it is a recheck report (ReportType='Recheck' and OriginalReportNo provided)
                // Rule: OriginalReportNo + "-R" + Sequence (e.g., TJ-PERF2501001-R1)
                if (ReportType === 'Recheck' && OriginalReportNo) {
                    const recheckPrefix = `${OriginalReportNo}-R`;
                    const recheckResult = await pool.request()
                        .input('Prefix', sql.NVarChar, `${recheckPrefix}%`)
                        .query(`
                            SELECT MAX(ReportNo) as MaxNo 
                            FROM PerformanceReports 
                            WHERE ReportNo LIKE @Prefix
                        `);
                    
                    let nextRSeq = 1;
                    if (recheckResult.recordset[0].MaxNo) {
                        const parts = recheckResult.recordset[0].MaxNo.split('-R');
                        const lastRSeq = parseInt(parts[parts.length - 1]);
                        if (!isNaN(lastRSeq)) {
                            nextRSeq = lastRSeq + 1;
                        }
                    }
                    finalReportNo = `${OriginalReportNo}-R${nextRSeq}`;
                } else {
                    // --- Main Number Rule ---
                    // Rule: "TJ" + "-PERF" + YYMM + "000" (Sequence)
                    // Example: TJ-PERF2501001
                    const now = new Date();
                    const year = String(now.getFullYear()).slice(-2); // YY (e.g., 25)
                    const month = String(now.getMonth() + 1).padStart(2, '0'); // MM (e.g., 01)
                    const prefix = `TJ-PERF${year}${month}`;

                    // Find max existing number for current month to increment
                    // Filter specifically for the standard format to avoid confusion with other formats
                    const countResult = await pool.request()
                        .input('Prefix', sql.NVarChar, `${prefix}%`)
                        .query(`
                            SELECT MAX(ReportNo) as MaxNo 
                            FROM PerformanceReports 
                            WHERE ReportNo LIKE @Prefix + '[0-9][0-9][0-9]' 
                            AND ReportNo NOT LIKE '%-R%' -- Exclude recheck reports just in case
                        `);
                    
                    let nextSeq = 1;
                    if (countResult.recordset[0].MaxNo) {
                        // Extract the last 3 digits
                        const lastSeqStr = countResult.recordset[0].MaxNo.replace(prefix, '');
                        const lastSeq = parseInt(lastSeqStr);
                        if (!isNaN(lastSeq)) {
                            nextSeq = lastSeq + 1;
                        }
                    }
                    
                    finalReportNo = `${prefix}${String(nextSeq).padStart(3, '0')}`;
                }
            }

            const result = await pool.request()
                .input('ReportNo', sql.NVarChar, finalReportNo)
                .input('TestDate', sql.DateTime, TestDate || new Date())
                .input('CustomerCode', sql.NVarChar, CustomerCode)
                .input('SampleName', sql.NVarChar, SampleName)
                .input('SampleModel', sql.NVarChar, SampleModel)
                .input('BatchNo', sql.NVarChar, BatchNo)
                .input('Supplier', sql.NVarChar, Supplier)
                .input('Specification', sql.NVarChar, Specification)
                .input('CreatedBy', sql.NVarChar, req.user.username)
                .query(`
                    INSERT INTO PerformanceReports (ReportNo, TestDate, CustomerCode, SampleName, SampleModel, BatchNo, Supplier, Specification, CreatedBy)
                    OUTPUT INSERTED.ID
                    VALUES (@ReportNo, @TestDate, @CustomerCode, @SampleName, @SampleModel, @BatchNo, @Supplier, @Specification, @CreatedBy)
                `);
            newId = result.recordset[0].ID;
        });
        
        res.json({ success: true, message: 'Created successfully', reportNo: finalReportNo, id: newId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Create failed' });
    }
});

// Update Report Basic Info
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const allowedFields = ['TestDate', 'CustomerCode', 'SampleName', 'SampleModel', 'BatchNo', 'Supplier', 'Specification', 'Status', 'AuditedBy', 'AuditDate'];
        
        await executeQuery(async (pool) => {
            const request = pool.request().input('ID', sql.Int, id);
            
            let setClauses = [];
            
            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    setClauses.push(`${field}=@${field}`);
                    if (field === 'TestDate') {
                        request.input(field, sql.DateTime, updates[field]);
                    } else {
                        request.input(field, sql.NVarChar, updates[field]);
                    }
                } else if (field === 'AuditedBy' && updates['Auditor'] !== undefined) {
                    // Compatibility for Auditor -> AuditedBy
                    setClauses.push(`AuditedBy=@AuditedBy`);
                    request.input('AuditedBy', sql.NVarChar, updates['Auditor']);
                }
            });
            
            setClauses.push('UpdatedAt=@UpdatedAt');
            request.input('UpdatedAt', sql.DateTime, new Date());
            
            if (setClauses.length === 1) { // Only UpdatedAt
                return; // Nothing to update
            }
            
            const query = `UPDATE PerformanceReports SET ${setClauses.join(', ')} WHERE ID=@ID`;
            
            await request.query(query);
        });
        
        res.json({ success: true, message: 'Updated successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});

// Delete Report
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        // Check permission
        const checkResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('ID', sql.Int, id)
                .query('SELECT CreatedBy FROM PerformanceReports WHERE ID = @ID');
        });

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        const report = checkResult.recordset[0];
        const isCreator = report.CreatedBy === currentUser.username;
        const userIsAdmin = isAdmin(currentUser);

        if (!isCreator && !userIsAdmin) {
            return res.status(403).json({ success: false, message: 'Permission denied' });
        }

        await executeQuery(async (pool) => {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                const request = transaction.request();
                request.input('ID', sql.Int, id);
                
                // Delete items first
                await request.query('DELETE FROM PerformanceReportItems WHERE ReportID = @ID');
                // Delete report
                await request.query('DELETE FROM PerformanceReports WHERE ID = @ID');
                
                await transaction.commit();
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
});

// Add Item
router.post('/item', authenticateToken, async (req, res) => {
    try {
        const { ReportID, TestType, InstrumentID, Standard, Method, Conditions, ResultData, Conclusion, Images } = req.body;
        
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ReportID', sql.Int, ReportID)
                .input('TestType', sql.NVarChar, TestType)
                .input('InstrumentID', sql.Int, InstrumentID)
                .input('Standard', sql.NVarChar, Standard)
                .input('Method', sql.NVarChar, Method)
                .input('Conditions', sql.NVarChar, JSON.stringify(Conditions || {}))
                .input('ResultData', sql.NVarChar, JSON.stringify(ResultData || {}))
                .input('Conclusion', sql.NVarChar, Conclusion)
                .input('Images', sql.NVarChar, JSON.stringify(Images || []))
                .query(`
                    INSERT INTO PerformanceReportItems (ReportID, TestType, InstrumentID, Standard, Method, Conditions, ResultData, Conclusion, Images)
                    VALUES (@ReportID, @TestType, @InstrumentID, @Standard, @Method, @Conditions, @ResultData, @Conclusion, @Images)
                `);
        });
        
        res.json({ success: true, message: 'Item added' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Add item failed' });
    }
});

// Update Item
router.put('/item/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { InstrumentID, Standard, Method, Conditions, ResultData, Conclusion, Images } = req.body;
        
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .input('InstrumentID', sql.Int, InstrumentID)
                .input('Standard', sql.NVarChar, Standard)
                .input('Method', sql.NVarChar, Method)
                .input('Conditions', sql.NVarChar, JSON.stringify(Conditions || {}))
                .input('ResultData', sql.NVarChar, JSON.stringify(ResultData || {}))
                .input('Conclusion', sql.NVarChar, Conclusion)
                .input('Images', sql.NVarChar, JSON.stringify(Images || []))
                .query(`
                    UPDATE PerformanceReportItems SET 
                    InstrumentID=@InstrumentID, Standard=@Standard, Method=@Method, 
                    Conditions=@Conditions, ResultData=@ResultData, Conclusion=@Conclusion, 
                    Images=@Images
                    WHERE ID=@ID
                `);
        });
        
        res.json({ success: true, message: 'Item updated' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Update item failed' });
    }
});

// Delete Item
router.delete('/item/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .query('DELETE FROM PerformanceReportItems WHERE ID = @ID');
        });
        res.json({ success: true, message: 'Item deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Delete item failed' });
    }
});

module.exports = router;