const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { executeQuery } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Ensure tables exist
const ensureTablesExist = async () => {
    try {
        await executeQuery(async (pool) => {
            // ShipmentReports table
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ShipmentReports' AND xtype='U')
                CREATE TABLE ShipmentReports (
                    ID INT IDENTITY(1,1) PRIMARY KEY,
                    ReportNo NVARCHAR(50) NOT NULL,
                    CustomerID NVARCHAR(50),
                    PNum NVARCHAR(50),
                    OrderNum NVARCHAR(50),
                    CPO NVARCHAR(50),
                    ReportDate DATETIME,
                    ProductInfo NVARCHAR(MAX), -- JSON string for products list
                    InspectionData NVARCHAR(MAX), -- JSON string for inspection details (appearance, dimension, materials)
                    Status NVARCHAR(20) DEFAULT 'Generated',
                    CreatedBy NVARCHAR(50),
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT UK_ShipmentReports_ReportNo UNIQUE (ReportNo)
                )
            `);

            // Add InspectionData column if not exists
            await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('ShipmentReports') 
                    AND name = 'InspectionData'
                )
                ALTER TABLE ShipmentReports ADD InspectionData NVARCHAR(MAX);
            `);
        });
        console.log('ShipmentReports table checked/created');
    } catch (err) {
        console.error('Error ensuring ShipmentReports table:', err);
    }
};

// Run table check on module load
ensureTablesExist();

// Create/Save Report
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            ReportNo, CustomerID, PNum, OrderNum, CPO, 
            ReportDate, ProductInfo, InspectionData, Status 
        } = req.body;

        if (!ReportNo) {
            return res.status(400).json({ success: false, message: 'ReportNo is required' });
        }

        let newId = null;

        await executeQuery(async (pool) => {
            // Check if exists
            const check = await pool.request()
                .input('ReportNo', sql.NVarChar, ReportNo)
                .query('SELECT ID FROM ShipmentReports WHERE ReportNo = @ReportNo');
            
            if (check.recordset.length > 0) {
                // Update
                const existingId = check.recordset[0].ID;
                await pool.request()
                    .input('ID', sql.Int, existingId)
                    .input('CustomerID', sql.NVarChar, CustomerID)
                    .input('PNum', sql.NVarChar, PNum)
                    .input('OrderNum', sql.NVarChar, OrderNum)
                    .input('CPO', sql.NVarChar, CPO)
                    .input('ReportDate', sql.DateTime, ReportDate)
                    .input('ProductInfo', sql.NVarChar, typeof ProductInfo === 'object' ? JSON.stringify(ProductInfo) : ProductInfo)
                    .input('InspectionData', sql.NVarChar, typeof InspectionData === 'object' ? JSON.stringify(InspectionData) : InspectionData)
                    .input('Status', sql.NVarChar, Status || 'Generated')
                    .query(`
                        UPDATE ShipmentReports 
                        SET CustomerID = @CustomerID, PNum = @PNum, OrderNum = @OrderNum, 
                            CPO = @CPO, ReportDate = @ReportDate, ProductInfo = @ProductInfo, 
                            InspectionData = @InspectionData, Status = @Status
                        WHERE ID = @ID
                    `);
                newId = existingId;
            } else {
                // Insert
                const result = await pool.request()
                    .input('ReportNo', sql.NVarChar, ReportNo)
                    .input('CustomerID', sql.NVarChar, CustomerID)
                    .input('PNum', sql.NVarChar, PNum)
                    .input('OrderNum', sql.NVarChar, OrderNum)
                    .input('CPO', sql.NVarChar, CPO)
                    .input('ReportDate', sql.DateTime, ReportDate)
                    .input('ProductInfo', sql.NVarChar, typeof ProductInfo === 'object' ? JSON.stringify(ProductInfo) : ProductInfo)
                    .input('InspectionData', sql.NVarChar, typeof InspectionData === 'object' ? JSON.stringify(InspectionData) : InspectionData)
                    .input('Status', sql.NVarChar, Status || 'Generated')
                    .input('CreatedBy', sql.NVarChar, req.user.username)
                    .query(`
                        INSERT INTO ShipmentReports (
                            ReportNo, CustomerID, PNum, OrderNum, CPO, 
                            ReportDate, ProductInfo, InspectionData, Status, CreatedBy
                        )
                        OUTPUT INSERTED.ID
                        VALUES (
                            @ReportNo, @CustomerID, @PNum, @OrderNum, @CPO, 
                            @ReportDate, @ProductInfo, @InspectionData, @Status, @CreatedBy
                        )
                    `);
                newId = result.recordset[0].ID;
            }
        });

        res.json({ success: true, message: 'Report saved successfully', id: newId });
    } catch (e) {
        console.error('Save shipment report error:', e);
        res.status(500).json({ success: false, message: 'Failed to save report: ' + e.message });
    }
});

