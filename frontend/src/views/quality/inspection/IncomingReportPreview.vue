<template>
  <div class="print-preview-page">
    <!-- Close Icon -->
    <div class="close-icon-wrapper no-print" @click="handleClose">
      <el-icon :size="30" color="#909399"><CircleCloseFilled /></el-icon>
    </div>

    <!-- Print Button (Fixed Right) -->
    <div class="print-btn-wrapper no-print">
        <el-button type="primary" size="large" class="print-float-btn" :icon="Printer" @click="handlePrint">
            打印
        </el-button>
    </div>

    <!-- Seal Selector -->
    <div class="seal-selector no-print" v-if="!loading && reportData">
        <span class="label">电子签章：</span>
        <el-select 
            v-model="selectedSealId" 
            placeholder="选择印章" 
            clearable 
            @change="handleSealChange"
            style="width: 200px"
            popper-class="seal-select-popper"
        >
            <el-option 
                v-for="seal in availableSeals" 
                :key="seal.ID" 
                :label="seal.SealName" 
                :value="seal.ID" 
                class="seal-option-item"
            >
                <div class="seal-option-content">
                    <img 
                        v-if="seal.ImageUrl"
                        :src="getAdaptedSealUrl(seal.ImageUrl)" 
                        class="seal-thumb" 
                        @error="(e) => e.target.style.display = 'none'"
                    />
                    <span class="seal-name">{{ seal.SealName }}</span>
                </div>
            </el-option>
        </el-select>

        <div v-if="selectedSealId" class="seal-size-control">
            <span class="size-label">尺寸:</span>
            <el-input-number 
                v-model="sealWidth" 
                :min="1" :max="8" :step="0.1" :precision="1" 
                size="small" controls-position="right" style="width: 70px;"
                @change="onWidthChange"
            />
            <span class="size-sep">×</span>
            <el-input-number 
                v-model="sealHeight" 
                :min="1" :max="8" :step="0.1" :precision="1" 
                size="small" controls-position="right" style="width: 70px;"
                @change="onHeightChange"
            />
            <span class="size-unit">cm</span>
            
            <el-tooltip :content="lockAspectRatio ? '点击解锁比例' : '点击锁定比例'" placement="top">
                <el-button 
                    link 
                    :type="lockAspectRatio ? 'danger' : 'primary'"
                    :icon="lockAspectRatio ? Lock : Unlock" 
                    @click="toggleLock" 
                    class="lock-btn" 
                    style="margin-left: 5px; font-size: 18px;"
                />
            </el-tooltip>
        </div>
    </div>
    
    <div class="preview-content" v-loading="loading">
      <IncomingReportPrint v-if="reportData" :data="reportData" :preview-mode="true" ref="printComponentRef" />
      <div v-else-if="!loading" class="error-msg">
        加载报告数据失败或数据不存在
      </div>
      
      <DraggableSeal 
        v-if="selectedSealId && sealImageUrl"
        :sealUrl="sealImageUrl"
        :initialX="sealPosition.x"
        :initialY="sealPosition.y"
        :width="pixelWidth"
        :height="pixelHeight"
        @update:position="updateSealPosition"
        @remove="removeSeal"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getIncomingReportDetail } from '@/api/inspection'
import { getElectronicSeals } from '@/api/system'
import IncomingReportPrint from './components/IncomingReportPrint.vue'
import DraggableSeal from '@/components/DraggableSeal.vue'
import { CircleCloseFilled, Printer, Lock, Unlock } from '@element-plus/icons-vue'

const route = useRoute()
const loading = ref(false)
const reportData = ref(null)
const printComponentRef = ref(null)

// Seal Logic
const availableSeals = ref([])
const selectedSealId = ref(null)
const sealPosition = ref({ x: 0, y: 0 })
const sealImageUrl = ref('')

const sealWidth = ref(3.5)
const sealHeight = ref(3.5)
const lockAspectRatio = ref(true)

