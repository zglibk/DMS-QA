<template>
  <div class="test-items-manager">
    <div class="manager-header">
        <span class="title">检验项目</span>
        <div class="header-actions">
            <el-button 
                v-if="userStore.isAdmin || userStore.hasPermission('quality:performance:config')" 
                :icon="Setting" 
                size="small" 
                @click="configVisible = true" 
                style="margin-right: 10px"
                :disabled="readonly"
            >配置</el-button>
            <el-dropdown @command="handleAddItem" trigger="click" :disabled="readonly">
                <el-button type="primary" size="small" :disabled="readonly">
                    添加实验 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item v-for="cfg in configs" :key="cfg.ID" :command="cfg.ItemCode">
                            {{ cfg.ItemName }}
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
    </div>

    <div v-if="items.length === 0" class="empty-items">
        暂无实验项目，请点击上方按钮添加
    </div>

    <div v-for="(item, index) in items" :key="item.localId || item.ID" class="item-card">
        <el-card shadow="hover">
            <template #header>
                <div class="item-header">
                    <span class="item-type-title">{{ getTypeName(item.TestType) }}</span>
                    <div>
                         <!-- Auto-save hint or status could go here -->
                        <el-button type="danger" link :icon="Delete" @click="handleDelete(index, item)" :disabled="readonly">删除</el-button>
                    </div>
                </div>
            </template>
            
            <component 
                :is="getComponent(item)" 
                v-model="items[index]" 
                :instruments="instruments"
                :inspection-items="inspectionItems"
                :config="getItemConfig(item)"
                :readonly="readonly"
            />
        </el-card>
    </div>

    <el-dialog v-model="previewVisible">
        <img w-full :src="previewImageUrl" alt="Preview Image" style="width: 100%" />
    </el-dialog>

    <PerformanceConfigDialog v-model:visible="configVisible" @change="fetchConfigs" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ArrowDown, Delete, Plus, Setting } from '@element-plus/icons-vue'
import { uploadImage, getInspectionItems, getConfigs } from '@/api/performance'
import AdhesionForm from './AdhesionForm.vue'
import PeelForm from './PeelForm.vue'
import AbrasionForm from './AbrasionForm.vue'
import AlcoholForm from './AlcoholForm.vue'
import DynamicTestForm from './DynamicTestForm.vue'
import PerformanceConfigDialog from './PerformanceConfigDialog.vue'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const props = defineProps({
    items: Array,
    instruments: Array,
    readonly: Boolean
})

const emit = defineEmits(['update:items', 'delete-item'])

const previewVisible = ref(false)
const previewImageUrl = ref('')
const inspectionItems = ref([])
const configs = ref([])
const configVisible = ref(false)

const fetchConfigs = async () => {
    try {
        const res = await getConfigs()
        configs.value = res.data
    } catch(e) { console.error(e) }
}

onMounted(async () => {
    fetchConfigs()
    try {
        const res = await getInspectionItems()
        inspectionItems.value = res.data
    } catch (e) {
        console.error(e)
    }
})

const getComponent = (item) => {
    // Check item.TestType (ItemCode)
    const config = configs.value.find(c => c.ItemCode === item.TestType)
    
    // Check if it's dynamic
    if (config && config.ComponentType === 'Dynamic') {
        return DynamicTestForm
    }
    
    let componentType = config ? config.ComponentType : null
    
    // Fallback mapping if config not loaded yet or legacy data
    if (!componentType) {
        const legacyMap = {
            'Adhesion': 'AdhesionForm',
            'Peel': 'PeelForm',
            'Abrasion': 'AbrasionForm',
            'Alcohol': 'AlcoholForm'
        }
        componentType = legacyMap[item.TestType]
    }

    const map = {
        'AdhesionForm': AdhesionForm,
        'PeelForm': PeelForm,
        'AbrasionForm': AbrasionForm,
        'AlcoholForm': AlcoholForm
    }
    return map[componentType]
}

const getItemConfig = (item) => {
    const config = configs.value.find(c => c.ItemCode === item.TestType)
    if (config && config.FormConfig) {
        try {
            return JSON.parse(config.FormConfig)
        } catch (e) {
            return { fields: [] }
        }
    }
    return null
}

