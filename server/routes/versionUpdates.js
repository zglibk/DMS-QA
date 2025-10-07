/**
 * 版本更新管理路由
 * 
 * 功能说明：
 * 1. 提供版本更新信息的增删改查API接口
 * 2. 支持版本更新内容的存储和管理
 * 3. 集成通知系统，支持版本更新通知推送
 * 4. 提供版本更新统计和查询功能
 * 
 * 作者：DMS-QA Team
 * 创建时间：2025-09-08
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getConnection } = require('../db');
const { authenticateToken } = require('../middleware/auth');

/**
 * 获取版本更新列表
 * GET /api/version-updates
 * 查询参数：
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认10）
 * - status: 状态筛选（draft/published/archived）
 * - search: 搜索关键词
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, pageSize = 10, status, search } = req.query;
        const offset = (page - 1) * pageSize;
        
        let whereClause = 'WHERE vu.IsActive = 1';
        const params = [];
        let paramIndex = 1;
        
        // 状态筛选
        if (status) {
            whereClause += ` AND vu.Status = @param${paramIndex}`;
            params.push({ name: `param${paramIndex}`, type: 'NVarChar', value: status });
            paramIndex++;
        }
        
        // 搜索功能
        if (search) {
            whereClause += ` AND (vu.Version LIKE @param${paramIndex} OR vu.Title LIKE @param${paramIndex + 1} OR vu.Description LIKE @param${paramIndex + 2})`;
            const searchPattern = `%${search}%`;
            params.push(
                { name: `param${paramIndex}`, type: 'NVarChar', value: searchPattern },
                { name: `param${paramIndex + 1}`, type: 'NVarChar', value: searchPattern },
                { name: `param${paramIndex + 2}`, type: 'NVarChar', value: searchPattern }
            );
            paramIndex += 3;
        }
        
        const connection = await getConnection();
        const request = connection.request();
        
        // 添加参数
        params.forEach(param => {
            request.input(param.name, sql[param.type], param.value);
        });
        
        // 添加分页参数
        request.input('offset', sql.Int, offset);
        request.input('pageSize', sql.Int, parseInt(pageSize));

        // 查询总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM VersionUpdates vu
            ${whereClause}
        `;
        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;

        // 查询数据 - 使用ROW_NUMBER()方式实现分页
        const dataQuery = `
            SELECT * FROM (
                SELECT 
                    vu.ID,
                    vu.Version,
                    vu.Title,
                    vu.Description,
                    vu.ReleaseDate,
                    vu.Status,
                    vu.IsMajorUpdate,
                    vu.TotalCommits,
                    vu.FeaturesCount,
                    vu.FixesCount,
                    vu.ImprovementsCount,
                    vu.OtherCount,
                    vu.NotificationSent,
                    vu.NotificationDate,
                    vu.CreatedAt,
                    COALESCE(u.RealName, u.Username) as CreatedByName,
                    ROW_NUMBER() OVER (ORDER BY vu.ReleaseDate DESC, vu.CreatedAt DESC) as RowNum
                FROM VersionUpdates vu
                LEFT JOIN [User] u ON vu.CreatedBy = u.ID
                ${whereClause}
            ) AS PagedResults
            WHERE RowNum > @offset AND RowNum <= (@offset + @pageSize)
        `;
        
        const dataResult = await request.query(dataQuery);
        
        res.json({
            success: true,
            data: dataResult.recordset,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });
        
    } catch (error) {
        console.error('获取版本更新列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取版本更新列表失败',
            error: error.message
        });
    }
});

/**
 * 获取单个版本更新详情
 * GET /api/version-updates/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await getConnection();
        const request = connection.request();
        
        // 查询版本更新基本信息
        const versionQuery = `
            SELECT 
                vu.*,
                COALESCE(u.RealName, u.Username) as CreatedByName
            FROM VersionUpdates vu
            LEFT JOIN [User] u ON vu.CreatedBy = u.ID
            WHERE vu.ID = @id AND vu.IsActive = 1
        `;
        
        request.input('id', sql.Int, id);
        const versionResult = await request.query(versionQuery);
        
        if (versionResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '版本更新信息不存在'
            });
        }
        
        const versionData = versionResult.recordset[0];
        
        // 查询版本更新详细项目
        const itemsQuery = `
            SELECT *
            FROM VersionUpdateItems
            WHERE VersionUpdateID = @id
            ORDER BY Category, SortOrder, ID
        `;
        
        const itemsResult = await request.query(itemsQuery);
        versionData.items = itemsResult.recordset;
        
        // 解析JSON字段
        if (versionData.ChangelogJson) {
            try {
                versionData.ChangelogData = JSON.parse(versionData.ChangelogJson);
            } catch (e) {
                console.warn('解析ChangelogJson失败:', e);
            }
        }
        
        if (versionData.Contributors) {
            try {
                versionData.ContributorsData = JSON.parse(versionData.Contributors);
            } catch (e) {
                console.warn('解析Contributors失败:', e);
            }
        }
        
        res.json({
            success: true,
            data: versionData
        });
        
    } catch (error) {
        console.error('获取版本更新详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取版本更新详情失败',
            error: error.message
        });
    }
});

/**
 * 检查版本号是否存在
 * GET /api/version-updates/check-version/:version
 */
