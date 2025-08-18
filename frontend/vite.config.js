import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // 静态文件代理配置
      '/files': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // 备用代理配置，使用127.0.0.1
      '/api-backup': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-backup/, '/api')
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})