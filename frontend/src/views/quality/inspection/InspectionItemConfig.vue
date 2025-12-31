<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>检验项目管理</span>
        </div>
      </template>
      
      <div class="filter-container">
        <el-select v-model="listQuery.category" placeholder="全部类别" clearable style="width: 150px; margin-right: 10px;" class="filter-item" @change="handleFilter">
            <el-option label="全部类别" value="" />
            <el-option label="纸张" value="纸张" />
            <el-option label="膜类" value="膜类" />
            <el-option label="油墨" value="油墨" />
            <el-option label="通用" value="通用" />
        </el-select>
        <el-input v-model="listQuery.keyword" placeholder="项目名称 / 描述" style="width: 200px; margin-right: 10px;" class="filter-item" @keyup.enter="handleFilter" />
        <el-button class="filter-item" type="primary" :icon="Search" @click="handleFilter">搜索</el-button>
        <el-button class="filter-item" :icon="Refresh" @click="handleReset">重置</el-button>
        <el-button 
          type="primary" 
          :icon="Plus" 
          @click="handleCreate"
          v-if="hasPermission('quality:items:add')"
          class="filter-item"
          style="margin-left: 10px;"
        >新增项目</el-button>
      </div>

      <el-table 
        v-loading="listLoading" 
        :data="paginatedList" 
        border 
        fit 
        highlight-current-row 
        stripe
        style="width: 100%; margin-top: 20px;"
        :header-cell-style="{ textAlign: 'center' }"
        :cell-style="{ whiteSpace: 'nowrap' }"
      >
        <el-table-column label="ID" prop="ID" width="80" align="center" show-overflow-tooltip />
        <el-table-column label="项目名称" prop="ItemName" min-width="150" align="center" show-overflow-tooltip />
        <el-table-column label="适用类别" prop="MaterialCategory" width="120" align="center" show-overflow-tooltip />
        <el-table-column label="单位" prop="Unit" width="80" align="center" show-overflow-tooltip />
        <el-table-column label="生成规则" width="100" align="center">
          <template #default="{ row }">
              <el-tag v-if="row.AutoGenerateRule" type="success" size="small">已配置</el-tag>
              <el-tag v-else type="info" size="small">默认</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="描述" prop="Description" min-width="200" align="left" header-align="center" show-overflow-tooltip />
        <el-table-column label="检验依据" prop="InspectionBasis" min-width="150" align="center" show-overflow-tooltip />
        <el-table-column label="合格标准" prop="AcceptanceCriteria" min-width="150" align="center" show-overflow-tooltip />
        <el-table-column label="数据类型" prop="DataType" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getDataTypeTag(row.DataType)">
              {{ getDataTypeLabel(row.DataType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="SortOrder" width="80" align="center" sortable />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              link
              size="small" 
              :icon="View"
              @click="handleView(row)"
            >详情</el-button>
            <el-button 
              type="primary" 
              link
              size="small" 
              :icon="Edit"
              @click="handleUpdate(row)"
              v-if="hasPermission('quality:items:edit')"
            >编辑</el-button>
            <el-button 
              type="danger" 
              link
              size="small" 
              :icon="Delete"
              @click="handleDelete(row)"
              v-if="hasPermission('quality:items:delete')"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 20px; display: flex; justify-content: center;">
        <el-pagination
          v-show="filteredList.length > 0"
          :total="filteredList.length"
          v-model:current-page="listQuery.page"
          v-model:page-size="listQuery.pageSize"
          :page-sizes="[5, 10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- Dialog -->
    <el-dialog :title="textMap[dialogStatus]" v-model="dialogFormVisible" width="800px">
      <el-form 
        ref="dataForm" 
        :rules="rules" 
        :model="temp" 
        label-position="right" 
        label-width="100px" 
        style="width: 100%; padding: 0 20px;"
      >
        <el-form-item label="项目名称" prop="ItemName">
          <el-input v-model="temp.ItemName" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="适用类别" prop="MaterialCategory">
          <el-select 
            v-model="temp.MaterialCategory" 
            placeholder="请选择或输入适用类别" 
            allow-create 
            filterable 
            default-first-option
            style="width: 100%"
          >
            <el-option label="纸张" value="纸张" />
            <el-option label="膜类" value="膜类" />
            <el-option label="油墨" value="油墨" />
            <el-option label="通用" value="通用" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据类型" prop="DataType">
          <el-select v-model="temp.DataType" placeholder="请选择数据类型" style="width: 100%">
            <el-option label="普通文本" value="Normal" />
            <el-option label="尺寸 (长/宽/直径)" value="Dimension" />
            <el-option label="厚度 (mm/µm)" value="Thickness" />
            <el-option label="克重 (g/m²)" value="Weight" />
            <el-option label="初粘性 (滚球法)" value="InitialAdhesion" />
            <el-option label="持粘性 (挂重法)" value="HoldingPower" />
            <el-option label="力值 (剥离力/离型力)" value="Force" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="Description">
          <el-input type="textarea" v-model="temp.Description" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="检验依据" prop="InspectionBasis">
          <el-input v-model="temp.InspectionBasis" placeholder="例如：GB/T 2828.1 或 0.05 (数值)" />
        </el-form-item>
        <el-form-item label="单位" prop="Unit">
          <el-input v-model="temp.Unit" placeholder="例如：mm, kg, N/25mm" />
        </el-form-item>
        <el-form-item label="合格标准" prop="AcceptanceCriteria">
          <el-input v-model="temp.AcceptanceCriteria" :placeholder="getCriteriaPlaceholder(temp.DataType)" />
        </el-form-item>
        <el-form-item label="排序" prop="SortOrder">
          <el-input-number v-model="temp.SortOrder" :min="0" />
        </el-form-item>
        
        <el-divider content-position="left">自动生成规则</el-divider>
        <el-form-item label="规则类型">
             <el-select v-model="ruleConfig.type" placeholder="请选择规则类型" style="width: 100%" @change="handleRuleTypeChange">
                <el-option label="默认 (智能推断)" value="" />
                <el-option label="随机数值 (范围)" value="random_range" />
                <el-option label="固定文本/数值" value="fixed" />
                <el-option label="合格/不合格 (概率)" value="enum" />
             </el-select>
        </el-form-item>
        
        <div v-if="ruleConfig.type === 'random_range'">
            <el-form-item label="基准值">
                 <el-input v-model="ruleConfig.base" placeholder="留空则使用'检验依据'中的数值" />
            </el-form-item>
            <el-form-item label="波动范围">
                 <el-col :span="11">
                    <el-input-number v-model="ruleConfig.minOffset" :step="0.01" placeholder="下限偏移" style="width: 100%" />
                 </el-col>
                 <el-col :span="2" class="line" style="text-align: center">-</el-col>
                 <el-col :span="11">
                    <el-input-number v-model="ruleConfig.maxOffset" :step="0.01" placeholder="上限偏移" style="width: 100%" />
                 </el-col>
            </el-form-item>
             <el-form-item label="小数位数">
                <el-input-number v-model="ruleConfig.precision" :min="0" :max="4" />
            </el-form-item>
        </div>

        <div v-if="ruleConfig.type === 'fixed'">
            <el-form-item label="固定值">
                <el-input v-model="ruleConfig.value" placeholder="例如：OK 或 10.5" />
            </el-form-item>
        </div>
        
        <div v-if="ruleConfig.type === 'enum'">
             <el-form-item label="合格概率">
                 <el-slider v-model="ruleConfig.passRate" :min="0" :max="100" show-input :format-tooltip="val => val + '%'" />
             </el-form-item>
        </div>

      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogFormVisible = false">取消</el-button>
          <el-button type="primary" @click="dialogStatus === 'create' ? createData() : updateData()">确认</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Detail Dialog -->
    <el-dialog title="检验项目详情" v-model="detailDialogVisible" width="800px">
        <el-descriptions :column="1" border>
            <el-descriptions-item label="ID">{{ currentDetail.ID }}</el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ currentDetail.ItemName }}</el-descriptions-item>
            <el-descriptions-item label="适用类别">{{ currentDetail.MaterialCategory }}</el-descriptions-item>
            <el-descriptions-item label="数据类型">
                <el-tag :type="getDataTypeTag(currentDetail.DataType)">
                    {{ getDataTypeLabel(currentDetail.DataType) }}
                </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="单位">{{ currentDetail.Unit }}</el-descriptions-item>
            <el-descriptions-item label="描述">{{ currentDetail.Description }}</el-descriptions-item>
            <el-descriptions-item label="检验依据">{{ currentDetail.InspectionBasis }}</el-descriptions-item>
            <el-descriptions-item label="合格标准">{{ currentDetail.AcceptanceCriteria }}</el-descriptions-item>
            <el-descriptions-item label="排序">{{ currentDetail.SortOrder }}</el-descriptions-item>
            <el-descriptions-item label="生成规则">
                <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">{{ currentDetail.AutoGenerateRule }}</pre>
            </el-descriptions-item>
        </el-descriptions>
        <template #footer>
            <el-button @click="detailDialogVisible = false">关闭</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getInspectionItems, addInspectionItem, updateInspectionItem, deleteInspectionItem } from '@/api/inspection'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user' // Assuming user store has hasPermission