router.get('/check-version/:version', authenticateToken, async (req, res) => {
    try {
        const { version } = req.params;
        const connection = await getConnection();
        const request = connection.request();
        
        // 检查版本号是否已存在
        const checkQuery = `
            SELECT COUNT(*) as count
            FROM VersionUpdates
            WHERE Version = @version AND IsActive = 1
        `;
        
        request.input('version', sql.NVarChar, version);
        const checkResult = await request.query(checkQuery);
        
        const exists = checkResult.recordset[0].count > 0;
        
        res.json({
            success: true,
            exists: exists,
            message: exists ? '该版本号已存在' : '版本号可用'
        });
        
    } catch (error) {
        console.error('检查版本号失败:', error);
        res.status(500).json({
            success: false,
            message: '检查版本号失败',
            error: error.message
        });
    }
});

/**
 * 创建版本更新记录
 * POST /api/version-updates
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            version,
            title,
            description,
            releaseDate,
            status = 'draft',
            isMajorUpdate = false,
            totalCommits = 0,
            featuresCount = 0,
            fixesCount = 0,
            improvementsCount = 0,
            otherCount = 0,
            changelogMarkdown,
            changelogJson,
            contributors,
            items = [],
            sendNotification = false
        } = req.body;
        
        const userId = req.user.id;
        const connection = await getConnection();
        const transaction = connection.transaction();
        
        try {
            await transaction.begin();
            const request = transaction.request();
            
            // 检查版本号是否已存在
            const checkQuery = `
                SELECT COUNT(*) as count
                FROM VersionUpdates
                WHERE Version = @version AND IsActive = 1
            `;
            
            request.input('version', sql.NVarChar, version);
            const checkResult = await request.query(checkQuery);
            
            if (checkResult.recordset[0].count > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: '该版本号已存在'
                });
            }
            
            // 插入版本更新记录
            const insertQuery = `
                INSERT INTO VersionUpdates (
                    Version, Title, Description, ReleaseDate, Status, IsMajorUpdate,
                    TotalCommits, FeaturesCount, FixesCount, ImprovementsCount, OtherCount,
                    ChangelogMarkdown, ChangelogJson, Contributors, CreatedBy
                )
                OUTPUT INSERTED.ID
                VALUES (
                    @version, @title, @description, @releaseDate, @status, @isMajorUpdate,
                    @totalCommits, @featuresCount, @fixesCount, @improvementsCount, @otherCount,
                    @changelogMarkdown, @changelogJson, @contributors, @userId
                )
            `;
            
            request.input('title', sql.NVarChar, title);
        request.input('description', sql.NVarChar, description || null);
        request.input('releaseDate', sql.DateTime, new Date(releaseDate || Date.now()));
        request.input('status', sql.NVarChar, status);
        request.input('isMajorUpdate', sql.Bit, isMajorUpdate);
        request.input('totalCommits', sql.Int, totalCommits);
        request.input('featuresCount', sql.Int, featuresCount);
        request.input('fixesCount', sql.Int, fixesCount);
        request.input('improvementsCount', sql.Int, improvementsCount);
        request.input('otherCount', sql.Int, otherCount);
        request.input('changelogMarkdown', sql.NVarChar, changelogMarkdown || null);
        request.input('changelogJson', sql.NVarChar, changelogJson || null);
        request.input('contributors', sql.NVarChar, contributors || null);
        request.input('userId', sql.Int, userId);
            
            const insertResult = await request.query(insertQuery);
            const versionUpdateId = insertResult.recordset[0].ID;
            
            // 插入版本更新详细项目
            if (items && items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const itemRequest = transaction.request();
                    
                    const itemInsertQuery = `
                        INSERT INTO VersionUpdateItems (
                            VersionUpdateID, Category, Title, Description,
                            CommitHash, CommitShortHash, CommitAuthor, CommitDate, CommitEmail,
                            SortOrder, IsHighlight
                        )
                        VALUES (
                            @versionUpdateId, @category, @title, @description,
                            @commitHash, @commitShortHash, @commitAuthor, @commitDate, @commitEmail,
                            @sortOrder, @isHighlight
                        )
                    `;
                    
                    itemRequest.input('versionUpdateId', sql.Int, versionUpdateId);
                itemRequest.input('category', sql.NVarChar, item.category || 'other');
                itemRequest.input('title', sql.NVarChar, item.title);
                // 优化：避免 Title 和 Description 内容重复
                // 如果 description 存在且不同于 title，使用 description；否则使用 null
                const description = item.description && item.description.trim() !== item.title.trim() 
                    ? item.description 
                    : null;
                itemRequest.input('description', sql.NVarChar, description);
                itemRequest.input('commitHash', sql.NVarChar, item.commitHash || null);
                itemRequest.input('commitShortHash', sql.NVarChar, item.commitShortHash || null);
                itemRequest.input('commitAuthor', sql.NVarChar, item.commitAuthor || null);
                itemRequest.input('commitDate', sql.DateTime, item.commitDate ? new Date(item.commitDate) : null);
                itemRequest.input('commitEmail', sql.NVarChar, item.commitEmail || null);
                itemRequest.input('sortOrder', sql.Int, item.sortOrder || i);
                itemRequest.input('isHighlight', sql.Bit, item.isHighlight || false);
                    
                    await itemRequest.query(itemInsertQuery);
                }
            }
            
            // 如果需要发送通知，创建系统通知
            let noticeId = null;
            if (sendNotification) {
                const noticeRequest = transaction.request();
                // 确保版本号格式正确，避免双重'v'前缀
                const displayVersion = version.startsWith('v') ? version : `v${version}`;
                const noticeTitle = `系统更新通知 - ${displayVersion}`;
                const noticeContent = `
                    <h3>🎉 系统版本更新</h3>
                    <p><strong>版本号：</strong>${displayVersion}</p>
                    <p><strong>发布时间：</strong>${new Date(releaseDate || Date.now()).toLocaleDateString()}</p>
                    ${description ? `<p><strong>更新说明：</strong>${description}</p>` : ''}
                    <hr>
                    <h4>📊 更新统计</h4>
                    <ul>
                        <li>🆕 新增功能：${featuresCount} 项</li>
                        <li>🐛 问题修复：${fixesCount} 项</li>
                        <li>⚡ 优化改进：${improvementsCount} 项</li>
                        <li>📦 其他更改：${otherCount} 项</li>
                        <li>📋 总计提交：${totalCommits} 个</li>
                    </ul>
                    <p>详细更新内容请查看系统更新日志。</p>
                `;
                
                const insertNoticeQuery = `
                    INSERT INTO Notices (
                        Title, Content, Type, Priority, CreatedBy, IsSticky, RequireConfirmation
                    )
                    OUTPUT INSERTED.ID
                    VALUES (
                        @title, @content, 'announcement', @priority, @userId, @isSticky, 0
                    )
                `;
                
                noticeRequest.input('title', sql.NVarChar, noticeTitle);
            noticeRequest.input('content', sql.NVarChar, noticeContent);
            noticeRequest.input('priority', sql.NVarChar, isMajorUpdate ? 'high' : 'normal');
            noticeRequest.input('userId', sql.Int, userId);
            noticeRequest.input('isSticky', sql.Bit, isMajorUpdate);
                
                const noticeResult = await noticeRequest.query(insertNoticeQuery);
                noticeId = noticeResult.recordset[0].ID;
                
                // 更新版本更新记录的通知状态
                const updateVersionRequest = transaction.request();
                const updateVersionQuery = `
                    UPDATE VersionUpdates
                    SET NotificationSent = 1, NotificationDate = GETDATE(), NoticeID = @noticeId
                    WHERE ID = @versionUpdateId
                `;
                
                updateVersionRequest.input('versionUpdateId', sql.Int, versionUpdateId);
            updateVersionRequest.input('noticeId', sql.Int, noticeId);
                
                await updateVersionRequest.query(updateVersionQuery);
            }
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: sendNotification ? '版本更新记录创建成功，系统通知已发送' : '版本更新记录创建成功',
                data: { 
                    id: versionUpdateId, 
                    version,
                    noticeId: noticeId
                }
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('创建版本更新记录失败:', error);
        res.status(500).json({
            success: false,
            message: '创建版本更新记录失败',
            error: error.message
        });
    }
});

/**
 * 更新版本更新记录
 * PUT /api/version-updates/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const connection = await getConnection();
        const request = connection.request();
        
        // 构建更新字段
        const updateFields = [];
        const params = [];
        let paramIndex = 1;
        
        const allowedFields = [
            'Title', 'Description', 'ReleaseDate', 'Status', 'IsMajorUpdate',
            'TotalCommits', 'FeaturesCount', 'FixesCount', 'ImprovementsCount', 'OtherCount',
            'ChangelogMarkdown', 'ChangelogJson', 'Contributors'
        ];
        
        allowedFields.forEach(field => {
            const camelField = field.charAt(0).toLowerCase() + field.slice(1);
            if (updateData.hasOwnProperty(camelField)) {
                updateFields.push(`${field} = @param${paramIndex}`);
                let value = updateData[camelField];
                let type = 'NVarChar';
                
                // 根据字段类型设置正确的SQL类型和值转换
                if (field === 'ReleaseDate') {
                    value = value ? new Date(value) : null;
                    type = 'DateTime';
                } else if (field === 'IsMajorUpdate') {
                    // 确保布尔值正确转换
                    value = Boolean(value);
                    type = 'Bit';
                } else if (field.includes('Count')) {
                    // 确保数字类型正确转换
                    value = parseInt(value) || 0;
                    type = 'Int';
                } else {
                    // 字符串类型，确保不为null或undefined
                    if (value === null || value === undefined) {
                        value = '';
                    } else {
                        value = String(value);
                    }
                    type = 'NVarChar';
                }
                
                params.push({ name: `param${paramIndex}`, type, value });
                paramIndex++;
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有有效的更新字段'
            });
        }
        
        // 添加更新时间
        updateFields.push('UpdatedAt = GETDATE()');
        
        // 添加参数
        params.forEach(param => {
            request.input(param.name, sql[param.type], param.value);
        });
        request.input('id', sql.Int, id);
        
        const updateQuery = `
            UPDATE VersionUpdates
            SET ${updateFields.join(', ')}
            WHERE ID = @id AND IsActive = 1
        `;
        
        const result = await request.query(updateQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: '版本更新记录不存在'
            });
        }
        
        res.json({
            success: true,
            message: '版本更新记录更新成功'
        });
        
    } catch (error) {
        console.error('更新版本更新记录失败:', error);
        res.status(500).json({
            success: false,
            message: '更新版本更新记录失败',
            error: error.message
        });
    }
});

/**
 * 删除版本更新记录（软删除）
 * DELETE /api/version-updates/:id
 * 功能：删除版本更新记录时，同步删除相关的通知公告
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await getConnection();
        const transaction = connection.transaction();
        
        try {
            await transaction.begin();
            
            // 首先获取版本更新记录信息，包括关联的通知ID
            const getVersionRequest = transaction.request();
            getVersionRequest.input('id', sql.Int, id);
            
            const getVersionQuery = `
                SELECT ID, Version, NoticeID
                FROM VersionUpdates
                WHERE ID = @id AND IsActive = 1
            `;
            
            const versionResult = await getVersionRequest.query(getVersionQuery);
            
            if (versionResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: '版本更新记录不存在'
                });
            }
            
            const versionData = versionResult.recordset[0];
            const noticeId = versionData.NoticeID;
            
            // 软删除版本更新记录
            const deleteVersionRequest = transaction.request();
            deleteVersionRequest.input('id', sql.Int, id);
            
            const deleteVersionQuery = `
                UPDATE VersionUpdates
                SET IsActive = 0, UpdatedAt = GETDATE()
                WHERE ID = @id AND IsActive = 1
            `;
            
            await deleteVersionRequest.query(deleteVersionQuery);
            
            // 如果存在关联的通知公告，同步软删除通知公告
            if (noticeId) {
                const deleteNoticeRequest = transaction.request();
                deleteNoticeRequest.input('noticeId', sql.Int, noticeId);
                
                const deleteNoticeQuery = `
                    UPDATE Notices
                    SET IsActive = 0
                    WHERE ID = @noticeId AND IsActive = 1
                `;
                
                const noticeDeleteResult = await deleteNoticeRequest.query(deleteNoticeQuery);
                
                console.log(`版本 ${versionData.Version} 删除成功，同步删除了关联的通知公告 (ID: ${noticeId})`);
            }
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: noticeId ? 
                    '版本更新记录及相关通知公告删除成功' : 
                    '版本更新记录删除成功'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('删除版本更新记录失败:', error);
        res.status(500).json({
            success: false,
            message: '删除版本更新记录失败',
            error: error.message
        });
    }
});

/**
 * 发送版本更新通知
 * POST /api/version-updates/:id/notify
 */