const getTypeName = (type) => {
    const config = configs.value.find(c => c.ItemCode === type)
    if (config) return config.ItemName
    
    const map = {
        'Adhesion': '初粘性/持粘力/高低温测试',
        'Peel': '剥离力/离型力测试',
        'Abrasion': '耐磨测试',
        'Alcohol': '耐醇性测试'
    }
    return map[type] || type
}

const handleAddItem = (command) => {
    // Try to find default values from inspectionItems
    const config = configs.value.find(c => c.ItemCode === command)
    let defaultStandard = ''
    let defaultMethod = ''
    
    // Find matching inspection item
    if (config) {
        const targetName = config.ItemName
        
        // Helper to clean string for loose matching
        // Remove common suffixes: 测试, 实验, 检验, 性, 度
        const cleanName = (str) => {
            if (!str) return ''
            return str.replace(/测试|实验|检验|测定|检查|分析|性/g, '').trim()
        }

        const cleanTarget = cleanName(targetName)

        // Priority 1: Exact match
        let match = inspectionItems.value.find(i => i.TestItem === targetName)
        
        // Priority 2: Containment match (one contains the other)
        if (!match) {
            match = inspectionItems.value.find(i => i.TestItem && (i.TestItem.includes(targetName) || targetName.includes(i.TestItem)))
        }

        // Priority 3: Loose match (cleaned names contain each other or start with same chars)
        if (!match && cleanTarget.length >= 1) { 
             match = inspectionItems.value.find(i => {
                 if (!i.TestItem) return false
                 const cleanItem = cleanName(i.TestItem)
                 if (cleanItem.length < 1) return false
                 return cleanItem.includes(cleanTarget) || cleanTarget.includes(cleanItem)
             })
        }

        if (match) {
            defaultStandard = match.Standard || ''
            defaultMethod = match.TestMethod || ''
        }
    }

    const newItem = {
        localId: Date.now(), // Temp ID
        TestType: command,
        InstrumentID: null,
        Standard: defaultStandard,
        Method: defaultMethod,
        Conditions: {},
        ResultData: {},
        Images: []
    }
    
    // Special handling for Adhesion to set specific test name default if needed
    if (command === 'Adhesion') {
         // Default to first type or empty
         // newItem.Conditions.SpecificTestName = '初粘性' 
    }

    const newItems = [...props.items, newItem]
    emit('update:items', newItems)
}

const handleDelete = (index, item) => {
    emit('delete-item', item, index)
}

// Image Handling
const getFileList = (item) => {
    if (!item.Images) return []
    // Map paths to file objects
    // Assume paths are like "/uploads/..."
    // We need to prefix with server URL if needed, but relative usually works if proxy set.
    return item.Images.map((path, idx) => ({
        name: `img-${idx}`,
        url: path // path is relative URL from server
    }))
}

const customUpload = async (options, index) => {
    const { file, onSuccess, onError } = options
    const formData = new FormData()
    formData.append('file', file)
    
    try {
        const res = await uploadImage(formData)
        if (res.success) {
            const url = res.url
            // Add to item.Images
            const currentItem = props.items[index]
            if (!currentItem.Images) currentItem.Images = []
            currentItem.Images.push(url)
            emit('update:items', props.items) // Trigger update
            onSuccess(res)
        } else {
            onError(new Error(res.message))
        }
    } catch (e) {
        onError(e)
    }
}

const handleRemoveImage = (file, index) => {
    const currentItem = props.items[index]
    if (!currentItem.Images) return
    const urlToRemove = file.url
    currentItem.Images = currentItem.Images.filter(url => url !== urlToRemove)
    emit('update:items', props.items)
}

const handlePreview = (file) => {
    previewImageUrl.value = file.url
    previewVisible.value = true
}

</script>

<style scoped>
.test-items-manager {
    margin-top: 20px;
    padding: 0 15px;
}
.manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}
.title {
    font-weight: bold;
    font-size: 16px;
    border-left: 4px solid #1890ff;
    padding-left: 10px;
}
.item-card {
    margin-bottom: 20px;
}
.item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.item-type-title {
    font-weight: bold;
    font-size: 15px;
}
.empty-items {
    text-align: center;
    color: #999;
    padding: 30px;
    background: #f9f9f9;
    border: 1px dashed #ddd;
    border-radius: 4px;
}
</style>