// Get Reports List
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, pageSize = 10, keyword } = req.query;
        const offset = (page - 1) * pageSize;

        await executeQuery(async (pool) => {
            let query = `
                SELECT r.*, u.RealName as CreatorName
                FROM ShipmentReports r
                LEFT JOIN [User] u ON r.CreatedBy = u.Username
                WHERE 1=1
            `;
            
            if (keyword) {
                query += ` AND (r.ReportNo LIKE @Keyword OR r.PNum LIKE @Keyword OR r.CPO LIKE @Keyword)`;
            }
            
            // Count
            const countReq = pool.request();
            if (keyword) countReq.input('Keyword', sql.NVarChar, `%${keyword}%`);
            const countRes = await countReq.query(query.replace('r.*, u.RealName as CreatorName', 'COUNT(*) as Total'));
            const total = countRes.recordset[0].Total;

            // Count Today's Reports
            const todayReq = pool.request();
            const todayQuery = `
                SELECT COUNT(*) as TodayCount 
                FROM ShipmentReports 
                WHERE CAST(CreatedAt AS DATE) = CAST(GETDATE() AS DATE)
            `;
            const todayRes = await todayReq.query(todayQuery);
            const todayCount = todayRes.recordset[0].TodayCount;

            // Data
            let dataQuery = `
                SELECT * FROM (
                    SELECT r.*, u.RealName as CreatorName,
                           ROW_NUMBER() OVER (ORDER BY r.CreatedAt DESC) AS RowNum
                    FROM ShipmentReports r
                    LEFT JOIN [User] u ON r.CreatedBy = u.Username
                    WHERE 1=1
            `;
            
            if (keyword) {
                dataQuery += ` AND (r.ReportNo LIKE @Keyword OR r.PNum LIKE @Keyword OR r.CPO LIKE @Keyword)`;
            }
            
            dataQuery += `
                ) AS RowConstrainedResult
                WHERE RowNum > @Offset AND RowNum <= (@Offset + @PageSize)
            `;

            const dataReq = pool.request()
                .input('Offset', sql.Int, offset)
                .input('PageSize', sql.Int, parseInt(pageSize));
            
            if (keyword) dataReq.input('Keyword', sql.NVarChar, `%${keyword}%`);
            
            const dataRes = await dataReq.query(dataQuery);

            res.json({
                success: true,
                total,
                todayCount,
                data: dataRes.recordset,
                page: parseInt(page),
                pageSize: parseInt(pageSize)
            });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Fetch failed' });
    }
});

// Delete Report
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await executeQuery(async (pool) => {
            await pool.request()
                .input('ID', sql.Int, id)
                .query('DELETE FROM ShipmentReports WHERE ID = @ID');
        });
        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
});

// =====================================================
// 审核流程API - 集成待办事项
// =====================================================

const auditService = require('../services/auditService');
const { getConnection } = require('../db');

/**
 * 提交审核
 * POST /api/shipment-inspection/:id/submit
 */
