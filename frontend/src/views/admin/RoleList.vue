<template>
  <el-card>
    <div class="role-list-header">
      <el-button type="primary" @click="showAddRole=true">
        <el-icon style="margin-right:4px"><Plus /></el-icon>添加角色
      </el-button>
    </div>
    <el-table :data="roles" border style="width:100%;margin-top:18px;">
      <el-table-column label="#" type="index" width="60" header-align="center" align="center" />
      <el-table-column prop="RoleName" label="角色名称" header-align="left" align="left" width="180" />
      <el-table-column prop="Description" label="角色描述" header-align="left" align="left" min-width="260" />
      <el-table-column label="操作" width="300" header-align="center" align="center">
        <template #default="scope">
          <div class="action-btn-row">
            <el-button type="primary" size="small" @click="editRole(scope.row)">
              <el-icon class="btn-icon"><Edit /></el-icon>编辑
            </el-button>
            <el-button type="danger" size="small" @click="deleteRole(scope.row)">
              <el-icon class="btn-icon"><Delete /></el-icon>删除
            </el-button>
            <el-button type="warning" size="small" @click="assignPermission(scope.row)">
              <el-icon class="btn-icon"><Setting /></el-icon>分配权限
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="showAddRole" title="添加角色" width="420px">
      <el-form :model="addRoleForm" label-width="80px">
        <el-form-item label="角色名称">
          <el-input v-model="addRoleForm.RoleName" />
        </el-form-item>
        <el-form-item label="角色描述">
          <el-input v-model="addRoleForm.Description" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddRole=false">取消</el-button>
        <el-button type="primary" @click="submitAddRole">提交</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
<script setup>
import { ref } from 'vue'
import { Plus, Edit, Delete, Setting } from '@element-plus/icons-vue'
const roles = ref([
  { RoleName: '管理员', Description: '系统最高权限' },
  { RoleName: '普通用户', Description: '只能查看部分数据' }
])
const showAddRole = ref(false)
const addRoleForm = ref({ RoleName: '', Description: '' })
const editRole = row => {}
const deleteRole = row => {}
const assignPermission = row => {}
const submitAddRole = () => { showAddRole.value = false }
</script>
<style scoped>
.role-list-header { display: flex; align-items: center; margin-bottom: 0.5rem; }
.action-btn-row { display: flex; flex-wrap: nowrap; gap: 0.5rem; justify-content: center; }
:deep(.el-button .el-icon) { color: #fff !important; }
.btn-icon { margin-right: 0.25rem; }
:deep(.el-table th), :deep(.el-table td) { font-size: 1rem; border-right: 1px solid #ebeef5 !important; }
:deep(.el-table th:last-child), :deep(.el-table td:last-child) { border-right: none !important; }
:deep(.el-table th) { background: #f8fafd; color: #333; }
:deep(.el-table) { border-radius: 0.5rem; overflow: hidden; }
@media (max-width: 600px) {
  .role-list-header { flex-direction: column; align-items: stretch; }
  :deep(.el-table) { font-size: 0.9rem; }
  :deep(.el-table th), :deep(.el-table td) { font-size: 0.9rem; }
}
</style> 