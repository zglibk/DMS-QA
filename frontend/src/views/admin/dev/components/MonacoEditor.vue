<template>
  <div class="code-editor-wrapper">
    <el-input
      v-model="localValue"
      type="textarea"
      :rows="15"
      :placeholder="placeholder"
      class="code-textarea"
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
  language: {
    type: String,
    default: 'json'
  },
  height: {
    type: [Number, String],
    default: 300
  },
  placeholder: {
    type: String,
    default: '请输入JSON内容...'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const localValue = ref(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  if (newVal !== localValue.value) {
    localValue.value = newVal
  }
})

const handleInput = (val) => {
  emit('update:modelValue', val)
  emit('change', val)
}

// 暴露方法保持接口兼容
defineExpose({
  getEditor: () => null,
  formatCode: () => {
    try {
      const json = JSON.parse(localValue.value)
      localValue.value = JSON.stringify(json, null, 2)
      emit('update:modelValue', localValue.value)
    } catch (e) {
      console.error('JSON格式化失败:', e)
    }
  },
  setValue: (value) => {
    localValue.value = value
    emit('update:modelValue', value)
  },
  getValue: () => localValue.value,
  focus: () => {}
})
</script>

<style lang="scss" scoped>
.code-editor-wrapper {
  width: 100%;
  
  .code-textarea {
    :deep(.el-textarea__inner) {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.6;
      background: #1e1e1e;
      color: #d4d4d4;
      border: none;
      border-radius: 4px;
      padding: 12px;
      resize: none;
      
      &::placeholder {
        color: #6a6a6a;
      }
    }
  }
}
</style>
