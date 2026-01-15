const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../db');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const { logger, LOG_CATEGORIES, OPERATION_TYPES, SEVERITY_LEVELS } = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 配置 multer 上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/seals');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'seal-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件'));
        }
    }
});

// 获取印章列表
router.get('/', authenticateToken, checkPermission('system:seal:list'), async (req, res) => {
    try {
        const pool = await getConnection();
        
        // 获取当前用户详细信息(仅获取DepartmentID，RoleID通过token获取或另外查询)
        // 注意：User表可能没有RoleID字段，角色通常存储在UserRoles表
        const userResult = await pool.request()
            .input('UserID', sql.Int, req.user.id)
            .query('SELECT ID, DepartmentID FROM [User] WHERE ID = @UserID');
            
        if (userResult.recordset.length === 0) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        const currentUser = userResult.recordset[0];
        
        // 检查是否为管理员
        // 优先使用token中的roleCode，或者检查roles数组
        let isAdmin = false;
        if (req.user.roleCode === 'admin' || req.user.role === 'admin') {
            isAdmin = true;
        } else if (req.user.roles && Array.isArray(req.user.roles)) {
            isAdmin = req.user.roles.some(r => r.RoleCode === 'admin' || r.ID === 1 || r.RoleName === '系统管理员');
        }
        
        // 调试日志
        console.log('印章查询参数:', {
            userId: req.user.id,
            isAdmin,
            roleCode: req.user.roleCode,
            role: req.user.role,
            forPrint: req.query.forPrint,
            includeInactive: req.query.includeInactive
        });

        let query = `
            SELECT es.*, 
                   ISNULL(u.RealName, u.Username) as CreatorName, 
                   ISNULL(u2.RealName, u2.Username) as UpdatorName 
            FROM ElectronicSeals es
            LEFT JOIN [User] u ON es.CreatedBy = u.ID
            LEFT JOIN [User] u2 ON es.UpdatedBy = u2.ID
            WHERE 1=1
        `;
        
        // 如果传入 includeInactive 参数，则包含禁用的印章（管理页面使用）
        // 否则只查询启用的印章（选择印章时使用）
        // forPrint 模式下也显示所有启用的印章
        const includeInactive = req.query.includeInactive === 'true';
        const forPrint = req.query.forPrint === 'true';
        
        if (!includeInactive) {
            query += ` AND es.IsActive = 1`;
        }
        
        // 权限控制：如果不是管理员，且查询部门章，只能看本部门的
        // 专用章(special)对所有人可见，或者根据需求限制
        // 如果用户是管理员，可以看到所有
        // 如果传入 forPrint=true，则跳过权限限制（用于打印预览选择印章）
        
        if (!isAdmin && !forPrint) {
            query += ` AND (es.SealType = 'special' OR (es.SealType = 'department' AND es.DepartmentID = @DepartmentID))`;
        }
        
        query += ` ORDER BY es.CreatedAt DESC`;
        
        console.log('印章查询SQL:', query);

        const request = pool.request();
        if (!isAdmin && !forPrint) {
            request.input('DepartmentID', sql.Int, currentUser.DepartmentID);
        }

        const result = await request.query(query);
        console.log('印章查询结果:', result.recordset.length, '条');
        res.json(result.recordset);
    } catch (err) {
        console.error('获取印章列表失败:', err);
        console.error('错误堆栈:', err.stack);
        res.status(500).json({ message: '获取印章列表失败: ' + err.message });
    }
});

// 新增印章
router.post('/', authenticateToken, checkPermission('system:seal:add'), async (req, res) => {
    try {
        const { SealName, SealType, DepartmentID, DepartmentName, ImageUrl, Description } = req.body;
        const pool = await getConnection();
        
        await pool.request()
            .input('SealName', sql.NVarChar, SealName)
            .input('SealType', sql.NVarChar, SealType)
            .input('DepartmentID', sql.Int, DepartmentID || null)
            .input('DepartmentName', sql.NVarChar, DepartmentName || null)
            .input('ImageUrl', sql.NVarChar, ImageUrl)
            .input('Description', sql.NVarChar, Description)
            .input('CreatedBy', sql.Int, req.user.id)
            .query(`
                INSERT INTO ElectronicSeals (SealName, SealType, DepartmentID, DepartmentName, ImageUrl, Description, CreatedBy)
                VALUES (@SealName, @SealType, @DepartmentID, @DepartmentName, @ImageUrl, @Description, @CreatedBy)
            `);
            
        res.status(201).json({ message: '印章创建成功' });
    } catch (err) {
        console.error('创建印章失败:', err);
        res.status(500).json({ message: '创建印章失败' });
    }
});

