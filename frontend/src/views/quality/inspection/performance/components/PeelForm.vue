<template>
  <div class="peel-form">
    <el-form :model="localData" label-width="100px" size="small" :disabled="readonly">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="试验项目">
            <el-radio-group v-model="localData.Conditions.SpecificTestName">
                <el-radio label="剥离力">剥离力</el-radio>
                <el-radio label="离型力">离型力</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="单位选择">
            <el-radio-group v-model="localData.Conditions.Unit" size="small">
                <el-radio-button label="N">N</el-radio-button>
                <el-radio-button label="kgf">kgf</el-radio-button>
                <el-radio-button label="gf">gf</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="8">
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

        <!-- Row 1 -->
        <el-col :span="8">
          <el-form-item label="试验人员">
            <el-input v-model="localData.Conditions.Tester" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="试验标准">
            <el-input v-model="localData.Standard" placeholder="自动加载" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="试验规格">
            <el-input v-model="localData.Conditions.Spec" />
          </el-form-item>
        </el-col>

        <!-- Row 2 -->
        <el-col :span="8">
          <el-form-item label="试验速度">
            <el-input v-model="localData.Conditions.Speed" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="实验时间">
            <el-input v-model="localData.Conditions.Time" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="采购单号">
            <el-input v-model="localData.Conditions.PurchaseNo" />
          </el-form-item>
        </el-col>

        <!-- Row 3 -->
        <el-col :span="8">
          <el-form-item label="参考标准">
            <el-input v-model="localData.Conditions.RefStandard" placeholder="手动填入合格标准" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="实际测试">
            <el-input v-model="localData.Conditions.ActualTest" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="判定">
             <el-radio-group v-model="localData.Conclusion">
                  <el-radio label="合格">合格</el-radio>
                  <el-radio label="不合格">不合格</el-radio>
              </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="24">
          <div style="padding: 0 10px;">
            <div class="table-title">{{ localData.Conditions.SpecificTestName || '数据' }}明细 (支持从Excel粘贴)</div>
            <table class="custom-table">
                <thead>
                    <tr>
                        <th style="width: 60px">No.</th>
                        <th>最大{{ localData.Conditions.SpecificTestName || '剥离力' }} ({{ localData.Conditions.Unit }})</th>
                        <th>最小{{ localData.Conditions.SpecificTestName || '剥离力' }} ({{ localData.Conditions.Unit }})</th>
                        <th>平均{{ localData.Conditions.SpecificTestName || '剥离力' }} ({{ localData.Conditions.Unit }})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, index) in groups" :key="index">
                        <td align="center">{{ index + 1 }}</td>
                        <td><el-input v-model="row.max" @paste="handlePaste($event, index, 'max')" size="small" /></td>
                        <td><el-input v-model="row.min" @paste="handlePaste($event, index, 'min')" size="small" /></td>
                        <td><el-input v-model="row.avg" @paste="handlePaste($event, index, 'avg')" size="small" /></td>
                    </tr>
                    <!-- Computed Rows -->
                    <tr class="summary-row">
                        <td align="center">最大值</td>
                        <td>{{ stats.max.max }}</td>
                        <td>{{ stats.min.max }}</td>
                        <td>{{ stats.avg.max }}</td>
                    </tr>
                    <tr class="summary-row">
                        <td align="center">最小值</td>
                        <td>{{ stats.max.min }}</td>
                        <td>{{ stats.min.min }}</td>
                        <td>{{ stats.avg.min }}</td>
                    </tr>
                    <tr class="summary-row">
                        <td align="center">平均值</td>
                        <td>{{ stats.max.avg }}</td>
                        <td>{{ stats.min.avg }}</td>
                        <td>{{ stats.avg.avg }}</td>
                    </tr>
                    <tr class="summary-row">
                        <td align="center">X-4.5σ</td>
                        <td>{{ stats.max.sigma }}</td>
                        <td>{{ stats.min.sigma }}</td>
                        <td>{{ stats.avg.sigma }}</td>
                    </tr>
                </tbody>
            </table>
          </div>
        </el-col>
      </el-row>

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

       <el-form-item label="综合判定" style="margin-top: 15px; display: none">
          <el-radio-group v-model="localData.Conclusion">
              <el-radio label="合格">合格</el-radio>
              <el-radio label="不合格">不合格</el-radio>
          </el-radio-group>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue'
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

const isLoading = ref(false)

const localData = ref({
  InstrumentID: null,
  Standard: '',
  Conclusion: '',
  Conditions: {
    SpecificTestName: '',
    Unit: 'N',
    Spec: '',
    Speed: '',
    Time: '',
    RefStandard: '',
    PurchaseNo: '',
    CustomerName: '',
    Tester: '',
    TestDate: '',
    MaterialName: '',
    ActualTest: ''
  },
  ResultData: {
    groups: [],
    images: []
  }
})

const fileList = ref([])
const isInternalUpdate = ref(false)

watch(fileList, (val) => {
    if (isInternalUpdate.value) return
    // Sync with localData
    const imgs = val.map(f => ({ name: f.name, url: f.url }))
    localData.value.ResultData.images = imgs
    localData.value.Images = imgs
    emit('update:modelValue', localData.value)
}, { deep: true })

watch(() => localData.value.Conditions.SpecificTestName, (name) => {
    if (name && props.inspectionItems) {
        let match = props.inspectionItems.find(i => i.ItemName === name)
        if (!match) {
            match = props.inspectionItems.find(i => i.ItemName.includes(name))
        }
        if (match) {
            // Populate Standard (Test Standard) from InspectionBasis (Document Name)
            if (match.InspectionBasis) localData.value.Standard = match.InspectionBasis
            // RefStandard (Pass Criteria) is left manual
        }
    }
}, { immediate: true })

