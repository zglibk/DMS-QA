<template>
  <div class="print-container">
    <!-- 工具栏 -->
    <div class="print-toolbar no-print">
      <div class="toolbar-left">
        <span class="label">电子签章：</span>
        <el-select 
          v-model="selectedSealId" 
          placeholder="选择电子印章（可选）" 
          clearable
          style="width: 200px;"
          :loading="sealListLoading"
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
            :min="1" 
            :max="8" 
            :step="0.1"
            :precision="1"
            size="small"
            controls-position="right"
            style="width: 70px;"
            @change="onWidthChange"
          />
          <span class="size-sep">×</span>
          <el-input-number 
            v-model="sealHeight" 
            :min="1" 
            :max="8" 
            :step="0.1"
            :precision="1"
            size="small"
            controls-position="right"
            style="width: 70px;"
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
        <el-button type="primary" @click="handlePrint" size="small" :disabled="!imagesLoaded">
          <el-icon><Printer /></el-icon> {{ imagesLoaded ? '打印' : '加载中...' }}
        </el-button>
        <el-button @click="handleClose" size="small">
          <el-icon><Close /></el-icon> 关闭
        </el-button>
      </div>
    </div>
    
    <div class="print-content" id="printArea">
      <!-- 顶部 Header -->
      <div class="report-header">
        <div class="header-left">
          <img v-if="logoUrl" :src="logoUrl" class="logo-img" alt="Logo" @error="handleLogoError" />
          <div v-else class="logo-placeholder">LOGO</div>
        </div>
        <div class="header-center">
          <div class="company-name">珠海腾佳印刷有限公司</div>
          <h1 class="report-title">物料异常反馈单</h1>
        </div>
        <div class="header-right">
          <!-- 留空以保持标题居中 -->
        </div>
      </div>
      
      <div class="sub-header" style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div class="supplier-info">To: <span class="no-underline">{{ data.SupplierName }}</span></div>
        <div class="report-no">报告编号: <span class="highlight-red">{{ data.ComplaintNo }}</span></div>
      </div>
      
      <table class="report-table">
        <colgroup>
          <col style="width: 11%" />
          <col style="width: 14%" />
          <col style="width: 11%" />
          <col style="width: 14%" />
          <col style="width: 11%" />
          <col style="width: 14%" />
          <col style="width: 11%" />
          <col style="width: 14%" />
        </colgroup>
        <tbody>
          <!-- 第一行 -->
          <tr>
            <td class="label">物料名称</td>
            <td class="value" colspan="3">{{ data.MaterialName }}</td>
            <td class="label">物料编号</td>
            <td class="value" colspan="3">{{ data.MaterialCode }}</td>
          </tr>
          
          <!-- 第二行 -->
          <tr>
            <td class="label">材料规格</td>
            <td class="value">{{ data.MaterialSpecification }}</td>
            <td class="label">采购单号</td>
            <td class="value">{{ data.PurchaseOrderNo }}</td>
            <td class="label">来料日期</td>
            <td class="value" colspan="3">{{ formatDate(data.IncomingDate) }}</td>
          </tr>
          
          <!-- 第三行 -->
          <tr>
            <td class="label">物料数量</td>
            <td class="value">{{ data.BatchQuantity }}</td>
            <td class="label">检验日期</td>
            <td class="value">{{ formatDate(data.InspectionDate) }}</td>
            <td class="label">投诉日期</td>
            <td class="value" colspan="3">{{ formatDate(data.ComplaintDate) }}</td>
          </tr>
          
          <!-- 第四行 -->
          <tr>
            <td class="label">订单批次</td>
            <td class="value">{{ data.WorkOrderNo }}</td>
            <td class="label">抽检数量</td>
            <td class="value">{{ data.SampleQuantity }}</td>
            <td class="label">不合格数</td>
            <td class="value">{{ data.DefectQuantity }}</td>
            <td class="label">不良比例</td>
            <td class="value">{{ calculateDefectRate(data) }}</td>
          </tr>
          
          <!-- 第五行：不合格描述 -->
          <tr style="height: 70px;">
            <td class="label">不合格描述</td>
            <td class="value left-align" colspan="7">{{ data.Description }}</td>
          </tr>
          
          <!-- 第六行：不合格类别 -->
          <tr>
            <td class="label">不合格类别</td>
            <td class="value left-align" colspan="7">
              <div class="defect-categories">
                <span v-for="cat in defectCategories" :key="cat" class="category-item">
                  <span class="checkbox-icon">{{ data.DefectCategory === cat ? '☑' : '☐' }}</span>
                  {{ cat }}
                </span>
              </div>
            </td>
          </tr>
          
          <!-- 第七行：附图 -->
          <tr>
            <td class="label">附图</td>
            <td class="value image-cell" colspan="7">
              <div v-if="imageUrl && !imageError" class="image-container">
                <img 
                  :src="imageUrl" 
                  alt="异常图片" 
                  @load="handleImageLoad"
                  @error="handleImageError"
                />
              </div>
              <div v-else-if="imageLoading" class="image-container loading">
                <span>图片加载中...</span>
              </div>
              <div v-else class="image-container no-image">{{ imageError ? '图片加载失败' : '无附图' }}</div>
            </td>
          </tr>
          
          <!-- 第八行：判定与人员 -->
          <tr>
            <td class="label">IQC判定</td>
            <td class="value left-align" colspan="2" style="border-right: none;">
              <span class="checkbox-wrapper">
                <span class="checkbox-icon">{{ data.IQCResult === '合格' ? '☑' : '☐' }}</span> 合格
              </span>
              <span class="checkbox-wrapper" style="margin-left: 15px;">
                <span class="checkbox-icon">{{ data.IQCResult !== '合格' ? '☑' : '☐' }}</span> 不合格
              </span>
            </td>
            <td class="value left-align" colspan="3" style="padding-left: 10px; border-left: none; border-right: none;">
              <strong>检验员:</strong> {{ data.Inspector }}
            </td>
            <td class="label" style="text-align: right; padding-right: 5px; border-left: none; border-right: none; background-color: transparent;">主管审核:</td>
            <td class="value" style="border-left: none;">
              {{ data.AuditByName || '' }}
            </td>
          </tr>
          
          <!-- 第九行：改善要求 -->
          <tr>
            <td class="label">供应商<br>改善要求</td>
            <td class="value left-align content-text" colspan="7">
              1、要求责任厂家收到反馈后，2个工作日内回复问题的原因分析、整改方案措施；<br>
              2、如未按时回复或回复敷衍的，我们将按质保协议或者产品质量法进行考核索赔 500元/单；<br>
              3、如后续出现同类问题，我们将按质保协议或者产品质量法进行考核索赔。
            </td>
          </tr>
          
          <!-- 分隔行 -->
          <tr>
            <td class="section-header" colspan="8">以下由供应商填写</td>
          </tr>
          
          <!-- 第十行：原因分析 -->
          <tr>
            <td class="value left-align" colspan="6" rowspan="3" style="vertical-align: top; height: 150px;">
              <div class="content-text">
                <strong>不良原因分析：</strong><br>
                1、根本原因：<br><br><br><br>
                2、流出原因：
              </div>
            </td>
            <td class="value left-align" colspan="2" style="vertical-align: top;">
              <div class="content-text">
                <strong>不良原因确定：</strong>
              </div>
            </td>
          </tr>
          
          <!-- 第十一行：分析人员 -->
          <tr style="height: 30px;">
            <td class="label left-align">分析人员:</td>
            <td class="value"></td>
          </tr>
          <tr style="height: 30px;">
            <td class="label left-align">日 期:</td>
            <td class="value"></td>
          </tr>
          
          <!-- 第十二行：整改措施 -->
          <tr style="height: 150px;">
            <td class="value left-align" colspan="6" style="vertical-align: top;">
              <div class="content-text">
                <strong>整改措施及预防对策：</strong><br>
                纠正措施：<br><br><br><br>
                预防措施：
              </div>
            </td>
            <td class="value left-align" colspan="2" style="vertical-align: top;">
              <div class="content-text" style="padding-top: 80px;">
                <strong>责任人:</strong><br><br>
                <strong>日 期:</strong>
              </div>
            </td>
          </tr>
          
          <!-- 第十三行：效果评估 -->
          <tr style="height: 60px;">
            <td class="value left-align" colspan="6" style="vertical-align: top;">
              <div class="content-text">
                <strong>问题改善效果评估：</strong>
              </div>
            </td>
            <td class="value left-align" colspan="2" style="vertical-align: top;">
              <div class="content-text">
                <strong>确认人:</strong>
              </div>
            </td>
          </tr>
          
        </tbody>
      </table>
      
      <div class="footer-info">
        表单编号: F-5113 版次: A/0
      </div>
      
      <!-- 浮动电子印章 -->
      <DraggableSeal 
        v-if="selectedSealId && sealImageUrl"
        :sealUrl="sealImageUrl"
        :initialX="sealPosition.x"
        :initialY="sealPosition.y"
        :width="pixelWidth"
        :height="pixelHeight"
        @update:position="updateSealPosition"
        @remove="selectedSealId = null"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { ElMessage, ElLoading } from 'element-plus'
