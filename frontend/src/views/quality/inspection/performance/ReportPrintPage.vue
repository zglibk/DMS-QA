<template>
    <div v-loading="loading" style="height: 100vh; width: 100vw; overflow: hidden;">
        <ReportPreview 
            v-if="report" 
            :report="report" 
            :items="items" 
            :instruments="instruments" 
            @close="handleClose" 
        />
        <div v-else-if="!loading" class="error-msg">加载失败或报告不存在</div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getReport, getInstruments } from '@/api/performance'
import ReportPreview from './ReportPreview.vue'

const route = useRoute()
const loading = ref(true)
const report = ref(null)
const items = ref([])
const instruments = ref([])

onMounted(async () => {
    const id = route.params.id
    if (!id) {
        loading.value = false
        return
    }
    
    try {
        const [reportRes, instRes] = await Promise.all([
            getReport(id),
            getInstruments()
        ])
        
        report.value = reportRes.data
        items.value = reportRes.data.items || []
        instruments.value = instRes.data
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
})

const handleClose = () => {
    window.close()
}
</script>

<style scoped>
.error-msg {
    text-align: center;
    padding-top: 50px;
    color: #909399;
}
</style>