<template>
  <div class="img-viewer-box">
    <el-image-viewer 
      v-if="state.visible"
      :url-list="props.imgs"
      @close="close"
    >
      <!-- 自定义工具栏，添加下载按钮 -->
      <template #toolbar="{ actions, prev, next, reset, activeIndex }">
        <!-- 上一张 -->
        <el-icon @click="prev" class="toolbar-icon">
          <ArrowLeft />
        </el-icon>
        <!-- 下一张 -->
        <el-icon @click="next" class="toolbar-icon">
          <ArrowRight />
        </el-icon>
        <!-- 缩小 -->
        <el-icon @click="actions('zoomOut')" class="toolbar-icon">
          <ZoomOut />
        </el-icon>
        <!-- 放大 -->
        <el-icon @click="actions('zoomIn')" class="toolbar-icon">
          <ZoomIn />
        </el-icon>
        <!-- 重置 -->
        <el-icon @click="reset" class="toolbar-icon">
          <Refresh />
        </el-icon>
        <!-- 逆时针旋转 -->
        <el-icon @click="actions('anticlockwise')" class="toolbar-icon">
          <RefreshLeft />
        </el-icon>
        <!-- 顺时针旋转 -->
        <el-icon @click="actions('clockwise')" class="toolbar-icon">
          <RefreshRight />
        </el-icon>
        <!-- 下载按钮 -->
        <el-icon @click="downloadImage(activeIndex)" class="toolbar-icon">
          <Download />
        </el-icon>
      </template>
    </el-image-viewer>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useVModel } from '@vueuse/core'
import { 
  ArrowLeft, 
  ArrowRight, 
  ZoomOut, 
  ZoomIn, 
  RefreshRight, 
  RefreshLeft, 
  Download,
  Refresh
} from '@element-plus/icons-vue'

/**
 * 图片预览组件 Props 定义
 */
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  imgs: {
    type: Array,
    default: () => []
  }
})

/**
 * 组件事件定义
 */
const emits = defineEmits(['update:modelValue'])

/**
 * 组件状态管理
 */
const state = reactive({
  imgList: [],
  // 相当于是set 与 get，使用useVModel实现v-model双向绑定
  visible: useVModel(props, 'modelValue', emits),
})

/**
 * 点击关闭的时候，连同小图一起关闭
 */
function close() {
  state.visible = false
}

/**
 * 下载图片功能
 * @param {number} activeIndex - 当前图片索引
 */
function downloadImage(activeIndex) {
  if (!props.imgs || props.imgs.length === 0) {
    console.warn('没有可下载的图片')
    return
  }
  
  const imageUrl = props.imgs[activeIndex]
  if (!imageUrl) {
    console.warn('图片URL无效')
    return
  }
  
  // 创建一个临时的a标签来触发下载
  const link = document.createElement('a')
  link.href = imageUrl
  
  // 从URL中提取文件名，如果没有则使用默认名称
  const urlParts = imageUrl.split('/')
  const fileName = urlParts[urlParts.length - 1] || `image_${activeIndex + 1}.jpg`
  
  link.download = fileName
  link.target = '_blank'
  
  // 触发下载
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.img-viewer-box {
  /* 预留样式容器 */
}

/* 工具栏图标样式 */
.toolbar-icon {
  cursor: pointer;
  margin: 0 8px;
  font-size: 20px;
  color: #fff;
  transition: color 0.3s ease;
}

.toolbar-icon:hover {
  color: #409eff;
}

/* 下载按钮样式已移除，与其他按钮保持一致 */
</style>