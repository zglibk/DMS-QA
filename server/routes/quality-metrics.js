/**
 * 质量指标API路由
 * 用于处理一次交检合格率和客诉率相关数据
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const db = require('../db');

/**
 * 获取质量指标趋势数据
 * GET /api/quality-metrics/trends
 */
router.get('/trends', async (req, res) => {
    try {
        const { year = new Date().getFullYear(), months = 12 } = req.query;
        
        console.log(`获取质量指标趋势数据 - 年份: ${year}, 月数: ${months}`);
        
        const pool = await db.getConnection();
        
        // SQL Server 2008R2 兼容语法
        const query = `
            WITH MonthlyData AS (
                -- 获取月度批次数据
                SELECT 
                    mbs.StatYear,
                    mbs.StatMonth,
                    mbs.InspectionBatches,
                    mbs.DeliveryBatches,
                    -- 计算内诉数量 (SQL Server 2008R2 兼容)
                    ISNULL((
                        SELECT COUNT(*)
                        FROM ComplaintRegister cr
                        WHERE cr.ComplaintCategory = N'内诉'
                        AND YEAR(cr.Date) = mbs.StatYear
                        AND MONTH(cr.Date) = mbs.StatMonth
                    ), 0) AS InternalComplaints,
                    -- 计算客诉数量
                    ISNULL((
                        SELECT COUNT(*)
                        FROM ComplaintRegister cr
                        WHERE cr.ComplaintCategory = N'客诉'
                        AND YEAR(cr.Date) = mbs.StatYear
                        AND MONTH(cr.Date) = mbs.StatMonth
                    ), 0) AS CustomerComplaints
                FROM MonthlyBatchStats mbs
                WHERE mbs.StatYear = @year
            )
            SELECT 
                StatYear,
                StatMonth,
                InspectionBatches,
                DeliveryBatches,
                InternalComplaints,
                CustomerComplaints,
                -- 计算一次交检合格率
                CASE 
                    WHEN InspectionBatches > 0 
                    THEN CAST(ROUND((InspectionBatches - InternalComplaints) * 100.0 / InspectionBatches, 2) AS decimal(5,2))
                    ELSE 0 
                END AS FirstPassRate,
                -- 计算交货批次合格率
                CASE
                    WHEN DeliveryBatches > 0
                    THEN CAST(ROUND((DeliveryBatches - CustomerComplaints) * 100.0 / DeliveryBatches, 2) AS decimal(5,2))
                    ELSE 0
                END AS DeliveryPassRate,
                -- 生成月份标签 (使用YY格式)
                RIGHT(CAST(StatYear AS nvarchar(4)), 2) + N'年' +
                CAST(StatMonth AS nvarchar(2)) + N'月' AS MonthLabel
            FROM MonthlyData
            ORDER BY StatYear, StatMonth
        `;
        
        const request = pool.request();
        request.input('year', sql.Int, parseInt(year));
        
        const result = await request.query(query);
        
        console.log(`查询到 ${result.recordset.length} 条质量指标数据`);
        
        res.json({
            success: true,
            data: result.recordset,
            message: '质量指标趋势数据获取成功'
        });
        
    } catch (error) {
        console.error('获取质量指标趋势数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取质量指标趋势数据失败',
            error: error.message
        });
    }
});

/**
 * 获取质量指标汇总数据
 * GET /api/quality-metrics/summary
 */
router.get('/summary', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        console.log(`获取质量指标汇总数据 - 年份: ${year}`);
        
        const pool = await db.getConnection();
        
        // SQL Server 2008R2 兼容语法
        const query = `
            WITH YearlyData AS (
                SELECT 
                    SUM(mbs.InspectionBatches) AS TotalInspectionBatches,
                    SUM(mbs.DeliveryBatches) AS TotalDeliveryBatches,
                    -- 计算年度内诉总数
                    ISNULL((
                        SELECT COUNT(*)
                        FROM ComplaintRegister cr
                        WHERE cr.ComplaintCategory = N'内诉'
                        AND YEAR(cr.Date) = @year
                    ), 0) AS TotalInternalComplaints,
                    -- 计算年度客诉总数
                    ISNULL((
                        SELECT COUNT(*)
                        FROM ComplaintRegister cr
                        WHERE cr.ComplaintCategory = N'客诉'
                        AND YEAR(cr.Date) = @year
                    ), 0) AS TotalCustomerComplaints
                FROM MonthlyBatchStats mbs
                WHERE mbs.StatYear = @year
            )
            SELECT 
                TotalInspectionBatches,
                TotalDeliveryBatches,
                TotalInternalComplaints,
                TotalCustomerComplaints,
                -- 计算年度一次交检合格率
                CASE 
                    WHEN TotalInspectionBatches > 0 
                    THEN CAST(ROUND((TotalInspectionBatches - TotalInternalComplaints) * 100.0 / TotalInspectionBatches, 2) AS decimal(5,2))
                    ELSE 0 
                END AS YearlyFirstPassRate,
                -- 计算年度交货批次合格率
                CASE
                    WHEN TotalDeliveryBatches > 0
                    THEN CAST(ROUND((TotalDeliveryBatches - TotalCustomerComplaints) * 100.0 / TotalDeliveryBatches, 2) AS decimal(5,2))
                    ELSE 0
                END AS YearlyDeliveryPassRate
            FROM YearlyData
        `;
        
        const request = pool.request();
        request.input('year', sql.Int, parseInt(year));
        
        const result = await request.query(query);
        
        const summary = result.recordset[0] || {
            TotalInspectionBatches: 0,
            TotalDeliveryBatches: 0,
            TotalInternalComplaints: 0,
            TotalCustomerComplaints: 0,
            YearlyFirstPassRate: 0,
            YearlyDeliveryPassRate: 0
        };
        
        console.log(`年度汇总数据:`, summary);
        
        res.json({
            success: true,
            data: summary,
            message: '质量指标汇总数据获取成功'
        });
        
    } catch (error) {
        console.error('获取质量指标汇总数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取质量指标汇总数据失败',
            error: error.message
        });
    }
});

