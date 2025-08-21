<template>
  <div class="plan-templates">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon><Document /></el-icon>
          计划模板
        </h2>
        <p class="page-subtitle">工作计划模板的创建、编辑、删除和管理</p>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-filters">
      <el-card>
        <el-form :model="searchForm" inline>
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索模板名称或描述"
              clearable
              style="width: 200px"
              @keyup.enter="searchTemplates"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="searchForm.category" placeholder="选择分类" clearable style="width: 150px">
              <el-option
                v-for="workType in workTypes"
                :key="workType.ID"
                :label="workType.TypeName"
                :value="workType.TypeName"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="选择状态" clearable style="width: 120px">
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="inactive" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchTemplates">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 模板列表 -->
    <div class="template-list">
      <el-card>
        <div class="table-header">
          <div class="table-actions">
            <el-button type="primary" @click="showCreateDialog">
              <el-icon><Plus /></el-icon>
              新建模板
            </el-button>
            <el-button
              type="danger"
              :disabled="selectedTemplates.length === 0"
              @click="batchDeleteTemplates"
            >
              <el-icon><Delete /></el-icon>
              批量删除
            </el-button>
            <el-button @click="exportTemplates">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>

        <el-table
          v-loading="loading"
          :data="templateList"
          @selection-change="handleSelectionChange"
          stripe
          border
          resizable
          style="width: 100%"
          class="template-table"
        >
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column prop="templateName" label="模板名称" min-width="200" resizable>
            <template #default="{ row }">
              <div class="template-name-cell">
                <div class="template-name" @click="viewTemplateDetail(row.id)">{{ row.templateName }}</div>
                <!-- <div class="template-category">{{ getCategoryName(row.category) }}</div> -->
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip resizable />
          <el-table-column prop="estimatedHours" label="预计工时" width="120" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center">
                {{ row.estimatedHours || 0 }} 小时
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="isPublic" label="公开性" width="100" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center">
                <el-tag :type="row.isPublic ? 'success' : 'warning'">
                  {{ row.isPublic ? '公开' : '私有' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="priority" label="优先级" width="100" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center">
                <el-tag :type="getPriorityType(row.priority)">
                  {{ getPriorityName(row.priority) }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center">
                <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
                  {{ row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="phases" label="阶段数" width="120" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center">
                <el-tag type="info">{{ row.phases ? row.phases.length : 0 }} 个</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="createdBy" label="创建人" width="120" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center">
                {{ row.createdBy }}
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="150" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center">
                {{ formatDate(row.createdAt) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="usageCount" label="使用次数" width="120" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center">
                <el-tag type="warning">{{ row.usageCount || 0 }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" align="center" resizable>
            <template #default="{ row }">
              <div class="cell-content-center action-buttons">
                <el-button type="success" size="small" @click="useTemplate(row)">
                  使用
                </el-button>
                <el-button type="warning" size="small" @click="editTemplate(row)">
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click="deleteTemplate(row)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 创建/编辑模板对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="900px"
      :close-on-click-modal="false"
      class="template-dialog"
      @close="handleDialogClose"
    >
      <el-form
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateFormRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="模板名称" prop="templateName">
              <el-input v-model="templateForm.templateName" placeholder="请输入模板名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select v-model="templateForm.category" placeholder="选择分类" style="width: 100%">
                <el-option
                  v-for="workType in workTypes"
                  :key="workType.ID"
                  :label="workType.TypeName"
                  :value="workType.TypeName"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="预计工期" prop="estimatedDays">
              <el-input-number
                v-model="templateForm.estimatedDays"
                :min="1"
                :max="365"
                placeholder="天数"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="预计工时" prop="estimatedHours">
              <el-input-number
                v-model="templateForm.estimatedHours"
                :min="0"
                :max="9999"
                :precision="2"
                placeholder="小时"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="templateForm.priority" placeholder="选择优先级" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="适用部门">
              <el-cascader
                v-model="templateForm.departmentID"
                :options="departments"
                :props="{ 
                  checkStrictly: true, 
                  emitPath: false,
                  expandTrigger: 'hover',
                  showAllLevels: true
                }"
                placeholder="选择部门"
                style="width: 100%"
                clearable
                filterable
                separator=" > "
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="templateForm.status" placeholder="选择状态" style="width: 100%">
                <el-option label="启用" value="active" />
                <el-option label="禁用" value="inactive" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="公开设置">
              <el-switch
                v-model="templateForm.isPublic"
                active-text="公开"
                inactive-text="私有"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="templateForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        
        <!-- 阶段配置 -->
        <el-form-item label="阶段配置">
          <div class="phases-container">
            <div class="phases-header">
              <span>工作阶段</span>
              <el-button type="primary" size="small" @click="addPhase">
                <el-icon><Plus /></el-icon>
                添加阶段
              </el-button>
            </div>
            <div class="phases-list">
              <div
                v-for="(phase, index) in templateForm.phases"
                :key="index"
                class="phase-item"
              >
                <div class="phase-header">
                  <span class="phase-number">阶段 {{ index + 1 }}</span>
                  <el-button
                    type="danger"
                    size="small"
                    text
                    @click="removePhase(index)"
                    :disabled="templateForm.phases.length <= 1"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-row :gutter="10">
                  <el-col :span="8">
                    <el-input
                      v-model="phase.name"
                      placeholder="阶段名称"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="10">
                    <el-input
                      v-model="phase.description"
                      placeholder="阶段描述"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="6">
                    <el-input-number
                      v-model="phase.estimatedDays"
                      :min="1"
                      :max="100"
                      placeholder="预计天数"
                      size="small"
                      style="width: 100%"
                    />
                  </el-col>
                </el-row>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="saveTemplate" :loading="saving">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 模板详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="模板详情"
      width="1000px"
      class="template-detail-dialog"
    >
      <div v-if="selectedTemplate" class="template-detail">
        <el-row :gutter="20" class="template-detail-row">
          <!-- 左侧：模板基本信息 -->
          <el-col :span="12" class="template-basic-info">
            <div class="detail-section">
              <h3>基本信息</h3>
              <div class="info-item">
                <label>模板名称：</label>
                <span>{{ selectedTemplate.templateName || selectedTemplate.name }}</span>
              </div>
              <div class="info-item">
                <label>分类：</label>
                <el-tag>{{ getCategoryName(selectedTemplate.category) }}</el-tag>
              </div>
              <div class="info-item">
                <label>优先级：</label>
                <el-tag :type="getPriorityType(selectedTemplate.priority)">
                  {{ getPriorityName(selectedTemplate.priority) }}
                </el-tag>
              </div>
              <div class="info-item">
                <label>预计工期：</label>
                <span>{{ selectedTemplate.estimatedDays }} 天</span>
              </div>
              <div class="info-item">
                <label>预计工时：</label>
                <span>{{ selectedTemplate.estimatedHours || 0 }} 小时</span>
              </div>
              <div class="info-item">
                <label>适用部门：</label>
                <span>{{ getDepartmentName(selectedTemplate.departmentId) }}</span>
              </div>
              <div class="info-item">
                <label>状态：</label>
                <el-tag :type="selectedTemplate.status === 'active' ? 'success' : 'danger'">
                  {{ selectedTemplate.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </div>
              <div class="info-item">
                <label>公开设置：</label>
                <el-tag :type="selectedTemplate.isPublic ? 'success' : 'warning'">
                  {{ selectedTemplate.isPublic ? '公开' : '私有' }}
                </el-tag>
              </div>
              <div class="info-item">
                <label>使用次数：</label>
                <el-tag type="warning">{{ selectedTemplate.usageCount || 0 }}</el-tag>
              </div>
              <div class="info-item">
                <label>创建人：</label>
                <span>{{ selectedTemplate.createdBy }}</span>
              </div>
              <div class="info-item">
                <label>创建时间：</label>
                <span>{{ formatDate(selectedTemplate.createdAt) }}</span>
              </div>
              <div class="info-item">
                <label>描述：</label>
                <p>{{ selectedTemplate.description || '暂无描述' }}</p>
              </div>
            </div>
          </el-col>
          
          <!-- 右侧：模板数据详情 -->
          <el-col :span="12" class="template-data-info">
            <div class="detail-section">
              <h3>模板数据详情</h3>
              <el-tabs v-model="activeDetailTab">
                <el-tab-pane label="阶段视图" name="phases">
                  <div class="phases-view">
                    <div v-if="selectedTemplate.phases && selectedTemplate.phases.length > 0">
                      <div
                        v-for="(phase, index) in selectedTemplate.phases"
                        :key="index"
                        class="phase-detail-item"
                      >
                        <div class="phase-detail-header">
                          <span class="phase-detail-number">阶段 {{ index + 1 }}</span>
                          <el-tag size="small">{{ phase.estimatedDays }} 天</el-tag>
                        </div>
                        <div class="phase-detail-content">
                          <h4>{{ phase.name }}</h4>
                          <p>{{ phase.description || '暂无描述' }}</p>
                        </div>
                      </div>
                    </div>
                    <div v-else class="no-phases-tip">
                      <el-empty description="暂无阶段配置" />
                    </div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="JSON数据视图" name="json">
                  <div class="json-view">
                    <pre class="json-content">{{ JSON.stringify(selectedTemplate, null, 2) }}</pre>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-col>
        </el-row>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button type="success" @click="useTemplate(selectedTemplate)">
            <el-icon><Plus /></el-icon>
            使用此模板
          </el-button>
          <el-button type="warning" @click="editTemplate(selectedTemplate)">
            <el-icon><Edit /></el-icon>
            编辑模板
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Plus,
  Search,
  Refresh,
  Delete,
  Download,
  Edit
} from '@element-plus/icons-vue'
import api from '@/services/api'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const templateList = ref([])
const selectedTemplates = ref([])
const selectedTemplate = ref(null)
const departments = ref([])
const workTypes = ref([])

// 搜索表单
const searchForm = reactive({
  keyword: '',
  category: '',
  status: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 对话框相关
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const templateFormRef = ref()
const activeDetailTab = ref('phases')

// 模板表单
const templateForm = reactive({
  id: null,
  templateName: '',
  description: '',
  category: '',
  templateData: '',
  estimatedDays: 7,
  estimatedHours: 0,
  isPublic: true,
  departmentID: null,
  workTypeID: null,
  priority: 'medium',
  status: 'active',
  phases: [
    {
      name: '需求分析',
      description: '分析和确认项目需求',
      estimatedDays: 2
    }
  ]
})

// 表单验证规则
const templateFormRules = {
  templateName: [
    { required: true, message: '请输入模板名称', trigger: ['blur', 'change'] },
    { 
      validator: (rule, value, callback) => {
        if (!value || value.trim() === '') {
          callback(new Error('模板名称不能为空'))
        } else {
          callback()
        }
      }, 
      trigger: ['blur', 'change'] 
    }
  ],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  estimatedDays: [{ required: true, message: '请输入预计工期', trigger: 'blur' }],
  estimatedHours: [{ required: true, message: '请输入预计工时', trigger: 'blur' }]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑模板' : '新建模板'
})

/**
 * 页面初始化
 */
onMounted(() => {
  getTemplateList()
  getDepartments()
  getWorkTypes()
})

/**
 * 获取部门列表（级联选择器格式）
 */
const getDepartments = async () => {
  try {
    const response = await api.get('/departments')
    if (response.data.success) {
      // 添加"全部门"选项到树形数据的顶层
      const allDepartmentsOption = {
        value: null,
        label: '全部门'
      }
      departments.value = [allDepartmentsOption, ...(response.data.data || [])]
    }
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

/**
 * 获取工作类型列表
 */
const getWorkTypes = async () => {
  try {
    const response = await api.get('/work-plan/work-types')
    if (response.data.success) {
      workTypes.value = response.data.data || []
    }
  } catch (error) {
    console.error('获取工作类型失败:', error)
  }
}

/**
 * 获取模板列表
 */
const getTemplateList = async () => {
  try {
    loading.value = true
    const response = await api.get('/work-plan/templates', {
      params: {
        ...searchForm,
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    })
    
    if (response.data.success) {
      templateList.value = response.data.data.templates || []
      pagination.total = response.data.data.pagination.total || 0
    } else {
      templateList.value = []
      pagination.total = 0
      ElMessage.warning(response.data.message || '获取模板列表失败')
    }
  } catch (error) {
    console.error('获取模板列表失败:', error)
    templateList.value = []
    pagination.total = 0
    ElMessage.error('获取模板列表失败，请检查网络连接或联系管理员')
  } finally {
    loading.value = false
  }
}

/**
 * 搜索模板
 */
const searchTemplates = () => {
  pagination.page = 1
  getTemplateList()
}

/**
 * 重置搜索
 */
const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    category: '',
    status: ''
  })
  pagination.page = 1
  getTemplateList()
}

/**
 * 显示创建对话框
 */
const showCreateDialog = async () => {
  isEdit.value = false
  resetTemplateForm()
  
  // 确保部门数据已加载
  if (departments.value.length === 0) {
    await getDepartments()
  }
  
  // 使用nextTick确保表单重置完成后再显示对话框
  await nextTick()
  dialogVisible.value = true
}

/**
 * 编辑模板
 */
const editTemplate = async (template) => {
  // 检查模板ID的有效性
  if (!template || !template.id) {
    ElMessage.error('模板数据无效，无法编辑')
    return
  }
  
  try {
    // 获取模板的完整详情数据
    const response = await api.get(`/work-plan/templates/${template.id}`)
    if (!response.data.success) {
      ElMessage.error(response.data.message || '获取模板详情失败')
      return
    }
    
    const templateDetail = response.data.data
    
    isEdit.value = true
    Object.assign(templateForm, {
      ...templateDetail,
      // 修复部门ID字段映射问题：后端返回 departmentId，前端使用 departmentID
      departmentID: templateDetail.departmentId || templateDetail.departmentID,
      // 确保phases数据正确赋值
      phases: templateDetail.phases && templateDetail.phases.length > 0 ? 
        JSON.parse(JSON.stringify(templateDetail.phases)) : [
          {
            name: '需求分析',
            description: '分析和确认项目需求',
            estimatedDays: 2
          }
        ]
    })
    
    // 确保部门数据已加载
    if (departments.value.length === 0) {
      await getDepartments()
    }
    
    dialogVisible.value = true
    
  } catch (error) {
    console.error('获取模板详情失败:', error)
    ElMessage.error('获取模板详情失败，请重试')
  }
}

/**
 * 保存模板
 */
const saveTemplate = async () => {
  try {
    // 检查表单引用是否存在
    if (!templateFormRef.value) {
      ElMessage.error('表单引用未找到，请重新打开对话框')
      return
    }
    
    // 调试信息：输出当前表单数据
    console.log('当前表单数据:', templateForm)
    console.log('模板名称值:', templateForm.templateName)
    
    // 执行表单验证
    const isValid = await new Promise((resolve) => {
      templateFormRef.value.validate((valid, fields) => {
        if (!valid && fields) {
          // 获取第一个验证失败的字段错误信息
          const firstFieldKey = Object.keys(fields)[0]
          const firstFieldErrors = fields[firstFieldKey]
          if (firstFieldErrors && firstFieldErrors.length > 0) {
            const errorMessage = firstFieldErrors[0].message
            ElMessage.error(errorMessage)
          } else {
            ElMessage.error('请检查表单填写是否完整')
          }
        }
        resolve(valid)
      })
    })
    
    if (!isValid) {
      return
    }
    
    saving.value = true
    
    const filteredPhases = templateForm.phases.filter(phase => phase.name && phase.description)
    
    // 构建要发送的数据，确保包含所有必要字段
    const templateData = {
      templateName: templateForm.templateName,
      description: templateForm.description,
      category: templateForm.category,
      estimatedDays: templateForm.estimatedDays,
      estimatedHours: templateForm.estimatedHours,
      priority: templateForm.priority,
      status: templateForm.status,
      isPublic: templateForm.isPublic,
      departmentID: templateForm.departmentID,
      workTypeID: templateForm.workTypeID,
      templateData: {
        phases: filteredPhases
      }
    }
    
    // 如果是编辑模式，添加ID
    if (isEdit.value) {
      templateData.id = templateForm.id
    }
    
    const url = isEdit.value ? `/work-plan/templates/${templateForm.id}` : '/work-plan/templates'
    const method = isEdit.value ? 'put' : 'post'
    
    console.log('发送的模板数据:', templateData)
    
    const response = await api[method](url, templateData)
    if (response.data.success) {
      ElMessage.success(isEdit.value ? '模板更新成功' : '模板创建成功')
      dialogVisible.value = false
      getTemplateList()
    }
  } catch (error) {
    if (error !== 'validation') {
      console.error('保存模板失败:', error)
      ElMessage.error('保存模板失败')
    }
  } finally {
    saving.value = false
  }
}

/**
 * 删除模板
 */
const deleteTemplate = async (template) => {
  // 检查模板ID的有效性
  if (!template || !template.id) {
    ElMessage.error('模板数据无效，无法删除')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除模板 "${template.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.delete(`/work-plan/templates/${template.id}`)
    if (response.data.success) {
      ElMessage.success('模板删除成功')
      getTemplateList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除模板失败:', error)
      ElMessage.error('删除模板失败')
    }
  }
}

/**
 * 批量删除模板
 */
const batchDeleteTemplates = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedTemplates.value.length} 个模板吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const templateIds = selectedTemplates.value.map(template => template.id)
    const response = await api.delete('/work-plan/templates/batch', { data: { templateIds } })
    if (response.data.success) {
      ElMessage.success('批量删除成功')
      getTemplateList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 导出模板
 */
const exportTemplates = async () => {
  try {
    const response = await api.get('/work-plan/templates/export', {
      params: searchForm,
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `工作计划模板_${new Date().toISOString().split('T')[0]}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

/**
 * 查看模板详情
 */
const viewTemplateDetail = async (templateId) => {
  const template = templateList.value.find(t => t.id === templateId)
  if (template) {
    selectedTemplate.value = template
    // 确保部门数据已加载
    if (departments.value.length === 0) {
      await getDepartments()
    }
    detailDialogVisible.value = true
  }
}

/**
 * 使用模板创建计划
 */
const useTemplate = (template) => {
  // 检查模板ID的有效性
  if (!template || !template.id) {
    ElMessage.error('模板数据无效，无法使用')
    return
  }
  
  router.push({
    path: '/admin/work-plan/plans',
    query: { templateId: template.id }
  })
}

/**
 * 添加阶段
 */
const addPhase = () => {
  templateForm.phases.push({
    name: '',
    description: '',
    estimatedDays: 1
  })
}

/**
 * 删除阶段
 */
const removePhase = (index) => {
  if (templateForm.phases.length > 1) {
    templateForm.phases.splice(index, 1)
  }
}

/**
 * 重置模板表单
 */
const resetTemplateForm = () => {
  Object.assign(templateForm, {
    id: null,
    templateName: '',
    description: '',
    category: '',
    status: 'active',
    templateData: '',
    estimatedDays: 7,
    estimatedHours: 0,
    isPublic: true,
    departmentID: null,
    workTypeID: null,
    priority: 'medium',
    phases: [
      {
        name: '需求分析',
        description: '分析和确认项目需求',
        estimatedDays: 2
      }
    ]
  })
  
  // 使用nextTick确保DOM更新后再清空验证
  nextTick(() => {
    templateFormRef.value?.clearValidate()
  })
}

/**
 * 处理对话框关闭事件
 * 确保关闭时清空表单数据，避免级联菜单保留上次选中值
 */
const handleDialogClose = () => {
  dialogVisible.value = false
  resetTemplateForm()
}

/**
 * 处理选择变化
 */
const handleSelectionChange = (selection) => {
  selectedTemplates.value = selection
}

/**
 * 处理页面大小变化
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  getTemplateList()
}

/**
 * 处理当前页变化
 */
const handleCurrentChange = (page) => {
  pagination.page = page
  getTemplateList()
}

/**
 * 获取部门名称（支持树形结构）
 * @param {number|string} departmentId - 部门ID
 * @returns {string} 部门名称
 */
const getDepartmentName = (departmentId) => {
  if (!departmentId) return '全部门'
  
  // 递归查找部门名称
  const findDepartmentInTree = (depts, id) => {
    for (const dept of depts) {
      if (dept.value === id) {
        return dept.label
      }
      if (dept.children && dept.children.length > 0) {
        const found = findDepartmentInTree(dept.children, id)
        if (found) return found
      }
    }
    return null
  }
  
  const departmentName = findDepartmentInTree(departments.value, departmentId)
  return departmentName || '未知部门'
}

/**
 * 获取分类名称
 */
const getCategoryName = (category) => {
  // 现在直接返回分类名称，因为我们使用的是 WorkTypes 表中的 TypeName
  return category || '未知分类'
}

/**
 * 获取优先级类型
 */
const getPriorityType = (priority) => {
  const typeMap = {
    low: '',
    medium: 'warning',
    high: 'danger',
    urgent: 'danger'
  }
  return typeMap[priority] || ''
}

/**
 * 获取优先级名称
 */
const getPriorityName = (priority) => {
  const nameMap = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }
  return nameMap[priority] || '未知'
}

/**
 * 格式化日期
 */
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
/* 页面头部样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 搜索筛选样式 */
.search-filters {
  margin-bottom: 20px;
}

/* 表格样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.template-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 表格样式增强 */
.template-table {
  border-radius: 8px;
  overflow: hidden;
}

.template-table :deep(.el-table__header-wrapper) {
  background-color: #f8f9fa;
}

.template-table :deep(.el-table__header th) {
  background-color: #f8f9fa;
  color: #303133;
  font-weight: 600;
  text-align: center;
  vertical-align: middle;
}

.template-table :deep(.el-table__body td) {
  vertical-align: middle;
}

/* 单元格内容居中样式 */
.cell-content-center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-buttons .el-button {
  margin: 0;
  min-width: 50px;
}

.template-name {
  font-weight: 500;
  color: #409eff;
  cursor: pointer;
  margin-bottom: 4px;
}

.template-name:hover {
  text-decoration: underline;
}

.template-category {
  font-size: 12px;
  color: #909399;
}

/* 分页样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 阶段配置样式 */
.phases-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  background-color: #fafafa;
}

.phases-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 600;
}

.phases-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.phase-item {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
}

.phase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.phase-number {
  font-weight: 500;
  color: #606266;
}

/* 模板详情样式 */
.template-detail-row {
  min-height: 400px;
}

.template-basic-info,
.template-data-info {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
  background-color: #fafafa;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 8px;
}

.info-item label {
  min-width: 80px;
  font-weight: 500;
  color: #606266;
}

.info-item span,
.info-item p {
  flex: 1;
  margin: 0;
  color: #303133;
}

.phases-view {
  max-height: 300px;
  overflow-y: auto;
}

.phase-detail-item {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
}

.phase-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.phase-detail-number {
  font-weight: 500;
  color: #409eff;
}

.phase-detail-content h4 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 14px;
}

.phase-detail-content p {
  margin: 0;
  color: #606266;
  font-size: 12px;
}

.json-content {
  background: #f5f5f5;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.no-phases-tip {
  text-align: center;
  padding: 20px;
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .template-basic-info,
  .template-data-info {
    border: none;
    padding: 12px;
  }
  
  .phase-item {
    padding: 8px;
  }
  
  .phase-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>