import { Plus, Search, Edit, Delete, Refresh, View } from '@element-plus/icons-vue'
import { computed } from 'vue'

const userStore = useUserStore()
const list = ref([]) // Stores all data
const listLoading = ref(true)
const dialogFormVisible = ref(false)
const detailDialogVisible = ref(false)
const dialogStatus = ref('')
const currentDetail = ref({})

const listQuery = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  category: ''
})

const filteredList = computed(() => {
  let result = list.value
  
  if (listQuery.category) {
    result = result.filter(item => item.MaterialCategory === listQuery.category)
  }

  if (listQuery.keyword) {
    const lower = listQuery.keyword.toLowerCase()
    result = result.filter(item => 
      (item.ItemName && item.ItemName.toLowerCase().includes(lower)) ||
      (item.Description && item.Description.toLowerCase().includes(lower))
    )
  }
  return result
})

const paginatedList = computed(() => {
  const start = (listQuery.page - 1) * listQuery.pageSize
  const end = start + listQuery.pageSize
  return filteredList.value.slice(start, end)
})

const textMap = {
  update: '编辑',
  create: '新增'
}

const temp = reactive({
  ID: undefined,
  ItemName: '',
  Description: '',
  AcceptanceCriteria: '',
  SortOrder: 0,
  DataType: 'Normal',
  MaterialCategory: '',
  AutoGenerateRule: '',
  Unit: '',
  InspectionBasis: '' // Added
})

