/**
 * 日志自动清理服务
 * 提供按时间、大小、级别自动清理过期日志的功能
 */

const { sql, getDynamicConfig } = require('../db');
const { logger, SEVERITY_LEVELS } = require('../utils/logger');
const cron = require('node-cron');

/**
 * 日志清理配置
 */
const CLEANUP_CONFIG = {
  // 保留天数配置（按严重级别）
  retentionDays: {
    DEBUG: 7,      // DEBUG日志保留7天
    INFO: 30,      // INFO日志保留30天
    WARN: 90,      // WARN日志保留90天
    ERROR: 180,    // ERROR日志保留180天
    FATAL: 365     // FATAL日志保留365天
  },
  
  // 最大日志条数（超过时清理最旧的记录）
  maxLogCount: 1000000,
  
  // 单次清理的最大条数
  batchSize: 10000,
  
  // 清理任务执行时间（每天凌晨2点）
  cronSchedule: '0 2 * * *'
};

/**
 * 日志清理服务类
 */
class LogCleanupService {
  constructor() {
    this.isRunning = false;
    this.lastCleanupTime = null;
    this.cleanupStats = {
      totalCleaned: 0,
      lastCleanupDate: null,
      lastCleanupDuration: 0
    };
  }

  /**
   * 启动日志清理服务
   */
  start() {
    // 启动日志自动清理服务
    
    // 设置定时任务
    cron.schedule(CLEANUP_CONFIG.cronSchedule, async () => {
      await this.performCleanup();
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });
    
    // 日志清理服务已启动，将在每天凌晨2点执行清理任务
    
    // 启动时执行一次清理（可选）
    // this.performCleanup();
  }

  /**
   * 执行日志清理
   */
  async performCleanup() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    let totalCleaned = 0;

