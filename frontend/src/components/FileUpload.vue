<script setup>
import { ref, watchEffect } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Loading, Document, View, Delete, InfoFilled } from '@element-plus/icons-vue'

/**
 * 文件上传组件属性定义
 * @typedef {Object} FileType
 * @property {string} [name] - 文件名
 * @property {any} url - 文件地址
 * @property {any} [propName] - 其他属性
 */

/**
 * 消息提示类型定义
 * @typedef {Object} MessageType
 * @property {string} [upload] - 上传成功的消息提示
 * @property {string} [remove] - 删除成功的消息提示
 */

/**
 * 组件属性定义
 */
const props = defineProps({
  accept: {
    type: String,
    default: '*' // 默认支持所有类型
  },
  multiple: {
    type: Boolean,
    default: false
  },
  maxCount: {
    type: Number,
    default: 1
  },
  tip: {
    type: String,
    default: 'Upload'
  },
  fit: {
    type: String,
    default: 'contain',
    validator: (value) => ['contain', 'fill', 'cover', 'none', 'scale-down'].includes(value)
  },
  spaceProps: {
    type: Object,
    default: () => ({})
  },
  spinProps: {
    type: Object,
    default: () => ({})
  },
  imageProps: {
    type: Object,
    default: () => ({})
  },
  messageProps: {
    type: Object,
    default: () => ({})
  },
  actionMessage: {
    type: Object,
    default: () => ({ upload: '上传成功', remove: '删除成功' })
  },
  beforeUpload: {
    type: Function,
    default: () => true
  },
  uploadMode: {
    type: String,
    default: 'base64',
    validator: (value) => ['base64', 'custom'].includes(value)
  },
  customRequest: {
    type: Function,
    default: () => {}
  },
  disabled: {
    type: Boolean,
    default: false
  },
  fileList: {
    type: Array,
    default: () => []
  },
  deferredUpload: {
    type: Boolean,
    default: false // 是否延迟上传，true时文件选择后不立即上传
  }
})

// 响应式数据
const uploadedFiles = ref([]) // 上传文件列表
const pendingFiles = ref([]) // 待上传文件列表（延迟上传模式使用）
const showUpload = ref(1)
const uploading = ref(Array(props.maxCount).fill(false))
const uploadInput = ref()
const showMagnifier = ref(false) // 控制放大镜显示
const previewFiles = ref([]) // 预览文件列表
const showPreviewDialog = ref(false) // 显示预览对话框

// 监听文件列表变化
watchEffect(() => {
  // 回调立即执行一次，同时会自动跟踪回调中所依赖的所有响应式依赖
  initUpload()
})

/**
 * 初始化上传组件
 */
function initUpload() {
  uploadedFiles.value = [...props.fileList]
  if (uploadedFiles.value.length > props.maxCount) {
    uploadedFiles.value.splice(props.maxCount)
  }
  if (props.disabled) {
    // 禁用
    showUpload.value = uploadedFiles.value.length
  } else {
    if (uploadedFiles.value.length < props.maxCount) {
      showUpload.value = props.fileList.length + 1
    } else {
      showUpload.value = props.maxCount
    }
  }
}

/**
 * 检查url是否为图片
 * @param {string} url - 文件URL
 * @returns {boolean} 是否为图片
 */
function isImage(url) {
  const imageUrlReg = /\.(jpg|jpeg|png|gif)$/i
  const base64Reg = /^data:image/
  return imageUrlReg.test(url) || base64Reg.test(url)
}

/**
 * 检查url是否为PDF
 * @param {string} url - 文件URL
 * @returns {boolean} 是否为PDF
 */
function isPDF(url) {
  const pdfUrlReg = /\.pdf$/i
  const base64Reg = /^data:application\/pdf/
  return pdfUrlReg.test(url) || base64Reg.test(url)
}

/**
 * 拖拽上传处理
 * @param {DragEvent} e - 拖拽事件
 * @param {number} index - 文件索引
 */
