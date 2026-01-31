<template>
  <div class="rich-text-editor">
    <el-input
      v-model="localValue"
      type="textarea"
      :rows="12"
      :placeholder="placeholder"
      @input="handleInput"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  height: {
    type: [Number, String],
    default: 300
  }
})

const emit = defineEmits(['update:modelValue'])

// 格式化HTML代码，使其有清晰的层级关系
const formatHtml = (html) => {
  if (!html) return ''
  
  // 移除已有的换行和多余空格
  let formatted = html.replace(/\n/g, '').replace(/>\s+</g, '><')
  
  // 定义缩进
  const indent = '  '
  let level = 0
  let result = ''
  
  // 按标签分割
  const tags = formatted.match(/<[^>]+>|[^<]+/g) || []
  
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i].trim()
    if (!tag) continue
    
    // 判断标签类型
    const isClosingTag = tag.startsWith('</')
    const isSelfClosing = tag.endsWith('/>') || tag.match(/<(br|hr|img|input|meta|link)\b/i)
    const isOpeningTag = tag.startsWith('<') && !isClosingTag && !isSelfClosing
    
    // 获取标签名
    const tagNameMatch = tag.match(/<\/?(\w+)/)
    const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : ''
    
    // 块级标签需要换行
    const blockTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'p', 'ul', 'ol', 'li']
    const isBlockTag = blockTags.includes(tagName)
    
    if (isClosingTag && isBlockTag) {
      level = Math.max(0, level - 1)
      result += '\n' + indent.repeat(level) + tag
    } else if (isOpeningTag && isBlockTag) {
      result += '\n' + indent.repeat(level) + tag
      level++
    } else if (tag.startsWith('<')) {
      // 内联标签或自闭合标签
      result += tag
    } else {
      // 文本内容
      result += tag
    }
  }
  
  return result.trim()
}

const localValue = ref(formatHtml(props.modelValue))

watch(() => props.modelValue, (newVal) => {
  if (newVal !== localValue.value) {
    // 检测是否是紧凑的HTML（没有换行的table），如果是则格式化
    const isCompactHtml = newVal && newVal.includes('<table') && !newVal.includes('\n<')
    localValue.value = isCompactHtml ? formatHtml(newVal) : newVal
  }
})

const handleInput = (val) => {
  emit('update:modelValue', val)
}
</script>

<style lang="scss" scoped>
.rich-text-editor {
  width: 100%;
  
  :deep(.el-textarea__inner) {
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.5;
    min-height: 280px;
    white-space: pre;
    overflow-x: auto;
  }
}
</style>
