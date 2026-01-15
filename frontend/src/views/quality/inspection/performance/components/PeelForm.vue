<template>
  <div class="peel-form">
    <el-form :model="localData" label-width="100px" size="small" :disabled="readonly">
      <el-row :gutter="20">
        <!-- Row 1 -->
        <el-col :span="8">
          <el-form-item label="试验项目">
            <el-checkbox 
              :model-value="localData.Conditions.SpecificTestName === '剥离力'"
              @change="(val) => handleTestNameChange('剥离力', val)"
              label="剥离力"
            />
            <el-checkbox 
              :model-value="localData.Conditions.SpecificTestName === '离型力'"
              @change="(val) => handleTestNameChange('离型力', val)"
              label="离型力"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="试验角度">
            <el-checkbox 
              :model-value="localData.Conditions.Angle === '180°'"
              @change="(val) => handleAngleChange('180°', val)"
              label="180°"
            />
            <el-checkbox 
              :model-value="localData.Conditions.Angle === '90°'"
              @change="(val) => handleAngleChange('90°', val)"
              label="90°"
            />
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

        <!-- Row 2 -->
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
        <el-col :span="8">
          <el-form-item label="试验速度">
            <el-input v-model="localData.Conditions.Speed" />
          </el-form-item>
        </el-col>

        <!-- Row 2 -->
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
        <el-col :span="8">
          <el-form-item label="合格标准">
            <el-input v-model="localData.Conditions.RefStandard" placeholder="自动加载或手动填入" />
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
            <div class="table-title">
                {{ localData.Conditions.SpecificTestName || '数据' }}明细
                <el-tooltip content="支持从Excel批量粘贴" placement="top">
                    <el-icon style="margin-left: 5px; cursor: help; vertical-align: middle; color: var(--el-color-warning)"><QuestionFilled /></el-icon>
                </el-tooltip>
            </div>
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
import { QuestionFilled } from '@element-plus/icons-vue'

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

const handleTestNameChange = (name, checked) => {
    // 切换时清空
    localData.value.Standard = ''
    localData.value.Conditions.RefStandard = ''
    
    if (checked) {
        localData.value.Conditions.SpecificTestName = name
    } else {
        // 如果取消选中当前项，则清空
        if (localData.value.Conditions.SpecificTestName === name) {
            localData.value.Conditions.SpecificTestName = ''
        }
    }
}

const handleAngleChange = (angle, checked) => {
    // 切换时清空
    localData.value.Standard = ''
    localData.value.Conditions.RefStandard = ''
    
    if (checked) {
        localData.value.Conditions.Angle = angle
    } else {
        // 如果取消选中当前项，则清空
        if (localData.value.Conditions.Angle === angle) {
            localData.value.Conditions.Angle = ''
        }
    }
}

watch(fileList, (val) => {
    if (isInternalUpdate.value) return
    // Sync with localData
    const imgs = val.map(f => ({ name: f.name, url: f.url }))
    localData.value.ResultData.images = imgs
    localData.value.Images = imgs
    emit('update:modelValue', localData.value)
}, { deep: true })