function onDrop(e, index) {
  const files = e.dataTransfer?.files
  if (files?.length) {
    const len = files.length
    for (let n = 0; n < len; n++) {
      if (index + n <= props.maxCount) {
        // 不立即上传，而是添加到预览列表
        addToPreview(files[n], index + n)
      } else {
        break
      }
    }
    // input的change事件默认保存上一次input的value值，同一value值(根据文件路径判断)在上传时不重新加载
    uploadInput.value[index].value = ''
  }
}

/**
 * 点击上传区域处理
 * @param {number} index - 文件索引
 */
function onClick(index) {
  uploadInput.value[index].click()
}

/**
 * 文件选择上传处理
 * @param {Event} e - 文件选择事件
 * @param {number} index - 文件索引
 */
function onUpload(e, index) {
  const files = e.target.files
  if (files?.length) {
    const len = files.length
    for (let n = 0; n < len; n++) {
      if (index + n < props.maxCount) {
        // 不立即上传，而是添加到预览列表
        addToPreview(files[n], index + n)
      } else {
        break
      }
    }
    // input的change事件默认保存上一次input的value值，同一value值(根据文件路径判断)在上传时不重新加载
    uploadInput.value[index].value = ''
  }
}

// 事件发射器
const emits = defineEmits(['update:fileList', 'change', 'remove'])

/**
 * 添加文件到预览列表
 * @param {File} file - 要预览的文件
 * @param {number} index - 文件索引
 */
function addToPreview(file, index) {
  if (props.beforeUpload(file)) {
    if (props.deferredUpload) {
      // 延迟上传模式：直接添加到待上传列表
      addToPendingList(file, index)
    } else {
      // 立即上传模式：创建预览对象
      const reader = new FileReader()
      reader.onload = (e) => {
        const previewFile = {
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          url: e.target?.result,
          index: index
        }
        previewFiles.value.push(previewFile)
        showPreviewDialog.value = true
      }
      reader.readAsDataURL(file)
    }
  }
}

/**
 * 确认上传所有预览文件
 */
function confirmUpload() {
  previewFiles.value.forEach((previewFile) => {
    uploadFile(previewFile.file, previewFile.index)
  })
  cancelPreview()
}

/**
 * 取消预览，清空预览列表
 */
function cancelPreview() {
  previewFiles.value = []
  showPreviewDialog.value = false
}

/**
 * 从预览列表中移除指定文件
 * @param {number} index - 要移除的文件索引
 */
function removeFromPreview(index) {
  previewFiles.value.splice(index, 1)
  if (previewFiles.value.length === 0) {
    showPreviewDialog.value = false
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 文件扩展名
 */
function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

/**
 * 添加文件到待上传列表（延迟上传模式）
 * @param {File} file - 要添加的文件
 * @param {number} index - 文件索引
 */
function addToPendingList(file, index) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const pendingFile = {
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: e.target?.result, // 用于预览
      index: index,
      isPending: true // 标记为待上传状态
    }
    
    // 添加到待上传列表
    pendingFiles.value.push(pendingFile)
    
    // 同时添加到显示列表用于预览
    uploadedFiles.value.push(pendingFile)
    
    // 更新显示状态
    if (props.maxCount > showUpload.value) {
      showUpload.value++
    }
    
    // 触发变化事件
    emits('update:fileList', uploadedFiles.value)
    emits('change', uploadedFiles.value)
  }
  reader.readAsDataURL(file)
}

/**
 * 统一上传文件方法
 * @param {File} file - 要上传的文件
 * @param {number} index - 文件索引
 */
const uploadFile = (file, index) => {
  // console.log('开始上传 upload-event files:', file)
  if (props.beforeUpload(file)) {
    // 使用用户钩子进行上传前文件判断，例如大小、类型限制
    if (props.maxCount > showUpload.value) {
      showUpload.value++
    }
    if (props.uploadMode === 'base64') {
      // 以base64方式读取文件
      uploading.value[index] = true
      base64Upload(file, index)
    }
    if (props.uploadMode === 'custom') {
      // 自定义上传行为，需配合 customRequest 属性
      uploading.value[index] = true
      customUpload(file, index)
    }
  }
}