import { Printer, Close, Lock, Unlock } from '@element-plus/icons-vue'
import { useSiteConfig } from '@/composables/useSiteConfig'
import DraggableSeal from '@/components/DraggableSeal.vue'

const route = useRoute()
const data = ref({})
const logoUrl = ref('')
const imageUrl = ref('')
const imageLoading = ref(false)
const imageError = ref(false)
const imageLoaded = ref(false)
const logoLoaded = ref(true) // 默认true，因为logo可能没有
const { siteConfig, loadSiteConfig } = useSiteConfig()
const defectCategories = ['外观', '卫生', '规格尺寸', '物理性能', '环保要求', '虫害防控', '其它']

// 电子印章相关
const sealListLoading = ref(false)
const availableSeals = ref([])
const selectedSealId = ref(null)
const sealImageUrl = ref('')
const sealWidth = ref(3.5)  // 默认宽度 cm
const sealHeight = ref(3.5) // 默认高度 cm
const lockAspectRatio = ref(true)
const sealPosition = ref({ x: 750, y: 400 })

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

const updateSealPosition = (pos) => {
    sealPosition.value = pos
}

// 获取适配的印章URL
const getAdaptedSealUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('blob:') || imagePath.startsWith('data:')) return imagePath
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  
  // 根据当前页面的hostname判断环境
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  
  // 构建图片URL - 印章存储路径是 /uploads/seals/
  let url
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 开发环境：使用Vite代理
    // /uploads/seals/ -> /files/seals/
    if (imagePath.startsWith('/uploads/')) {
      url = imagePath.replace('/uploads/', '/files/')
    } else if (imagePath.startsWith('/files/')) {
      url = imagePath
    } else {
      url = `/files/seals/${imagePath.replace(/^\/+/, '')}`
    }
  } else {
    // 生产环境：使用8080端口的文件服务器
    let cleanPath = imagePath
    if (cleanPath.startsWith('/uploads/')) {
      cleanPath = cleanPath.replace('/uploads/', '/files/')
    } else if (!cleanPath.startsWith('/files/')) {
      cleanPath = `/files/seals/${cleanPath.replace(/^\/+/, '')}`
    }
    url = `${protocol}//${hostname}:8080${cleanPath}`
  }
  
  return url
}