/**
 * 获取月度批次统计数据
 * GET /api/quality-metrics/monthly-batches
 */
router.get('/monthly-batches', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        console.log(`获取月度批次统计数据 - 年份: ${year}`);
        
        const pool = await db.getConnection();
        
        // SQL Server 2008R2 兼容语法
        const query = `
            SELECT 
                ID,
                StatYear,
                StatMonth,
                InspectionBatches,
                DeliveryBatches,
                Remarks,
                CreatedBy,
                CreatedAt,
                UpdatedBy,
                UpdatedAt,
                -- 生成月份标签 (使用YY格式)
                RIGHT(CAST(StatYear AS nvarchar(4)), 2) + N'年' +
                CAST(StatMonth AS nvarchar(2)) + N'月' AS MonthLabel
            FROM MonthlyBatchStats
            WHERE StatYear = @year
            ORDER BY StatMonth
        `;
        
        const request = pool.request();
        request.input('year', sql.Int, parseInt(year));
        
        const result = await request.query(query);
        
        console.log(`查询到 ${result.recordset.length} 条月度批次数据`);
        
        res.json({
            success: true,
            data: result.recordset,
            message: '月度批次统计数据获取成功'
        });
        
    } catch (error) {
        console.error('获取月度批次统计数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取月度批次统计数据失败',
            error: error.message
        });
    }
});

/**
 * 更新月度批次数据
 * PUT /api/quality-metrics/monthly-batches/:id
 */
router.put('/monthly-batches/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { InspectionBatches, DeliveryBatches, Remarks } = req.body;

        console.log(`更新月度批次数据 - ID: ${id}`);

        const pool = await db.getConnection();

        const query = `
            UPDATE MonthlyBatchStats
            SET
                InspectionBatches = @InspectionBatches,
                DeliveryBatches = @DeliveryBatches,
                Remarks = @Remarks,
                UpdatedBy = @UpdatedBy,
                UpdatedAt = GETDATE()
            WHERE ID = @ID
        `;

        const request = pool.request();
        request.input('ID', sql.Int, parseInt(id));
        request.input('InspectionBatches', sql.Int, InspectionBatches || 0);
        request.input('DeliveryBatches', sql.Int, DeliveryBatches || 0);
        request.input('Remarks', sql.NVarChar(500), Remarks || '');
        request.input('UpdatedBy', sql.NVarChar(50), 'admin'); // 后续从token获取

        const result = await request.query(query);

        if (result.rowsAffected[0] > 0) {
            console.log(`月度批次数据更新成功 - ID: ${id}`);
            res.json({
                success: true,
                message: '月度批次数据更新成功'
            });
        } else {
            res.status(404).json({
                success: false,
                message: '未找到指定的月度批次数据'
            });
        }

    } catch (error) {
        console.error('更新月度批次数据失败:', error);
        res.status(500).json({
            success: false,
            message: '更新月度批次数据失败',
            error: error.message
        });
    }
});

/**
 * 获取指定月份的批次统计数据（用于首页卡片）
 * GET /api/quality-metrics/month-batch-stats
 */
router.get('/month-batch-stats', async (req, res) => {
    try {
        const { month } = req.query; // 格式: YYYY-MM

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({
                success: false,
                message: '请提供有效的月份参数，格式: YYYY-MM'
            });
        }

        const [year, monthNum] = month.split('-').map(Number);

        console.log(`获取指定月份批次统计数据 - ${year}年${monthNum}月`);

        const pool = await db.getConnection();

        // 查询指定月份的批次数据
        const query = `
            SELECT
                InspectionBatches,
                DeliveryBatches,
                StatYear,
                StatMonth
            FROM MonthlyBatchStats
            WHERE StatYear = @year AND StatMonth = @month
        `;

        const request = pool.request();
        request.input('year', sql.Int, year);
        request.input('month', sql.Int, monthNum);

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            const data = result.recordset[0];
            console.log(`找到批次数据:`, data);

            res.json({
                success: true,
                data: {
                    inspectionBatches: data.InspectionBatches || 0,
                    deliveryBatches: data.DeliveryBatches || 0,
                    year: data.StatYear,
                    month: data.StatMonth
                },
                message: '批次统计数据获取成功'
            });
        } else {
            console.log(`未找到${year}年${monthNum}月的批次数据`);

            // 返回默认值
            res.json({
                success: true,
                data: {
                    inspectionBatches: 0,
                    deliveryBatches: 0,
                    year: year,
                    month: monthNum
                },
                message: '未找到指定月份的批次数据，返回默认值'
            });
        }

    } catch (error) {
        console.error('获取月份批次统计数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取月份批次统计数据失败',
            error: error.message
        });
    }
});

module.exports = router;
