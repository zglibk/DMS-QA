/**
 * 统一日志记录工具类
 * 提供标准化的日志记录功能
 */

const { sql, getDynamicConfig } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * 日志分类枚举
 */
const LOG_CATEGORIES = {
  AUTH: 'AUTH',                    // 认证授权
  USER_MGMT: 'USER_MGMT',         // 用户管理
  DATA_OP: 'DATA_OP',             // 数据操作
  FILE_OP: 'FILE_OP',             // 文件操作
  SYSTEM_CONFIG: 'SYSTEM_CONFIG', // 系统配置
  IMPORT_EXPORT: 'IMPORT_EXPORT', // 数据导入导出
  QUERY_STATS: 'QUERY_STATS',     // 查询统计
  SYSTEM_ERROR: 'SYSTEM_ERROR',   // 系统异常
  SECURITY: 'SECURITY',           // 安全相关
  PERFORMANCE: 'PERFORMANCE'      // 性能监控
};

/**
 * 操作类型枚举
 */
const OPERATION_TYPES = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  SEARCH: 'SEARCH',
  VIEW: 'VIEW'
};

/**
 * 严重级别枚举
 */
const SEVERITY_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL'
};

/**
 * 系统模块枚举
 */
const MODULES = {
  AUTH: 'AUTH',
  USER: 'USER',
  ROLE: 'ROLE',
  PERMISSION: 'PERMISSION',
  DEPARTMENT: 'DEPARTMENT',
  POSITION: 'POSITION',
  WORK_PLAN: 'WORK_PLAN',
  COMPLAINT: 'COMPLAINT',
  NOTICE: 'NOTICE',
  CONFIG: 'CONFIG',
  FILE: 'FILE',
  ERP: 'ERP',
  MATERIAL: 'MATERIAL',
  SAMPLE: 'SAMPLE',
  MENU: 'MENU'
};

/**
 * 系统日志记录器类
 */
class SystemLogger {
  constructor() {
    this.pool = null;
  }

  /**
   * 获取数据库连接池
   */
  async getPool() {
    if (!this.pool) {
      this.pool = await sql.connect(await getDynamicConfig());
    }
    return this.pool;
  }

  /**
   * 记录系统日志
   * @param {Object} logData - 日志数据
   * @param {number} logData.userID - 用户ID
   * @param {string} logData.action - 操作动作
   * @param {string} logData.details - 详细信息
   * @param {string} logData.category - 日志分类
   * @param {string} logData.module - 所属模块
   * @param {string} logData.resourceType - 资源类型
   * @param {string} logData.resourceID - 资源ID
   * @param {string} logData.operationType - 操作类型
   * @param {string} logData.severity - 严重级别
   * @param {number} logData.duration - 操作耗时（毫秒）
   * @param {Object} logData.requestData - 请求数据
   * @param {Object} logData.responseData - 响应数据
   * @param {string} logData.sessionID - 会话ID
   * @param {string} logData.traceID - 链路追踪ID
   * @param {string} logData.ipAddress - IP地址
   * @param {string} logData.userAgent - 用户代理
   * @param {string} logData.status - 状态
   * @param {string} logData.errorMessage - 错误信息
   */
  async log(logData) {
    try {
      const pool = await this.getPool();
      
      // 生成TraceID（如果未提供）
      const traceID = logData.traceID || uuidv4();
      
      // 准备插入数据，确保字符串长度不超过数据库字段限制
      const truncateString = (str, maxLength) => {
        if (!str) return str;
        return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
      };
      
      const insertData = {
        UserID: logData.userID || null,
        Action: truncateString(logData.action || '', 100),
        Details: truncateString(logData.details || '', 1000),
        Category: logData.category || LOG_CATEGORIES.SYSTEM_ERROR,
        Module: logData.module || '',
        ResourceType: logData.resourceType || '',
        ResourceID: logData.resourceID || '',
        OperationType: logData.operationType || '',
        Severity: logData.severity || SEVERITY_LEVELS.INFO,
        Duration: logData.duration || null,
        RequestData: logData.requestData ? JSON.stringify(logData.requestData) : null,
        ResponseData: logData.responseData ? JSON.stringify(logData.responseData) : null,
        SessionID: logData.sessionID || '',
        TraceID: traceID,
        IPAddress: logData.ipAddress || '',
        UserAgent: truncateString(logData.userAgent || '', 500),
        Status: logData.status || 'SUCCESS',
        ErrorMessage: truncateString(logData.errorMessage || '', 1000),
        IsAnonymous: logData.isAnonymous || false,
        CreatedAt: new Date()
      };
      
      // 插入日志记录
      await pool.request()
        .input('UserID', sql.Int, insertData.UserID)
        .input('Action', sql.NVarChar(100), insertData.Action)
        .input('Details', sql.NVarChar(1000), insertData.Details)
        .input('Category', sql.NVarChar(50), insertData.Category)
        .input('Module', sql.NVarChar(50), insertData.Module)
        .input('ResourceType', sql.NVarChar(50), insertData.ResourceType)
        .input('ResourceID', sql.NVarChar(100), insertData.ResourceID)
        .input('OperationType', sql.NVarChar(20), insertData.OperationType)
        .input('Severity', sql.NVarChar(20), insertData.Severity)
        .input('Duration', sql.Int, insertData.Duration)
        .input('RequestData', sql.NVarChar(sql.MAX), insertData.RequestData)
        .input('ResponseData', sql.NVarChar(sql.MAX), insertData.ResponseData)
        .input('SessionID', sql.NVarChar(100), insertData.SessionID)
        .input('TraceID', sql.NVarChar(100), insertData.TraceID)
        .input('IPAddress', sql.NVarChar(45), insertData.IPAddress)
        .input('UserAgent', sql.NVarChar(500), insertData.UserAgent)
        .input('Status', sql.NVarChar(20), insertData.Status)
        .input('ErrorMessage', sql.NVarChar(1000), insertData.ErrorMessage)
        .input('IsAnonymous', sql.Bit, insertData.IsAnonymous)
        .input('CreatedAt', sql.DateTime, insertData.CreatedAt)
        .query(`
          INSERT INTO [dbo].[SystemLogs] (
            [UserID], [Action], [Details], [Category], [Module], [ResourceType], 
            [ResourceID], [OperationType], [Severity], [Duration], [RequestData], 
            [ResponseData], [SessionID], [TraceID], [IPAddress], [UserAgent], 
            [Status], [ErrorMessage], [IsAnonymous], [CreatedAt]
          ) VALUES (
            @UserID, @Action, @Details, @Category, @Module, @ResourceType, 
            @ResourceID, @OperationType, @Severity, @Duration, @RequestData, 
            @ResponseData, @SessionID, @TraceID, @IPAddress, @UserAgent, 
            @Status, @ErrorMessage, @IsAnonymous, @CreatedAt
          )
        `);
      
      return traceID;
    } catch (error) {
      console.error('记录系统日志失败:', error);
      // 不抛出异常，避免影响主业务流程
    }
  }

