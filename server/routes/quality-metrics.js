/**
 * 质量指标API路由
 * 用于处理一次交检合格率和客诉率相关数据
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const db = require('../db');
const { authenticateToken, checkPermission } = require('../middleware/auth');

/**
 * 获取质量指标趋势数据
 * GET /api/quality-metrics/trends
 */
router.get('/trends', authenticateToken, async (req, res) => {
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
router.get('/summary', authenticateToken, async (req, res) => {
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
router.get('/monthly-batches', authenticateToken, checkPermission('quality:metrics:view'), async (req, res) => {
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
router.put('/monthly-batches/:id', authenticateToken, checkPermission('quality:metrics:edit'), async (req, res) => {
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
router.get('/month-batch-stats', authenticateToken, async (req, res) => {
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

/**
 * 获取月度投诉批次数（内诉/客诉）
 * GET /api/quality-metrics/monthly-complaints
 */
router.get('/monthly-complaints', authenticateToken, async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        console.log(`获取月度投诉批次数 - 年份: ${year}`);

        const pool = await db.getConnection();

        const query = `
            SELECT
                YEAR(cr.Date) AS StatYear,
                MONTH(cr.Date) AS StatMonth,
                SUM(CASE WHEN cr.ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) AS InternalComplaints,
                SUM(CASE WHEN cr.ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) AS CustomerComplaints
            FROM ComplaintRegister cr
            WHERE YEAR(cr.Date) = @year
            GROUP BY YEAR(cr.Date), MONTH(cr.Date)
            ORDER BY YEAR(cr.Date), MONTH(cr.Date)
        `;

        const request = pool.request();
        request.input('year', sql.Int, parseInt(year));

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset,
            message: '月度投诉批次数获取成功'
        });
    } catch (error) {
        console.error('获取月度投诉批次数失败:', error);
        res.status(500).json({
            success: false,
            message: '获取月度投诉批次数失败',
            error: error.message
        });
    }
});

/**
 * 获取年度客户质量预警 TOP5 (按客户投诉批次数统计)
 * GET /api/quality-metrics/customer-warning-top5
 */
router.get('/customer-warning-top5', authenticateToken, async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        console.log(`获取客户质量预警TOP5 - 年份: ${year}`);

        const pool = await db.getConnection();

        const query = `
            SELECT TOP 5
                Customer,
                COUNT(*) AS ComplaintCount
            FROM ComplaintRegister
            WHERE YEAR(Date) = @year
              AND Customer IS NOT NULL 
              AND Customer != ''
            GROUP BY Customer
            ORDER BY ComplaintCount DESC
        `;

        const request = pool.request();
        request.input('year', sql.Int, parseInt(year));

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset,
            message: '客户质量预警TOP5获取成功'
        });
    } catch (error) {
        console.error('获取客户质量预警TOP5失败:', error);
        res.status(500).json({
            success: false,
            message: '获取客户质量预警TOP5失败',
            error: error.message
        });
    }
});

/**
 * 获取年度缺陷类别占比 (区分客诉/内诉)
 * GET /api/quality-metrics/defective-categories
 */
router.get('/defective-categories', authenticateToken, async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        console.log(`获取缺陷类别占比 - 年份: ${year}`);

        const pool = await db.getConnection();

        const query = `
            SELECT 
                ComplaintCategory,
                DefectiveCategory,
                COUNT(*) AS DefectCount
            FROM ComplaintRegister
            WHERE YEAR(Date) = @year
              AND DefectiveCategory IS NOT NULL 
              AND DefectiveCategory != ''
            GROUP BY ComplaintCategory, DefectiveCategory
            ORDER BY ComplaintCategory, DefectCount DESC
        `;

        const request = pool.request();
        request.input('year', sql.Int, parseInt(year));

        const result = await request.query(query);

        // 按内/外诉分组处理数据
        const data = {
            internal: [],
            external: []
        };

        result.recordset.forEach(row => {
            const item = { name: row.DefectiveCategory, value: row.DefectCount };
            if (row.ComplaintCategory === '内诉') {
                data.internal.push(item);
            } else if (row.ComplaintCategory === '客诉') {
                data.external.push(item);
            }
        });

        res.json({
            success: true,
            data: data,
            message: '缺陷类别占比获取成功'
        });
    } catch (error) {
        console.error('获取缺陷类别占比失败:', error);
        res.status(500).json({
            success: false,
            message: '获取缺陷类别占比失败',
            error: error.message
        });
    }
});

