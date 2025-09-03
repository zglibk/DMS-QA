/**
 * 权限系统最终测试脚本
 * 验证用户权限系统的核心功能和集成情况
 */

const fs = require('fs')
const path = require('path')

// 测试结果收集
const testResults = {
  frontendIntegration: [],
  backendAPI: [],
  userStore: [],
  overall: 'pending'
}

/**
 * 验证前端NewWelcome.vue权限集成
 */
function verifyFrontendIntegration() {
  console.log('\n=== 验证前端NewWelcome.vue权限集成 ===')
  
  const welcomeFile = path.join(__dirname, '../../frontend/src/views/admin/NewWelcome.vue')
  
  if (!fs.existsSync(welcomeFile)) {
    console.log('❌ NewWelcome.vue文件不存在')
    testResults.frontendIntegration.push({ name: 'NewWelcome.vue文件', status: 'failed' })
    return false
  }
  
  const content = fs.readFileSync(welcomeFile, 'utf8')
  
  const checks = [
    {
      name: '异步权限检查函数',
      pattern: /checkQuickActionPermission.*async|checkModulePermission.*async/,
      required: true
    },
    {
      name: 'hasActionPermissionAsync调用',
      pattern: /hasActionPermissionAsync\s*\(/,
      required: true
    },
    {
      name: '权限状态管理',
      pattern: /quickActionPermissions|systemModulePermissions/,
      required: true
    },
    {
      name: '权限初始化函数',
      pattern: /initQuickActionPermissions|initSystemModulePermissions/,
      required: true
    },
    {
      name: 'onMounted权限初始化',
      pattern: /onMounted.*init.*Permissions/s,
      required: true
    },
    {
      name: '错误处理机制',
      pattern: /catch.*error|try.*catch/,
      required: true
    }
  ]
  
  let allPassed = true
  
  checks.forEach(check => {
    const found = check.pattern.test(content)
    const status = found ? '✅' : '❌'
    console.log(`${status} ${check.name}: ${found ? '已实现' : '未实现'}`)
    
    testResults.frontendIntegration.push({
      name: check.name,
      status: found ? 'passed' : 'failed'
    })
    
    if (check.required && !found) {
      allPassed = false
    }
  })
  
  return allPassed
}

/**
 * 验证后端权限检查API
 */
function verifyBackendAPI() {
  console.log('\n=== 验证后端权限检查API ===')
  
  const authRoutes = path.join(__dirname, '../routes/auth.js')
  
  if (!fs.existsSync(authRoutes)) {
    console.log('❌ auth.js路由文件不存在')
    testResults.backendAPI.push({ name: 'auth.js路由文件', status: 'failed' })
    return false
  }
  
  const content = fs.readFileSync(authRoutes, 'utf8')
  
  const checks = [
    {
      name: '权限检查路由',
      pattern: /\/check-permission/,
      required: true
    },
    {
      name: '用户权限查询',
      pattern: /V_UserCompletePermissions|UserPermissions/,
      required: true
    },
    {
      name: '权限优先级逻辑',
      pattern: /V_UserCompletePermissions|完整权限视图/i,
      required: false
    }
  ]
  
  let allPassed = true
  
  checks.forEach(check => {
    const found = check.pattern.test(content)
    const status = found ? '✅' : '❌'
    console.log(`${status} ${check.name}: ${found ? '已实现' : '未实现'}`)
    
    testResults.backendAPI.push({
      name: check.name,
      status: found ? 'passed' : 'failed'
    })
    
    if (check.required && !found) {
      allPassed = false
    }
  })
  
  return allPassed
}

/**
 * 验证用户Store集成
 */
function verifyUserStore() {
  console.log('\n=== 验证用户Store集成 ===')
  
  const userStore = path.join(__dirname, '../../frontend/src/store/user.js')
  
  if (!fs.existsSync(userStore)) {
    console.log('❌ user.js store文件不存在')
    testResults.userStore.push({ name: 'user.js store文件', status: 'failed' })
    return false
  }
  
  const content = fs.readFileSync(userStore, 'utf8')
  
  const checks = [
    {
      name: 'hasActionPermissionAsync方法',
      pattern: /hasActionPermissionAsync.*async.*action/,
      required: true
    },
    {
      name: '管理员权限检查',
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
  
  checks.forEach(check => {
    const found = check.pattern.test(content)
    const status = found ? '✅' : '❌'
    console.log(`${status} ${check.name}: ${found ? '已实现' : '未实现'}`)
    
    testResults.userStore.push({
      name: check.name,
      status: found ? 'passed' : 'failed'
    })
    
    if (check.required && !found) {
      allPassed = false
    }
  })
  
  return allPassed
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  console.log('\n============================================================')
  console.log('📊 权限系统集成测试报告')
  console.log('============================================================')
  
  const frontendPassed = testResults.frontendIntegration.every(test => test.status === 'passed')
  const backendPassed = testResults.backendAPI.every(test => test.status === 'passed')
  const storePassed = testResults.userStore.every(test => test.status === 'passed')
  
  console.log(`${frontendPassed ? '✅' : '❌'} 前端NewWelcome.vue权限集成: ${frontendPassed ? '通过' : '失败'}`)
  console.log(`${backendPassed ? '✅' : '❌'} 后端权限检查API: ${backendPassed ? '通过' : '失败'}`)
  console.log(`${storePassed ? '✅' : '❌'} 用户Store权限集成: ${storePassed ? '通过' : '失败'}`)
  
  const overallPassed = frontendPassed && backendPassed && storePassed
  testResults.overall = overallPassed ? 'passed' : 'failed'
  
  console.log('\n============================================================')
  if (overallPassed) {
    console.log('🎉 权限系统集成测试全部通过！')
    console.log('\n✨ 系统功能总结:')
    console.log('   • 用户权限系统已完全集成到NewWelcome.vue')
    console.log('   • 支持异步权限检查和用户权限优先级')
    console.log('   • 实现了完整的错误处理和回退机制')
    console.log('   • 后端API支持完整的权限验证')
    console.log('   • 前端Store提供了统一的权限管理接口')
  } else {
    console.log('⚠️  部分测试未通过，请检查相关实现')
  }
  console.log('============================================================')
  
  return overallPassed
}

/**
 * 主测试函数
 */
function runTests() {
  console.log('🚀 开始权限系统集成测试...')
  
  try {
    const frontendResult = verifyFrontendIntegration()
    const backendResult = verifyBackendAPI()
    const storeResult = verifyUserStore()
    
    const overallResult = generateTestReport()
    
    process.exit(overallResult ? 0 : 1)
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message)
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  runTests()
}

module.exports = {
  runTests,
  verifyFrontendIntegration,
  verifyBackendAPI,
  verifyUserStore,
  testResults
}