router.post('/:id/notify', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { customTitle, customContent } = req.body;
        const userId = req.user.id;
        
        const connection = await getConnection();
        const transaction = connection.transaction();
        
        try {
            await transaction.begin();
            
            // 获取版本更新信息
            const versionRequest = transaction.request();
            versionRequest.input('id', sql.Int, id);
            
            const versionQuery = `
                SELECT *
                FROM VersionUpdates
                WHERE ID = @id AND IsActive = 1
            `;
            
            const versionResult = await versionRequest.query(versionQuery);
            
            if (versionResult.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: '版本更新记录不存在'
                });
            }
            
            const versionData = versionResult.recordset[0];
            
            // 创建通知记录
            const noticeRequest = transaction.request();
            // 确保版本号格式正确，避免双重'v'前缀
            const displayVersion = versionData.Version.startsWith('v') ? versionData.Version : `v${versionData.Version}`;
            const noticeTitle = customTitle || `系统更新通知 - ${displayVersion}`;
            const noticeContent = customContent || `
                <h3>🎉 系统版本更新</h3>
                <p><strong>版本号：</strong>${displayVersion}</p>
                <p><strong>发布时间：</strong>${new Date(versionData.ReleaseDate).toLocaleDateString()}</p>
                ${versionData.Description ? `<p><strong>更新说明：</strong>${versionData.Description}</p>` : ''}
                <hr>
                <h4>📊 更新统计</h4>
                <ul>
                    <li>🆕 新增功能：${versionData.FeaturesCount} 项</li>
                    <li>🐛 问题修复：${versionData.FixesCount} 项</li>
                    <li>⚡ 优化改进：${versionData.ImprovementsCount} 项</li>
                    <li>📦 其他更改：${versionData.OtherCount} 项</li>
                    <li>📋 总计提交：${versionData.TotalCommits} 个</li>
                </ul>
                <p>详细更新内容请查看系统更新日志。</p>
            `;
            
            const insertNoticeQuery = `
                INSERT INTO Notices (
                    Title, Content, Type, Priority, CreatedBy, IsSticky, RequireConfirmation
                )
                OUTPUT INSERTED.ID
                VALUES (
                    @title, @content, 'announcement', @priority, @userId, @isSticky, 0
                )
            `;
            
            noticeRequest.input('title', sql.NVarChar, noticeTitle);
        noticeRequest.input('content', sql.NVarChar, noticeContent);
        noticeRequest.input('priority', sql.NVarChar, versionData.IsMajorUpdate ? 'high' : 'normal');
        noticeRequest.input('userId', sql.Int, userId);
        noticeRequest.input('isSticky', sql.Bit, versionData.IsMajorUpdate);
            
            const noticeResult = await noticeRequest.query(insertNoticeQuery);
            const noticeId = noticeResult.recordset[0].ID;
            
            // 更新版本更新记录的通知状态
            const updateVersionRequest = transaction.request();
            const updateVersionQuery = `
                UPDATE VersionUpdates
                SET NotificationSent = 1, NotificationDate = GETDATE(), NoticeID = @noticeId, UpdatedAt = GETDATE()
                WHERE ID = @id
            `;
            
            updateVersionRequest.input('id', sql.Int, id);
        updateVersionRequest.input('noticeId', sql.Int, noticeId);
            
            await updateVersionRequest.query(updateVersionQuery);
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: '版本更新通知发送成功',
                data: {
                    noticeId,
                    title: noticeTitle
                }
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('发送版本更新通知失败:', error);
        res.status(500).json({
            success: false,
            message: '发送版本更新通知失败',
            error: error.message
        });
    }
});