watch(() => [localData.value.Conditions.SpecificTestName, localData.value.Conditions.Angle, props.inspectionItems], ([name, angle, items]) => {
    // 每次条件变化或项目列表变化时，先清空自动加载的字段，确保数据准确性
    // 注意：如果是手动输入的值，也会被清空。这是符合预期的，因为条件变了，旧的标准不再适用。
    if (name || angle) { // 仅当有条件时才清空，避免初始化全空时的不必要操作（虽然清空空值也没事）
         localData.value.Standard = ''
         localData.value.Conditions.RefStandard = ''
    }

    // 确保有 items 且 name 不为空
    if (name && items && items.length > 0) {
        let match = null
        
        // 尝试构建精确匹配名称，如 "剥离力(180)" 或 "剥离力(180°)"
        if (angle) {
             // 优先尝试: 剥离力 + "(" + 纯数字 + ")"
             // 如: 剥离力(180)
             const angleNum = angle.replace(/[^\d]/g, '')
             if (angleNum) {
                 const targetNameNum = `${name}(${angleNum})`
                 match = items.find(i => i.ItemName === targetNameNum)
             }
             
             // 其次尝试: 剥离力 + "(" + 原始角度值 + ")"
             // 如: 剥离力(180°)
             if (!match) {
                 const targetNameFull = `${name}(${angle})`
                 match = items.find(i => i.ItemName === targetNameFull)
             }

             // 注意：当指定了角度时，不再降级匹配不带角度的名称(如"剥离力")，
             // 也不进行模糊匹配，以确保 180° 和 90° 严格区分。
             // 如果配置中只有 "剥离力"，请修改配置为 "剥离力(180°)" 以便明确匹配。
        } else {
            // 如果未指定角度（虽然UI上通常有默认值），则尝试匹配不带角度的名称
            if (!match) {
                match = items.find(i => i.ItemName === name)
            }
            
            // 最后尝试: 模糊匹配
            if (!match) {
                match = items.find(i => i.ItemName.includes(name))
            }
        }
        
        if (match) {
            // 自动填充试验标准 (InspectionBasis)
            if (match.InspectionBasis) {
                localData.value.Standard = match.InspectionBasis
            }
            // 自动填充合格标准 (优先使用 AcceptanceCriteria)
            const standard = match.AcceptanceCriteria
            // 即使为空字符串也允许覆盖，以便清空旧值
            if (standard !== undefined && standard !== null) {
                localData.value.Conditions.RefStandard = standard
            }
        } else {
            // 如果没匹配到，清空之前自动填入的值？
            // 暂时不清空，避免用户手动输入被误删，或者保持上一次的值
            // 但如果切换了角度导致不匹配，可能应该清空标准，以免误导
            // 可是用户可能想手动填。
            // 折中方案：不做操作。
        }
    }
}, { immediate: true, deep: true })

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

watch(uniqueInstruments, (insts) => {
    if (!localData.value.InstrumentID && insts.length > 0) {
        const defaultInst = insts.find(i => i.InstrumentName === '电脑式剥离力试验机' || i.InstrumentName === '电脑式剥离试验机')
        if (defaultInst) {
            localData.value.InstrumentID = defaultInst.ID
        }
    }
}, { immediate: true })

watch(() => props.modelValue, (val) => {
  if (val) {
    isLoading.value = true
    if (!val.Conditions) val.Conditions = {}
    if (!val.ResultData) val.ResultData = {}
    localData.value = val
    
    // Set Defaults
    if (!localData.value.Conditions.SpecificTestName) {
        localData.value.Conditions.SpecificTestName = '剥离力'
    }
    if (!localData.value.Conditions.Angle) {
        localData.value.Conditions.Angle = '180°'
    }
    if (!localData.value.Conditions.Unit) {
        localData.value.Conditions.Unit = 'N'
    }
    
    // 强制触发一次匹配逻辑，确保初始化默认值后能加载合格标准
    // 由于watch监听的是 localData.Conditions.SpecificTestName，这里赋值可能不会立即触发深度监听
    // 或者因为 inspectionItems 可能还没加载完。
    // 但 props.inspectionItems 也是 watch 的依赖项，所以如果 items 后加载，应该会自动触发。
    // 问题可能在于：watch 的 immediate: true 执行时，props.inspectionItems 是空的，
    // 而当 items 加载完变化时，watch 会再次执行。
    // 但如果 items 先加载完，localData 还没初始化默认值，watch 执行时 name/angle 为空。
    // 当这里初始化默认值后，Vue 的响应式系统应该会触发 watch。
    // 为了保险起见，我们在 nextTick 中再次确认触发。
    nextTick(() => {
        // 这里的赋值是冗余的，旨在确保响应式更新
        localData.value.Conditions.SpecificTestName = localData.value.Conditions.SpecificTestName
    })
    if (!localData.value.Conditions.Spec) {
        localData.value.Conditions.Spec = '24.5mm×300mm'
    }
    if (!localData.value.Conditions.Speed) {
        localData.value.Conditions.Speed = '300mm/min'
    }
    if (!localData.value.Conditions.Time) {
        localData.value.Conditions.Time = '30s'
    }
    
    // Try to set default instrument if not set and instruments available
    if (!localData.value.InstrumentID && uniqueInstruments.value.length > 0) {
        const defaultInst = uniqueInstruments.value.find(i => i.InstrumentName === '电脑式剥离力试验机' || i.InstrumentName === '电脑式剥离试验机')
        if (defaultInst) {
            localData.value.InstrumentID = defaultInst.ID
        }
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