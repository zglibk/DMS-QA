const express = require('express');
const router = express.Router();
const { sql, executeQuery } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// 生成异常单号
async function generateExceptionNumber(pool) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `QC${year}${month}${day}`;

    const result = await pool.request()
        .input('prefix', sql.NVarChar, `${prefix}%`)
        .query('SELECT TOP 1 ExceptionNumber FROM QualityExceptions WHERE ExceptionNumber LIKE @prefix ORDER BY ExceptionNumber DESC');

    let sequence = 1;
    if (result.recordset.length > 0) {
        const lastNumber = result.recordset[0].ExceptionNumber;
        const lastSeq = parseInt(lastNumber.split('-')[1]);
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

// 获取列表
router.get('/', authenticateToken, async (req, res) => {
    console.log('[QualityException] Get list request:', req.query);
    try {
        const { page = 1, pageSize = 10, keyword, startDate, endDate, status } = req.query;
        const offset = (page - 1) * pageSize;

        let query = 'SELECT * FROM QualityExceptions WHERE 1=1';
        const countQuery = 'SELECT COUNT(*) as total FROM QualityExceptions WHERE 1=1';
        let whereClause = '';

        if (keyword) {
            whereClause += ` AND (ExceptionNumber LIKE @keyword OR ProductName LIKE @keyword OR MaterialCode LIKE @keyword OR Description LIKE @keyword)`;
        }
        if (startDate) {
            whereClause += ` AND ReportDate >= @startDate`;
        }
        if (endDate) {
            whereClause += ` AND ReportDate <= @endDate`;
        }
        if (status) {
            whereClause += ` AND Status = @status`;
        }

        console.log('[QualityException] Query conditions:', { whereClause, offset, pageSize });

        await executeQuery(async (pool) => {
            const request = pool.request();
            if (keyword) request.input('keyword', sql.NVarChar, `%${keyword}%`);
            if (startDate) request.input('startDate', sql.DateTime, startDate);
            if (endDate) request.input('endDate', sql.DateTime, endDate);
            if (status) request.input('status', sql.NVarChar, status);

            // Get total count
            console.log('[QualityException] Executing count query...');
            const countStart = Date.now();
            const countResult = await request.query(countQuery + whereClause);
            console.log('[QualityException] Count query finished in', Date.now() - countStart, 'ms');
            const total = countResult.recordset[0].total;

            // Get data
            const pageNum = parseInt(page) || 1;
            const pageSizeNum = parseInt(pageSize) || 10;
            const startRow = (pageNum - 1) * pageSizeNum + 1;
            const endRow = pageNum * pageSizeNum;

            request.input('startRow', sql.Int, startRow);
            request.input('endRow', sql.Int, endRow);
            
            console.log('[QualityException] Executing data query...');
            const dataStart = Date.now();
            
            const dataQuery = `
                SELECT * FROM (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY ExceptionNumber DESC) AS RowNum
                    FROM QualityExceptions
                    WHERE 1=1 ${whereClause}
                ) AS T
                WHERE T.RowNum BETWEEN @startRow AND @endRow
                ORDER BY T.RowNum
            `;
            
            const result = await request.query(dataQuery);
            console.log('[QualityException] Data query finished in', Date.now() - dataStart, 'ms');

            res.json({
                success: true,
                data: {
                    list: result.recordset,
                    total,
                    page: pageNum,
                    pageSize: pageSizeNum
                }
            });
        });
    } catch (error) {
        console.error('获取品质异常列表失败:', error);
        res.status(500).json({ success: false, message: '获取列表失败' });
    }
});

// 获取单条详情
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await executeQuery(async (pool) => {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT * FROM QualityExceptions WHERE ID = @id');
            
            if (result.recordset.length === 0) {
                return res.status(404).json({ success: false, message: '未找到记录' });
            }
            res.json({ success: true, data: result.recordset[0] });
        });
    } catch (error) {
        console.error('获取详情失败:', error);
        res.status(500).json({ success: false, message: '获取详情失败' });
    }
});

