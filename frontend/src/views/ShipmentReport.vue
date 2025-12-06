<template>
  <AppLayout>
    <ContentWrapper>
      <div class="shipment-report-page">
        <!-- 页面标题 -->
        <div class="page-header">
          <div class="header-content">
            <div class="title-section">
              <el-icon class="header-icon"><Box /></el-icon>
              <h1>出货报告</h1>
            </div>
            <p class="subtitle">查询工单物料信息及供应商材质信息</p>
          </div>
        </div>

        <!-- 搜索区域 -->
        <div class="search-section">
          <el-card shadow="hover" class="search-card">
            <template #header>
              <div class="card-header">
                <el-icon><Search /></el-icon>
                <span>查询条件</span>
              </div>
            </template>
            
            <el-form :model="searchForm" label-width="120px" class="search-form">
              <el-row :gutter="20">
                <el-col :xs="24" :sm="12" :md="8">
                  <el-form-item label="生产施工单号">
                    <el-input 
                      v-model="searchForm.pNum" 
                      placeholder="请输入工单号，如 GD25080001"
                      clearable
                      @keyup.enter="handleSearch"
                    >
                      <template #prefix>
                        <el-icon><Document /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12" :md="8">
                  <el-form-item label="物料编号">
                    <el-input 
                      v-model="searchForm.materialId" 
                      placeholder="请输入物料编码"
                      clearable
                      @keyup.enter="handleSearch"
                    >
                      <template #prefix>
                        <el-icon><Collection /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12" :md="8">
                  <el-form-item label="物料名称">
                    <el-input 
                      v-model="searchForm.materialName" 
                      placeholder="请输入物料名称关键字"
                      clearable
                      @keyup.enter="handleSearch"
                    >
                      <template #prefix>
                        <el-icon><Goods /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-row :gutter="20">
                <el-col :xs="24" :sm="12" :md="8">
                  <el-form-item label="开始时间">
                    <el-date-picker
                      v-model="searchForm.startDate"
                      type="datetime"
                      placeholder="选择开始时间"
                      format="YYYY-MM-DD HH:mm:ss"
                      value-format="YYYY-MM-DD HH:mm:ss"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12" :md="8">
                  <el-form-item label="结束时间">
                    <el-date-picker
                      v-model="searchForm.endDate"
                      type="datetime"
                      placeholder="选择结束时间"
                      format="YYYY-MM-DD HH:mm:ss"
                      value-format="YYYY-MM-DD HH:mm:ss"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12" :md="8">
                  <el-form-item label=" ">
                    <div class="btn-group">
                      <el-button type="primary" @click="handleSearch" :loading="loading">
                        <el-icon><Search /></el-icon>
                        查询
                      </el-button>
                      <el-button @click="handleReset">
                        <el-icon><Refresh /></el-icon>
                        重置
                      </el-button>
                    </div>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </el-card>
        </div>

        <!-- 查询结果区域 -->
        <div class="result-section" v-if="hasSearched">
          <!-- 工单信息卡片 -->
          <el-card v-if="result.workOrderInfo" shadow="hover" class="result-card work-order-card">
            <template #header>
              <div class="card-header">
                <el-icon><Tickets /></el-icon>
                <span>工单信息</span>
                <el-tag type="success" v-if="result.workOrderInfo.StatusDes">
                  {{ result.workOrderInfo.StatusDes }}
                </el-tag>
              </div>
            </template>
            
            <el-descriptions :column="3" border>
              <el-descriptions-item label="工单号">
                <el-text type="primary" tag="b">{{ result.workOrderInfo.PNum }}</el-text>
              </el-descriptions-item>
              <el-descriptions-item label="订单号">{{ result.workOrderInfo.OrderNum }}</el-descriptions-item>
              <el-descriptions-item label="客户编码">{{ result.workOrderInfo.CustomerID }}</el-descriptions-item>
              <el-descriptions-item label="产品名称" :span="2">{{ result.workOrderInfo.Product }}</el-descriptions-item>
              <el-descriptions-item label="交货日期">{{ result.workOrderInfo.DeliveryDate }}</el-descriptions-item>
              <el-descriptions-item label="业务员">{{ result.workOrderInfo.Sales }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 产品信息卡片 -->
          <el-card v-if="result.productInfo && result.productInfo.length > 0" shadow="hover" class="result-card">
            <template #header>
              <div class="card-header">
                <el-icon><ShoppingBag /></el-icon>
                <span>产品资料</span>
                <el-tag>{{ result.productInfo.length }} 项</el-tag>
              </div>
            </template>
            
            <el-table :data="result.productInfo" stripe border resizable class="resizable-table">
              <el-table-column prop="productId" label="产品编码" width="100" resizable show-overflow-tooltip />
              <el-table-column prop="cProductId" label="客户料号" min-width="150" resizable show-overflow-tooltip />
              <el-table-column prop="product" label="产品名称" min-width="200" resizable show-overflow-tooltip />
              <el-table-column prop="cProduct" label="工厂订单号" min-width="150" resizable show-overflow-tooltip />
              <el-table-column prop="scale" label="规格" width="120" resizable show-overflow-tooltip />
              <el-table-column prop="orderCount" label="订单数" width="100" align="right" resizable show-overflow-tooltip />
              <el-table-column prop="pCount" label="成品数量" width="100" align="right" resizable show-overflow-tooltip />
            </el-table>
          </el-card>

          <!-- 物料列表卡片 -->
          <el-card v-if="result.materialList && result.materialList.length > 0" shadow="hover" class="result-card material-card">
            <template #header>
              <div class="card-header">
                <el-icon><Files /></el-icon>
                <span>物料信息</span>
                <el-tag type="info">{{ result.materialList.length }} 项</el-tag>
              </div>
            </template>
            
            <el-table :data="result.materialList" stripe border resizable class="resizable-table">
              <el-table-column prop="type" label="类型" width="80" resizable show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tag :type="row.type === '纸张' ? 'primary' : 'warning'" size="small">
                    {{ row.type }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="物料名称" min-width="200" resizable show-overflow-tooltip />
              <el-table-column prop="brand" label="品牌/供应商" width="150" resizable show-overflow-tooltip>
                <template #default="{ row }">
                  <el-text v-if="row.brand" type="success" tag="b">{{ row.brand }}</el-text>
                  <el-text v-else type="info">-</el-text>
                </template>
              </el-table-column>
              <el-table-column prop="spec" label="规格" width="120" resizable show-overflow-tooltip />
              <el-table-column label="数量" width="120" align="right" resizable show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.srcCount || row.count || '-' }}
                  <span v-if="row.unit" class="unit">{{ row.unit }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="desScale" label="开纸规格" width="120" resizable show-overflow-tooltip />
            </el-table>
          </el-card>

          <!-- 物料入库明细卡片（包含供应商信息） -->
          <el-card v-if="result.materialInList && result.materialInList.length > 0" shadow="hover" class="result-card supplier-card">
            <template #header>
              <div class="card-header">
                <el-icon><OfficeBuilding /></el-icon>
                <span>物料入库明细（供应商信息）</span>
                <el-tag type="success">{{ result.materialInList.length }} 条</el-tag>
              </div>
            </template>
            
            <el-table :data="result.materialInList" stripe border resizable class="resizable-table" max-height="400">
              <el-table-column prop="inId" label="入库单号" width="120" fixed resizable show-overflow-tooltip />
              <el-table-column prop="purId" label="采购单号" width="120" resizable show-overflow-tooltip />
              <el-table-column prop="inDate" label="入库日期" width="160" resizable show-overflow-tooltip />
              <el-table-column prop="supply" label="供应商" min-width="180" resizable show-overflow-tooltip>
                <template #default="{ row }">
                  <div class="supplier-cell">
                    <el-icon><Shop /></el-icon>
                    <el-text type="primary" tag="b">{{ row.supply }}</el-text>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="materialId" label="物料编码" width="200" resizable show-overflow-tooltip />
              <el-table-column prop="materialName" label="物料名称" min-width="200" resizable show-overflow-tooltip />
              <el-table-column prop="brand" label="品牌" width="100" resizable show-overflow-tooltip />
              <el-table-column prop="spec" label="规格" width="100" resizable show-overflow-tooltip />
              <el-table-column prop="materialType" label="类型" width="100" resizable show-overflow-tooltip />
              <el-table-column prop="materialSubType" label="子类型" width="100" resizable show-overflow-tooltip />
              <el-table-column prop="count" label="入库数量" width="100" align="right" resizable show-overflow-tooltip />
              <el-table-column prop="dlyNum" label="送货单号" width="150" resizable show-overflow-tooltip />
              <el-table-column prop="deliveryDate" label="计划交货期" width="120" resizable show-overflow-tooltip />
            </el-table>
          </el-card>

          <!-- 无数据提示 -->
          <el-empty 
            v-if="!result.workOrderInfo && (!result.materialList || result.materialList.length === 0) && (!result.materialInList || result.materialInList.length === 0)"
            description="未查询到相关数据，请调整查询条件后重试"
          >
            <el-button type="primary" @click="handleReset">重置条件</el-button>
          </el-empty>
        </div>

        <!-- 初始提示 -->
        <div class="initial-hint" v-else>
          <el-empty description="请输入查询条件开始查询">
            <template #image>
              <el-icon :size="80" color="#909399"><Search /></el-icon>
            </template>
            <div class="hint-text">
              <p>支持以下查询方式：</p>
              <ul>
                <li>输入<strong>生产施工单号</strong>查询工单详细物料信息</li>
                <li>输入<strong>物料编号</strong>或<strong>物料名称</strong>查询物料及供应商信息</li>
                <li>可组合多个条件进行精确查询</li>
              </ul>
            </div>
          </el-empty>
        </div>
      </div>
    </ContentWrapper>
  </AppLayout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search, Refresh, Document, Collection, Goods, Box,
  Tickets, Files, OfficeBuilding, Shop, ShoppingBag
} from '@element-plus/icons-vue'
import AppLayout from '@/components/common/AppLayout.vue'
import ContentWrapper from '@/components/common/ContentWrapper.vue'
import api from '@/utils/api'