// Convert cm to px (approx 96dpi: 1cm = 37.8px)
const CM_TO_PX = 37.8
const pixelWidth = computed(() => Math.round(sealWidth.value * CM_TO_PX))
const pixelHeight = computed(() => Math.round(sealHeight.value * CM_TO_PX))

// Watchers for aspect ratio
let isUpdating = false

const onWidthChange = (val) => {
    if (lockAspectRatio.value && !isUpdating && val > 0) {
        isUpdating = true
        sealHeight.value = val
        isUpdating = false
    }
}

const onHeightChange = (val) => {
    if (lockAspectRatio.value && !isUpdating && val > 0) {
        isUpdating = true
        sealWidth.value = val
        isUpdating = false
    }
}

const toggleLock = () => {
    lockAspectRatio.value = !lockAspectRatio.value
    if (lockAspectRatio.value) {
        sealHeight.value = sealWidth.value
    }
}

const getAdaptedSealUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url
    
    // Replace /uploads/seals/ with /files/seals/
    let cleanPath = url
    if (cleanPath.startsWith('/uploads/seals/')) {
        cleanPath = cleanPath.replace('/uploads/seals/', '/files/seals/')
    } else if (!cleanPath.startsWith('/files/')) {
        cleanPath = `/files/seals/${cleanPath.replace(/^\/+/, '')}`
    }
    
    // Ensure it starts with /
    if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath
    }
    
    const hostname = window.location.hostname
    const protocol = window.location.protocol
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return cleanPath
    } else {
        // Production: use port 8080 for file server
        return `${protocol}//${hostname}:8080${cleanPath}`
    }
}

const preloadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:')) {
      resolve(url)
      return
    }
    
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const base64 = canvas.toDataURL('image/png')
        resolve(base64)
      } catch (e) {
        console.warn('图片转base64失败（canvas tainted），使用原始URL')
        resolve(url)
      }
    }
    
    img.onerror = () => {
      console.warn('图片预加载失败:', url)
      reject(new Error('图片加载失败'))
    }
    
    const separator = url.includes('?') ? '&' : '?'
    img.src = url + separator + '_t=' + Date.now()
  })
}

// Watch selectedSealId to load image
watch(selectedSealId, async (newId) => {
  if (newId) {
    const seal = availableSeals.value.find(s => s.ID === newId)
    if (seal && seal.ImageUrl) {
      const url = getAdaptedSealUrl(seal.ImageUrl)
      try {
        const base64 = await preloadImageAsBase64(url)
        sealImageUrl.value = base64
      } catch (e) {
        sealImageUrl.value = url
      }
    }
  } else {
    sealImageUrl.value = ''
  }
})

onMounted(() => {
  const id = route.params.id
  if (id) {
    fetchData(id)
  }
})

const fetchData = async (id) => {
  loading.value = true
  try {
    const [res, sealsRes] = await Promise.all([
        getIncomingReportDetail(id),
        getElectronicSeals({ forPrint: true })
    ])
    
    if (res.success) {
      reportData.value = res.data
      // 等待DOM渲染，然后刷新配置（如LOGO）
      nextTick(() => {
        if (printComponentRef.value && printComponentRef.value.refreshConfig) {
          printComponentRef.value.refreshConfig()
        }
      })
    }
    
    // Handle seals data format
    let sealsData = []
    if (Array.isArray(sealsRes)) {
        sealsData = sealsRes
    } else if (sealsRes && Array.isArray(sealsRes.data)) {
        sealsData = sealsRes.data
    }
    
    availableSeals.value = sealsData
    
    if (availableSeals.value.length > 0) {
        // Auto-select "品质部门章-腾佳"
        const defaultSeal = availableSeals.value.find(s => s.SealName === '品质部门章-腾佳')
        if (defaultSeal) {
            selectedSealId.value = defaultSeal.ID
        } else {
            selectedSealId.value = availableSeals.value[0].ID
        }
        
        // Default position: Bottom right
        sealPosition.value = { x: 650, y: 950 }
    }
    
  } catch (error) {
    console.error('Fetch report detail error:', error)
  } finally {
    loading.value = false
  }
}

