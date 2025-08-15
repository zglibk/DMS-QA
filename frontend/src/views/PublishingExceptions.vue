<template>
  <div class="common-layout">
    <AppHeader />
    <el-container>
      <el-aside width="200px">
        <!-- 筛选卡片 -->
        <el-card class="filter-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>筛选条件</span>
              <el-button type="primary" size="small" @click="resetFilters">重置</el-button>
            </div>
          </template>
          
          <el-form :model="filters" label-width="80px" size="small">
            <el-form-item label="客户代码">
              <el-input v-model="filters.customerCode" placeholder="请输入" clearable />
            </el-form-item>
            
            <el-form-item label="工单号">
              <el-input v-model="filters.workOrderNumber" placeholder="请输入" clearable />
            </el-form-item>
            
            <el-form-item label="产品名称">
              <el-input v-model="filters.productName" placeholder="请输入" clearable />
            </el-form-item>
            
            <el-form-item label="责任单位">
              <el-select v-model="filters.responsibleUnit" placeholder="请选择" clearable>
                <el-option 
                  v-for="dept in departmentList" 
                  :key="dept.ID" 
                  :label="dept.Name" 
                  :value="dept.Name" 
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="登记日期">
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                size="small"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="handleSearch" size="small" style="width: 100%">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-aside>
      
      <el-main>
        <!-- 标签页 -->
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <!-- 记录清单标签页 -->
          <el-tab-pane label="记录清单" name="records">
            <div class="records-content">
              <!-- 操作工具栏 -->
              <div class="toolbar">
                <el-button type="primary" @click="handleAdd">
                  <el-icon><Plus /></el-icon>
                  新增记录
                </el-button>
                <el-button type="danger" @click="handleBatchDelete" :disabled="selectedRows.length === 0">
                  <el-icon><Delete /></el-icon>
                  批量删除
                </el-button>
                <el-button @click="handleExport">
                  <el-icon><Download /></el-icon>
                  导出数据
                </el-button>
              </div>
              
              <!-- 数据表格 -->
              <el-table
                ref="tableRef"
                :data="tableData"
                v-loading="loading"
                @selection-change="handleSelectionChange"
                stripe
                border
              >
                <el-table-column type="selection" width="55" align="center" header-align="center" />
                <el-table-column prop="publishing_date" label="出版日期" width="120" align="center" header-align="center">
                  <template #default="{ row }">
                    {{ formatDate(row.publishing_date) }}
                  </template>
                </el-table-column>
                <el-table-column prop="customer_code" label="客户代码" width="120" align="center" header-align="center" />
                <el-table-column prop="work_order_number" label="工单号" width="150" align="center" header-align="center" />
                <el-table-column prop="product_name" label="产品名称" width="200" show-overflow-tooltip header-align="center" />
                <el-table-column prop="plate_type" label="版类型" width="100" align="center" header-align="center" />
                <el-table-column prop="publishing_sheets" label="出版张数" width="100" align="center" header-align="center" />
                <el-table-column prop="exception_description" label="异常描述" width="200" show-overflow-tooltip header-align="center" />
                <el-table-column prop="responsible_unit" label="责任单位" width="120" align="center" header-align="center" />
                <el-table-column prop="responsible_person" label="责任人" width="100" align="center" header-align="center" />
                <el-table-column prop="area_cm2" label="数量cm²" width="100" align="center" header-align="center" />
                <el-table-column prop="amount" label="金额" width="100" align="center" header-align="center" />
                
                <el-table-column label="操作" min-width="210" fixed="right">
                  <template #default="{ row }">
                    <div class="action-buttons">
                      <el-button type="primary" size="small" @click="handleView(row)">
                        <el-icon><View /></el-icon>
                        查看
                      </el-button>
                      <el-button type="warning" size="small" @click="handleEdit(row)">
                        <el-icon><Edit /></el-icon>
                        编辑
                      </el-button>
                      <el-button type="danger" size="small" @click="handleDelete(row)">
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              
              <!-- 分页 -->
              <div class="pagination-wrapper">
                <el-pagination
                  v-model:current-page="pagination.current"
                  v-model:page-size="pagination.pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  :total="pagination.total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 数据统计标签页 -->
          <el-tab-pane label="数据统计" name="statistics">
            <div class="statistics-content">
              <!-- 统计卡片 -->
              <el-row :gutter="20" class="stats-cards">
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.summary?.total_count || 0 }}</div>
                      <div class="stat-label">总记录数</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-item">
                      <div class="stat-value">¥{{ formatNumber(statistics.summary?.total_amount || 0) }}</div>
                      <div class="stat-label">总金额</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-item">
                      <div class="stat-value">{{ formatNumber(statistics.summary?.total_area || 0) }}</div>
                      <div class="stat-label">总面积(cm²)</div>
                    </div>
                  </el-card>
                </el-col>
                <el-col :span="6">
                  <el-card class="stat-card">
                    <div class="stat-item">
                      <div class="stat-value">¥{{ formatNumber(statistics.summary?.avg_amount || 0) }}</div>
                      <div class="stat-label">平均金额</div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
              
              <!-- 图表区域 -->
              <el-row :gutter="20" class="charts-row">
                <el-col :span="12">
                  <el-card class="chart-card">
                    <template #header>
                      <span>按责任单位统计</span>
                    </template>
                    <div ref="unitChartRef" class="chart-container"></div>
                  </el-card>
                </el-col>
                <el-col :span="12">
                  <el-card class="chart-card">
                    <template #header>
                      <span>按月份统计</span>
                    </template>
                    <div ref="monthlyChartRef" class="chart-container"></div>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-main>
      
      <el-aside width="200px">
        <!-- 快捷操作卡片 -->
        <el-card class="quick-actions-card" shadow="hover">
          <template #header>
            <span>快捷操作</span>
          </template>
          
          <div class="quick-actions">
            <el-button type="primary" @click="handleAdd" style="width: 100%; margin-bottom: 10px;">
              <el-icon><Plus /></el-icon>
              新增记录
            </el-button>
            <el-button @click="handleExport" style="width: 100%; margin-bottom: 10px;">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            <el-button @click="refreshData" style="width: 100%;">
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
          </div>
        </el-card>
        
        <!-- 统计信息卡片 -->
        <el-card class="info-card" shadow="hover" style="margin-top: 20px;">
          <template #header>
            <span>统计信息</span>
          </template>
          
          <div class="info-items">
            <div class="info-item">
              <span class="info-label">本月新增:</span>
              <span class="info-value">{{ monthlyCount }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">待处理:</span>
              <span class="info-value">{{ pendingCount }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">已完成:</span>
              <span class="info-value">{{ completedCount }}</span>
            </div>
          </div>
        </el-card>
      </el-aside>
    </el-container>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="900px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="登记日期" prop="registration_date">
              <el-date-picker
                v-model="formData.registration_date"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="出版日期">
              <el-date-picker
                v-model="formData.publishing_date"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户代码" prop="customer_code">
              <el-input v-model="formData.customer_code" placeholder="请输入客户代码" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="工单号" prop="work_order_number">
              <el-input v-model="formData.work_order_number" placeholder="请输入工单号" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="产品名称" prop="product_name">
              <el-input v-model="formData.product_name" placeholder="请输入产品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="版类型">
              <el-select v-model="formData.plate_type" placeholder="请选择版类型" style="width: 100%">
                <el-option label="PS版" value="PS版" />
                <el-option label="CTP版" value="CTP版" />
                <el-option label="胶印版" value="胶印版" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="出版张数">
              <el-input-number v-model="formData.publishing_sheets" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="责任单位" prop="responsible_unit">
              <el-select v-model="formData.responsible_unit" placeholder="请选择责任单位" style="width: 100%">
                <el-option 
                  v-for="dept in departmentList" 
                  :key="dept.ID" 
                  :label="dept.Name" 
                  :value="dept.Name" 
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="责任人" prop="responsible_person">
              <el-input v-model="formData.responsible_person" placeholder="请输入责任人" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="件数">
              <el-input-number v-model="formData.piece_count" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="长(cm)">
              <el-input-number v-model="formData.length_cm" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="宽(cm)">
              <el-input-number v-model="formData.width_cm" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="数量cm²">
              <el-input-number v-model="formData.area_cm2" :min="0" :precision="2" style="width: 100%" readonly disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价">
              <el-input-number v-model="formData.unit_price" :min="0" :precision="4" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="金额">
              <el-input-number v-model="formData.amount" :min="0" :precision="2" style="width: 100%" readonly disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="异常描述" prop="exception_description">
          <el-input
            v-model="formData.exception_description"
            type="textarea"
            :rows="3"
            placeholder="请详细描述异常情况"
          />
        </el-form-item>
        
        <el-form-item label="图片上传">
          <el-upload
            ref="uploadRef"
            :action="publishingExceptionUploadAction"
            :headers="publishingExceptionUploadHeaders"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :before-upload="beforeUpload"
            :file-list="fileList"
            list-type="picture-card"
            :limit="1"
            name="file"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="查看详情"
      width="600px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">{{ viewData.id }}</el-descriptions-item>
        <el-descriptions-item label="登记日期">{{ formatDate(viewData.registration_date) }}</el-descriptions-item>
        <el-descriptions-item label="出版日期">{{ formatDate(viewData.publishing_date) }}</el-descriptions-item>
        <el-descriptions-item label="客户代码">{{ viewData.customer_code }}</el-descriptions-item>
        <el-descriptions-item label="工单号">{{ viewData.work_order_number }}</el-descriptions-item>
        <el-descriptions-item label="产品名称">{{ viewData.product_name }}</el-descriptions-item>
        <el-descriptions-item label="版类型">{{ viewData.plate_type }}</el-descriptions-item>
        <el-descriptions-item label="出版张数">{{ viewData.publishing_sheets }}</el-descriptions-item>
        <el-descriptions-item label="责任单位">{{ viewData.responsible_unit }}</el-descriptions-item>
        <el-descriptions-item label="责任人">{{ viewData.responsible_person }}</el-descriptions-item>
        <el-descriptions-item label="长(cm)">{{ viewData.length_cm }}</el-descriptions-item>
        <el-descriptions-item label="宽(cm)">{{ viewData.width_cm }}</el-descriptions-item>
        <el-descriptions-item label="件数">{{ viewData.piece_count }}</el-descriptions-item>
        <el-descriptions-item label="数量cm²">{{ viewData.area_cm2 }}</el-descriptions-item>
        <el-descriptions-item label="单价">{{ viewData.unit_price }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ viewData.amount }}</el-descriptions-item>
        <el-descriptions-item label="异常描述" :span="2">{{ viewData.exception_description }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ viewData.created_by }}</el-descriptions-item>
        <el-descriptions-item label="创建日期">{{ viewData.created_date }}</el-descriptions-item>
      </el-descriptions>
      
      <!-- 图片显示 -->
      <div v-if="viewData.image_path" class="image-preview">
        <el-divider>异常图片</el-divider>
        <el-image
          :src="getImageUrl(viewData.image_path)"
          :preview-src-list="[getImageUrl(viewData.image_path)]"
          fit="contain"
          style="width: 200px; height: 200px;"
        />
      </div>
    </el-dialog>
    
    <AppFooter />
  </div>
