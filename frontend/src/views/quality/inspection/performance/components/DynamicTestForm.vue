<template>
  <div class="dynamic-test-form">
    <el-form :model="localData" label-width="120px" size="small" :disabled="readonly">
      <!-- Dynamic Fields -->
      <el-row :gutter="20">
        <template v-for="(field, index) in config.fields" :key="index">
            <el-col :span="field.span || 24">
                <el-form-item :label="field.label" :required="field.required">
                    <!-- Text Input -->
                    <el-input 
                        v-if="field.type === 'text'" 
                        v-model="targetObject(field.target)[field.key]" 
                        :placeholder="field.placeholder"
                    >
                        <template v-if="field.unit" #append>{{ field.unit }}</template>
                    </el-input>

                    <!-- Textarea -->
                    <el-input 
                        v-else-if="field.type === 'textarea'" 
                        type="textarea"
                        v-model="targetObject(field.target)[field.key]" 
                        :placeholder="field.placeholder"
                    />

                    <!-- Number -->
                    <el-input-number 
                        v-else-if="field.type === 'number'" 
                        v-model="targetObject(field.target)[field.key]" 
                        style="width: 100%"
                    />

                    <!-- Select -->
                    <el-select 
                        v-else-if="field.type === 'select'" 
                        v-model="targetObject(field.target)[field.key]"
                        style="width: 100%"
                        filterable
                        allow-create
                        default-first-option
                    >
                        <el-option 
                            v-for="opt in field.options" 
                            :key="opt" 
                            :label="opt" 
                            :value="opt" 
                        />
                    </el-select>

                    <!-- Radio -->
                    <el-radio-group 
                        v-else-if="field.type === 'radio'"
                        v-model="targetObject(field.target)[field.key]"
                    >
                        <el-radio v-for="opt in field.options" :key="opt" :label="opt">{{ opt }}</el-radio>
                    </el-radio-group>
                    
                    <!-- Checkbox -->
                    <el-checkbox-group 
                        v-else-if="field.type === 'checkbox'"
                        v-model="targetObject(field.target)[field.key]"
                    >
                        <el-checkbox v-for="opt in field.options" :key="opt" :label="opt">{{ opt }}</el-checkbox>
                    </el-checkbox-group>

                    <!-- Date -->
                    <el-date-picker
                        v-else-if="field.type === 'date'"
                        v-model="targetObject(field.target)[field.key]"
                        type="date"
                        style="width: 100%"
                    />
                </el-form-item>
            </el-col>
        </template>
      </el-row>

      <!-- Result Table (Optional) -->
      <div v-if="config.resultTable && config.resultTable.enabled">
          <div class="table-title">{{ config.resultTable.title || '测试数据' }}</div>
          <el-table :data="samples" border size="small" style="margin-bottom: 15px;">
             <el-table-column label="序号" width="60" align="center">
                 <template #default="{ $index }">{{ $index + 1 }}</template>
             </el-table-column>
             
             <template v-for="col in config.resultTable.columns" :key="col.key">
                 <el-table-column :label="col.label" align="center">
                     <template #default="{ row }">
                         <el-input v-if="col.type === 'text'" v-model="row[col.key]" size="small" />
                         <el-input-number v-else-if="col.type === 'number'" v-model="row[col.key]" size="small" controls-position="right" style="width: 100%" />
                         <el-radio-group v-else-if="col.type === 'radio'" v-model="row[col.key]">
                             <el-radio v-for="opt in col.options" :key="opt" :label="opt">{{ opt }}</el-radio>
                         </el-radio-group>
                     </template>
                 </el-table-column>
             </template>
             
             <el-table-column label="操作" width="60" align="center" v-if="config.resultTable.allowAdd && !readonly">
                 <template #default="{ $index }">
                     <el-button type="danger" icon="Delete" circle size="small" @click="removeSample($index)" />
                 </template>
             </el-table-column>
          </el-table>
          <div v-if="config.resultTable.allowAdd && !readonly" style="margin-bottom: 15px;">
              <el-button size="small" type="primary" plain @click="addSample">+ 添加样品</el-button>
          </div>
      </div>

      <!-- Image Upload (Optional) -->
      <div v-if="config.enableImages">
          <div class="table-title" style="margin-top: 15px;" v-if="fileList.length > 0 || !readonly">测试图片</div>
          <div style="padding: 0 10px;" v-if="fileList.length > 0 || !readonly">
              <FileUpload 
                  v-model:fileList="fileList"
                  :disabled="readonly"
                  :maxCount="5"
                  tip="上传"
                  accept=".jpg,.jpeg,.png"
              />
          </div>
      </div>

      <!-- Conclusion -->
      <el-form-item label="综合判定">
          <el-radio-group v-model="localData.Conclusion">
              <el-radio label="合格">合格</el-radio>
              <el-radio label="不合格">不合格</el-radio>
          </el-radio-group>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import FileUpload from '@/components/FileUpload.vue'