const ruleConfig = reactive({
    type: '',
    base: '',
    minOffset: -0.1,
    maxOffset: 0.1,
    precision: 2,
    value: '',
    passRate: 100
})

const handleRuleTypeChange = () => {
    // Reset defaults if needed
}

// Watch/Sync ruleConfig <-> temp.AutoGenerateRule
// Simple approach: When opening dialog, parse temp.AutoGenerateRule to ruleConfig
// When saving, stringify ruleConfig to temp.AutoGenerateRule

const rules = {
  ItemName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  DataType: [{ required: true, message: '请选择数据类型', trigger: 'change' }]
}

const dataForm = ref(null)

onMounted(() => {
  getList()
})

const getList = async () => {
  listLoading.value = true
  try {
    const response = await getInspectionItems()
    list.value = response.data
  } catch (error) {
    console.error(error)
  } finally {
    listLoading.value = false
  }
}

const handleFilter = () => {
  listQuery.page = 1
}

const handleReset = () => {
  listQuery.keyword = ''
  listQuery.category = ''
  listQuery.page = 1
}

const resetTemp = () => {
  temp.ID = undefined
  temp.ItemName = ''
  temp.Description = ''
  temp.AcceptanceCriteria = ''
  temp.SortOrder = 0
  temp.DataType = 'Normal'
  temp.MaterialCategory = ''
  temp.AutoGenerateRule = ''
  temp.Unit = ''
  temp.InspectionBasis = '' // Added
  
  // Reset ruleConfig
  ruleConfig.type = ''
  ruleConfig.base = ''
  ruleConfig.minOffset = -0.1
  ruleConfig.maxOffset = 0.1
  ruleConfig.precision = 2
  ruleConfig.value = ''
  ruleConfig.passRate = 100
}

const handleCreate = () => {
  resetTemp()
  // If a category is selected in the filter, use it as default for new item
  if (listQuery.category) {
      temp.MaterialCategory = listQuery.category
  }
  dialogStatus.value = 'create'
  dialogFormVisible.value = true
  // clearValidate logic if needed
}