/**
 * Base64方式上传文件
 * @param {File} file - 要上传的文件
 * @param {number} index - 文件索引
 */
function base64Upload(file, index) {
  var reader = new FileReader()
  reader.readAsDataURL(file) // 以base64方式读取文件
  reader.onloadstart = function (e) {
    // 当读取操作开始时触发
    // reader.abort() // 取消上传
    // console.log('开始读取 onloadstart:', e)
  }
  reader.onabort = function (e) {
    // 当读取操作被中断时触发
    // console.log('读取中止 onabort:', e)
  }
  reader.onerror = function (e) {
    // 当读取操作发生错误时触发
    // console.log('读取错误 onerror:', e)
  }
  reader.onprogress = function (e) {
    // 在读取Blob时触发，读取上传进度，50ms左右调用一次
    // console.log('读取中 onprogress:', e)
    // console.log('已读取:', Math.ceil(e.loaded / e.total * 100))
    if (e.loaded === e.total) {
      // 上传完成
      uploading.value[index] = false // 隐藏loading状态
    }
  }
  reader.onload = function (e) {
    // 当读取操作成功完成时调用
    // console.log('读取成功 onload:', e)
    // 该文件的base64数据，如果是图片，则前端可直接用来展示图片
    uploadedFiles.value.push({
      name: file.name,
      url: e.target?.result
    })
    if (props.actionMessage.upload) {
      ElMessage.success(props.actionMessage.upload)
    }
    emits('update:fileList', uploadedFiles.value)
    emits('change', uploadedFiles.value)
  }
  reader.onloadend = function (e) {
    // 当读取操作结束时触发（要么成功，要么失败）触发
    // console.log('读取结束 onloadend:', e)
  }
}

/**
 * 自定义上传处理
 * @param {File} file - 要上传的文件
 * @param {number} index - 文件索引
 */
function customUpload(file, index) {
  props
    .customRequest(file)
    .then((res) => {
      // 确保返回的对象包含路径信息
      const fileInfo = {
        name: res.name || file.name,
        url: res.url,
        path: res.path || res.filename || '', // 添加路径信息
        ...res
      }
      uploadedFiles.value.push(fileInfo)
      if (props.actionMessage.upload) {
        ElMessage.success(props.actionMessage.upload)
      }
      emits('update:fileList', uploadedFiles.value)
      emits('change', uploadedFiles.value)
    })
    .catch((err) => {
      if (props.maxCount > 1) {
        showUpload.value = uploadedFiles.value.length + 1
      }
      ElMessage.error(typeof err === 'string' ? err : '上传失败')
    })
    .finally(() => {
      uploading.value[index] = false
    })
}

/**
 * 文件预览处理
 * @param {number} n - 文件序号
 * @param {string} url - 文件URL
 */
function onPreview(n, url) {
  if (isImage(url)) {
    // 如果是图片，使用图片预览
    window.open(url)
  } else {
    // 其他文件类型直接打开
    window.open(url)
  }
}

/**
 * 文件删除处理
 * @param {number} index - 文件索引
 */
function onRemove(index) {
  if (uploadedFiles.value.length < props.maxCount) {
    showUpload.value--
  }
  const removeFile = uploadedFiles.value.splice(index, 1)
  
  // 如果是待上传文件，也要从待上传列表中移除
  if (removeFile[0]?.isPending) {
    const pendingIndex = pendingFiles.value.findIndex(f => f.name === removeFile[0].name)
    if (pendingIndex > -1) {
      pendingFiles.value.splice(pendingIndex, 1)
    }
  }
  
  if (props.actionMessage.remove) {
    ElMessage.success(props.actionMessage.remove)
  }
  emits('remove', removeFile)
  emits('update:fileList', uploadedFiles.value)
  emits('change', uploadedFiles.value)
}

/**
 * 消息提示方法
 */
function onInfo(content) {
  ElMessage.info(content)
}

function onSuccess(content) {
  ElMessage.success(content)
}

function onError(content) {
  ElMessage.error(content)
}

function onWarning(content) {
  ElMessage.warning(content)
}

