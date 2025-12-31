<template>
  <el-dialog
    title="实验项目配置管理"
    :model-value="visible"
    @update:model-value="updateVisible"
    width="900px"
    append-to-body
  >
    <div class="config-manager">
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleAdd">添加实验项目</el-button>
        <el-button type="success" :icon="Setting" @click="handleHeaderConfig">表头配置</el-button>
        <el-button :icon="Refresh" @click="fetchData">刷新</el-button>
      </div>

      <el-table :data="list" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="ItemName" label="项目名称" />
        <el-table-column prop="ItemCode" label="项目代码" width="120" />
        <el-table-column prop="ComponentType" label="组件类型" width="150">
            <template #default="{ row }">
                <el-tag>{{ row.ComponentType }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column prop="SortOrder" label="排序" width="80" align="center" />
        <el-table-column prop="IsEnabled" label="状态" width="80" align="center">
            <template #default="{ row }">
                <el-tag :type="row.IsEnabled ? 'success' : 'info'">{{ row.IsEnabled ? '启用' : '禁用' }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
            <template #default="{ row }">
                <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
                <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Edit Dialog -->
    <el-dialog
        v-model="editVisible"
        :title="form.ID ? '编辑项目' : '添加项目'"
        width="800px"
        append-to-body
        custom-class="edit-dialog"
    >
        <el-tabs v-model="activeTab">
            <el-tab-pane label="基本信息" name="basic">
                <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
                    <el-form-item label="项目名称" prop="ItemName">
                        <el-input v-model="form.ItemName" placeholder="例如：初粘性测试" />
                    </el-form-item>
                    <el-form-item label="项目代码" prop="ItemCode">
                        <el-input v-model="form.ItemCode" placeholder="例如：Adhesion_Custom" />
                    </el-form-item>
                    <el-form-item label="组件类型" prop="ComponentType">
                        <el-select v-model="form.ComponentType" placeholder="选择使用的录入模板" style="width: 100%">
                            <el-option label="动态表单 (Dynamic)" value="Dynamic" />
                            <el-option label="初粘性/持粘力 (AdhesionForm)" value="AdhesionForm" />
                            <el-option label="剥离力/离型力 (PeelForm)" value="PeelForm" />
                            <el-option label="耐磨测试 (AbrasionForm)" value="AbrasionForm" />
                            <el-option label="耐醇性测试 (AlcoholForm)" value="AlcoholForm" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="排序" prop="SortOrder">
                        <el-input-number v-model="form.SortOrder" :min="0" />
                    </el-form-item>
                    <el-form-item label="是否启用" prop="IsEnabled">
                        <el-switch v-model="form.IsEnabled" />
                    </el-form-item>
                    <el-form-item label="描述" prop="Description">
                        <el-input v-model="form.Description" type="textarea" />
                    </el-form-item>
                </el-form>
            </el-tab-pane>
            
            <el-tab-pane label="表单设计" name="design" :disabled="form.ComponentType !== 'Dynamic'">
                <div class="form-designer" style="display: flex; gap: 20px; height: 500px;">
                    <!-- Left: Configuration -->
                    <div class="designer-left" style="flex: 2; overflow-y: auto; padding-right: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div class="section-title" style="margin-bottom: 0">字段配置</div>
                            <el-button type="warning" link :icon="QuestionFilled" @click="helpVisible = true">配置说明</el-button>
                        </div>
                        <el-table :data="formConfig.fields" border size="small" style="margin-bottom: 10px">
                            <el-table-column label="标签" prop="label">
                                <template #default="{ row }">
                                    <el-input v-model="row.label" size="small" />
                                </template>
                            </el-table-column>
                            <el-table-column label="Key" prop="key">
                                <template #default="{ row }">
                                    <el-input v-model="row.key" size="small" />
                                </template>
                            </el-table-column>
                            <el-table-column label="类型" prop="type" width="120">
                                <template #default="{ row }">
                                    <el-select v-model="row.type" size="small">
                                        <el-option label="文本" value="text" />
                                        <el-option label="数字" value="number" />
                                        <el-option label="下拉" value="select" />
                                        <el-option label="单选" value="radio" />
                                        <el-option label="多选" value="checkbox" />
                                        <el-option label="日期" value="date" />
                                    </el-select>
                                </template>
                            </el-table-column>
                            <el-table-column label="目标" prop="target" width="100">
                                <template #default="{ row }">
                                    <el-select v-model="row.target" size="small">
                                        <el-option label="条件" value="Conditions" />
                                        <el-option label="结果" value="ResultData" />
                                    </el-select>
                                </template>
                            </el-table-column>
                            <el-table-column label="操作" width="60" align="center">
                                <template #default="{ $index }">
                                    <el-button type="danger" icon="Delete" circle size="small" @click="removeField($index)" />
                                </template>
                            </el-table-column>
                        </el-table>
                        <el-button size="small" type="primary" plain @click="addField">+ 添加字段</el-button>
                        
                        <div class="section-title" style="margin-top: 20px">结果表格配置</div>
                        <el-checkbox v-model="formConfig.resultTable.enabled">启用结果表格</el-checkbox>
                        
                        <div v-if="formConfig.resultTable.enabled" style="margin-top: 10px">
                            <el-table :data="formConfig.resultTable.columns" border size="small">
                                <el-table-column label="列名" prop="label">
                                    <template #default="{ row }">
                                        <el-input v-model="row.label" size="small" />
                                    </template>
                                </el-table-column>
                                <el-table-column label="Key" prop="key">
                                    <template #default="{ row }">
                                        <el-input v-model="row.key" size="small" />
                                    </template>
                                </el-table-column>
                                <el-table-column label="类型" prop="type" width="120">
                                    <template #default="{ row }">
                                        <el-select v-model="row.type" size="small">
                                            <el-option label="文本" value="text" />
                                            <el-option label="数字" value="number" />
                                        </el-select>
                                    </template>
                                </el-table-column>
                                <el-table-column label="操作" width="60" align="center">
                                    <template #default="{ $index }">
                                        <el-button type="danger" icon="Delete" circle size="small" @click="removeColumn($index)" />
                                    </template>
                                </el-table-column>
                            </el-table>
                            <el-button size="small" type="primary" plain @click="addColumn" style="margin-top: 5px">+ 添加列</el-button>
                        </div>

                        <div class="section-title" style="margin-top: 20px">其他配置</div>
                        <el-checkbox v-model="formConfig.enableImages">启用图片上传</el-checkbox>
                    </div>

                    <!-- Right: JSON Preview -->
                    <div class="designer-right" style="flex: 1; border-left: 1px solid #eee; padding-left: 20px; display: flex; flex-direction: column;">
                        <div class="section-title">JSON 预览</div>
                        <div class="json-preview-box">
                            <pre v-html="highlightJSON"></pre>
                        </div>
                    </div>
                </div>
            </el-tab-pane>
        </el-tabs>

        <template #footer>
            <el-button @click="editVisible = false">取消</el-button>
            <el-button type="primary" @click="submitForm">确定</el-button>
        </template>
    </el-dialog>

    <!-- Header Config Dialog -->
    <el-dialog
        v-model="headerConfigVisible"
        title="报告表头配置"
        width="900px"
        append-to-body
    >
        <el-alert 
            title="说明" 
            type="info" 
            show-icon 
            :closable="false" 
            style="margin-bottom: 15px; background-color: #ecf5ff; border: 1px solid #d9ecff;"
        >
            <template #default>
                <div style="color: #409EFF; font-size: 13px;">
                    此处配置报告基础信息的显示字段、名称和控件类型。Key值对应数据库字段，建议使用英文且不可重复。
                </div>
            </template>
        </el-alert>
        
        <div style="margin-bottom: 10px;">
             <el-button type="primary" size="small" :icon="Plus" @click="addHeaderField">添加字段</el-button>
        </div>

        <el-table :data="headerConfigList" border row-key="_id" ref="headerTableRef">
            <el-table-column width="40" align="center">
                <template #default>
                    <el-icon style="cursor: grab" class="drag-handle"><Grid /></el-icon>
                </template>
            </el-table-column>
            <el-table-column prop="key" label="Key (数据库字段)" width="150">
                <template #default="{ row }">
                    <el-input v-model="row.key" size="small" :disabled="row.readonly" />
                </template>
            </el-table-column>
            <el-table-column prop="label" label="显示名称">
                <template #default="{ row }">
                    <el-input v-model="row.label" size="small" />
                </template>
            </el-table-column>
            <el-table-column prop="type" label="控件类型" width="120">
                <template #default="{ row }">
                    <el-select v-model="row.type" size="small" :disabled="row.readonly && row.key !== 'Supplier'">
                        <el-option label="文本框" value="text" />
                        <el-option label="日期选择" value="date" />
                        <el-option label="下拉框" value="select" />
                    </el-select>
                </template>
            </el-table-column>
            <el-table-column prop="options" label="选项配置 (逗号分隔)" min-width="200">
                <template #default="{ row }">
                    <el-input 
                        v-if="row.type === 'select'" 
                        v-model="row.optionsStr" 
                        size="small" 
                        placeholder="选项1,选项2,选项3"
                        @change="(val) => row.options = val.split(/[,，]/).map(s => s.trim()).filter(s => s)"
                        :disabled="row.readonly && row.key !== 'Supplier'" 
                    />
                    <span v-else style="color: #999">-</span>
                </template>
            </el-table-column>
            <el-table-column prop="visible" label="显示" width="80" align="center">
                <template #default="{ row }">
                    <el-switch v-model="row.visible" size="small" />
                </template>
            </el-table-column>
            <el-table-column label="操作" width="130" align="center">
                <template #default="{ $index, row }">
                    <el-button-group>
                        <el-button size="small" :disabled="$index === 0" @click="moveHeaderField($index, -1)">
                            <el-icon><Top /></el-icon>
                        </el-button>
                        <el-button size="small" :disabled="$index === headerConfigList.length - 1" @click="moveHeaderField($index, 1)">
                            <el-icon><Bottom /></el-icon>
                        </el-button>
                    </el-button-group>
                    <el-button 
                        v-if="!row.readonly" 
                        type="danger" 
                        link 
                        :icon="Delete" 
                        size="small" 
                        style="margin-left: 5px" 
                        @click="removeHeaderField($index)"
                    />
                </template>
            </el-table-column>
        </el-table>

        <template #footer>
            <el-button @click="headerConfigVisible = false">取消</el-button>
            <el-button type="primary" @click="saveHeaderConfig">保存配置</el-button>
        </template>
    </el-dialog>

    <el-drawer v-model="helpVisible" title="表单配置说明" size="400px" append-to-body>
        <div class="help-content">
            <h3>1. 字段配置</h3>
            <p>用于定义实验的基础信息输入项，例如测试条件、环境参数等。</p>
            <ul>
                <li><strong>标签 (Label)</strong>: 显示在输入框左侧的名称，如"测试温度"。</li>
                <li><strong>Key</strong>: 数据存储的字段名，<span style="color: red">必须唯一</span>，如"temperature"。建议使用英文。</li>
                <li><strong>类型</strong>: 
                    <ul>
                        <li>文本: 普通输入框</li>
                        <li>数字: 数字输入框</li>
                        <li>下拉/单选/多选: 目前需手动输入选项（暂未实现选项配置）。</li>
                        <li>日期: 日期选择器。</li>
                    </ul>
                </li>
                <li><strong>目标 (Target)</strong>: 
                    <ul>
                        <li>Conditions: 存入实验条件对象（推荐用于环境、方法等）。</li>
                        <li>ResultData: 存入结果数据对象。</li>
                    </ul>
                </li>
            </ul>

            <h3>2. 结果表格配置</h3>
            <p>用于定义多组样品测试数据的表格列。</p>
            <ul>
                <li><strong>启用结果表格</strong>: 勾选后，表单下方会出现一个样品数据录入表。</li>
                <li><strong>列名</strong>: 表头显示的名称，如"样品编号"、"粘力值"。</li>
                <li><strong>Key</strong>: 对应每一行数据的字段名，如"sampleNo"、"value"。</li>
                <li><strong>类型</strong>: 定义该列输入框的类型。</li>
            </ul>
            
            <el-alert title="提示" type="warning" :closable="false" style="margin-top: 20px" class="contrast-alert">
                配置完成后，请点击"确定"保存。新的配置将立即生效，用户添加该实验时将看到新的表单结构。
            </el-alert>
        </div>
    </el-drawer>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed, nextTick, onBeforeUnmount } from 'vue'
import { getAllConfigs, addConfig, updateConfig, deleteConfig } from '@/api/performance'
import { Plus, Refresh, Delete, QuestionFilled, Setting, Grid, Top, Bottom } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Sortable from 'sortablejs'

const props = defineProps({
    visible: Boolean
})

const emit = defineEmits(['update:visible', 'change'])

const list = ref([])
const loading = ref(false)
const editVisible = ref(false)
const helpVisible = ref(false)
const headerConfigVisible = ref(false)
const formRef = ref(null)
const activeTab = ref('basic')
const headerTableRef = ref(null)
let sortableInstance = null

const headerConfigList = ref([])
const headerConfigId = ref(null)

const form = reactive({
    ID: null,
    ItemName: '',
    ItemCode: '',
    ComponentType: '',
    SortOrder: 0,
    IsEnabled: true,
    Description: '',
    FormConfig: null
})

const formConfig = reactive({
    fields: [],
    resultTable: {
        enabled: false,
        columns: []
    },
    enableImages: false
})

const rules = {
    ItemName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
    ItemCode: [{ required: true, message: '请输入项目代码', trigger: 'blur' }],
    ComponentType: [{ required: true, message: '请选择组件类型', trigger: 'change' }]
}

const updateVisible = (val) => {
    emit('update:visible', val)
}

const fetchData = async () => {
    loading.value = true
    try {
        const res = await getAllConfigs()
        list.value = res.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

watch(() => props.visible, (val) => {
    if (val) {
        fetchData()
    }
})

const handleAdd = () => {
    form.ID = null
    form.ItemName = ''
    form.ItemCode = ''
    form.ComponentType = 'Dynamic'
    form.SortOrder = (list.value.length + 1)
    form.IsEnabled = true
    form.Description = ''
    form.FormConfig = null
    
    // Reset config
    formConfig.fields = []
    formConfig.resultTable = { enabled: false, columns: [] }
    formConfig.enableImages = false
    
    activeTab.value = 'basic'
    editVisible.value = true
}

const handleEdit = (row) => {
    Object.assign(form, row)
    
    // Load config
    if (row.FormConfig) {
        try {
            const parsed = JSON.parse(row.FormConfig)
            formConfig.fields = parsed.fields || []
            formConfig.resultTable = parsed.resultTable || { enabled: false, columns: [] }
            formConfig.enableImages = parsed.enableImages || false
        } catch(e) {
             formConfig.fields = []
             formConfig.resultTable = { enabled: false, columns: [] }
             formConfig.enableImages = false
        }
    } else {
        formConfig.fields = []
        formConfig.resultTable = { enabled: false, columns: [] }
        formConfig.enableImages = false
    }
    
    activeTab.value = 'basic'
    editVisible.value = true
}

const handleDelete = (row) => {
    ElMessageBox.confirm('确定删除该配置吗？', '提示', { type: 'warning' })
        .then(async () => {
            await deleteConfig(row.ID)
            ElMessage.success('删除成功')
            fetchData()
            emit('change')
        })
        .catch(() => {})
}

const addField = () => {
    formConfig.fields.push({
        label: '新字段',
        key: 'field_' + Date.now(),
        type: 'text',
        target: 'Conditions'
    })
}

const removeField = (index) => {
    formConfig.fields.splice(index, 1)
}

const addColumn = () => {
    formConfig.resultTable.columns.push({
        label: '新列',
        key: 'col_' + Date.now(),
        type: 'text'
    })
}

const removeColumn = (index) => {
    formConfig.resultTable.columns.splice(index, 1)
}

const submitForm = async () => {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
        if (valid) {
            // Check dynamic form empty
            if (form.ComponentType === 'Dynamic') {
                 const hasFields = formConfig.fields.length > 0
                 const hasTable = formConfig.resultTable.enabled && formConfig.resultTable.columns.length > 0
                 
                 if (!hasFields && !hasTable) {
                     try {
                         await ElMessageBox.confirm(
                             '检测到您选择了"动态表单"但未配置任何字段。建议先进行表单设计。',
                             '提示',
                             {
                                 confirmButtonText: '前往设计',
                                 cancelButtonText: '直接保存',
                                 type: 'warning',
                                 distinguishCancelAndClose: true
                             }
                         )
                         // Go to design
                         activeTab.value = 'design'
                         return
                     } catch (action) {
                         if (action !== 'cancel') return
                         // If cancel, proceed to save
                     }
                 }
            }
            
            await saveConfig()
        }
    })
}

const saveConfig = async () => {
    try {
        // Prepare FormConfig
        if (form.ComponentType === 'Dynamic') {
            form.FormConfig = {
                fields: formConfig.fields,
                resultTable: formConfig.resultTable,
                enableImages: formConfig.enableImages
            }
        } else {
            form.FormConfig = null
        }
        
        if (form.ID) {
            await updateConfig(form.ID, form)
            ElMessage.success('更新成功')
        } else {
            await addConfig(form)
            ElMessage.success('添加成功')
        }
        editVisible.value = false
        fetchData()
        emit('change')
    } catch (e) {
        console.error(e)
    }
}

const highlightJSON = computed(() => {
    if (!formConfig) return ''
    const json = JSON.stringify(formConfig, null, 2)
    return json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'number'
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key'
                } else {
                    cls = 'string'
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean'
            } else if (/null/.test(match)) {
                cls = 'null'
            }
            return '<span class="' + cls + '">' + match + '</span>'
        })
})

