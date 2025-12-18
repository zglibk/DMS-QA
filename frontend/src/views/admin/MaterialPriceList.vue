<template>
  <div class="material-price-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">材料价格管理</h2>
        <p class="page-description">管理材料价格信息，支持Excel批量导入</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true" :disabled="!hasPermission('material:price:add')">
          <el-icon><Plus /></el-icon>
          新增价格
        </el-button>
        <el-button type="success" @click="showImportDialog = true" :disabled="!hasPermission('material:price:import')">
          <el-icon><Upload /></el-icon>
          导入Excel
        </el-button>
        <el-button @click="openExportDialog" :disabled="!hasPermission('material:price:export')">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
        <el-button type="info" @click="downloadTemplate" :disabled="!hasPermission('material:price:import')">
          <el-icon><Document /></el-icon>
          下载模板
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选区域 -->
    <div class="search-section">
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="材料名称">
          <el-input
            v-model="searchForm.materialName"
            placeholder="请输入材料名称"
            clearable
            @blur="handleAutoSearch"
            @clear="handleAutoSearch"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="供应商">
          <el-input
            v-model="searchForm.supplier"
            placeholder="请输入供应商"
            clearable
            @blur="handleAutoSearch"
            @clear="handleAutoSearch"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="价格范围">
          <el-input-number
            v-model="searchForm.minPrice"
            placeholder="最低价格"
            :min="0"
            :precision="2"
            @change="handleAutoSearch"
            @clear="handleAutoSearch"
            style="width: 120px"
          />
          <span style="margin: 0 8px">-</span>
          <el-input-number
            v-model="searchForm.maxPrice"
            placeholder="最高价格"
            :min="0"
            :precision="2"
            @change="handleAutoSearch"
            @clear="handleAutoSearch"
            style="width: 120px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column
          prop="MaterialName"
          label="材料名称"
          min-width="200"
          sortable="custom"
          show-overflow-tooltip
        />
        <el-table-column
          prop="UnitPrice"
          label="单价(元)"
          width="120"
          align="right"
          sortable="custom"
        >
          <template #default="{ row }">
            <span class="price-text">¥{{ row.UnitPrice?.toFixed(2) || '0.00' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="Supplier"
          label="供应商"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="Remarks"
          label="备注"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          prop="EffectiveDate"
          label="生效日期"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <span>{{ formatDate(row.EffectiveDate) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="Version"
          label="版本"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="info" size="small">v{{ row.Version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editItem(row)" :disabled="!hasPermission('material:price:edit')">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="info" size="small" @click="viewHistory(row)" :disabled="!hasPermission('material:price:view')">
              <el-icon><Clock /></el-icon>
              历史
            </el-button>
            <el-button type="danger" size="small" @click="deleteItem(row)" :disabled="!hasPermission('material:price:delete')">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingItem ? '编辑材料价格' : '新增材料价格'"
      width="500px"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      class="edit-dialog"
      center
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="材料名称" prop="MaterialName">
          <el-input
            v-model="formData.MaterialName"
            placeholder="请输入材料名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="单价(可选)" prop="UnitPrice">
          <el-input-number
            v-model="formData.UnitPrice"
            placeholder="请输入单价"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="供应商" prop="Supplier">
          <el-input
            v-model="formData.Supplier"
            placeholder="请输入供应商名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="备注" prop="Remarks">
          <el-input
            v-model="formData.Remarks"
            type="textarea"
            placeholder="请输入备注信息"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="生效日期" prop="EffectiveDate">
          <el-date-picker
            v-model="formData.EffectiveDate"
            type="datetime"
            placeholder="选择生效日期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ editingItem ? '更新' : '新增' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Excel导入对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入Excel数据"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="import-section">
        <el-alert
          title="导入说明"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <p>1. Excel文件应包含以下列：材料名称(必填)、单价(可选)、供应商(可选)、备注(可选)</p>
            <p>2. 第一行为表头，从第二行开始为数据</p>
            <p>3. 支持.xlsx和.xls格式文件</p>
            <p>4. 单价如填写必须为数字格式</p>
            <p>5. 建议先下载导入模板，按模板格式填写数据</p>
          </template>
        </el-alert>

        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
          drag
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            将Excel文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              只能上传xlsx/xls文件，且不超过10MB
            </div>
          </template>
        </el-upload>

        <!-- 预览数据 -->
        <div v-if="previewData.length > 0" class="preview-section">
          <h4>数据预览（前5条）</h4>
          <el-table :data="previewData.slice(0, 5)" border size="small">
            <el-table-column prop="MaterialName" label="材料名称" />
            <el-table-column prop="UnitPrice" label="单价" />
            <el-table-column prop="Supplier" label="供应商" />
            <el-table-column prop="Remarks" label="备注" />
          </el-table>
          <p class="preview-info">
            共解析到 <strong>{{ previewData.length }}</strong> 条数据
          </p>
        </div>
      </div>

      <template #footer>
        <el-button @click="cancelImport">取消</el-button>
        <el-button
          type="primary"
          @click="confirmImport"
          :loading="importing"
          :disabled="previewData.length === 0"
        >
          确认导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 价格历史对话框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="价格历史记录"
      width="800px"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      class="history-dialog"
      center
    >
      <div class="history-header">
        <h4>{{ historyTitle }}</h4>
        <p class="history-subtitle">查看该材料的所有价格变更记录</p>
      </div>

      <el-table
        v-loading="historyLoading"
        :data="historyData"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="Version" label="版本" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.IsActive ? 'success' : 'info'" size="small">
              v{{ row.Version }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="UnitPrice" label="单价(元)" width="120" align="right">
          <template #default="{ row }">
            <span class="price-text">¥{{ row.UnitPrice?.toFixed(2) || '0.00' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="Remarks" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column prop="EffectiveDate" label="生效日期" width="150" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.EffectiveDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="ExpiryDate" label="失效日期" width="150" align="center">
          <template #default="{ row }">
            {{ row.ExpiryDate ? formatDateTime(row.ExpiryDate) : '当前有效' }}
          </template>
        </el-table-column>
        <el-table-column prop="PriceStatus" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.IsActive ? 'success' : 'info'" size="small">
              {{ row.IsActive ? '当前价格' : '历史价格' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="UpdatedBy" label="操作人" width="100" align="center" />
      </el-table>

      <template #footer>
        <el-button @click="showHistoryDialog = false">关闭</el-button>
        <el-button type="primary" @click="exportHistory" :disabled="!hasPermission('material:price:export')">
          <el-icon><Download /></el-icon>
          导出历史
        </el-button>
      </template>
    </el-dialog>

    <!-- 导出筛选对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="导出数据筛选"
      width="500px"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      class="export-dialog"
      center
    >
      <el-form :model="exportForm" label-width="100px">
        <el-form-item label="材料名称">
          <el-select
            v-model="exportForm.materialName"
            placeholder="请选择材料名称"
            filterable
            style="width: 100%"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="name in filterOptions.materialNames"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商">
          <el-select
            v-model="exportForm.supplier"
            placeholder="请选择供应商"
            filterable
            style="width: 100%"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="supplier in filterOptions.suppliers"
              :key="supplier"
              :label="supplier"
              :value="supplier"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="有效状态">
          <el-select
            v-model="exportForm.isActive"
            placeholder="请选择有效状态"
            clearable
            style="width: 100%"
          >
            <el-option label="全部" value="" />
            <el-option label="有效" value="1" />
            <el-option label="无效" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格范围">
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-input-number
              v-model="exportForm.minPrice"
              placeholder="最低价格"
              :min="0"
              :precision="2"
              style="width: 150px"
            />
            <span>-</span>
            <el-input-number
              v-model="exportForm.maxPrice"
              placeholder="最高价格"
              :min="0"
              :precision="2"
              style="width: 150px"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showExportDialog = false">取消</el-button>
        <el-button @click="resetExportForm">重置</el-button>
        <el-button type="primary" @click="confirmExport">
          <el-icon><Download /></el-icon>
          确认导出
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="MaterialPriceList">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Download, Search, RefreshLeft, Edit, Delete, UploadFilled, Clock, Document } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'
import axios from 'axios'
import { useUserStore } from '@/store/user'

// 响应式数据
const userStore = useUserStore()
const hasPermission = (permission) => userStore.hasPermission(permission)

const loading = ref(false)
const submitting = ref(false)
const importing = ref(false)
const showAddDialog = ref(false)
const showImportDialog = ref(false)
const showHistoryDialog = ref(false)
const showExportDialog = ref(false)
const editingItem = ref(null)
const tableData = ref([])
const previewData = ref([])
const historyData = ref([])
const historyLoading = ref(false)
const historyTitle = ref('')

// 搜索表单
const searchForm = reactive({
  materialName: '',
  supplier: '',
  minPrice: null,
  maxPrice: null
})

// 导出表单
const exportForm = reactive({
  materialName: '', // 默认为"全部"
  supplier: '', // 默认为"全部"
  isActive: '', // 默认为"全部"
  minPrice: null,
  maxPrice: null
})

// 筛选选项
const filterOptions = reactive({
  materialNames: [],
  suppliers: []
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 表单数据
const formData = reactive({
  MaterialName: '',
  UnitPrice: null,
  Supplier: '',
  Remarks: '',
  EffectiveDate: null
})

// 表单验证规则
const formRules = {
  MaterialName: [
    { required: true, message: '请输入材料名称', trigger: 'blur' },
    { max: 100, message: '材料名称不能超过100个字符', trigger: 'blur' }
  ],
  UnitPrice: [
    { type: 'number', min: 0, message: '单价必须大于等于0', trigger: 'blur' }
  ],
  Supplier: [
    { max: 100, message: '供应商名称不能超过100个字符', trigger: 'blur' }
  ],
  Remarks: [
    { max: 500, message: '备注不能超过500个字符', trigger: 'blur' }
  ]
}

const formRef = ref(null)
const uploadRef = ref(null)

// 页面加载时获取数据
onMounted(() => {
  fetchData()
})

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      materialName: searchForm.materialName,
      supplier: searchForm.supplier,
      minPrice: searchForm.minPrice,
      maxPrice: searchForm.maxPrice
    }

    const response = await axios.get('/admin/material-prices', {
      headers: { Authorization: `Bearer ${token}` },
      params: params
    })

    if (response.data.success) {
      tableData.value = response.data.data.records
      pagination.total = response.data.data.total
    } else {
      ElMessage.error(response.data.message || '获取数据失败')
    }
  } catch (error) {
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.currentPage = 1
  fetchData()
}

/**
 * 自动搜索处理函数
 * 当输入框失去焦点、清空内容或下拉选择时自动执行查询
 */
const handleAutoSearch = () => {
  // 延迟执行查询，避免频繁触发
  setTimeout(() => {
    handleSearch()
  }, 100)
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    materialName: '',
    supplier: '',
    minPrice: null,
    maxPrice: null
  })
  handleSearch()
}

// 排序处理
const handleSortChange = () => {
  // 这里可以添加排序逻辑
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  fetchData()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  fetchData()
}

// 编辑项目
const editItem = (row) => {
  editingItem.value = row
  Object.assign(formData, {
    MaterialName: row.MaterialName,
    UnitPrice: row.UnitPrice,
    Supplier: row.Supplier,
    Remarks: row.Remarks || '',
    EffectiveDate: null // 新价格的生效日期
  })
  showAddDialog.value = true
}

// 查看历史价格
const viewHistory = async (row) => {
  historyTitle.value = `${row.MaterialName} ${row.Supplier ? `(${row.Supplier})` : ''} - 价格历史`
  historyLoading.value = true
  showHistoryDialog.value = true

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const params = {
      materialName: row.MaterialName,
      supplier: row.Supplier || ''
    }

    const response = await axios.get('/admin/material-prices/history', {
      headers: { Authorization: `Bearer ${token}` },
      params: params
    })

    if (response.data.success) {
      historyData.value = response.data.data
    } else {
      ElMessage.error(response.data.message || '获取历史数据失败')
    }
  } catch (error) {
    ElMessage.error('获取历史数据失败')
  } finally {
    historyLoading.value = false
  }
}

// 安全的日期格式化函数，避免时区转换问题
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  
  // 如果已经是YYYY-MM-DD格式，直接返回
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // 如果是其他格式，尝试解析并格式化
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    
    // 使用本地时区的年月日，避免UTC转换
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    return dateStr
  }
}

// 安全的日期时间格式化函数
const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    
    // 使用本地时区的年月日时分秒，避免UTC转换
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    return dateStr
  }
}

// 删除项目
const deleteItem = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除材料"${row.MaterialName}"的价格信息吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        appendToBody: true,
        lockScroll: false,
        center: true,
        customClass: 'delete-confirm-dialog'
      }
    )

    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const response = await axios.delete(`/admin/material-prices/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      ElMessage.success('删除成功')
      fetchData()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitting.value = true

    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }

    let response
    if (editingItem.value) {
      response = await axios.put(`/admin/material-prices/${editingItem.value.ID}`, formData, config)
    } else {
      response = await axios.post('/admin/material-prices', formData, config)
    }

    if (response.data.success) {
      ElMessage.success(editingItem.value ? '更新成功' : '新增成功')
      showAddDialog.value = false
      resetForm()
      fetchData()
    } else {
      ElMessage.error(response.data.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  editingItem.value = null
  Object.assign(formData, {
    MaterialName: '',
    UnitPrice: null,
    Supplier: '',
    Remarks: '',
    EffectiveDate: null
  })
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 文件上传处理
const handleFileChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // 先尝试按列名解析（支持中文列名）
      let jsonData = XLSX.utils.sheet_to_json(worksheet)
      let parsedData = []

      if (jsonData.length > 0) {
        // 检查是否有中文列名
        const firstRow = jsonData[0]
        const hasChineseHeaders = firstRow['材料名称'] !== undefined ||
                                 firstRow['MaterialName'] !== undefined

        if (hasChineseHeaders) {
          // 使用列名解析
          parsedData = jsonData.map(row => ({
            MaterialName: String(row['材料名称'] || row['MaterialName'] || '').trim(),
            UnitPrice: row['单价'] || row['UnitPrice'] ? parseFloat(row['单价'] || row['UnitPrice']) : null,
            Supplier: String(row['供应商'] || row['Supplier'] || '').trim(),
            Remarks: String(row['备注'] || row['Remarks'] || '').trim()
          })).filter(item => item.MaterialName) // 过滤掉没有材料名称的行
        } else {
          // 如果没有列名，回退到数组索引解析
          const arrayData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          for (let i = 1; i < arrayData.length; i++) {
            const row = arrayData[i]
            if (row.length >= 1 && row[0]) {
              parsedData.push({
                MaterialName: String(row[0]).trim(),
                UnitPrice: row[1] ? parseFloat(row[1]) : null,
                Supplier: String(row[2] || '').trim(),
                Remarks: String(row[3] || '').trim()
              })
            }
          }
        }
      }

      previewData.value = parsedData
      ElMessage.success(`成功解析 ${parsedData.length} 条数据`)
    } catch (error) {
      ElMessage.error('文件解析失败，请检查文件格式')
    }
  }
  reader.readAsArrayBuffer(file.raw)
}

// 文件数量超限处理
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

// 确认导入
const confirmImport = async () => {
  if (previewData.value.length === 0) {
    ElMessage.warning('没有可导入的数据')
    return
  }

  importing.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const response = await axios.post('/admin/material-prices/import',
      { data: previewData.value },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.data.success) {
      ElMessage.success(`成功导入 ${response.data.data.imported} 条数据`)
      showImportDialog.value = false
      cancelImport()
      fetchData()
    } else {
      ElMessage.error(response.data.message || '导入失败')
    }
  } catch (error) {
    ElMessage.error('导入失败')
  } finally {
    importing.value = false
  }
}

// 取消导入
const cancelImport = () => {
  showImportDialog.value = false
  previewData.value = []
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

// 加载筛选选项
const loadFilterOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      return
    }

    const response = await axios.get('/admin/material-prices/filter-options', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      filterOptions.materialNames = response.data.data.materialNames
      filterOptions.suppliers = response.data.data.suppliers
    } else {
      ElMessage.error('加载筛选选项失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('加载筛选选项失败')
  }
}

// 重置导出表单
const resetExportForm = () => {
  exportForm.materialName = ''
  exportForm.supplier = ''
  exportForm.isActive = ''
  exportForm.minPrice = null
  exportForm.maxPrice = null
}

// 打开导出对话框
const openExportDialog = async () => {
  showExportDialog.value = true
  await loadFilterOptions()
}

// 确认导出
const confirmExport = async () => {
  await exportData(exportForm)
  showExportDialog.value = false
}



// 导出数据
const exportData = async (filters = {}) => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      return
    }

    ElMessage.info('正在导出数据...')

    // 构建查询参数
    const params = new URLSearchParams()
    if (filters.materialName) {
      params.append('materialName', filters.materialName)
    }
    if (filters.supplier) {
      params.append('supplier', filters.supplier)
    }
    if (filters.isActive !== '' && filters.isActive !== null && filters.isActive !== undefined) {
      params.append('isActive', filters.isActive)
    }
    if (filters.minPrice !== null && filters.minPrice !== undefined) {
      params.append('minPrice', filters.minPrice)
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
      params.append('maxPrice', filters.maxPrice)
    }

    const queryString = params.toString()
    const url = `/admin/material-prices/export${queryString ? '?' + queryString : ''}`

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      // 准备导出数据
      const exportData = response.data.data.map(item => ({
        '材料名称': item.MaterialName,
        '单价': item.UnitPrice || '',
        '供应商': item.Supplier || '',
        '备注': item.Remarks || '',
        '生效日期': formatDateTime(item.EffectiveDate),
        '创建时间': formatDateTime(item.CreatedDate),
        '更新时间': formatDateTime(item.UpdatedDate),
        '版本': item.Version,
        '状态': item.IsActive ? '有效' : '无效'
      }))

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)

      // 设置列宽
      const colWidths = [
        { wch: 30 }, // 材料名称
        { wch: 12 }, // 单价
        { wch: 20 }, // 供应商
        { wch: 35 }, // 备注
        { wch: 18 }, // 生效日期
        { wch: 18 }, // 创建时间
        { wch: 18 }, // 更新时间
        { wch: 8 },  // 版本
        { wch: 10 }  // 状态
      ]
      ws['!cols'] = colWidths

      // 设置行高
      const rowHeights = []
      // 标题行高度
      rowHeights[0] = { hpt: 25 }
      // 数据行高度
      for (let i = 1; i <= exportData.length; i++) {
        rowHeights[i] = { hpt: 20 }
      }
      ws['!rows'] = rowHeights

      // 美化表格样式
      const range = XLSX.utils.decode_range(ws['!ref'])

      // 定义样式 - 参考投诉历史记录的样式
      const headerStyle = {
        font: { name: 'Microsoft YaHei', sz: 11, bold: true, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: 'D9D9D9' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }

      const dataStyle = {
        font: { name: 'Microsoft YaHei', sz: 10 },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0D0D0' } },
          bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
          left: { style: 'thin', color: { rgb: 'D0D0D0' } },
          right: { style: 'thin', color: { rgb: 'D0D0D0' } }
        }
      }

      const evenRowStyle = {
        ...dataStyle,
        fill: { fgColor: { rgb: 'F8F9FA' } }
      }

      const oddRowStyle = {
        ...dataStyle,
        fill: { fgColor: { rgb: 'FFFFFF' } }
      }

      // 应用样式
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          if (!ws[cellAddress]) continue

          if (R === 0) {
            // 标题行样式
            ws[cellAddress].s = headerStyle
          } else {
            // 数据行样式 - 隔行变色
            ws[cellAddress].s = R % 2 === 0 ? evenRowStyle : oddRowStyle

            // 特殊列对齐
            if (C === 1) { // 单价列右对齐
              ws[cellAddress].s.alignment = { ...ws[cellAddress].s.alignment, horizontal: 'right' }
            } else if (C === 7 || C === 8) { // 版本和状态列居中
              ws[cellAddress].s.alignment = { ...ws[cellAddress].s.alignment, horizontal: 'center' }
            }
          }
        }
      }

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '材料价格数据')

      // 生成文件名 - 参考投诉记录的命名格式
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2) // 取年份后两位
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')

      const dateStr = `${year}${month}${day}`
      const timeStamp = `${hours}${minutes}${seconds}`
      let fileName = `材料价格数据_${dateStr}${timeStamp}.xlsx`

      // 如果有筛选条件，添加到文件名
      if (filters.materialName || filters.supplier || filters.isActive !== '' || filters.minPrice || filters.maxPrice) {
        fileName = `材料价格数据_筛选结果_${dateStr}${timeStamp}.xlsx`
      }

      // 导出文件
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      saveAs(blob, fileName)

      ElMessage.success(`成功导出 ${exportData.length} 条记录`)
    } else {
      ElMessage.error('导出失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 导出历史数据
const exportHistory = async () => {
  if (historyData.value.length === 0) {
    ElMessage.warning('没有历史数据可导出')
    return
  }

  try {
    // 准备导出数据
    const exportData = historyData.value.map(item => ({
      '版本': `v${item.Version}`,
      '材料名称': item.MaterialName,
      '供应商': item.Supplier || '',
      '单价': item.UnitPrice,
      '备注': item.Remarks || '',
      '生效日期': formatDateTime(item.EffectiveDate),
      '失效日期': item.ExpiryDate ? formatDateTime(item.ExpiryDate) : '当前有效',
      '状态': item.IsActive ? '当前价格' : '历史价格',
      '操作人': item.UpdatedBy || ''
    }))

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 版本
      { wch: 25 }, // 材料名称
      { wch: 20 }, // 供应商
      { wch: 12 }, // 单价
      { wch: 30 }, // 备注
      { wch: 20 }, // 生效日期
      { wch: 20 }, // 失效日期
      { wch: 12 }, // 状态
      { wch: 15 }  // 操作人
    ]
    worksheet['!cols'] = colWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, '价格历史')

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 下载文件
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${historyTitle.value.replace(/[^\w\s-]/g, '')}_历史记录_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    ElMessage.success('历史数据导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 下载导入模板
const downloadTemplate = () => {
  try {
    // 创建模板数据
    const templateData = [
      {
        '材料名称': '铜版纸',
        '单价': 8.50,
        '供应商': '供应商A',
        '备注': '示例数据，请删除此行后填写实际数据'
      },
      {
        '材料名称': '胶版纸',
        '单价': '',
        '供应商': '供应商B',
        '备注': '单价可以为空'
      },
      {
        '材料名称': '不干胶',
        '单价': 12.00,
        '供应商': '',
        '备注': '供应商可以为空'
      }
    ]

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(templateData)

    // 设置列宽
    const colWidths = [
      { wch: 25 }, // 材料名称
      { wch: 15 }, // 单价
      { wch: 20 }, // 供应商
      { wch: 30 }  // 备注
    ]
    worksheet['!cols'] = colWidths

    // 设置表头样式（如果支持）
    const range = XLSX.utils.decode_range(worksheet['!ref'])
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C })
      if (!worksheet[address]) continue
      worksheet[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "EEEEEE" } }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, '材料价格导入模板')

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 下载文件
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `材料价格导入模板_${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    ElMessage.success('模板下载成功')
  } catch (error) {
    ElMessage.error('模板下载失败')
  }
}
</script>

<style scoped>
.material-price-container {
  background: #f5f5f5;
  min-height: 100%;
  height: auto;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 搜索区域 */
.search-section {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-form {
  margin: 0;
}

/* 表格区域 */
.table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.price-text {
  font-weight: 600;
  color: #67C23A;
}

/* 分页 */
.pagination-wrapper {
  padding: 20px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #EBEEF5;
}

/* 导入区域 */
.import-section {
  padding: 0;
}

.preview-section {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.preview-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
}

.preview-info {
  margin: 12px 0 0 0;
  font-size: 13px;
  color: #606266;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .search-form {
    flex-direction: column;
  }

  .search-form .el-form-item {
    margin-right: 0;
    margin-bottom: 16px;
  }
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 0;
}

:deep(.el-table th) {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table td) {
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-table tr:hover > td) {
  background: #f5f7fa;
}

/* 按钮样式 */
:deep(.el-button--small) {
  padding: 5px 12px;
  font-size: 12px;
}

/* 对话框样式 */
:deep(.el-dialog__header) {
  padding: 20px 20px 10px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 10px 20px 20px;
  border-top: 1px solid #f0f0f0;
}

/* 上传组件样式 */
:deep(.el-upload-dragger) {
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.3s ease;
}

:deep(.el-upload-dragger:hover) {
  border-color: #409EFF;
  background: #f0f9ff;
}

/* 表单样式 */
:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-input-number .el-input__wrapper) {
  border-radius: 6px;
}

/* 历史记录样式 */
.history-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.history-header h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.history-subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

/* 历史表格样式 */
:deep(.el-dialog .el-table) {
  font-size: 13px;
}

:deep(.el-dialog .el-table th) {
  background: #f8f9fa;
  font-size: 12px;
}

:deep(.el-dialog .el-table .price-text) {
  font-weight: 600;
  color: #67C23A;
}

/* 防止对话框导致页面元素被挤压的样式 */
/* 编辑对话框样式 */
.edit-dialog :deep(.el-dialog) {
  margin: 0 auto !important;
  transform: translateY(0) !important;
}

/* 历史记录对话框样式 */
.history-dialog :deep(.el-dialog) {
  margin: 0 auto !important;
  transform: translateY(0) !important;
}

/* 确保删除确认对话框不影响页面布局 */
:deep(.delete-confirm-dialog.el-message-box) {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 2001 !important;
  margin: 0 !important;
}

/* 防止删除确认对话框导致页面滚动条变化 */
:deep(.el-popup-parent--hidden) {
  padding-right: 0 !important;
  overflow: visible !important;
}

/* 通用消息框样式 */
:deep(.el-message-box) {
  position: fixed !important;
  margin: 0 !important;
}

/* 消息框遮罩层样式 */
:deep(.el-overlay) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 2000 !important;
}
</style>