// 搜索表单
const searchForm = reactive({
  pNum: '',
  materialId: '',
  materialName: '',
  startDate: '',
  endDate: ''
})

// 加载状态
const loading = ref(false)

// 是否已搜索
const hasSearched = ref(false)

// 查询结果
const result = reactive({
  workOrderInfo: null,
  materialList: [],
  materialInList: [],
  productInfo: null
})

/**
 * 执行搜索
 */
async function handleSearch() {
  // 验证至少输入一个条件
  if (!searchForm.pNum && !searchForm.materialId && !searchForm.materialName) {
    ElMessage.warning('请至少输入一个查询条件')
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    const params = {}
    
    if (searchForm.pNum) {
      params.pNum = searchForm.pNum.trim()
    }
    if (searchForm.materialId) {
      params.materialId = searchForm.materialId.trim()
    }
    if (searchForm.materialName) {
      params.materialName = searchForm.materialName.trim()
    }
    
    // ERP接口要求必须传递日期参数，设置默认值（最近30天）
    if (searchForm.startDate) {
      params.StartDate = searchForm.startDate
    } else {
      // 默认开始时间：30天前
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      params.StartDate = formatDateTime(startDate)
    }
    
    if (searchForm.endDate) {
      params.EndDate = searchForm.endDate
    } else {
      // 默认结束时间：当前时间
      params.EndDate = formatDateTime(new Date())
    }

    console.log('出货报告查询参数:', params)

    const response = await api.get('/erp/shipment-report', { params })
    
    // axios响应在response.data中，但api.js可能有拦截器处理
    // 需要兼容多种情况
    let res = response
    
    // 如果response有data属性且data中有workOrderInfo等字段，说明需要解包
    if (response.data && (response.data.workOrderInfo !== undefined || response.data.materialList !== undefined)) {
      res = response.data
    }

    console.log('出货报告查询响应:', res)

    // 检查是否有code字段（标准API响应格式）
    if (res.code !== undefined) {
      // 标准格式: { code: 0, data: {...} }
      if (res.code === 0 && res.data) {
        result.workOrderInfo = res.data.workOrderInfo
        result.materialList = res.data.materialList || []
        result.materialInList = res.data.materialInList || []
        result.productInfo = res.data.productInfo || []
      } else {
        ElMessage.error(res.message || '查询失败')
        return
      }
    } else if (res.workOrderInfo !== undefined || res.materialList !== undefined) {
      // 直接数据格式: { workOrderInfo: {...}, materialList: [...] }
      result.workOrderInfo = res.workOrderInfo
      result.materialList = res.materialList || []
      result.materialInList = res.materialInList || []
      result.productInfo = res.productInfo || []
    } else {
      ElMessage.error('响应数据格式异常')
      return
    }

    // 如果有物料信息，过滤物料入库明细只显示相关物料
    if (result.materialList.length > 0 && result.materialInList.length > 0) {
      // 提取物料信息中的物料名称关键字（用于匹配）
      const materialNames = result.materialList.map(m => m.name).filter(Boolean)
      const materialBrands = result.materialList.map(m => m.brand).filter(Boolean)
      
      // 过滤入库明细，只保留与物料信息相关的记录
      result.materialInList = result.materialInList.filter(inItem => {
        // 匹配物料名称
        const nameMatch = materialNames.some(name => {
          if (!name || !inItem.materialName) return false
          // 模糊匹配：物料名称包含或被包含
          return inItem.materialName.includes(name) || name.includes(inItem.materialName)
        })
        
        // 匹配品牌/供应商
        const brandMatch = materialBrands.some(brand => {
          if (!brand || !inItem.supply) return false
          return inItem.supply.includes(brand) || brand.includes(inItem.supply)
        })
        
        return nameMatch || brandMatch
      })
    }

    // 统计查询结果
    const totalItems = (result.workOrderInfo ? 1 : 0) + 
                      result.materialList.length + 
                      result.materialInList.length
    
    if (totalItems > 0) {
      ElMessage.success(`查询成功，共找到 ${totalItems} 条相关数据`)
    } else {
      ElMessage.info('未找到匹配的数据')
    }
  } catch (error) {
    console.error('查询出货报告失败:', error)
    // 显示更详细的错误信息
    const errMsg = error.response?.data?.message || error.message || '网络错误'
    ElMessage.error('查询失败: ' + errMsg)
  } finally {
    loading.value = false
  }
}