// 修改印章
router.put('/:id', authenticateToken, checkPermission('system:seal:edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { SealName, SealType, DepartmentID, DepartmentName, ImageUrl, Description } = req.body;
        const pool = await getConnection();
        
        await pool.request()
            .input('ID', sql.Int, id)
            .input('SealName', sql.NVarChar, SealName)
            .input('SealType', sql.NVarChar, SealType)
            .input('DepartmentID', sql.Int, DepartmentID || null)
            .input('DepartmentName', sql.NVarChar, DepartmentName || null)
            .input('ImageUrl', sql.NVarChar, ImageUrl)
            .input('Description', sql.NVarChar, Description)
            .input('UpdatedBy', sql.Int, req.user.id)
            .input('UpdatedAt', sql.DateTime, new Date())
            .query(`
                UPDATE ElectronicSeals
                SET SealName = @SealName,
                    SealType = @SealType,
                    DepartmentID = @DepartmentID,
                    DepartmentName = @DepartmentName,
                    ImageUrl = @ImageUrl,
                    Description = @Description,
                    UpdatedBy = @UpdatedBy,
                    UpdatedAt = @UpdatedAt
                WHERE ID = @ID
            `);
            
        res.json({ message: '印章更新成功' });
    } catch (err) {
        console.error('更新印章失败:', err);
        res.status(500).json({ message: '更新印章失败' });
    }
});

// 删除印章
router.delete('/:id', authenticateToken, checkPermission('system:seal:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        // 先查询印章信息以便记录日志
        const sealResult = await pool.request()
            .input('ID', sql.Int, id)
            .query('SELECT * FROM ElectronicSeals WHERE ID = @ID');
            
        if (sealResult.recordset.length === 0) {
            return res.status(404).json({ message: '印章不存在' });
        }
        
        const seal = sealResult.recordset[0];
        
        // 执行物理删除
        await pool.request()
            .input('ID', sql.Int, id)
            .query('DELETE FROM ElectronicSeals WHERE ID = @ID');
            
        // 删除印章图片文件（可选）
        if (seal.ImageUrl) {
            const imagePath = path.join(__dirname, '..', seal.ImageUrl.replace(/^\//, ''));
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                } catch (e) {
                    console.warn('删除印章图片文件失败:', e);
                }
            }
        }
            
        // 记录审计日志
        try {
            await logger.log({
                userID: req.user.id,
                userName: req.user.username,
                action: 'DELETE SEAL',
                details: `删除印章: ${seal.SealName} (ID: ${id}, Type: ${seal.SealType})`,
                category: LOG_CATEGORIES.SYSTEM_CONFIG,
                module: 'ELECTRONIC_SEAL',
                resourceType: 'SEAL',
                resourceID: id,
                operationType: OPERATION_TYPES.DELETE,
                severity: SEVERITY_LEVELS.WARN,
                status: 'SUCCESS'
            });
        } catch (logErr) {
            console.error('记录删除日志失败:', logErr);
        }
        
        res.json({ message: '印章删除成功' });
    } catch (err) {
        console.error('删除印章失败:', err);
        res.status(500).json({ message: '删除印章失败' });
    }
});

// 上传印章图片
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '未上传文件' });
    }
    // 返回相对路径
    const relativePath = '/uploads/seals/' + req.file.filename;
    res.json({ url: relativePath });
});

// 批量删除印章
router.post('/batch-delete', authenticateToken, checkPermission('system:seal:delete'), async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: '请选择要删除的印章' });
        }
        
        const pool = await getConnection();
        
        // 获取要删除的印章信息（用于日志和删除图片）
        const idsStr = ids.join(',');
        const sealsResult = await pool.request()
            .query(`SELECT ID, SealName, SealType, ImageUrl FROM ElectronicSeals WHERE ID IN (${idsStr})`);
        
        // 执行批量物理删除
        await pool.request()
            .query(`DELETE FROM ElectronicSeals WHERE ID IN (${idsStr})`);
        
        // 删除印章图片文件
        for (const seal of sealsResult.recordset) {
            if (seal.ImageUrl) {
                const imagePath = path.join(__dirname, '..', seal.ImageUrl.replace(/^\//, ''));
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (e) {
                        console.warn('删除印章图片文件失败:', e);
                    }
                }
            }
        }
        
        // 记录审计日志
        const sealNames = sealsResult.recordset.map(s => s.SealName).join(', ');
        try {
            await logger.log({
                userID: req.user.id,
                userName: req.user.username,
                action: 'BATCH DELETE SEALS',
                details: `批量删除印章: ${sealNames} (共 ${ids.length} 个)`,
                category: LOG_CATEGORIES.SYSTEM_CONFIG,
                module: 'ELECTRONIC_SEAL',
                operationType: OPERATION_TYPES.DELETE,
                severity: SEVERITY_LEVELS.WARN,
                status: 'SUCCESS'
            });
        } catch (logErr) {
            console.error('记录批量删除日志失败:', logErr);
        }
        
        res.json({ message: `成功删除 ${ids.length} 个印章`, count: ids.length });
    } catch (err) {
        console.error('批量删除印章失败:', err);
        res.status(500).json({ message: '批量删除印章失败' });
    }
});