function onLoading(content) {
  ElMessage({
    message: content,
    type: 'info',
    duration: 0
  })
}

/**
 * 执行所有待上传文件的上传操作（延迟上传模式）
 * @returns {Promise} 上传结果Promise
 */
function uploadPendingFiles() {
  return new Promise((resolve, reject) => {
    if (pendingFiles.value.length === 0) {
      resolve([])
      return
    }
    
    const uploadPromises = pendingFiles.value.map((pendingFile, index) => {
      return new Promise((fileResolve, fileReject) => {
        if (props.uploadMode === 'custom') {
          // 设置上传状态
          uploading.value[pendingFile.index] = true
          
          props.customRequest(pendingFile.file)
            .then((res) => {
              // 更新文件信息
              const fileInfo = {
                name: res.name || pendingFile.file.name,
                url: res.url,
                path: res.path || res.filename || '',
                isPending: false, // 标记为已上传
                ...res
              }
              
              // 更新uploadedFiles中对应的文件
              const uploadedIndex = uploadedFiles.value.findIndex(f => f.name === pendingFile.name && f.isPending)
              if (uploadedIndex > -1) {
                uploadedFiles.value[uploadedIndex] = fileInfo
              }
              
              fileResolve(fileInfo)
            })
            .catch((err) => {
              fileReject(err)
            })
            .finally(() => {
              uploading.value[pendingFile.index] = false
            })
        } else {
          // base64模式或其他模式
          fileResolve(pendingFile)
        }
      })
    })
    
    Promise.all(uploadPromises)
      .then((results) => {
        // 清空待上传列表
        pendingFiles.value = []
        
        // 触发变化事件
        emits('update:fileList', uploadedFiles.value)
        emits('change', uploadedFiles.value)
        
        if (props.actionMessage.upload) {
          ElMessage.success(props.actionMessage.upload)
        }
        
        resolve(results)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

/**
 * 获取待上传文件列表
 * @returns {Array} 待上传文件列表
 */
function getPendingFiles() {
  return pendingFiles.value
}

/**
 * 清空所有文件（包括已上传和待上传）
 */
function clearAllFiles() {
  uploadedFiles.value = []
  pendingFiles.value = []
  showUpload.value = 1
  emits('update:fileList', uploadedFiles.value)
  emits('change', uploadedFiles.value)
}

// 暴露方法给父组件
defineExpose({
  info: onInfo,
  success: onSuccess,
  error: onError,
  warning: onWarning,
  loading: onLoading,
  uploadPendingFiles, // 上传所有待上传文件
  getPendingFiles, // 获取待上传文件列表
  clearAllFiles, // 清空所有文件
  clearFiles: () => {
    uploadedFiles.value = []
    pendingFiles.value = []
    emits('update:fileList', [])
  },
  getFiles: () => uploadedFiles.value,
  onClick: onClick // 暴露点击方法给父组件
})
</script>

<template>
  <div class="m-upload-wrap">
    <!-- 上传区域 -->
    <div class="upload-space">
      <div class="m-upload-item" v-for="n of showUpload" :key="n">
        <div class="m-upload">
          <!-- 文字按钮 -->
          <div v-show="!uploading[n - 1] && !uploadedFiles[n - 1]" class="upload-button-container">
            <el-button 
              type="primary" 
              :disabled="disabled"
              @click="disabled ? () => false : onClick(n - 1)"
              class="upload-text-button"
            >
              <el-icon><Plus /></el-icon>
              {{ tip }}
            </el-button>
            
            <!-- 带外框的上传按钮 -->
            <div
              class="upload-item"
              :class="{ 'upload-disabled': disabled }"
              @dragenter.stop.prevent
              @dragover.stop.prevent
              @drop.stop.prevent="disabled ? () => false : onDrop($event, n - 1)"
              @click="disabled ? () => false : onClick(n - 1)"
            >
              <input
                ref="uploadInput"
                type="file"
                @click.stop
                :accept="accept"
                :multiple="multiple"
                @change="onUpload($event, n - 1)"
                style="display: none"
              />
              <div class="upload-content">
                <el-icon class="plus-icon">
                  <Plus />
                </el-icon>
                <p class="upload-hint">点击或拖拽上传</p>
              </div>
            </div>
          </div>
          <div v-show="uploading[n - 1]" class="file-uploading">
            <el-icon class="loading-icon">
              <Loading />
            </el-icon>
            <p class="upload-tip">上传中...</p>
          </div>
          <div v-if="uploadedFiles[n - 1]" class="file-preview">
            <div class="preview-container">
              <el-image
                v-if="isImage(uploadedFiles[n - 1].url)"
                :src="uploadedFiles[n - 1].url"
                :fit="fit"
                class="preview-image"
                :preview-src-list="[uploadedFiles[n - 1].url]"
                @mouseenter="showMagnifier = true"
                @mouseleave="showMagnifier = false"
              />
              <el-icon
                v-else-if="isPDF(uploadedFiles[n - 1].url)"
                class="file-icon pdf-icon"
              >
                <Document />
              </el-icon>
              <el-icon v-else class="file-icon">
                <Document />
              </el-icon>
              
              <!-- 悬浮放大镜效果 -->
              <div class="magnifier-overlay" v-if="isImage(uploadedFiles[n - 1].url)">
                <el-icon class="magnifier-icon">
                  <View />
                </el-icon>
              </div>
              
              <div class="file-mask">
                <el-icon class="action-icon" title="预览" @click="onPreview(n - 1, uploadedFiles[n - 1].url)">
                  <View />
                </el-icon>
                <el-icon v-show="!disabled" class="action-icon" title="删除" @click.prevent.stop="onRemove(n - 1)">
                  <Delete />
                </el-icon>
              </div>
            </div>
            
            <!-- 文件信息显示 -->
            <div class="file-info">
              <div class="file-name" :title="uploadedFiles[n - 1].name">
                {{ uploadedFiles[n - 1].name }}
              </div>
              
              <!-- 待上传状态提示 -->
              <div v-if="uploadedFiles[n - 1].isPending" class="pending-status">
                <el-tag type="warning" size="small">
                  <el-icon><Loading /></el-icon>
                  待上传
                </el-tag>
              </div>
              
              <!-- 已上传文件的路径信息 -->
              <div class="file-path" v-else-if="uploadedFiles[n - 1].path">
                <span class="path-label">保存路径:</span>
                <span class="path-value" :title="uploadedFiles[n - 1].path">
                  {{ uploadedFiles[n - 1].path }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 上传状态提示 -->
    <div v-if="uploadedFiles.length > 0" class="upload-status">
      <el-tag 
        v-if="pendingFiles.length > 0" 
        type="warning" 
        size="small"
      >
        已选择 {{ uploadedFiles.length }} 个文件，{{ pendingFiles.length }} 个待上传
      </el-tag>
      <el-tag 
        v-else 
        type="success" 
        size="small"
      >
        已上传 {{ uploadedFiles.length }} 个文件
      </el-tag>
    </div>
    
    <!-- 预览确认对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      title="文件预览确认"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="preview-dialog-content">
        <div class="preview-header">
          <span>请确认要上传的文件 ({{ previewFiles.length }} 个)</span>
        </div>
        
        <div class="preview-list">
          <div 
            v-for="(file, index) in previewFiles" 
            :key="index" 
            class="preview-item"
          >
            <div class="preview-image-container">
              <el-image
                v-if="isImage(file.url)"
                :src="file.url"
                fit="cover"
                class="preview-dialog-image"
                :preview-src-list="[file.url]"
              />
              <div v-else class="preview-file-icon">
                <el-icon class="file-icon">
                  <Document />
                </el-icon>
              </div>
            </div>
            
            <div class="preview-file-info">
              <div class="file-name" :title="file.name">{{ file.name }}</div>
              <div class="file-details">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="file-type">{{ file.type || '未知类型' }}</span>
              </div>
              <div class="target-path">
                <span class="path-label">保存路径:</span>
                <span class="path-value">uploads\site-images\publishing-exception\{{ file.name.substring(0, file.name.lastIndexOf('.')) }}-[时间戳].{{ getFileExtension(file.name) }}</span>
              </div>
              <div class="path-note">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
                <span>文件将保存到服务器指定目录，上传后显示实际路径</span>
              </div>
            </div>
            
            <div class="preview-actions">
              <el-button 
                type="danger" 
                size="small" 
                :icon="Delete"
                @click="removeFromPreview(index)"
              >
                移除
              </el-button>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelPreview()">取消</el-button>
          <el-button 
            type="primary" 
            @click="confirmUpload()"
            :disabled="previewFiles.length === 0"
          >
            确认上传 ({{ previewFiles.length }})
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.m-upload-wrap {
  display: inline-block;
}

.upload-space {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.m-upload-item {
  display: inline-block;
}

.m-upload {
  position: relative;
  display: inline-block;
  width: 120px;
  min-height: 160px;
}

.upload-button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-text-button {
  width: 100%;
  margin-bottom: 8px;
}

.upload-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  border: 2px dashed #d9d9d9;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.upload-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(64, 158, 255, 0.1), transparent);
  transition: left 0.5s;
}

.upload-item:hover {
  border-color: #409eff;
  background: transparent;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.upload-item:hover::before {
  left: 100%;
}

.upload-disabled {
  cursor: not-allowed;
}

.upload-disabled:hover {
  border-color: #d9d9d9;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.plus-icon {
  font-size: 24px;
  color: #409eff;
  transition: all 0.3s ease;
}

.upload-item:hover .plus-icon {
  transform: scale(1.1);
  color: #1976d2;
}

.upload-tip {
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
  margin: 0;
  font-weight: 500;
}

.upload-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.upload-text {
  color: #409eff;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
  margin: 0;
  line-height: 1.2;
}

.file-uploading {
  width: 120px;
  height: 120px;
  padding: 8px;
  border-radius: 12px;
  border: 2px solid #409eff;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.loading-icon {
  font-size: 20px;
  color: #409eff;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.file-preview {
  width: 120px;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.file-preview:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.preview-container {
  position: relative;
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.magnifier-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.preview-container:hover .magnifier-overlay {
  opacity: 1;
}

.magnifier-icon {
  font-size: 24px;
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.file-icon {
  font-size: 40px;
  color: #409eff;
}

.pdf-icon {
  color: #f56c6c;
}

.file-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.preview-container:hover .file-mask {
  opacity: 1;
  pointer-events: auto;
}

.action-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px;
  border-radius: 4px;
}

.action-icon:hover {
  color: white;
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.file-info {
  padding: 8px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.file-name {
  font-size: 12px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-path {
  font-size: 11px;
  color: #909399;
  line-height: 1.3;
}

.path-label {
  font-weight: 500;
  color: #606266;
}

.path-value {
  display: block;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Courier New', monospace;
  background: #fff;
  padding: 2px 4px;
  border-radius: 3px;
  border: 1px solid #e4e7ed;
}

.upload-status {
  margin-top: 8px;
  text-align: center;
}

/* 预览对话框样式 */
.preview-dialog-content {
  max-height: 500px;
  overflow-y: auto;
}

.preview-header {
  padding: 12px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 16px;
  font-weight: 500;
  color: #303133;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.preview-item:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.preview-image-container {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  margin-right: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e4e7ed;
}

.preview-dialog-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.preview-file-icon .file-icon {
  font-size: 32px;
  color: #409eff;
}

.preview-file-info {
  flex: 1;
  min-width: 0;
}

.preview-file-info .file-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-details {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
}

.file-size,
.file-type {
  font-size: 12px;
  color: #909399;
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 4px;
}

.target-path {
  font-size: 12px;
  color: #606266;
}

.target-path .path-label {
  font-weight: 500;
  margin-right: 4px;
}

.target-path .path-value {
  font-family: 'Courier New', monospace;
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  color: #409eff;
}

.path-note {
  margin-top: 6px;
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #909399;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 3px solid #e6a23c;
}

.info-icon {
  margin-right: 4px;
  color: #e6a23c;
  font-size: 12px;
}

.preview-actions {
  margin-left: 12px;
  flex-shrink: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>