/**
 * 获取年度部门质量责任分布 (支持按 MainDept 或 Workshop 统计)
 * GET /api/quality-metrics/department-responsibility
 */
router.get('/department-responsibility', authenticateToken, async (req, res) => {
    try {
        const { year = new Date().getFullYear(), type = 'workshop' } = req.query;

        console.log(`获取部门质量责任分布 - 年份: ${year}, 类型: ${type}`);

        const pool = await db.getConnection();
        
        // 动态决定分组字段，防止SQL注入，只允许指定字段
        const groupField = type === 'main' ? 'MainDept' : 'Workshop';

        const query = `
            SELECT 
                ${groupField} AS Department,
                COUNT(*) AS IssueCount
            FROM ComplaintRegister
            WHERE YEAR(Date) = @year
              AND ${groupField} IS NOT NULL 
              AND ${groupField} != ''
            GROUP BY ${groupField}
            ORDER BY IssueCount DESC
        `;

        const request = pool.request();
        request.input('year', sql.Int, parseInt(year));

        const result = await request.query(query);

        res.json({
            success: true,
            data: result.recordset,
            message: '部门质量责任分布获取成功'
        });
    } catch (error) {
        console.error('获取部门质量责任分布失败:', error);
        res.status(500).json({
            success: false,
            message: '获取部门质量责任分布失败',
            error: error.message
        });
    }
});

/**
 * 获取当月实时质量异常播报 (获取最新10条)
 * GET /api/quality-metrics/realtime-issues
 */
router.get('/realtime-issues', authenticateToken, async (req, res) => {
    try {
        const { year = new Date().getFullYear(), month = new Date().getMonth() + 1, debug = '0' } = req.query;
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        console.log(`获取实时质量异常播报 - 年份: ${yearNum}, 月份: ${monthNum}`);

        const pool = await db.getConnection();

        const query = `
            SELECT TOP 10
                Date,
                DefectiveDescription,
                Workshop,
                MainPerson
            FROM ComplaintRegister
            WHERE YEAR(Date) = @year 
              AND MONTH(Date) <= @month
            ORDER BY Date DESC, ID DESC
        `;

        const request = pool.request();
        request.input('year', sql.Int, yearNum);
        request.input('month', sql.Int, monthNum);

        const result = await request.query(query);
        console.log(`[realtime-issues] 查询返回 ${result.recordset.length} 条记录`);
        let debugStats = null;
        if (result.recordset.length > 0) {
            console.log('[realtime-issues] 首条记录:', result.recordset[0]);
        } else {
            const debugQuery = `
                SELECT
                    COUNT(*) AS YearTotalCount,
                    SUM(CASE WHEN MONTH(Date) <= @month THEN 1 ELSE 0 END) AS UpToMonthCount,
                    SUM(CASE WHEN DefectiveDescription IS NOT NULL AND DefectiveDescription != '' THEN 1 ELSE 0 END) AS DescFilledCount,
                    SUM(CASE WHEN Workshop IS NOT NULL AND Workshop != '' THEN 1 ELSE 0 END) AS WorkshopFilledCount,
                    SUM(CASE WHEN MainPerson IS NOT NULL AND MainPerson != '' THEN 1 ELSE 0 END) AS MainPersonFilledCount
                FROM ComplaintRegister
                WHERE YEAR(Date) = @year
            `;
            const debugResult = await request.query(debugQuery);
            debugStats = debugResult.recordset[0] || null;
            console.log('[realtime-issues] 年度筛选统计:', debugStats);
        }

        const responseBody = {
            success: true,
            data: result.recordset,
            message: '实时异常播报获取成功'
        };
        if (debug === '1') {
            responseBody.debug = {
                year: yearNum,
                month: monthNum,
                rowCount: result.recordset.length,
                firstRow: result.recordset[0] || null,
                statsWhenEmpty: debugStats
            };
        }
        res.json(responseBody);
    } catch (error) {
        console.error('获取实时异常播报失败:', error);
        res.status(500).json({
            success: false,
            message: '获取实时异常播报失败',
            error: error.message
        });
    }
});

/**
 * 获取顶部KPI卡片数据（当月+环比上月）
 * GET /api/quality-metrics/kpi-cards
 */