/**
 * 获取版本更新统计信息
 * GET /api/version-updates/stats
 * 
 * 功能说明：
 * 1. 统计版本总数、发布状态等基础信息
 * 2. 根据VersionUpdateItems表中的Category字段实际内容进行分类统计
 * 3. 支持带图标的Category字段（如✨ 新增功能、🐛 问题修复、⚡ 优化改进等）
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const connection = await getConnection();
        const request = connection.request();
        
        // 基础统计查询
        const basicStatsQuery = `
            SELECT 
                COUNT(*) as totalVersions,
                SUM(CASE WHEN Status = 'published' THEN 1 ELSE 0 END) as publishedVersions,
                SUM(CASE WHEN Status = 'draft' THEN 1 ELSE 0 END) as draftVersions,
                SUM(CASE WHEN IsMajorUpdate = 1 THEN 1 ELSE 0 END) as majorUpdates,
                SUM(TotalCommits) as totalCommits,
                MAX(ReleaseDate) as latestReleaseDate,
                (
                    SELECT TOP 1 Version
                    FROM VersionUpdates
                    WHERE IsActive = 1 AND Status = 'published'
                    ORDER BY ReleaseDate DESC
                ) as latestVersion
            FROM VersionUpdates
            WHERE IsActive = 1
        `;
        
        // 分类统计查询 - 根据实际Category字段内容进行统计
        const categoryStatsQuery = `
            SELECT 
                SUM(CASE 
                    WHEN vui.Category LIKE '%新增功能%' OR vui.Category LIKE '%新功能%' OR vui.Category = 'features' 
                    THEN 1 ELSE 0 
                END) as totalFeatures,
                SUM(CASE 
                    WHEN vui.Category LIKE '%问题修复%' OR vui.Category LIKE '%修复%' OR vui.Category = 'fixes' 
                    THEN 1 ELSE 0 
                END) as totalFixes,
                SUM(CASE 
                    WHEN vui.Category LIKE '%优化改进%' OR vui.Category LIKE '%改进%' OR vui.Category LIKE '%优化%' OR vui.Category = 'improvements' 
                    THEN 1 ELSE 0 
                END) as totalImprovements
            FROM VersionUpdateItems vui
            INNER JOIN VersionUpdates vu ON vui.VersionUpdateID = vu.ID
            WHERE vu.IsActive = 1 AND vu.Status = 'published'
        `;
        
        // 执行查询
        const basicResult = await request.query(basicStatsQuery);
        const categoryResult = await request.query(categoryStatsQuery);
        
        // 合并结果
        const combinedStats = {
            ...basicResult.recordset[0],
            ...categoryResult.recordset[0]
        };
        
        res.json({
            success: true,
            data: combinedStats
        });
        
    } catch (error) {
        console.error('获取版本更新统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取版本更新统计失败',
            error: error.message
        });
    }
});

/**
 * 执行高级版本更新日志生成器脚本
 * POST /api/version-updates/generate-changelog
 * 
 * 功能说明：
 * 1. 安全执行generate-changelog-advanced.js脚本
 * 2. 使用连接池管理，避免服务崩溃
 * 3. 支持自定义版本号和配置选项
 * 4. 返回详细的执行结果和统计信息
 */
