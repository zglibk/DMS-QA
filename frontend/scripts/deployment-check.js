/**
 * 部署检查脚本
 * 验证生产环境构建是否正确
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class DeploymentChecker {
  constructor() {
    this.distDir = path.resolve(__dirname, '../dist')
    this.errors = []
    this.warnings = []
  }

  /**
   * 运行所有检查
   */
  async runAllChecks() {
    console.log('🔍 开始部署检查...\n')

    this.checkDistDirectory()
    this.checkIndexHtml()
    this.checkAssets()
    this.checkEnvironmentConfig()
    this.checkApiConfiguration()
    
    this.printResults()
    
    return this.errors.length === 0
  }

  /**
   * 检查 dist 目录
   */
  checkDistDirectory() {
    console.log('📁 检查构建目录...')
    
    if (!fs.existsSync(this.distDir)) {
      this.errors.push('dist 目录不存在，请先运行 npm run build')
      return
    }

    const files = fs.readdirSync(this.distDir)
    if (files.length === 0) {
      this.errors.push('dist 目录为空')
      return
    }

    console.log(`   ✓ dist 目录存在，包含 ${files.length} 个文件/目录`)
  }

  /**
   * 检查 index.html
   */
  checkIndexHtml() {
    console.log('📄 检查 index.html...')
    
    const indexPath = path.join(this.distDir, 'index.html')
    if (!fs.existsSync(indexPath)) {
      this.errors.push('index.html 文件不存在')
      return
    }

    const content = fs.readFileSync(indexPath, 'utf-8')
    
    // 检查必要的脚本引用
    if (!content.includes('<script')) {
      this.errors.push('index.html 中没有找到 JavaScript 引用')
    }

    // 检查 CSS 引用
    if (!content.includes('<link') && !content.includes('<style')) {
      this.warnings.push('index.html 中没有找到 CSS 引用')
    }

    // 检查基础路径
    if (content.includes('href="/"') || content.includes('src="/"')) {
      console.log('   ✓ 使用绝对路径引用资源')
    } else {
      this.warnings.push('建议使用绝对路径引用资源')
    }

    console.log('   ✓ index.html 检查完成')
  }

  /**
   * 检查静态资源
   */
  checkAssets() {
    console.log('🎨 检查静态资源...')
    
    const assetsDir = path.join(this.distDir, 'assets')
    if (!fs.existsSync(assetsDir)) {
      this.warnings.push('assets 目录不存在')
      return
    }

    const assets = fs.readdirSync(assetsDir)
    const jsFiles = assets.filter(file => file.endsWith('.js'))
    const cssFiles = assets.filter(file => file.endsWith('.css'))

    if (jsFiles.length === 0) {
      this.errors.push('没有找到 JavaScript 文件')
    } else {
      console.log(`   ✓ 找到 ${jsFiles.length} 个 JavaScript 文件`)
    }

    if (cssFiles.length === 0) {
      this.warnings.push('没有找到 CSS 文件')
    } else {
      console.log(`   ✓ 找到 ${cssFiles.length} 个 CSS 文件`)
    }

    // 检查文件大小
    jsFiles.forEach(file => {
      const filePath = path.join(assetsDir, file)
      const stats = fs.statSync(filePath)
      const sizeKB = Math.round(stats.size / 1024)
      
      if (sizeKB > 1000) {
        this.warnings.push(`JavaScript 文件 ${file} 较大 (${sizeKB}KB)，建议优化`)
      }
    })
  }

  /**
   * 检查环境配置
   */
  checkEnvironmentConfig() {
    console.log('⚙️ 检查环境配置...')
    
    // 检查是否包含环境配置文件
    const configFiles = [
      'config/environment.js',
      'utils/smartApiDetector.js',
      'services/apiService.js'
    ]

    configFiles.forEach(configFile => {
      const fullPath = this.findFileInDist(configFile)
      if (fullPath) {
        console.log(`   ✓ 找到配置文件: ${configFile}`)
      } else {
        this.warnings.push(`配置文件可能未正确打包: ${configFile}`)
      }
    })
  }

  /**
   * 检查 API 配置
   */
  checkApiConfiguration() {
    console.log('🔌 检查 API 配置...')
    
    // 查找包含 API 配置的文件
    const jsFiles = this.findJSFiles()
    let hasApiConfig = false
    let hasRelativePaths = false

    jsFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      
      // 检查是否包含 API 配置
      if (content.includes('apiUrls') || content.includes('API地址')) {
        hasApiConfig = true
      }

      // 检查是否使用相对路径
      if (content.includes('"/api"') || content.includes("'/api'")) {
        hasRelativePaths = true
      }

      // 检查是否有硬编码的 localhost
      if (content.includes('localhost') && !content.includes('// localhost')) {
        this.warnings.push(`文件 ${path.basename(file)} 中包含 localhost 引用`)
      }
    })

    if (hasApiConfig) {
      console.log('   ✓ 找到 API 配置')
    } else {
      this.warnings.push('未找到 API 配置')
    }

    if (hasRelativePaths) {
      console.log('   ✓ 使用相对路径 API 配置')
    } else {
      this.warnings.push('建议使用相对路径 API 配置')
    }
  }

  /**
   * 在 dist 目录中查找文件
   */
  findFileInDist(fileName) {
    const searchInDir = (dir) => {
      const files = fs.readdirSync(dir)
      
      for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          const found = searchInDir(fullPath)
          if (found) return found
        } else if (file.includes(fileName.replace(/\//g, '')) || 
                   fullPath.includes(fileName)) {
          return fullPath
        }
      }
      return null
    }

    return searchInDir(this.distDir)
  }

  /**
   * 查找所有 JS 文件
   */
  findJSFiles() {
    const jsFiles = []
    
    const searchInDir = (dir) => {
      const files = fs.readdirSync(dir)
      
      files.forEach(file => {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          searchInDir(fullPath)
        } else if (file.endsWith('.js')) {
          jsFiles.push(fullPath)
        }
      })
    }

    searchInDir(this.distDir)
    return jsFiles
  }

  /**
   * 打印检查结果
   */
  printResults() {
    console.log('\n📊 检查结果:')
    
    if (this.errors.length === 0) {
      console.log('✅ 没有发现错误')
    } else {
      console.log(`❌ 发现 ${this.errors.length} 个错误:`)
      this.errors.forEach(error => {
        console.log(`   • ${error}`)
      })
    }

    if (this.warnings.length === 0) {
      console.log('✅ 没有警告')
    } else {
      console.log(`⚠️ 发现 ${this.warnings.length} 个警告:`)
      this.warnings.forEach(warning => {
        console.log(`   • ${warning}`)
      })
    }

    console.log('\n📋 部署建议:')
    console.log('1. 确保 Nginx 配置了正确的 /api 代理')
    console.log('2. 检查后端服务是否正常运行')
    console.log('3. 验证网络连接和防火墙设置')
    console.log('4. 测试不同环境下的 API 连接')

    if (this.errors.length === 0) {
      console.log('\n🎉 构建检查通过，可以部署！')
    } else {
      console.log('\n🚨 请修复错误后重新构建')
    }
  }
}

// 运行检查
const checker = new DeploymentChecker()
checker.runAllChecks().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('检查过程出错:', error)
  process.exit(1)
})