router.get('/kpi-cards', authenticateToken, async (req, res) => {
    try {
        const now = new Date();
        const { year = now.getFullYear(), month = now.getMonth() + 1 } = req.query;
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;
        const prevMonth = monthNum === 1 ? 12 : monthNum - 1;

        const pool = await db.getConnection();

        const batchQuery = `
            SELECT
                ISNULL(InspectionBatches, 0) AS InspectionBatches,
                ISNULL(DeliveryBatches, 0) AS DeliveryBatches
            FROM MonthlyBatchStats
            WHERE StatYear = @year AND StatMonth = @month
        `;

        const monthComplaintQuery = `
            SELECT
                SUM(CASE WHEN ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) AS InternalComplaints,
                SUM(CASE WHEN ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) AS CustomerComplaints,
                SUM(ISNULL(TotalCost, 0)) AS TotalCostAmount,
                SUM(CASE WHEN Disposition IS NULL OR LTRIM(RTRIM(Disposition)) = '' THEN 1 ELSE 0 END) AS PendingIssueCount
            FROM ComplaintRegister
            WHERE YEAR(Date) = @year AND MONTH(Date) = @month
        `;

        const currentBatchReq = pool.request();
        currentBatchReq.input('year', sql.Int, yearNum);
        currentBatchReq.input('month', sql.Int, monthNum);
        const currentBatchResult = await currentBatchReq.query(batchQuery);

        const prevBatchReq = pool.request();
        prevBatchReq.input('year', sql.Int, prevYear);
        prevBatchReq.input('month', sql.Int, prevMonth);
        const prevBatchResult = await prevBatchReq.query(batchQuery);

        const currentComplaintReq = pool.request();
        currentComplaintReq.input('year', sql.Int, yearNum);
        currentComplaintReq.input('month', sql.Int, monthNum);
        const currentComplaintResult = await currentComplaintReq.query(monthComplaintQuery);

        const prevComplaintReq = pool.request();
        prevComplaintReq.input('year', sql.Int, prevYear);
        prevComplaintReq.input('month', sql.Int, prevMonth);
        const prevComplaintResult = await prevComplaintReq.query(monthComplaintQuery);

        const currentBatch = currentBatchResult.recordset[0] || {};
        const prevBatch = prevBatchResult.recordset[0] || {};
        const currentComplaint = currentComplaintResult.recordset[0] || {};
        const prevComplaint = prevComplaintResult.recordset[0] || {};

        const calcRate = (numeratorBase, complaintCount) => {
            const base = Number(numeratorBase) || 0;
            const complaint = Number(complaintCount) || 0;
            if (base <= 0) return 0;
            return Number((((base - complaint) / base) * 100).toFixed(2));
        };

        const calcTrend = (currentValue, previousValue) => {
            const curr = Number(currentValue) || 0;
            const prev = Number(previousValue) || 0;
            if (prev === 0) return curr === 0 ? 0 : 100;
            return Number((((curr - prev) / prev) * 100).toFixed(1));
        };

        const currentFirstPassRate = calcRate(currentBatch.InspectionBatches, currentComplaint.InternalComplaints);
        const prevFirstPassRate = calcRate(prevBatch.InspectionBatches, prevComplaint.InternalComplaints);

        const currentTotalCost = Number(currentComplaint.TotalCostAmount) || 0;
        const prevTotalCost = Number(prevComplaint.TotalCostAmount) || 0;

        const currentIncomingPassRate = currentFirstPassRate;
        const prevIncomingPassRate = prevFirstPassRate;

        const currentPendingIssues = Number(currentComplaint.PendingIssueCount) || 0;
        const prevPendingIssues = Number(prevComplaint.PendingIssueCount) || 0;

        res.json({
            success: true,
            data: {
                year: yearNum,
                month: monthNum,
                qualityTargetAchievementRate: currentFirstPassRate,
                qualityTargetAchievementTrend: calcTrend(currentFirstPassRate, prevFirstPassRate),
                monthlyQualityLossAmount: Number(currentTotalCost.toFixed(2)),
                monthlyQualityLossTrend: calcTrend(currentTotalCost, prevTotalCost),
                incomingInspectionPassRate: currentIncomingPassRate,
                incomingInspectionPassTrend: calcTrend(currentIncomingPassRate, prevIncomingPassRate),
                pendingIssueCount: currentPendingIssues,
                pendingIssueTrend: calcTrend(currentPendingIssues, prevPendingIssues)
            },
            message: 'KPI卡片数据获取成功'
        });
    } catch (error) {
        console.error('获取KPI卡片数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取KPI卡片数据失败',
            error: error.message
        });
    }
});

module.exports = router;
