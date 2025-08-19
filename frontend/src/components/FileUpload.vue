<script setup>
import { ref, watchEffect, onMounted, onUnmounted } from 'vue'
import { Upload } from '@element-plus/icons-vue'

// 组件属性定义
const props = defineProps({
  accept: {
    type: String,
    default: '*'
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
    default: 'contain'
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
    default: 'base64'
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
  // 新增：是否启用粘贴上传功能
  enablePaste: {
    type: Boolean,
    default: true
  }
})

// 响应式数据
const uploadedFiles = ref([]) // 上传文件列表
const showUpload = ref(1)
const uploading = ref(Array(props.maxCount).fill(false))
const uploadInput = ref()
const uploadContainer = ref() // 上传容器引用，用于粘贴事件监听
watchEffect(() => {
  // 回调立即执行一次，同时会自动跟踪回调中所依赖的所有响应式依赖
  initUpload()
})

// 粘贴事件处理函数
function handlePaste(event) {
  // 如果禁用粘贴功能或组件被禁用，则不处理
  if (!props.enablePaste || props.disabled) {
    return
  }
  
  // 检查是否还能上传更多文件
  if (uploadedFiles.value.length >= props.maxCount) {
    console.warn('已达到最大上传数量限制')
    return
  }
  
  const clipboardData = event.clipboardData || window.clipboardData
  const items = clipboardData.items
  
  // 遍历剪贴板项目，查找图片
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    // 检查是否为图片类型
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault() // 阻止默认粘贴行为
      
      const file = item.getAsFile()
      if (file) {
        // 检查文件类型是否符合accept属性
        if (props.accept !== '*' && !isFileTypeAccepted(file)) {
          console.warn('粘贴的图片格式不被支持')
          return
        }
        
        // 找到下一个可用的上传位置
        const nextIndex = uploadedFiles.value.length
        if (nextIndex < props.maxCount) {
          uploadFile(file, nextIndex)
        }
      }
      break // 只处理第一个图片
    }
  }
}

// 检查文件类型是否被接受
function isFileTypeAccepted(file) {
  if (props.accept === '*') return true
  
  const acceptTypes = props.accept.split(',')
  return acceptTypes.some(type => {
    const trimmedType = type.trim()
    if (trimmedType.startsWith('.')) {
      // 扩展名匹配
      return file.name.toLowerCase().endsWith(trimmedType.toLowerCase())
    } else {
      // MIME类型匹配
      return file.type.match(new RegExp(trimmedType.replace('*', '.*')))
    }
  })
}

// 组件挂载时添加粘贴事件监听
onMounted(() => {
  if (props.enablePaste && !props.disabled) {
    document.addEventListener('paste', handlePaste)
  }
})