</template>

<script setup>
/**
 * 出版异常管理页面
 * 
 * 功能说明：
 * 1. 出版异常记录的增删改查
 * 2. 数据筛选和搜索
 * 3. 数据统计和图表展示
 * 4. 图片上传和预览
 * 5. 数据导出功能
 */

import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, Delete, Download, View, Edit, Refresh
} from '@element-plus/icons-vue'
import AppHeader from '@/components/common/AppHeader.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import apiService from '@/services/apiService'
import { useUserStore } from '@/store/user'
import * as echarts from 'echarts'

// 用户信息
const userStore = useUserStore()
const currentUser = computed(() => userStore.user?.Username || '系统')

// 页面状态
const activeTab = ref('records')
const loading = ref(false)
const submitLoading = ref(false)

// 筛选条件
const filters = reactive({
  customerCode: '',
  workOrderNumber: '',
  productName: '',
  responsibleUnit: '',
  dateRange: []
})

// 表格数据
const tableData = ref([])
const selectedRows = ref([])
const tableRef = ref()

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 统计数据
const statistics = ref({
  summary: {},
  byUnit: [],
  byMonth: []
})

// 图表引用
const unitChartRef = ref()
const monthlyChartRef = ref()
let unitChart = null
let monthlyChart = null

// 对话框状态
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const currentEditId = ref(null)