router.post('/:id/submit', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        const user = await auditService.getUserByUsername(pool, req.user.username);
        
        if (!user) {
            return res.status(400).json({ success: false, message: '用户信息获取失败' });
        }
        
        const result = await auditService.submitForAudit({
            pool,
            tableName: 'ShipmentReports',
            businessNoField: 'ReportNo',
            businessId: parseInt(id),
            todoType: auditService.TODO_TYPES.SHIPMENT_INSPECTION,
            businessType: auditService.BUSINESS_TYPES.SHIPMENT_INSPECTION,
            titlePrefix: '出货检验报告',
            userId: user.id,
            userName: user.realName
        });
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('提交审核失败:', error);
        res.status(500).json({ success: false, message: '提交审核失败', error: error.message });
    }
});

/**
 * 审核通过
 * POST /api/shipment-inspection/:id/approve
 */
router.post('/:id/approve', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { remark } = req.body;
        const pool = await getConnection();
        const user = await auditService.getUserByUsername(pool, req.user.username);
        
        if (!user) {
            return res.status(400).json({ success: false, message: '用户信息获取失败' });
        }
        
        const result = await auditService.approveAudit({
            pool,
            tableName: 'ShipmentReports',
            businessNoField: 'ReportNo',
            auditorField: 'AuditBy',
            auditorNameField: 'AuditByName',
            auditDateField: 'AuditTime',
            auditRemarkField: 'AuditRemark',
            businessId: parseInt(id),
            todoType: auditService.TODO_TYPES.SHIPMENT_INSPECTION,
            businessType: auditService.BUSINESS_TYPES.SHIPMENT_INSPECTION,
            userId: user.id,
            userName: user.realName,
            remark
        });
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('审核失败:', error);
        res.status(500).json({ success: false, message: '审核失败', error: error.message });
    }
});

/**
 * 审核驳回
 * POST /api/shipment-inspection/:id/reject
 */
router.post('/:id/reject', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { remark } = req.body;
        const pool = await getConnection();
        const user = await auditService.getUserByUsername(pool, req.user.username);
        
        if (!user) {
            return res.status(400).json({ success: false, message: '用户信息获取失败' });
        }
        
        const result = await auditService.rejectAudit({
            pool,
            tableName: 'ShipmentReports',
            businessNoField: 'ReportNo',
            auditorField: 'AuditBy',
            auditorNameField: 'AuditByName',
            auditDateField: 'AuditTime',
            auditRemarkField: 'AuditRemark',
            businessId: parseInt(id),
            todoType: auditService.TODO_TYPES.SHIPMENT_INSPECTION,
            businessType: auditService.BUSINESS_TYPES.SHIPMENT_INSPECTION,
            userId: user.id,
            userName: user.realName,
            remark
        });
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('驳回失败:', error);
        res.status(500).json({ success: false, message: '驳回失败', error: error.message });
    }
});

/**
 * 撤回审核
 * POST /api/shipment-inspection/:id/revoke
 */
router.post('/:id/revoke', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        const user = await auditService.getUserByUsername(pool, req.user.username);
        
        if (!user) {
            return res.status(400).json({ success: false, message: '用户信息获取失败' });
        }
        
        const result = await auditService.revokeAudit({
            pool,
            tableName: 'ShipmentReports',
            businessNoField: 'ReportNo',
            businessId: parseInt(id),
            todoType: auditService.TODO_TYPES.SHIPMENT_INSPECTION,
            businessType: auditService.BUSINESS_TYPES.SHIPMENT_INSPECTION,
            userId: user.id,
            userName: user.realName,
            username: req.user.username  // 传入用户名用于创建人比较
        });
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('撤回失败:', error);
        res.status(500).json({ success: false, message: '撤回失败', error: error.message });
    }
});

/**
 * 获取审核日志
 * GET /api/shipment-inspection/:id/audit-logs
 */
router.get('/:id/audit-logs', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const logs = await auditService.getAuditLogs(auditService.BUSINESS_TYPES.SHIPMENT_INSPECTION, parseInt(id));
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('获取审核日志失败:', error);
        res.status(500).json({ success: false, message: '获取审核日志失败', error: error.message });
    }
});

module.exports = router;
