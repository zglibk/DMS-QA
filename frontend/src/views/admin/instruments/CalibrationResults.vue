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
              v-model="searchForm.calibrationAgency" 
              placeholder="请输入校准机构"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="证书编号">
            <el-input 
              v-model="searchForm.certificateNumber" 
              placeholder="请输入证书编号"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="校准结果">
            <el-select 
              v-model="searchForm.calibrationResult" 
              placeholder="请选择校准结果"
              clearable
              style="width: 200px"
            >
              <el-option label="偏差在允许范围内" value="偏差在允许范围内" />
              <el-option label="偏差超出允许范围" value="偏差超出允许范围" />
              <el-option label="需修正使用" value="需修正使用" />
              <el-option label="建议停用" value="建议停用" />
              <el-option label="合格" value="合格" />
              <el-option label="不合格" value="不合格" />
              <el-option label="限制使用" value="限制使用" />
            </el-select>
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
            </div>
          </div>
        </template>

        <el-table 
          :data="calibrationList" 
          :loading="loading"
          stripe
          border
          style="width: 100%"
          header-align="center"
        >
          <el-table-column prop="InstrumentCode" label="仪器编号" width="120" align="center" />
          <el-table-column prop="ManagementCode" label="管理编号" width="120" align="center" />
          <el-table-column prop="InstrumentName" label="仪器名称" min-width="150" header-align="center" />
          <el-table-column prop="CalibrationDate" label="校准日期" width="110" align="center">
            <template #default="{ row }">
              {{ formatDate(row.CalibrationDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="CalibrationAgency" label="校准机构" min-width="150" header-align="center" />
          <el-table-column prop="CertificateNumber" label="证书编号" width="150" header-align="center" />
          <el-table-column prop="CalibrationResult" label="校准结果" width="100" align="center">
            <template #default="{ row }">
              <el-tag 
                :type="getResultType(row.CalibrationResult)"
                size="small"
              >
                {{ row.CalibrationResult }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ExpiryDate" label="有效期至" width="110" align="center">
            <template #default="{ row }">
              {{ formatDate(row.ExpiryDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="NextCalibrationDate" label="下次校准" width="110" align="center">
            <template #default="{ row }">
              {{ formatDate(row.NextCalibrationDate) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" align="center">
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
      width="750px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
      class="calibration-dialog"
      top="5vh"
    >
      <el-form 
        :model="calibrationForm" 
        :rules="formRules" 
        ref="formRef"
        label-width="120px"
        class="compact-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选择仪器" prop="instrumentID">
              <el-select 
                v-model="calibrationForm.instrumentID" 
                placeholder="请选择仪器"
                filterable
                style="width: 100%"
                :disabled="isEdit"
                @change="handleInstrumentChange"
              >
                <el-option 
                  v-for="instrument in instruments" 
                  :key="instrument.ID" 
                  :label="`${instrument.ManagementCode} - ${instrument.InstrumentName}`" 
                  :value="instrument.ID"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检定结果编号" prop="resultCode">
              <el-input 
                v-model="calibrationForm.resultCode" 
                placeholder="系统自动生成" 
                disabled
                readonly
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="校准日期" prop="calibrationDate">
              <el-date-picker
                v-model="calibrationForm.calibrationDate"
                type="date"
                placeholder="请选择校准日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="校准机构" prop="calibrationAgency">
              <el-input v-model="calibrationForm.calibrationAgency" placeholder="请输入校准机构" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="证书编号" prop="certificateNumber">
              <el-input v-model="calibrationForm.certificateNumber" placeholder="请输入证书编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="校准结果" prop="calibrationResult">
              <el-select v-model="calibrationForm.calibrationResult" placeholder="请选择校准结果" style="width: 100%">
                <!-- 校准结果选项（区别于检定结果） -->
                <el-option label="偏差在允许范围内" value="偏差在允许范围内" />
                <el-option label="偏差超出允许范围" value="偏差超出允许范围" />
                <el-option label="需修正使用" value="需修正使用" />
                <el-option label="建议停用" value="建议停用" />
                <!-- 保留原有检定结果选项（兼容性） -->
                <el-option label="合格" value="合格" />
                <el-option label="不合格" value="不合格" />
                <el-option label="限制使用" value="限制使用" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="5">
          <el-col :span="8">
            <el-form-item label="校准周期" prop="calibrationCycle">
              <el-input-number 
                v-model="calibrationForm.calibrationCycle" 
                :min="1"
                :max="120"
                placeholder="请输入校准周期"
                style="width: 100%"
              >
                <template #append>月</template>
              </el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="有效期至" prop="expiryDate">
              <el-date-picker
                v-model="calibrationForm.expiryDate"
                type="date"
                placeholder="自动计算"
                style="width: 100%"
                disabled
                readonly
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="下次校准日期" prop="nextCalibrationDate">
              <el-date-picker
                v-model="calibrationForm.nextCalibrationDate"
                type="date"
                placeholder="自动计算"
                style="width: 100%"
                disabled
                readonly
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="10">
            <el-form-item label="校准费用" prop="calibrationCost">
              <el-input-number 
                v-model="calibrationForm.calibrationCost" 
                :precision="2"
                :min="0"
                placeholder="请输入校准费用"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="14">
            <el-form-item label="校准标准" prop="calibrationStandard">
              <el-input 
                v-model="calibrationForm.calibrationStandard" 
                placeholder="请输入校准标准"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="环境条件" prop="environmentalConditions">
              <el-input 
                v-model="calibrationForm.environmentalConditions" 
                type="textarea" 
                :rows="2"
                placeholder="请输入环境条件"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发现问题" prop="issues">
              <el-input 
                v-model="calibrationForm.issues" 
                type="textarea" 
                :rows="2"
                placeholder="请输入发现的问题"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="建议" prop="recommendations">
              <el-input 
                v-model="calibrationForm.recommendations" 
                type="textarea" 
                :rows="2"
                placeholder="请输入建议"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备注" prop="remarks">
              <el-input 
                v-model="calibrationForm.remarks" 
                type="textarea" 
                :rows="2"
                placeholder="请输入备注信息"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="校准数据" prop="calibrationData">
          <el-input 
            v-model="calibrationForm.calibrationData" 
            type="textarea" 
            :rows="2"
            placeholder="请输入校准数据"
          />
        </el-form-item>
        <el-form-item label="证书文件" prop="certificateFile">
          <div class="certificate-upload-wrapper">
            <!-- 未选择仪器时显示的禁用按钮 -->
            <el-button 
              v-if="!calibrationForm.instrumentID" 
              type="primary" 
              @click="checkInstrumentBeforeUpload"
            >
              <el-icon><Upload /></el-icon>
              选择证书
            </el-button>
            <!-- 已选择仪器时显示正常的上传组件 -->
            <el-upload
              v-else
              ref="uploadRef"
              :auto-upload="false"
              :on-change="handleFileChange"
              :on-remove="handleRemove"
              :before-upload="beforeUpload"
              :file-list="fileList"
              :limit="1"
              :on-exceed="handleExceed"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon>
                选择证书
              </el-button>
            </el-upload>
            <div class="el-upload__tip">
              支持 PDF、JPG、PNG 格式，文件大小不超过 10MB
            </div>
          </div>
          <!-- 文件预览区域（新选择的文件） -->
          <div v-if="previewFile" class="certificate-file-item">
            <el-icon :size="18" color="#409EFF"><Document /></el-icon>
            <span class="file-name" @click="handlePreviewFile">{{ previewFile.name }}</span>
            <span class="file-meta">({{ formatFileSize(previewFile.size) }} · 待上传)</span>
            <div class="file-actions">
              <el-button type="primary" size="small" @click="handlePreviewFile" link>
                <el-icon><View /></el-icon>预览
              </el-button>
              <el-button type="danger" size="small" @click="handleRemovePreview" link>
                <el-icon><Delete /></el-icon>移除
              </el-button>
            </div>
          </div>
          <!-- 显示已上传到服务器的文件信息（编辑时） -->
          <div v-if="calibrationForm.certificateFile && !previewFile && !fileList.length" class="certificate-file-item uploaded">
            <el-icon :size="18" color="#67C23A"><Document /></el-icon>
            <span class="file-name" @click="handleViewExistingFile">{{ calibrationForm.certificateFile }}</span>
            <span class="file-meta">(已上传)</span>
            <div class="file-actions">
              <el-button type="primary" size="small" @click="handleViewExistingFile" link>
                <el-icon><View /></el-icon>预览
              </el-button>
              <el-button type="danger" size="small" @click="handleRemoveExisting" link>
                <el-icon><Delete /></el-icon>移除
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            {{ submitLoading ? '提交中...' : '确定' }}
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
          <!-- 基本信息 -->
          <el-descriptions-item label="检定结果编号">{{ currentCalibration.ResultCode || '无' }}</el-descriptions-item>
          <el-descriptions-item label="仪器编号">{{ currentCalibration.InstrumentCode || '无' }}</el-descriptions-item>
          <el-descriptions-item label="管理编号">{{ currentCalibration.ManagementCode || '无' }}</el-descriptions-item>
          <el-descriptions-item label="仪器名称">{{ currentCalibration.InstrumentName || '无' }}</el-descriptions-item>
          
          <!-- 校准信息 -->
          <el-descriptions-item label="校准日期">{{ formatDate(currentCalibration.CalibrationDate) }}</el-descriptions-item>
          <el-descriptions-item label="校准机构">{{ currentCalibration.CalibrationAgency || currentCalibration.CalibrationOrganization || '无' }}</el-descriptions-item>
          <el-descriptions-item label="证书编号">{{ currentCalibration.CertificateNumber || '无' }}</el-descriptions-item>
          <el-descriptions-item label="校准标准">{{ currentCalibration.CalibrationStandard || '无' }}</el-descriptions-item>
          <el-descriptions-item label="校准结果">
            <el-tag :type="getResultType(currentCalibration.CalibrationResult)">
              {{ currentCalibration.CalibrationResult || '无' }}
            </el-tag>
          </el-descriptions-item>
          
          <!-- 日期信息 -->
          <el-descriptions-item label="有效期至">{{ formatDate(currentCalibration.ExpiryDate || currentCalibration.ValidUntil) }}</el-descriptions-item>
          <el-descriptions-item label="下次校准">{{ formatDate(currentCalibration.NextCalibrationDate) }}</el-descriptions-item>
          
          <!-- 校准周期信息 -->
          <el-descriptions-item label="校准周期">{{ currentCalibration.CalibrationCycle ? `${currentCalibration.CalibrationCycle}个月` : '未设置' }}</el-descriptions-item>
          
          <!-- 费用信息 -->
          <el-descriptions-item label="校准费用">{{ currentCalibration.CalibrationCost ? `¥${currentCalibration.CalibrationCost}` : '未填写' }}</el-descriptions-item>
          
          <!-- 证书文件 -->
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
          
          <!-- 环境条件 -->
          <el-descriptions-item label="环境条件" :span="2">{{ currentCalibration.EnvironmentalConditions || '无' }}</el-descriptions-item>
          
          <!-- 校准数据详情 -->
          <el-descriptions-item label="校准数据详情" :span="2">
            <div v-if="currentCalibration.CalibrationData" class="calibration-data">
              <pre>{{ currentCalibration.CalibrationData }}</pre>
            </div>
            <span v-else>无</span>
          </el-descriptions-item>
          
          <!-- 发现问题 -->
          <el-descriptions-item label="发现问题" :span="2">{{ currentCalibration.Issues || '无' }}</el-descriptions-item>
          
          <!-- 建议 -->
          <el-descriptions-item label="建议" :span="2">{{ currentCalibration.Recommendations || '无' }}</el-descriptions-item>
          
          <!-- 备注 -->
          <el-descriptions-item label="备注" :span="2">{{ currentCalibration.Remarks || currentCalibration.Notes || '无' }}</el-descriptions-item>
          
          <!-- 创建信息 -->
          <el-descriptions-item label="创建人">{{ currentCalibration.CreatorName || '无' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentCalibration.CreatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(currentCalibration.UpdatedAt) }}</el-descriptions-item>
        </el-descriptions>
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
 * 4. 支持按多条件筛选
 */

import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  Refresh, 
  Document, 
  Plus, 
  Upload,
  View,
  Delete
} from '@element-plus/icons-vue'
import { instrumentApi } from '@/api/instruments'
import { useUserStore } from '@/store/user'

// 用户信息
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const uploadRef = ref()

// 搜索表单
const searchForm = reactive({
  instrumentName: '',
  managementCode: '',
  calibrationAgency: '',
  certificateNumber: '',
  calibrationResult: '',
  calibrationDateRange: []
})

// 数据列表
const calibrationList = ref([])
const instruments = ref([])
const currentCalibration = ref(null)

// 分页数据
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 校准表单
const calibrationForm = reactive({
  CalibrationID: null,
  instrumentID: '',
  resultCode: '',              // 检定结果编号
  calibrationDate: '',
  calibrationAgency: '',
  certificateNumber: '',
  calibrationStandard: '',
  calibrationResult: '',
  expiryDate: '',
  nextCalibrationDate: '',
  calibrationCost: null,
  calibrationCycle: 12,        // 默认校准周期为12个月（前端计算用）
  calibrationData: '',         // 校准数据
  issues: '',                  // 发现问题
  recommendations: '',         // 建议
  environmentalConditions: '',
  certificateFile: '',
  remarks: ''
})

// 文件上传
const fileList = ref([])
const uploadLoading = ref(false)
const previewFile = ref(null)           // 待上传的文件对象
const previewFileUrl = ref('')          // 本地预览URL

// 表单验证规则
const formRules = {
  instrumentID: [
    { required: true, message: '请选择仪器', trigger: 'change' }
  ],
  calibrationDate: [
    { required: true, message: '请选择校准日期', trigger: 'change' }
  ],
  calibrationAgency: [
    { required: true, message: '请输入校准机构', trigger: 'blur' }
  ],
  certificateNumber: [
    { required: true, message: '请输入证书编号', trigger: 'blur' }
  ],
  calibrationStandard: [
    { required: true, message: '请输入校准标准', trigger: 'blur' }
  ],
  calibrationResult: [
    { required: true, message: '请选择校准结果', trigger: 'change' }
  ],
  expiryDate: [
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
    // 校准结果类型
    '偏差在允许范围内': 'success',
    '偏差超出允许范围': 'warning',
    '需修正使用': 'warning',
    '建议停用': 'danger',
    // 检定结果类型（兼容性保留）
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
  return `/api/instruments/files/certificate/${filename}`
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
      instrumentName: searchForm.instrumentName,
      managementCode: searchForm.managementCode,
      calibrationAgency: searchForm.calibrationAgency,
      certificateNumber: searchForm.certificateNumber,
      calibrationResult: searchForm.calibrationResult,
      startDate: searchForm.calibrationDateRange && searchForm.calibrationDateRange[0] ? searchForm.calibrationDateRange[0] : '',
      endDate: searchForm.calibrationDateRange && searchForm.calibrationDateRange[1] ? searchForm.calibrationDateRange[1] : ''
    }
    
    // 调试日志：检查搜索参数
    console.log('搜索参数:', params)
    if (params.certificateNumber) {
      console.log('证书编号搜索参数:', params.certificateNumber)
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
 * 获取仪器列表（用于校准结果登记）
 * @param {boolean} includeAll - 是否包含所有仪器（编辑时需要）
 */
/**
 * 获取仪器列表
 * @param {boolean} includeAll - 是否包含所有仪器（现在始终获取所有仪器，支持重复校准）
 */
async function getInstruments(includeAll = false) {
  try {
    // 始终获取所有仪器，支持仪器重复校准
    const response = await instrumentApi.getInstruments({ page: 1, size: 1000 })
    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      instruments.value = response.data.data.list.filter(item => 
        item && item.ID && (item.InstrumentName || item.ManagementCode)
      )
    } else {
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
    calibrationAgency: '',
    certificateNumber: '',
    calibrationResult: '',
    calibrationDateRange: []
  })
  pagination.page = 1
  getCalibrationList()
}

/**
 * 新增校准结果
 */
async function handleAdd() {
  isEdit.value = false
  
  // 第一步：完全清空对话框中可能的加载数据
  // 清空仪器列表，避免显示之前的数据
  instruments.value = []
  // 清空文件列表
  fileList.value = []
  
  // 第二步：完全重置表单数据，确保没有任何残留
  Object.assign(calibrationForm, {
    CalibrationID: null,
    instrumentID: '',
    resultCode: '',
    calibrationDate: '',
    calibrationAgency: '',
    certificateNumber: '',
    calibrationStandard: '',
    calibrationResult: '',
    expiryDate: '',
    nextCalibrationDate: '',
    calibrationCost: null,
    calibrationCycle: 12,
    calibrationData: '',
    issues: '',
    recommendations: '',
    environmentalConditions: '',
    certificateFile: '',
    remarks: ''
  })
  
  // 清空文件相关状态
  fileList.value = []
  previewFile.value = null
  if (previewFileUrl.value) {
    URL.revokeObjectURL(previewFileUrl.value)
  }
  previewFileUrl.value = ''
  
  // 第三步：在DOM更新后进行初始化
  nextTick(async () => {
    // 清除表单验证状态
    formRef.value?.resetFields()
    formRef.value?.clearValidate()
    
    // 获取可校准的仪器列表
    getInstruments(false)
    
    // 自动生成ResultCode编号
    try {
      const response = await instrumentApi.generateResultCode()
      if (response.data && response.data.code === 200) {
        calibrationForm.resultCode = response.data.data.resultCode
      }
    } catch (error) {
      console.error('生成校准结果编号失败:', error)
      ElMessage.warning('自动生成编号失败，请手动输入')
    }
    
    dialogVisible.value = true
  })
}

/**
 * 编辑校准结果
 * @param {Object} row - 校准结果数据
 */
function handleEdit(row) {
  isEdit.value = true
  getInstruments(true) // 编辑时获取所有仪器
  
  // 获取证书文件名（优先使用 CertificateFile，兼容 Attachments）
  const certificateFileName = row.CertificateFile || row.Attachments || ''
  
  Object.assign(calibrationForm, {
    CalibrationID: row.ID,
    instrumentID: row.InstrumentID,
    resultCode: row.ResultCode,
    calibrationDate: row.CalibrationDate,
    calibrationAgency: row.CalibrationAgency || row.CalibrationOrganization,
    certificateNumber: row.CertificateNumber,
    calibrationResult: row.CalibrationResult,
    expiryDate: row.ExpiryDate || row.ValidUntil,
    nextCalibrationDate: row.NextCalibrationDate,
    calibrationCost: row.CalibrationCost,
    calibrationCycle: row.CalibrationCycle,
    calibrationStandard: row.CalibrationStandard,
    environmentalConditions: row.EnvironmentalConditions,
    remarks: row.Remarks || row.Notes,
    certificateFile: certificateFileName
  })
  
  // 清空预览文件（编辑时显示已上传的文件）
  previewFile.value = null
  previewFileUrl.value = ''
  fileList.value = []
  
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
 * 查看证书（在新标签页打开）
 * @param {Object} row - 校准结果数据
 */
function handleViewCertificate(row) {
  if (!row.CertificateFile) {
    ElMessage.warning('该记录未上传证书文件')
    return
  }
  openCertificateInNewTab(row.CertificateFile)
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
    
    await instrumentApi.deleteCalibrationResult(row.ID)
    ElMessage.success('删除成功')
    getCalibrationList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

/**
 * 下载证书
 * @param {Object} calibration - 校准结果数据
 */
async function downloadCertificate(calibration) {
  try {
    const url = getCertificateUrl(calibration.CertificateFile)
    const token = localStorage.getItem('token')
    
    // 使用fetch带token获取文件
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('获取文件失败')
    }
    
    // 获取文件blob并下载
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = calibration.CertificateFile
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 释放blob URL
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('下载证书失败:', error)
    ElMessage.error('下载证书失败，请重试')
  }
}

/**
 * 仪器选择变化处理
 * @param {number} instrumentId - 仪器ID
 */
function handleInstrumentChange(instrumentId) {
  // 可以根据选择的仪器自动填充一些信息
}

/**
 * 检查是否已选择仪器（上传证书前）
 */
function checkInstrumentBeforeUpload() {
  ElMessage.warning('请先选择要登记的仪器')
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
 * 文件选择变化处理（本地预览模式）
 * @param {Object} file - 文件对象
 * @param {Array} fileListData - 文件列表
 */
function handleFileChange(file, fileListData) {
  // 验证文件
  if (!beforeUpload(file.raw)) {
    // 验证失败，从列表中移除
    fileList.value = []
    return
  }
  
  // 保存文件对象用于后续上传
  previewFile.value = file.raw
  
  // 创建本地预览URL
  if (previewFileUrl.value) {
    URL.revokeObjectURL(previewFileUrl.value)
  }
  previewFileUrl.value = URL.createObjectURL(file.raw)
  
  // 清空已上传的文件名（因为现在是新选择的文件）
  // 更新文件列表显示
  fileList.value = []
  // 更新文件列表显示
  fileList.value = []
  
  ElMessage.success('文件已选择，点击"预览"可查看，提交时将自动上传')
}

/**
 * 预览选中的文件（在新标签页打开）
 */
function handlePreviewFile() {
  if (previewFile.value && previewFileUrl.value) {
    // 创建一个带有文件名标题的新窗口
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      const fileName = previewFile.value.name
      const isPdf = previewFile.value.type === 'application/pdf'
      
      if (isPdf) {
        // PDF 使用 iframe 嵌入
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${fileName} - 证书预览</title>
            <style>
              body { margin: 0; padding: 0; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${previewFileUrl.value}"></iframe>
          </body>
          </html>
        `)
      } else {
        // 图片直接显示
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${fileName} - 证书预览</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: #f5f5f5; }
              img { max-width: 100%; height: auto; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <img src="${previewFileUrl.value}" alt="${fileName}" />
          </body>
          </html>
        `)
      }
      newWindow.document.close()
    }
  }
}

/**
 * 预览已上传到服务器的文件（在新标签页打开）
 */
function handleViewExistingFile() {
  if (calibrationForm.certificateFile) {
    openCertificateInNewTab(calibrationForm.certificateFile)
  }
}

/**
 * 在新标签页中打开证书文件
 * @param {string} filename - 文件名
 */
async function openCertificateInNewTab(filename) {
  const url = getCertificateUrl(filename)
  const isPdfFile = filename.toLowerCase().endsWith('.pdf')
  
  try {
    // 获取token
    const token = localStorage.getItem('token')
    
    // 使用fetch带token获取文件
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('获取文件失败')
    }
    
    // 获取文件blob
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    // 创建一个带有文件名标题的新窗口
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      if (isPdfFile) {
        // PDF 使用 iframe 嵌入
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${filename} - 证书预览</title>
            <style>
              body { margin: 0; padding: 0; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${blobUrl}"></iframe>
          </body>
          </html>
        `)
      } else {
        // 图片直接显示
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${filename} - 证书预览</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: #f5f5f5; }
              img { max-width: 100%; height: auto; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <img src="${blobUrl}" alt="${filename}" />
          </body>
          </html>
        `)
      }
      newWindow.document.close()
    }
  } catch (error) {
    console.error('预览证书失败:', error)
    ElMessage.error('预览证书失败，请重试')
  }
}

/**
 * 移除预览文件（新选择的文件）
 */
async function handleRemovePreview() {
  try {
    await ElMessageBox.confirm(
      '确定要移除已选择的证书文件吗？',
      '移除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (previewFileUrl.value) {
      URL.revokeObjectURL(previewFileUrl.value)
    }
    previewFile.value = null
    previewFileUrl.value = ''
    fileList.value = []
    ElMessage.success('已移除选择的文件')
  } catch {
    // 用户取消操作，不做任何处理
  }
}

/**
 * 文件移除处理
 * @param {Object} file - 被移除的文件
 */
function handleRemove(file) {
  handleRemovePreview()
  calibrationForm.certificateFile = ''
}

/**
 * 移除已存在的文件（编辑时）
 */
async function handleRemoveExisting() {
  try {
    await ElMessageBox.confirm(
      '确定要移除已上传的证书文件吗？提交后将从服务器删除。',
      '移除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    calibrationForm.certificateFile = ''
    ElMessage.success('已移除证书文件，提交后生效')
  } catch {
    // 用户取消操作，不做任何处理
  }
}

/**
 * 文件数量超出限制处理
 * @param {Array} files - 文件列表
 */
function handleExceed(files) {
  ElMessage.warning('只能上传一个证书文件，请先移除已有文件')
}

/**
 * 格式化文件大小
 * @param {number} bytes - 文件字节数
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
 * 上传文件到服务器
 * @returns {Promise<string|null>} 上传成功返回文件名，失败返回null
 */
async function uploadFileToServer() {
  if (!previewFile.value) {
    return null
  }
  
  try {
    uploadLoading.value = true
    
    // 创建FormData
    const formData = new FormData()
    formData.append('file', previewFile.value)
    
    // 调用API上传文件
    const response = await instrumentApi.uploadCalibrationCertificate(formData)
    
    if (response.data && response.data.code === 200) {
      const filename = response.data.data.filename || response.data.data.fileName
      return filename
    } else {
      throw new Error(response.data?.message || '上传失败')
    }
  } catch (error) {
    console.error('文件上传错误:', error)
    throw error
  } finally {
    uploadLoading.value = false
  }
}

/**
 * 提交表单
 */
async function handleSubmit() {
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    // 如果有待上传的文件，先上传文件
    if (previewFile.value) {
      try {
        const filename = await uploadFileToServer()
        if (filename) {
          calibrationForm.certificateFile = filename
          ElMessage.success('证书文件上传成功')
        }
      } catch (uploadError) {
        ElMessage.error('证书文件上传失败：' + (uploadError.message || '未知错误'))
        submitLoading.value = false
        return // 文件上传失败，中止提交
      }
    }
    
    if (isEdit.value) {
      await instrumentApi.updateCalibrationResult(calibrationForm.CalibrationID, calibrationForm)
      ElMessage.success('更新成功')
    } else {
      await instrumentApi.createCalibrationResult(calibrationForm)
      ElMessage.success('创建成功')
    }
    
    // 清理预览文件
    if (previewFileUrl.value) {
      URL.revokeObjectURL(previewFileUrl.value)
    }
    previewFile.value = null
    previewFileUrl.value = ''
    
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
 * 对话框关闭处理
 */
function handleDialogClose() {
  // 确保对话框关闭时完全重置表单
  resetForm()
  // 清空仪器列表，避免数据残留
  instruments.value = []
}

/**
 * 重置表单
 */
function resetForm() {
  // 完全重置表单对象的所有属性
  Object.assign(calibrationForm, {
    CalibrationID: null,
    instrumentID: '',
    resultCode: '',              // 添加检定结果编号字段重置
    calibrationDate: '',
    calibrationAgency: '',
    certificateNumber: '',
    calibrationResult: '',
    expiryDate: '',
    nextCalibrationDate: '',
    calibrationCost: null,
    calibrationCycle: 12,        // 重置时也设置默认校准周期为12个月
    calibrationStandard: '',
    calibrationData: '',         // 添加校准数据字段重置
    issues: '',                  // 添加发现问题字段重置
    recommendations: '',         // 添加建议字段重置
    environmentalConditions: '',
    remarks: '',
    certificateFile: ''
  })
  // 清空文件列表
  fileList.value = []
  // 清理预览文件
  if (previewFileUrl.value) {
    URL.revokeObjectURL(previewFileUrl.value)
  }
  previewFile.value = null
  previewFileUrl.value = ''
  // 重置表单验证状态
  nextTick(() => {
    formRef.value?.resetFields()
    formRef.value?.clearValidate()
  })
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

/**
 * 计算有效期至日期
 * @param {string} calibrationDate - 校准日期
 * @param {number} calibrationCycle - 校准周期（月）
 * @returns {string} 有效期至日期
 */
function calculateExpiryDate(calibrationDate, calibrationCycle) {
  if (!calibrationDate || !calibrationCycle) return ''
  
  const date = new Date(calibrationDate)
  if (isNaN(date.getTime())) return ''
  
  // 添加校准周期月数
  date.setMonth(date.getMonth() + calibrationCycle)
  
  // 格式化为 YYYY-MM-DD
  return date.toISOString().split('T')[0]
}

/**
 * 计算下次校准日期
 * @param {string} expiryDate - 有效期至日期
 * @returns {string} 下次校准日期
 */
function calculateNextCalibrationDate(expiryDate) {
  if (!expiryDate) return ''
  
  const date = new Date(expiryDate)
  if (isNaN(date.getTime())) return ''
  
  // 提前半个月（15天）
  date.setDate(date.getDate() - 15)
  
  // 格式化为 YYYY-MM-DD
  return date.toISOString().split('T')[0]
}

// 监听校准日期和校准周期变化，自动计算有效期至
watch([() => calibrationForm.calibrationDate, () => calibrationForm.calibrationCycle], 
  ([newCalibrationDate, newCalibrationCycle]) => {
    if (newCalibrationDate && newCalibrationCycle) {
      const expiryDate = calculateExpiryDate(newCalibrationDate, newCalibrationCycle)
      calibrationForm.expiryDate = expiryDate
    }
  }
)

// 监听有效期至变化，自动计算下次校准日期
watch(() => calibrationForm.expiryDate, (newExpiryDate) => {
  if (newExpiryDate) {
    const nextCalibrationDate = calculateNextCalibrationDate(newExpiryDate)
    calibrationForm.nextCalibrationDate = nextCalibrationDate
  }
})

// 组件挂载时初始化数据
onMounted(() => {
  getCalibrationList()
  // 移除初始化时的getInstruments调用，避免不必要的数据加载
  // getInstruments()
})

/**
 * 暴露给父组件的方法
 * refreshData: 刷新校准检定结果列表数据
 */
defineExpose({
  refreshData: getCalibrationList
})
</script>

<style scoped>
.calibration-container {
  padding: 20px;
}

.search-filters {
  margin-bottom: 24px;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  margin-bottom: 0;
}

.calibration-list {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-actions {
  display: flex;
  gap: 10px;
}

.dialog-footer {
  text-align: right;
}

.calibration-detail {
  padding: 10px 0;
}

.certificate-viewer {
  text-align: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 校准对话框内边距优化 */
.calibration-dialog :deep(.el-dialog__body) {
  padding: 20px 30px !important;
}

.calibration-dialog :deep(.el-dialog__header) {
  padding: 15px 30px 10px !important;
}

.calibration-dialog :deep(.el-dialog__footer) {
  padding: 10px 30px 20px !important;
}

/* 紧凑表单样式 */
.compact-form :deep(.el-form-item) {
  margin-bottom: 16px !important;
}

.compact-form :deep(.el-row) {
  margin-bottom: 0 !important;
}

/* 备用方案 - 全局样式 */
.el-dialog.calibration-dialog .el-dialog__body {
  padding: 20px 30px !important;
}

.el-dialog.calibration-dialog .el-dialog__header {
  padding: 15px 30px 10px !important;
}

.el-dialog.calibration-dialog .el-dialog__footer {
  padding: 10px 30px 20px !important;
}

/* 已上传文件信息样式 */
.uploaded-file-info {
  margin-top: 8px;
}

/* 证书上传包装器样式 */
.certificate-upload-wrapper {
  width: 100%;
}

.certificate-upload-wrapper .el-upload__tip {
  font-size: 12px;
  color: #909399;
  margin-top: 7px;
}

/* 证书文件单行样式 */
.certificate-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  background-color: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  font-size: 13px;
}

.certificate-file-item:not(.uploaded) {
  background-color: #ecf5ff;
  border-color: #d9ecff;
}

.certificate-file-item .file-name {
  color: #409EFF;
  cursor: pointer;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.certificate-file-item .file-name:hover {
  text-decoration: underline;
}

.certificate-file-item.uploaded .file-name {
  color: #67C23A;
}

.certificate-file-item .file-meta {
  color: #909399;
  font-size: 12px;
  flex-shrink: 0;
}

.certificate-file-item .file-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.certificate-file-item .file-actions .el-button {
  padding: 4px 8px;
}

.certificate-file-item .file-actions .el-icon {
  margin-right: 2px;
}
</style>