watch(() => props.inspectionItems, (items) => {
    const name = localData.value.Conditions.SpecificTestName
    if (name && items) {
         let match = items.find(i => i.ItemName === name)
         if (!match) {
             match = items.find(i => i.ItemName.includes(name))
         }
         if (match) {
             if (match.InspectionBasis) localData.value.Standard = match.InspectionBasis
         }
    }
}, { immediate: true })

const groups = ref([])

const stats = computed(() => {
    const keys = ['max', 'min', 'avg']
    const result = { max: {}, min: {}, avg: {} }
    
    keys.forEach(k => {
        result[k] = { max: '-', min: '-', avg: '-', sigma: '-' }
    })
    
    keys.forEach(key => {
        const values = groups.value
            .map(g => parseFloat(g[key]))
            .filter(n => !isNaN(n))
        
        if (values.length > 0) {
            const max = Math.max(...values)
            const min = Math.min(...values)
            const sum = values.reduce((a, b) => a + b, 0)
            const avg = sum / values.length
            
            result[key].max = max.toFixed(3)
            result[key].min = min.toFixed(3)
            result[key].avg = avg.toFixed(3)
            
            if (values.length > 1) {
                // Sample Std Dev (N-1)
                const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (values.length - 1)
                const sd = Math.sqrt(variance)
                const sigmaVal = avg - 4.5 * sd
                result[key].sigma = sigmaVal.toFixed(3)
            }
        }
    })
    
    return result
})

const handlePaste = (e, rowIndex, colKey) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    
    // Check if it's multi-cell data
    if (text.includes('\t') || text.includes('\n') || text.includes('\r')) {
         e.preventDefault()
         const rows = text.trim().split(/\r\n|\n|\r/)
         const keys = ['max', 'min', 'avg']
         let colIndexStart = keys.indexOf(colKey)
         if (colIndexStart === -1) colIndexStart = 0
         
         rows.forEach((rowStr, rIdx) => {
             const targetRowIdx = rowIndex + rIdx
             if (targetRowIdx >= 5) return
             
             const cells = rowStr.split('\t')
             cells.forEach((cellVal, cIdx) => {
                 const targetColIndex = colIndexStart + cIdx
                 if (targetColIndex < 3) {
                     const targetKey = keys[targetColIndex]
                     groups.value[targetRowIdx][targetKey] = cellVal.trim()
                 }
             })
         })
    }
}

onMounted(() => {
    if (groups.value.length === 0) {
        for (let i = 0; i < 5; i++) {
            groups.value.push({ max: '', min: '', avg: '' })
        }
    }
})

const convertValues = (oldU, newU) => {
    // 1 kgf = 9.80665 N
    // 1 N = 101.9716 gf
    // 1 kgf = 1000 gf
    
    const factors = {
        'N': 1,
        'kgf': 9.80665,
        'gf': 0.00980665
    }
    
    const keys = ['max', 'min', 'avg']
    groups.value.forEach(row => {
        keys.forEach(k => {
            const val = parseFloat(row[k])
            if (!isNaN(val)) {
                // Convert to base (N)
                const valN = val * factors[oldU]
                // Convert to new Unit
                const finalVal = valN / factors[newU]
                row[k] = finalVal.toFixed(3)
            }
        })
    })
}

watch(() => localData.value.Conditions.Unit, (newU, oldU) => {
    if (isLoading.value) return
    if (!oldU || !newU) return
    convertValues(oldU, newU)
    // Trigger update for ActualTest in case value doesn't change enough to trigger stats watch?
    // But conversion changes value, so stats should change.
})

// Auto-fill ActualTest with Avg of Avg
watch(() => stats.value.avg.avg, (newVal) => {
    if (newVal && newVal !== '-') {
        const unit = localData.value.Conditions.Unit || ''
        localData.value.Conditions.ActualTest = `${newVal} ${unit}`
    } else {
        localData.value.Conditions.ActualTest = ''
    }
})

watch(() => props.modelValue, (val) => {
  if (val) {
    isLoading.value = true
    if (!val.Conditions) val.Conditions = {}
    if (!val.ResultData) val.ResultData = {}
    localData.value = val
    
    // Ensure Unit exists
    if (!localData.value.Conditions.Unit) {
        localData.value.Conditions.Unit = 'N'
    }
    
    if (val.ResultData.groups && val.ResultData.groups.length > 0) {
        groups.value = val.ResultData.groups
    } else {
        groups.value = []
        for (let i = 0; i < 5; i++) groups.value.push({ max: '', min: '', avg: '' })
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
    
    nextTick(() => { isLoading.value = false })
  }
}, { immediate: true, deep: true })

watch(groups, () => {
    localData.value.ResultData.groups = groups.value
    emit('update:modelValue', localData.value)
}, { deep: true })

</script>

<style scoped>
.table-title {
    font-weight: bold;
    margin-bottom: 10px;
    margin-top: 10px;
}
.custom-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 15px;
}
.custom-table th, .custom-table td {
    border: 1px solid #dcdfe6;
    padding: 2px 5px;
}
.custom-table th {
    background-color: #f5f7fa;
    font-weight: bold;
    color: #606266;
    text-align: center;
    padding: 8px;
}
.summary-row td {
    background-color: #fafafa;
    text-align: center;
    color: #606266;
    height: 32px;
}
.custom-table :deep(.el-input__wrapper) {
    box-shadow: none;
    padding: 0 5px;
}
.custom-table :deep(.el-input__inner) {
    text-align: center;
}
</style>