const handleHeaderConfig = async () => {
    loading.value = true
    try {
        // Find existing ReportHeader config
        const existing = list.value.find(item => item.ItemCode === 'ReportHeader')
        
        let configData = []
        if (existing) {
            headerConfigId.value = existing.ID
            try {
                if (existing.FormConfig) {
                    let parsed = JSON.parse(existing.FormConfig)
                    // Handle double-stringification
                    if (typeof parsed === 'string') {
                        try {
                            parsed = JSON.parse(parsed)
                        } catch (e) {
                            console.warn('Failed to second-pass parse config', e)
                        }
                    }
                    
                    if (Array.isArray(parsed)) {
                        configData = parsed
                    }
                }
            } catch (e) {
                console.error('Failed to parse existing header config', e)
            }
        } else {
            headerConfigId.value = null
        }
        
        // Merge with default if empty or missing keys
        const defaults = [
            { key: 'ReportNo', label: '报告编号', type: 'text', visible: true, readonly: true },
            { key: 'TestDate', label: '测试日期', type: 'date', visible: true, readonly: false },
            { key: 'CustomerCode', label: '客户编号', type: 'text', visible: true, readonly: false },
            { key: 'SampleName', label: '样品名称', type: 'text', visible: true, readonly: false },
            { key: 'SampleModel', label: '样品型号', type: 'text', visible: true, readonly: false },
            { key: 'BatchNo', label: '批次/工单', type: 'text', visible: true, readonly: false },
            { key: 'Supplier', label: '供应商', type: 'text', visible: true, readonly: false },
            { key: 'Specification', label: '规格', type: 'text', visible: true, readonly: false }
        ]
        
        // If no config, use defaults
        if (configData.length === 0) {
            configData = defaults
        } else {
            // Ensure all default keys exist (in case of schema update)
            defaults.forEach(def => {
                const found = configData.find(c => c.key === def.key)
                if (!found) {
                    configData.push(def)
                } else {
                    // Ensure new properties exist
                    if (!found.type) found.type = def.type
                }
            })
        }
        
        // Prepare display data (add optionsStr for editing)
        headerConfigList.value = configData.map(item => ({
            ...item,
            _id: Date.now() + Math.random(), // Stable ID for row-key
            optionsStr: (item.options || []).join(',')
        }))
        
        headerConfigVisible.value = true
        setTimeout(() => initSortable(), 100)
    } catch (e) {
        console.error(e)
        ElMessage.error('加载表头配置失败')
    } finally {
        loading.value = false
    }
}