/**
 * 格式化日期时间为 yyyy-MM-dd HH:mm:ss
 */
function formatDateTime(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 重置表单
 */
function handleReset() {
  searchForm.pNum = ''
  searchForm.materialId = ''
  searchForm.materialName = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  
  // 清空结果
  result.workOrderInfo = null
  result.materialList = []
  result.materialInList = []
  result.productInfo = null
  hasSearched.value = false
}
</script>

<style scoped>
.shipment-report-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  margin-bottom: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  color: white;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 36px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
  margin-left: 60px;
}

/* 搜索区域 */
.search-section {
  margin-bottom: 24px;
}

.search-card {
  border-radius: 12px;
}

.search-card :deep(.el-card__header) {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #334155;
}

.card-header .el-tag {
  margin-left: auto;
}

.search-form {
  padding-top: 8px;
}

.btn-group {
  display: flex;
  gap: 12px;
}

/* 结果区域 */
.result-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-card {
  border-radius: 12px;
}

.result-card :deep(.el-card__header) {
  padding: 16px 20px;
}

/* 工单信息卡片 */
.work-order-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
}

/* 物料卡片 */
.material-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

/* 供应商卡片 */
.supplier-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.supplier-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.supplier-cell .el-icon {
  color: #10b981;
}

.unit {
  color: #94a3b8;
  font-size: 12px;
  margin-left: 4px;
}

