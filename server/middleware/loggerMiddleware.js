/**
 * 日志记录中间件
 * 自动记录HTTP请求和响应日志
 */

const { logger, LOG_CATEGORIES, OPERATION_TYPES, SEVERITY_LEVELS } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * 日志记录中间件
 * 自动记录所有HTTP请求的详细信息
 */
function loggerMiddleware(options = {}) {
  const {
    excludePaths = ['/health', '/favicon.ico'], // 排除的路径
    logRequestBody = true,                       // 是否记录请求体
    logResponseBody = false,                     // 是否记录响应体
    maxBodySize = 10000                         // 最大记录的请求/响应体大小
  } = options;

  return async (req, res, next) => {
    // 检查是否需要排除此路径
    if (excludePaths.some(path => req.path.includes(path))) {
      return next();
    }

    // 生成请求追踪ID
    const traceID = uuidv4();
    req.traceID = traceID;

    // 记录请求开始时间
    const startTime = Date.now();

    // 用户信息将在响应完成时获取，因为认证中间件在路由中执行
    let userID = 0;
    let userName = 'Anonymous';

    // 准备请求数据
    const requestData = {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: filterSensitiveHeaders(req.headers),
      query: req.query,
      params: req.params
    };

    // 添加请求体（如果启用且不是敏感数据）
    if (logRequestBody && req.body && !isSensitiveEndpoint(req.path)) {
      const bodyStr = JSON.stringify(req.body);
      requestData.body = bodyStr.length > maxBodySize ? 
        bodyStr.substring(0, maxBodySize) + '...[truncated]' : 
        req.body;
    }

    // 拦截响应以记录响应数据
    const originalSend = res.send;
    let responseData = null;
    let responseStatus = null;

    res.send = function(data) {
      responseStatus = res.statusCode;
      
      // 记录响应数据（如果启用）
      if (logResponseBody && data) {
        try {
          const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
          responseData = dataStr.length > maxBodySize ? 
            dataStr.substring(0, maxBodySize) + '...[truncated]' : 
            (typeof data === 'string' ? data : JSON.parse(dataStr));
        } catch (error) {
          responseData = { error: 'Failed to parse response data' };
        }
      }

      return originalSend.call(this, data);
    };

    // 请求完成后记录日志
    res.on('finish', async () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const isError = res.statusCode >= 400;
      
      // 在响应完成时重新获取用户信息，此时认证中间件已经执行
      userID = req.user?.id || req.user?.ID || null;
      userName = req.user?.username || req.user?.Username || null;
      const ipAddress = getClientIP(req);
      
      // 判断是否为匿名访问
      const isAnonymous = !userID;
      
      // 构建请求数据对象
      const requestDataObj = {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        params: req.params
      };
      
      // 如果是POST/PUT/PATCH请求，记录请求体（排除敏感信息）
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        const sanitizedBody = { ...req.body };
        // 移除敏感字段
        delete sanitizedBody.password;
        delete sanitizedBody.token;
        delete sanitizedBody.secret;
        requestDataObj.body = sanitizedBody;
      }
      
      // 构建响应数据对象
      const responseDataObj = {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage
      };
      
      // 根据用户身份构建不同的日志详情
      let logDetails;
      if (isAnonymous) {
        logDetails = `匿名用户访问 ${req.method} ${req.originalUrl || req.url}`;
      } else {
        logDetails = `${userName} 访问 ${req.method} ${req.originalUrl || req.url}`;
      }
      
      // 异步记录日志，避免阻塞响应
      setImmediate(async () => {
        try {
          await logger.log({
            userID: userID || 0, // 数据库字段不允许null，匿名用户使用0
            userName: userName || 'Anonymous',
            action: `${req.method} ${req.originalUrl}`,
            details: logDetails,
            category: determineCategory(req.path, req.method),
            module: determineModule(req.path),
            resourceType: determineResourceType(req.path),
            resourceID: extractResourceID(req),
            operationType: mapMethodToOperation(req.method),
            severity: isError ? SEVERITY_LEVELS.WARN : SEVERITY_LEVELS.INFO,
            duration,
            requestData: requestDataObj,
            responseData: responseDataObj,
            sessionID: req.sessionID || '',
            traceID,
            ipAddress,
            userAgent: req.headers['user-agent'] || '',
            status: isError ? 'ERROR' : 'SUCCESS',
            errorMessage: isError ? `HTTP ${res.statusCode}` : '',
            isAnonymous
          });
        } catch (error) {
          console.error('记录系统日志失败:', error);
        }
      });
    });

    next();
  };
}

/**
 * 过滤敏感的请求头信息
 */
function filterSensitiveHeaders(headers) {
  const filtered = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  
  sensitiveHeaders.forEach(header => {
    if (filtered[header]) {
      filtered[header] = '[FILTERED]';
    }
  });
  
  return filtered;
}

/**
 * 检查是否为敏感端点
 */
function isSensitiveEndpoint(path) {
  const sensitiveEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/change-password',
    '/api/users/password'
  ];
  
  return sensitiveEndpoints.some(endpoint => path.includes(endpoint));
}

/**
 * 根据路径确定日志分类
 */