const initSortable = () => {
    nextTick(() => {
        const el = headerTableRef.value.$el.querySelector('.el-table__body-wrapper tbody')
        if (!el) return
        
        if (sortableInstance) sortableInstance.destroy()
        
        sortableInstance = Sortable.create(el, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: ({ newIndex, oldIndex }) => {
                const targetRow = headerConfigList.value.splice(oldIndex, 1)[0]
                headerConfigList.value.splice(newIndex, 0, targetRow)
            }
        })
    })
}

onBeforeUnmount(() => {
    if (sortableInstance) sortableInstance.destroy()
})

const moveHeaderField = (index, delta) => {
    const newIndex = index + delta
    if (newIndex < 0 || newIndex >= headerConfigList.value.length) return
    
    const temp = headerConfigList.value[index]
    headerConfigList.value[index] = headerConfigList.value[newIndex]
    headerConfigList.value[newIndex] = temp
}

const addHeaderField = () => {
    headerConfigList.value.push({
        _id: Date.now() + Math.random(),
        key: 'Field_' + Date.now(),
        label: '新字段',
        type: 'text',
        visible: true,
        readonly: false,
        options: []
    })
}

const removeHeaderField = (index) => {
    ElMessageBox.confirm('确定删除该字段配置吗？', '提示', { type: 'warning' })
        .then(() => {
            headerConfigList.value.splice(index, 1)
        })
        .catch(() => {})
}