// 加载印章列表
const loadSealList = async () => {
  sealListLoading.value = true
  try {
    // forPrint=true 跳过权限限制，获取所有启用的印章
    const response = await api.get('/electronic-seals', { params: { forPrint: 'true' } })
    let seals = []
    if (Array.isArray(response.data)) {
      seals = response.data
    } else if (response.data?.code === 0 && Array.isArray(response.data.data)) {
      seals = response.data.data
    }
    // 后端已经过滤了IsActive=1，这里不需要再过滤
    availableSeals.value = seals
    
    console.log('加载印章列表:', seals.length, '条', seals.map(s => s.SealName))
    
    // 默认选择印章：优先使用数据库标记的默认印章
    const defaultSeal = availableSeals.value.find(s => s.IsDefault)
    if (defaultSeal) {
      selectedSealId.value = defaultSeal.ID
    } else {
      // 如果没有标记默认，则选择"品质部门章-腾佳"或第一个
      const fallbackSeal = availableSeals.value.find(s => s.SealName === '品质部门章-腾佳')
      if (fallbackSeal) {
        selectedSealId.value = fallbackSeal.ID
      } else if (availableSeals.value.length > 0) {
        selectedSealId.value = availableSeals.value[0].ID
      }
    }
  } catch (err) {
    console.error('加载印章列表失败:', err)
  } finally {
    sealListLoading.value = false
  }
}

