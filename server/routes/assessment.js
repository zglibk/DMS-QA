/**
 * 质量考核管理API路由
 * 实现考核记录的增删改查、改善期返还等功能
 */

const express = require('express');
const router = express.Router();
const { sql, config, getDynamicConfig } = require('../db');

/**
 * 获取考核记录列表
 * 支持分页、筛选、排序，整合ComplaintRegister、ProductionReworkRegister、publishing_exceptions三个表的数据
 */
router.get('/records', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        
        // 获取查询参数
        const {
            page = 1,
            pageSize = 20,
            employeeName,
            department,
            status,
            startDate,
            endDate,
            position,
            sourceType,
            complaintNumber,
            customerCode,
            customerName,
            minAmount,
            sortBy = 'assessmentDate',
            sortOrder = 'DESC'
        } = req.query;
        
        // 构建WHERE条件
        let whereConditions = ['1=1'];
        const request = pool.request();
        
        if (employeeName) {
            whereConditions.push('(ar.PersonName LIKE @employeeName)');
            request.input('employeeName', sql.NVarChar, `%${employeeName}%`);
        }
        
        if (department) {
            whereConditions.push('(cr.Workshop LIKE @department OR prr.Workshop LIKE @department OR pe.responsible_unit LIKE @department)');
            request.input('department', sql.NVarChar, `%${department}%`);
        }
        
        if (status) {
            whereConditions.push('ar.Status = @status');
            request.input('status', sql.NVarChar, status);
        }
        
        if (startDate) {
            whereConditions.push('ar.AssessmentDate >= @startDate');
            request.input('startDate', sql.Date, startDate);
        }
        
        if (endDate) {
            whereConditions.push('ar.AssessmentDate <= @endDate');
            request.input('endDate', sql.Date, endDate);
        }
        
        if (position) {
            // 映射前端责任类型值到数据库值
            let dbPersonType;
            switch(position) {
                case 'direct':
                    dbPersonType = 'MainPerson';
                    break;
                case 'management':
                    dbPersonType = 'Manager';
                    break;
                case 'joint':
                    dbPersonType = 'SecondPerson';
                    break;
                default:
                    dbPersonType = position; // 兼容直接传递数据库值的情况
            }
            whereConditions.push('ar.PersonType = @position');
            request.input('position', sql.NVarChar, dbPersonType);
        }
        
        if (sourceType) {
            whereConditions.push('ar.SourceType = @sourceType');
            request.input('sourceType', sql.NVarChar, sourceType);
        }
        
        if (complaintNumber) {
            whereConditions.push('(cr.OrderNo LIKE @complaintNumber OR prr.OrderNo LIKE @complaintNumber OR pe.work_order_number LIKE @complaintNumber)');
            request.input('complaintNumber', sql.NVarChar, `%${complaintNumber}%`);
        }
        
        if (customerCode) {
            whereConditions.push('(cr.Customer = @customerCode OR prr.CustomerCode = @customerCode OR pe.customer_code = @customerCode)');
            request.input('customerCode', sql.NVarChar, customerCode);
        }
        
        if (customerName) {
            whereConditions.push('(cr.Customer LIKE @customerName OR prr.CustomerCode LIKE @customerName OR pe.customer_code LIKE @customerName)');
            request.input('customerName', sql.NVarChar, `%${customerName}%`);
        }
        
        if (minAmount) {
            whereConditions.push('ar.AssessmentAmount >= @minAmount');
            request.input('minAmount', sql.Decimal(10, 2), parseFloat(minAmount));
        }

        const whereClause = whereConditions.join(' AND ');
        
        // 计算分页偏移量
        const offset = (page - 1) * pageSize;
        request.input('offset', sql.Int, offset);
        request.input('pageSize', sql.Int, parseInt(pageSize));
        
        // 查询总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id AND ar.SourceType = 'exception'
            WHERE ${whereClause}
        `;
        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;
        
        // 安全处理排序字段
        const validSortFields = {
            'assessmentDate': 'ar.AssessmentDate',
            'employeeName': 'ar.PersonName',
            'department': 'COALESCE(cr.Workshop, prr.Workshop, pe.responsible_unit)',
            'assessmentAmount': 'ar.AssessmentAmount',
            'status': 'ar.Status'
        };
        
        const orderByField = validSortFields[sortBy] || 'ar.AssessmentDate';
        const orderDirection = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        // 查询数据 - 整合三个表的信息 (SQL Server 2008R2兼容版本)
        const dataQuery = `
            WITH PagedResults AS (
                SELECT 
                    ar.ID as id,
                    ar.PersonName as employeeName,
                    COALESCE(cr.Workshop, prr.Workshop, pe.responsible_unit) as department,
                    ar.PersonType as position,
                    ar.ResponsibilityType as responsibilityType,
                    COALESCE(cr.OrderNo, prr.OrderNo, pe.work_order_number) as complaintNumber,
                    COALESCE(cr.ID, prr.ID, pe.id) as complaintId,
                    ar.AssessmentAmount as assessmentAmount,
                    CONVERT(VARCHAR(10), ar.AssessmentDate, 120) as assessmentDate,
                    ar.Status as status,
                    CONVERT(VARCHAR(10), ar.ImprovementStartDate, 120) as improvementStartDate,
                    CONVERT(VARCHAR(10), ar.ImprovementEndDate, 120) as improvementEndDate,
                    CONVERT(VARCHAR(10), ar.ReturnDate, 120) as returnDate,
                    ar.Remarks as assessmentRemarks,
                    -- 只映射ComplaintRegister表的AssessmentDescription字段到remarks
                    cr.AssessmentDescription as remarks,
                    ar.SourceType as sourceType,
                    -- 来源表的详细信息
                    CASE 
                        WHEN ar.SourceType = 'complaint' THEN cr.DefectiveDescription
                        WHEN ar.SourceType = 'rework' THEN prr.DefectiveReason
                        WHEN ar.SourceType = 'exception' THEN pe.exception_description
                        ELSE ''
                    END as sourceDescription,
                    CASE 
                        WHEN ar.SourceType = 'complaint' THEN cr.Customer
                        WHEN ar.SourceType = 'rework' THEN prr.CustomerCode
                        WHEN ar.SourceType = 'exception' THEN pe.customer_code
                        ELSE ''
                    END as customerCode,
                    CASE 
                        WHEN ar.SourceType = 'complaint' THEN cr.ProductName
                        WHEN ar.SourceType = 'rework' THEN prr.ProductName
                        WHEN ar.SourceType = 'exception' THEN pe.product_name
                        ELSE ''
                    END as productName,
                    ROW_NUMBER() OVER (ORDER BY ${orderByField} ${orderDirection}) as RowNum
                FROM AssessmentRecords ar
                LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
                LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
                LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id AND ar.SourceType = 'exception'
                WHERE ${whereClause}
            )
            SELECT 
                id, employeeName, department, position, responsibilityType, complaintNumber, complaintId,
                assessmentAmount, assessmentDate, status, improvementStartDate, 
                improvementEndDate, returnDate, assessmentRemarks, remarks, sourceType, sourceDescription,
                customerCode, productName
            FROM PagedResults
            WHERE RowNum > @offset AND RowNum <= (@offset + @pageSize)
        `;
        
        const dataResult = await request.query(dataQuery);
        
        const responseData = {
            success: true,
            data: {
                records: dataResult.recordset,
                pagination: {
                    page: parseInt(page),
                    pageSize: parseInt(pageSize),
                    total: total,
                    totalPages: Math.ceil(total / pageSize)
                }
            }
        };
        
        res.json(responseData);
        
    } catch (error) {
        console.error('获取考核记录失败:', error);
        res.status(500).json({
            success: false,
            message: '获取考核记录失败',
            error: error.message
        });
    }
});

/**
 * 获取单个考核记录详情
 */
router.get('/records/:id', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        request.input('id', sql.Int, req.params.id);
        
        const query = `
            SELECT 
                ar.*,
                -- 投诉记录字段
                cr.ID as ComplaintRecordID,
                cr.Workshop,
                cr.DefectiveCategory as ComplaintCategory,
                cr.DefectiveCategory,
                cr.DefectiveDescription as ComplaintProblemDescription,
                cr.Customer,
                cr.ProductName as ComplaintProductName,
                cr.OrderNo as ComplaintOrderNo,
                -- 返工记录字段  
                prr.ID as ReworkID,
                prr.DefectiveReason as ReworkProblemDescription,
                prr.ProductName as ReworkProductName,
                prr.OrderNo as ReworkOrderNo,
                prr.CustomerCode as ReworkCustomerCode,
                prr.Workshop as ReworkDepartment,
                -- 出版异常记录字段
                pe.id as ExceptionID,
                pe.exception_description as ExceptionProblemDescription,
                pe.product_name as ExceptionProductName,
                pe.work_order_number as ExceptionOrderNo,
                pe.customer_code as ExceptionCustomerCode,
                pe.responsible_unit as ExceptionDepartment,
                -- 统一的问题描述字段（根据来源类型选择）
                CASE 
                    WHEN ar.SourceType = 'complaint' THEN cr.DefectiveDescription
                    WHEN ar.SourceType = 'rework' THEN prr.DefectiveReason  
                    WHEN ar.SourceType = 'exception' THEN pe.exception_description
                    ELSE ar.ProblemDescription
                END as problemDescription,
                -- 统一的订单号字段
                CASE 
                    WHEN ar.SourceType = 'complaint' THEN cr.OrderNo
                    WHEN ar.SourceType = 'rework' THEN prr.OrderNo
                    WHEN ar.SourceType = 'exception' THEN pe.work_order_number
                    ELSE ar.ComplaintNumber
                END as orderNumber,
                -- 统一的部门字段（根据来源类型选择）
                CASE 
                    WHEN ar.SourceType = 'complaint' THEN cr.Workshop
                    WHEN ar.SourceType = 'rework' THEN prr.Workshop
                    WHEN ar.SourceType = 'exception' THEN pe.responsible_unit
                    ELSE ar.Department
                END as department,
                -- 统一的客户代码字段（根据来源类型选择）
                CASE 
                    WHEN ar.SourceType = 'complaint' THEN cr.Customer
                    WHEN ar.SourceType = 'rework' THEN prr.CustomerCode
                    WHEN ar.SourceType = 'exception' THEN pe.customer_code
                    ELSE ar.CustomerCode
                END as customerCode,
                -- 统一的产品名称字段（根据来源类型选择）
                CASE 
                    WHEN ar.SourceType = 'complaint' THEN cr.ProductName
                    WHEN ar.SourceType = 'rework' THEN prr.ProductName
                    WHEN ar.SourceType = 'exception' THEN pe.product_name
                    ELSE ar.ProductName
                END as productName
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id AND ar.SourceType = 'exception'
            WHERE ar.ID = @id
        `;
        
        const result = await request.query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '考核记录不存在'
            });
        }
        
        const record = result.recordset[0];
        
        // 修复remarks字段映射：如果考核记录的Remarks为空，则从来源记录中获取考核说明
        if (!record.Remarks) {
            if (record.SourceType === 'complaint' && record.ComplaintID) {
                // 从投诉记录获取AssessmentDescription作为remarks
                const complaintRequest = pool.request();
                // 直接使用考核记录表中的ComplaintID字段（这是外键）
                complaintRequest.input('complaintId', sql.Int, record.ComplaintID);
                const complaintResult = await complaintRequest.query(`
                    SELECT AssessmentDescription 
                    FROM ComplaintRegister 
                    WHERE ID = @complaintId
                `);
                
                if (complaintResult.recordset.length > 0 && complaintResult.recordset[0].AssessmentDescription) {
                    record.remarks = complaintResult.recordset[0].AssessmentDescription;
                    console.log('从投诉记录映射remarks:', record.remarks);
                }
            }
            // 可以在这里添加其他来源类型的remarks映射逻辑
        } else {
            record.remarks = record.Remarks;
        }
        
        // 添加调试日志，特别关注返工记录和异常记录的字段
        console.log('=== 考核记录详情API调试信息 ===');
        console.log('记录ID:', req.params.id);
        console.log('来源类型:', record.SourceType);
        console.log('原始Remarks字段:', record.Remarks);
        console.log('映射后remarks字段:', record.remarks);
        console.log('部门字段 (department):', record.department);
        console.log('客户代码字段 (customerCode):', record.customerCode);
        console.log('产品名称字段 (productName):', record.productName);
        console.log('Workshop字段:', record.Workshop);
        console.log('Customer字段:', record.Customer);
        
        // 如果是返工记录，输出返工相关字段
        if (record.SourceType === 'rework') {
            console.log('--- 返工记录字段 ---');
            console.log('ReworkDepartment:', record.ReworkDepartment);
            console.log('ReworkCustomerCode:', record.ReworkCustomerCode);
            console.log('ReworkProductName:', record.ReworkProductName);
        }
        
        // 如果是异常记录，输出异常相关字段
        if (record.SourceType === 'exception') {
            console.log('--- 异常记录字段 ---');
            console.log('ExceptionDepartment:', record.ExceptionDepartment);
            console.log('ExceptionCustomerCode:', record.ExceptionCustomerCode);
            console.log('ExceptionProductName:', record.ExceptionProductName);
        }
        
        console.log('完整记录数据:', JSON.stringify(record, null, 2));
        console.log('=== 调试信息结束 ===');
        
        res.json({
            success: true,
            data: record
        });
        
    } catch (error) {
        console.error('获取考核记录详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取考核记录详情失败',
            error: error.message
        });
    }
});

/**
 * 创建考核记录
 */
router.post('/records', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        
        const {
            complaintID,
            personName,
            personType,
            assessmentAmount,
            assessmentDate,
            remarks,
            createdBy
        } = req.body;
        
        // 验证必填字段
        if (!complaintID || !personName || !personType || !assessmentAmount || !assessmentDate) {
            return res.status(400).json({
                success: false,
                message: '缺少必填字段'
            });
        }
        
        // 检查是否已存在相同的考核记录
        request.input('complaintID', sql.Int, complaintID);
        request.input('personType', sql.NVarChar, personType);
        
        const checkQuery = `
            SELECT COUNT(*) as count
            FROM AssessmentRecords
            WHERE ComplaintID = @complaintID AND PersonType = @personType
        `;
        
        const checkResult = await request.query(checkQuery);
        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: '该投诉记录的此类型考核记录已存在'
            });
        }
        
        // 插入新记录
        request.input('personName', sql.NVarChar, personName);
        request.input('assessmentAmount', sql.Decimal(10, 2), assessmentAmount);
        request.input('assessmentDate', sql.Date, assessmentDate);
        request.input('remarks', sql.NVarChar, remarks || null);
        request.input('createdBy', sql.NVarChar, createdBy || null);
        request.input('status', sql.NVarChar, 'pending'); // 默认状态为pending
        request.input('sourceType', sql.NVarChar, 'complaint'); // 默认来源类型为complaint
        
        const insertQuery = `
            INSERT INTO AssessmentRecords 
            (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, Remarks, CreatedBy, Status, SourceType)
            OUTPUT INSERTED.ID
            VALUES 
            (@complaintID, @personName, @personType, @assessmentAmount, @assessmentDate, @remarks, @createdBy, @status, @sourceType)
        `;
        
        const result = await request.query(insertQuery);
        const newId = result.recordset[0].ID;
        
        res.json({
            success: true,
            message: '考核记录创建成功',
            data: { id: newId }
        });
        
    } catch (error) {
        console.error('创建考核记录失败:', error);
        res.status(500).json({
            success: false,
            message: '创建考核记录失败',
            error: error.message
        });
    }
});

/**
 * 更新考核记录
 */
router.put('/records/:id', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        
        const {
            personName,
            assessmentAmount,
            assessmentDate,
            status,
            remarks,
            updatedBy,
            // 新添加的字段
            department,
            responsibilityType,
            sourceType,
            complaintNumber,  // 修正字段名
            customerCode,
            productName,
            problemDescription,
            improvementStartDate,
            improvementEndDate,
            returnDate,
            returnAmount
        } = req.body;
        
        // 验证必填字段
        if (!personName || personName.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'PersonName字段不能为空'
            });
        }
        
        request.input('id', sql.Int, req.params.id);
        request.input('personName', sql.NVarChar, personName.trim());
        request.input('assessmentAmount', sql.Decimal(10, 2), assessmentAmount);
        request.input('assessmentDate', sql.Date, assessmentDate);
        request.input('status', sql.NVarChar, status || 'Active');
        request.input('remarks', sql.NVarChar, remarks || null);
        request.input('updatedBy', sql.NVarChar, updatedBy || null);
        
        // 新添加字段的参数
        request.input('department', sql.NVarChar, department || null);
        request.input('responsibilityType', sql.NVarChar, responsibilityType || null);
        request.input('sourceType', sql.NVarChar, sourceType || null);
        request.input('complaintNumber', sql.NVarChar, complaintNumber || null);  // 修正字段名
        request.input('customerCode', sql.NVarChar, customerCode || null);
        request.input('productName', sql.NVarChar, productName || null);
        request.input('problemDescription', sql.NVarChar, problemDescription || null);
        request.input('improvementStartDate', sql.Date, improvementStartDate || null);
        request.input('improvementEndDate', sql.Date, improvementEndDate || null);
        request.input('returnDate', sql.Date, returnDate || null);
        request.input('returnAmount', sql.Decimal(10, 2), returnAmount || null);
        
        const updateQuery = `
            UPDATE AssessmentRecords
            SET 
                PersonName = @personName,
                AssessmentAmount = @assessmentAmount,
                AssessmentDate = @assessmentDate,
                Status = @status,
                Remarks = @remarks,
                UpdatedBy = @updatedBy,
                UpdatedAt = GETDATE(),
                Department = @department,
                ResponsibilityType = @responsibilityType,
                SourceType = @sourceType,
                ComplaintNumber = @complaintNumber,
                CustomerCode = @customerCode,
                ProductName = @productName,
                ProblemDescription = @problemDescription,
                ImprovementStartDate = @improvementStartDate,
                ImprovementEndDate = @improvementEndDate,
                ReturnDate = @returnDate,
                ReturnAmount = @returnAmount
            WHERE ID = @id
        `;
        
        const result = await request.query(updateQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: '考核记录不存在'
            });
        }
        
        res.json({
            success: true,
            message: '考核记录更新成功'
        });
        
    } catch (error) {
        console.error('更新考核记录失败:', error);
        res.status(500).json({
            success: false,
            message: '更新考核记录失败',
            error: error.message
        });
    }
});

/**
 * 删除考核记录
 */
router.delete('/records/:id', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        request.input('id', sql.Int, req.params.id);
        
        const deleteQuery = `
            DELETE FROM AssessmentRecords
            WHERE ID = @id
        `;
        
        const result = await request.query(deleteQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: '考核记录不存在'
            });
        }
        
        res.json({
            success: true,
            message: '考核记录删除成功'
        });
        
    } catch (error) {
        console.error('删除考核记录失败:', error);
        res.status(500).json({
            success: false,
            message: '删除考核记录失败',
            error: error.message
        });
    }
});

/**
 * 生成考核记录
 * 从ComplaintRegister、ProductionReworkRegister、publishing_exceptions三个表自动生成考核记录
 * 支持重置自增ID功能和重复记录检查
 */
router.post('/generate', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        
        const { startDate, endDate, resetRecords = false, resetAutoIncrement = false } = req.body;
        
        console.log('生成考核记录请求参数:', { startDate, endDate, resetRecords, resetAutoIncrement });
        
        // 如果不是重置记录模式，先检查是否存在重复记录
        if (!resetRecords) {
            try {
                // 检查指定日期范围内是否已存在考核记录
                const checkRequest = pool.request();
                checkRequest.input('startDate', sql.Date, startDate);
                checkRequest.input('endDate', sql.Date, endDate);
                
                const checkResult = await checkRequest.query(`
                    SELECT DISTINCT 
                        ar.PersonName,
                        CONVERT(VARCHAR(7), ar.AssessmentDate, 120) as AssessmentMonth
                    FROM AssessmentRecords ar
                    WHERE ar.AssessmentDate >= @startDate 
                    AND ar.AssessmentDate <= @endDate
                    ORDER BY ar.PersonName, AssessmentMonth
                `);
                
                if (checkResult.recordset && checkResult.recordset.length > 0) {
                    // 返回重复记录信息，让前端处理确认逻辑
                    return res.json({
                        success: false,
                        isDuplicate: true,
                        message: '发现重复的考核记录',
                        duplicateRecords: checkResult.recordset,
                        data: {
                            count: checkResult.recordset.length,
                            records: checkResult.recordset
                        }
                    });
                }
                
            } catch (checkError) {
                console.error('检查重复记录失败:', checkError);
                return res.status(500).json({
                    success: false,
                    message: '检查重复记录失败：' + checkError.message,
                    error: checkError.message
                });
            }
        }
        
        // 如果是重置记录模式，先删除所有现有记录
        if (resetRecords) {
            try {
                console.log('删除所有现有考核记录...');
                
                const deleteRequest = pool.request();
                
                // 删除所有考核记录，不限制日期范围
                const deleteResult = await deleteRequest.query(`
                    DELETE FROM AssessmentRecords
                `);
                
                console.log('删除记录数量:', deleteResult.rowsAffected[0]);
            } catch (deleteError) {
                console.error('删除现有记录失败:', deleteError);
                return res.status(500).json({
                    success: false,
                    message: '删除现有记录失败：' + deleteError.message,
                    error: deleteError.message
                });
            }
        }
        
        // 如果需要重置自增ID，执行重置操作（仅在重置记录模式下可用）
        if (resetAutoIncrement && resetRecords) {
            try {
                // 重置自增ID的SQL语句
                await request.query(`
                    DECLARE @MaxID INT;
                    SELECT @MaxID = ISNULL(MAX(ID), 0) FROM AssessmentRecords;
                    DBCC CHECKIDENT('AssessmentRecords', RESEED, @MaxID);
                `);
                
            } catch (resetError) {
                console.error('重置自增ID失败:', resetError);
                return res.status(500).json({
                    success: false,
                    message: '重置自增ID失败：' + resetError.message,
                    error: resetError.message
                });
            }
        }
        
        // 调用存储过程生成考核记录（新版本不需要参数）
        // 新版本的存储过程会自动处理所有未生成的考核记录
        const result = await request.execute('SP_GenerateAssessmentRecords');
        
        // 获取生成记录数量（新版本通过SELECT返回）
        let generatedCount = 0;
        if (result.recordset && result.recordset.length > 0 && result.recordset[0].GeneratedCount !== undefined) {
            generatedCount = result.recordset[0].GeneratedCount;
        }
        
        // 生成记录后，更新改善期字段
        // 业务规则：
        // 1. 登记日期（AssessmentDate）计入当月
        // 2. 改善期开始：登记日期次月第一天
        // 3. 改善期结束：登记日期后第三个月最后一天
        // 4. 返还日期：登记日期后第四个月第一天
        const updateImprovementQuery = `
            UPDATE AssessmentRecords 
            SET 
                -- 改善期开始：考核日期次月第一天
                ImprovementStartDate = CASE 
                    WHEN MONTH(AssessmentDate) = 12 
                    THEN CONVERT(DATE, CONVERT(VARCHAR(4), YEAR(AssessmentDate) + 1) + '-01-01')
                    ELSE CONVERT(DATE, CONVERT(VARCHAR(4), YEAR(AssessmentDate)) + '-' + 
                         RIGHT('0' + CONVERT(VARCHAR(2), MONTH(AssessmentDate) + 1), 2) + '-01')
                END,
                
                -- 改善期结束：考核日期后第三个月最后一天
                ImprovementEndDate = CASE 
                    WHEN MONTH(AssessmentDate) >= 10 
                    THEN DATEADD(DAY, -1, DATEADD(MONTH, 1, 
                         CONVERT(DATE, CONVERT(VARCHAR(4), YEAR(AssessmentDate) + 1) + '-' + 
                         RIGHT('0' + CONVERT(VARCHAR(2), MONTH(AssessmentDate) - 9), 2) + '-01')))
                    ELSE DATEADD(DAY, -1, DATEADD(MONTH, 1, 
                         CONVERT(DATE, CONVERT(VARCHAR(4), YEAR(AssessmentDate)) + '-' + 
                         RIGHT('0' + CONVERT(VARCHAR(2), MONTH(AssessmentDate) + 3), 2) + '-01')))
                END,
                
                -- 返还日期：考核日期后第四个月第一天
                ReturnDate = CASE 
                    WHEN MONTH(AssessmentDate) >= 9 
                    THEN CONVERT(DATE, CONVERT(VARCHAR(4), YEAR(AssessmentDate) + 1) + '-' + 
                         RIGHT('0' + CONVERT(VARCHAR(2), MONTH(AssessmentDate) - 8), 2) + '-01')
                    ELSE CONVERT(DATE, CONVERT(VARCHAR(4), YEAR(AssessmentDate)) + '-' + 
                         RIGHT('0' + CONVERT(VARCHAR(2), MONTH(AssessmentDate) + 4), 2) + '-01')
                END,
                
                UpdatedAt = GETDATE()
            WHERE AssessmentDate BETWEEN @StartDate AND @EndDate
                AND (ImprovementStartDate IS NULL OR ImprovementEndDate IS NULL OR ReturnDate IS NULL)
        `;
         
         const updateRequest = pool.request();
         updateRequest.input('StartDate', sql.Date, startDate);
         updateRequest.input('EndDate', sql.Date, endDate);
         await updateRequest.query(updateImprovementQuery);
        
        console.log('考核记录生成完成，已更新改善期字段');

        let message = `成功生成 ${generatedCount} 条考核记录`;
        if (resetRecords) {
            message += '（已重置现有记录）';
        }
        if (resetAutoIncrement && resetRecords) {
            message += '（已重置自增ID）';
        }
        
        res.json({
            success: true,
            message,
            data: { 
                generatedCount,
                resetAutoIncrement 
            }
        });
        
    } catch (error) {
        console.error('生成考核记录失败:', error);
        res.status(500).json({
            success: false,
            message: '生成考核记录失败',
            error: error.message
        });
    }
});

/**
 * 处理改善期返还
 */
router.post('/process-returns', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        
        const { processMonth } = req.body;
        
        if (processMonth) {
            request.input('processMonth', sql.Int, processMonth);
        }
        
        // 调用存储过程处理返还
        const result = await request.execute('SP_ProcessImprovementReturns');
        const processedCount = result.recordset[0].ProcessedReturns;
        
        res.json({
            success: true,
            message: `成功处理 ${processedCount} 条返还记录`,
            data: { processedCount }
        });
        
    } catch (error) {
        console.error('处理改善期返还失败:', error);
        res.status(500).json({
            success: false,
            message: '处理改善期返还失败',
            error: error.message
        });
    }
});

/**
 * 手动返还考核记录
 */
router.post('/records/:id/return', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        
        const { returnAmount, returnReason, operatorName } = req.body;
        
        request.input('id', sql.Int, req.params.id);
        request.input('returnAmount', sql.Decimal(10, 2), returnAmount);
        request.input('returnReason', sql.NVarChar, returnReason || '手动返还');
        request.input('operatorName', sql.NVarChar, operatorName || null);
        
        // 检查记录是否存在且未返还
        const checkQuery = `
            SELECT AssessmentAmount, IsReturned, Status
            FROM AssessmentRecords
            WHERE ID = @id
        `;
        
        const checkResult = await request.query(checkQuery);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '考核记录不存在'
            });
        }
        
        const record = checkResult.recordset[0];
        if (record.IsReturned) {
            return res.status(400).json({
                success: false,
                message: '该记录已经返还过了'
            });
        }
        
        // 如果没有指定返还金额，使用原考核金额
        const finalReturnAmount = returnAmount || record.AssessmentAmount;
        
        // 更新返还信息
        const updateQuery = `
            UPDATE AssessmentRecords
            SET 
                IsReturned = 1,
                ReturnDate = GETDATE(),
                ReturnAmount = @returnAmount,
                ReturnReason = @returnReason,
                Status = 'Returned',
                UpdatedBy = @operatorName,
                UpdatedAt = GETDATE()
            WHERE ID = @id
        `;
        
        request.input('returnAmount', sql.Decimal(10, 2), finalReturnAmount);
        await request.query(updateQuery);
        
        res.json({
            success: true,
            message: '返还处理成功',
            data: { returnAmount: finalReturnAmount }
        });
        
    } catch (error) {
        console.error('处理返还失败:', error);
        res.status(500).json({
            success: false,
            message: '处理返还失败',
            error: error.message
        });
    }
});

/**
 * 获取考核统计数据
 * 整合ComplaintRegister、ProductionReworkRegister、publishing_exceptions三个表的统计信息
 */
router.get('/statistics', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        
        const { year, month, employeeName, department } = req.query;
        
        let whereConditions = ['1=1'];
        
        if (year) {
            whereConditions.push('YEAR(ar.AssessmentDate) = @year');
            request.input('year', sql.Int, year);
        }
        
        if (month) {
            whereConditions.push('MONTH(ar.AssessmentDate) = @month');
            request.input('month', sql.Int, month);
        }
        
        if (employeeName) {
            whereConditions.push('ar.PersonName LIKE @employeeName');
            request.input('employeeName', sql.NVarChar, `%${employeeName}%`);
        }
        
        if (department) {
            whereConditions.push('(cr.Workshop LIKE @department OR prr.Workshop LIKE @department OR pe.responsible_unit LIKE @department)');
            request.input('department', sql.NVarChar, `%${department}%`);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // 获取各状态统计
        const statusQuery = `
            SELECT 
                ar.Status,
                COUNT(*) as count,
                SUM(ar.AssessmentAmount) as totalAmount
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id AND ar.SourceType = 'exception'
            WHERE ${whereClause}
            GROUP BY ar.Status
        `;
        
        const statusResult = await request.query(statusQuery);
        
        // 初始化统计数据
        const statistics = {
            pendingCount: 0,
            improvingCount: 0,
            returnedCount: 0,
            confirmedCount: 0,
            exemptCount: 0,  // 新增免考核状态统计
            totalAmount: 0,
            sourceTypeStats: {
                complaint: { count: 0, amount: 0 },
                rework: { count: 0, amount: 0 },
                exception: { count: 0, amount: 0 }
            }
        };
        
        // 处理状态统计
        statusResult.recordset.forEach(row => {
            const amount = parseFloat(row.totalAmount) || 0;
            statistics.totalAmount += amount;
            
            switch (row.Status) {
                case 'pending':
                    statistics.pendingCount = row.count;
                    break;
                case 'improving':
                    statistics.improvingCount = row.count;
                    break;
                case 'returned':
                    statistics.returnedCount = row.count;
                    break;
                case 'confirmed':
                    statistics.confirmedCount = row.count;
                    break;
                case 'exempt':  // 新增免考核状态处理
                    statistics.exemptCount = row.count;
                    break;
            }
        });
        
        // 获取来源类型统计
        const sourceTypeQuery = `
            SELECT 
                ar.SourceType,
                COUNT(*) as count,
                SUM(ar.AssessmentAmount) as totalAmount
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id AND ar.SourceType = 'exception'
            WHERE ${whereClause}
            GROUP BY ar.SourceType
        `;
        
        const sourceTypeResult = await request.query(sourceTypeQuery);
        
        // 处理来源类型统计
        sourceTypeResult.recordset.forEach(row => {
            const sourceType = row.SourceType;
            if (statistics.sourceTypeStats[sourceType]) {
                statistics.sourceTypeStats[sourceType] = {
                    count: row.count,
                    amount: parseFloat(row.totalAmount) || 0
                };
            }
        });
        
        res.json({
            success: true,
            data: statistics
        });
        
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取统计数据失败',
            error: error.message
        });
    }
});

/**
 * 获取人员列表（用于下拉选择）
 */
router.get('/persons', async (req, res) => {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        const request = pool.request();
        
        const query = `
            SELECT DISTINCT PersonName, PersonType
            FROM AssessmentRecords
            WHERE PersonName IS NOT NULL
            ORDER BY PersonName
        `;
        
        const result = await request.query(query);
        
        res.json({
            success: true,
            data: result.recordset
        });
        
    } catch (error) {
        console.error('获取人员列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取人员列表失败',
            error: error.message
        });
    }
});

module.exports = router;
