/**
 * 测试API的完整数据查询逻辑
 * 重现API实际执行的查询，找出返回0条数据的原因
 */

const { getConnection, sql } = require('./db');

/**
 * 测试API的完整数据查询
 */
async function testApiDataQuery() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 模拟API的参数
        const page = 1;
        const pageSize = 20;
        const whereClause = '1=1';
        const offset = (page - 1) * pageSize;
        const orderByField = 'ar.AssessmentDate';
        const orderDirection = 'DESC';

        console.log(`\n=== API参数 ===`);
        console.log(`page: ${page}, pageSize: ${pageSize}, offset: ${offset}`);
        console.log(`whereClause: ${whereClause}`);
        console.log(`orderBy: ${orderByField} ${orderDirection}`);

        // 1. 测试COUNT查询（已知能返回32）
        console.log('\n=== 1. 测试COUNT查询 ===');
        const countQuery = `
            SELECT COUNT(*) as total
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id AND ar.SourceType = 'exception'
            WHERE ${whereClause}
        `;
        
        const countResult = await pool.request().query(countQuery);
        console.log(`COUNT查询结果: ${countResult.recordset[0].total}`);

        // 2. 测试API的完整数据查询（使用CTE分页）
        console.log('\n=== 2. 测试API的完整数据查询 ===');
        
        const dataQuery = `
            WITH PagedResults AS (
                SELECT 
                    ar.ID as id,
                    ar.PersonName as employeeName,
                    COALESCE(cr.Workshop, prr.Workshop, pe.responsible_unit) as department,
                    ar.PersonType as position,
                    COALESCE(CAST(cr.ID AS NVARCHAR), prr.OrderNo, pe.work_order_number) as complaintNumber,
                    COALESCE(cr.ID, prr.ID, pe.id) as complaintId,
                    ar.AssessmentAmount as assessmentAmount,
                    CONVERT(VARCHAR(10), ar.AssessmentDate, 120) as assessmentDate,
                    ar.Status as status,
                    CONVERT(VARCHAR(10), ar.ImprovementStartDate, 120) as improvementStartDate,
                    CONVERT(VARCHAR(10), ar.ImprovementEndDate, 120) as improvementEndDate,
                    CONVERT(VARCHAR(10), ar.ReturnDate, 120) as returnDate,
                    ar.Remarks as remarks,
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
                    END as customerName,
                    CASE 
                        WHEN ar.SourceType = 'complaint' THEN cr.ProductName
                        WHEN ar.SourceType = 'rework' THEN prr.ProductName
                        WHEN ar.SourceType = 'exception' THEN pe.product_name
                        ELSE ''
                    END as productModel,
                    ROW_NUMBER() OVER (ORDER BY ${orderByField} ${orderDirection}) as RowNum
                FROM AssessmentRecords ar
                LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
                LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
                LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id AND ar.SourceType = 'exception'
                WHERE ${whereClause}
            )
            SELECT 
                id, employeeName, department, position, complaintNumber, complaintId,
                assessmentAmount, assessmentDate, status, improvementStartDate, 
                improvementEndDate, returnDate, remarks, sourceType, sourceDescription,
                customerName, productModel
            FROM PagedResults
            WHERE RowNum > ${offset} AND RowNum <= (${offset} + ${pageSize})
        `;

        console.log('执行的数据查询:');
        console.log(dataQuery);

        try {
            const dataResult = await pool.request().query(dataQuery);
            console.log(`\n数据查询结果数: ${dataResult.recordset.length}`);
            
            if (dataResult.recordset.length > 0) {
                console.log('\n前3条记录:');
                dataResult.recordset.slice(0, 3).forEach((record, index) => {
                    console.log(`${index + 1}. ID: ${record.id}, 员工: ${record.employeeName}, 部门: ${record.department}, 金额: ${record.assessmentAmount}`);
                });
            } else {
                console.log('数据查询返回0条记录！');
            }
        } catch (error) {
            console.log(`数据查询失败: ${error.message}`);
            
            // 如果查询失败，尝试简化的查询
            console.log('\n=== 3. 尝试简化的数据查询 ===');
            
            const simplifiedDataQuery = `
                SELECT TOP ${pageSize}
                    ar.ID as id,
                    ar.PersonName as employeeName,
                    ar.PersonType as position,
                    ar.AssessmentAmount as assessmentAmount,
                    CONVERT(VARCHAR(10), ar.AssessmentDate, 120) as assessmentDate,
                    ar.Status as status,
                    ar.SourceType as sourceType
                FROM AssessmentRecords ar
                WHERE ${whereClause}
                ORDER BY ${orderByField} ${orderDirection}
                OFFSET ${offset} ROWS
            `;
            
            console.log('简化的数据查询:');
            console.log(simplifiedDataQuery);
            
            try {
                const simplifiedResult = await pool.request().query(simplifiedDataQuery);
                console.log(`简化查询结果数: ${simplifiedResult.recordset.length}`);
                
                if (simplifiedResult.recordset.length > 0) {
                    console.log('前3条记录:');
                    simplifiedResult.recordset.slice(0, 3).forEach((record, index) => {
                        console.log(`${index + 1}. ID: ${record.id}, 员工: ${record.employeeName}, 金额: ${record.assessmentAmount}`);
                    });
                }
            } catch (simpleError) {
                console.log(`简化查询也失败: ${simpleError.message}`);
            }
        }

    } catch (error) {
        console.error('测试API数据查询时出错:', error);
    }
}

// 运行测试
testApiDataQuery();