  /**
   * 记录认证相关日志
   */
  async logAuth(userID, action, details, req, status = 'SUCCESS', errorMessage = '') {
    return await this.log({
      userID,
      action,
      details,
      category: LOG_CATEGORIES.AUTH,
      module: MODULES.AUTH,
      operationType: action.includes('登录') ? OPERATION_TYPES.LOGIN : 
                    action.includes('登出') ? OPERATION_TYPES.LOGOUT : OPERATION_TYPES.VIEW,
      severity: status === 'SUCCESS' ? SEVERITY_LEVELS.INFO : SEVERITY_LEVELS.WARN,
      ipAddress: this.getClientIP(req),
      userAgent: req?.headers?.['user-agent'] || '',
      sessionID: req?.sessionID || '',
      status,
      errorMessage
    });
  }

  /**
   * 记录数据操作日志
   */
  async logDataOperation(userID, action, resourceType, resourceID, operationType, req, requestData = null, responseData = null, duration = null) {
    return await this.log({
      userID,
      action,
      details: `${operationType} ${resourceType}: ${resourceID}`,
      category: LOG_CATEGORIES.DATA_OP,
      module: this.getModuleByResourceType(resourceType),
      resourceType,
      resourceID: String(resourceID),
      operationType,
      severity: SEVERITY_LEVELS.INFO,
      duration,
      requestData,
      responseData,
      ipAddress: this.getClientIP(req),
      userAgent: req?.headers?.['user-agent'] || '',
      sessionID: req?.sessionID || ''
    });
  }

  /**
   * 记录文件操作日志
   */
  async logFileOperation(userID, action, fileName, operationType, req, fileSize = null) {
    return await this.log({
      userID,
      action,
      details: `文件${operationType}: ${fileName}`,
      category: LOG_CATEGORIES.FILE_OP,
      module: MODULES.FILE,
      resourceType: 'FILE',
      resourceID: fileName,
      operationType,
      severity: SEVERITY_LEVELS.INFO,
      requestData: fileSize ? { fileSize } : null,
      ipAddress: this.getClientIP(req),
      userAgent: req?.headers?.['user-agent'] || '',
      sessionID: req?.sessionID || ''
    });
  }

  /**
   * 记录系统错误日志
   */
  async logError(userID, action, error, req, module = '') {
    return await this.log({
      userID,
      action,
      details: `系统错误: ${error.message}`,
      category: LOG_CATEGORIES.SYSTEM_ERROR,
      module,
      severity: SEVERITY_LEVELS.ERROR,
      ipAddress: this.getClientIP(req),
      userAgent: req?.headers?.['user-agent'] || '',
      sessionID: req?.sessionID || '',
      status: 'ERROR',
      errorMessage: error.stack || error.message
    });
  }

  /**
   * 记录安全相关日志
   */
  async logSecurity(userID, action, details, req, severity = SEVERITY_LEVELS.WARN) {
    return await this.log({
      userID,
      action,
      details,
      category: LOG_CATEGORIES.SECURITY,
      module: MODULES.AUTH,
      severity,
      ipAddress: this.getClientIP(req),
      userAgent: req?.headers?.['user-agent'] || '',
      sessionID: req?.sessionID || ''
    });
  }

  /**
   * 获取客户端IP地址
   */
  getClientIP(req) {
    if (!req) return '';
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || '';
  }

  /**
   * 根据资源类型获取模块名称
   */
  getModuleByResourceType(resourceType) {
    const moduleMap = {
      'USER': MODULES.USER,
      'ROLE': MODULES.ROLE,
      'PERMISSION': MODULES.PERMISSION,
      'DEPARTMENT': MODULES.DEPARTMENT,
      'POSITION': MODULES.POSITION,
      'WORK_PLAN': MODULES.WORK_PLAN,
      'COMPLAINT': MODULES.COMPLAINT,
      'NOTICE': MODULES.NOTICE,
      'CONFIG': MODULES.CONFIG,
      'FILE': MODULES.FILE,
      'ERP': MODULES.ERP,
      'MATERIAL': MODULES.MATERIAL,
      'SAMPLE': MODULES.SAMPLE,
      'MENU': MODULES.MENU
    };
    return moduleMap[resourceType] || '';
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}

// 创建全局日志记录器实例
const logger = new SystemLogger();

module.exports = {
  logger,
  SystemLogger,
  LOG_CATEGORIES,
  OPERATION_TYPES,
  SEVERITY_LEVELS,
  MODULES
};