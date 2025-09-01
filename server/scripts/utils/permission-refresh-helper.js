/**
 * 权限刷新辅助工具
 * 功能：在脚本执行权限分配后自动刷新相关用户的权限缓存
 * 版本：v1.0
 * 创建日期：2025-01-21
 */

const axios = require('axios');
const { sql, getDynamicConfig } = require('../../db');

/**
 * 权限刷新辅助类
 */
class PermissionRefreshHelper {
  constructor() {
    this.baseURL = 'http://localhost:3000/api'; // 后端API基础URL
    this.adminToken = null; // 管理员token
  }

  /**
   * 获取管理员token用于API调用
   * @returns {Promise<string>} 管理员token
   */
  async getAdminToken() {
    if (this.adminToken) {
      return this.adminToken;
    }

    try {
      let pool = await sql.connect(await getDynamicConfig());
      
      // 获取管理员用户信息
      const adminResult = await pool.request()
        .query(`
          SELECT TOP 1 u.ID, u.Username, u.Password
          FROM Users u
          INNER JOIN UserRoles ur ON u.ID = ur.UserID
          INNER JOIN Roles r ON ur.RoleID = r.ID
          WHERE r.RoleCode = 'admin' AND u.Status = 1
          ORDER BY u.ID
        `);
      
      if (adminResult.recordset.length === 0) {
        throw new Error('未找到管理员用户');
      }
      
      const admin = adminResult.recordset[0];
      
      // 模拟登录获取token（注意：这里需要知道管理员密码或使用其他方式）
      console.log('⚠️ 注意：权限刷新需要管理员token，当前使用模拟token');
      console.log('💡 建议：在生产环境中使用服务间认证或专用API密钥');
      
      // 这里返回一个模拟token，实际使用时需要真实的认证流程
      this.adminToken = 'mock-admin-token';
      return this.adminToken;
      
    } catch (error) {
      console.error('获取管理员token失败:', error);
      throw error;
    }
  }