const props = defineProps({
  modelValue: Object,
  config: {
      type: Object,
      default: () => ({ fields: [], resultTable: { enabled: false } })
  },
  readonly: Boolean
})

const emit = defineEmits(['update:modelValue'])

const localData = ref({
  Conditions: {},
  ResultData: { samples: [] },
  Conclusion: ''
})

const samples = ref([])
const fileList = ref([])
const isInternalUpdate = ref(false)

const targetObject = (target) => {
    if (target === 'ResultData') return localData.value.ResultData
    return localData.value.Conditions
}

// Init default structure
const initData = () => {
    if (!localData.value.Conditions) localData.value.Conditions = {}
    if (!localData.value.ResultData) localData.value.ResultData = {}
    
    // Initialize array fields if type is checkbox
    if (props.config && props.config.fields) {
        props.config.fields.forEach(field => {
            if (field.type === 'checkbox') {
                const target = targetObject(field.target)
                if (!Array.isArray(target[field.key])) {
                    target[field.key] = []
                }
            }
        })
    }
}

onMounted(() => {
    initData()
    // Init samples if table enabled
    if (props.config.resultTable && props.config.resultTable.enabled && samples.value.length === 0) {
        const count = props.config.resultTable.defaultRows || 5
        for (let i = 0; i < count; i++) {
            samples.value.push({})
        }
    }
})

watch(() => props.modelValue, (val) => {
    if (val) {
        localData.value = val
        initData()
        
        if (val.ResultData && val.ResultData.samples) {
            samples.value = val.ResultData.samples
        } else {
            // Re-init if empty and table enabled
             if (props.config.resultTable && props.config.resultTable.enabled && samples.value.length === 0) {
                 const count = props.config.resultTable.defaultRows || 5
                 for (let i = 0; i < count; i++) {
                     samples.value.push({})
                 }
             }
        }
        
        if (val.ResultData && val.ResultData.images) {
            isInternalUpdate.value = true
            fileList.value = val.ResultData.images
            nextTick(() => { isInternalUpdate.value = false })
        } else {
            if (fileList.value.length > 0) {
                isInternalUpdate.value = true
                fileList.value = []
                nextTick(() => { isInternalUpdate.value = false })
            }
        }
    }
}, { immediate: true, deep: true })

watch(fileList, (val) => {
    if (isInternalUpdate.value) return
    if (!localData.value.ResultData) localData.value.ResultData = {}
    const imgs = val.map(f => ({ name: f.name, url: f.url }))
    localData.value.ResultData.images = imgs
    localData.value.Images = imgs
    emit('update:modelValue', localData.value)
}, { deep: true })

watch(localData, (val) => {
    val.ResultData.samples = samples.value
    emit('update:modelValue', val)
}, { deep: true })

watch(samples, () => {
    localData.value.ResultData.samples = samples.value
    emit('update:modelValue', localData.value)
}, { deep: true })

const addSample = () => {
    samples.value.push({})
}

const removeSample = (index) => {
    samples.value.splice(index, 1)
}
</script>

<style scoped>
.table-title {
    font-weight: bold;
    margin-bottom: 10px;
    margin-top: 10px;
    font-size: 14px;
    color: #606266;
}
</style>