// 创建
router.post('/', authenticateToken, async (req, res) => {
    try {
        const data = req.body;
        
        await executeQuery(async (pool) => {
            // 生成单号
            const exceptionNumber = await generateExceptionNumber(pool);

            const request = pool.request()
                .input('ExceptionNumber', sql.NVarChar, exceptionNumber)
                .input('ReportDate', sql.DateTime, data.ReportDate || new Date())
                .input('Reporter', sql.NVarChar, data.Reporter)
                .input('ProductName', sql.NVarChar, data.ProductName)
                .input('MaterialCode', sql.NVarChar, data.MaterialCode)
                .input('ModelSpec', sql.NVarChar, data.ModelSpec)
                .input('CustomerCode', sql.NVarChar, data.CustomerCode)
                .input('WorkOrderNum', sql.NVarChar, data.WorkOrderNum)
                .input('ProductionQuantity', sql.Decimal(18, 2), data.ProductionQuantity || 0)
                .input('ExceptionQuantity', sql.Decimal(18, 2), data.ExceptionQuantity || 0)
                .input('DiscoveryStage', sql.NVarChar, data.DiscoveryStage)
                .input('Description', sql.NVarChar, data.Description)
                .input('Images', sql.NVarChar, JSON.stringify(data.Images || []))
                .input('PreliminaryCause', sql.NVarChar, data.PreliminaryCause)
                .input('ResponsibleDepartment', sql.NVarChar, data.ResponsibleDepartment)
                .input('ResponsiblePerson', sql.NVarChar, data.ResponsiblePerson)
                .input('HandlingMethod', sql.NVarChar, data.HandlingMethod)
                .input('TemporaryCountermeasure', sql.NVarChar, data.TemporaryCountermeasure)
                .input('PermanentCountermeasure', sql.NVarChar, data.PermanentCountermeasure)
                .input('CompletionDeadline', sql.DateTime, data.CompletionDeadline || null)
                .input('Executor', sql.NVarChar, data.Executor)
                .input('Verifier', sql.NVarChar, data.Verifier)
                .input('VerificationResult', sql.NVarChar, data.VerificationResult)
                .input('CloseDate', sql.DateTime, data.CloseDate || null)
                .input('Remarks', sql.NVarChar, data.Remarks)
                .input('Status', sql.NVarChar, data.Status || 'Open');

            await request.query(`
                INSERT INTO QualityExceptions (
                    ExceptionNumber, ReportDate, Reporter, ProductName, MaterialCode, ModelSpec,
                    CustomerCode, WorkOrderNum, ProductionQuantity, ExceptionQuantity, DiscoveryStage,
                    Description, Images, PreliminaryCause, ResponsibleDepartment, ResponsiblePerson, HandlingMethod,
                    TemporaryCountermeasure, PermanentCountermeasure, CompletionDeadline, Executor,
                    Verifier, VerificationResult, CloseDate, Remarks, Status
                ) VALUES (
                    @ExceptionNumber, @ReportDate, @Reporter, @ProductName, @MaterialCode, @ModelSpec,
                    @CustomerCode, @WorkOrderNum, @ProductionQuantity, @ExceptionQuantity, @DiscoveryStage,
                    @Description, @Images, @PreliminaryCause, @ResponsibleDepartment, @ResponsiblePerson, @HandlingMethod,
                    @TemporaryCountermeasure, @PermanentCountermeasure, @CompletionDeadline, @Executor,
                    @Verifier, @VerificationResult, @CloseDate, @Remarks, @Status
                )
            `);

            res.json({ success: true, message: '创建成功', data: { ExceptionNumber: exceptionNumber } });
        });
    } catch (error) {
        console.error('创建异常单失败:', error);
        res.status(500).json({ success: false, message: '创建失败: ' + error.message });
    }
});