const handleSealChange = (val) => {
    // Keep position
}

const updateSealPosition = (pos) => {
    sealPosition.value = pos
}

const removeSeal = () => {
    selectedSealId.value = null
}

const handlePrint = () => {
  // 设置页面标题为：报告编号-材料名称 采购单号
  const originalTitle = document.title
  if (reportData.value) {
      let title = reportData.value.ReportNo || '来料检验报告'
      if (reportData.value.ProductName) {
          title += '-' + reportData.value.ProductName
      }
      if (reportData.value.PONumber) {
          title += ' ' + reportData.value.PONumber
      }
      document.title = title
  }

  window.print()

  // 恢复标题 (虽然后续页面可能关闭或不再重要，但保持整洁)
  document.title = originalTitle
}

const handleClose = () => {
  window.close()
}
</script>

<style scoped>
.print-preview-page {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.seal-selector {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    background: white;
    padding: 8px 15px;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
}

.seal-selector .label {
    margin-right: 8px;
    font-size: 14px;
    color: #606266;
}

.seal-size-control {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-left: 10px;
    font-size: 14px;
    color: #606266;
}

.seal-size-control .size-label {
    margin-right: 5px;
}

.seal-size-control .size-sep {
    margin: 0 5px;
    color: #909399;
}

.seal-size-control .size-unit {
    margin-left: 5px;
    color: #909399;
}

.close-icon-wrapper {
    position: absolute;
    /* Position relative to the page container, or we can make it fixed if desired */
    /* Since we want it 'outside top right of the report', let's use absolute relative to the flex container */
    /* The report is 210mm wide. Let's position it carefully. */
    /* Easier approach: absolute top right of the viewport or container */
    top: 20px;
    right: calc(50% - 105mm - 50px); /* 210mm/2 = 105mm. 50px gap */
    cursor: pointer;
    transition: transform 0.3s;
    z-index: 1000;
}

.close-icon-wrapper:hover {
    transform: scale(1.2);
}

.print-btn-wrapper {
    position: fixed;
    top: 50%;
    left: calc(50% + 105mm + 20px);
    transform: translateY(-50%);
    z-index: 1000;
}

.print-float-btn {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Fallback for smaller screens where the close icon calculation might go off-screen */
@media screen and (max-width: 1200px) {
    .close-icon-wrapper {
        right: 20px;
    }
    .print-btn-wrapper {
        left: auto;
        right: 20px;
    }
}

.preview-content {
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
  /* Make sure content is centered */
  position: relative;
}

.error-msg {
  padding: 40px;
  color: #909399;
}

@media print {
  .print-preview-page {
    padding: 0;
    background: white;
    display: block; /* 恢复默认流布局 */
  }
  .close-icon-wrapper,
  .print-btn-wrapper,
  .seal-selector {
    display: none !important;
  }

  .preview-content {
    box-shadow: none;
    margin: 0;
  }
  /* 确保内容可见 */
  :deep(.print-container) {
    display: block !important;
    position: static !important; /* 不再绝对定位，而是流式 */
    margin: 0 !important; /* 避免居中 margin 影响打印 */
    box-shadow: none !important;
  }
}

.seal-option-item {
    height: 50px; /* Increase height for image */
    line-height: 50px;
}

.seal-option-content {
    display: flex;
    align-items: center;
    width: 100%;
}

.seal-thumb {
    width: 40px;
    height: 40px;
    object-fit: contain;
    margin-right: 10px;
    background: #f5f7fa;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
}

.seal-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>

<style>
/* Global styles for the seal selector dropdown */
.seal-select-popper .el-select-dropdown__item {
    height: auto !important;
    padding: 5px 20px;
}
</style>
