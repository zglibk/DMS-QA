/**
 * 系统日志导出路由
 * 
 * 功能说明：
 * 1. 支持Excel和CSV格式导出
 * 2. 支持按条件过滤导出
 * 3. 支持大数据量流式导出
 * 4. 异步任务处理，避免超时
 * 5. 记录导出操作日志
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 导出任务状态管理
const exportTasks = new Map();

/**
 * 清理过期的导出任务
 */
setInterval(() => {
  const now = Date.now();
  for (const [taskId, task] of exportTasks.entries()) {
    // 清理超过1小时的任务
    if (now - task.createdAt > 3600000) {
      if (task.filePath && fs.existsSync(task.filePath)) {
        fs.unlinkSync(task.filePath);
      }
      exportTasks.delete(taskId);
    }
  }
}, 300000); // 每5分钟清理一次

/**
 * 启动异步导出任务
 * POST /api/log-export/start-export
 * 
 * 请求参数：
 * - format: 导出格式 (excel/csv)
 * - filters: 过滤条件
 * - columns: 导出字段
 * - maxRows: 最大导出行数
 * 
 * 返回：
 * - taskId: 任务ID，用于查询进度和下载
 */
router.post('/start-export', async (req, res) => {
  
  const { userID, username } = req.user || {};
  
  try {
    const {
      format = 'excel',
      filters = {},
      columns = [],
      maxRows = 10000
    } = req.body;

    // 生成任务ID
    const taskId = uuidv4();
    
    // 创建任务记录
    const task = {
      id: taskId,
      status: 'pending', // pending, processing, completed, failed
      progress: 0,
      createdAt: Date.now(),
      userID,
      username,
      format,
      filters,
      columns,
      maxRows,
      fileName: null,
      filePath: null,
      error: null,
      recordCount: 0
    };
    
    exportTasks.set(taskId, task);
    
    // 异步执行导出任务
    processExportTask(taskId).catch(error => {
      console.error(`❌ 处理导出任务时发生错误:`, error);
      const task = exportTasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = error.message;
      }
    });
    
    // 立即返回任务ID
    res.json({
      success: true,
      taskId,
      message: '导出任务已启动，请稍后查询进度'
    });
    
  } catch (error) {
    console.error(`❌ 启动导出任务失败:`, error);
    res.status(500).json({
      success: false,
      message: '启动导出任务失败',
      error: error.message
    });
  }
});

/**
 * 查询导出任务状态
 * GET /api/log-export/task-status/:taskId
 */
router.get('/task-status/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  const task = exportTasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务不存在或已过期'
    });
  }
  
  res.json({
    success: true,
    task: {
      id: task.id,
      status: task.status,
      progress: task.progress,
      fileName: task.fileName,
      recordCount: task.recordCount,
      error: task.error,
      createdAt: task.createdAt
    }
  });
});

/**
 * 下载导出文件
 * GET /api/log-export/download/:taskId
 */
