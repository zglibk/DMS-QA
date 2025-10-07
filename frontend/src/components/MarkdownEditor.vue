<template>
  <div class="markdown-editor">
    <!-- 工具栏 -->
    <div v-if="!readonly" class="toolbar">
      <button type="button" @click="togglePreview" class="btn btn-primary">
        {{ showPreview ? '隐藏预览' : '显示预览' }}
      </button>
      <button type="button" @click="exportMarkdown" class="btn btn-secondary">
        导出 Markdown
      </button>
      <button type="button" @click="exportHtml" class="btn btn-secondary">
        导出 HTML
      </button>
      <input 
        type="file" 
        ref="fileInput" 
        @change="handleFileUpload" 
        accept="image/*" 
        style="display: none;"
      >
      <button type="button" @click="triggerFileUpload" class="btn btn-info">
        上传图片
      </button>
      <button type="button" @click="clearContent" class="btn btn-warning">
        清空内容
      </button>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-container" :class="{ 'split-view': showPreview && !readonly, 'readonly-mode': readonly }">
      <!-- 编辑区域 -->
      <div v-if="!readonly" class="editor-panel">
        <textarea
          v-model="content"
          @input="onContentChange"
          class="markdown-input"
          placeholder="请输入 Markdown 内容..."
        ></textarea>
      </div>

      <!-- 预览区域 -->
      <div v-if="showPreview || readonly" class="preview-panel" :class="{ 'full-width': readonly }">
        <div class="preview-content" v-html="renderedHtml"></div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div v-if="!readonly" class="status-bar">
      <span>字符数: {{ content.length }}</span>
      <span>行数: {{ lineCount }}</span>
      <span v-if="lastSaved">最后保存: {{ lastSaved }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

export default {
  name: 'MarkdownEditor',
  props: {
    // 初始内容
    modelValue: {
      type: String,
      default: ''
    },
    // 是否启用自动保存
    autoSave: {
      type: Boolean,
      default: true
    },
    // 自动保存间隔（毫秒）
    autoSaveInterval: {
      type: Number,
      default: 3000
    },
    // 是否为只读模式（仅预览）
    readonly: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'save', 'change'],
  setup(props, { emit }) {
    // 响应式数据
    const content = ref(props.modelValue || '')
    const showPreview = ref(props.readonly ? false : true)
    const fileInput = ref(null)
    const lastSaved = ref('')
    const autoSaveTimer = ref(null)

    // 计算属性
    const lineCount = computed(() => {
      return content.value.split('\n').length
    })

    // 配置 marked 选项
    marked.setOptions({
      highlight: function(code, lang) {
        // 使用 highlight.js 进行语法高亮
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value
          } catch (err) {
            console.warn('语法高亮失败:', err)
          }
        }
        return hljs.highlightAuto(code).value
      },
      breaks: true, // 支持换行
      gfm: true, // 启用 GitHub 风格的 Markdown
      tables: true, // 支持表格
      sanitize: false // 不清理 HTML（注意安全性）
    })

    // 渲染 HTML
    const renderedHtml = computed(() => {
      try {
        return marked(content.value)
      } catch (error) {
        console.error('Markdown 渲染错误:', error)
        return '<p>渲染错误，请检查 Markdown 语法</p>'
      }
    })

    // 切换预览显示
    const togglePreview = () => {
      showPreview.value = !showPreview.value
    }

    // 内容变化处理
    const onContentChange = () => {
      emit('update:modelValue', content.value)
      emit('change', content.value)
      
      // 启动自动保存定时器
      if (props.autoSave) {
        clearTimeout(autoSaveTimer.value)
        autoSaveTimer.value = setTimeout(() => {
          saveToLocalStorage()
        }, props.autoSaveInterval)
      }
    }

    // 保存内容到本地存储（自动保存）
    const saveToLocalStorage = () => {
      try {
        localStorage.setItem('markdown-editor-content', content.value)
        lastSaved.value = new Date().toLocaleTimeString()
        emit('save', content.value)
      } catch (error) {
        console.error('自动保存失败:', error)
      }
    }

    // 从本地存储加载内容
    const loadFromLocalStorage = () => {
      try {
        const saved = localStorage.getItem('markdown-editor-content')
        if (saved && !props.modelValue) {
          content.value = saved
          emit('update:modelValue', saved)
        }
      } catch (error) {
        console.error('加载保存内容失败:', error)
      }
    }

    // 导出 Markdown 文件
    const exportMarkdown = () => {
      try {
        const blob = new Blob([content.value], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `markdown-${Date.now()}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('导出 Markdown 失败:', error)
      }
    }

    // 导出 HTML 文件
    const exportHtml = () => {
      try {
        const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Export</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
        code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; }
        blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
        th { background: #f6f8fa; }
    </style>
</head>
<body>
${renderedHtml.value}
</body>
</html>`
        
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `markdown-${Date.now()}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('导出 HTML 失败:', error)
      }
    }

    // 触发文件上传
    const triggerFileUpload = () => {
      fileInput.value?.click()
    }

    // 文件上传功能
    const handleFileUpload = (event) => {
      const file = event.target.files?.[0]
      if (!file) return

      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件')
        return
      }

      // 检查文件大小（限制为 5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('图片文件大小不能超过 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const imageUrl = reader.result
          const fileName = file.name
          // 将图片路径转化为 Markdown 格式
          const markdownImage = `![${fileName}](${imageUrl})`
          // 插入到当前光标位置或内容末尾
          content.value += `\n\n${markdownImage}\n`
          onContentChange()
        } catch (error) {
          console.error('图片处理失败:', error)
          alert('图片处理失败，请重试')
        }
      }
      reader.onerror = () => {
        console.error('文件读取失败')
        alert('文件读取失败，请重试')
      }
      reader.readAsDataURL(file)
      
      // 清空文件输入，允许重复选择同一文件
      event.target.value = ''
    }

    // 清空内容
    const clearContent = () => {
      if (confirm('确定要清空所有内容吗？此操作不可撤销。')) {
        content.value = ''
        onContentChange()
        localStorage.removeItem('markdown-editor-content')
        lastSaved.value = ''
      }
    }

    // 监听 props 变化
    watch(() => props.modelValue, (newValue) => {
      if (newValue !== content.value) {
        content.value = newValue || ''
      }
    })

    // 组件挂载时加载保存的内容
    onMounted(() => {
      loadFromLocalStorage()
    })

    // 组件卸载时清理定时器
    const cleanup = () => {
      if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value)
      }
    }

    // 返回组件需要的数据和方法
    return {
      content,
      showPreview,
      fileInput,
      lastSaved,
      lineCount,
      renderedHtml,
      togglePreview,
      onContentChange,
      exportMarkdown,
      exportHtml,
      triggerFileUpload,
      handleFileUpload,
      clearContent,
      cleanup
    }
  },
  // 组件卸载时清理资源
  beforeUnmount() {
    this.cleanup()
  }
}
</script>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
  flex-wrap: wrap;
}

.btn {
  padding: 6px 12px;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f3f4f6;
}

.btn-primary {
  background: #0969da;
  color: white;
  border-color: #0969da;
}

.btn-primary:hover {
  background: #0860ca;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background: #5c636a;
}

.btn-info {
  background: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.btn-info:hover {
  background: #138496;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.btn-warning:hover {
  background: #e0a800;
}

.editor-container {
  display: flex;
  flex: 1;
  min-height: 300px;
}

.split-view .editor-panel {
  width: 50%;
  border-right: 1px solid #e1e4e8;
}

.editor-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.markdown-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  background: white;
}

.preview-panel {
  width: 50%;
  overflow-y: auto;
  background: white;
}

.preview-panel.full-width {
  width: 100%;
}

.editor-container.readonly-mode {
  border: none;
}

.readonly-mode .preview-content {
  padding: 16px;
}

.preview-content {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
}

/* Markdown 样式 */
.preview-content h1,
.preview-content h2,
.preview-content h3,
.preview-content h4,
.preview-content h5,
.preview-content h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.preview-content h1 {
  font-size: 2em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 10px;
}

.preview-content h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 8px;
}

.preview-content p {
  margin-bottom: 16px;
}

.preview-content pre {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.preview-content code {
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 85%;
}

.preview-content pre code {
  background: transparent;
  padding: 0;
}

.preview-content blockquote {
  border-left: 4px solid #dfe2e5;
  padding-left: 16px;
  color: #6a737d;
  margin: 16px 0;
}

.preview-content table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.preview-content th,
.preview-content td {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
  text-align: left;
}

.preview-content th {
  background: #f6f8fa;
  font-weight: 600;
}

.preview-content ul,
.preview-content ol {
  margin-bottom: 16px;
  padding-left: 2em;
}

.preview-content li {
  margin-bottom: 4px;
}

.preview-content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f6f8fa;
  border-top: 1px solid #e1e4e8;
  font-size: 12px;
  color: #656d76;
}

.status-bar span {
  margin-right: 16px;
}

.status-bar span:last-child {
  margin-right: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-container.split-view {
    flex-direction: column;
  }
  
  .split-view .editor-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e1e4e8;
  }
  
  .preview-panel {
    width: 100%;
  }
  
  .toolbar {
    flex-wrap: wrap;
  }
  
  .status-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>