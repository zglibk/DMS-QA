<template>
  <div class="app-container">
    <el-row :gutter="20" class="full-height">
      <!-- 左侧：查询与新增 -->
      <el-col :xs="24" :sm="24" :md="6" :lg="6" :xl="6" class="full-height-col">
        <el-card class="box-card full-height-card search-card">
          <div class="content-header">
            <span class="title">
              <el-icon class="title-icon"><Operation /></el-icon>
              异常对策管理
            </span>
          </div>
          
          <el-form :model="queryParams" label-position="top">
            <el-form-item label="关键词搜索">
              <el-input 
                v-model="queryParams.keyword" 
                placeholder="搜索流程节点/内容" 
                clearable 
                @keyup.enter="handleSearch" 
                :prefix-icon="Search"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch" style="width: 100%">
                <el-icon class="el-icon--left"><Search /></el-icon>查询
              </el-button>
            </el-form-item>
          </el-form>
          
          <el-divider />
          
          <div class="action-area">
             <el-button type="success" @click="handleAdd" style="width: 100%" v-permission="'quality:measure:add'">
                <el-icon class="el-icon--left"><Plus /></el-icon>新增对策
              </el-button>
          </div>
        </el-card>
      </el-col>
      
      <!-- 右侧：内容展示区 -->
      <el-col :xs="24" :sm="24" :md="18" :lg="18" :xl="18" class="full-height-col">
        <el-card class="box-card full-height-card content-card">
          <el-row :gutter="20" style="height: 100%" class="content-row">
            <!-- 右侧左栏：列表 -->
            <el-col :xs="24" :sm="24" :md="16" :lg="16" :xl="16" class="list-panel">
              <div class="content-header">
                <span class="title">
                  <el-icon class="title-icon"><List /></el-icon>
                  异常对策列表
                </span>
                <div>
                  <el-button link type="danger" @click="handleBatchDelete" :disabled="!selectedRows.length" v-permission="'quality:measure:batch_delete'">
                    <el-icon><Delete /></el-icon> 批量删除
                  </el-button>
                  <el-button link type="primary" @click="resetQuery">
                    <el-icon><Refresh /></el-icon> 刷新
                  </el-button>
                </div>
              </div>
              
              <el-table 
                v-loading="loading" 
                :data="pagedTableData" 
                style="width: 100%; flex: 1;" 
                stripe 
                header-cell-class-name="table-header-center"
                @selection-change="handleSelectionChange"
              >
                <el-table-column type="selection" width="55" align="center" header-align="center" />
                <el-table-column type="index" label="序号" width="60" align="center" header-align="center" />
                <el-table-column prop="Category" label="流程节点" width="120" sortable align="center" header-align="center" show-overflow-tooltip>
                  <template #default="scope">
                    <el-tag :type="getCategoryTagType(scope.row.Category)" effect="plain" size="small">{{ scope.row.Category }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="Content" label="对策内容" min-width="180" show-overflow-tooltip header-align="center" />
                <el-table-column label="操作" width="150" fixed="right" align="center" header-align="center">
                  <template #default="scope">
                    <el-button link type="primary" size="small" @click="handleEdit(scope.row)" v-permission="'quality:measure:edit'">
                      <el-icon class="action-icon"><Edit /></el-icon> 编辑
                    </el-button>
                    <el-button link type="danger" size="small" @click="handleDelete(scope.row)" v-permission="'quality:measure:delete'">
                      <el-icon class="action-icon"><Delete /></el-icon> 删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <!-- 分页器 -->
              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="currentPage"
                  v-model:page-size="pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="filteredTableData.length"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-col>
            
            <!-- 右侧右栏：图表 -->
            <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8" class="chart-col">
              <div class="chart-panel-wrapper">
                <div class="content-header">
                  <span class="title">
                    <el-icon class="title-icon"><PieChart /></el-icon>
                    异常对策统计
                  </span>
                </div>
                <div class="chart-container" ref="chartRef"></div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- 弹窗 -->
    <el-dialog 
      v-model="dialogVisible" 
      :width="isMobile ? '90%' : '500px'"
      align-center 
      destroy-on-close 
      append-to-body
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="dialog-header">
          <el-icon class="dialog-icon" v-if="form.ID"><Edit /></el-icon>
          <el-icon class="dialog-icon" v-else><Plus /></el-icon>
          <span>{{ dialogTitle }}</span>
        </div>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="流程节点" prop="Category">
          <el-select v-model="form.Category" placeholder="选择或输入流程节点" allow-create filterable style="width: 100%">
            <el-option label="印前" value="印前" />
            <el-option label="印中" value="印中" />
            <el-option label="印后" value="印后" />
            <el-option label="品检" value="品检" />
            <el-option label="包装" value="包装" />
            <el-option label="出货" value="出货" />
          </el-select>
        </el-form-item>
        <el-form-item label="对策内容" prop="Content">
          <el-input v-model="form.Content" type="textarea" :rows="3" placeholder="请输入对策内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">
            <el-icon class="el-icon--left"><Close /></el-icon>取消
          </el-button>
          <el-button type="primary" @click="handleSubmit">
            <el-icon class="el-icon--left"><Check /></el-icon>确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete, List, PieChart, Operation, Close, Check } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'