// 组件卸载时移除粘贴事件监听
onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})
function initUpload() {
  // 初始化上传文件列表
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
function isImage(url) {
  // 检查url是否为图片
  const imageUrlReg = /\.(jpg|jpeg|png|gif)$/i
  const base64Reg = /^data:image/
  return imageUrlReg.test(url) || base64Reg.test(url)
}
function isPDF(url) {
  // 检查url是否为pdf
  const pdfUrlReg = /\.pdf$/i
  const base64Reg = /^data:application\/pdf/
  return pdfUrlReg.test(url) || base64Reg.test(url)
}
function onDrop(e, index) {
  // 拖拽上传
  const files = e.dataTransfer?.files
  if (files?.length) {
    const len = files.length
    for (let n = 0; n < len; n++) {
      if (index + n <= props.maxCount) {
        uploadFile(files[n], index + n)
      } else {
        break
      }
    }
    // input的change事件默认保存上一次input的value值，同一value值(根据文件路径判断)在上传时不重新加载
    uploadInput.value[index].value = ''
  }
}
function onClick(index) {
  uploadInput.value[index].click()
}
function onUpload(e, index) {
  // 点击上传
  const files = e.target.files
  if (files?.length) {
    const len = files.length
    for (let n = 0; n < len; n++) {
      if (index + n < props.maxCount) {
        uploadFile(files[n], index + n)
      } else {
        break
      }
    }
    // input的change事件默认保存上一次input的value值，同一value值(根据文件路径判断)在上传时不重新加载
    uploadInput.value[index].value = ''
  }
}
const emits = defineEmits(['update:fileList', 'change', 'remove', 'preview'])
const uploadFile = (file, index) => {
  // 统一上传文件方法
  // console.log('开始上传 upload-event files:', file)
  if (props.beforeUpload(file)) {
    // 使用用户钩子进行上传前文件判断，例如大小、类型限制
    if (props.maxCount > showUpload.value) {
      showUpload.value++
    }
    
    // 为本地文件立即生成预览URL
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = function(e) {
        // 立即添加到uploadedFiles用于预览显示
        uploadedFiles.value[index] = {
          name: file.name,
          url: e.target.result, // data URL用于预览
          file: file, // 保存原始文件对象
          filename: file.name,
          size: file.size,
          type: file.type,
          isLocal: true // 标记为本地文件
        }
        // 触发更新事件
        emits('update:fileList', uploadedFiles.value)
        emits('change', uploadedFiles.value)
      }
      reader.readAsDataURL(file)
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
      console.log(props.actionMessage.upload || '上传成功')
      emits('update:fileList', uploadedFiles.value)
      emits('change', uploadedFiles.value)
  }
  reader.onloadend = function (e) {
    // 当读取操作结束时触发（要么成功，要么失败）触发
    // console.log('读取结束 onloadend:', e)
  }
}
function customUpload(file, index) {
  props
    .customRequest(file)
    .then((res) => {
      // 如果已经有本地预览，则更新该项而不是添加新项
      if (uploadedFiles.value[index] && uploadedFiles.value[index].isLocal) {
        // 保留本地预览URL，添加服务器返回的信息
        const localPreviewUrl = uploadedFiles.value[index].url
        uploadedFiles.value[index] = {
          ...uploadedFiles.value[index],
          ...res,
          previewUrl: localPreviewUrl, // 保留本地预览URL
          serverUrl: res.url, // 保存服务器URL
          isUploaded: true // 标记为已上传
        }
      } else {
        uploadedFiles.value.push(res)
      }
      console.log(props.actionMessage.upload || '上传成功')
      emits('update:fileList', uploadedFiles.value)
      emits('change', uploadedFiles.value)
    })
    .catch((err) => {
      if (props.maxCount > 1) {
        showUpload.value = uploadedFiles.value.length + 1
      }
      console.error(err)
    })
    .finally(() => {
      uploading.value[index] = false
    })
}
// 预览文件
function onPreview(n, url) {
  const fileInfo = uploadedFiles.value[n]
  let previewUrl = url
  
  // 如果传入的URL是有效的（包括base64数据），直接使用
  if (previewUrl && (previewUrl.startsWith('data:') || previewUrl.startsWith('blob:') || previewUrl.startsWith('http'))) {
    // 使用提供的URL
  }
  // 如果没有URL或URL不可用，且文件是本地文件，则创建预览URL
  else if (!previewUrl && fileInfo.file) {
    // 为本地文件创建预览URL
    previewUrl = URL.createObjectURL(fileInfo.file)
  }
  // 如果fileInfo中有url（base64数据），使用它
  else if (!previewUrl && fileInfo.url) {
    previewUrl = fileInfo.url
  }
  
  // 触发自定义预览事件，让父组件处理预览逻辑
  emits('preview', fileInfo, previewUrl)
}
function onRemove(index) {
  if (uploadedFiles.value.length < props.maxCount) {
    showUpload.value--
  }
  const removeFile = uploadedFiles.value.splice(index, 1)
  console.log(props.actionMessage.remove || '删除成功')
  emits('remove', removeFile)
  emits('update:fileList', uploadedFiles.value)
  emits('change', uploadedFiles.value)
}

/**
 * 处理图片加载成功
 * @param {number} index - 文件索引
 * @param {string} url - 图片URL
 */
function onImageLoad(index, url) {
  const fileInfo = uploadedFiles.value[index]
  console.log('图片加载成功:', {
    文件名: fileInfo?.name || fileInfo?.filename,
    加载来源: url,
    文件信息: fileInfo
  })
}

/**
 * 处理图片加载错误
 * 当图片无法加载时（如后端文件已删除），自动从列表中移除该图片
 * @param {number} index - 图片在列表中的索引
 */
function onImageError(index) {
  console.warn('图片加载失败，自动移除:', uploadedFiles.value[index])
  // 自动移除无法加载的图片
  onRemove(index)
}
function onInfo(content) {
  console.log('Info:', content)
}
function onSuccess(content) {
  console.log('Success:', content)
}
function onError(content) {
  console.error('Error:', content)
}
function onWarning(content) {
  console.warn('Warning:', content)
}
function onLoading(content) {
  console.log('Loading:', content)
}
// 注释：已移除getImageUrls和getImageIndex函数，因为不再使用el-image的内置预览功能
defineExpose({
  info: onInfo,
  success: onSuccess,
  error: onError,
  warning: onWarning,
  loading: onLoading
})
</script>
<template>
  <div class="m-upload-wrap">
    <div class="upload-space">
      <div class="m-upload-item" v-for="n of showUpload" :key="n">
        <div class="m-upload">
          <div
            v-show="!uploading[n - 1] && !uploadedFiles[n - 1]"
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
              title="选择异常图片"
              style="display: none"
            />
            <div>
              <el-icon class="plus-svg">
                <Upload />
              </el-icon>
              <p class="upload-tip">
                <slot>{{ tip }}</slot>
              </p>
              <div v-if="enablePaste && !disabled" class="paste-hint">或 Ctrl+V 粘贴</div>
            </div>
          </div>
          <div v-show="uploading[n - 1]" class="file-uploading">
            <div class="spin-uploading">上传中...</div>
          </div>
          <div v-if="uploadedFiles[n - 1]" class="file-preview">
            <img
              v-if="isImage(uploadedFiles[n - 1].previewUrl || uploadedFiles[n - 1].url)"
              :src="uploadedFiles[n - 1].previewUrl || uploadedFiles[n - 1].url"
              :alt="uploadedFiles[n - 1].filename || 'preview'"
              style="width: 82px; height: 82px; border-radius: 4px; object-fit: cover; cursor: pointer;"
              @click.prevent.stop="onPreview(n - 1, uploadedFiles[n - 1].previewUrl || uploadedFiles[n - 1].url)"
              @load="onImageLoad(n - 1, uploadedFiles[n - 1].previewUrl || uploadedFiles[n - 1].url)"
              @error="onImageError(n - 1)"
              title="点击预览图片"
            />
            <svg
              v-else-if="isPDF(uploadedFiles[n - 1].url)"
              class="file-svg"
              focusable="false"
              data-icon="file-pdf"
              aria-hidden="true"
              viewBox="64 64 896 896"
            >
              <path
                d="M531.3 574.4l.3-1.4c5.8-23.9 13.1-53.7 7.4-80.7-3.8-21.3-19.5-29.6-32.9-30.2-15.8-.7-29.9 8.3-33.4 21.4-6.6 24-.7 56.8 10.1 98.6-13.6 32.4-35.3 79.5-51.2 107.5-29.6 15.3-69.3 38.9-75.2 68.7-1.2 5.5.2 12.5 3.5 18.8 3.7 7 9.6 12.4 16.5 15 3 1.1 6.6 2 10.8 2 17.6 0 46.1-14.2 84.1-79.4 5.8-1.9 11.8-3.9 17.6-5.9 27.2-9.2 55.4-18.8 80.9-23.1 28.2 15.1 60.3 24.8 82.1 24.8 21.6 0 30.1-12.8 33.3-20.5 5.6-13.5 2.9-30.5-6.2-39.6-13.2-13-45.3-16.4-95.3-10.2-24.6-15-40.7-35.4-52.4-65.8zM421.6 726.3c-13.9 20.2-24.4 30.3-30.1 34.7 6.7-12.3 19.8-25.3 30.1-34.7zm87.6-235.5c5.2 8.9 4.5 35.8.5 49.4-4.9-19.9-5.6-48.1-2.7-51.4.8.1 1.5.7 2.2 2zm-1.6 120.5c10.7 18.5 24.2 34.4 39.1 46.2-21.6 4.9-41.3 13-58.9 20.2-4.2 1.7-8.3 3.4-12.3 5 13.3-24.1 24.4-51.4 32.1-71.4zm155.6 65.5c.1.2.2.5-.4.9h-.2l-.2.3c-.8.5-9 5.3-44.3-8.6 40.6-1.9 45 7.3 45.1 7.4zm191.4-388.2L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326zm1.8 562H232V136h302v216a42 42 0 0042 42h216v494z"
              ></path>
            </svg>
            <svg v-else class="file-svg" focusable="false" data-icon="file" aria-hidden="true" viewBox="64 64 896 896">
              <path d="M534 352V136H232v752h560V394H576a42 42 0 01-42-42z" fill="#e6f7ff"></path>
              <path
                d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM602 137.8L790.2 326H602V137.8zM792 888H232V136h302v216a42 42 0 0042 42h216v494z"
              ></path>
            </svg>
            <div class="file-mask">
              <a v-show="!disabled" class="file-icon" title="预览" @click.prevent.stop="onPreview(n - 1, uploadedFiles[n - 1].previewUrl || uploadedFiles[n - 1].url)">
                <svg class="icon-svg" focusable="false" data-icon="eye" aria-hidden="true" viewBox="64 64 896 896">
                  <path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 000 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z"></path>
                </svg>
              </a>
              <a v-show="!disabled" class="file-icon" title="删除" @click.prevent.stop="onRemove(n - 1)">
                <svg class="icon-svg" focusable="false" data-icon="delete" aria-hidden="true" viewBox="64 64 896 896">
                  <path
                    d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z"
                  ></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="less" scoped>
.m-upload-wrap {
  display: inline-block;
  .upload-space {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .m-upload-item {
    display: inline-block;
  }
  .mr8 {
    margin-right: 8px;
  }
}
.m-upload {
  position: relative;
  display: inline-block;
  width: 100px;
  height: 100px;
  .upload-item {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100px;
    height: 100px;
    border-radius: 8px;
    border: 2px dashed #d9d9d9;
    background-color: rgba(64, 158, 255, 0.05);
    cursor: pointer;
    transition: all 0.3s ease;
    &:hover {
      border-color: #409EFF;
      background-color: rgba(64, 158, 255, 0.1);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
    }
    .plus-svg {
      display: inline-block;
      width: 14px;
      height: 14px;
      fill: rgba(0, 0, 0, 0.88);
    }
    .upload-tip {
      margin: 2px 0 0 0;
      padding: 0;
      font-size: 14px;
      color: #409EFF;
      line-height: 1.2;
      font-weight: 500;
    }
    .paste-hint {
      margin-top: 4px;
      color: #F56C6C;
      font-size: 12px;
      font-style: italic;
      font-weight: 500;
    }
  }
  .upload-disabled {
    cursor: not-allowed;
    &:hover {
      border-color: #d9d9d9;
    }
  }
  .file-uploading {
    width: 100px;
    height: 100px;
    padding: 8px;
    border-radius: 8px;
    border: 1px dashed #d9d9d9;
    background-color: rgba(0, 0, 0, 0.02);
    display: flex;
    align-items: center;
    text-align: center;
    .spin-uploading {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 12px;
      color: #666;
    }
  }
  .file-preview {
    position: relative;
    padding: 8px;
    width: 100px;
    height: 100px;
    border-radius: 8px;
    padding: 8px;
    border: 1px solid #d9d9d9;
    display: flex;
    align-items: center;
    text-align: center;
    .file-svg {
      display: inline-block;
      width: 100%;
      height: 60px;
      fill: #1890ff;
    }
    .file-mask {
      // top right bottom left 简写为 inset: 0
      // insert 无论元素的书写模式、行内方向和文本朝向如何，其所定义的都不是逻辑偏移而是实体偏移
      position: absolute;
      inset: 0;
      margin: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;

      .file-icon {
        display: inline-block;
        height: 16px;
        margin: 0 4px;
        cursor: pointer;
        .icon-svg {
          display: inline-block;
          width: 16px;
          height: 16px;
          fill: rgba(255, 255, 255, 0.65);
          cursor: pointer;
          transition: all 0.3s;
          &:hover {
            fill: rgba(255, 255, 255, 1);
          }
        }
      }
    }
    &:hover {
      .file-mask {
        opacity: 1;
        pointer-events: auto;
      }
    }
  }
}
</style>
