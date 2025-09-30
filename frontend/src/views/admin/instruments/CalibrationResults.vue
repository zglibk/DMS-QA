<template>
  <div class="calibration-results-container">
    <!-- 搜索筛选区域 -->
    <div class="search-filters">
      <el-card>
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item label="仪器名称">
            <el-input 
              v-model="searchForm.instrumentName" 
              placeholder="请输入仪器名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="管理编号">
            <el-input 
              v-model="searchForm.managementCode" 
              placeholder="请输入管理编号"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="校准机构">
            <el-input 
              v-model="searchForm.calibrationOrganization" 
              placeholder="请输入校准机构"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="校准日期">
            <el-date-picker
              v-model="searchForm.calibrationDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch" :loading="loading">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 校准结果列表 -->
    <div class="calibration-list">
      <el-card>
        <template #header>
          <div class="table-header">
            <span class="table-title">
              <el-icon><Document /></el-icon>
              校准检定结果
            </span>
            <div class="table-actions">
              <el-button type="primary" @click="handleAdd">
                <el-icon><Plus /></el-icon>
                登记结果
              </el-button>
              <el-button type="success" @click="handleExport" :loading="exportLoading">
                <el-icon><Download /></el-icon>
                导出数据
              </el-button>
            </div>
          </div>
        </template>

        <el-table 
          :data="calibrationList" 
          :loading="loading"
          stripe
          border
          style="width: 100%"
        >
          <el-table-column prop="ManagementCode" label="管理编号" width="120" />
          <el-table-column prop="InstrumentName" label="仪器名称" min-width="150" />
          <el-table-column prop="CalibrationDate" label="校准日期" width="110">
            <template #default="{ row }">
              {{ formatDate(row.CalibrationDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="CalibrationOrganization" label="校准机构" min-width="150" />
          <el-table-column prop="CertificateNumber" label="证书编号" width="150" />
          <el-table-column prop="CalibrationResult" label="校准结果" width="100">
            <template #default="{ row }">
              <el-tag 
                :type="getResultType(row.CalibrationResult)"
                size="small"
              >
                {{ row.CalibrationResult }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ValidUntil" label="有效期至" width="110">
            <template #default="{ row }">
              {{ formatDate(row.ValidUntil) }}
            </template>
          </el-table-column>
          <el-table-column prop="NextCalibrationDate" label="下次校准" width="110">
            <template #default="{ row }">
              {{ formatDate(row.NextCalibrationDate) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button 
                type="primary" 
                size="small" 
                @click="handleEdit(row)"
                link
              >
                编辑
              </el-button>
              <el-button 
                type="info" 
                size="small" 
                @click="handleView(row)"
                link
              >
                详情
              </el-button>
              <el-button 
                type="success" 
                size="small" 
                @click="handleViewCertificate(row)"
                link
              >
                证书
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                @click="handleDelete(row)"
                link
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog 
      :title="dialogTitle" 
      v-model="dialogVisible" 
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form 
        :model="calibrationForm" 
        :rules="formRules" 
        ref="formRef"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选择仪器" prop="InstrumentID">
              <el-select 
                v-model="calibrationForm.InstrumentID" 
                placeholder="请选择仪器"
                filterable
                style="width: 100%"
                @change="handleInstrumentChange"
              >
                <el-option 
                  v-for="instrument in instruments" 
                  :key="instrument.InstrumentID" 
                  :label="`${instrument.ManagementCode} - ${instrument.InstrumentName}`" 
                  :value="instrument.InstrumentID"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="校准日期" prop="CalibrationDate">
              <el-date-picker
                v-model="calibrationForm.CalibrationDate"
                type="date"
                placeholder="请选择校准日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="校准机构" prop="CalibrationOrganization">
              <el-input v-model="calibrationForm.CalibrationOrganization" placeholder="请输入校准机构" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="证书编号" prop="CertificateNumber">
              <el-input v-model="calibrationForm.CertificateNumber" placeholder="请输入证书编号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="校准结果" prop="CalibrationResult">
              <el-select v-model="calibrationForm.CalibrationResult" placeholder="请选择校准结果" style="width: 100%">
                <el-option label="合格" value="合格" />
                <el-option label="不合格" value="不合格" />
                <el-option label="限制使用" value="限制使用" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效期至" prop="ValidUntil">
              <el-date-picker
                v-model="calibrationForm.ValidUntil"
                type="date"
                placeholder="请选择有效期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="下次校准日期" prop="NextCalibrationDate">
              <el-date-picker
                v-model="calibrationForm.NextCalibrationDate"
                type="date"
                placeholder="请选择下次校准日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="校准费用" prop="CalibrationCost">
              <el-input-number 
                v-model="calibrationForm.CalibrationCost" 
                :precision="2"
                :min="0"
                placeholder="请输入校准费用"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="校准内容" prop="CalibrationContent">
          <el-input 
            v-model="calibrationForm.CalibrationContent" 
            type="textarea" 
            :rows="3"
            placeholder="请输入校准内容和项目"
          />
        </el-form-item>
        <el-form-item label="备注" prop="Notes">
          <el-input 
            v-model="calibrationForm.Notes" 
            type="textarea" 
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
        <el-form-item label="证书文件" prop="CertificateFile">
          <el-upload
            ref="uploadRef"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :before-upload="beforeUpload"
            :file-list="fileList"
            accept=".pdf,.jpg,.jpeg,.png"
            :limit="1"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              上传证书
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持 PDF、JPG、PNG 格式，文件大小不超过 10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog 
      title="校准结果详情" 
      v-model="detailDialogVisible" 
      width="700px"
    >
      <div class="calibration-detail" v-if="currentCalibration">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="管理编号">{{ currentCalibration.ManagementCode }}</el-descriptions-item>
          <el-descriptions-item label="仪器名称">{{ currentCalibration.InstrumentName }}</el-descriptions-item>
          <el-descriptions-item label="校准日期">{{ formatDate(currentCalibration.CalibrationDate) }}</el-descriptions-item>
          <el-descriptions-item label="校准机构">{{ currentCalibration.CalibrationOrganization }}</el-descriptions-item>
          <el-descriptions-item label="证书编号">{{ currentCalibration.CertificateNumber }}</el-descriptions-item>
          <el-descriptions-item label="校准结果">
            <el-tag :type="getResultType(currentCalibration.CalibrationResult)">
              {{ currentCalibration.CalibrationResult }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="有效期至">{{ formatDate(currentCalibration.ValidUntil) }}</el-descriptions-item>
          <el-descriptions-item label="下次校准">{{ formatDate(currentCalibration.NextCalibrationDate) }}</el-descriptions-item>
          <el-descriptions-item label="校准费用">{{ currentCalibration.CalibrationCost ? `¥${currentCalibration.CalibrationCost}` : '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="证书文件">
            <el-button 
              v-if="currentCalibration.CertificateFile" 
              type="primary" 
              size="small"
              @click="downloadCertificate(currentCalibration)"
            >
              下载证书
            </el-button>
            <span v-else>无</span>
          </el-descriptions-item>
          <el-descriptions-item label="校准内容" :span="2">{{ currentCalibration.CalibrationContent || '无' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentCalibration.Notes || '无' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentCalibration.CreatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(currentCalibration.UpdatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 证书查看对话框 -->
    <el-dialog 
      title="校准证书" 
      v-model="certificateDialogVisible" 
      width="80%"
      :close-on-click-modal="false"
    >
      <div class="certificate-viewer" v-if="currentCertificate">
        <iframe 
          v-if="isPdf(currentCertificate.CertificateFile)"
          :src="getCertificateUrl(currentCertificate.CertificateFile)" 
          width="100%" 
          height="600px"
          frameborder="0"
        ></iframe>
        <img 
          v-else
          :src="getCertificateUrl(currentCertificate.CertificateFile)" 
          style="max-width: 100%; height: auto;"
          alt="校准证书"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 校准检定结果组件
 * 
 * 功能说明：
 * 1. 第三方校准结果登记
 * 2. 校准证书文件上传和查看
 * 3. 校准结果的增删改查
 * 4. 支持按多条件筛选和导出
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  Refresh, 
  Document, 
  Plus, 
  Download,
  Upload
} from '@element-plus/icons-vue'
import { instrumentApi } from '@/api/instruments'
import { useUserStore } from '@/store/user'

// 用户信息
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const exportLoading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const certificateDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const uploadRef = ref()

// 搜索表单
const searchForm = reactive({
  instrumentName: '',
  managementCode: '',
  calibrationOrganization: '',
  calibrationDateRange: []
})

// 数据列表
const calibrationList = ref([])
const instruments = ref([])
const currentCalibration = ref(null)
const currentCertificate = ref(null)

// 分页数据
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 校准表单
const calibrationForm = reactive({
  CalibrationID: null,
  InstrumentID: '',
  CalibrationDate: '',
  CalibrationOrganization: '',
  CertificateNumber: '',
  CalibrationResult: '',
  ValidUntil: '',
  NextCalibrationDate: '',
  CalibrationCost: null,
  CalibrationContent: '',
  Notes: '',
  CertificateFile: ''
})

// 文件上传
const fileList = ref([])
const uploadUrl = ref('/api/upload/certificate')
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${userStore.token}`
}))

// 表单验证规则
const formRules = {
  InstrumentID: [
    { required: true, message: '请选择仪器', trigger: 'change' }
  ],
  CalibrationDate: [
    { required: true, message: '请选择校准日期', trigger: 'change' }
  ],
  CalibrationOrganization: [
    { required: true, message: '请输入校准机构', trigger: 'blur' }
  ],
  CertificateNumber: [
    { required: true, message: '请输入证书编号', trigger: 'blur' }
  ],
  CalibrationResult: [
    { required: true, message: '请选择校准结果', trigger: 'change' }
  ],
  ValidUntil: [
    { required: true, message: '请选择有效期', trigger: 'change' }
  ]
}

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑校准结果' : '登记校准结果')

/**
 * 获取校准结果标签类型
 * @param {string} result - 校准结果
 * @returns {string} 标签类型
 */
function getResultType(result) {
  const resultMap = {
    '合格': 'success',
    '不合格': 'danger',
    '限制使用': 'warning'
  }
  return resultMap[result] || 'info'
}

/**
 * 格式化日期
 * @param {string} date - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

/**
 * 格式化日期时间
 * @param {string} datetime - 日期时间字符串
 * @returns {string} 格式化后的日期时间
 */
function formatDateTime(datetime) {
  if (!datetime) return ''
  return new Date(datetime).toLocaleString('zh-CN')
}

/**
 * 判断是否为PDF文件
 * @param {string} filename - 文件名
 * @returns {boolean} 是否为PDF
 */
function isPdf(filename) {
  return filename && filename.toLowerCase().endsWith('.pdf')
}

/**
 * 获取证书文件URL
 * @param {string} filename - 文件名
 * @returns {string} 文件URL
 */
function getCertificateUrl(filename) {
  return `/api/files/certificate/${filename}`
}

/**
 * 获取校准结果列表
 */
async function getCalibrationList() {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm
    }
    const response = await instrumentApi.getCalibrationResults(params)
    
    // 确保返回的数据是数组，并过滤掉无效的仪器数据（防错处理）
    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      const validCalibrationList = response.data.data.list.filter(item => {
        // 检查是否有有效的仪器名称
        if (!item || !item.InstrumentName || item.InstrumentName.trim() === '') {
          console.warn('发现无效的校准结果数据，仪器名称为空:', item)
          return false
        }
        return true
      })
      
      calibrationList.value = validCalibrationList
      pagination.total = response.data.data.total || 0
      
      // 如果过滤掉了一些数据，给用户提示
      const filteredCount = response.data.data.list.length - validCalibrationList.length
      if (filteredCount > 0) {
        ElMessage.warning(`已过滤 ${filteredCount} 条无效数据`)
      }
    } else {
      console.warn('获取校准结果返回的数据格式不正确:', response.data)
      calibrationList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取校准结果失败:', error)
    ElMessage.error('获取校准结果失败：' + error.message)
    calibrationList.value = [] // 确保在错误情况下也有默认值
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

/**
 * 获取仪器列表
 */
async function getInstruments() {
  try {
    const response = await instrumentApi.getInstruments({ page: 1, size: 1000 })
    // 确保返回的数据是数组，并过滤掉无效数据
    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      instruments.value = response.data.data.list.filter(item => 
        item && item.InstrumentID && (item.InstrumentName || item.ManagementCode)
      )
    } else {
      console.warn('获取仪器列表返回的数据格式不正确:', response.data)
      instruments.value = []
    }
  } catch (error) {
    console.error('获取仪器列表失败:', error)
    ElMessage.error('获取仪器列表失败：' + error.message)
    instruments.value = [] // 确保在错误情况下也有默认值
  }
}

/**
 * 搜索处理
 */
function handleSearch() {
  pagination.page = 1
  getCalibrationList()
}

/**
 * 重置搜索
 */
function handleReset() {
  Object.assign(searchForm, {
    instrumentName: '',
    managementCode: '',
    calibrationOrganization: '',
    calibrationDateRange: []
  })
  pagination.page = 1
  getCalibrationList()
}

/**
 * 新增校准结果
 */
function handleAdd() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 编辑校准结果
 * @param {Object} row - 校准结果数据
 */
function handleEdit(row) {
  isEdit.value = true
  Object.assign(calibrationForm, row)
  // 设置文件列表
  if (row.CertificateFile) {
    fileList.value = [{
      name: row.CertificateFile,
      url: getCertificateUrl(row.CertificateFile)
    }]
  }
  dialogVisible.value = true
}

/**
 * 查看详情
 * @param {Object} row - 校准结果数据
 */
function handleView(row) {
  currentCalibration.value = row
  detailDialogVisible.value = true
}

/**
 * 查看证书
 * @param {Object} row - 校准结果数据
 */
function handleViewCertificate(row) {
  if (!row.CertificateFile) {
    ElMessage.warning('该记录未上传证书文件')
    return
  }
  currentCertificate.value = row
  certificateDialogVisible.value = true
}

/**
 * 删除校准结果
 * @param {Object} row - 校准结果数据
 */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除该校准结果记录吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await instrumentApi.deleteCalibrationResult(row.CalibrationID)
    ElMessage.success('删除成功')
    getCalibrationList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

/**
 * 导出数据
 */
async function handleExport() {
  try {
    exportLoading.value = true
    await instrumentApi.exportCalibrationResults(searchForm)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败：' + error.message)
  } finally {
    exportLoading.value = false
  }
}

/**
 * 下载证书
 * @param {Object} calibration - 校准结果数据
 */
function downloadCertificate(calibration) {
  const url = getCertificateUrl(calibration.CertificateFile)
  const link = document.createElement('a')
  link.href = url
  link.download = calibration.CertificateFile
  link.click()
}

/**
 * 仪器选择变化处理
 * @param {number} instrumentId - 仪器ID
 */
function handleInstrumentChange(instrumentId) {
  // 可以根据选择的仪器自动填充一些信息
}

/**
 * 文件上传前检查
 * @param {File} file - 上传的文件
 * @returns {boolean} 是否允许上传
 */
function beforeUpload(file) {
  const isValidType = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('只能上传 PDF、JPG、PNG 格式的文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB!')
    return false
  }
  return true
}

/**
 * 文件上传成功处理
 * @param {Object} response - 上传响应
 * @param {Object} file - 文件对象
 */
function handleUploadSuccess(response, file) {
  if (response.success) {
    calibrationForm.CertificateFile = response.data.filename
    ElMessage.success('文件上传成功')
  } else {
    ElMessage.error('文件上传失败：' + response.message)
  }
}

/**
 * 文件上传失败处理
 * @param {Error} error - 错误对象
 */
function handleUploadError(error) {
  ElMessage.error('文件上传失败：' + error.message)
}

/**
 * 提交表单
 */
async function handleSubmit() {
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    if (isEdit.value) {
      await instrumentApi.updateCalibrationResult(calibrationForm.CalibrationID, calibrationForm)
      ElMessage.success('更新成功')
    } else {
      await instrumentApi.createCalibrationResult(calibrationForm)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    getCalibrationList()
  } catch (error) {
    if (error.message) {
      ElMessage.error('操作失败：' + error.message)
    }
  } finally {
    submitLoading.value = false
  }
}

/**
 * 重置表单
 */
function resetForm() {
  Object.assign(calibrationForm, {
    CalibrationID: null,
    InstrumentID: '',
    CalibrationDate: '',
    CalibrationOrganization: '',
    CertificateNumber: '',
    CalibrationResult: '',
    ValidUntil: '',
    NextCalibrationDate: '',
    CalibrationCost: null,
    CalibrationContent: '',
    Notes: '',
    CertificateFile: ''
  })
  fileList.value = []
  formRef.value?.resetFields()
}

/**
 * 分页大小改变
 * @param {number} size - 页面大小
 */
function handleSizeChange(size) {
  pagination.size = size
  pagination.page = 1
  getCalibrationList()
}

/**
 * 当前页改变
 * @param {number} page - 当前页
 */
function handleCurrentChange(page) {
  pagination.page = page
  getCalibrationList()
}

// 组件挂载时初始化数据
onMounted(() => {
  getCalibrationList()
  getInstruments()
})
</script>

<style scoped>
.calibration-results-container {
  padding: 0;
}

/* 搜索筛选样式 */
.search-filters {
  margin-bottom: 20px;
}

.search-form {
  margin: 0;
}

/* 表格样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 8px;
}

/* 分页样式 */
.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

/* 对话框样式 */
.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 10px;
}

/* 详情样式 */
.calibration-detail {
  padding: 10px 0;
}

/* 证书查看样式 */
.certificate-viewer {
  text-align: center;
  padding: 20px 0;
}

/* 上传组件样式 */
.el-upload__tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}
</style>