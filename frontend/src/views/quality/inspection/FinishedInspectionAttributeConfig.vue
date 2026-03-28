<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="header-row">
          <span class="title">成品检验属性设置</span>
        </div>
      </template>

      <div class="layout-container">
        <div class="left-panel">
          <el-card class="inner-card left-card">
            <template #header>
              <div class="section-header">
                <span>检验类型</span>
              </div>
            </template>

            <el-table
              ref="typeTableRef"
              :data="types"
              border
              stripe
              highlight-current-row
              :header-cell-style="{ textAlign: 'center' }"
              @current-change="handleTypeCurrentChange"
              @selection-change="handleTypeSelectionChange"
              @row-click="handleTypeRowClick"
            >
              <el-table-column type="selection" width="50" align="center" />
              <el-table-column type="index" label="序号" width="70" align="center" />
              <el-table-column prop="name" label="检验类型" min-width="120" align="center" />
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
                </template>
              </el-table-column>
            </el-table>

            <el-form ref="typeFormRef" :model="typeForm" :rules="typeRules" label-width="72px" class="type-form">
              <el-form-item label="类型" prop="name">
                <el-input v-model="typeForm.name" :disabled="typeMode === 'view'" />
              </el-form-item>
              <div class="type-form-row">
                <el-form-item label="排序" class="type-form-row-item">
                  <el-input-number v-model="typeForm.sortOrder" :min="1" :step="1" :disabled="typeMode === 'view'" />
                </el-form-item>
                <el-form-item label="启用" class="type-form-switch-item">
                  <el-switch v-model="typeForm.enabled" :disabled="typeMode === 'view'" />
                </el-form-item>
              </div>
            </el-form>

            <div class="left-actions">
              <el-button type="primary" :icon="Plus" :disabled="!hasPermission('quality:finished-attributes:type:add')" @click="beginCreateType">新增</el-button>
              <el-button type="primary" :icon="Edit" :disabled="!hasPermission('quality:finished-attributes:type:edit')" @click="beginEditType">编辑</el-button>
              <el-button type="primary" :icon="Select" :disabled="!canSubmitType" @click="saveType">保存</el-button>
              <el-button type="danger" :icon="Delete" :disabled="!hasPermission('quality:finished-attributes:type:delete')" @click="removeType">删除</el-button>
            </div>
          </el-card>
        </div>

        <div class="right-panel">
          <el-card class="inner-card flex-column-card">
            <template #header>
              <div class="section-header">
                <span>检验项目列表</span>
                <div class="header-actions">
                  <el-button type="primary" :icon="Plus" :disabled="!hasPermission('quality:finished-attributes:item:add')" @click="beginCreateItem">新增项目</el-button>
                </div>
              </div>
            </template>

            <div class="filter-row">
              <div class="filter-label">查询条件</div>
              <el-select v-model="filters.templateName" filterable clearable placeholder="检测组别" style="width: 260px">
                <el-option
                  v-for="name in uniqueTemplateNames"
                  :key="name"
                  :label="name"
                  :value="name"
                />
              </el-select>
              <el-input v-model="filters.keyword" placeholder="关键字查询" clearable :prefix-icon="Search" style="width: 280px" />
              <el-button class="filter-reset-btn" :icon="Refresh" @click="resetFilters">重置</el-button>
            </div>

            <div class="table-container">
              <el-table
                ref="itemTableRef"
                :data="paginatedItems"
                border
                stripe
                highlight-current-row
                :header-cell-style="{ textAlign: 'center', background: '#fdfdfd', fontWeight: '500', color: '#303133' }"
                @current-change="handleItemCurrentChange"
                @row-click="handleItemRowClick"
              >
                <el-table-column type="index" label="序号" width="60" align="center" />
                <el-table-column prop="templateName" label="检测组别" min-width="120" align="center" show-overflow-tooltip />
                <el-table-column prop="description" label="描述" min-width="260" align="left" header-align="center" show-overflow-tooltip />
                <el-table-column prop="creator" label="建档人" width="100" align="center" />
                <el-table-column label="建档日期" width="160" align="center">
                  <template #default="{ row }">
                    {{ formatDate(row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column prop="updater" label="最后修改人" width="100" align="center" />
                <el-table-column label="最后修改时间" width="160" align="center">
                  <template #default="{ row }">
                    {{ formatDate(row.updatedAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="220" align="center" fixed="right">
                  <template #default="{ row }">
                    <el-button type="info" link :icon="View" :disabled="!hasPermission('quality:finished-attributes:item:view')" @click.stop="beginViewItem(row)">查看</el-button>
                    <el-button type="primary" link :icon="Edit" :disabled="!hasPermission('quality:finished-attributes:item:edit')" @click.stop="beginEditItem(row)">编辑</el-button>
                    <el-button type="danger" link :icon="Delete" :disabled="!hasPermission('quality:finished-attributes:item:delete')" @click.stop="removeItem(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="pagination.currentPage"
                v-model:page-size="pagination.pageSize"
                :page-sizes="[5, 10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="pagination.total"
                :hide-on-single-page="false"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>

          </el-card>
        </div>
      </div>
    </el-card>
    <el-dialog v-model="itemDialogVisible" :title="itemDialogMode === 'create' ? '新增检验项目' : (itemDialogMode === 'edit' ? '编辑检验项目' : '查看检验项目')" width="760px" top="10vh" :close-on-click-modal="false" @keyup.enter="handleDialogEnter" custom-class="compact-dialog">
      <div class="dialog-body">
        <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" class="dialog-form" :disabled="itemDialogMode === 'view'">
          <div class="dialog-top-row">
            <div class="dialog-panel">
              <div class="dialog-panel-label">检验项目组</div>
              <el-form-item prop="templateName" class="dialog-form-item">
                <el-input v-model="itemForm.templateName" placeholder="请输入检验项目组" />
              </el-form-item>
            </div>
            <div class="dialog-panel">
              <div class="dialog-panel-label">描述</div>
              <el-form-item prop="description" class="dialog-form-item">
                <el-input v-model="itemForm.description" placeholder="请输入描述" />
              </el-form-item>
            </div>
          </div>
          
          <div class="dialog-top-row">
            <div class="dialog-panel">
              <div class="dialog-panel-label">检验水平</div>
              <el-form-item prop="aql" class="dialog-form-item">
                <el-input v-model="itemForm.aql" placeholder="MIL-STD-105E II级" />
              </el-form-item>
            </div>
            <div class="dialog-panel">
              <div class="dialog-panel-label">依据标准</div>
              <el-form-item prop="standard" class="dialog-form-item">
                <el-input v-model="itemForm.standard" placeholder="请输入依据标准（如：GB/T 1804-c）" />
              </el-form-item>
            </div>
          </div>

          <div class="dialog-aql-strip">
            <div class="dialog-aql-title">AQL</div>
            <div class="aql-strip-item">
              <span class="aql-strip-label">极度</span>
              <div class="aql-strip-input-wrap">
                <span class="aql-strip-code">CR:</span>
                <el-form-item prop="cr" class="aql-inline-form-item">
                  <el-input v-model="itemForm.cr" @input="sanitizeNumericInput('cr')" />
                </el-form-item>
              </div>
            </div>
            <div class="aql-strip-item">
              <span class="aql-strip-label">功能</span>
              <div class="aql-strip-input-wrap">
                <span class="aql-strip-code">FU:</span>
                <el-form-item prop="fu" class="aql-inline-form-item">
                  <el-input v-model="itemForm.fu" @input="sanitizeNumericInput('fu')" />
                </el-form-item>
              </div>
            </div>
            <div class="aql-strip-item">
              <span class="aql-strip-label">严重</span>
              <div class="aql-strip-input-wrap">
                <span class="aql-strip-code">MA:</span>
                <el-form-item prop="ma" class="aql-inline-form-item">
                  <el-input v-model="itemForm.ma" @input="sanitizeNumericInput('ma')" />
                </el-form-item>
              </div>
            </div>
            <div class="aql-strip-item">
              <span class="aql-strip-label">轻微</span>
              <div class="aql-strip-input-wrap">
                <span class="aql-strip-code">MI:</span>
                <el-form-item prop="mi" class="aql-inline-form-item">
                  <el-input v-model="itemForm.mi" @input="sanitizeNumericInput('mi')" />
                </el-form-item>
              </div>
            </div>
          </div>

          <div class="dialog-fields-row">
            <div class="dialog-entry-table">
              <div class="dialog-entry-header">
                <div class="dialog-entry-head-cell">检验类型</div>
                <div class="dialog-entry-head-cell">检验项目</div>
                <div class="dialog-entry-head-cell">检验标准</div>
              </div>
              <div class="dialog-entry-scroll" :class="{ 'is-scrollable': itemRows.length > 7 }">
                <div v-for="(row, index) in itemRows" :key="`item-row-${index}`" class="dialog-entry-row">
                  <div class="dialog-entry-cell">
                    <el-select v-model="row.typeId" placeholder="请选择" style="width: 100%" @change="(value) => handleTypeRowChange(value, row)">
                      <el-option v-for="t in types" :key="t.id" :label="t.name" :value="t.id" />
                    </el-select>
                  </div>
                  <div class="dialog-entry-cell">
                    <el-input v-model="row.itemName" />
                  </div>
                  <div class="dialog-entry-cell">
                    <el-input v-model="row.standard" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <div class="dialog-footer-left">
            <template v-if="itemDialogMode !== 'view'">
              <el-button type="primary" plain @click="addItemRow">增加行</el-button>
              <el-button type="danger" plain @click="removeItemRow">删除行</el-button>
            </template>
          </div>
          <div class="dialog-footer-right">
            <el-button @click="itemDialogVisible = false" :disabled="itemSubmitting">取消</el-button>
            <el-button v-if="itemDialogMode !== 'view'" type="primary" :loading="itemSubmitting" @click="saveItem">确定</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Refresh, Select, Search, View } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import {
  getFinishedInspectionConfigInit,
  getFinishedInspectionItems,
  createFinishedInspectionType,
  updateFinishedInspectionType,
  deleteFinishedInspectionType,
  createFinishedInspectionItem,
  updateFinishedInspectionItem,
  deleteFinishedInspectionItem
} from '@/api/inspection'

const templates = ref([])
const types = ref([])
const items = ref([])
const typeTableRef = ref()
const itemTableRef = ref()
const userStore = useUserStore()
const selectedType = ref(null)
const checkedType = ref(null)
const itemDialogVisible = ref(false)
const itemDialogMode = ref('create')
const itemRows = ref([])
const itemSubmitting = ref(false)

const hasPermission = (perm) => {
  try {
    if (userStore?.isAdmin) return true
    if (userStore?.hasPermission) return userStore.hasPermission(perm)
    return false
  } catch {
    return false
  }
}

const filters = reactive({
  templateName: '',
  keyword: ''
})
let filterTimer = null

const uniqueTemplateNames = computed(() => {
  const names = items.value.map(it => it.templateName).filter(Boolean)
  return [...new Set(names)]
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 5,
  total: 0
})

const paginatedItems = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return items.value.slice(start, end)
})

const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.currentPage = 1
}

const handleCurrentChange = (val) => {
  pagination.currentPage = val
}

const typeMode = ref('view')
const typeFormRef = ref()
const typeForm = reactive({
  id: undefined,
  name: '',
  sortOrder: 1,
  enabled: true
})
const typeFormSnapshot = ref(null)
const typeRules = {
  name: [{ required: true, message: '请输入检验类型', trigger: 'blur' }]
}

const itemMode = ref('view')
const itemFormRef = ref()
const itemFormSnapshot = ref(null)
const itemForm = reactive({
  id: undefined,
  templateId: undefined,
  templateName: '',
  description: '',
  standard: '',
  aql: 'GB 2828.1 一般检验水平Ⅱ级',
  cr: '',
  fu: '',
  ma: '',
  mi: ''
})

const itemRules = {
  templateName: [{ required: true, message: '请输入检验项目组', trigger: 'blur' }]
}

const sanitizeNumericInput = (field) => {
  let value = String(itemForm[field] ?? '')
  value = value.replace(/[^\d.]/g, '')
  const firstDotIndex = value.indexOf('.')
  if (firstDotIndex !== -1) {
    value = `${value.slice(0, firstDotIndex + 1)}${value.slice(firstDotIndex + 1).replace(/\./g, '')}`
  }
  itemForm[field] = value
}

const syncTemplateIdByName = () => {
  const text = String(itemForm.templateName || '').trim()
  const matched = templates.value.find(t => {
    const fullName = `${t.templateName || ''}${t.customerName ? ' - ' + t.customerName : ''}`.trim()
    return fullName === text || String(t.templateName || '').trim() === text
  })
  itemForm.templateId = matched ? matched.id : undefined
}

const itemModeLabel = computed(() => {
  if (itemMode.value === 'create') return '新增'
  if (itemMode.value === 'edit') return '编辑'
  return '查看'
})

const canSaveType = computed(() => {
  if (typeMode.value === 'create') return hasPermission('quality:finished-attributes:type:add')
  if (typeMode.value === 'edit') return hasPermission('quality:finished-attributes:type:edit')
  return false
})

const hasTypeFormChanged = computed(() => {
  if (typeMode.value !== 'edit' || !typeFormSnapshot.value) return true
  return JSON.stringify(buildTypePayload()) !== JSON.stringify(typeFormSnapshot.value)
})

const canSubmitType = computed(() => canSaveType.value && (typeMode.value !== 'edit' || hasTypeFormChanged.value))

const canSaveItem = computed(() => {
  if (itemMode.value === 'create') return hasPermission('quality:finished-attributes:item:add')
  if (itemMode.value === 'edit') return hasPermission('quality:finished-attributes:item:edit')
  return false
})

const buildTypePayload = () => ({
  name: String(typeForm.name || '').trim(),
  sortOrder: Number(typeForm.sortOrder || 1),
  enabled: !!typeForm.enabled
})

const resetTypeForm = () => {
  typeForm.id = undefined
  typeForm.name = ''
  typeForm.sortOrder = types.value.length + 1
  typeForm.enabled = true
  typeFormSnapshot.value = buildTypePayload()
}

const resetItemForm = () => {
  itemForm.id = undefined
  itemForm.templateId = undefined
  itemForm.templateName = ''
  itemForm.description = ''
  itemForm.standard = ''
  itemForm.aql = 'GB 2828.1 一般检验水平Ⅱ级'
  itemForm.cr = ''
  itemForm.fu = ''
  itemForm.ma = ''
  itemForm.mi = ''
  const defaultTypeId = getDefaultFirstRowTypeId()
  itemRows.value = [
    createEmptyItemRow(defaultTypeId),
    ...Array.from({ length: 4 }, () => createEmptyItemRow())
  ]
  itemFormSnapshot.value = null
}

const fillTypeForm = (row) => {
  if (!row) {
    resetTypeForm()
    return
  }
  typeForm.id = row.id
  typeForm.name = row.name || ''
  typeForm.sortOrder = row.sortOrder || 1
  typeForm.enabled = !!row.enabled
  typeFormSnapshot.value = buildTypePayload()
}

const buildItemSnapshot = () => {
  return JSON.stringify({
    templateId: itemForm.templateId,
    templateName: itemForm.templateName,
    description: itemForm.description,
    standard: itemForm.standard,
    aql: itemForm.aql,
    cr: itemForm.cr,
    fu: itemForm.fu,
    ma: itemForm.ma,
    mi: itemForm.mi,
    rows: itemRows.value.map(r => ({
      typeId: r.typeId,
      itemName: String(r.itemName || '').trim(),
      standard: String(r.standard || '').trim()
    }))
  })
}

const fillItemForm = (group) => {
  if (!group) {
    resetItemForm()
    itemFormSnapshot.value = buildItemSnapshot()
    return
  }
  itemForm.id = group.details?.[0]?.id // 保留一个主ID，供更新时判断
  itemForm.templateId = group.templateId
  itemForm.templateName = group.templateName || ''
  itemForm.description = group.description || ''
  itemForm.standard = group.standard || ''
  itemForm.aql = group.aql || ''
  itemForm.cr = group.cr || ''
  itemForm.fu = group.fu || ''
  itemForm.ma = group.ma || ''
  itemForm.mi = group.mi || ''
  
  if (group.details && group.details.length > 0) {
    itemRows.value = group.details.map(d => ({
      typeId: d.typeId || undefined,
      typeName: d.typeName || '',
      itemName: d.itemName || '',
      standard: d.standard || ''
    }))
  } else {
    const defaultTypeId = getDefaultFirstRowTypeId()
    itemRows.value = [
      createEmptyItemRow(defaultTypeId),
      ...Array.from({ length: 4 }, () => createEmptyItemRow())
    ]
  }
  
  // 等待渲染完成后记录快照
  nextTick(() => {
    itemFormSnapshot.value = buildItemSnapshot()
  })
}

const createEmptyItemRow = (defaultTypeId) => {
  const curr = types.value.find(t => Number(t.id) === Number(defaultTypeId))
  return {
    typeId: defaultTypeId || undefined,
    typeName: curr ? curr.name : '',
    itemName: '',
    standard: ''
  }
}

const getDefaultFirstRowTypeId = () => {
  const preferred = types.value.find(t => {
    const name = String(t.name || '').trim()
    return name === '外观检验' || name === '外观检测' || name.includes('外观')
  })
  return preferred ? preferred.id : undefined
}

const addItemRow = () => {
  itemRows.value.push(createEmptyItemRow())
}

const removeItemRow = async () => {
  if (itemRows.value.length <= 1) {
    ElMessage.warning('至少保留一行')
    return
  }
  const lastRow = itemRows.value[itemRows.value.length - 1]
  const hasItem = !!lastRow.itemName?.trim()
  const hasStandard = !!lastRow.standard?.trim()
  
  if (hasItem || hasStandard) {
    let msg = '最后一行已填写'
    if (hasItem && hasStandard) msg += '“检验项目”和“检验标准”'
    else if (hasItem) msg += '“检验项目”'
    else msg += '“检验标准”'
    msg += '，确定要删除吗？'
    
    try {
      await ElMessageBox.confirm(msg, '提示', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      })
    } catch {
      return // 用户取消删除
    }
  }
  itemRows.value.pop()
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadInit = async () => {
  const res = await getFinishedInspectionConfigInit()
  const data = res?.data || {}
  templates.value = data.templates || []
  types.value = data.types || []
  await loadItems()
  if (types.value.length) {
    selectedType.value = types.value[0]
    fillTypeForm(types.value[0])
    typeMode.value = 'view'
  }
}

const loadItems = async () => {
  const params = {
    templateName: filters.templateName,
    keyword: filters.keyword
  }
  const res = await getFinishedInspectionItems(params)
  items.value = res?.data || []
  pagination.total = items.value.length
  // 切换条件时，如果当前页超出范围则重置为第1页
  const maxPage = Math.ceil(pagination.total / pagination.pageSize) || 1
  if (pagination.currentPage > maxPage) {
    pagination.currentPage = 1
  }
}

const resetFilters = async () => {
  filters.templateName = ''
  filters.keyword = ''
}

const handleTypeCurrentChange = (row) => {
  selectedType.value = row || null
  if (row && typeMode.value !== 'create') {
    fillTypeForm(row)
    typeMode.value = 'view'
  }
}

const syncCheckedType = async (row) => {
  checkedType.value = row || null
  await nextTick()
  if (!typeTableRef.value) return
  typeTableRef.value.clearSelection()
  if (row) typeTableRef.value.toggleRowSelection(row, true)
}

const handleTypeSelectionChange = (selection) => {
  if (selection.length <= 1) {
    checkedType.value = selection[0] || null
    return
  }
  const latest = selection[selection.length - 1]
  if (!typeTableRef.value) {
    checkedType.value = latest
    return
  }
  typeTableRef.value.clearSelection()
  typeTableRef.value.toggleRowSelection(latest, true)
}

const handleTypeRowClick = (row) => {
  if (typeTableRef.value) typeTableRef.value.setCurrentRow(row)
  // 左侧点击不再联动右侧过滤
}

const beginCreateType = () => {
  typeMode.value = 'create'
  selectedType.value = null
  if (typeTableRef.value) typeTableRef.value.setCurrentRow()
  syncCheckedType(null)
  resetTypeForm()
}

const beginEditType = () => {
  if (!checkedType.value) {
    ElMessage.warning('请先勾选检验类型')
    return
  }
  typeMode.value = 'edit'
  selectedType.value = checkedType.value
  fillTypeForm(checkedType.value)
}

const saveType = async () => {
  if (!canSubmitType.value) return
  const payload = buildTypePayload()
  await typeFormRef.value.validate()
  if (typeMode.value === 'create') {
    await createFinishedInspectionType(payload)
    ElMessage.success('新增成功')
  } else {
    await updateFinishedInspectionType(typeForm.id, payload)
    ElMessage.success('更新成功')
  }
  const initRes = await getFinishedInspectionConfigInit()
  const data = initRes?.data || {}
  types.value = data.types || []
  const targetName = String(typeForm.name || '')
  const target = types.value.find(t => String(t.name || '') === targetName) || types.value[0] || null
  selectedType.value = target
  fillTypeForm(target)
  typeMode.value = 'view'
  syncCheckedType(target)
  await loadItems()
}

const removeType = async () => {
  if (!checkedType.value) {
    ElMessage.warning('请先勾选检验类型')
    return
  }
  await ElMessageBox.confirm(`确定删除检验类型“${checkedType.value.name}”吗？`, '提示', { type: 'warning' })
  await deleteFinishedInspectionType(checkedType.value.id)
  ElMessage.success('删除成功')
  const initRes = await getFinishedInspectionConfigInit()
  const data = initRes?.data || {}
  types.value = data.types || []
  selectedType.value = types.value[0] || null
  fillTypeForm(selectedType.value)
  typeMode.value = 'view'
  syncCheckedType(null)
  await loadItems()
}

const handleTemplateChange = (id) => {
  const curr = templates.value.find(t => Number(t.id) === Number(id))
  itemForm.templateName = curr ? curr.templateName : ''
}

const handleTypeChange = (id) => {
  const curr = types.value.find(t => Number(t.id) === Number(id))
  return curr ? curr.name : ''
}

const handleTypeRowChange = (id, row) => {
  row.typeName = handleTypeChange(id)
}

const handleItemCurrentChange = (row) => {
  // 不再自动回填表单
}

const handleItemRowClick = (row) => {
  if (itemTableRef.value) itemTableRef.value.setCurrentRow(row)
}

const beginCreateItem = () => {
  itemDialogMode.value = 'create'
  resetItemForm()
  // 清理之前的表单校验提示
  nextTick(() => {
    itemFormRef.value?.clearValidate()
  })
  if (filters.templateId) {
    itemForm.templateId = filters.templateId
    handleTemplateChange(filters.templateId)
  }
  if (filters.aql) itemForm.aql = filters.aql
  itemDialogVisible.value = true
}

const beginEditItem = (row) => {
  itemDialogMode.value = 'edit'
  fillItemForm(row)
  // 清理之前的表单校验提示
  nextTick(() => {
    itemFormRef.value?.clearValidate()
  })
  itemDialogVisible.value = true
}

const beginViewItem = (row) => {
  itemDialogMode.value = 'view'
  fillItemForm(row)
  // 清理之前的表单校验提示
  nextTick(() => {
    itemFormRef.value?.clearValidate()
  })
  itemDialogVisible.value = true
}

const handleDialogEnter = () => {
  if (itemDialogVisible.value && !itemSubmitting.value) {
    saveItem()
  }
}

const saveItem = async () => {
  if (itemSubmitting.value) return
  await itemFormRef.value.validate()
  
  if (itemDialogMode.value === 'edit') {
    const currentSnapshot = buildItemSnapshot()
    if (currentSnapshot === itemFormSnapshot.value) {
      ElMessage.info('数据未修改，无需保存')
      itemDialogVisible.value = false
      return
    }
  }

  syncTemplateIdByName()
  const filledRows = itemRows.value
    .map(row => ({
      typeId: row.typeId,
      typeName: row.typeName || handleTypeChange(row.typeId),
      itemName: String(row.itemName || '').trim(),
      standard: String(row.standard || '').trim()
    }))
    .filter(row => row.typeId || row.itemName || row.standard)

  if (!filledRows.length) {
    ElMessage.warning('请至少填写一行检验项目')
    return
  }

  const incompleteRow = filledRows.find(row => !row.typeId || !row.itemName || !row.standard)
  if (incompleteRow) {
    ElMessage.warning('请完整填写每一行的检验类型、检验项目和检验标准')
    return
  }

  const basePayload = {
    templateId: itemForm.templateId,
    templateName: itemForm.templateName,
    description: String(itemForm.description || '').trim(),
    standard: String(itemForm.standard || '').trim(),
    aql: itemForm.aql,
    cr: String(itemForm.cr || '').trim(),
    fu: String(itemForm.fu || '').trim(),
    ma: String(itemForm.ma || '').trim(),
    mi: String(itemForm.mi || '').trim()
  }

  itemSubmitting.value = true
  try {
    if (itemDialogMode.value === 'create') {
      await Promise.all(filledRows.map(row => createFinishedInspectionItem({
        ...basePayload,
        typeId: row.typeId,
        itemName: row.itemName,
        itemStandard: row.standard
      })))
      ElMessage.success('新增成功')
    } else {
      // 获取当前编辑组原有的明细ID
      const currentDetails = items.value.find(g => g.templateName === itemForm.templateName)?.details || []
      
      // 先全部删除原有的明细
      if (currentDetails.length > 0) {
        await Promise.all(currentDetails.map(d => deleteFinishedInspectionItem(d.id)))
      }

      // 重新创建所有明细
      await Promise.all(filledRows.map(row => createFinishedInspectionItem({
        ...basePayload,
        typeId: row.typeId,
        itemName: row.itemName,
        itemStandard: row.standard
      })))
      
      ElMessage.success('更新成功')
    }
    itemDialogVisible.value = false
    await loadItems()
  } catch (error) {
    ElMessage.error(error?.message || '保存失败')
  } finally {
    itemSubmitting.value = false
  }
}

const removeItem = async (group) => {
  await ElMessageBox.confirm(`确定删除检测组别“${group.templateName}”及其下属的所有检验项目吗？`, '提示', { type: 'warning' })
  try {
    const details = group.details || []
    if (details.length > 0) {
      await Promise.all(details.map(d => deleteFinishedInspectionItem(d.id)))
    } else if (group.id && !group._isGroup) {
      // 兼容可能存在的未聚合的旧单条数据
      await deleteFinishedInspectionItem(group.id)
    }
    ElMessage.success('删除成功')
    await loadItems()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(async () => {
  try {
    await loadInit()
  } catch (e) {
    ElMessage.error(e?.message || '加载失败')
  }
})

watch(
  () => [filters.templateName, filters.keyword],
  () => {
    if (filterTimer) clearTimeout(filterTimer)
    filterTimer = setTimeout(() => {
      loadItems()
    }, 250)
  }
)
</script>

<style scoped>
.app-container {
  padding: 0;
}

.box-card :deep(.el-card__body) {
  padding: 0;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 18px;
  font-weight: 700;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layout-container {
  display: grid;
  grid-template-columns: minmax(210px, 24%) 1fr;
  gap: 16px;
}

.left-panel,
.right-panel {
  min-width: 0;
}

.left-card {
  display: flex;
  flex-direction: column;
}

.inner-card {
  margin-bottom: 16px;
}

.inner-card :deep(.el-card__body) {
  padding: 16px;
}

.type-form {
  margin-top: 12px;
}

.type-form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.type-form-row-item {
  margin-bottom: 0;
}

.type-form-switch-item {
  margin-bottom: 0;
  margin-left: auto;
}

.left-actions {
  margin-top: 60px;
  display: flex;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
}

.left-actions :deep(.el-button) {
  padding: 8px 10px;
  margin-left: 0 !important;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.editable-table-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.flex-column-card {
  display: flex;
  flex-direction: column;
}

.flex-column-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
}

.compact-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
}

.dialog-body {
  padding: 0 0 6px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog-top-row {
  display: grid;
  grid-template-columns: 1.35fr 1.67fr;
  gap: 10px;
}

.dialog-desc-row {
  display: block;
}

.dialog-panel,
.dialog-field-card {
  border: 1px solid var(--el-border-color);
  background: #fff;
}

.dialog-panel {
  display: grid;
  grid-template-columns: 96px 1fr;
  align-items: stretch;
}

.dialog-panel-label,
.dialog-field-title {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 8px 10px;
  background: #f8f8f8;
  color: #303133;
  font-weight: 500;
  border-right: 1px solid var(--el-border-color);
  white-space: nowrap;
}

.dialog-field-title {
  min-height: 40px;
  border-right: 0;
  border-bottom: 1px solid var(--el-border-color);
}

.dialog-field-title-between {
  justify-content: space-between;
}

.dialog-form-item {
  margin-bottom: 0;
  padding: 5px 8px;
}

.dialog-form-item :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.dialog-aql-strip {
  display: grid;
  grid-template-columns: 96px repeat(4, 1fr);
  border: 1px solid var(--el-border-color);
  background: #fff;
}

.dialog-aql-title {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 6px 10px;
  background: #f8f8f8;
  color: #303133;
  font-weight: 500;
  border-right: 1px solid var(--el-border-color);
}

.aql-strip-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 40px;
  padding: 6px 10px;
  border-right: 1px solid var(--el-border-color);
}

.aql-strip-item:last-child {
  border-right: 0;
}

.aql-strip-label {
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
}

.aql-strip-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.aql-strip-code {
  color: #606266;
  white-space: nowrap;
}

.aql-strip-input-wrap :deep(.el-input) {
  min-width: 0;
}

.aql-strip-input-wrap :deep(.el-input__wrapper) {
  border-radius: 0;
}

.aql-inline-form-item {
  margin-bottom: 0;
  flex: 1;
}

.aql-inline-form-item :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.dialog-fields-row {
  min-width: 0;
  margin-top: 2px;
}

.dialog-entry-table {
  border: 1px solid var(--el-border-color);
  background: #fff;
}

.dialog-entry-header,
.dialog-entry-row {
  display: grid;
  grid-template-columns: 0.67fr 0.67fr 1.81fr;
}

.dialog-entry-head-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 10px;
  background: #f8f8f8;
  color: #303133;
  font-weight: 500;
  border-right: 1px solid var(--el-border-color);
  border-bottom: 1px solid var(--el-border-color);
}

.dialog-entry-head-cell:last-child {
  border-right: 0;
}

.dialog-entry-scroll {
  max-height: 270px;
  overflow-y: auto;
}

.dialog-entry-scroll.is-scrollable {
  overflow-y: auto;
}

.dialog-entry-cell {
  padding: 5px 8px;
  border-right: 1px solid var(--el-border-color);
  border-bottom: 1px solid var(--el-border-color);
}

.dialog-entry-row:last-child .dialog-entry-cell {
  border-bottom: 0;
}

.dialog-entry-cell:last-child {
  border-right: 0;
}

.dialog-entry-cell :deep(.el-input__wrapper),
.dialog-entry-cell :deep(.el-select__wrapper) {
  border-radius: 0;
  min-height: 34px;
}

.dialog-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-footer-left,
.dialog-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-footer-left .el-button,
.dialog-footer-right .el-button {
  min-width: 80px;
}

.table-container {
  /* 表格容器样式（如有需要） */
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  margin-right: 4px;
}

.filter-reset-btn {
  /* 移除 margin-left: auto 使其紧挨着搜索框 */
}

@media (max-width: 1400px) {
  .layout-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .left-actions {
    gap: 4px;
    margin-top: 0;
  }

  .left-actions :deep(.el-button) {
    padding: 6px 8px;
    font-size: 12px;
  }
}
</style>
