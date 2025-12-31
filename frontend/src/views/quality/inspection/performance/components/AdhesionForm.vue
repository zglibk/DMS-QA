<template>
  <div class="adhesion-form">
    <el-form :model="localData" label-width="100px" size="small" :disabled="readonly">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="试验项目">
            <el-radio-group v-model="localData.Conditions.SpecificTestName">
                <el-radio label="初粘性">初粘性</el-radio>
                <el-radio label="持粘力">持粘力</el-radio>
                <el-radio label="高低温测试">高低温测试</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="实验类型">
            <el-checkbox-group v-model="localData.Conditions.ExperimentType">
                <el-checkbox v-for="opt in typeOptions" :key="opt" :label="opt">{{ opt }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="测试仪器">
            <el-select 
              v-model="localData.InstrumentID" 
              style="width: 100%" 
              filterable 
              placeholder="请选择或输入搜索"
            >
              <el-option 
                v-for="inst in uniqueInstruments" 
                :key="inst.ID" 
                :label="inst.InstrumentName" 
                :value="inst.ID" 
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="实验目的">
            <el-input v-model="localData.Conditions.Purpose" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="实验条件">
            <el-input v-model="localData.Conditions.Condition" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="测试方法">
            <el-input v-model="localData.Method" placeholder="自动加载检验依据" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="table-title">{{ localData.Conditions.SpecificTestName || '测试' }}数据 (1-10号样品)</div>
      <el-table :data="[{}]" border size="small" style="margin-bottom: 15px;">
        <el-table-column label="样品编号" width="100" align="center" fixed>
            <template #default>
                <div style="font-weight: bold;">{{ localData.Conditions.SpecificTestName === '持粘力' ? '持粘时间(h)' : '测试数值' }}</div>
            </template>
        </el-table-column>
        <el-table-column v-for="i in 10" :key="i" :label="'#' + i" align="center" min-width="70">
          <template #default>
            <el-input v-model="samples[i-1].value" size="small" :disabled="readonly" />
          </template>
        </el-table-column>
        <el-table-column label="综合判定" align="center" width="150" fixed="right">
          <template #default>
             <el-select v-model="localData.Conclusion" size="small" placeholder="请选择" :disabled="readonly">
                 <el-option label="合格" value="合格" />
                 <el-option label="不合格" value="不合格" />
             </el-select>
          </template>
        </el-table-column>
      </el-table>

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
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import FileUpload from '@/components/FileUpload.vue'

const props = defineProps({
  modelValue: Object,
  instruments: Array,
  inspectionItems: Array,
  readonly: Boolean
})

const uniqueInstruments = computed(() => {
    if (!props.instruments) return []
    const map = new Map()
    for (const inst of props.instruments) {
        if (!map.has(inst.InstrumentName)) {
            map.set(inst.InstrumentName, inst)
        }
    }
    return Array.from(map.values())
})

const emit = defineEmits(['update:modelValue'])

const localData = ref({
  InstrumentID: null,
  Method: '',
  Conclusion: '',
  Conditions: {
    SpecificTestName: '',
    ExperimentType: [], // Changed to array
    Purpose: '',
    Condition: ''
  },
  ResultData: {
    samples: [],
    images: []
  }
})

const samples = ref([])
const fileList = ref([])
const isInternalUpdate = ref(false)
const typeOptions = ['来料检验', '打样', '小量试产', '大货生产', '材料变更', '客样分析', '其他']

onMounted(() => {
    // Init samples
    if (samples.value.length === 0) {
        for (let i = 0; i < 10; i++) {
            samples.value.push({ index: i + 1, value: '' })
        }
    }
})

watch([() => localData.value.Conditions.SpecificTestName, () => props.inspectionItems], ([name, items]) => {
    // Clear method first when switching
    localData.value.Method = ''
    
    if (name && items && items.length > 0) {
        const match = items.find(i => i.ItemName === name)
        if (match) {
            localData.value.Method = match.InspectionBasis || match.InspectionStandard
        }
    }
}, { immediate: true })

watch(() => props.modelValue, (val) => {
  if (val) {
    // Deep merge or assign
    // Ensure structure exists
    if (!val.Conditions) val.Conditions = {}
    if (!val.ResultData) val.ResultData = {}
    
    // Handle ExperimentType conversion if it was string (legacy)
    if (typeof val.Conditions.ExperimentType === 'string') {
        val.Conditions.ExperimentType = val.Conditions.ExperimentType ? [val.Conditions.ExperimentType] : []
    } else if (!Array.isArray(val.Conditions.ExperimentType)) {
        val.Conditions.ExperimentType = []
    }

    localData.value = val
    
    // Restore samples
    if (val.ResultData && val.ResultData.samples && val.ResultData.samples.length > 0) {
        samples.value = val.ResultData.samples
        // Ensure value prop exists (migrate legacy result if needed)
        samples.value.forEach(s => {
            if (s.value === undefined) {
                s.value = s.result || ''
            }
        })
    } else {
        // Init if empty
        samples.value = []
        for (let i = 0; i < 10; i++) samples.value.push({ index: i + 1, value: '' })
    }
    
    if (val.ResultData.images) {
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

</script>

<style scoped>
.table-title {
    font-weight: bold;
    margin-bottom: 10px;
    margin-top: 10px;
}
</style>
