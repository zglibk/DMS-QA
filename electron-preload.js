// Electron 预加载脚本
// 用于在渲染进程中安全地访问Node.js API

const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取文件的真实路径
  getFilePath: async (file) => {
    try {
      // 在Electron中，可以通过IPC与主进程通信获取真实路径
      return await ipcRenderer.invoke('get-file-path', file.path)
    } catch (error) {
      console.error('获取文件路径失败:', error)
      throw error
    }
  },

  // 选择文件并获取完整路径
  selectFile: async () => {
    try {
      const result = await ipcRenderer.invoke('select-file')
      return result
    } catch (error) {
      console.error('选择文件失败:', error)
      throw error
    }
  },

  // 检查是否为图片文件
  isImageFile: (filePath) => {
    const ext = path.extname(filePath).toLowerCase()
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(ext)
  },

  // 获取文件信息
  getFileInfo: async (filePath) => {
    try {
      return await ipcRenderer.invoke('get-file-info', filePath)
    } catch (error) {
      console.error('获取文件信息失败:', error)
      throw error
    }
  }
})