// 监听印章选择变化
watch(selectedSealId, async (newId) => {
  if (newId) {
    const seal = availableSeals.value.find(s => s.ID === newId)
    if (seal && seal.ImageUrl) {
      const url = getAdaptedSealUrl(seal.ImageUrl)
      // 预加载印章图片转为base64，确保打印时能显示
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

// 是否所有图片都加载完成
const imagesLoaded = computed(() => {
  // 如果没有图片，或者图片加载完成/失败，都算完成
  const mainImageReady = !imageUrl.value || imageLoaded.value || imageError.value
  return mainImageReady && logoLoaded.value
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 计算不良比例
const calculateDefectRate = (row) => {
  if (row.SampleQuantity && row.DefectQuantity) {
    const rate = (row.DefectQuantity / row.SampleQuantity) * 100
    return rate.toFixed(2) + '%'
  }
  return ''
}

// 预加载图片并转换为 base64（解决跨域和打印问题）
const preloadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    // 如果已经是 base64，直接返回
    if (url.startsWith('data:')) {
      resolve(url)
      return
    }
    
    const img = new Image()
    // 注意：不设置crossOrigin，避免CORS问题
    // 如果需要转canvas，可能会遇到"tainted canvas"问题，但对于打印预览影响不大
    
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
        // canvas被污染（tainted），无法转base64，直接使用原始URL
        console.warn('图片转base64失败（canvas tainted），使用原始URL')
        resolve(url)
      }
    }
    
    img.onerror = () => {
      console.warn('图片预加载失败:', url)
      reject(new Error('图片加载失败'))
    }
    
    // 添加时间戳避免缓存问题
    const separator = url.includes('?') ? '&' : '?'
    img.src = url + separator + '_t=' + Date.now()
  })
}

// 处理图片路径
const processImageUrl = (path) => {
  if (!path) return ''
  
  // 已经是完整URL或base64
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  
  // 根据当前页面的hostname判断环境
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  
  // 构建图片URL
  let url
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 开发环境：使用Vite代理，确保路径以/files/开头
    url = path.startsWith('/files/') ? path : `/files/${path.replace(/^\/+/, '')}`
  } else {
    // 生产环境：使用Nginx文件服务器，文件访问需要通过8080端口
    const cleanPath = path.startsWith('/files/') ? path : `/files/${path.replace(/^\/+/, '')}`
    url = `${protocol}//${hostname}:8080${cleanPath}`
  }
  
  return url
}

const handleImageLoad = () => {
  imageLoaded.value = true
  imageLoading.value = false
}

const handleImageError = () => {
  console.error('附图加载失败:', imageUrl.value)
  imageError.value = true
  imageLoading.value = false
}

const handleLogoError = () => {
  console.warn('Logo加载失败')
  logoUrl.value = ''
}