import * as echarts from 'echarts'

const loading = ref(false)
const rawData = ref([]) // 原始分组数据
const dialogVisible = ref(false)
const dialogTitle = ref('新增对策')
const formRef = ref(null)
const chartRef = ref(null)
const selectedRows = ref([])
let myChart = null

const queryParams = reactive({
  keyword: ''
})

// 分页相关
const isMobile = ref(window.innerWidth < 992)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(isMobile.value ? 10 : 20)

const form = reactive({
  ID: null,
  Category: '',
  Content: ''
})

const rules = {
  Category: [{ required: true, message: '请输入或选择流程节点', trigger: 'change' }],
  Content: [{ required: true, message: '请输入对策内容', trigger: 'blur' }]
}

// 过滤后的数据（不含分页）
const filteredTableData = computed(() => {
  let list = []
  Object.keys(rawData.value).forEach(cat => {
    rawData.value[cat].forEach(item => {
      list.push(item)
    })
  })
  
  if (queryParams.keyword) {
    const lowerKey = queryParams.keyword.toLowerCase()
    list = list.filter(item => 
      item.Category.toLowerCase().includes(lowerKey) || 
      item.Content.toLowerCase().includes(lowerKey)
    )
  }
  return list
})

// 分页后的数据
const pagedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTableData.value.slice(start, end)
})

// 图表数据
const chartData = computed(() => {
  const categories = {}
  filteredTableData.value.forEach(item => {
    if (!categories[item.Category]) {
      categories[item.Category] = 0
    }
    categories[item.Category]++
  })
  
  return Object.keys(categories).map(key => ({
    name: key,
    value: categories[key]
  })).sort((a, b) => b.value - a.value)
})

const initChart = () => {
  if (!chartRef.value) return
  
  if (myChart) {
    myChart.dispose()
  }
  
  myChart = echarts.init(chartRef.value)
  
  // 根据是否为移动端决定配置
  const isSmallScreen = isMobile.value
  
  const option = {
    title: [
      {
        text: '分类占比',
        left: 'center',
        top: isSmallScreen ? '0%' : '2%',
        textStyle: { fontSize: 16, color: '#303133', fontWeight: 'bold' }
      },
      {
        text: '分类排行',
        left: 'center',
        top: isSmallScreen ? '58%' : '58%', // 下移标题
        textStyle: { fontSize: 16, color: '#303133', fontWeight: 'bold' }
      }
    ],
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        if (params.seriesType === 'pie') {
          return `${params.name}: ${params.value} (${params.percent}%)`
        }
        return `${params.name}: ${params.value}`
      }
    },
    legend: {
      show: true,
      orient: 'horizontal',
      left: 'center',
      top: isSmallScreen ? '48%' : '48%', // 下移图例
      itemWidth: isSmallScreen ? 10 : 12,
      itemHeight: isSmallScreen ? 10 : 12,
      textStyle: { fontSize: 12 },
      data: chartData.value.map(item => item.name)
    },
    grid: {
      top: isSmallScreen ? '62%' : '62%', // 上移网格，减少与标题距离
      left: '10%',
      right: '15%',
      bottom: isSmallScreen ? '2%' : '5%',
      containLabel: true
    },
    xAxis: { show: false },
    yAxis: {
      type: 'category',
      data: chartData.value.map(item => item.name).reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { fontSize: 13, color: '#606266', fontWeight: 'bold', margin: 10 }
    },
    series: [
      {
        name: '分类分布',
        type: 'pie',
        radius: isSmallScreen ? ['25%', '38%'] : ['35%', '50%'],
        center: isSmallScreen ? ['50%', '25%'] : ['50%', '25%'], // 上移圆环图
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          color: '#606266',
          fontSize: isSmallScreen ? 10 : 12,
          lineHeight: isSmallScreen ? 12 : 16
        },
        labelLine: { show: true, length: isSmallScreen ? 5 : 15, length2: isSmallScreen ? 5 : 10, smooth: true },
        data: chartData.value
      },
      {
        name: '数量',
        type: 'bar',
        data: chartData.value.map(item => item.value).reverse(),
        itemStyle: {
          borderRadius: [0, 20, 20, 0],
          color: function(params) {
            const total = chartData.value.length;
            const originalIndex = total - 1 - params.dataIndex;
            const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
            return colors[originalIndex % colors.length];
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 13,
          fontWeight: 'bold',
          color: '#606266',
          distance: isSmallScreen ? 5 : 10
        },
        barWidth: isSmallScreen ? 8 : 20,
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(180, 180, 180, 0.1)',
          borderRadius: [0, 20, 20, 0]
        }
      }
    ]
  }
  
  myChart.setOption(option)
}

