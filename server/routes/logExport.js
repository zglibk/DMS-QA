/**
 * 系统日志导出路由
 * 
 * 功能说明：
 * 1. 支持Excel和CSV格式导出
 * 2. 支持按条件过滤导出
 * 3. 支持大数据量分批导出
 * 4. 记录导出操作日志
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * 导出系统日志
 * POST /api/log-export/export
 * 
 * 请求参数：
 * - format: 导出格式 (excel/csv)
 * - filters: 过滤条件
 * - columns: 导出字段
 * - maxRows: 最大导出行数
 */
router.post('/export', async (req, res) => {
  const startTime = Date.now();
  const { userID, username } = req.user || {};
  
  try {
    const {
      format = 'excel',
      filters = {},
      columns = [],
      maxRows = 10000
    } = req.body;

    // 记录导出开始日志
    await logger.logDataOperation({
      userID,
      username,
      action: '开始导出系统日志',
      details: `格式: ${format}, 最大行数: ${maxRows}`,
      resourceType: 'SYSTEM_LOGS',
      operationType: 'EXPORT',
      requestData: { format, filters, maxRows },
      req
    });

    // 构建查询条件
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    if (filters.keyword) {
      whereConditions.push(`(Action LIKE @param${paramIndex} OR Details LIKE @param${paramIndex + 1})`);
      queryParams.push(
        { name: `param${paramIndex}`, type: sql.NVarChar, value: `%${filters.keyword}%` },
        { name: `param${paramIndex + 1}`, type: sql.NVarChar, value: `%${filters.keyword}%` }
      );
      paramIndex += 2;
    }

    if (filters.category) {
      whereConditions.push(`Category = @param${paramIndex}`);
      queryParams.push({ name: `param${paramIndex}`, type: sql.NVarChar, value: filters.category });
      paramIndex++;
    }

    if (filters.module) {
      whereConditions.push(`Module = @param${paramIndex}`);
      queryParams.push({ name: `param${paramIndex}`, type: sql.NVarChar, value: filters.module });
      paramIndex++;
    }

    if (filters.severity) {
      whereConditions.push(`Severity = @param${paramIndex}`);
      queryParams.push({ name: `param${paramIndex}`, type: sql.NVarChar, value: filters.severity });
      paramIndex++;
    }

    if (filters.userID) {
      whereConditions.push(`UserID = @param${paramIndex}`);
      queryParams.push({ name: `param${paramIndex}`, type: sql.Int, value: parseInt(filters.userID) });
      paramIndex++;
    }

    if (filters.startDate) {
      whereConditions.push(`CreatedAt >= @param${paramIndex}`);
      queryParams.push({ name: `param${paramIndex}`, type: sql.DateTime, value: new Date(filters.startDate) });
      paramIndex++;
    }

    if (filters.endDate) {
      whereConditions.push(`CreatedAt <= @param${paramIndex}`);
      queryParams.push({ name: `param${paramIndex}`, type: sql.DateTime, value: new Date(filters.endDate) });
      paramIndex++;
    }

    // 定义可导出的字段
    const availableColumns = {
      'ID': 'ID',
      'CreatedAt': '创建时间',
      'Username': '用户名',
      'UserID': '用户ID',
      'Action': '操作',
      'Details': '详情',
      'Category': '分类',
      'Module': '模块',
      'ResourceType': '资源类型',
      'ResourceID': '资源ID',
      'OperationType': '操作类型',
      'Severity': '严重级别',
      'Duration': '耗时(ms)',
      'Status': '状态',
      'IPAddress': 'IP地址',
      'UserAgent': '用户代理',
      'SessionID': '会话ID',
      'TraceID': '追踪ID',
      'ErrorMessage': '错误信息'
    };

    // 确定要导出的字段
    const exportColumns = columns.length > 0 
      ? columns.filter(col => availableColumns[col])
      : Object.keys(availableColumns);

    if (exportColumns.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的导出字段'
      });
    }

    // 构建查询SQL
    const selectFields = exportColumns.join(', ');
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const query = `
      SELECT TOP ${maxRows} ${selectFields}
      FROM SystemLogs
      ${whereClause}
      ORDER BY CreatedAt DESC
    `;

    // 执行查询
    const pool = await sql.connect();
    const request = pool.request();
    
    // 添加查询参数
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);
    const data = result.recordset;

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有找到符合条件的日志记录'
      });
    }

    // 数据处理
    const processedData = data.map(row => {
      const processedRow = {};
      exportColumns.forEach(col => {
        let value = row[col];
        
        // 特殊字段处理
        if (col === 'CreatedAt' && value) {
          value = new Date(value).toLocaleString('zh-CN');
        } else if (col === 'Category') {
          const categoryLabels = {
            'AUTH': '认证授权',
            'USER_MGMT': '用户管理',
            'DATA_OP': '数据操作',
            'FILE_OP': '文件操作',
            'SYSTEM_CONFIG': '系统配置',
            'IMPORT_EXPORT': '导入导出',
            'QUERY_STATS': '查询统计',
            'SYSTEM_ERROR': '系统异常',
            'SECURITY': '安全相关',
            'PERFORMANCE': '性能监控'
          };
          value = categoryLabels[value] || value;
        } else if (col === 'Module') {
          const moduleLabels = {
            'AUTH': '认证',
            'USER': '用户',
            'ROLE': '角色',
            'PERMISSION': '权限',
            'DEPARTMENT': '部门',
            'POSITION': '岗位',
            'WORK_PLAN': '工作计划',
            'COMPLAINT': '投诉',
            'NOTICE': '通知',
            'CONFIG': '配置',
            'FILE': '文件',
            'ERP': 'ERP',
            'MATERIAL': '材料',
            'SAMPLE': '样品',
            'MENU': '菜单'
          };
          value = moduleLabels[value] || value;
        } else if (col === 'Status') {
          value = value === 'SUCCESS' ? '成功' : '失败';
        }
        
        processedRow[availableColumns[col]] = value || '';
      });
      return processedRow;
    });

    let fileName, filePath, mimeType;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    if (format === 'excel') {
      // 生成Excel文件
      fileName = `系统日志_${timestamp}.xlsx`;
      filePath = path.join(__dirname, '../temp', fileName);
      
      // 确保temp目录存在
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('系统日志');

      // 设置表头
      const headers = exportColumns.map(col => availableColumns[col]);
      worksheet.addRow(headers);

      // 设置表头样式
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // 添加数据
      processedData.forEach(row => {
        const rowData = exportColumns.map(col => row[availableColumns[col]]);
        worksheet.addRow(rowData);
      });

      // 自动调整列宽
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      await workbook.xlsx.writeFile(filePath);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    } else if (format === 'csv') {
      // 生成CSV文件
      fileName = `系统日志_${timestamp}.csv`;
      filePath = path.join(__dirname, '../temp', fileName);
      
      // 确保temp目录存在
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fields = exportColumns.map(col => ({
        label: availableColumns[col],
        value: availableColumns[col]
      }));

      const parser = new Parser({ fields, withBOM: true });
      const csv = parser.parse(processedData);
      
      fs.writeFileSync(filePath, csv, 'utf8');
      mimeType = 'text/csv';

    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的导出格式'
      });
    }

    // 记录导出成功日志
    const duration = Date.now() - startTime;
    await logger.logDataOperation({
      userID,
      username,
      action: '导出系统日志成功',
      details: `导出${data.length}条记录，格式: ${format}，文件: ${fileName}`,
      resourceType: 'SYSTEM_LOGS',
      operationType: 'EXPORT',
      duration,
      responseData: { fileName, recordCount: data.length },
      req
    });

    // 设置响应头并发送文件
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // 文件发送完成后删除临时文件
    fileStream.on('end', () => {
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 1000);
    });

  } catch (error) {
    console.error('导出日志失败:', error);
    
    // 记录导出失败日志
    const duration = Date.now() - startTime;
    await logger.logError({
      userID,
      username,
      action: '导出系统日志失败',
      details: `错误: ${error.message}`,
      resourceType: 'SYSTEM_LOGS',
      operationType: 'EXPORT',
      duration,
      errorMessage: error.message,
      req
    });

    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
    });
  }
});

