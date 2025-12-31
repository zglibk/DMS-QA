<template>
  <div class="tag-group">
    <el-tag
      v-for="(item, index) in items"
      :key="item.ID"
      closable
      class="mx-1"
      :type="getRandomType(index)"
      @close="$emit('delete', item)"
      style="margin-right: 10px; margin-bottom: 10px;"
    >
      {{ item.ERPSubCategory }}
    </el-tag>
    
    <el-input
      v-if="inputVisible"
      v-model="inputValue"
      class="input-new-tag"
      size="small"
      placeholder="输入ERP类型"
      @keyup.enter="handleInputConfirm"
      @blur="handleInputConfirm"
      ref="inputRef"
    />
    <el-button v-else class="button-new-tag" size="small" @click="showInput">+ 新增ERP物料类型</el-button>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  category: String,
  items: Array
})

const emit = defineEmits(['delete', 'add'])

const inputVisible = ref(false)
const inputValue = ref('')
const inputRef = ref(null)

// 随机颜色类型
const types = ['', 'success', 'info', 'warning', 'danger']
const getRandomType = (index) => {
    return types[index % types.length]
}

const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const handleInputConfirm = () => {
  if (inputValue.value) {
    emit('add', props.category, inputValue.value)
  }
  inputVisible.value = false
  inputValue.value = ''
}
</script>

<style scoped>
.tag-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center; /* 垂直居中对齐 */
}

.input-new-tag {
  width: 120px;
  margin-right: 10px;
  margin-bottom: 10px; /* 统一底部间距 */
  vertical-align: bottom;
}
.button-new-tag {
  margin-right: 10px;
  margin-bottom: 10px; /* 统一底部间距 */
  height: 24px; /* 调整高度以匹配small标签 */
  line-height: 22px;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
