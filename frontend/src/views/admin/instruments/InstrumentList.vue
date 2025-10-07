<template>
  <div class="instrument-list-container">
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
          <el-form-item label="仪器类别">
            <el-select 
              v-model="searchForm.category" 
              placeholder="请选择类别"
              clearable
              style="width: 150px"
            >
              <el-option 
                v-for="category in categories" 
                :key="category.ID" 
                :label="category.CategoryName" 
                :value="category.CategoryName"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select 
              v-model="searchForm.status" 
              placeholder="请选择状态"
              clearable
              style="width: 120px"
            >
              <el-option label="正常" value="normal" />
              <el-option label="维修中" value="maintenance" />
              <el-option label="已报废" value="retired" />
            </el-select>
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

    <!-- 仪器列表 -->
    <div class="instrument-list">
      <el-card>
        <template #header>
          <div class="table-header">
            <span class="table-title">
              <el-icon><List /></el-icon>
              仪器台账列表
            </span>
            <div class="table-actions">
              <el-button type="primary" @click="handleAdd">
                <el-icon><Plus /></el-icon>
                新增仪器
              </el-button>
              <el-button type="success" @click="handleExport" :loading="exportLoading">
                <el-icon><Download /></el-icon>
                导出数据
              </el-button>
            </div>
          </div>
        </template>

        <el-table 
          :data="instrumentList" 
          :loading="loading"
          stripe
          border
          style="width: 100%"
          :cell-style="{ 'white-space': 'nowrap' }"
        >
          <el-table-column prop="InstrumentCode" label="出厂编号" width="120">
            <template #default="{ row }">
              {{ row.InstrumentCode || '无' }}
            </template>
          </el-table-column>
          <el-table-column prop="ManagementCode" label="管理编号" width="90" align="center">
            <template #default="{ row }">
              {{ row.ManagementCode || '无' }}
            </template>
          </el-table-column>
          <el-table-column prop="InstrumentName" label="仪器名称" min-width="150" />
          <el-table-column prop="Model" label="型号规格" width="120" />
          <el-table-column prop="SerialNumber" label="序列号" width="120" />
          <el-table-column prop="CategoryName" label="类别" width="120" show-overflow-tooltip />
          <el-table-column prop="Manufacturer" label="制造商" width="120" />
          <el-table-column prop="MeasurementRange" label="量程" width="120">
            <template #default="{ row }">
              {{ row.MeasurementRange || '未设置' }}
            </template>
          </el-table-column>
          <el-table-column prop="Accuracy" label="准确度" width="120">
            <template #default="{ row }">
              {{ row.Accuracy || '未设置' }}
            </template>
          </el-table-column>
          <el-table-column prop="PurchaseDate" label="购买日期" width="110">
            <template #default="{ row }">
              {{ formatDate(row.PurchaseDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="Location" label="存放位置" width="120" />
          <el-table-column prop="ResponsiblePerson" label="责任人" width="100">
            <template #default="{ row }">
              {{ row.ResponsiblePersonName || row.ResponsiblePerson || '未指定' }}
            </template>
          </el-table-column>
          <el-table-column prop="Status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag 
                :type="getStatusType(row.Status)"
                size="small"
              >
                {{ getStatusLabel(row.Status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
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
            :page-sizes="[5, 10, 20, 50, 100]"
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
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form 
        :model="instrumentForm" 
        :rules="formRules" 
        ref="formRef"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出厂编号" prop="InstrumentCode">
              <el-input v-model="instrumentForm.InstrumentCode" placeholder="请输入出厂编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="管理编号" prop="ManagementCode">
              <el-input v-model="instrumentForm.ManagementCode" placeholder="请输入管理编号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="仪器名称" prop="InstrumentName">
              <el-input v-model="instrumentForm.InstrumentName" placeholder="请输入仪器名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="型号规格" prop="Model">
              <el-input v-model="instrumentForm.Model" placeholder="请输入型号规格" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="序列号" prop="SerialNumber">
              <el-input v-model="instrumentForm.SerialNumber" placeholder="请输入序列号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="仪器类别" prop="CategoryID">
              <el-select v-model="instrumentForm.CategoryID" placeholder="请选择仪器类别">
                <el-option
                  v-for="category in categories"
                  :key="category.ID"
                  :label="category.CategoryName"
                  :value="category.ID"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="制造商" prop="Manufacturer">
              <el-input v-model="instrumentForm.Manufacturer" placeholder="请输入制造商" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="购买日期" prop="PurchaseDate">
              <el-date-picker
                v-model="instrumentForm.PurchaseDate"
                type="date"
                placeholder="请选择购买日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="量程" prop="MeasurementRange">
              <el-input 
                v-model="instrumentForm.MeasurementRange" 
                placeholder="请输入测量量程，如：0-100℃、0-1000mm"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="准确度" prop="Accuracy">
              <el-input 
                v-model="instrumentForm.Accuracy" 
                placeholder="请输入测量准确度，如：±0.1℃、±0.01mm"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="存放位置" prop="Location">
              <el-input v-model="instrumentForm.Location" placeholder="请输入存放位置" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="责任人" prop="ResponsiblePerson">
              <el-tree-select
                v-model="instrumentForm.ResponsiblePerson"
                :data="treePersonsData"
                :render-after-expand="false"
                :show-checkbox="false"
                :check-strictly="true"
                :expand-on-click-node="false"
                :only-check-children="true"
                clearable
                filterable
                placeholder="请选择责任人"
                style="width: 100%"
                node-key="id"
                :props="{
                  label: 'label',
                  children: 'children',
                  value: 'value',
                  disabled: (data) => !data.isLeaf
                }"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态" prop="Status">
              <el-select v-model="instrumentForm.Status" placeholder="请选择状态" style="width: 100%">
                <el-option label="正常" value="正常" />
                <el-option label="维修中" value="维修中" />
                <el-option label="报废" value="报废" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="Notes">
          <el-input 
            v-model="instrumentForm.Notes" 
            type="textarea" 
            :rows="3"
            placeholder="请输入备注信息"
          />
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
      title="仪器详情" 
      v-model="detailDialogVisible" 
      width="600px"
    >
      <div class="instrument-detail" v-if="currentInstrument">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="出厂编号">{{ currentInstrument.InstrumentCode || '无' }}</el-descriptions-item>
          <el-descriptions-item label="管理编号">{{ currentInstrument.ManagementCode || '无' }}</el-descriptions-item>
          <el-descriptions-item label="仪器名称">{{ currentInstrument.InstrumentName }}</el-descriptions-item>
          <el-descriptions-item label="型号规格">{{ currentInstrument.Model }}</el-descriptions-item>
          <el-descriptions-item label="序列号">{{ currentInstrument.SerialNumber }}</el-descriptions-item>
          <el-descriptions-item label="类别">{{ currentInstrument.CategoryName }}</el-descriptions-item>
          <el-descriptions-item label="制造商">{{ currentInstrument.Manufacturer }}</el-descriptions-item>
          <el-descriptions-item label="量程">{{ currentInstrument.MeasurementRange || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="准确度">{{ currentInstrument.Accuracy || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="购买日期">{{ formatDate(currentInstrument.PurchaseDate) }}</el-descriptions-item>
          <el-descriptions-item label="存放位置">{{ currentInstrument.Location }}</el-descriptions-item>
          <el-descriptions-item label="责任人">{{ currentInstrument.ResponsiblePerson }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentInstrument.Status)">
              {{ currentInstrument.Status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentInstrument.Notes || '无' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentInstrument.CreatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(currentInstrument.UpdatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 仪器台账列表组件
 * 
 * 功能说明：
 * 1. 仪器设备的增删改查
 * 2. 支持按名称、编号、类别、状态筛选
 * 3. 支持数据导出
 * 4. 分页显示
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  Refresh, 
  List, 
  Plus, 
  Download 
} from '@element-plus/icons-vue'
import { instrumentApi } from '@/api/instruments'

// 响应式数据
const loading = ref(false)
const exportLoading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

// 搜索表单
const searchForm = reactive({
  instrumentName: '',
  managementCode: '',
  category: '',
  status: ''
})

// 仪器列表数据
const instrumentList = ref([])
const categories = ref([])
const persons = ref([])  // 新增人员列表
const currentInstrument = ref(null)

// 分页数据
const pagination = reactive({
  page: 1,
  size: 5,  // 修改默认分页数为5条/页
  total: 0
})

// 仪器表单
const instrumentForm = reactive({
  InstrumentID: null,
  InstrumentCode: '',    // 新增出厂编号字段
  ManagementCode: '',
  InstrumentName: '',
  Model: '',
  SerialNumber: '',
  CategoryID: null,      // 修改为null，确保选择器正确初始化
  Manufacturer: '',
  PurchaseDate: '',
  MeasurementRange: '',  // 新增量程字段
  Accuracy: '',          // 新增准确度字段
  Location: '',
  ResponsiblePerson: null, // 修改为null，确保树形选择器正确初始化
  Status: '正常',
  Notes: ''
})

// 表单验证规则
const formRules = {
  InstrumentName: [
    { required: true, message: '请输入仪器名称', trigger: 'blur' }
  ],
  Model: [
    { required: true, message: '请输入型号规格', trigger: 'blur' }
  ],
  CategoryID: [
    { required: true, message: '请选择仪器类别', trigger: 'change' }
  ],
  Manufacturer: [
    { required: true, message: '请输入制造商', trigger: 'blur' }
  ],
  PurchaseDate: [
    { required: true, message: '请选择购买日期', trigger: 'change' }
  ],
  Location: [
    { required: true, message: '请输入存放位置', trigger: 'blur' }
  ],
  ResponsiblePerson: [
    { required: true, message: '请选择责任人', trigger: 'change' }
  ],
  Status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

/**
 * 自定义验证器：出厂编号和管理编号至少填写其中一个
 * @param {Object} rule - 验证规则
 * @param {string} value - 当前字段值
 * @param {Function} callback - 回调函数
 */
const validateCodeRequired = (rule, value, callback) => {
  const { InstrumentCode, ManagementCode } = instrumentForm
  if (!InstrumentCode && !ManagementCode) {
    callback(new Error('出厂编号和管理编号至少需要填写其中一个'))
  } else {
    callback()
  }
}

/**
 * 自定义验证器：检查出厂编号重复性
 * @param {Object} rule - 验证规则
 * @param {string} value - 当前字段值
 * @param {Function} callback - 回调函数
 */
const validateInstrumentCode = async (rule, value, callback) => {
  // 先执行基本的必填验证
  const { InstrumentCode, ManagementCode } = instrumentForm
  if (!InstrumentCode && !ManagementCode) {
    callback(new Error('出厂编号和管理编号至少需要填写其中一个'))
    return
  }
  
  // 如果出厂编号为空，跳过重复性检查
  if (!value) {
    callback()
    return
  }
  
  // 如果是编辑模式，跳过重复性检查（因为是更新操作而不是插入操作）
  if (isEdit.value) {
    callback()
    return
  }
  
  try {
    // 调用后端接口检查重复性
    const params = {
      instrumentCode: value
    }
    
    const response = await instrumentApi.checkDuplicate(params)
    
    if (response.data && response.data.code === 200) {
      const { isDuplicate, duplicates } = response.data.data
      
      if (isDuplicate) {
        const duplicateInfo = duplicates.find(d => d.field === 'InstrumentCode')
        if (duplicateInfo) {
          callback(new Error(`出厂编号"${duplicateInfo.value}"已存在于仪器"${duplicateInfo.instrumentName}"中`))
          return
        }
      }
    }
    
    callback()
  } catch (error) {
    console.error('检查出厂编号重复性失败:', error)
    // 网络错误时不阻止提交，只在控制台记录错误
    callback()
  }
}

/**
 * 自定义验证器：检查管理编号重复性
 * @param {Object} rule - 验证规则
 * @param {string} value - 当前字段值
 * @param {Function} callback - 回调函数
 */
const validateManagementCode = async (rule, value, callback) => {
  // 先执行基本的必填验证
  const { InstrumentCode, ManagementCode } = instrumentForm
  if (!InstrumentCode && !ManagementCode) {
    callback(new Error('出厂编号和管理编号至少需要填写其中一个'))
    return
  }
  
  // 如果管理编号为空，跳过重复性检查
  if (!value) {
    callback()
    return
  }
  
  // 如果是编辑模式，跳过重复性检查（因为是更新操作而不是插入操作）
  if (isEdit.value) {
    callback()
    return
  }
  
  try {
    // 调用后端接口检查重复性
    const params = {
      managementCode: value
    }
    
    const response = await instrumentApi.checkDuplicate(params)
    
    if (response.data && response.data.code === 200) {
      const { isDuplicate, duplicates } = response.data.data
      
      if (isDuplicate) {
        const duplicateInfo = duplicates.find(d => d.field === 'ManagementCode')
        if (duplicateInfo) {
          callback(new Error(`管理编号"${duplicateInfo.value}"已存在于仪器"${duplicateInfo.instrumentName}"中`))
          return
        }
      }
    }
    
    callback()
  } catch (error) {
    console.error('检查管理编号重复性失败:', error)
    // 网络错误时不阻止提交，只在控制台记录错误
    callback()
  }
}

// 为出厂编号和管理编号添加自定义验证
formRules.InstrumentCode = [
  { validator: validateInstrumentCode, trigger: 'blur' }
]
formRules.ManagementCode = [
  { validator: validateManagementCode, trigger: 'blur' }
]

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑仪器' : '新增仪器')

/**
 * 按部门分组的人员列表 - 树状数据结构
 * @returns {Array} 树状结构的人员数据
 */
const treePersonsData = computed(() => {
  if (!persons.value || persons.value.length === 0) {
    return []
  }
  
  // 按部门分组
  const groups = {}
  persons.value.forEach(person => {
    const departmentName = person.DepartmentName || '未分配部门'
    if (!groups[departmentName]) {
      groups[departmentName] = {
        id: `dept_${departmentName}`,
        label: departmentName,
        value: null, // 部门节点不可选择
        children: []
      }
    }
    groups[departmentName].children.push({
      id: person.ID,
      label: person.Name,
      value: person.ID,
      isLeaf: true
    })
  })
  
  // 转换为数组并排序
  const result = Object.values(groups)
  
  // 按部门名称排序，未分配部门放在最后
  result.sort((a, b) => {
    if (a.label === '未分配部门') return 1
    if (b.label === '未分配部门') return -1
    return a.label.localeCompare(b.label, 'zh-CN')
  })
  
  // 每个部门内的人员按姓名排序
  result.forEach(group => {
    group.children.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
  })
  
  return result
})

/**
 * 按部门分组的人员列表（保留原有的，用于其他可能的用途）
 * @returns {Array} 按部门分组的人员数据
 */
const groupedPersons = computed(() => {
  if (!persons.value || persons.value.length === 0) {
    return []
  }
  
  // 按部门分组
  const groups = {}
  persons.value.forEach(person => {
    const departmentName = person.DepartmentName || '未分配部门'
    if (!groups[departmentName]) {
      groups[departmentName] = {
        departmentName,
        persons: []
      }
    }
    groups[departmentName].persons.push(person)
  })
  
  // 转换为数组并排序
  const result = Object.values(groups)
  
  // 按部门名称排序，未分配部门放在最后
  result.sort((a, b) => {
    if (a.departmentName === '未分配部门') return 1
    if (b.departmentName === '未分配部门') return -1
    return a.departmentName.localeCompare(b.departmentName, 'zh-CN')
  })
  
  // 每个部门内的人员按姓名排序
  result.forEach(group => {
    group.persons.sort((a, b) => a.Name.localeCompare(b.Name, 'zh-CN'))
  })
  
  return result
})

/**
 * 获取状态标签类型
 * @param {string} status - 状态值
 * @returns {string} 标签类型
 */
function getStatusType(status) {
  const statusMap = {
    '正常': 'success',
    'normal': 'success',
    '维修中': 'warning',
    'maintenance': 'warning',
    '报废': 'danger',
    'retired': 'danger',
    'scrapped': 'danger'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态显示标签
 * @param {string} status - 状态值
 * @returns {string} 显示标签
 */
function getStatusLabel(status) {
  const statusLabelMap = {
    'normal': '正常',
    'maintenance': '维修中',
    'retired': '已报废',
    'scrapped': '已报废',
    '正常': '正常',
    '维修中': '维修中',
    '报废': '已报废'
  }
  return statusLabelMap[status] || status || '未知'
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
 * 获取仪器列表
 */
async function getInstrumentList() {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm
    }
    const response = await instrumentApi.getInstruments(params)
    
    // 根据后端API返回的数据结构解析
    if (response.data && response.data.code === 200 && response.data.data) {
      instrumentList.value = Array.isArray(response.data.data.list) ? response.data.data.list : []
      pagination.total = response.data.data.pagination ? response.data.data.pagination.total : 0
    } else if (response.data && Array.isArray(response.data.list)) {
      instrumentList.value = response.data.list
      pagination.total = response.data.total || 0
    } else {
      console.warn('获取仪器列表：返回的数据格式不正确', response.data)
      instrumentList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取仪器列表失败：', error)
    ElMessage.error('获取仪器列表失败：' + error.message)
    instrumentList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

/**
 * 确保仪器类别数据已加载
 */
async function ensureCategoriesLoaded() {
  console.log('检查仪器类别数据是否已加载...')
  console.log('当前categories.value:', categories.value)
  if (!categories.value || categories.value.length === 0) {
    console.log('仪器类别数据未加载，开始加载...')
    await getCategories()
  } else {
    console.log('仪器类别数据已存在，跳过加载')
  }
}

/**
 * 确保责任人数据已加载
 */
async function ensurePersonsLoaded() {
  console.log('检查责任人数据是否已加载...')
  console.log('当前persons.value:', persons.value)
  if (!persons.value || persons.value.length === 0) {
    console.log('责任人数据未加载，开始加载...')
    await getPersons()
  } else {
    console.log('责任人数据已存在，跳过加载')
  }
}

/**
 * 获取仪器类别列表
 */
async function getCategories() {
  try {
    console.log('开始获取仪器类别列表...')
    const response = await instrumentApi.getCategories()
    console.log('仪器类别API响应:', response)
    
    // 根据后端API返回的数据结构解析
    if (response.data && response.data.code === 200 && Array.isArray(response.data.data)) {
      console.log('仪器类别数据:', response.data.data)
      categories.value = response.data.data
      console.log('categories.value设置后:', categories.value)
    } else if (response.data && Array.isArray(response.data)) {
      console.log('仪器类别数据(直接数组):', response.data)
      categories.value = response.data
      console.log('categories.value设置后:', categories.value)
    } else {
      console.log('仪器类别API返回错误:', response)
      categories.value = []
    }
  } catch (error) {
    console.error('获取仪器类别列表失败:', error)
    ElMessage.error('获取类别列表失败：' + (error.response?.data?.message || error.message))
    categories.value = []
  }
}

/**
 * 获取人员列表
 */
async function getPersons() {
  try {
    console.log('开始获取人员列表...')
    const response = await instrumentApi.getPersons()
    console.log('API响应:', response)
    
    // 修复：检查response.data.code而不是response.code
    if (response.data && response.data.code === 200) {
      console.log('人员数据:', response.data.data)
      persons.value = response.data.data
      console.log('persons.value设置后:', persons.value)
    } else {
      console.log('API返回错误:', response)
      persons.value = []
    }
  } catch (error) {
    console.error('获取人员列表失败:', error)
    ElMessage.error('获取人员列表失败：' + (error.response?.data?.message || error.message))
    persons.value = []
  }
}

/**
 * 搜索处理
 */
function handleSearch() {
  pagination.page = 1
  getInstrumentList()
}

 /**
  * 重置搜索
  */
 function handleReset() {
   Object.assign(searchForm, {
     instrumentName: '',
     managementCode: '',
     category: '',
     status: ''
   })
   pagination.page = 1
   getInstrumentList()
 }

/**
 * 新增仪器
 */
async function handleAdd() {
  console.log('开始新增仪器，重置表单...')
  isEdit.value = false
  resetForm()
  
  // 确保仪器类别和责任人数据已加载
  await Promise.all([
    ensureCategoriesLoaded(),
    ensurePersonsLoaded()
  ])
  
  console.log('新增仪器表单数据:', instrumentForm)
  dialogVisible.value = true
}

/**
 * 编辑仪器
 * @param {Object} row - 仪器数据
 */
async function handleEdit(row) {
  console.log('开始编辑仪器，仪器数据:', row)
  
  isEdit.value = true
  // 先重置表单，确保没有残留数据
  resetForm()
  
  // 确保仪器类别和责任人数据已加载
  console.log('确保仪器类别和责任人数据已加载...')
  await Promise.all([
    ensureCategoriesLoaded(),
    ensurePersonsLoaded()
  ])
  console.log('数据加载完成，准备打开编辑对话框')
  
  // 只复制需要的字段，避免意外的数据残留
  console.log('填充表单数据...')
  
  // 根据后端返回的Category字段名称找到对应的CategoryID
  let categoryID = '';
  if (row.Category) {
    const matchedCategory = categories.value.find(cat => 
      cat.CategoryName === row.Category || cat.CategoryCode === row.Category
    );
    if (matchedCategory) {
      categoryID = matchedCategory.ID;
    }
  }
  
  // 根据后端返回的ResponsiblePersonName字段名称找到对应的责任人ID
  let responsiblePersonID = '';
  if (row.ResponsiblePersonName) {
    const matchedPerson = persons.value.find(person => 
      person.Name === row.ResponsiblePersonName
    );
    if (matchedPerson) {
      responsiblePersonID = matchedPerson.ID;
    }
  }
  
  Object.assign(instrumentForm, {
    InstrumentID: row.ID,  // 将后端的ID字段映射到前端的InstrumentID
    InstrumentCode: row.InstrumentCode || '',
    ManagementCode: row.ManagementCode || '',
    InstrumentName: row.InstrumentName || '',
    Model: row.Model || '',
    SerialNumber: row.SerialNumber || '',
    CategoryID: categoryID,  // 使用找到的CategoryID
    Manufacturer: row.Manufacturer || '',
    PurchaseDate: row.PurchaseDate || '',
    MeasurementRange: row.MeasurementRange || '',
    Accuracy: row.Accuracy || '',
    Location: row.Location || '',
    ResponsiblePerson: responsiblePersonID,  // 使用找到的责任人ID
    Status: row.Status || '正常',
    Notes: row.Notes || ''
  })
  
  console.log('字段映射详情:')
  console.log('- 后端Category字段:', row.Category)
  console.log('- 映射到的CategoryID:', categoryID)
  console.log('- 后端ResponsiblePersonName字段:', row.ResponsiblePersonName)
  console.log('- 映射到的ResponsiblePersonID:', responsiblePersonID)
  
  console.log('表单数据填充完成:', instrumentForm)
  console.log('当前仪器类别数据:', categories.value)
  console.log('当前责任人数据:', persons.value)
  
  dialogVisible.value = true
  console.log('编辑对话框已打开')
}

/**
 * 查看详情
 * @param {Object} row - 仪器数据
 */
function handleView(row) {
  currentInstrument.value = row
  detailDialogVisible.value = true
}

/**
 * 删除仪器
 * @param {Object} row - 仪器数据
 */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除仪器"${row.InstrumentName}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await instrumentApi.deleteInstrument(row.InstrumentID)
    ElMessage.success('删除成功')
    getInstrumentList()
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
    await instrumentApi.exportInstruments(searchForm)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败：' + error.message)
  } finally {
    exportLoading.value = false
  }
}

/**
 * 提交表单
 */
async function handleSubmit() {
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    // 准备提交数据，处理字段映射
    const submitData = { ...instrumentForm }
    
    // 将CategoryID映射为Category字段名称
    if (submitData.CategoryID) {
      const selectedCategory = categories.value.find(cat => cat.ID === submitData.CategoryID)
      if (selectedCategory) {
        submitData.Category = selectedCategory.CategoryName || selectedCategory.CategoryCode
      }
      delete submitData.CategoryID  // 删除前端字段
    }
    
    // 添加调试输出：显示提交的数据
    console.log('=== 仪器保存调试信息 ===')
    console.log('是否为编辑模式:', isEdit.value)
    console.log('仪器ID:', instrumentForm.InstrumentID)
    console.log('原始表单数据:', JSON.stringify(instrumentForm, null, 2))
    console.log('处理后的提交数据:', JSON.stringify(submitData, null, 2))
    console.log('ResponsiblePerson字段类型:', typeof submitData.ResponsiblePerson)
    console.log('ResponsiblePerson字段值:', submitData.ResponsiblePerson)
    console.log('Category字段值:', submitData.Category)
    console.log('========================')
    
    if (isEdit.value) {
      console.log('调用更新接口，URL:', `/api/instruments/${instrumentForm.InstrumentID}`)
      await instrumentApi.updateInstrument(instrumentForm.InstrumentID, submitData)
      ElMessage.success('更新成功')
    } else {
      console.log('调用创建接口，URL:', '/api/instruments')
      await instrumentApi.createInstrument(submitData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    getInstrumentList()
  } catch (error) {
    console.error('=== 仪器保存错误信息 ===')
    console.error('错误对象:', error)
    console.error('错误消息:', error.message)
    console.error('错误响应:', error.response)
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', error.response.data)
    }
    console.error('========================')
    
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
   Object.assign(instrumentForm, {
     InstrumentID: null,
     InstrumentCode: '',     // 重置出厂编号字段
     ManagementCode: '',
     InstrumentName: '',
     Model: '',
     SerialNumber: '',
     CategoryID: null,       // 修改为null，确保选择器正确重置
     Manufacturer: '',
     PurchaseDate: '',
     MeasurementRange: '',  // 重置量程字段
     Accuracy: '',          // 重置准确度字段
     Location: '',
     ResponsiblePerson: null, // 修改为null，确保树形选择器正确重置
     Status: '正常',
     Notes: ''
   })
   formRef.value?.resetFields()
   console.log('表单已重置，当前表单数据:', instrumentForm)
 }

/**
 * 分页大小改变
 * @param {number} size - 页面大小
 */
function handleSizeChange(size) {
  pagination.size = size
  pagination.page = 1
  getInstrumentList()
}

/**
 * 当前页改变
 * @param {number} page - 当前页
 */
function handleCurrentChange(page) {
  pagination.page = page
  getInstrumentList()
}

// 组件挂载时初始化数据
onMounted(() => {
  getInstrumentList()
  getCategories()
  getPersons()  // 新增获取人员列表
})
</script>

<style scoped>
.instrument-list-container {
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

/* 表格样式 - 强制禁止换行 */
:deep(.el-table) {
  .el-table__body-wrapper .el-table__body .el-table__row .el-table__cell {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    word-break: keep-all !important;
    word-wrap: normal !important;
  }
  
  .el-table__header-wrapper .el-table__header .el-table__row .el-table__cell {
    white-space: nowrap !important;
    word-break: keep-all !important;
    word-wrap: normal !important;
  }
  
  /* 特别针对类别列 */
  .el-table__body .el-table__row .el-table__cell:nth-child(6) {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    word-break: keep-all !important;
    word-wrap: normal !important;
    max-width: 120px !important;
  }
}

/* 表格内容居中样式 */
.instrument-list :deep(.el-table th),
.instrument-list :deep(.el-table td) {
  text-align: center !important;
  vertical-align: middle !important;
  white-space: nowrap !important; /* 禁止自动换行 */
}

/* 仪器名称和制造商列左对齐 */
.instrument-list :deep(.el-table td:nth-child(4)),
.instrument-list :deep(.el-table td:nth-child(7)) {
  text-align: left !important;
}

/* 管理编号列居中对齐 */
.instrument-list :deep(.el-table td:nth-child(3)) {
  text-align: center !important;
}

/* 表格标题行浅灰色填充 */
.instrument-list :deep(.el-table__header-wrapper) {
  background-color: #f5f7fa !important;
}

.instrument-list :deep(.el-table th) {
  background-color: #f5f7fa !important;
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

/* 责任人下拉框部门分组样式 */
:deep(.el-select-group__title) {
  font-weight: 600;
  color: #409eff;
  font-size: 13px;
  padding: 8px 12px 4px 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-select-group__wrap:not(:last-of-type)) {
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-select-group .el-option) {
  padding-left: 24px;
}

:deep(.el-select-group .el-option:hover) {
  background-color: #f5f7fa;
}

/* 树状选择器样式优化 */
:deep(.el-tree-select) {
  .el-tree-select__popper {
    max-height: 300px;
  }
  
  .el-tree {
    .el-tree-node {
      .el-tree-node__content {
        height: 32px;
        line-height: 32px;
        
        &:hover {
          background-color: #f5f7fa;
        }
      }
      
      /* 部门节点样式 */
      &.is-disabled > .el-tree-node__content {
        color: #409eff;
        font-weight: 600;
        background-color: #f8f9fa;
        cursor: default;
        
        &:hover {
          background-color: #f8f9fa;
        }
      }
      
      /* 人员节点样式 */
      &:not(.is-disabled) > .el-tree-node__content {
        padding-left: 32px;
        
        &:hover {
          background-color: #e6f7ff;
        }
      }
    }
  }
}

/* 详情样式 */
.instrument-detail {
  padding: 10px 0;
}
</style>