/**
 * 获取导出模板
 * GET /api/log-export/template
 * 
 * 返回可导出的字段列表和格式选项
 */
router.get('/template', async (req, res) => {
  try {
    const availableColumns = {
      'ID': 'ID',
      'CreatedAt': '创建时间',
      'Username': '用户名',
      'UserID': '用户ID',
      'Action': '操作',
      'Details': '详情',
      'Category': '分类',
      'Module': '模块',
      'ResourceType': '资源类型',
      'ResourceID': '资源ID',
      'OperationType': '操作类型',
      'Severity': '严重级别',
      'Duration': '耗时(ms)',
      'Status': '状态',
      'IPAddress': 'IP地址',
      'UserAgent': '用户代理',
      'SessionID': '会话ID',
      'TraceID': '追踪ID',
      'ErrorMessage': '错误信息'
    };

    const formats = [
      { value: 'excel', label: 'Excel (.xlsx)' },
      { value: 'csv', label: 'CSV (.csv)' }
    ];

    res.json({
      success: true,
      data: {
        availableColumns,
        formats,
        maxRows: 50000,
        defaultColumns: ['ID', 'CreatedAt', 'Username', 'Action', 'Details', 'Category', 'Module', 'Severity', 'Status']
      }
    });

  } catch (error) {
    console.error('获取导出模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取导出模板失败',
      error: error.message
    });
  }
});

module.exports = router;