// 表单数据
const formData = reactive({
  registration_date: '',
  publishing_date: '',
  customer_code: '',
  work_order_number: '',
  product_name: '',
  plate_type: '',
  publishing_sheets: null,
  exception_description: '',
  responsible_unit: '设计部',
  responsible_person: '',
  length_cm: null,
  width_cm: null,
  piece_count: null,
  area_cm2: null,
  unit_price: null,
  amount: null
})

// 查看数据
const viewData = ref({})

// 表单验证规则
const formRules = {
  registration_date: [{ required: true, message: '请选择登记日期', trigger: 'change' }],
  customer_code: [{ required: true, message: '请输入客户代码', trigger: 'blur' }],
  work_order_number: [{ required: true, message: '请输入工单号', trigger: 'blur' }],
  product_name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  responsible_unit: [{ required: true, message: '请选择责任单位', trigger: 'change' }],
  responsible_person: [{ required: true, message: '请输入责任人', trigger: 'blur' }],
  exception_description: [{ required: true, message: '请输入异常描述', trigger: 'blur' }]
}

// 文件上传 - 出版异常专用配置
const uploadRef = ref()
const fileList = ref([])
const publishingExceptionUploadAction = computed(() => `${apiService.baseURL}/publishing-exceptions/upload-image`)
const publishingExceptionUploadHeaders = computed(() => ({
  'Authorization': `Bearer ${userStore.token || localStorage.getItem('token')}`,
  'Content-Type': 'multipart/form-data'
}))

