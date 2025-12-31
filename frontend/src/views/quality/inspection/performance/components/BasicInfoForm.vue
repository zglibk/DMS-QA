<template>
  <div class="basic-info-form">
    <div class="section-header">
        <span class="title">基础信息</span>
        <el-button v-if="!isEdit" type="primary" link @click="isEdit = true" :disabled="readonly">编辑</el-button>
        <div v-else-if="isEdit">
            <el-button type="primary" size="small" @click="handleSave">保存</el-button>
            <el-button size="small" @click="handleCancel">取消</el-button>
        </div>
    </div>
    <el-form :model="form" label-width="90px" :disabled="!isEdit" size="small" class="info-form">
        <el-row :gutter="20">
            <template v-for="field in displayFields" :key="field.key">
                <el-col :span="8" v-if="field.visible">
                    <el-form-item :label="field.label">
                        <!-- Date Picker -->
                        <el-date-picker 
                            v-if="field.type === 'date'"
                            v-model="form[field.key]" 
                            type="date" 
                            value-format="YYYY-MM-DD" 
                            style="width: 100%" 
                            :disabled="field.readonly"
                        />
                        <!-- Select -->
                        <el-select 
                            v-else-if="field.type === 'select'"
                            v-model="form[field.key]"
                            style="width: 100%"
                            filterable
                            allow-create
                            default-first-option
                            :disabled="field.readonly"
                        >
                            <el-option 
                                v-for="opt in (field.options || [])" 
                                :key="opt" 
                                :label="opt" 
                                :value="opt" 
                            />
                        </el-select>
                        <!-- Text Input -->
                        <el-input 
                            v-else 
                            v-model="form[field.key]" 
                            :disabled="field.readonly || field.key === 'ReportNo'" 
                        />
                    </el-form-item>
                </el-col>
            </template>
        </el-row>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getAllConfigs } from '@/api/performance'

const props = defineProps({
    data: Object,
    readonly: Boolean
})

const emit = defineEmits(['update'])

const isEdit = ref(false)
const form = ref({})
const displayFields = ref([])

const defaultFields = [
    { key: 'ReportNo', label: '报告编号', type: 'text', visible: true, readonly: true, sort: 1 },
    { key: 'TestDate', label: '测试日期', type: 'date', visible: true, readonly: false, sort: 2 },
    { key: 'CustomerCode', label: '客户编号', type: 'text', visible: true, readonly: false, sort: 3 },
    { key: 'SampleName', label: '样品名称', type: 'text', visible: true, readonly: false, sort: 4 },
    { key: 'SampleModel', label: '样品型号', type: 'text', visible: true, readonly: false, sort: 5 },
    { key: 'BatchNo', label: '批次/工单', type: 'text', visible: true, readonly: false, sort: 6 },
    { key: 'Supplier', label: '供应商', type: 'text', visible: true, readonly: false, sort: 7 },
    { key: 'Specification', label: '规格', type: 'text', visible: true, readonly: false, sort: 8 }
]

onMounted(async () => {
    try {
        const res = await getAllConfigs()
        const configItem = res.data.find(item => item.ItemCode === 'ReportHeader')
        if (configItem && configItem.FormConfig) {
            let parsed = JSON.parse(configItem.FormConfig)
            // Handle double-stringification (if backend or previous save stored it as double-string)
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed)
                } catch (e) {
                    console.warn('Failed to second-pass parse config', e)
                }
            }
            
            // Use config from DB if it is a valid array, even if empty
            if (Array.isArray(parsed)) {
                displayFields.value = parsed
            } else {
                displayFields.value = defaultFields
            }
        } else {
            displayFields.value = defaultFields
        }
    } catch (e) {
        console.error('Failed to load header config', e)
        displayFields.value = defaultFields
    }
})

watch(() => props.data, (val) => {
    if (val) {
        form.value = { ...val }
    }
}, { immediate: true })

const handleSave = () => {
    emit('update', form.value)
    isEdit.value = false
}

const handleCancel = () => {
    form.value = { ...props.data }
    isEdit.value = false
}

defineExpose({ isEdit })
</script>

<style scoped>
.basic-info-form {
    background: #fff;
    padding: 15px;
    border-bottom: 1px solid #eee;
}
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}
.title {
    font-weight: bold;
    font-size: 16px;
    border-left: 4px solid #1890ff;
    padding-left: 10px;
}
.info-form {
    /* Compact layout */
}
</style>
