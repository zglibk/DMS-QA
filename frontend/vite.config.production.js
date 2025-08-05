import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 生产环境优化配置
export default defineConfig({
  plugins: [vue()],
  
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 静态资源目录
    assetsDir: 'assets',
    
    // 生成 sourcemap
    sourcemap: false, // 生产环境关闭 sourcemap
    
    // 代码分割
    rollupOptions: {
      output: {
        // 手动分割代码
        manualChunks: {
          // 将 Vue 相关库分离
          vue: ['vue', 'vue-router'],
          
          // 将 Element Plus 分离
          'element-plus': ['element-plus'],
          
          // 将工具库分离
          utils: ['axios']
        }
      }
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        // 移除 console.log
        drop_console: true,
        // 移除 debugger
        drop_debugger: true
      }
    },
    
    // 资源内联阈值
    assetsInlineLimit: 4096,
    
    // 构建目标
    target: 'es2015'
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: '0.0.0.0', // 允许外部访问
    
    // 代理配置（开发环境）
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 备选代理配置，使用127.0.0.1
      '/api-backup': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-backup/, '/api')
      }
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // 环境变量
  define: {
    // 构建时间
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    
    // 版本信息
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    
    // 构建环境
    __BUILD_ENV__: JSON.stringify(process.env.NODE_ENV || 'development')
  },
  
  // CSS 配置
  css: {
    // CSS 预处理器
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // 优化配置
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'element-plus',
      'axios'
    ]
  }
})
