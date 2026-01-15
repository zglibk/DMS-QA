<template>
    <div v-loading="loading" style="height: 100vh; width: 100vw; overflow: hidden; position: relative; background-color: #525659; display: flex; flex-direction: column;">
        
        <!-- Toolbar -->
        <div class="print-toolbar no-print" v-if="!loading && report">
            <div class="toolbar-left">
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
            
            <div class="toolbar-right">
                <el-button type="primary" :icon="Printer" @click="handlePrint">打印</el-button>
                <el-button :icon="CircleCloseFilled" @click="handleClose">关闭</el-button>
            </div>
        </div>

        <template v-if="report">
            <div class="preview-container">
                <ReportPreview 
                    :report="report" 
                    :items="items" 
                    :instruments="instruments" 
                    @close="handleClose" 
                    ref="reportPreviewRef"
                    class="hide-internal-actions" 
                >
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
                </ReportPreview>
            </div>
        </template>
        
        <div v-else-if="!loading" class="error-msg">加载失败或报告不存在</div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getReport, getInstruments } from '@/api/performance'
import ReportPreview from './ReportPreview.vue'
import DraggableSeal from '@/components/DraggableSeal.vue'
import { getElectronicSeals } from '@/api/system'
import { CircleCloseFilled, Printer, Lock, Unlock } from '@element-plus/icons-vue'

const route = useRoute()
const loading = ref(true)
const report = ref(null)
const items = ref([])
const instruments = ref([])
const availableSeals = ref([])
const selectedSealId = ref(null)
const sealPosition = ref({ x: 0, y: 0 })
const reportPreviewRef = ref(null)

const sealWidth = ref(3.5)
const sealHeight = ref(3.5)
const lockAspectRatio = ref(true)
const sealImageUrl = ref('')

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

onMounted(async () => {
    const id = route.params.id
    if (!id) {
        loading.value = false
        return
    }
    
    try {
        const [reportRes, instRes, sealsRes] = await Promise.all([
            getReport(id),
            getInstruments(),
            getElectronicSeals({ forPrint: true })
        ])
        
        report.value = reportRes.data
        items.value = reportRes.data.items || []
        instruments.value = instRes.data
        
        // Handle seals data format
        let sealsData = []
        if (Array.isArray(sealsRes)) {
            sealsData = sealsRes
        } else if (sealsRes && Array.isArray(sealsRes.data)) {
            sealsData = sealsRes.data
        } else if (sealsRes && Array.isArray(sealsRes.recordset)) {
            sealsData = sealsRes.recordset
        }
        
        availableSeals.value = sealsData
        
        // Auto-select "品质部门章-腾佳"
        const defaultSeal = availableSeals.value.find(s => s.SealName === '品质部门章-腾佳')
        if (defaultSeal) {
            selectedSealId.value = defaultSeal.ID
            sealPosition.value = { x: 600, y: 900 }
        } else if (availableSeals.value.length > 0) {
             selectedSealId.value = availableSeals.value[0].ID
             sealPosition.value = { x: 600, y: 900 }
        }
        
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
})

const handleSealChange = (val) => {
    if (val) {
        if (sealPosition.value.x === 0) {
             sealPosition.value = { x: 600, y: 900 }
        }
    }
}

const updateSealPosition = (pos) => {
    sealPosition.value = pos
}

const removeSeal = () => {
    selectedSealId.value = null
}

const handleClose = () => {
    window.close()
}

const handlePrint = () => {
    window.print()
}
</script>

<style scoped>
.error-msg {
    text-align: center;
    padding-top: 50px;
    color: #909399;
}

.print-toolbar {
    background: white;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
    z-index: 2000;
    flex-shrink: 0;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 15px;
}

.seal-size-control {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-left: 10px;
    font-size: 14px;
    color: #606266;
}

.preview-container {
    flex: 1;
    overflow: hidden; /* Let ReportPreview handle scrolling */
    display: flex;
    flex-direction: column;
}

/* Ensure ReportPreview fills the space */
:deep(.report-preview) {
    height: 100%;
}

.label {
    font-size: 14px;
    color: #606266;
}

.size-label {
    margin-right: 5px;
}

.size-sep {
    margin: 0 5px;
    color: #909399;
}

.size-unit {
    margin-left: 5px;
    color: #909399;
}

/* Hide internal actions of ReportPreview */
:deep(.hide-internal-actions .print-actions) {
    display: none !important;
}

@media print {
    .print-toolbar {
        display: none !important;
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
