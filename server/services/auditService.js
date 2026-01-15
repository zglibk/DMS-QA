/**
 * 审核服务模块
 * 提供统一的审核流程处理，包括待办事项创建、审核日志记录等
 * 供来料检验、性能实验、出货检验、供应商投诉等模块调用
 */

const { getConnection, sql } = require('../db');

/**
 * 待办类型映射
 */
const TODO_TYPES = {
    SUPPLIER_COMPLAINT: 'supplier_complaint_audit',
    INCOMING_INSPECTION: 'incoming_inspection_audit',
    PERFORMANCE_INSPECTION: 'performance_audit',
    SHIPMENT_INSPECTION: 'shipment_audit'
};

/**
 * 业务类型映射
 */
const BUSINESS_TYPES = {
    SUPPLIER_COMPLAINT: 'supplier_complaint',
    INCOMING_INSPECTION: 'incoming_inspection',
    PERFORMANCE_INSPECTION: 'performance_inspection',
    SHIPMENT_INSPECTION: 'shipment_inspection'
};

/**
 * 获取部门主管作为审核人
 * @param {object} pool 数据库连接池
 * @param {number} userId 当前用户ID
 * @returns {object|null} 审核人信息 {id, name, deptId}
 */
async function getDepartmentSupervisor(pool, userId) {
    // 方案1: 尝试查找用户的上级岗位对应的人员
    try {
        const supervisorResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT TOP 1 
                    supervisor.ID as SupervisorId, 
                    supervisor.RealName as SupervisorName,
                    u.DepartmentID
                FROM [User] u
                LEFT JOIN Position p ON u.PositionID = p.ID
                LEFT JOIN Position parentPos ON p.ParentID = parentPos.ID
                LEFT JOIN [User] supervisor ON supervisor.PositionID = parentPos.ID AND supervisor.Status = 1
                WHERE u.ID = @userId AND supervisor.ID IS NOT NULL
            `);
        
        if (supervisorResult.recordset.length > 0) {
            return {
                id: supervisorResult.recordset[0].SupervisorId,
                name: supervisorResult.recordset[0].SupervisorName,
                deptId: supervisorResult.recordset[0].DepartmentID
            };
        }
    } catch (e) {
        console.log('查找上级岗位失败，尝试其他方式:', e.message);
    }
    
    // 方案2: 查找同部门的管理岗位人员
    try {
        const deptManagerResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT TOP 1 
                    manager.ID as ManagerId, 
                    manager.RealName as ManagerName,
                    u.DepartmentID
                FROM [User] u
                INNER JOIN [User] manager ON manager.DepartmentID = u.DepartmentID 
                    AND manager.ID != u.ID 
                    AND manager.Status = 1
                LEFT JOIN Position p ON manager.PositionID = p.ID
                WHERE u.ID = @userId 
                    AND (p.Level = 5 OR p.Name LIKE N'%主管%' OR p.Name LIKE N'%经理%')
                ORDER BY ISNULL(p.Level, 0) DESC
            `);
        
        if (deptManagerResult.recordset.length > 0) {
            return {
                id: deptManagerResult.recordset[0].ManagerId,
                name: deptManagerResult.recordset[0].ManagerName,
                deptId: deptManagerResult.recordset[0].DepartmentID
            };
        }
    } catch (e) {
        console.log('查找部门管理岗位失败，尝试其他方式:', e.message);
    }
    
    // 方案3: 获取管理员用户
    try {
        const adminResult = await pool.request()
            .query(`
                SELECT TOP 1 u.ID, u.RealName
                FROM [User] u
                INNER JOIN UserRoles ur ON u.ID = ur.UserID
                INNER JOIN Roles r ON ur.RoleID = r.ID
                WHERE (r.RoleCode = 'admin' OR r.RoleName LIKE N'%管理员%') AND u.Status = 1
                ORDER BY u.ID
            `);
        
        if (adminResult.recordset.length > 0) {
            return {
                id: adminResult.recordset[0].ID,
                name: adminResult.recordset[0].RealName,
                deptId: null
            };
        }
    } catch (e) {
        console.log('查找管理员失败:', e.message);
    }
    
    // 方案4: 获取任意一个有效用户（最后的兜底）
    try {
        const anyUserResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT TOP 1 ID, RealName 
                FROM [User] 
                WHERE Status = 1 AND ID != @userId
                ORDER BY ID
            `);
        
        if (anyUserResult.recordset.length > 0) {
            return {
                id: anyUserResult.recordset[0].ID,
                name: anyUserResult.recordset[0].RealName,
                deptId: null
            };
        }
    } catch (e) {
        console.log('查找兜底用户失败:', e.message);
    }
    
    return null;
}

/**
 * 根据用户名获取用户ID
 * @param {object} pool 数据库连接池
 * @param {string} username 用户名
 * @returns {object|null} 用户信息 {id, realName}
 */
async function getUserByUsername(pool, username) {
    const result = await pool.request()
        .input('username', sql.NVarChar(50), username)
        .query(`
            SELECT ID, RealName, Username 
            FROM [User] 
            WHERE Username = @username
        `);
    
    if (result.recordset.length > 0) {
        return {
            id: result.recordset[0].ID,
            realName: result.recordset[0].RealName || result.recordset[0].Username
        };
    }
    return null;
}

/**
 * 创建待办事项
 * @param {object} todoData 待办数据
 */
async function createTodoItem(todoData) {
    const pool = await getConnection();
    
    const result = await pool.request()
        .input('todoType', sql.NVarChar(50), todoData.todoType)
        .input('businessId', sql.Int, todoData.businessId)
        .input('businessNo', sql.NVarChar(50), todoData.businessNo || '')
        .input('title', sql.NVarChar(200), todoData.title)
        .input('content', sql.NVarChar(500), todoData.content || '')
        .input('priority', sql.NVarChar(20), todoData.priority || 'medium')
        .input('createdBy', sql.Int, todoData.createdBy)
        .input('createdByName', sql.NVarChar(50), todoData.createdByName || '')
        .input('assignedTo', sql.Int, todoData.assignedTo)
        .input('assignedToName', sql.NVarChar(50), todoData.assignedToName || '')
        .input('assignedDeptId', sql.Int, todoData.assignedDeptId || null)
        .input('expireTime', sql.DateTime, todoData.expireTime || null)
        .query(`
            INSERT INTO TodoItems (
                TodoType, BusinessID, BusinessNo, Title, Content, Priority,
                CreatedBy, CreatedByName, AssignedTo, AssignedToName, AssignedDeptID, ExpireTime
            ) VALUES (
                @todoType, @businessId, @businessNo, @title, @content, @priority,
                @createdBy, @createdByName, @assignedTo, @assignedToName, @assignedDeptId, @expireTime
            );
            SELECT SCOPE_IDENTITY() as ID;
        `);
    
    return result.recordset[0].ID;
}

/**
 * 完成待办事项
 * @param {number} businessId 业务ID
 * @param {string} todoType 待办类型
 * @param {string} result 处理结果
 */
async function completeTodoItem(businessId, todoType, result) {
    const pool = await getConnection();
    
    await pool.request()
        .input('businessId', sql.Int, businessId)
        .input('todoType', sql.NVarChar(50), todoType)
        .input('result', sql.NVarChar(500), result || '')
        .query(`
            UPDATE TodoItems 
            SET Status = 'completed', Result = @result, CompletedTime = GETDATE(), UpdatedAt = GETDATE()
            WHERE BusinessID = @businessId AND TodoType = @todoType AND Status = 'pending'
        `);
}

/**
 * 取消待办事项
 * @param {number} businessId 业务ID
 * @param {string} todoType 待办类型
 */
async function cancelTodoItem(businessId, todoType) {
    const pool = await getConnection();
    
    await pool.request()
        .input('businessId', sql.Int, businessId)
        .input('todoType', sql.NVarChar(50), todoType)
        .query(`
            UPDATE TodoItems 
            SET Status = 'cancelled', UpdatedAt = GETDATE()
            WHERE BusinessID = @businessId AND TodoType = @todoType AND Status = 'pending'
        `);
}

/**
 * 记录审核日志
 * @param {object} logData 日志数据
 */
async function createAuditLog(logData) {
    const pool = await getConnection();
    
    await pool.request()
        .input('businessType', sql.NVarChar(50), logData.businessType)
        .input('businessId', sql.Int, logData.businessId)
        .input('businessNo', sql.NVarChar(50), logData.businessNo || '')
        .input('action', sql.NVarChar(20), logData.action)
        .input('fromStatus', sql.NVarChar(20), logData.fromStatus || '')
        .input('toStatus', sql.NVarChar(20), logData.toStatus)
        .input('operatorId', sql.Int, logData.operatorId)
        .input('operatorName', sql.NVarChar(50), logData.operatorName || '')
        .input('remark', sql.NVarChar(500), logData.remark || '')
        .query(`
            INSERT INTO AuditLogs (BusinessType, BusinessID, BusinessNo, Action, FromStatus, ToStatus, OperatorID, OperatorName, Remark)
            VALUES (@businessType, @businessId, @businessNo, @action, @fromStatus, @toStatus, @operatorId, @operatorName, @remark)
        `);
}

/**
 * 获取审核日志
 * @param {string} businessType 业务类型
 * @param {number} businessId 业务ID
 */
async function getAuditLogs(businessType, businessId) {
    const pool = await getConnection();
    
    const result = await pool.request()
        .input('businessType', sql.NVarChar(50), businessType)
        .input('businessId', sql.Int, businessId)
        .query(`
            SELECT * FROM AuditLogs 
            WHERE BusinessType = @businessType AND BusinessID = @businessId
            ORDER BY CreatedAt DESC
        `);
    
    return result.recordset;
}

/**
 * 提交审核通用方法
 * @param {object} params 参数对象
 * @returns {object} 结果
 */
async function submitForAudit(params) {
    const { 
        pool, 
        tableName, 
        idField = 'ID',
        businessNoField = 'ReportNo',
        statusField = 'Status',
        submitTimeField = 'SubmitTime',
        businessId, 
        todoType, 
        businessType,
        titlePrefix,
        userId, 
        userName 
    } = params;
    
    // 检查记录是否存在及当前状态
    const checkResult = await pool.request()
        .input('id', sql.Int, businessId)
        .query(`
            SELECT ${idField} as ID, ${businessNoField} as BusinessNo, ${statusField} as Status, CreatedBy 
            FROM ${tableName} 
            WHERE ${idField} = @id
        `);
    
    if (checkResult.recordset.length === 0) {
        return { success: false, message: '记录不存在' };
    }
    
    const record = checkResult.recordset[0];
    
    // 只有草稿或驳回状态可以提交
    if (!['Saved', 'Rejected', 'draft', 'rejected', 'Generated', 'Draft'].includes(record.Status)) {
        return { 
            success: false, 
            message: `当前状态为"${record.Status}"，不能提交审核` 
        };
    }
    
    // 获取审核人（部门主管）
    const supervisor = await getDepartmentSupervisor(pool, userId);
    if (!supervisor) {
        return { success: false, message: '未找到审核人，请联系管理员配置部门主管' };
    }
    
    const fromStatus = record.Status;
    
    // 更新记录状态为待审核
    let updateSql = `UPDATE ${tableName} SET ${statusField} = 'Submitted'`;
    if (submitTimeField) {
        updateSql += `, ${submitTimeField} = GETDATE()`;
    }
    updateSql += `, UpdatedAt = GETDATE() WHERE ${idField} = @id`;
    
    await pool.request()
        .input('id', sql.Int, businessId)
        .query(updateSql);
    
    // 创建待办事项
    await createTodoItem({
        todoType: todoType,
        businessId: businessId,
        businessNo: record.BusinessNo,
        title: `${titlePrefix} - ${record.BusinessNo}`,
        content: `${userName}提交的${titlePrefix}待审核`,
        priority: 'high',
        createdBy: userId,
        createdByName: userName,
        assignedTo: supervisor.id,
        assignedToName: supervisor.name,
        assignedDeptId: supervisor.deptId
    });
    
    // 记录审核日志
    await createAuditLog({
        businessType: businessType,
        businessId: businessId,
        businessNo: record.BusinessNo,
        action: 'submit',
        fromStatus: fromStatus,
        toStatus: 'Submitted',
        operatorId: userId,
        operatorName: userName,
        remark: '提交审核'
    });
    
    return { 
        success: true, 
        message: '已提交审核，待办事项已发送给' + supervisor.name 
    };
}

/**
 * 审核通过通用方法
 * @param {object} params 参数对象
 * @returns {object} 结果
 */
async function approveAudit(params) {
    const { 
        pool, 
        tableName, 
        idField = 'ID',
        businessNoField = 'ReportNo',
        statusField = 'Status',
        auditorField = 'Auditor',
        auditorNameField = 'AuditorName',
        auditDateField = 'AuditDate',
        auditRemarkField = 'AuditRemark',
        businessId, 
        todoType, 
        businessType,
        userId, 
        userName,
        remark 
    } = params;
    
    // 检查记录状态
    const checkResult = await pool.request()
        .input('id', sql.Int, businessId)
        .query(`
            SELECT ${idField} as ID, ${businessNoField} as BusinessNo, ${statusField} as Status 
            FROM ${tableName} 
            WHERE ${idField} = @id
        `);
    
    if (checkResult.recordset.length === 0) {
        return { success: false, message: '记录不存在' };
    }
    
    const record = checkResult.recordset[0];
    
    if (record.Status !== 'Submitted') {
        return { 
            success: false, 
            message: `当前状态为"${record.Status}"，不能审核` 
        };
    }
    
    // 构建更新SQL
    let updateFields = [`${statusField} = 'Approved'`];
    const request = pool.request().input('id', sql.Int, businessId);
    
    if (auditorField) {
        updateFields.push(`${auditorField} = @auditor`);
        request.input('auditor', sql.NVarChar(50), userName);
    }
    if (auditorNameField) {
        updateFields.push(`${auditorNameField} = @auditorName`);
        request.input('auditorName', sql.NVarChar(50), userName);
    }
    if (auditDateField) {
        updateFields.push(`${auditDateField} = GETDATE()`);
    }
    if (auditRemarkField && remark) {
        updateFields.push(`${auditRemarkField} = @remark`);
        request.input('remark', sql.NVarChar(500), remark);
    }
    updateFields.push('UpdatedAt = GETDATE()');
    
    await request.query(`UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE ${idField} = @id`);
    
    // 完成待办事项
    await completeTodoItem(businessId, todoType, '审核通过');
    
    // 记录审核日志
    await createAuditLog({
        businessType: businessType,
        businessId: businessId,
        businessNo: record.BusinessNo,
        action: 'approve',
        fromStatus: 'Submitted',
        toStatus: 'Approved',
        operatorId: userId,
        operatorName: userName,
        remark: remark || '审核通过'
    });
    
    return { success: true, message: '审核通过' };
}

/**
 * 审核驳回通用方法
 * @param {object} params 参数对象
 * @returns {object} 结果
 */
async function rejectAudit(params) {
    const { 
        pool, 
        tableName, 
        idField = 'ID',
        businessNoField = 'ReportNo',
        statusField = 'Status',
        auditorField = 'Auditor',
        auditorNameField = 'AuditorName',
        auditDateField = 'AuditDate',
        auditRemarkField = 'AuditRemark',
        businessId, 
        todoType, 
        businessType,
        userId, 
        userName,
        remark 
    } = params;
    
    if (!remark) {
        return { success: false, message: '请填写驳回原因' };
    }
    
    // 检查记录状态
    const checkResult = await pool.request()
        .input('id', sql.Int, businessId)
        .query(`
            SELECT ${idField} as ID, ${businessNoField} as BusinessNo, ${statusField} as Status 
            FROM ${tableName} 
            WHERE ${idField} = @id
        `);
    
    if (checkResult.recordset.length === 0) {
        return { success: false, message: '记录不存在' };
    }
    
    const record = checkResult.recordset[0];
    
    if (record.Status !== 'Submitted') {
        return { 
            success: false, 
            message: `当前状态为"${record.Status}"，不能驳回` 
        };
    }
    
    // 构建更新SQL
    let updateFields = [`${statusField} = 'Rejected'`];
    const request = pool.request().input('id', sql.Int, businessId);
    
    if (auditorField) {
        updateFields.push(`${auditorField} = @auditor`);
        request.input('auditor', sql.NVarChar(50), userName);
    }
    if (auditorNameField) {
        updateFields.push(`${auditorNameField} = @auditorName`);
        request.input('auditorName', sql.NVarChar(50), userName);
    }
    if (auditDateField) {
        updateFields.push(`${auditDateField} = GETDATE()`);
    }
    if (auditRemarkField) {
        updateFields.push(`${auditRemarkField} = @remark`);
        request.input('remark', sql.NVarChar(500), remark);
    }
    updateFields.push('UpdatedAt = GETDATE()');
    
    await request.query(`UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE ${idField} = @id`);
    
    // 完成待办事项
    await completeTodoItem(businessId, todoType, '审核驳回: ' + remark);
    
    // 记录审核日志
    await createAuditLog({
        businessType: businessType,
        businessId: businessId,
        businessNo: record.BusinessNo,
        action: 'reject',
        fromStatus: 'Submitted',
        toStatus: 'Rejected',
        operatorId: userId,
        operatorName: userName,
        remark: remark
    });
    
    return { success: true, message: '已驳回' };
}

/**
 * 撤回审核通用方法
 * @param {object} params 参数对象
 * @returns {object} 结果
 */
async function revokeAudit(params) {
    const { 
        pool, 
        tableName, 
        idField = 'ID',
        businessNoField = 'ReportNo',
        statusField = 'Status',
        createdByField = 'CreatedBy',
        businessId, 
        todoType, 
        businessType,
        userId, 
        userName,
        username,  // 新增：用户名
        checkCreator = true
    } = params;
    
    // 检查记录状态及是否为创建人
    const checkResult = await pool.request()
        .input('id', sql.Int, businessId)
        .query(`
            SELECT ${idField} as ID, ${businessNoField} as BusinessNo, ${statusField} as Status, ${createdByField} as CreatedBy 
            FROM ${tableName} 
            WHERE ${idField} = @id
        `);
    
    if (checkResult.recordset.length === 0) {
        return { success: false, message: '记录不存在' };
    }
    
    const record = checkResult.recordset[0];
    
    // 检查是否为创建人（可选）
    if (checkCreator) {
        const createdBy = (record.CreatedBy || '').toLowerCase();
        const currentUsername = (username || '').toLowerCase();
        const currentUserName = (userName || '').toLowerCase();
        const currentUserId = userId ? String(userId) : '';
        
        const isCreator = 
            (createdBy && currentUsername && createdBy === currentUsername) ||
            (createdBy && currentUserName && createdBy === currentUserName) ||
            (record.CreatedBy && currentUserId && String(record.CreatedBy) === currentUserId);
        
        if (!isCreator) {
            return { success: false, message: '只有创建人可以撤回' };
        }
    }
    
    // 只有待审核状态可以撤回
    if (record.Status !== 'Submitted') {
        return { 
            success: false, 
            message: `当前状态为"${record.Status}"，不能撤回` 
        };
    }
    
    // 更新为草稿状态
    await pool.request()
        .input('id', sql.Int, businessId)
        .query(`
            UPDATE ${tableName} 
            SET ${statusField} = 'Saved', UpdatedAt = GETDATE()
            WHERE ${idField} = @id
        `);
    
    // 取消待办事项
    await cancelTodoItem(businessId, todoType);
    
    // 记录审核日志
    await createAuditLog({
        businessType: businessType,
        businessId: businessId,
        businessNo: record.BusinessNo,
        action: 'revoke',
        fromStatus: 'Submitted',
        toStatus: 'Saved',
        operatorId: userId,
        operatorName: userName,
        remark: '撤回审核'
    });
    
    return { success: true, message: '已撤回' };
}

module.exports = {
    TODO_TYPES,
    BUSINESS_TYPES,
    getDepartmentSupervisor,
    getUserByUsername,
    createTodoItem,
    completeTodoItem,
    cancelTodoItem,
    createAuditLog,
    getAuditLogs,
    submitForAudit,
    approveAudit,
    rejectAudit,
    revokeAudit
};