const serializeRule = () => {
    if (!ruleConfig.type) return ''
    const rule = { type: ruleConfig.type }
    if (ruleConfig.type === 'random_range') {
        rule.base = ruleConfig.base
        rule.minOffset = ruleConfig.minOffset
        rule.maxOffset = ruleConfig.maxOffset
        rule.precision = ruleConfig.precision
    } else if (ruleConfig.type === 'fixed') {
        rule.value = ruleConfig.value
    } else if (ruleConfig.type === 'enum') {
        rule.passRate = ruleConfig.passRate
    }
    return JSON.stringify(rule)
}

const parseRule = (jsonStr) => {
    if (!jsonStr) {
        ruleConfig.type = ''
        return
    }
    try {
        const rule = JSON.parse(jsonStr)
        ruleConfig.type = rule.type
        if (rule.type === 'random_range') {
            ruleConfig.base = rule.base || ''
            ruleConfig.minOffset = rule.minOffset || -0.1
            ruleConfig.maxOffset = rule.maxOffset || 0.1
            ruleConfig.precision = rule.precision || 2
        } else if (rule.type === 'fixed') {
            ruleConfig.value = rule.value || ''
        } else if (rule.type === 'enum') {
            ruleConfig.passRate = rule.passRate !== undefined ? rule.passRate : 100
        }
    } catch (e) {
        console.error('Failed to parse rule', e)
        ruleConfig.type = ''
    }
}

const createData = () => {
  dataForm.value.validate(async (valid) => {
    if (valid) {
      temp.AutoGenerateRule = serializeRule() // Serialize before saving
      try {
        await addInspectionItem(temp)
        ElMessage.success('创建成功')
        dialogFormVisible.value = false
        getList()
      } catch (error) {
        console.error(error)
      }
    }
  })
}

const handleUpdate = (row) => {
  Object.assign(temp, row)
  parseRule(temp.AutoGenerateRule) // Parse when opening edit
  dialogStatus.value = 'update'
  dialogFormVisible.value = true
}

const handleView = (row) => {
    currentDetail.value = Object.assign({}, row)
    detailDialogVisible.value = true
}

const updateData = () => {
  dataForm.value.validate(async (valid) => {
    if (valid) {
      temp.AutoGenerateRule = serializeRule() // Serialize before saving
      try {
        await updateInspectionItem(temp.ID, temp)
        ElMessage.success('更新成功')
        dialogFormVisible.value = false
        getList()
      } catch (error) {
        console.error(error)
      }
    }
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确认删除该项目吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteInspectionItem(row.ID)
      ElMessage.success('删除成功')
      getList()
    } catch (error) {
      console.error(error)
    }
  })
}

const getDataTypeLabel = (type) => {
  const map = {
    'Normal': '普通文本',
    'Dimension': '尺寸',
    'Thickness': '厚度',
    'Weight': '克重',
    'InitialAdhesion': '初粘性',
    'HoldingPower': '持粘性',
    'Force': '力值'
  }
  return map[type] || type
}

const getDataTypeTag = (type) => {
  const map = {
    'Normal': 'info',
    'Dimension': 'primary',
    'Thickness': 'warning',
    'Weight': 'success',
    'InitialAdhesion': 'success',
    'HoldingPower': 'warning',
    'Force': 'danger'
  }
  return map[type] || ''
}

const getCriteriaPlaceholder = (type) => {
    switch (type) {
        case 'InitialAdhesion':
            return '例如：≥ 8#钢球'
        case 'HoldingPower':
            return '例如：≥ 24h'
        case 'Force':
            return '例如：≥ 5.0 N/kgf/gf'
        case 'Dimension':
            return '例如：10 ± 0.5 mm'
        case 'Thickness':
            return '例如：0.05 ± 0.005 mm'
        case 'Weight':
            return '例如：80 ± 2 g/m²'
        default:
            return '请输入合格标准'
    }
}

// Permission Helper
const hasPermission = (perm) => {
    if (userStore.hasPermission) {
        return userStore.hasPermission(perm)
    }
    return true // Fallback if store logic missing
}
</script>

<style scoped>
.filter-container {
  padding-bottom: 10px;
}
</style>
