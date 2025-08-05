<template>
  <div class="code-display">
    <div class="code-header" v-if="title">
      <span class="code-title">{{ title }}</span>
      <el-button :link="true" 
        size="small" 
        @click="copyCode"
        class="copy-btn"
      >
        <el-icon><DocumentCopy /></el-icon>
        复制代码
      </el-button>
    </div>
    <div class="code-content">
      <pre><code ref="codeRef" v-html="highlightedCode"></code></pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'

/**
 * CodeDisplay - 代码显示组件
 * 
 * 功能特性：
 * - 代码语法高亮显示
 * - 支持复制代码功能
 * - 可自定义标题
 * - 响应式设计
 */

// 组件属性
const props = defineProps({
  /**
   * 代码内容
   * @type {String}
   */
  code: {
    type: String,
    required: true,
    default: ''
  },
  
  /**
   * 代码语言类型
   * @type {String}
   */
  language: {
    type: String,
    default: 'javascript'
  },
  
  /**
   * 代码块标题
   * @type {String}
   */
  title: {
    type: String,
    default: ''
  }
})

// 响应式引用
const codeRef = ref(null)

/**
 * 简单的语法高亮处理
 * 由于项目中没有专门的高亮库，这里实现基本的高亮效果
 */
const highlightedCode = computed(() => {
  let code = props.code
  
  // HTML转义
  code = code.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
  
  // 基本的Vue/JavaScript语法高亮
  if (props.language === 'vue' || props.language === 'javascript') {
    // 关键字高亮
    code = code.replace(/\b(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|async|await|try|catch|finally)\b/g, 
      '<span class="keyword">$1</span>')
    
    // 字符串高亮
    code = code.replace(/(['"`])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g, 
      '<span class="string">$1$2$1</span>')
    
    // 注释高亮
    code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>')
    code = code.replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
    
    // Vue模板标签高亮
    code = code.replace(/&lt;\/?([a-zA-Z][a-zA-Z0-9-]*)/g, 
      '&lt;<span class="tag">$1</span>')
    
    // 属性高亮
    code = code.replace(/\s([a-zA-Z-:@]+)=/g, 
      ' <span class="attr">$1</span>=')
  }
  
  return code
})

/**
 * 复制代码到剪贴板
 */
function copyCode() {
  try {
    navigator.clipboard.writeText(props.code).then(() => {
      ElMessage.success('代码已复制到剪贴板')
    }).catch(() => {
      // 降级方案
      fallbackCopyTextToClipboard(props.code)
    })
  } catch (err) {
    fallbackCopyTextToClipboard(props.code)
  }
}

/**
 * 降级复制方案
 * @param {string} text - 要复制的文本
 */
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  
  try {
    document.execCommand('copy')
    ElMessage.success('代码已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败，请手动复制')
  }
  
  document.body.removeChild(textArea)
}
</script>

<style scoped>
.code-display {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
  background-color: #fafafa;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.code-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.copy-btn {
  padding: 4px 8px;
  font-size: 12px;
  color: #606266;
}

.copy-btn:hover {
  color: #409eff;
}

.code-content {
  padding: 16px;
  overflow-x: auto;
}

.code-content pre {
  margin: 0;
  padding: 0;
  background: transparent;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #2c3e50;
}

.code-content code {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-family: inherit;
}

/* 语法高亮样式 */
:deep(.keyword) {
  color: #d73a49;
  font-weight: bold;
}

:deep(.string) {
  color: #032f62;
}

:deep(.comment) {
  color: #6a737d;
  font-style: italic;
}

:deep(.tag) {
  color: #22863a;
  font-weight: bold;
}

:deep(.attr) {
  color: #6f42c1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .code-header {
    padding: 6px 12px;
  }
  
  .code-content {
    padding: 12px;
  }
  
  .code-content pre {
    font-size: 12px;
  }
}
</style>