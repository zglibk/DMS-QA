<template>
  <el-card>
    <el-table :data="permissions" border style="width:100%;margin-top:18px;">
      <el-table-column label="#" type="index" width="50" header-align="center" align="center" />
      <el-table-column prop="Name" label="权限名称" header-align="left" align="left" />
      <el-table-column prop="Path" label="路径" header-align="left" align="left" />
      <el-table-column prop="Level" label="权限等级" header-align="center" align="center">
        <template #default="scope">
          <el-tag :type="scope.row.Level==='一级'?'primary':scope.row.Level==='二级'?'success':'warning'">{{scope.row.Level}}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
<script setup>
import { ref } from 'vue'
const permissions = ref([
  { Name: '商品管理', Path: 'goods', Level: '一级' },
  { Name: '订单管理', Path: 'orders', Level: '一级' },
  { Name: '权限管理', Path: 'rights', Level: '一级' },
  { Name: '商品列表', Path: 'goods', Level: '二级' },
  { Name: '添加商品', Path: 'goods', Level: '三级' },
  { Name: '订单列表', Path: 'orders', Level: '二级' },
  { Name: '添加订单', Path: 'orders', Level: '三级' },
  { Name: '用户列表', Path: 'users', Level: '二级' },
  { Name: '角色列表', Path: 'roles', Level: '二级' }
])
</script>
<style scoped>
:deep(.el-table th), :deep(.el-table td) { font-size: 1rem; border-right: 1px solid #ebeef5 !important; }
:deep(.el-table th:last-child), :deep(.el-table td:last-child) { border-right: none !important; }
:deep(.el-table th) { background: #f8fafd; color: #333; }
:deep(.el-table) { border-radius: 0.5rem; overflow: hidden; }
@media (max-width: 600px) {
  :deep(.el-table) { font-size: 0.9rem; }
  :deep(.el-table th), :deep(.el-table td) { font-size: 0.9rem; }
}
</style> 