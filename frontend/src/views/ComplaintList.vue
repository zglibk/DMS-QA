<template>
  <div>
    <!-- 新增投诉按钮 -->
    <el-button type="primary" @click="router.push('/add')" size="small">
      <el-icon><Plus /></el-icon> 新增投诉
    </el-button>
    <!-- 投诉列表表格 -->
    <el-table :data="list" style="width: 100%">
      <el-table-column prop="ID" label="ID" width="60" />
      <el-table-column prop="Date" label="日期" />
      <el-table-column prop="Customer" label="客户" />
      <el-table-column prop="action" label="操作" width="100">
        <template #default>
          <el-button type="text" size="small">
            <el-icon><View /></el-icon> 详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { Plus, View } from '@element-plus/icons-vue'

// 投诉列表数据
const list = ref([])
// 路由对象，用于页面跳转
const router = useRouter()

// 页面加载时获取投诉数据
onMounted(async () => {
  const res = await axios.get('/api/complaint', {
    headers: { Authorization: localStorage.getItem('token') }
  })
  list.value = res.data
})
</script> 