router.post('/generate-changelog', authenticateToken, async (req, res) => {
    try {
        // 开始执行版本更新日志生成器
        
        const {
            version,
            from,
            to = 'HEAD',
            saveToDb = true,
            format = 'markdown',
            sendNotification = true
        } = req.body;
        
        // 验证用户权限（可选：只允许管理员执行）
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: '权限不足，只有管理员可以执行此操作'
            });
        }
        
        // 动态导入脚本模块
        const changelogGenerator = require('../../scripts/generate-changelog-advanced');
        
        // 准备执行选项
        const options = {
            version,
            from,
            to,
            saveToDb,
            format,
            preview: false,
            sendNotification
        };
        
        console.log('⚙️  [API] 执行选项:', options);
        
        // 执行脚本
        const result = await changelogGenerator.executeChangelogGeneration(options);
        
        console.log('📊 [API] 脚本执行结果:', result);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    version: result.data.version,
                    totalCommits: result.data.totalCommits,
                    categories: result.data.categories,
                    stats: result.data.stats,
                    dbSaved: result.data.dbSaved,
                    changelog: result.data.changelog
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                error: result.data?.error
            });
        }
        
    } catch (error) {
        console.error('❌ [API] 执行版本更新日志生成器失败:', error);
        res.status(500).json({
            success: false,
            message: '执行版本更新日志生成器失败',
            error: error.message,
            details: {
                stack: error.stack,
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * 获取Git提交记录列表
 * GET /api/version-updates/git/commits
 * 查询参数：
 * - limit: 限制返回数量（默认50）
 * - branch: 指定分支（默认当前分支）
 */
router.get('/git/commits', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, branch = 'HEAD' } = req.query;
        const { execSync } = require('child_process');
        
        console.log('🔍 [API] 获取Git提交记录...');
        
        // 获取Git提交记录
        const gitCommand = `git log -${limit} ${branch} --pretty=format:"%H|%h|%s|%an|%ad|%ae" --date=short`;
        
        try {
            const output = execSync(gitCommand, { 
                encoding: 'utf8',
                cwd: process.cwd() // 确保在项目根目录执行
            });
            
            const commits = output.split('\n').filter(line => line.trim()).map(line => {
                const [hash, shortHash, subject, author, date, email] = line.split('|');
                return {
                    hash,
                    shortHash,
                    subject,
                    author,
                    date,
                    email,
                    display: `${shortHash} - ${subject} (${author}, ${date})`
                };
            });
            
            res.json({
                success: true,
                data: commits,
                total: commits.length
            });
            
        } catch (gitError) {
            console.error('❌ [API] Git命令执行失败:', gitError.message);
            res.status(400).json({
                success: false,
                message: 'Git命令执行失败',
                error: gitError.message
            });
        }
        
    } catch (error) {
        console.error('❌ [API] 获取Git提交记录失败:', error);
        res.status(500).json({
            success: false,
            message: '获取Git提交记录失败',
            error: error.message
        });
    }
});

/**
 * 获取Git标签列表
 * GET /api/version-updates/git/tags
 * 查询参数：
 * - limit: 限制返回数量（默认20）
 */
router.get('/git/tags', authenticateToken, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const { execSync } = require('child_process');
        
        console.log('🏷️  [API] 获取Git标签列表...');
        
        // 获取Git标签，按版本号排序
        const gitCommand = `git tag --sort=-version:refname -l`;
        
        try {
            const output = execSync(gitCommand, { 
                encoding: 'utf8',
                cwd: process.cwd()
            });
            
            const allTags = output.split('\n').filter(line => line.trim());
            const tags = allTags.slice(0, parseInt(limit)).map(tag => ({
                name: tag,
                display: tag
            }));
            
            res.json({
                success: true,
                data: tags,
                total: tags.length
            });
            
        } catch (gitError) {
            console.error('❌ [API] Git标签获取失败:', gitError.message);
            res.status(400).json({
                success: false,
                message: 'Git标签获取失败',
                error: gitError.message
            });
        }
        
    } catch (error) {
        console.error('❌ [API] 获取Git标签失败:', error);
        res.status(500).json({
            success: false,
            message: '获取Git标签失败',
            error: error.message
        });
    }
});

/**
 * 获取Git分支列表
 * GET /api/version-updates/git/branches
 */
router.get('/git/branches', authenticateToken, async (req, res) => {
    try {
        const { execSync } = require('child_process');
        
        console.log('🌿 [API] 获取Git分支列表...');
        
        // 获取本地和远程分支
        const gitCommand = `git branch -a --format="%(refname:short)"`;
        
        try {
            const output = execSync(gitCommand, { 
                encoding: 'utf8',
                cwd: process.cwd()
            });
            
            const branches = output.split('\n')
                .filter(line => line.trim())
                .filter(branch => !branch.includes('HEAD')) // 过滤HEAD引用
                .map(branch => ({
                    name: branch.trim(),
                    display: branch.trim()
                }));
            
            res.json({
                success: true,
                data: branches,
                total: branches.length
            });
            
        } catch (gitError) {
            console.error('❌ [API] Git分支获取失败:', gitError.message);
            res.status(400).json({
                success: false,
                message: 'Git分支获取失败',
                error: gitError.message
            });
        }
        
    } catch (error) {
        console.error('❌ [API] 获取Git分支失败:', error);
        res.status(500).json({
            success: false,
            message: '获取Git分支失败',
            error: error.message
        });
    }
});

module.exports = router;