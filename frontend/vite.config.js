/**
 * Vite 构建工具配置文件
 *
 * 功能说明：
 * 1. 配置Vue3项目的构建和开发环境
 * 2. 设置路径别名简化导入
 * 3. 配置开发服务器和代理
 * 4. 优化构建性能
 *
 * Vite优势：
 * - 极快的冷启动
 * - 即时的模块热更新
 * - 真正的按需编译
 * - 丰富的插件生态
 */

// 导入Vite配置函数
import { defineConfig } from 'vite'
// 导入Vue插件
import vue from '@vitejs/plugin-vue'
// 导入路径处理工具
import { resolve } from 'path'

// 导出Vite配置
export default defineConfig({
  /**
   * 插件配置
   *
   * vue(): 支持Vue3单文件组件
   * - 处理.vue文件
   * - 支持<script setup>语法
   * - 支持CSS scoped
   */
  plugins: [vue()],

  /**
   * 模块解析配置
   *
   * alias: 路径别名配置
   * '@': 指向src目录，简化导入路径
   *
   * 使用示例：
   * import Component from '@/components/Component.vue'
   * 等同于：
   * import Component from './src/components/Component.vue'
   */
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  /**
   * 开发服务器配置
   *
   * 配置说明：
   * - host: '0.0.0.0' 允许外部访问（局域网调试）
   * - port: 5173 开发服务器端口
   * - strictPort: true 端口被占用时不自动尝试其他端口
   * - historyApiFallback: true 支持Vue Router的history模式
   * - proxy: API代理配置，解决开发环境跨域问题
   */
  server: {
    host: '0.0.0.0',              // 监听所有网络接口
    port: 5173,                   // 开发服务器端口
    strictPort: true,             // 严格端口模式
    historyApiFallback: true,     // 支持SPA路由

    /**
     * 代理配置
     *
     * 功能：将前端的API请求代理到后端服务器
     * 目的：解决开发环境的跨域问题
     *
     * 配置说明：
     * - '/api': 匹配所有以/api开头的请求
     * - target: 后端服务器地址
     * - changeOrigin: 修改请求头的origin字段
     * - secure: 是否验证SSL证书
     */
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',  // 后端服务器地址
        changeOrigin: true,               // 修改origin头
        secure: false                     // 不验证SSL证书
      }
    }
  }
})