const loadData = async () => {
  const id = route.params.id
  if (!id) return
  
  const loading = ElLoading.service({ fullscreen: true, text: '加载中...' })
  try {
    // 1. 获取投诉数据
    const response = await api.get(`/supplier-complaints/${id}`)
    if (response.data.success) {
      console.log('API Response Data:', response.data.data)
      console.log('AuditByName field:', response.data.data.AuditByName) // Debug: Check AuditByName field
      data.value = response.data.data
      
      // 处理图片
      if (data.value.AttachedImages) {
        let path = data.value.AttachedImages
        console.log('原始附图路径:', path)
        if (path.includes(',')) {
          path = path.split(',')[0].trim()
        }
        
        imageLoading.value = true
        const processedUrl = processImageUrl(path)
        console.log('处理后的附图URL:', processedUrl)
        
        // 尝试预加载并转换为base64
        try {
          const base64Url = await preloadImageAsBase64(processedUrl)
          imageUrl.value = base64Url
          imageLoaded.value = true
        } catch (e) {
          // 预加载失败，使用原始URL让img标签尝试加载
          imageUrl.value = processedUrl
        }
        imageLoading.value = false
      }
    } else {
      ElMessage.error('加载数据失败')
    }
    
    // 2. 获取 Logo (从 SiteConfig)
    try {
      logoLoaded.value = false
      await loadSiteConfig()
      if (siteConfig.logoBase64Img) {
        logoUrl.value = siteConfig.logoBase64Img
      }
      logoLoaded.value = true
    } catch (e) {
      console.warn('获取Logo失败', e)
      logoLoaded.value = true
    }

    // 设置网页标题，作为打印文件名
    if (data.value) {
      const po = data.value.PurchaseOrderNo || ''
      const material = data.value.MaterialName || ''
      const defect = data.value.DefectItem || ''
      const no = data.value.ComplaintNo || ''
      
      const title = `${po} ${material}-${defect} 质量异常反馈单 ${no}`
      document.title = title
    }
    
    // 等待图片加载完成后自动打印
    waitForImagesAndPrint()
    
  } catch (error) {
    console.error(error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.close()
  }
}

// 等待图片加载完成后打印
const waitForImagesAndPrint = () => {
  const checkInterval = setInterval(() => {
    if (imagesLoaded.value) {
      clearInterval(checkInterval)
      // 额外等待100ms确保渲染完成
      setTimeout(() => {
        window.print()
      }, 100)
    }
  }, 100)
  
  // 最多等待5秒
  setTimeout(() => {
    clearInterval(checkInterval)
    if (!imagesLoaded.value) {
      console.warn('图片加载超时，仍然尝试打印')
      window.print()
    }
  }, 5000)
}

const handlePrint = () => {
  window.print()
}

const handleClose = () => {
  window.close()
}

onMounted(() => {
  loadData()
  loadSealList() // 加载印章列表
  
  // 尝试从 localStorage 获取 logo
  const storedConfig = localStorage.getItem('siteConfig')
  if (storedConfig) {
    try {
      const config = JSON.parse(storedConfig)
      if (config.logoBase64Img) {
        logoUrl.value = config.logoBase64Img
      }
    } catch (e) {}
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap');

.print-container {
  padding: 60px 20px 20px 20px; /* 顶部留空间给固定工具栏 */
  max-width: 900px; /* A4 宽度左右 */
  margin: 0 auto;
  font-family: "SimSun", "Songti SC", "Noto Serif SC", serif;
  color: #000;
  background-color: transparent; /* 明确取消背景色 */
}

.print-content {
  position: relative;
}

/* 强制覆盖全局背景色为白色 */
:global(body), :global(#app) {
  background-color: #fff !important;
}

/* 工具栏样式 - 固定定位 */
.print-toolbar.no-print {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  max-width: calc(100% - 40px);
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 1000;
  box-sizing: border-box;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.seal-size-control {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.seal-size-control .size-label {
  font-size: 12px;
  color: #606266;
}

.seal-size-control .size-sep {
  color: #909399;
  font-size: 12px;
}

.seal-size-control .size-unit {
  font-size: 12px;
  color: #909399;
}

@media print {
  .print-toolbar {
    display: none !important;
  }
  .no-print {
    display: none !important;
  }
  .print-container {
    padding: 0;
    margin: 0;
    max-width: 100%;
    width: 100%;
  }
  .print-content {
    position: relative;
  }
  @page {
    margin: 1cm;
    size: A4;
  }
  body {
    -webkit-print-color-adjust: exact;
  }
}

/* Header Styles */
.report-header {
  display: flex;
  align-items: flex-end; /* 底部对齐 */
  justify-content: space-between;
  margin-bottom: 10px;
  border-bottom: none;
  position: relative;
}

.header-left {
  width: 200px;
}

.logo-img {
  height: 50px;
  max-width: 100%;
  object-fit: contain;
}

.header-center {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.company-name {
  font-size: 12px;
  margin-bottom: 5px;
  letter-spacing: 1px;
}

.report-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  letter-spacing: 2px;
}

.header-right {
  width: 200px;
  text-align: right;
  font-size: 12px;
}

.highlight-red {
  color: #d9001b;
  font-weight: bold;
}

.sub-header {
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: bold;
}

.no-underline {
  padding: 0 5px;
  text-decoration: none;
}

/* Table Styles */
.report-table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #000; /* 外边框加粗 */
  table-layout: fixed; /* 强制固定列宽 */
}

.report-table td {
  border: 1px solid #000;
  padding: 4px 2px; /* 减小内边距以容纳更多内容 */
  font-size: 13px;
  line-height: 1.4;
  vertical-align: middle;
  word-wrap: break-word; /* 允许长文本换行 */
}

.label {
  font-weight: bold;
  text-align: center;
  background-color: transparent; /* 去掉背景色，保持简洁 */
}

.value {
  text-align: center;
}

.left-align {
  text-align: left;
}

.image-cell {
  text-align: center;
  padding: 10px;
}

.image-container {
  height: 235px; /* 固定图片区域高度 */
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.image-container img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.image-container.loading {
  color: #909399;
  font-size: 14px;
}

.image-container.no-image {
  color: #c0c4cc;
  font-size: 14px;
  border: 1px dashed #dcdfe6;
  background-color: #fafafa;
}

.section-header {
  background-color: #e0e0e0;
  text-align: center;
  font-weight: bold;
  padding: 5px;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
}

.content-text {
  font-size: 12px;
}

.no-border-top {
  border-top: none !important;
}

.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
}

.checkbox-icon {
  font-size: 16px;
  margin-right: 2px;
  line-height: 1;
}

.defect-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.category-item {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.defect-detail {
  margin-left: 2px;
  font-weight: bold;
}

.footer-info {
  margin-top: 5px;
  text-align: right;
  font-size: 12px;
}

.seal-option-item {
    height: 50px;
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