function determineCategory(path, method) {
  if (path.includes('/auth/')) return LOG_CATEGORIES.AUTH;
  if (path.includes('/users/') || path.includes('/user/')) return LOG_CATEGORIES.USER_MGMT;
  if (path.includes('/upload/') || path.includes('/files/')) return LOG_CATEGORIES.FILE_OP;
  if (path.includes('/config/') || path.includes('/settings/')) return LOG_CATEGORIES.SYSTEM_CONFIG;
  if (path.includes('/import/') || path.includes('/export/')) return LOG_CATEGORIES.IMPORT_EXPORT;
  if (path.includes('/search/') || path.includes('/query/')) return LOG_CATEGORIES.QUERY_STATS;
  if (method === 'GET' && path.includes('/stats/')) return LOG_CATEGORIES.QUERY_STATS;
  
  return LOG_CATEGORIES.DATA_OP;
}

/**
 * 根据路径确定模块
 */
function determineModule(path) {
  if (path.includes('/auth/')) return 'AUTH';
  if (path.includes('/users/')) return 'USER';
  if (path.includes('/roles/')) return 'ROLE';
  if (path.includes('/permissions/')) return 'PERMISSION';
  if (path.includes('/departments/')) return 'DEPARTMENT';
  if (path.includes('/positions/')) return 'POSITION';
  if (path.includes('/work-plan/') || path.includes('/workPlan/')) return 'WORK_PLAN';
  if (path.includes('/complaints/')) return 'COMPLAINT';
  if (path.includes('/notices/')) return 'NOTICE';
  if (path.includes('/config/')) return 'CONFIG';
  if (path.includes('/files/') || path.includes('/upload/')) return 'FILE';
  if (path.includes('/erp/')) return 'ERP';
  if (path.includes('/material/')) return 'MATERIAL';
  if (path.includes('/sample/')) return 'SAMPLE';
  if (path.includes('/menus/')) return 'MENU';
  if (path.includes('/monthly-batch-stats/')) return 'MONTHLY_BATCH_STATS';
  
  return 'UNKNOWN';
}

/**
 * 根据路径确定资源类型
 */
function determineResourceType(path) {
  if (path.includes('/users/')) return 'USER';
  if (path.includes('/roles/')) return 'ROLE';
  if (path.includes('/permissions/')) return 'PERMISSION';
  if (path.includes('/departments/')) return 'DEPARTMENT';
  if (path.includes('/positions/')) return 'POSITION';
  if (path.includes('/work-plan/') || path.includes('/workPlan/')) return 'WORK_PLAN';
  if (path.includes('/complaints/')) return 'COMPLAINT';
  if (path.includes('/notices/')) return 'NOTICE';
  if (path.includes('/config/')) return 'CONFIG';
  if (path.includes('/files/')) return 'FILE';
  if (path.includes('/erp/')) return 'ERP';
  if (path.includes('/material/')) return 'MATERIAL';
  if (path.includes('/sample/')) return 'SAMPLE';
  if (path.includes('/menus/')) return 'MENU';
  
  return 'API';
}

/**
 * 提取资源ID
 */
function extractResourceID(req) {
  // 从路径参数中提取ID
  if (req.params && req.params.id) return req.params.id;
  if (req.params && req.params.userId) return req.params.userId;
  if (req.params && req.params.roleId) return req.params.roleId;
  if (req.params && req.params.departmentId) return req.params.departmentId;
  
  // 从查询参数中提取ID
  if (req.query && req.query.id) return req.query.id;
  
  // 从请求体中提取ID
  if (req.body && req.body.id) return req.body.id;
  if (req.body && req.body.ID) return req.body.ID;
  
  return '';
}

/**
 * 将HTTP方法映射到操作类型
 */
function mapMethodToOperation(method) {
  const methodMap = {
    'GET': OPERATION_TYPES.read,
    'POST': OPERATION_TYPES.CREATE,
    'PUT': OPERATION_TYPES.UPDATE,
    'PATCH': OPERATION_TYPES.UPDATE,
    'DELETE': OPERATION_TYPES.DELETE
  };
  
  return methodMap[method] || OPERATION_TYPES.VIEW;
}

/**
 * 获取客户端真实IP地址
 * @param {Object} req - Express请求对象
 * @returns {string} 客户端IP地址
 */
function getClientIP(req) {
  // 优先从代理头获取真实IP
  let ip = req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.headers['x-client-ip'] ||
           req.headers['cf-connecting-ip'] || // Cloudflare
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip;
  
  // 处理x-forwarded-for可能包含多个IP的情况
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // 处理IPv6映射的IPv4地址
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // 如果仍然无法获取IP，返回默认值
  return ip || 'unknown';
}

/**
 * 错误日志记录中间件
 * 记录未捕获的错误
 */
function errorLoggerMiddleware() {
  return async (error, req, res, next) => {
    const userID = req.user?.id || req.user?.ID || null;
    
    try {
      await logger.logError(
        userID,
        `${req.method} ${req.path} - 未捕获错误`,
        error,
        req,
        determineModule(req.path)
      );
    } catch (logError) {
      console.error('记录错误日志失败:', logError);
    }
    
    next(error);
  };
}

module.exports = {
  loggerMiddleware,
  errorLoggerMiddleware
};