// 表单引用
const formRef = ref()

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑出版异常' : '新增出版异常')

// 统计信息
const monthlyCount = ref(0)
const pendingCount = ref(0)
const completedCount = ref(0)

// 部门列表
const departmentList = ref([])

/**
 * 获取部门列表数据
 */
const fetchDepartments = async () => {
  try {
    const response = await apiService.get('/departments')
    console.log('部门API响应:', response.data)
    if (response.data.success) {
      departmentList.value = response.data.data
      console.log('部门列表数据:', departmentList.value)
    } else {
      console.error('获取部门列表失败:', response.data.message)
    }
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

/**
 * 获取出版异常列表数据
 */
const fetchData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...filters
    }
    
    // 处理日期范围
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    
    const response = await apiService.get('/publishing-exceptions', { params })
    
    if (response.data.success) {
      tableData.value = response.data.data
      pagination.total = response.data.pagination.total
    } else {
      ElMessage.error(response.data.message || '获取数据失败')
    }
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取统计数据
 */
const fetchStatistics = async () => {
  try {
    const params = {}
    
    // 处理日期范围
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    
    if (filters.responsibleUnit) {
      params.responsibleUnit = filters.responsibleUnit
    }
    
    const response = await apiService.get('/publishing-exceptions/statistics/summary', { params })
    
    if (response.data.success) {
      statistics.value = response.data.data
      
      // 更新图表
      nextTick(() => {
        updateCharts()
      })
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

/**
 * 更新图表
 */
const updateCharts = () => {
  // 责任单位统计图表
  if (unitChartRef.value && statistics.value.byUnit) {
    if (!unitChart) {
      unitChart = echarts.init(unitChartRef.value)
    }
    
    const unitOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      series: [{
        name: '异常数量',
        type: 'pie',
        radius: '50%',
        data: statistics.value.byUnit.map(item => ({
          name: item.responsible_unit,
          value: item.count
        }))
      }]
    }
    
    unitChart.setOption(unitOption)
  }
  
  // 月份统计图表
  if (monthlyChartRef.value && statistics.value.byMonth) {
    if (!monthlyChart) {
      monthlyChart = echarts.init(monthlyChartRef.value)
    }
    
    const monthlyOption = {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: statistics.value.byMonth.map(item => item.month)
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        name: '异常数量',
        type: 'bar',
        data: statistics.value.byMonth.map(item => item.count)
      }]
    }
    
    monthlyChart.setOption(monthlyOption)
  }
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  pagination.current = 1
  fetchData()
  if (activeTab.value === 'statistics') {
    fetchStatistics()
  }
}

/**
 * 重置筛选条件
 */
const resetFilters = () => {
  Object.keys(filters).forEach(key => {
    if (Array.isArray(filters[key])) {
      filters[key] = []
    } else {
      filters[key] = ''
    }
  })
  handleSearch()
}

/**
 * 标签页切换
 */
const handleTabClick = (tab) => {
  if (tab.props.name === 'statistics') {
    fetchStatistics()
  }
}

/**
 * 新增记录
 */
const handleAdd = () => {
  isEdit.value = false
  currentEditId.value = null
  resetFormData()
  dialogVisible.value = true
}

/**
 * 编辑记录
 */
const handleEdit = (row) => {
  isEdit.value = true
  currentEditId.value = row.id
  
  // 填充表单数据
  Object.keys(formData).forEach(key => {
    formData[key] = row[key]
  })
  
  // 处理文件列表
  if (row.image_path) {
    fileList.value = [{
      name: row.image_path,
      url: getImageUrl(row.image_path)
    }]
  } else {
    fileList.value = []
  }
  
  dialogVisible.value = true
}

/**
 * 查看记录
 */
const handleView = (row) => {
  viewData.value = { ...row }
  viewDialogVisible.value = true
}

/**
 * 删除记录
 */
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条记录吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await apiService.delete(`/publishing-exceptions/${row.id}`, {
      data: { deleted_by: currentUser.value }
    })
    
    if (response.data.success) {
      ElMessage.success('删除成功')
      fetchData()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 批量删除
 */
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 批量删除
    const deletePromises = selectedRows.value.map(row => 
      apiService.delete(`/publishing-exceptions/${row.id}`, {
        data: { deleted_by: currentUser.value }
      })
    )
    
    await Promise.all(deletePromises)
    
    ElMessage.success('批量删除成功')
    fetchData()
    selectedRows.value = []
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 导出数据
 */
const handleExport = () => {
  ElMessage.info('导出功能开发中...')
}

/**
 * 表格选择变化
 */
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.current = 1
  fetchData()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page) => {
  pagination.current = page
  fetchData()
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    const submitData = {
      ...formData,
      created_by: isEdit.value ? undefined : currentUser.value,
      updated_by: isEdit.value ? currentUser.value : undefined
    }
    
    let response
    if (isEdit.value) {
      response = await apiService.put(`/publishing-exceptions/${currentEditId.value}`, submitData)
    } else {
      response = await apiService.post('/publishing-exceptions', submitData)
    }
    
    if (response.data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(response.data.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败')
  } finally {
    submitLoading.value = false
  }
}

/**
 * 关闭对话框
 */
const handleDialogClose = () => {
  dialogVisible.value = false
  resetFormData()
  fileList.value = []
  formRef.value?.clearValidate()
}

/**
 * 重置表单数据
 */
const resetFormData = () => {
  Object.keys(formData).forEach(key => {
    if (typeof formData[key] === 'number') {
      formData[key] = null
    } else {
      formData[key] = ''
    }
  })
  
  // 设置默认登记日期为今天
  formData.registration_date = new Date().toISOString().split('T')[0]
  // 设置默认责任单位为设计部
  formData.responsible_unit = '设计部'
}

/**
 * 刷新数据
 */
const refreshData = () => {
  fetchData()
  if (activeTab.value === 'statistics') {
    fetchStatistics()
  }
}

/**
 * 文件上传成功
 */
const handleUploadSuccess = (response, file) => {
  if (response.success) {
    ElMessage.success('图片上传成功')
    // 将上传的文件路径保存到表单数据中
    formData.image_path = response.data.filename
    // 更新文件列表显示
    fileList.value = [{
      name: file.name,
      url: getImageUrl(response.data.filename)
    }]
  } else {
    ElMessage.error(response.message || '图片上传失败')
    // 清理失败的文件
    fileList.value = []
  }
}

/**
 * 文件上传失败
 */
const handleUploadError = (error) => {
  console.error('上传失败:', error)
  ElMessage.error('图片上传失败')
}

/**
 * 上传前检查
 */
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

/**
 * 获取图片URL
 */
const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  return `${apiService.baseURL.replace('/api', '')}/files/site-images/${imagePath}`
}

/**
 * 格式化数字
 */
const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

/**
 * 格式化日期为 yyyy-mm-dd 格式
 * 处理时区偏移问题
 */
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    // 创建Date对象
    const date = new Date(dateString)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) return ''
    
    // 获取本地日期（避免时区偏移）
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('日期格式化错误:', error)
    return ''
  }
}

