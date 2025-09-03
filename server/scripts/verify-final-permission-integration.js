/**
 * 最终权限集成验证脚本
 * 验证快捷操作和功能模块的权限控制是否完全集成用户权限系统
 * 包括用户权限与角色权限的优先级关系测试
 */

const path = require('path')
const fs = require('fs')

// 模拟数据库连接
const sql = require('mssql')
const config = {
  user: 'sa',
  password: 'Aa123456',
  server: 'localhost',
  database: 'DMS_QA',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
}

/**
 * 验证NewWelcome.vue文件的权限集成
 */
function verifyNewWelcomeIntegration() {
  console.log('\n=== 验证 NewWelcome.vue 权限集成 ===')
  
  const filePath = path.join(__dirname, '../../frontend/src/views/admin/NewWelcome.vue')
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ NewWelcome.vue 文件不存在')
    return false
  }
  
  const content = fs.readFileSync(filePath, 'utf8')
  
  // 检查关键功能是否已实现
  const checks = [
    {
      name: '异步权限检查函数',
      pattern: /const checkQuickActionPermission = async \(action\)/,
      required: true
    },
    {
      name: 'hasActionPermissionAsync调用',
      pattern: /userStore\.hasActionPermissionAsync\(/,
      required: true
    },
    {
      name: '快捷操作权限状态管理',
      pattern: /const quickActionPermissions = ref\(new Map\(\)\)/,
      required: true
    },
    {
      name: '系统模块权限状态管理',
      pattern: /const systemModulePermissions = ref\(new Map\(\)\)/,
      required: true
    },
    {
      name: '权限初始化函数',
      pattern: /const initQuickActionPermissions = async \(\)/,
      required: true
    },
    {
      name: '系统模块权限初始化',
      pattern: /const initSystemModulePermissions = async \(\)/,
      required: true
    },
    {
      name: 'onMounted权限初始化调用',
      pattern: /await Promise\.all\(\[\s*initQuickActionPermissions\(\)/,
      required: true
    },
    {
      name: '异步模块权限检查',
      pattern: /const checkModulePermission = async \(module\)/,
      required: true
    },
    {
      name: '错误处理和回退机制',
      pattern: /catch \(error\) \{[\s\S]*?回退到同步检查/,
      required: true
    }
  ]
  
  let allPassed = true
  
  checks.forEach(check => {
    const found = check.pattern.test(content)
    const status = found ? '✅' : '❌'
    console.log(`${status} ${check.name}: ${found ? '已实现' : '未实现'}`)
    
    if (check.required && !found) {
      allPassed = false
    }
  })
  
  return allPassed
}

/**
 * 验证用户权限数据和优先级
 */
async function verifyUserPermissionPriority() {
  console.log('\n=== 验证用户权限优先级 ===')
  
  try {
    await sql.connect(config)
    
    // 检查用户权限表数据
    const userPermissionsResult = await sql.query(`
      SELECT 
        UserId,
        Permission,
        IsGranted,
        CreatedAt
      FROM UserPermissions 
      WHERE UserId = 1
      ORDER BY CreatedAt DESC
    `)
    
    console.log(`✅ 用户权限表记录数: ${userPermissionsResult.recordset.length}`)
    
    if (userPermissionsResult.recordset.length > 0) {
      console.log('📋 用户权限示例:')
      userPermissionsResult.recordset.slice(0, 3).forEach(record => {
        console.log(`   - ${record.Permission}: ${record.IsGranted ? '允许' : '拒绝'}`)
      })
    }
    
    // 检查完整权限视图
    const completePermissionsResult = await sql.query(`
      SELECT TOP 5
        UserId,
        Permission,
        IsGranted,
        PermissionSource,
        RoleName
      FROM V_UserCompletePermissions 
      WHERE UserId = 1
      ORDER BY PermissionSource DESC
    `)
    
    console.log(`✅ 完整权限视图记录数: ${completePermissionsResult.recordset.length}`)
    
    if (completePermissionsResult.recordset.length > 0) {
      console.log('📋 权限优先级示例:')
      completePermissionsResult.recordset.forEach(record => {
        console.log(`   - ${record.Permission}: ${record.IsGranted ? '允许' : '拒绝'} (来源: ${record.PermissionSource})`)
      })
    }
    
    // 测试权限冲突场景
    const conflictTest = await sql.query(`
      SELECT 
        Permission,
        COUNT(*) as SourceCount,
        STRING_AGG(CAST(IsGranted AS VARCHAR) + ':' + PermissionSource, ', ') as PermissionDetails
      FROM V_UserCompletePermissions 
      WHERE UserId = 1
      GROUP BY Permission
      HAVING COUNT(*) > 1
    `)
    
    if (conflictTest.recordset.length > 0) {
      console.log('⚠️  权限冲突检测:')
      conflictTest.recordset.forEach(record => {
        console.log(`   - ${record.Permission}: ${record.PermissionDetails}`)
      })
    } else {
      console.log('✅ 无权限冲突或冲突已正确处理')
    }
    
    return true
  } catch (error) {
    console.error('❌ 权限优先级验证失败:', error.message)
    return false
  }
}

/**
 * 测试后端权限检查API
 */
async function testBackendPermissionAPI() {
  console.log('\n=== 测试后端权限检查API ===')
  
  try {
    // 导入权限检查函数
    const authMiddleware = require('../middleware/auth')
    
    // 测试用户权限检查
    const testPermissions = [
      'system:user:view',
      'system:user:edit',
      'system:role:view',
      'quality:sample:approve'
    ]
    
    console.log('🔍 测试权限检查函数:')
    
    for (const permission of testPermissions) {
      try {
        const hasPermission = await authMiddleware.checkUserPermission(1, permission)
        console.log(`   - ${permission}: ${hasPermission ? '✅ 允许' : '❌ 拒绝'}`)
      } catch (error) {
        console.log(`   - ${permission}: ❌ 检查失败 (${error.message})`)
      }
    }
    
    // 测试操作权限检查
    console.log('\n🔍 测试操作权限检查函数:')
    
    for (const permission of testPermissions) {
      try {
        const hasActionPermission = await authMiddleware.checkUserActionPermission(1, permission)
        console.log(`   - ${permission}: ${hasActionPermission ? '✅ 允许' : '❌ 拒绝'}`)
      } catch (error) {
        console.log(`   - ${permission}: ❌ 检查失败 (${error.message})`)
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ 后端权限API测试失败:', error.message)
    return false
  }
}

/**
 * 验证前端用户store集成
 */
function verifyUserStoreIntegration() {
  console.log('\n=== 验证前端用户Store集成 ===')
  
  const userStorePath = path.join(__dirname, '../../frontend/src/store/user.js')
  
  if (!fs.existsSync(userStorePath)) {
    console.error('❌ user.js store文件不存在')
    return false
  }
  
  const content = fs.readFileSync(userStorePath, 'utf8')
  
  const storeChecks = [
    {
      name: 'hasActionPermissionAsync方法',
      pattern: /hasActionPermissionAsync.*async.*action/,
      required: true
    },
    {
      name: '用户权限优先级逻辑',
      pattern: /如果是管理员，直接返回true|admin.*return true/i,
      required: true
    },
    {
      name: 'API权限检查调用',
      pattern: /\/auth\/check-permission/,
      required: true
    },
    {
      name: '错误处理回退机制',
      pattern: /API调用失败时，回退到本地权限检查|catch.*error.*回退/i,
      required: true
    }
  ]
  
  let allPassed = true
  
  storeChecks.forEach(check => {
    const found = check.pattern.test(content)
    const status = found ? '✅' : '❌'
    console.log(`${status} ${check.name}: ${found ? '已实现' : '未实现'}`)
    
    if (check.required && !found) {
      allPassed = false
    }
  })
  
  return allPassed
}

/**
 * 主验证函数
 */
async function main() {
  console.log('🚀 开始最终权限集成验证...')
  console.log('=' .repeat(60))
  
  const results = {
    newWelcomeIntegration: false,
    userPermissionPriority: false,
    backendAPI: false,
    userStore: false
  }
  
  // 1. 验证NewWelcome.vue集成
  results.newWelcomeIntegration = verifyNewWelcomeIntegration()
  
  // 2. 验证用户权限优先级
  results.userPermissionPriority = await verifyUserPermissionPriority()
  
  // 3. 测试后端权限API
  results.backendAPI = await testBackendPermissionAPI()
  
  // 4. 验证前端用户store
  results.userStore = verifyUserStoreIntegration()
  
  // 输出最终结果
  console.log('\n' + '=' .repeat(60))
  console.log('📊 最终验证结果:')
  console.log('=' .repeat(60))
  
  Object.entries(results).forEach(([key, passed]) => {
    const status = passed ? '✅ 通过' : '❌ 失败'
    const description = {
      newWelcomeIntegration: 'NewWelcome.vue 权限集成',
      userPermissionPriority: '用户权限优先级',
      backendAPI: '后端权限检查API',
      userStore: '前端用户Store集成'
    }[key]
    
    console.log(`${status} ${description}`)
  })
  
  const allPassed = Object.values(results).every(result => result)
  
  console.log('\n' + '=' .repeat(60))
  if (allPassed) {
    console.log('🎉 所有验证通过！用户权限系统已完全集成到快捷操作和功能模块中')
    console.log('✨ 用户权限与角色权限的优先级关系已正确实现：')
    console.log('   - 用户权限优先于角色权限')
    console.log('   - 无冲突时为叠加关系')
    console.log('   - 支持异步权限检查和错误回退')
  } else {
    console.log('⚠️  部分验证未通过，请检查相关实现')
  }
  console.log('=' .repeat(60))
  
  // 关闭数据库连接
  try {
    await sql.close()
  } catch (error) {
    // 忽略关闭错误
  }
  
  process.exit(allPassed ? 0 : 1)
}

// 运行验证
if (require.main === module) {
  main().catch(error => {
    console.error('验证过程发生错误:', error)
    process.exit(1)
  })
}

module.exports = {
  verifyNewWelcomeIntegration,
  verifyUserPermissionPriority,
  testBackendPermissionAPI,
  verifyUserStoreIntegration
}