/* 初始提示 */
.initial-hint {
  padding: 60px 20px;
}

.hint-text {
  text-align: left;
  color: #64748b;
  margin-top: 20px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.hint-text p {
  margin: 0 0 12px 0;
  font-weight: 500;
  color: #334155;
}

.hint-text ul {
  margin: 0;
  padding-left: 20px;
}

.hint-text li {
  margin-bottom: 8px;
  line-height: 1.6;
}

.hint-text strong {
  color: #3b82f6;
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background-color: #f8fafc !important;
  color: #475569;
  font-weight: 600;
}

/* 可调整列宽的表格样式 */
.resizable-table {
  width: 100%;
}

/* 表格单元格禁止换行 */
:deep(.resizable-table .el-table__cell) {
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.resizable-table .cell) {
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* 表头可拖拽调整列宽样式 */
:deep(.resizable-table .el-table__header th) {
  cursor: col-resize;
}

:deep(.resizable-table .el-table__header th .cell) {
  white-space: nowrap !important;
}

/* 确保供应商单元格内容不换行 */
.supplier-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.supplier-cell .el-icon {
  color: #10b981;
  flex-shrink: 0;
}

.supplier-cell .el-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-descriptions) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-descriptions__label) {
  background-color: #f8fafc !important;
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 768px) {
  .shipment-report-page {
    padding: 12px;
  }
  
  .page-header {
    padding: 20px;
  }
  
  .page-header h1 {
    font-size: 22px;
  }
  
  .subtitle {
    margin-left: 0;
    margin-top: 8px;
  }
  
  .btn-group {
    flex-direction: column;
  }
  
  .btn-group .el-button {
    width: 100%;
  }
}
</style>