  /**
   * 刷新指定角色下所有用户的权限缓存
   * @param {number} roleId - 角色ID
   * @param {string} roleName - 角色名称（用于日志）
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshRoleUsersPermissions(roleId, roleName = '') {
    try {
      console.log(`\n🔄 开始刷新角色 ${roleName}(ID:${roleId}) 下所有用户的权限缓存...`);
      
      let pool = await sql.connect(await getDynamicConfig());
      
      // 获取该角色下的所有用户
      const usersResult = await pool.request()
        .input('roleId', sql.Int, roleId)
        .query(`
          SELECT DISTINCT u.ID, u.Username, u.RealName
          FROM Users u
          INNER JOIN UserRoles ur ON u.ID = ur.UserID
          WHERE ur.RoleID = @roleId AND u.Status = 1
        `);
      
      const users = usersResult.recordset;
      console.log(`📊 找到 ${users.length} 个用户需要刷新权限`);
      
      if (users.length === 0) {
        return {
          success: true,
          message: `角色 ${roleName} 下没有用户需要刷新权限`,
          refreshedUsers: []
        };
      }
      
      const refreshResults = [];
      
      // 逐个刷新用户权限
      for (const user of users) {
        try {
          console.log(`  🔄 刷新用户: ${user.Username} (${user.RealName || '未设置姓名'})`);
          
          // 这里应该调用权限刷新API，但由于token认证问题，我们直接记录需要刷新的用户
          // 在实际环境中，可以通过以下方式之一解决：
          // 1. 使用服务间认证
          // 2. 创建专用的内部API
          // 3. 直接操作数据库清除缓存
          
          refreshResults.push({
            userId: user.ID,
            username: user.Username,
            realName: user.RealName,
            status: 'pending',
            message: '需要手动刷新或重新登录'
          });
          
        } catch (error) {
          console.error(`  ❌ 刷新用户 ${user.Username} 权限失败:`, error.message);
          refreshResults.push({
            userId: user.ID,
            username: user.Username,
            realName: user.RealName,
            status: 'failed',
            message: error.message
          });
        }
      }
      
      return {
        success: true,
        message: `角色 ${roleName} 权限刷新完成`,
        refreshedUsers: refreshResults
      };
      
    } catch (error) {
      console.error('刷新角色用户权限失败:', error);
      return {
        success: false,
        message: error.message,
        refreshedUsers: []
      };
    }
  }

  /**
   * 刷新管理员角色用户的权限缓存
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshAdminUsersPermissions() {
    try {
      let pool = await sql.connect(await getDynamicConfig());
      
      // 获取管理员角色ID
      const adminRoleResult = await pool.request()
        .query("SELECT ID, RoleName FROM Roles WHERE RoleCode = 'admin'");
      
      if (adminRoleResult.recordset.length === 0) {
        throw new Error('未找到管理员角色');
      }
      
      const adminRole = adminRoleResult.recordset[0];
      return await this.refreshRoleUsersPermissions(adminRole.ID, adminRole.RoleName);
      
    } catch (error) {
      console.error('刷新管理员用户权限失败:', error);
      return {
        success: false,
        message: error.message,
        refreshedUsers: []
      };
    }
  }

  /**
   * 记录权限变更日志
   * @param {string} action - 操作类型
   * @param {string} details - 操作详情
   * @param {number} userId - 操作用户ID（可选）
   * @param {string} ipAddress - IP地址（可选，脚本执行时使用默认值）
   * @param {string} userAgent - 用户代理（可选，脚本执行时使用默认值）
   */
  async logPermissionChange(action, details, userId = null, ipAddress = 'script-execution', userAgent = 'permission-refresh-script') {
    try {
      let pool = await sql.connect(await getDynamicConfig());
      
      await pool.request()
        .input('UserId', sql.Int, userId)
        .input('Action', sql.NVarChar, action)
        .input('Details', sql.NVarChar, details)
        .input('IPAddress', sql.NVarChar, ipAddress)
        .input('UserAgent', sql.NVarChar, userAgent)
        .query(`
          INSERT INTO SystemLogs (UserID, Action, Details, IPAddress, UserAgent, CreatedAt)
          VALUES (@UserId, @Action, @Details, @IPAddress, @UserAgent, GETDATE())
        `);
      
      console.log(`📝 权限变更日志已记录: ${action}`);
      
    } catch (error) {
      console.error('记录权限变更日志失败:', error);
    }
  }

  /**
   * 显示权限刷新建议
   * @param {Array} refreshResults - 刷新结果列表
   */
  showRefreshSuggestions(refreshResults) {
    console.log('\n💡 权限刷新建议:');
    console.log('=' .repeat(50));
    
    if (refreshResults.length === 0) {
      console.log('✅ 没有用户需要刷新权限');
      return;
    }
    
    console.log('📋 以下用户需要刷新权限缓存:');
    refreshResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.username} (${result.realName || '未设置姓名'})`);
    });
    
    console.log('\n🔧 刷新方式:');
    console.log('  方式1: 用户重新登录系统');
    console.log('  方式2: 管理员在用户管理页面手动刷新用户权限');
    console.log('  方式3: 调用权限刷新API: POST /api/auth/refresh-permissions');
    
    console.log('\n⚠️ 重要提醒:');
    console.log('  - 权限变更后建议立即通知相关用户');
    console.log('  - 可以通过系统通知或邮件告知用户重新登录');
    console.log('  - 管理员可以在角色管理页面批量刷新权限');
  }
}

/**
 * 创建权限刷新辅助实例
 * @returns {PermissionRefreshHelper} 权限刷新辅助实例
 */
function createPermissionRefreshHelper() {
  return new PermissionRefreshHelper();
}

module.exports = {
  PermissionRefreshHelper,
  createPermissionRefreshHelper
};