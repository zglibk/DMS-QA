<template>
  <div class="alcohol-form">
    <el-form :model="localData" label-width="100px" size="small" :disabled="readonly">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="溶剂名称">
            <el-input v-model="localData.Conditions.Solvent" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="酒精度">
            <el-input v-model="localData.Conditions.AlcoholContent" />
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
         <el-col :span="12">
          <el-form-item label="试验标准">
            <el-input v-model="localData.Standard" placeholder="自动加载" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="结果描述">
            <el-input type="textarea" v-model="localData.Conclusion" :rows="3" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
            <el-form-item label="结果判断">
                <el-radio-group v-model="localData.Conditions.Result">
                    <el-radio label="合格">合格</el-radio>
                    <el-radio label="不合格">不合格</el-radio>
                </el-radio-group>
            </el-form-item>
        </el-col>
      </el-row>

      <div class="table-title" style="margin-top: 15px; font-weight: bold; margin-bottom: 10px;" v-if="fileList.length > 0 || !readonly">测试图片</div>
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
import { ref, watch, computed, nextTick } from 'vue'
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

const fileList = ref([])
const isInternalUpdate = ref(false)

const localData = ref({
  InstrumentID: null,
  Standard: '',
  Conclusion: '',
  Conditions: {
    Solvent: '',
    AlcoholContent: '',
    Result: '合格'
  },
  ResultData: {
      images: []
  }
})

watch(() => props.inspectionItems, (items) => {
    if (items && items.length > 0 && !localData.value.Standard) {
        const match = items.find(i => i.ItemName.includes('耐醇') || i.ItemName.includes('Alcohol'))
        if (match && match.InspectionStandard) {
            localData.value.Standard = match.InspectionStandard
        }
    }
}, { immediate: true })


watch(() => props.modelValue, (val) => {
  if (val) {
    if (!val.Conditions) val.Conditions = {}
    if (!val.ResultData) val.ResultData = {}
    localData.value = val
    
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
    if (!localData.value.ResultData) localData.value.ResultData = {}
    const imgs = val.map(f => ({ name: f.name, url: f.url }))
    localData.value.ResultData.images = imgs
    localData.value.Images = imgs
    emit('update:modelValue', localData.value)
}, { deep: true })

watch(localData, (val) => {
    emit('update:modelValue', val)
}, { deep: true })
</script>