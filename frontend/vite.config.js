import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src',
      // Node.js模块的浏览器端polyfill
      process: 'process/browser',
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      util: 'util'
    }
  },
  define: {
    // 修复stream模块浏览器兼容性问题
    global: 'globalThis',
    // 为Node.js模块提供浏览器端polyfill
    'process.env': {},
    process: { env: {} }
  },
  optimizeDeps: {
    // 排除有问题的依赖包，避免预构建时出错
    exclude: ['exceljs', 'xlsx', 'xlsx-js-style']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // 备选代理配置，使用127.0.0.1
      '/api-backup': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-backup/, '/api')
      }
    }
  }
})