// 更新
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        await executeQuery(async (pool) => {
            const request = pool.request()
                .input('ID', sql.Int, id)
                .input('ReportDate', sql.DateTime, data.ReportDate)
                .input('Reporter', sql.NVarChar, data.Reporter)
                .input('ProductName', sql.NVarChar, data.ProductName)
                .input('MaterialCode', sql.NVarChar, data.MaterialCode)
                .input('ModelSpec', sql.NVarChar, data.ModelSpec)
                .input('CustomerCode', sql.NVarChar, data.CustomerCode)
                .input('WorkOrderNum', sql.NVarChar, data.WorkOrderNum)
                .input('ProductionQuantity', sql.Decimal(18, 2), data.ProductionQuantity)
                .input('ExceptionQuantity', sql.Decimal(18, 2), data.ExceptionQuantity)
                .input('DiscoveryStage', sql.NVarChar, data.DiscoveryStage)
                .input('Description', sql.NVarChar, data.Description)
                .input('Images', sql.NVarChar, JSON.stringify(data.Images || []))
                .input('PreliminaryCause', sql.NVarChar, data.PreliminaryCause)
                .input('ResponsibleDepartment', sql.NVarChar, data.ResponsibleDepartment)
                .input('ResponsiblePerson', sql.NVarChar, data.ResponsiblePerson)
                .input('HandlingMethod', sql.NVarChar, data.HandlingMethod)
                .input('TemporaryCountermeasure', sql.NVarChar, data.TemporaryCountermeasure)
                .input('PermanentCountermeasure', sql.NVarChar, data.PermanentCountermeasure)
                .input('CompletionDeadline', sql.DateTime, data.CompletionDeadline || null)
                .input('Executor', sql.NVarChar, data.Executor)
                .input('Verifier', sql.NVarChar, data.Verifier)
                .input('VerificationResult', sql.NVarChar, data.VerificationResult)
                .input('CloseDate', sql.DateTime, data.CloseDate || null)
                .input('Remarks', sql.NVarChar, data.Remarks)
                .input('Status', sql.NVarChar, data.Status);

            await request.query(`
                UPDATE QualityExceptions SET
                    ReportDate = @ReportDate,
                    Reporter = @Reporter,
                    ProductName = @ProductName,
                    MaterialCode = @MaterialCode,
                    ModelSpec = @ModelSpec,
                    CustomerCode = @CustomerCode,
                    WorkOrderNum = @WorkOrderNum,
                    ProductionQuantity = @ProductionQuantity,
                    ExceptionQuantity = @ExceptionQuantity,
                    DiscoveryStage = @DiscoveryStage,
                    Description = @Description,
                    Images = @Images,
                    PreliminaryCause = @PreliminaryCause,
                    ResponsibleDepartment = @ResponsibleDepartment,
                    ResponsiblePerson = @ResponsiblePerson,
                    HandlingMethod = @HandlingMethod,
                    TemporaryCountermeasure = @TemporaryCountermeasure,
                    PermanentCountermeasure = @PermanentCountermeasure,
                    CompletionDeadline = @CompletionDeadline,
                    Executor = @Executor,
                    Verifier = @Verifier,
                    VerificationResult = @VerificationResult,
                    CloseDate = @CloseDate,
                    Remarks = @Remarks,
                    Status = @Status,
                    UpdatedAt = GETDATE()
                WHERE ID = @ID
            `);

            res.json({ success: true, message: '更新成功' });
        });
    } catch (error) {
        console.error('更新异常单失败:', error);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// 删除
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await executeQuery(async (pool) => {
            // 首先删除关联的考核通知记录
            await pool.request()
                .input('SourceID', sql.Int, id)
                .input('SourceType', sql.NVarChar, 'Exception')
                .query('DELETE FROM QualityAssessmentNotices WHERE SourceType = @SourceType AND SourceID = @SourceID');

            // 然后删除异常联络单本身
            await pool.request()
                .input('ID', sql.Int, id)
                .query('DELETE FROM QualityExceptions WHERE ID = @ID');
            res.json({ success: true, message: '删除成功' });
        });
    } catch (error) {
        console.error('删除异常单失败:', error);
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

module.exports = router;