// 监听数据变化刷新图表
watch(filteredTableData, () => {
  nextTick(() => {
    initChart()
  })
})

const getCategoryTagType = (category) => {
  const map = {
    '印前': '',
    '印中': 'success',
    '印后': 'warning',
    '品检': 'danger',
    '包装': 'info',
    '出货': 'primary'
  }
  return map[category] || ''
}

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

const handleBatchDelete = () => {
  if (!selectedRows.value.length) return
  
  ElMessageBox.confirm(`确认批量删除这 ${selectedRows.value.length} 条对策吗?`, '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      // 并行执行删除请求
      await Promise.all(selectedRows.value.map(row => apiService.delete(`/quality-measures/${row.ID}`)))
      ElMessage.success('批量删除成功')
      getList()
      selectedRows.value = [] // 清空选中
    } catch (error) {
      ElMessage.error('批量删除失败')
    }
  })
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

const getList = async () => {
  loading.value = true
  try {
    const res = await apiService.get('/quality-measures')
    if (res.data.success) {
      rawData.value = res.data.data
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const resetQuery = () => {
  queryParams.keyword = ''
  currentPage.value = 1
}

const handleAdd = () => {
  dialogTitle.value = '新增对策'
  dialogVisible.value = true
  form.ID = null
  form.Category = ''
  form.Content = ''
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑对策'
  dialogVisible.value = true
  Object.assign(form, row)
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该对策吗?', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await apiService.delete(`/quality-measures/${row.ID}`)
      ElMessage.success('删除成功')
      getList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (form.ID) {
          await apiService.put(`/quality-measures/${form.ID}`, form)
          ElMessage.success('更新成功')
        } else {
          await apiService.post('/quality-measures', form)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        getList()
      } catch (error) {
        ElMessage.error('提交失败')
      }
    }
  })
}

const handleResize = () => {
  if (myChart) {
    myChart.resize()
  }
  const newIsMobile = window.innerWidth < 992
  if (newIsMobile !== isMobile.value) {
    isMobile.value = newIsMobile
    initChart() // 重新应用配置
  }
}

onMounted(() => {
  getList()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (myChart) {
    myChart.dispose()
  }
})
</script>

<style scoped>
.app-container {
  height: 100%; /* 使用 100% 适应父容器高度，避免计算误差导致滚动条 */
  padding: 0;
}
.full-height {
  height: 100%;
}
.full-height-col {
  height: 100%;
}
.chart-col {
  height: 100%; 
  padding-left: 20px;
}

/* 响应式调整 */
@media screen and (max-width: 992px) {
  .app-container {
    height: auto !important;
    overflow-y: auto;
  }
  .full-height {
    height: auto !important;
  }
  .full-height-col {
    height: auto !important;
    margin-bottom: 20px;
  }
  .full-height-card {
    height: auto !important;
  }
  .search-card {
    min-height: auto !important;
  }
  .content-card {
    min-height: 400px;
  }
  .content-row {
    height: auto !important;
    display: block !important; /* 解除flex布局 */
  }
  .list-panel {
    border-right: none !important;
    border-bottom: 1px solid #ebeef5;
    padding-right: 0 !important;
    padding-bottom: 20px;
    margin-bottom: 20px;
    height: auto !important;
  }
  .chart-col {
    padding-left: 0 !important;
    height: 500px !important; /* 图表区固定高度 */
  }
}
.full-height-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none; /* 去掉卡片边框，如果需要无缝衔接 */
  border-radius: 0; /* 去掉圆角 */
}
.full-height-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px;
}
.search-card :deep(.el-card__body) {
  padding: 10px 20px 20px 20px; /* 左侧卡片调整内边距：上10px(与右侧一致)，左右下20px */
}
.content-card :deep(.el-card__body) {
  padding-left: 20px; /* 右侧卡片加大左内边距 */
}
.list-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ebeef5;
  padding-right: 20px;
}
.chart-panel-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.chart-container {
  width: 100%;
  flex: 1; /* 自动填充剩余高度 */
  min-height: 0; /* 防止flex子元素溢出 */
}
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  flex: 0 0 auto; /* 防止被挤压或拉伸 */
}
.title {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
  color: #303133;
}
.title-icon {
  margin-right: 6px;
  font-size: 18px;
  color: #409EFF;
}
.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}
:deep(.el-pagination) {
  width: 100%;
  justify-content: space-between;
}
:deep(.el-pagination__total) {
  margin-right: auto; /* 将 total 推到最左边 */
}
:deep(.el-pagination__sizes) {
  margin-right: 10px;
}
:deep(.el-pagination__jump) {
  margin-left: 10px;
}
:deep(.table-header-center) {
  background-color: #f5f7fa !important;
  font-weight: normal;
  color: #606266;
}
.action-icon {
  margin-right: 4px;
}
.dialog-header {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
.dialog-icon {
  margin-right: 8px;
  font-size: 20px;
  color: #409EFF;
}
</style>