router.get('/download/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  const task = exportTasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务不存在或已过期'
    });
  }
  
  if (task.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: '文件尚未准备就绪'
    });
  }
  
  if (!task.fileBuffer) {
    return res.status(404).json({
      success: false,
      message: '文件不存在'
    });
  }
  
  // 设置响应头
  const mimeType = task.format === 'excel' 
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';
    
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(task.fileName)}"`);
  res.setHeader('Content-Length', task.fileBuffer.length);
  
  try {
    // 直接发送文件内容
    res.send(task.fileBuffer);
    
    // 清理任务
    exportTasks.delete(taskId);
  } catch (error) {
    console.error(`❌ 文件发送失败:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '文件发送失败'
      });
    }
  }
});

/**
 * 异步处理导出任务
 * @param {string} taskId 任务ID
 */
async function processExportTask(taskId) {
  const task = exportTasks.get(taskId);
  if (!task) return;
  
  const startTime = Date.now();
  
  try {
    task.status = 'processing';
    task.progress = 10;
    
    const { userID, username, format, filters, columns, maxRows } = task;
    
    // 记录导出开始日志
    await logger.logDataOperation(
      userID,
      '开始导出系统日志',
      'SYSTEM_LOGS',
      'EXPORT_TASK',
      'EXPORT',
      { headers: { 'user-agent': 'System' } },
      { format, filters, maxRows },
      null,
      null
    );
    
    task.progress = 20;

    // 构建查询条件（复用原有逻辑）
    const { whereConditions, queryParams } = buildQueryConditions(filters);
    task.progress = 30;

    // 定义可导出的字段
    const availableColumns = getAvailableColumns();
    
    // 确定要导出的字段
    const exportColumns = columns.length > 0 
      ? columns.filter(col => availableColumns[col])
      : Object.keys(availableColumns);

    if (exportColumns.length === 0) {
      throw new Error('没有有效的导出字段');
    }
    
    task.progress = 40;

    // 分批查询数据（避免内存溢出）
    const batchSize = 1000;
    const allData = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore && allData.length < maxRows) {
      
      const batchData = await queryLogsBatch(exportColumns, whereConditions, queryParams, offset, batchSize);
      
      allData.push(...batchData);
      
      if (batchData.length < batchSize) {
        hasMore = false;
      }
      
      offset += batchSize;
      const newProgress = Math.min(40 + (allData.length / maxRows) * 40, 80);
      task.progress = newProgress;
    }
    
    task.recordCount = allData.length;
    
    if (allData.length === 0) {
      throw new Error('没有找到符合条件的日志记录');
    }
    
    task.progress = 85;

    // 处理数据
    const processedData = processLogData(allData, exportColumns, availableColumns);
    
    task.progress = 90;

    // 生成文件
    const { fileName, fileBuffer } = await generateExportFile(format, processedData, exportColumns, availableColumns);
    
    // 直接存储文件内容到任务对象中
    task.fileName = fileName;
    task.fileBuffer = fileBuffer;
    task.format = format;
    task.progress = 100;
    task.status = 'completed';
    
    // 记录导出成功日志
    const duration = Date.now() - startTime;
    await logger.logDataOperation(
      userID,
      '导出系统日志成功',
      'SYSTEM_LOGS',
      'EXPORT_TASK',
      'EXPORT',
      { headers: { 'user-agent': 'System' } },
      null,
      { fileName, recordCount: allData.length },
      duration
    );
    
  } catch (error) {
    console.error(`❌ 导出任务失败:`, error);
    
    task.status = 'failed';
    task.error = error.message;
    
    // 记录导出失败日志
    const duration = Date.now() - startTime;
    try {
      await logger.logError(
        task.userID,
        '导出系统日志失败',
        error,
        { headers: { 'user-agent': 'System' } },
        'LOG_EXPORT'
      );
    } catch (logError) {
      console.error(`❌ 记录失败日志时出错:`, logError);
    }
  }
}

/**
 * 构建查询条件
 * @param {Object} filters 过滤条件
 * @returns {Object} 查询条件和参数
 */
function buildQueryConditions(filters) {
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

  return { whereConditions, queryParams };
}

/**
 * 获取可导出的字段定义
 * @returns {Object} 字段映射
 */
function getAvailableColumns() {
  return {
    'ID': 'ID',
    'CreatedAt': '创建时间',
    'UserID': '用户ID',
    'Action': '操作',
    'Details': '详情',
    'Status': '状态',
    'IPAddress': 'IP地址',
    'UserAgent': '用户代理',
    'ErrorMessage': '错误信息'
  };
}

/**
 * 分批查询日志数据
 * @param {Array} exportColumns 导出字段
 * @param {Array} whereConditions 查询条件
 * @param {Array} queryParams 查询参数
 * @param {number} offset 偏移量
 * @param {number} batchSize 批次大小
 * @returns {Array} 查询结果
 */
async function queryLogsBatch(exportColumns, whereConditions, queryParams, offset, batchSize) {
  
  const selectFields = exportColumns.join(', ');
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const query = `
    SELECT TOP ${batchSize} ${selectFields}
    FROM (
      SELECT ${selectFields}, ROW_NUMBER() OVER (ORDER BY CreatedAt DESC) as RowNum
      FROM SystemLogs
      ${whereClause}
    ) AS NumberedResults
    WHERE RowNum > ${offset}
    ORDER BY CreatedAt DESC
  `;

  const queryStart = Date.now();

  try {
    const pool = await sql.connect();
    const request = pool.request();
    
    // 添加查询参数
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    const queryDuration = Date.now() - queryStart;
    console.error(`❌ 查询失败, 耗时: ${queryDuration}ms`);
    console.error(`❌ SQL错误:`, error);
    throw error;
  }
}

/**
 * 处理日志数据
 * @param {Array} data 原始数据
 * @param {Array} exportColumns 导出字段
 * @param {Object} availableColumns 字段映射
 * @returns {Array} 处理后的数据
 */
function processLogData(data, exportColumns, availableColumns) {
  return data.map(row => {
    const processedRow = {};
    
    exportColumns.forEach(column => {
      let value = row[column];
      
      // 格式化特殊字段
      if (column === 'CreatedAt' && value) {
        value = new Date(value).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } else if (column === 'Category' && value) {
        const categoryLabels = {
          'AUTHENTICATION': '身份验证',
          'AUTHORIZATION': '权限控制',
          'DATA_OPERATION': '数据操作',
          'FILE_OPERATION': '文件操作',
          'SYSTEM_ERROR': '系统错误',
          'SECURITY': '安全事件'
        };
        value = categoryLabels[value] || value;
      } else if (column === 'Module' && value) {
        const moduleLabels = {
          'USER_MANAGEMENT': '用户管理',
          'DOCUMENT_MANAGEMENT': '文档管理',
          'SYSTEM_LOGS': '系统日志',
          'AUTHENTICATION': '身份验证',
          'FILE_UPLOAD': '文件上传',
          'DATA_EXPORT': '数据导出'
        };
        value = moduleLabels[value] || value;
      } else if (column === 'Status' && value) {
        const statusLabels = {
          'SUCCESS': '成功',
          'FAILED': '失败',
          'WARNING': '警告',
          'INFO': '信息'
        };
        value = statusLabels[value] || value;
      }
      
      processedRow[availableColumns[column]] = value || '';
    });
    
    return processedRow;
  });
}

/**
 * 生成导出文件内容
 * @param {string} format 文件格式
 * @param {Array} data 数据
 * @param {Array} exportColumns 导出字段
 * @param {Object} availableColumns 字段映射
 * @returns {Object} 文件信息和内容
 */
async function generateExportFile(format, data, exportColumns, availableColumns) {
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  // 处理文件扩展名：excel格式使用xlsx扩展名
  const fileExtension = format === 'excel' ? 'xlsx' : format;
  const fileName = `系统日志_${timestamp}.${fileExtension}`;
  
  const fileGenStart = Date.now();
  let fileBuffer;
  
  try {
    if (format === 'xlsx' || format === 'excel') {
      fileBuffer = await generateExcelFileBuffer(data, exportColumns, availableColumns);
    } else if (format === 'csv') {
      fileBuffer = await generateCSVFileBuffer(data, exportColumns, availableColumns);
    } else {
      console.error(`❌ 不支持的文件格式: ${format}`);
      throw new Error(`不支持的文件格式: ${format}`);
    }
    
  } catch (error) {
    const fileGenDuration = Date.now() - fileGenStart;
    console.error(`❌ 文件生成失败, 耗时: ${fileGenDuration}ms`);
    console.error(`❌ 生成错误:`, error);
    throw error;
  }
  
  return { fileName, fileBuffer, format };
}

/**
 * 生成Excel文件Buffer
 * @param {Array} data 数据
 * @param {Array} exportColumns 导出字段
 * @param {Object} availableColumns 字段映射
 * @returns {Buffer} Excel文件Buffer
 */
async function generateExcelFileBuffer(data, exportColumns, availableColumns) {
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
  headerRow.eachCell(cell => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'a0a0a0' } },
      left: { style: 'thin', color: { argb: 'a0a0a0' } },
      bottom: { style: 'thin', color: { argb: 'a0a0a0' } },
      right: { style: 'thin', color: { argb: 'a0a0a0' } }
    };
  });
  
  // 添加数据行
  let processedRows = 0;
  data.forEach((row, index) => {
    const rowData = exportColumns.map(col => row[availableColumns[col]]);
    const addedRow = worksheet.addRow(rowData);
    addedRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'a0a0a0' } },
        left: { style: 'thin', color: { argb: 'a0a0a0' } },
        bottom: { style: 'thin', color: { argb: 'a0a0a0' } },
        right: { style: 'thin', color: { argb: 'a0a0a0' } }
      };
    });
    processedRows++;
  });
  
  // 自动调整列宽
  worksheet.columns.forEach((column, index) => {
    const header = headers[index];
    let maxLength = header.length;
    
    // 检查数据中的最大长度
    data.forEach(row => {
      const cellValue = String(row[header] || '');
      if (cellValue.length > maxLength) {
        maxLength = Math.min(cellValue.length, 50); // 限制最大宽度
      }
    });
    
    column.width = Math.max(maxLength + 2, 10);
  });
  
  const writeStart = Date.now();
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    const writeDuration = Date.now() - writeStart;
    console.error(`❌ Buffer生成失败, 耗时: ${writeDuration}ms`);
    console.error(`❌ 生成错误:`, error);
    throw error;
  }
}

/**
 * 生成CSV文件Buffer
 * @param {Array} data 数据
 * @param {Array} exportColumns 导出字段
 * @param {Object} availableColumns 字段映射
 * @returns {Buffer} CSV文件Buffer
 */
async function generateCSVFileBuffer(data, exportColumns, availableColumns) {
  
  const headers = exportColumns.map(col => availableColumns[col]);
  const csvData = [headers];
  
  let processedRows = 0;
  data.forEach((row, index) => {
    const rowData = exportColumns.map(col => {
      const value = row[availableColumns[col]] || '';
      // 处理包含逗号或引号的值
      return String(value).includes(',') || String(value).includes('"') 
        ? `"${String(value).replace(/"/g, '""')}"` 
        : String(value);
    });
    csvData.push(rowData);
    processedRows++;
  });
  
  const csvContent = csvData.map(row => row.join(',')).join('\n');
  
  const writeStart = Date.now();
  try {
    const buffer = Buffer.from('\ufeff' + csvContent, 'utf8'); // 添加BOM以支持中文
    return buffer;
  } catch (error) {
    const writeDuration = Date.now() - writeStart;
    console.error(`❌ Buffer生成失败, 耗时: ${writeDuration}ms`);
    console.error(`❌ 生成错误:`, error);
    throw error;
  }
}

/**
 * 原有的同步导出接口（保持兼容性）
 * POST /api/log-export/export
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
    await logger.logError(
      userID,
      '导出系统日志失败',
      error,
      req,
      'LOG_EXPORT'
    );

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