    try {
      // 开始执行日志清理任务
      
      // 按严重级别清理过期日志
      for (const [severity, retentionDays] of Object.entries(CLEANUP_CONFIG.retentionDays)) {
        const cleaned = await this.cleanupByRetention(severity, retentionDays);
        totalCleaned += cleaned;
      }
      
      // 按总数限制清理
      const cleanedByCount = await this.cleanupByCount();
      totalCleaned += cleanedByCount;
      
      // 清理孤立的会话记录
      const cleanedOrphaned = await this.cleanupOrphanedSessions();
      totalCleaned += cleanedOrphaned;
      
      const duration = Date.now() - startTime;
      
      // 更新清理统计
      this.cleanupStats = {
        totalCleaned: this.cleanupStats.totalCleaned + totalCleaned,
        lastCleanupDate: new Date(),
        lastCleanupDuration: duration
      };
      
      // 记录清理操作日志
      await logger.log({
        action: '系统日志自动清理',
        details: `清理了 ${totalCleaned} 条过期日志记录`,
        category: 'SYSTEM_CONFIG',
        module: 'SYSTEM_LOG',
        operationType: 'DELETE',
        severity: SEVERITY_LEVELS.INFO,
        duration,
        responseData: {
          totalCleaned,
          cleanupStats: this.cleanupStats
        },
        status: 'SUCCESS'
      });
      
    } catch (error) {
      console.error('❌ 日志清理任务失败:', error);
      
      // 记录错误日志
      await logger.log({
        action: '系统日志自动清理失败',
        details: `日志清理任务执行失败: ${error.message}`,
        category: 'SYSTEM_ERROR',
        module: 'SYSTEM_LOG',
        severity: SEVERITY_LEVELS.ERROR,
        status: 'ERROR',
        errorMessage: error.stack || error.message
      });
      
    } finally {
      this.isRunning = false;
      this.lastCleanupTime = new Date();
    }
  }

  /**
   * 按保留期限清理日志
   */
  async cleanupByRetention(severity, retentionDays) {
    let pool;
    let totalCleaned = 0;
    
    try {
      pool = await sql.connect(await getDynamicConfig());
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // 分批删除以避免长时间锁表
      let hasMore = true;
      
      while (hasMore) {
        const result = await pool.request()
          .input('severity', sql.NVarChar(20), severity)
          .input('cutoffDate', sql.DateTime, cutoffDate)
          .input('batchSize', sql.Int, CLEANUP_CONFIG.batchSize)
          .query(`
            DELETE TOP (@batchSize) FROM [dbo].[SystemLogs]
            WHERE Severity = @severity 
            AND CreatedAt < @cutoffDate
          `);
        
        const deletedCount = result.rowsAffected[0] || 0;
        totalCleaned += deletedCount;
        
        // 如果删除的记录数少于批次大小，说明已经清理完毕
        hasMore = deletedCount >= CLEANUP_CONFIG.batchSize;
        
        // 短暂休息以减少数据库压力
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
    } catch (error) {
      console.error(`清理 ${severity} 级别日志失败:`, error);
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
    
    return totalCleaned;
  }

  /**
   * 按总数限制清理日志
   */
  async cleanupByCount() {
    let pool;
    let totalCleaned = 0;
    
    try {
      pool = await sql.connect(await getDynamicConfig());
      
      // 检查当前日志总数
      const countResult = await pool.request().query(`
        SELECT COUNT(*) as total FROM [dbo].[SystemLogs]
      `);
      
      const currentCount = countResult.recordset[0].total;
      
      if (currentCount <= CLEANUP_CONFIG.maxLogCount) {
        return 0; // 无需清理
      }
      
      const excessCount = currentCount - CLEANUP_CONFIG.maxLogCount;
      
      // 删除最旧的记录
      let remainingToDelete = excessCount;
      
      while (remainingToDelete > 0) {
        const batchSize = Math.min(remainingToDelete, CLEANUP_CONFIG.batchSize);
        
        const result = await pool.request()
          .input('batchSize', sql.Int, batchSize)
          .query(`
            DELETE FROM [dbo].[SystemLogs]
            WHERE ID IN (
              SELECT TOP (@batchSize) ID 
              FROM [dbo].[SystemLogs]
              ORDER BY CreatedAt ASC
            )
          `);
        
        const deletedCount = result.rowsAffected[0] || 0;
        totalCleaned += deletedCount;
        remainingToDelete -= deletedCount;
        
        // 如果没有删除任何记录，退出循环
        if (deletedCount === 0) {
          break;
        }
        
        // 短暂休息
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error('按数量限制清理日志失败:', error);
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
    
    return totalCleaned;
  }

  /**
   * 清理孤立的会话日志
   * 删除超过24小时且没有关联用户的会话日志
   */
  async cleanupOrphanedSessions() {
    let pool;
    let totalCleaned = 0;
    
    try {
      pool = await sql.connect(await getDynamicConfig());
      
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);
      
      const result = await pool.request()
        .input('cutoffDate', sql.DateTime, cutoffDate)
        .query(`
          DELETE FROM [dbo].[SystemLogs]
          WHERE UserID IS NULL 
          AND CreatedAt < @cutoffDate
          AND (Action LIKE '%匿名%' OR Action LIKE '%anonymous%')
        `);
      
      totalCleaned = result.rowsAffected[0] || 0;
      
    } catch (error) {
      console.error('清理孤立会话日志失败:', error);
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
    
    return totalCleaned;
  }

  /**
   * 手动执行清理
   */
  async manualCleanup(options = {}, userInfo = {}) {
    const {
      severity,
      beforeDate,
      maxCount
    } = options;
    
    const {
      userID,
      userName,
      ipAddress,
      userAgent
    } = userInfo;
    
    if (this.isRunning) {
      throw new Error('清理任务正在运行中，请稍后再试');
    }
    
    let pool;
    let totalCleaned = 0;
    
    try {
      pool = await sql.connect(await getDynamicConfig());
      
      let whereConditions = [];
      let queryParams = {};
      
      if (severity) {
        whereConditions.push('Severity = @severity');
        queryParams.severity = severity;
      }
      
      if (beforeDate) {
        whereConditions.push('CreatedAt < @beforeDate');
        queryParams.beforeDate = new Date(beforeDate);
      }
      
      const whereClause = whereConditions.length > 0 ? 
        'WHERE ' + whereConditions.join(' AND ') : '';
      
      let query;
      if (maxCount) {
        query = `
          DELETE TOP (@maxCount) FROM [dbo].[SystemLogs]
          ${whereClause}
          ORDER BY CreatedAt ASC
        `;
        queryParams.maxCount = parseInt(maxCount);
      } else {
        query = `DELETE FROM [dbo].[SystemLogs] ${whereClause}`;
      }
      
      const request = pool.request();
      Object.keys(queryParams).forEach(key => {
        request.input(key, queryParams[key]);
      });
      
      const result = await request.query(query);
      totalCleaned = result.rowsAffected[0] || 0;
      
      // 记录手动清理日志
      await logger.log({
        userID,
        userName,
        action: '手动清理系统日志',
        details: `手动清理了 ${totalCleaned} 条日志记录`,
        category: 'SYSTEM_CONFIG',
        module: 'SYSTEM_LOG',
        operationType: 'DELETE',
        severity: SEVERITY_LEVELS.INFO,
        ipAddress,
        userAgent,
        requestData: options,
        responseData: { totalCleaned },
        status: 'SUCCESS'
      });
      
    } catch (error) {
      console.error('手动清理日志失败:', error);
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
    
    return totalCleaned;
  }

  /**
   * 获取清理统计信息
   */
  getCleanupStats() {
    return {
      ...this.cleanupStats,
      isRunning: this.isRunning,
      lastCleanupTime: this.lastCleanupTime,
      config: CLEANUP_CONFIG
    };
  }

  /**
   * 更新清理配置
   */
  updateConfig(newConfig) {
    Object.assign(CLEANUP_CONFIG, newConfig);
    // 日志清理配置已更新
  }
}

// 创建全局清理服务实例
const logCleanupService = new LogCleanupService();

module.exports = {
  logCleanupService,
  LogCleanupService,
  CLEANUP_CONFIG
};