// 批量更新印章状态（启用/禁用）
router.post('/batch-status', authenticateToken, checkPermission('system:seal:edit'), async (req, res) => {
    try {
        const { ids, isActive } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: '请选择要操作的印章' });
        }
        
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: '请指定启用或禁用状态' });
        }
        
        const pool = await getConnection();
        
        // 获取要更新的印章信息（用于日志）
        const idsStr = ids.join(',');
        const sealsResult = await pool.request()
            .query(`SELECT ID, SealName, SealType FROM ElectronicSeals WHERE ID IN (${idsStr})`);
        
        // 执行批量更新状态
        await pool.request()
            .input('IsActive', sql.Bit, isActive ? 1 : 0)
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE ElectronicSeals 
                SET IsActive = @IsActive, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE ID IN (${idsStr})
            `);
        
        // 记录审计日志
        const sealNames = sealsResult.recordset.map(s => s.SealName).join(', ');
        const action = isActive ? '启用' : '禁用';
        try {
            await logger.log({
                userID: req.user.id,
                userName: req.user.username,
                action: `BATCH ${isActive ? 'ENABLE' : 'DISABLE'} SEALS`,
                details: `批量${action}印章: ${sealNames} (共 ${ids.length} 个)`,
                category: LOG_CATEGORIES.SYSTEM_CONFIG,
                module: 'ELECTRONIC_SEAL',
                operationType: OPERATION_TYPES.UPDATE,
                severity: SEVERITY_LEVELS.INFO,
                status: 'SUCCESS'
            });
        } catch (logErr) {
            console.error('记录批量状态更新日志失败:', logErr);
        }
        
        res.json({ message: `成功${action} ${ids.length} 个印章`, count: ids.length });
    } catch (err) {
        console.error('批量更新印章状态失败:', err);
        res.status(500).json({ message: '批量更新印章状态失败' });
    }
});

/**
 * 设为默认印章
 * PUT /api/electronic-seals/:id/set-default
 */
router.put('/:id/set-default', authenticateToken, checkPermission('system:seal:setDefault'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        // 先检查印章是否存在
        const checkResult = await pool.request()
            .input('ID', sql.Int, id)
            .query('SELECT ID, SealName FROM ElectronicSeals WHERE ID = @ID');
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: '印章不存在' });
        }
        
        const sealName = checkResult.recordset[0].SealName;
        
        // 先将所有印章的IsDefault设为0
        await pool.request().query('UPDATE ElectronicSeals SET IsDefault = 0');
        
        // 再将指定印章设为默认
        await pool.request()
            .input('ID', sql.Int, id)
            .query('UPDATE ElectronicSeals SET IsDefault = 1 WHERE ID = @ID');
        
        // 记录审计日志
        try {
            await logger.log({
                userID: req.user.id,
                userName: req.user.username,
                action: 'SET_DEFAULT_SEAL',
                details: `设置默认印章: ${sealName}`,
                category: LOG_CATEGORIES.SYSTEM_CONFIG,
                module: 'ELECTRONIC_SEAL',
                operationType: OPERATION_TYPES.UPDATE,
                severity: SEVERITY_LEVELS.INFO,
                status: 'SUCCESS'
            });
        } catch (logErr) {
            console.error('记录设置默认印章日志失败:', logErr);
        }
        
        res.json({ message: `已将"${sealName}"设为默认印章` });
    } catch (err) {
        console.error('设置默认印章失败:', err);
        res.status(500).json({ message: '设置默认印章失败: ' + err.message });
    }
});

module.exports = router;
