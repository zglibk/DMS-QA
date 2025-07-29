/**
 * 数据库配置模块
 * 
 * 这个文件作为数据库配置的统一入口，
 * 重新导出db.js中的配置和函数
 */

const { getDynamicConfig, getConnection, executeQuery, sql, config } = require('../db');

module.exports = {
  getDynamicConfig,
  getConnection,
  executeQuery,
  sql,
  config
};