const saveHeaderConfig = async () => {
    try {
        const payload = {
            ItemName: '报告基础信息配置',
            ItemCode: 'ReportHeader',
            ComponentType: 'HeaderConfig',
            SortOrder: 0,
            IsEnabled: true,
            Description: 'System Config for Report Header',
            FormConfig: headerConfigList.value.map(item => {
                // Clean up temporary fields like optionsStr and _id
                const { optionsStr, _id, ...rest } = item
                return rest
            })
        }
        
        if (headerConfigId.value) {
            await updateConfig(headerConfigId.value, { ...payload, ID: headerConfigId.value })
        } else {
            await addConfig(payload)
        }
        
        ElMessage.success('配置已保存')
        headerConfigVisible.value = false
        fetchData()
    } catch (e) {
        console.error(e)
        ElMessage.error('保存失败')
    }
}
</script>

<style scoped>
.toolbar {
    margin-bottom: 15px;
    display: flex;
    gap: 10px;
}
.section-title {
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 14px;
    color: #303133;
    border-left: 3px solid #409EFF;
    padding-left: 8px;
}
.help-content {
    padding: 0 5px;
    font-size: 14px;
    line-height: 1.6;
    color: #606266;
}
.help-content h3 {
    margin-top: 25px;
    margin-bottom: 15px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    border-left: 4px solid #409EFF;
    padding-left: 10px;
    background-color: #f5f7fa;
    padding-top: 5px;
    padding-bottom: 5px;
}
.help-content h3:first-of-type {
    margin-top: 0;
}
.help-content ul {
    padding-left: 5px; /* Reduced padding since we handle indentation in li */
    margin-bottom: 10px;
    list-style: none;
}
.help-content li {
    margin-bottom: 8px;
    position: relative;
    padding-left: 18px;
}
.help-content li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 7px;
    width: 6px;
    height: 6px;
    background-color: #409EFF;
    transform: rotate(45deg); /* Diamond shape */
}
.help-content li strong {
    color: #303133;
    font-weight: 600;
    margin-right: 4px;
}
.help-content ul ul {
    margin-top: 5px;
    margin-bottom: 5px;
    color: #909399;
    padding-left: 5px;
}
.help-content ul ul li {
    font-size: 13px;
}
.help-content ul ul li::before {
    background-color: #909399;
    width: 4px;
    height: 4px;
    top: 8px;
    border-radius: 50%; /* Circle shape for nested */
    transform: none;
}
:deep(.contrast-alert .el-alert__description) {
    color: #8a6d3b !important; /* Darker warning color for better contrast */
    font-weight: 500;
}
:deep(.contrast-alert .el-alert__title) {
    color: #8a6d3b !important;
    font-weight: bold;
}
.json-preview-box {
    flex: 1;
    background-color: #fafafa;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    padding: 10px;
    overflow: auto;
    font-family: Consolas, Monaco, monospace;
    font-size: 13px;
    line-height: 1.5;
}
:deep(.key) { color: #a626a4; }
:deep(.string) { color: #50a14f; }
:deep(.number) { color: #986801; }
:deep(.boolean) { color: #e45649; }
:deep(.null) { color: #e45649; }
</style>