// 自动计算功能
/**
 * 监听长度和宽度变化，自动计算数量cm²
 */
watch(
  () => [formData.length_cm, formData.width_cm],
  ([length, width]) => {
    if (length && width && length > 0 && width > 0) {
      formData.area_cm2 = Number((length * width).toFixed(2))
    } else {
      formData.area_cm2 = null
    }
  },
  { immediate: true }
)

/**
 * 监听数量和单价变化，自动计算金额
 */
watch(
  () => [formData.area_cm2, formData.unit_price],
  ([area, price]) => {
    if (area && price && area > 0 && price > 0) {
      formData.amount = Number((area * price).toFixed(2))
    } else {
      formData.amount = null
    }
  },
  { immediate: true }
)

// 组件挂载时获取数据
onMounted(() => {
  fetchDepartments()
  fetchData()
  
  // 模拟统计数据
  monthlyCount.value = 15
  pendingCount.value = 3
  completedCount.value = 12
})
</script>

<style scoped>
.common-layout {
  min-height: 100vh;
  background: #f5f7fa;
  padding-top: 90px; /* 为导航栏留出空间 */
}

.filter-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.statistics-content {
  padding: 20px;
}

.stats-cards {
  margin-bottom: 30px;
}

.stat-card {
  text-align: center;
}

.stat-item {
  padding: 20px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.charts-row {
  margin-top: 20px;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 300px;
}

.quick-actions-card {
  margin-bottom: 20px;
}

.info-card {
  margin-top: 20px;
}

.info-items {
  padding: 10px 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  color: #666;
  font-size: 14px;
}

.info-value {
  color: #409EFF;
  font-weight: bold;
}

.image-preview {
  margin-top: 20px;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 操作列按钮样式 */
.el-table .el-table__body .el-button {
  padding-left: 8px;
  padding-right: 8px;
  margin-right: 5px;
}

/* 操作列按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.action-buttons .el-button {
  margin: 0;
  min-width: auto;
  padding: 5px 8px;
}



/* 响应式设计 */
@media (max-width: 768px) {
  .el-aside {
    width: 100% !important;
    margin-bottom: 20px;
  }
  
  .el-container {
    flex-direction: column;
  }
  
  .stats-cards .el-col {
    margin-bottom: 20px;
  }
}
</style>