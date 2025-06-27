<template>
  <el-card>
    <div class="user-list-header">
      <el-input v-model="search" placeholder="请输入搜索内容" clearable style="width:260px;" @keyup.enter="fetchUsers">
        <template #append>
          <el-button :icon="Search" @click="fetchUsers" />
        </template>
      </el-input>
      <el-button type="primary" style="margin-left:16px;" @click="showAddUser=true">添加用户</el-button>
    </div>
    <el-table :data="users" style="width:100%;margin-top:18px;">
      <el-table-column label="#" type="index" width="50" />
      <el-table-column prop="Username" label="用户名" />
      <el-table-column prop="RealName" label="姓名" />
      <el-table-column prop="Department" label="部门" />
      <el-table-column prop="Phone" label="电话" />
      <el-table-column prop="Role" label="角色" />
      <el-table-column prop="Status" label="状态" width="90">
        <template #default="scope">
          <el-switch
            v-model="scope.row.Status"
            :disabled="scope.row.Role === 'admin'"
            :active-value="1"
            :inactive-value="0"
            @change="val => changeStatus(scope.row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="scope">
          <el-button type="primary" :icon="Edit" size="small" @click="editUser(scope.row)" />
          <el-button type="danger" :icon="Delete" size="small" @click="deleteUser(scope.row)" />
          <el-button type="warning" :icon="Setting" size="small" @click="setPermission(scope.row)" />
        </template>
      </el-table-column>
    </el-table>
    <div class="user-list-footer">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        :page-sizes="[5,10,20,50]"
        @size-change="size=>{pageSize=size;fetchUsers()}"
        @current-change="p=>{page=p;fetchUsers()}"
      />
    </div>
    <!-- 添加用户弹窗 -->
    <el-dialog v-model="showAddUser" title="添加用户" width="420px" @close="resetAddUser">
      <el-form :model="addUserForm" :rules="addUserRules" ref="addUserRef" label-width="80px">
        <el-form-item label="用户名" prop="Username">
          <el-input v-model="addUserForm.Username" autocomplete="off" />
        </el-form-item>
        <el-form-item label="密码" prop="Password">
          <el-input v-model="addUserForm.Password" type="password" autocomplete="off" />
        </el-form-item>
        <el-form-item label="角色" prop="Role">
          <el-select v-model="addUserForm.Role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门" prop="Department">
          <el-select v-model="addUserForm.Department" placeholder="请选择部门">
            <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名" prop="RealName">
          <el-input v-model="addUserForm.RealName" />
        </el-form-item>
        <el-form-item label="邮箱" prop="Email">
          <el-input v-model="addUserForm.Email" />
        </el-form-item>
        <el-form-item label="电话" prop="Phone">
          <el-input v-model="addUserForm.Phone" />
        </el-form-item>
        <el-form-item label="头像">
          <el-input v-model="addUserForm.Avatar" placeholder="可填图片URL或Base64" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddUser=false">取消</el-button>
        <el-button type="primary" @click="submitAddUser">提交</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { Edit, Delete, Setting, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const search = ref('')
const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const showAddUser = ref(false)
const addUserForm = ref({
  Username: '',
  Password: '',
  Role: '',
  Department: '',
  RealName: '',
  Avatar: '',
  Email: '',
  Phone: ''
})
const addUserRules = {
  Username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  Password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  Role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  Department: [{ required: true, message: '请输入部门', trigger: 'blur' }],
  RealName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  Email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  Phone: [{ required: true, message: '请输入电话', trigger: 'blur' }]
}
const addUserRef = ref()
const resetAddUser = () => {
  addUserForm.value = { Username: '', Password: '', Role: '', Department: '', RealName: '', Avatar: '', Email: '', Phone: '' }
}
const submitAddUser = () => {
  addUserRef.value.validate(async valid => {
    if (!valid) return
    const token = localStorage.getItem('token')
    const res = await axios.post('/api/auth/add-user', addUserForm.value, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data && res.data.success) {
      ElMessage.success('添加成功')
      showAddUser.value = false
      fetchUsers()
      resetAddUser()
    } else {
      ElMessage.error(res.data.message || '添加失败')
    }
  })
}

const departments = ref([])
const fetchDepartments = async () => {
  const token = localStorage.getItem('token')
  const res = await axios.get('/api/complaint/options', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data && res.data.departments) {
    departments.value = res.data.departments
  }
}
watch(showAddUser, v => { if (v) fetchDepartments() })

const fetchUsers = async () => {
  const token = localStorage.getItem('token')
  const res = await axios.get('/api/auth/user-list', {
    params: { page: page.value, pageSize: pageSize.value, search: search.value },
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data && res.data.success) {
    users.value = res.data.data
    total.value = res.data.total
  }
}
onMounted(fetchUsers)

const addUser = () => {
  // TODO: 添加用户弹窗
}
const editUser = (row) => {
  // TODO: 编辑用户弹窗
}
const deleteUser = (row) => {
  // TODO: 删除用户
}
const setPermission = (row) => {
  // TODO: 设置权限
}
const changeStatus = async (row, val) => {
  if (row.Role === 'admin') {
    row.Status = 1;
    ElMessage.warning('超级管理员状态不可修改！')
    return;
  }
  const oldStatus = row.Status;
  row.Status = val;
  const token = localStorage.getItem('token');
  try {
    const res = await axios.post('/api/auth/user-status', {
      username: row.Username,
      status: val
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.data && res.data.success) {
      ElMessage.success('状态已更新');
    } else {
      ElMessage.error(res.data.message || '状态更新失败');
      row.Status = oldStatus;
    }
  } catch (e) {
    ElMessage.error('状态更新失败');
    row.Status = oldStatus;
  }
}
</script>

<style scoped>
.user-list-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.user-list-footer {
  margin-top: 18px;
  text-align: right;
}
</style> 