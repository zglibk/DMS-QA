<template>
  <div class="user-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon class="title-icon"><User /></el-icon>
            用户管理
          </h1>
          <p class="page-description">统一管理系统用户信息、角色权限及状态控制</p>
        </div>
        <div class="header-stats">
          <div class="stat-item total-users">
            <div class="stat-icon">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ total }}</div>
              <div class="stat-label">总用户数</div>
            </div>
          </div>
          <div class="stat-item active-users">
            <div class="stat-icon">
              <el-icon><CircleCheckFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ activeUsers }}</div>
              <div class="stat-label">活跃用户</div>
              <div class="stat-desc">近一周内登录</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能操作区 -->
    <el-card class="toolbar-card" shadow="hover">
      <el-row :gutter="20" class="toolbar-row">
        <!-- 左侧：新增用户 + 刷新 -->
        <el-col :span="4">
          <div class="left-actions">
            <el-button 
              type="primary" 
              :icon="Plus" 
              @click="showAddUser=true" 
              class="primary-btn"
              :disabled="!userStore.hasPermission('sys:user:add')"
            >
              新增用户
            </el-button>
            <el-button 
              :icon="Refresh" 
              @click="refreshData" 
              circle 
              style="width: 100px;" 
              type="warning" 
              plain
            >
              刷新
            </el-button>
          </div>
        </el-col>
        
        <!-- 中间：查询条件 + 搜索 + 重置 -->
        <el-col :span="16">
          <div class="center-search">
            <el-input
              v-model="search"
              placeholder="搜索用户名、姓名或部门"
              class="search-input"
              clearable
              @keyup.enter="fetchUsers"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="filterRole" placeholder="角色筛选" clearable class="filter-select">
              <el-option label="全部角色" value="" />
              <el-option label="管理员" value="admin" />
              <el-option label="普通用户" value="user" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态筛选" clearable class="filter-select">
              <el-option label="全部状态" value="" />
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="fetchUsers">搜索</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </div>
        </el-col>
        
        <!-- 右侧：导出 -->
        <el-col :span="4">
          <div class="right-actions">
            <el-button :icon="Download" @click="exportUsers" class="export-btn">
              导出数据
            </el-button>
          </div>
        </el-col>
      </el-row>
    </el-card>
    <!-- 用户数据表格 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <div class="table-title">
            <el-icon><Grid /></el-icon>
            <span>用户列表</span>
            <el-tag type="warning" size="small" class="count-tag">共 {{ total }} 条记录</el-tag>
          </div>
          <div class="table-tools">
            <el-button type="primary" plain :icon="Refresh" @click="refreshData">
              刷新数据
            </el-button>
            <el-button type="warning" plain :icon="Setting" @click="showColumnSettings = true">
              列设置
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="table-container">
        <el-table
        :data="users"
        v-loading="loading"
        stripe
        border
        class="modern-table"
        :row-class-name="getRowClassName"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" fixed="left" header-align="center" />
        <el-table-column label="序号" type="index" min-width="60" fixed="left" align="center" header-align="center">
          <template #default="{ $index }">
            <span class="index-number">{{ (page - 1) * pageSize + $index + 1 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="Username" label="用户名" min-width="120" show-overflow-tooltip header-align="center">
          <template #default="scope">
            <div class="user-info">
              <el-avatar :size="32" :src="scope.row.Avatar" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div class="user-details">
                <div class="username">{{ scope.row.Username }}</div>
                <div class="user-id-container">
                  <el-tag 
                    size="small" 
                    effect="light" 
                    round
                    :style="getUserIdTagStyle(scope.row.ID)"
                  >
                    <el-icon><Key /></el-icon>
                    ID: {{ scope.row.ID || 'N/A' }}
                  </el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-if="isColumnVisible('realname')"
          prop="RealName" 
          label="真实姓名" 
          min-width="120" 
          show-overflow-tooltip 
          align="center" 
          header-align="center"
        >
          <template #default="scope">
            <span class="real-name">{{ scope.row.RealName }}</span>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-if="isColumnVisible('department')"
          prop="Department" 
          label="所属部门" 
          min-width="120" 
          show-overflow-tooltip 
          align="center" 
          header-align="center"
        >
          <template #default="scope">
            <el-tag :type="getDepartmentTagType(scope.row.Department)" size="small" class="department-tag" effect="dark" round>
              <el-icon><OfficeBuilding /></el-icon>
              {{ scope.row.Department }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-if="isColumnVisible('role')"
          prop="Role" 
          label="用户角色" 
          min-width="150" 
          align="center" 
          header-align="center"
        >
          <template #default="scope">
            <div class="role-tags-container">
              <template v-if="scope.row.RoleNames">
                <el-tag 
                  v-for="(roleName, index) in getRoleList(scope.row.RoleNames)"
                  :key="index"
                  :type="getRoleTagType(roleName)"
                  size="small"
                  class="role-tag"
                  effect="plain"
                >
                  <el-icon>
                    <Star v-if="roleName === 'admin' || roleName === '管理员'" />
                    <User v-else />
                  </el-icon>
                  {{ roleName }}
                </el-tag>
              </template>
              <el-tag v-else type="info" size="small" class="role-tag" effect="plain">
                <el-icon><User /></el-icon>
                普通用户
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-if="isColumnVisible('contact')"
          prop="Phone" 
          label="联系电话" 
          min-width="120" 
          show-overflow-tooltip 
          align="center" 
          header-align="center"
        >
          <template #default="scope">
            <div class="contact-info">
              <el-icon><Phone /></el-icon>
              <span>{{ scope.row.Phone || '未设置' }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-if="isColumnVisible('contact')"
          prop="Email" 
          label="邮箱地址" 
          min-width="150" 
          show-overflow-tooltip 
          align="center" 
          header-align="center"
        >
          <template #default="scope">
            <div class="contact-info" v-if="scope.row.Email">
              <el-icon><Message /></el-icon>
              <span>{{ scope.row.Email }}</span>
            </div>
            <span v-else class="no-data">未设置</span>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-if="isColumnVisible('status')"
          prop="Status" 
          label="账户状态" 
          width="120" 
          align="center" 
          header-align="center"
        >
          <template #default="scope">
            <div class="status-control">
              <el-switch
                v-model="scope.row.Status"
                :disabled="scope.row.Role === 'admin' || (scope.row.RoleNames && scope.row.RoleNames.includes('admin')) || !userStore.hasPermission('sys:user:edit')"
                :active-value="1"
                :inactive-value="0"
                active-color="#67c23a"
                inactive-color="#f56c6c"
                @change="val => changeStatus(scope.row, val)"
              />
              <div class="status-text">
                {{ scope.row.Status === 1 ? '启用' : '禁用' }}
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-if="isColumnVisible('lastlogin')"
          prop="LastLoginTime" 
          label="最后登录" 
          min-width="140" 
          show-overflow-tooltip 
          align="center" 
          header-align="center"
        >
          <template #default="scope">
            <div class="last-login-info">
              <el-icon><Clock /></el-icon>
              <span v-if="scope.row.LastLoginTime">
                {{ formatDateTime(scope.row.LastLoginTime) }}
              </span>
              <span v-else class="no-data">从未登录</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column 
          v-if="isColumnVisible('createtime')"
          prop="CreatedAt" 
          label="创建时间" 
          min-width="140" 
          show-overflow-tooltip 
          align="center" 
          header-align="center"
        >
          <template #default="scope">
            <div class="create-time-info">
              <el-icon><Calendar /></el-icon>
              <span v-if="scope.row.CreatedAt">
                {{ formatDateTime(scope.row.CreatedAt) }}
              </span>
              <span v-else class="no-data">未知</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="180" fixed="right" align="center" header-align="center">
          <template #default="scope">
            <div class="action-buttons">
              <el-tooltip content="编辑用户" placement="top">
                <el-button type="primary" :icon="Edit" size="small" circle @click="editUser(scope.row)" :disabled="!userStore.hasPermission('sys:user:edit')" />
              </el-tooltip>
              <el-tooltip content="权限设置" placement="top">
                <el-button type="warning" :icon="Setting" size="small" circle @click="setPermission(scope.row)" :disabled="!userStore.hasPermission('sys:user:role')" />
              </el-tooltip>
              <el-tooltip content="查看详情" placement="top">
                <el-button type="info" :icon="View" size="small" circle @click="viewUser(scope.row)" />
              </el-tooltip>
              <el-tooltip content="删除用户" placement="top">
                <el-button 
                  type="danger" 
                  :icon="Delete" 
                  size="small" 
                  circle 
                  @click="deleteUser(scope.row)"
                  :disabled="(scope.row.Role === 'admin' || (scope.row.RoleNames && scope.row.RoleNames.includes('admin'))) || !userStore.hasPermission('sys:user:delete')"
                />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        </el-table>
      </div>
      
      <!-- 分页控制 -->
      <div class="pagination-wrapper">
        <div class="pagination-info">
          <span class="info-text">
            显示第 {{ (page - 1) * pageSize + 1 }} - {{ Math.min(page * pageSize, total) }} 条，
            共 {{ total }} 条数据
          </span>
        </div>
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          v-model:page-size="pageSize"
          v-model:current-page="page"
          :page-sizes="[5, 10, 20, 50, 100]"
          class="modern-pagination"
        />
      </div>
    </el-card>

    <!-- 批量操作工具栏 -->
    <el-card v-if="selectedUsers.length > 0" class="batch-actions" shadow="hover">
      <div class="batch-toolbar">
        <div class="batch-info">
          <el-icon><Select /></el-icon>
          <span>已选择 {{ selectedUsers.length }} 个用户</span>
        </div>
        <div class="batch-buttons">
          <el-button type="warning" :icon="Lock" @click="batchDisable" :disabled="!userStore.hasPermission('sys:user:edit')">批量禁用</el-button>
          <el-button type="success" :icon="Unlock" @click="batchEnable" :disabled="!userStore.hasPermission('sys:user:edit')">批量启用</el-button>
          <el-button type="danger" :icon="Delete" @click="batchDelete" :disabled="!userStore.hasPermission('sys:user:delete')">批量删除</el-button>
        </div>
      </div>
    </el-card>

    <!-- 新增/编辑用户对话框 -->
    <el-dialog 
      v-model="showAddUser" 
      :title="isEdit ? '编辑用户' : '新增用户'" 
      width="700px" 
      :append-to-body="true"
      :lock-scroll="false"
      @close="resetAddUser"
      class="user-dialog"
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="dialog-header">
          <el-icon class="dialog-icon" style="font-size: 24px;"><UserFilled /></el-icon>
          <span class="dialog-title">{{ isEdit ? '编辑用户信息' : '新增用户' }}</span>
          <div v-if="isEdit" class="header-actions">
            <el-button type="warning" @click="openResetPasswordDialog" :disabled="!userStore.hasPermission('sys:user:reset-pwd')">
              <el-icon><Key /></el-icon>
              重置密码
            </el-button>
          </div>
        </div>
      </template>
      <el-divider />
      <el-form :model="addUserForm" :rules="addUserRules" ref="addUserRef" label-width="120px" class="user-form">
        <!-- 基本信息区域 -->
        <div class="form-section">
          <!-- 头像显示区域 -->
          <div class="avatar-preview-section">
            <el-form-item :label="isEdit ? '当前头像' : '用户头像'">
              <UploadImg 
                shape="round" 
                :currentAvatar="addUserForm.Avatar || ''"
                :uploadUrl="'/api/users/update-avatar'" 
                @upload-success="handleAvatarUploadSuccess"
              />
            </el-form-item>
          </div>

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="用户名" prop="Username">
                <el-input 
                  v-model="addUserForm.Username" 
                  placeholder="请输入用户名"
                  :prefix-icon="User"
                  :disabled="isEdit"
                  autocomplete="off"
                  size="large"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="真实姓名" prop="RealName">
                <el-input 
                  v-model="addUserForm.RealName" 
                  placeholder="请输入真实姓名"
                  :prefix-icon="UserFilled"
                  size="large"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="24" v-if="!isEdit">
            <el-col :span="12">
              <el-form-item label="登录密码" prop="Password">
                <el-input 
                  v-model="addUserForm.Password" 
                  type="password" 
                  placeholder="请输入登录密码"
                  :prefix-icon="Lock"
                  show-password
                  autocomplete="off"
                  size="large"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="确认密码" prop="ConfirmPassword">
                <el-input 
                  v-model="addUserForm.ConfirmPassword" 
                  type="password" 
                  placeholder="请再次输入密码"
                  :prefix-icon="Lock"
                  show-password
                  autocomplete="off"
                  size="large"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 角色权限区域 -->
        <div class="form-section">

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="用户角色" prop="Role">
                <el-select 
                  v-model="addUserForm.Role" 
                  placeholder="请选择用户角色" 
                  style="width: 100%"
                  size="large"
                >
                  <el-option 
                    v-for="role in availableRoles" 
                    :key="role.ID" 
                    :label="role.Name" 
                    :value="role.Code"
                    :disabled="!role.Status"
                  >
                    <div class="role-option">
                      <el-icon><Star /></el-icon>
                      <span>{{ role.Name }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="所属部门" prop="Department">
                <el-select 
                  v-model="addUserForm.Department" 
                  placeholder="请选择所属部门" 
                  style="width: 100%"
                  size="large"
                >
                  <el-option v-for="d in departments" :key="d.Name" :label="d.Name" :value="d.Name">
                    <div class="department-option">
                      <el-icon><OfficeBuilding /></el-icon>
                      <span>{{ d.Name }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 联系信息区域 -->
        <div class="form-section">

          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="联系电话" prop="Phone">
                <el-input 
                  v-model="addUserForm.Phone" 
                  placeholder="请输入联系电话"
                  :prefix-icon="Phone"
                  size="large"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="邮箱地址" prop="Email">
                <el-input 
                  v-model="addUserForm.Email" 
                  placeholder="请输入邮箱地址"
                  :prefix-icon="Message"
                  size="large"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 职位信息区域 -->
        <div class="form-section">
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="职位" prop="PositionID">
                <el-select 
                  v-model="addUserForm.PositionID" 
                  placeholder="请选择职位" 
                  style="width: 100%"
                  size="large"
                  clearable
                >
                  <el-option 
                    v-for="position in positions" 
                    :key="position.ID" 
                    :label="position.Name" 
                    :value="position.ID"
                  >
                    <div class="position-option">
                      <el-icon><Briefcase /></el-icon>
                      <span>{{ position.Name }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="性别" prop="Gender">
                <el-select 
                  v-model="addUserForm.Gender" 
                  placeholder="请选择性别" 
                  style="width: 100%"
                  size="large"
                  clearable
                >
                  <el-option label="男" value="男">
                    <div class="gender-option">
                      <el-icon><Male /></el-icon>
                      <span>男</span>
                    </div>
                  </el-option>
                  <el-option label="女" value="女">
                    <div class="gender-option">
                      <el-icon><Female /></el-icon>
                      <span>女</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 个人信息区域 -->
        <div class="form-section">
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="生日" prop="Birthday">
                <el-date-picker
                  v-model="addUserForm.Birthday"
                  type="date"
                  placeholder="请选择生日"
                  style="width: 100%"
                  size="large"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="地址" prop="Address">
                <el-input 
                  v-model="addUserForm.Address" 
                  placeholder="请输入地址"
                  :prefix-icon="Location"
                  size="large"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="24">
            <el-col :span="24">
              <el-form-item label="备注" prop="Remark">
                <el-input 
                  v-model="addUserForm.Remark" 
                  type="textarea"
                  placeholder="请输入备注信息"
                  :rows="3"
                  size="large"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        

      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showAddUser=false" size="large">
            <el-icon><Close /></el-icon>
            取消
          </el-button>
          <el-button type="primary" @click="submitAddUser" size="large" :loading="submitLoading">
            <el-icon><Check /></el-icon>
            {{ isEdit ? '保存修改' : '创建用户' }}
          </el-button>
        </div>
      </template>
    </el-dialog>



    <!-- 用户详情对话框 -->
    <el-dialog 
      v-model="showUserDetail" 
      title="用户详情" 
      width="700px"
      :append-to-body="true"
      :lock-scroll="false"
    >
      <div class="user-detail" v-if="currentUser">
        <!-- 用户头像和基本信息 -->
        <div class="detail-header">
          <el-avatar :src="currentUser.Avatar" :size="80">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="user-basic">
            <h3>{{ currentUser.RealName }}</h3>
            <p>@{{ currentUser.Username }}</p>
          </div>
        </div>
        
        <!-- 用户详细信息表单 -->
        <el-form 
          :model="currentUser" 
          label-width="120px" 
          class="user-detail-form"
          label-position="left"
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="用户ID">
                <el-input v-model="currentUser.ID" readonly />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="用户名">
                <el-input v-model="currentUser.Username" readonly />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="真实姓名">
                <el-input v-model="currentUser.RealName" readonly />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="性别">
                <el-input :value="currentUser.Gender || '未设置'" readonly />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="生日">
                <el-input :value="currentUser.Birthday || '未设置'" readonly />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input :value="currentUser.Phone || '未设置'" readonly />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="邮箱地址">
                <el-input :value="currentUser.Email || '未设置'" readonly />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="所属部门">
                <el-input :value="currentUser.Department || '未设置'" readonly />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="岗位职务">
                <el-input :value="currentUser.Position || '未设置'" readonly />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="用户角色">
                <div class="role-tags-container">
                  <template v-if="currentUser.RoleNames">
                    <el-tag 
                      v-for="(roleName, index) in getRoleList(currentUser.RoleNames)"
                      :key="index"
                      :type="getRoleTagType(roleName)"
                      class="role-tag-detail"
                      effect="plain"
                    >
                      <el-icon>
                        <Star v-if="roleName === 'admin' || roleName === '管理员'" />
                        <User v-else />
                      </el-icon>
                      {{ roleName }}
                    </el-tag>
                  </template>
                  <el-tag v-else type="info" class="role-tag-detail" effect="plain">
                    <el-icon><User /></el-icon>
                    普通用户
                  </el-tag>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="账户状态">
                <el-tag :type="currentUser.Status === 1 ? 'success' : 'danger'">
                  {{ currentUser.Status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <!-- 预留空间，保持布局平衡 -->
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="地址">
                <el-input :value="currentUser.Address || '未设置'" readonly />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="创建时间">
                <el-input :value="formatDateTime(currentUser.CreatedAt) || '未知'" readonly />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最后登录">
                <el-input :value="formatDateTime(currentUser.LastLoginTime) || '从未登录'" readonly />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input 
                  type="textarea" 
                  :value="currentUser.Remark || '无备注'" 
                  readonly 
                  :rows="3"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </el-dialog>

    <!-- 列设置对话框 -->
    <el-dialog 
      v-model="showColumnSettings" 
      title="列设置" 
      width="600px"
      :append-to-body="true"
      :lock-scroll="false"
    >
      <div class="column-settings">
        <div class="settings-header">
          <el-alert
            title="提示"
            description="您可以选择要显示的列，并调整列的显示顺序。"
            type="info"
            :closable="false"
            style="margin-bottom: 20px;"
          />
        </div>
        
        <div class="column-list">
          <div class="list-header">
            <el-checkbox 
              v-model="selectAllColumns" 
              @change="handleSelectAllColumns"
              :indeterminate="isIndeterminate"
            >
              全选/取消全选
            </el-checkbox>
            <el-button 
              type="primary" 
              size="small" 
              @click="resetColumnSettings"
            >
              重置默认
            </el-button>
          </div>
          
          <el-divider style="margin: 15px 0;" />
          
          <div class="column-items">
            <div 
              v-for="(column, index) in columnSettings" 
              :key="column.key"
              class="column-item"
            >
              <div class="column-control">
                <el-checkbox 
                  v-model="column.visible" 
                  @change="updateColumnVisibility"
                >
                  {{ column.label }}
                </el-checkbox>
              </div>
              
              <div class="column-actions">
                <el-button 
                  size="small" 
                  :disabled="index === 0"
                  @click="moveColumnUp(index)"
                >
                  <el-icon style="color: #409eff;"><CaretTop /></el-icon>
                </el-button>
                <el-button 
                  size="small" 
                  :disabled="index === columnSettings.length - 1"
                  @click="moveColumnDown(index)"
                >
                  <el-icon style="color: #409eff;"><CaretBottom /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showColumnSettings = false" size="large">
            <el-icon><Close /></el-icon>
            取消
          </el-button>
          <el-button type="primary" @click="applyColumnSettings" size="large">
            <el-icon><Check /></el-icon>
            应用设置
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 头像裁切对话框 -->
    <el-dialog v-model="cropperVisible" title="裁剪头像" width="700px" :append-to-body="true">
      <div style="height:520px;width:100%;overflow:auto;">
        <Cropper
          ref="cropper"
          :src="cropperImg"
          :stencil-props="{ aspectRatio: 1 }"
          :autoZoom="true"
          :resizeImage="true"
          style="height:490px;width:100%;background:#222;"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cropperVisible = false">取消</el-button>
          <el-button type="primary" @click="doCrop">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 密码重置对话框 -->
    <el-dialog v-model="showResetPassword" title="重置密码" width="500px" :append-to-body="true" :lock-scroll="false" @close="closeResetPasswordDialog">
      <template #header>
        <div class="dialog-header">
          <el-icon class="dialog-icon" style="font-size: 24px;"><Key /></el-icon>
          <span class="dialog-title">重置用户密码</span>
        </div>
      </template>
      
      <el-alert
        title="重置密码将会覆盖用户当前密码，请谨慎操作！"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px;"
      />
      
      <el-form :model="resetPasswordForm" label-width="120px">
        <el-form-item label="新密码" required>
          <el-input
            v-model="resetPasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
            size="large"
          />
        </el-form-item>
        
        <el-form-item label="确认密码" required>
          <el-input
            v-model="resetPasswordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            size="large"
          />
        </el-form-item>
        
        <el-form-item label="通知方式">
          <el-radio-group v-model="resetPasswordForm.notifyMethod">
            <el-radio value="email">邮件通知</el-radio>
              <el-radio value="sms">短信通知</el-radio>
              <el-radio value="none">不通知</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeResetPasswordDialog">取消</el-button>
          <el-button type="primary" @click="doResetPassword">确认重置</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 权限设置对话框 -->
    <el-dialog 
      v-model="showPermissionDialog" 
      :append-to-body="true"
      :lock-scroll="false"
      class="permission-dialog-wrapper"
    >
      <template #header>
        <div class="permission-dialog-header">
          <el-icon class="permission-icon"><Setting /></el-icon>
          <span class="permission-title">权限设置</span>
        </div>
      </template>
      <div class="permission-dialog">
        <div class="user-info-section">
          <div class="user-basic-info">
            <el-avatar :size="50" :src="currentPermissionUser.Avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <div class="user-details">
              <h3>{{ currentPermissionUser.Username }}</h3>
              <p>{{ currentPermissionUser.RealName || '未设置真实姓名' }}</p>
              <p class="user-dept">{{ currentPermissionUser.Department || '未设置部门' }}</p>
            </div>
          </div>
        </div>
        
        <el-divider style="margin: 12px 0;" />
        
        <div class="role-assignment-section">
          <h4>角色分配</h4>
          <p class="section-desc">为用户分配角色，用户将获得所选角色的所有权限</p>
          
          <div class="role-table-container">
            <el-table 
              :data="availableRoles" 
              style="width: 100%"
              max-height="400px"
              @selection-change="handleRoleSelectionChange"
              ref="roleTable"
              border
            >
              <el-table-column 
                type="selection" 
                width="55"
                :selectable="(row) => row.Status"
              />
              <el-table-column 
                prop="Name" 
                label="角色名称" 
                min-width="120"
                show-overflow-tooltip
              >
                <template #default="scope">
                  <div class="role-name-cell">
                    <span class="role-name-text">{{ scope.row.Name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column 
                prop="Code" 
                label="角色编码" 
                min-width="100"
                show-overflow-tooltip
              />
              <el-table-column 
                prop="Description" 
                label="角色描述" 
                min-width="150"
                show-overflow-tooltip
              >
                <template #default="scope">
                  <span>{{ scope.row.Description || '暂无描述' }}</span>
                </template>
              </el-table-column>
              <el-table-column 
                prop="Status" 
                label="状态" 
                min-width="70" 
                align="center"
              >
                <template #default="scope">
                  <el-tag 
                    :type="scope.row.Status ? 'success' : 'danger'" 
                    size="small"
                  >
                    {{ scope.row.Status ? '启用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button type="danger" plain @click="showPermissionDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="saveUserRoles" 
            :loading="permissionLoading"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import api from '@/utils/api'
import apiService from '@/services/apiService.js'
import { 
  Edit, Delete, Setting, Search, Plus, Refresh, User, UserFilled, 
  Star, Phone, Message, OfficeBuilding, Grid, View, Lock, Unlock,
  Select, Download, Close, Check, Key, CaretTop, CaretBottom, Clock, Calendar,
  Briefcase, Male, Female, Location, CircleCheckFilled
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import UploadImg from './UploadImg.vue'

import { useUserStore } from '../../store/user'
import { storeToRefs } from 'pinia'

// 用户store
const userStore = useUserStore()
const { user: currentLoginUser } = storeToRefs(userStore)

// 基础数据
const search = ref('')
const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(5)
const loading = ref(false)
const submitLoading = ref(false)

// 筛选条件
const filterRole = ref('')
const filterStatus = ref('')

// 对话框控制
const showAddUser = ref(false)
const showUserDetail = ref(false)
const showColumnSettings = ref(false)
const isEdit = ref(false)

// 批量操作
const selectedUsers = ref([])

// 列设置相关
const columnSettings = ref([
  { key: 'username', label: '用户名', visible: true, fixed: true }, // 固定列，不可隐藏
  { key: 'realname', label: '真实姓名', visible: true, fixed: false },
  { key: 'department', label: '所属部门', visible: true, fixed: false },
  { key: 'role', label: '用户角色', visible: true, fixed: false },
  { key: 'status', label: '账户状态', visible: true, fixed: false },
  { key: 'contact', label: '联系方式', visible: true, fixed: false },
  { key: 'createtime', label: '创建时间', visible: false, fixed: false },
  { key: 'lastlogin', label: '最后登录', visible: false, fixed: false }
])
const selectAllColumns = ref(false)
const isIndeterminate = ref(false)

// 当前操作用户
const currentUser = ref(null)

// 头像裁切相关
const cropperVisible = ref(false)
const cropperImg = ref('')
const cropper = ref(null)
const fileInput = ref(null)
// 头像base64临时存储
const avatarBase64 = ref('')
const avatarPreviewUrl = ref('')
// 原始用户数据，用于比较头像是否有变化
const originalUserData = ref(null)

// 密码重置相关
const showResetPassword = ref(false)
const resetPasswordForm = ref({
  newPassword: '',
  confirmPassword: '',
  notifyMethod: 'none' // email, sms, none - 默认为不通知
})

// 表单数据
const addUserForm = ref({
  Username: '',
  Password: '',
  ConfirmPassword: '',
  Role: '',
  Department: '',
  RealName: '',
  Avatar: '',
  Email: '',
  Phone: '',
  PositionID: '',
  DepartmentID: '',
  Gender: '',
  Birthday: '',
  Address: '',
  Remark: ''
})

// 计算属性 - 优化活跃用户判断逻辑
const activeUsers = computed(() => {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  
  return users.value.filter(user => {
    // 用户必须是启用状态
    if (user.Status !== 1) return false
    
    // 如果有最后登录时间，检查是否在一周内
    if (user.LastLoginTime) {
      const lastLoginDate = new Date(user.LastLoginTime)
      return lastLoginDate >= oneWeekAgo
    }
    
    // 如果没有登录记录但是最近创建的用户（3天内），也算活跃
    if (user.CreatedAt) {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const createdDate = new Date(user.CreatedAt)
      return createdDate >= threeDaysAgo
    }
    
    // 其他情况不算活跃用户
    return false
  }).length
})

// 表单验证规则
const addUserRules = {
  Username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  Password: [
    { 
      validator: (rule, value, callback) => {
        // 编辑模式下密码不是必填的
        if (isEdit.value) {
          if (value && value.length < 6) {
            callback(new Error('密码长度至少6个字符'))
          } else if (value && value.length > 20) {
            callback(new Error('密码长度不能超过20个字符'))
          } else {
            callback()
          }
        } else {
          // 新增模式下密码是必填的
          if (!value) {
            callback(new Error('请输入密码'))
          } else if (value.length < 6 || value.length > 20) {
            callback(new Error('密码长度在 6 到 20 个字符'))
          } else {
            callback()
          }
        }
      },
      trigger: 'blur'
    }
  ],
  ConfirmPassword: [
    { 
      validator: (rule, value, callback) => {
        // 编辑模式下确认密码不是必填的
        if (isEdit.value) {
          if (addUserForm.value.Password && !value) {
            callback(new Error('请确认密码'))
          } else if (value !== addUserForm.value.Password) {
            callback(new Error('两次输入密码不一致'))
          } else {
            callback()
          }
        } else {
          // 新增模式下确认密码是必填的
          if (!value) {
            callback(new Error('请确认密码'))
          } else if (value !== addUserForm.value.Password) {
            callback(new Error('两次输入密码不一致'))
          } else {
            callback()
          }
        }
      }, 
      trigger: 'blur' 
    }
  ],
  Role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  Department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  DepartmentID: [{ required: false, message: '请选择部门ID', trigger: 'change' }],
  RealName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '姓名长度在 2 到 10 个字符', trigger: 'blur' }
  ],
  Email: [
    { 
      validator: (rule, value, callback) => {
        if (!value || value.trim() === '') {
          callback() // 空值时通过验证
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          callback(new Error('邮箱格式不正确'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  Phone: [
    { 
      validator: (rule, value, callback) => {
        if (!value || value.trim() === '') {
          callback() // 空值时通过验证
        } else if (!/^1[3-9]\d{9}$/.test(value)) {
          callback(new Error('请输入正确的手机号码'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  PositionID: [{ required: false, message: '请选择职位', trigger: 'change' }],
  Gender: [{ required: false, message: '请选择性别', trigger: 'change' }],
  Birthday: [{ required: false, message: '请选择生日', trigger: 'change' }],
  Address: [
    { max: 200, message: '地址长度不能超过200个字符', trigger: 'blur' }
  ],
  Remark: [
    { max: 500, message: '备注长度不能超过500个字符', trigger: 'blur' }
  ]
}

const addUserRef = ref()

// 重置表单
/**
 * 重置表单数据和头像相关变量
 */
const resetAddUser = () => {
  addUserForm.value = { 
    Username: '', 
    Password: '', 
    ConfirmPassword: '',
    Role: '', 
    Department: '', 
    RealName: '', 
    Avatar: '', 
    Email: '', 
    Phone: '',
    PositionID: '',
    DepartmentID: '',
    Gender: '',
    Birthday: '',
    Address: '',
    Remark: ''
  }
  
  // 清空头像相关临时变量
  avatarBase64.value = ''
  avatarPreviewUrl.value = ''
  cropperImg.value = ''
  
  isEdit.value = false
  addUserRef.value?.resetFields()
  
  // 清空文件输入框
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 重置筛选条件
const resetFilters = () => {
  search.value = ''
  filterRole.value = ''
  filterStatus.value = ''
  page.value = 1
  fetchUsers()
}

// 刷新数据
const refreshData = async () => {
  try {
    ElMessage.info('正在刷新数据...')
    await fetchUsers()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  }
}


/**
 * 提交用户表单
 * 直接将头像base64数据保存到数据库中
 */
const submitAddUser = () => {
  console.log('🚀 [DEBUG] 开始提交用户表单')
  console.log('🚀 [DEBUG] 表单数据:', addUserForm.value)
  console.log('🚀 [DEBUG] 是否编辑模式:', isEdit.value)
  
  addUserRef.value.validate(async (valid, fields) => {
    console.log('🚀 [DEBUG] 表单验证结果:', valid)
    if (fields) {
      console.log('🚀 [DEBUG] 验证失败字段:', fields)
    }
    
    if (!valid) {
      // 获取第一个验证失败的字段错误信息
      if (fields) {
        const firstFieldKey = Object.keys(fields)[0]
        const firstFieldErrors = fields[firstFieldKey]
        console.log('🚀 [DEBUG] 第一个失败字段:', firstFieldKey, firstFieldErrors)
        if (firstFieldErrors && firstFieldErrors.length > 0) {
          ElMessage.error(firstFieldErrors[0]?.message || '表单验证失败')
        } else {
          ElMessage.error('请填写所有必填项')
        }
      } else {
        ElMessage.error('请填写所有必填项')
      }
      return
    }
    
    console.log('🚀 [DEBUG] 表单验证通过，开始提交')
    submitLoading.value = true
    try {
      const token = localStorage.getItem('token')
      console.log('🚀 [DEBUG] Token存在:', !!token)
      
      const url = isEdit.value ? '/auth/update-user' : '/auth/add-user'
      const method = isEdit.value ? 'put' : 'post'
      console.log('🚀 [DEBUG] API URL:', url, 'Method:', method)
      
      const formData = { ...addUserForm.value }
      if (isEdit.value) {
        delete formData.Password
        delete formData.ConfirmPassword
      }
      
      // 如果有新上传的头像数据，使用新数据；否则保持原有数据
      if (avatarBase64.value) {
        // 有新裁剪的头像数据
        formData.Avatar = avatarBase64.value
        console.log('🚀 [DEBUG] 使用新头像数据')
      } else if (addUserForm.value.Avatar) {
        // 保持表单中现有的头像数据
        formData.Avatar = addUserForm.value.Avatar
        console.log('🚀 [DEBUG] 保持原有头像数据')
      } else {
        // 没有头像数据
        formData.Avatar = ''
        console.log('🚀 [DEBUG] 无头像数据')
      }
      
      console.log('🚀 [DEBUG] 最终提交数据:', formData)
      
      const res = await api[method](url, formData, {
      headers: { Authorization: `Bearer ${token}` }
    })
      
      console.log('🚀 [DEBUG] API响应:', res)
      console.log('🚀 [DEBUG] API响应类型:', typeof res)
      console.log('🚀 [DEBUG] API响应是否为对象:', res && typeof res === 'object')
      console.log('🚀 [DEBUG] API响应success字段:', res?.success)
      console.log('🚀 [DEBUG] API响应success类型:', typeof res?.success)
      
      // 修正：@/utils/api的响应拦截器返回response.data，所以res就是后端返回的数据
      if (res && res.success) {
        console.log('🚀 [DEBUG] API调用成功')
        // 根据是否有头像更新显示不同的成功消息
        let successMessage = isEdit.value ? '修改成功' : '添加成功'
        if (formData.Avatar && formData.Avatar !== (isEdit.value ? originalUserData.value?.Avatar : '')) {
          successMessage += '，头像已更新'
        }
        ElMessage.success(successMessage)
        
        // 如果编辑的是当前登录用户，重新从后端获取用户数据
         if (isEdit.value && res.data?.data && currentLoginUser.value && 
             (res.data.data?.Username === currentLoginUser.value.username || 
              res.data.data?.ID === currentLoginUser.value.id)) {           
           // 重新从后端获取完整的用户信息
           await userStore.fetchProfile(true) // 强制刷新
           
           // 使用nextTick确保DOM更新
           await nextTick()
           
           // 同时更新编辑表单中的头像显示
           if (userStore.user.Avatar) {
             addUserForm.value.Avatar = userStore.user.Avatar
           }
           
           // 用户store数据重新获取完成
         }
        
        showAddUser.value = false
        fetchUsers()
        resetAddUser()
      } else {
        console.log('🚀 [DEBUG] API调用失败 - 响应数据:', res)
        console.log('🚀 [DEBUG] 失败原因:', res?.message)
        console.log('🚀 [DEBUG] 缺失字段:', res?.missingFields)
        
        // 如果后端返回了具体的缺失字段信息，显示详细错误
        if (res?.missingFields && res.missingFields.length > 0) {
          ElMessage.error(res.message || `请填写以下必填项：${res.missingFields.join('、')}`)
        } else {
          ElMessage.error(res?.message || (isEdit.value ? '修改失败' : '添加失败'))
        }
      }
    } catch (error) {
      console.error('🚀 [DEBUG] API请求异常:', error)
      console.error('🚀 [DEBUG] 错误详情:', error.response?.data)
      console.error('🚀 [DEBUG] 错误状态码:', error.response?.status)
      ElMessage.error('操作失败，请重试')
    } finally {
      console.log('🚀 [DEBUG] 提交流程结束，重置loading状态')
      submitLoading.value = false
    }
  })
}

const departments = ref([])
const positions = ref([])

/**
 * 获取部门列表
 */
const fetchDepartments = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await api.get('/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })
    // 修复数据结构：API响应拦截器返回response.data，所以直接访问res.departments
    if (res && res.departments) {
      departments.value = res.departments
    }
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

/**
 * 获取职位列表
 */
const fetchPositions = async () => {
  try {
    const res = await api.get('/positions')
    // 修复数据结构：API响应拦截器返回response.data，所以直接访问res.data.list
    if (res && res.success && res.data) {
      positions.value = res.data.list || []
    }
  } catch (error) {
    console.error('获取职位列表失败:', error)
  }
}
watch(showAddUser, v => { 
  if (v) {
    fetchDepartments()
    fetchPositions()
    fetchAllRoles()
  }
})

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      search: search.value
    }
    
    // 添加筛选条件
    if (filterRole.value) params.role = filterRole.value
    if (filterStatus.value !== '') params.status = filterStatus.value
    
    const res = await api.get('/auth/user-list', { params })
    
    if (res && res.success) {
      users.value = res.data
      total.value = res.total
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 监听分页变化
watch(
  () => [page.value, pageSize.value],
  ([newPage, newSize], [oldPage, oldSize]) => {
    // 如果页面大小改变，重置到第一页
    if (newSize !== oldSize) {
      page.value = 1
    }
    fetchUsers()
  }
)

// 表格行样式
const getRowClassName = ({ row, rowIndex }) => {
  if (row.Role === 'admin' || (row.RoleNames && row.RoleNames.includes('admin'))) return 'admin-row'
  if (row.Status === 0) return 'disabled-row'
  return ''
}

// 选择变化处理
const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

// 获取部门标签类型（为不同部门分配不同颜色）
const getDepartmentTagType = (department) => {
  // 检查部门参数是否为空或null
  if (!department || typeof department !== 'string') {
    return 'info' // 默认返回info类型
  }
  
  const departmentColors = {
    '珠海源信': 'primary',
    '供应商': 'success', 
    '客户': 'warning',
    '公司': 'danger',
    '部门': 'info'
  }
  
  // 根据部门名称的哈希值分配颜色，确保同一部门始终是同一颜色
  if (departmentColors[department]) {
    return departmentColors[department]
  }
  
  const colors = ['primary', 'success', 'warning', 'danger', 'info']
  let hash = 0
  for (let i = 0; i < department.length; i++) {
    hash = department.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * 将角色名称字符串拆分为角色数组
 * @param {string} roleNames - 逗号分隔的角色名称字符串
 * @returns {Array} 角色名称数组
 */
const getRoleList = (roleNames) => {
  if (!roleNames) return []
  return roleNames.split(',').map(role => role.trim()).filter(role => role)
}

/**
 * 根据角色名称获取标签类型（颜色）
 * @param {string} roleName - 角色名称
 * @returns {string} Element Plus 标签类型
 */
const getRoleTagType = (roleName) => {
  // 从动态获取的角色列表中查找对应角色
  const role = availableRoles.value.find(r => r.Name === roleName || r.Code === roleName)
  
  // 创建一个全局的角色颜色映射缓存
  if (!window.roleColorCache) {
    window.roleColorCache = new Map()
  }
  
  // 如果已经为这个角色分配过颜色，直接返回
  if (window.roleColorCache.has(roleName)) {
    return window.roleColorCache.get(roleName)
  }
  
  // 扩展的颜色选项，确保有足够的颜色区分不同角色
  const allColors = [
    'primary',   // 蓝色
    'success',   // 绿色
    'warning',   // 橙色
    'danger',    // 红色
    'info',      // 灰色
    '',          // 默认色
  ]
  
  let assignedColor = 'primary' // 默认颜色
  
  if (role && role.ID) {
    // 获取已使用的颜色
    const usedColors = Array.from(window.roleColorCache.values())
    
    // 根据角色类型确定优先颜色组
    const roleCode = role.Code?.toLowerCase() || ''
    const roleNameLower = role.Name?.toLowerCase() || ''
    
    let preferredColors = []
    
    // 管理员类角色优先使用红色系
    if (roleCode.includes('admin') || roleNameLower.includes('管理员') || roleNameLower.includes('超级') || roleNameLower.includes('系统')) {
      preferredColors = ['danger', 'warning']
    }
    // 审核类角色优先使用绿色系
    else if (roleNameLower.includes('审核') || roleNameLower.includes('审批') || roleCode.includes('audit') || roleCode.includes('review')) {
      preferredColors = ['success', 'primary']
    }
    // 部门管理类角色优先使用橙色系
    else if (roleNameLower.includes('部门') || roleNameLower.includes('质量') || roleCode.includes('manager')) {
      preferredColors = ['warning', 'info']
    }
    // 其他角色使用所有颜色
    else {
      preferredColors = allColors
    }
    
    // 从优先颜色组中找到第一个未使用的颜色
    for (const color of preferredColors) {
      if (!usedColors.includes(color)) {
        assignedColor = color
        break
      }
    }
    
    // 如果优先颜色都被使用了，从所有颜色中找未使用的
    if (usedColors.includes(assignedColor)) {
      for (const color of allColors) {
        if (!usedColors.includes(color)) {
          assignedColor = color
          break
        }
      }
    }
    
    // 如果所有颜色都被使用了，使用角色ID进行循环分配
    if (usedColors.includes(assignedColor)) {
      const colorIndex = role.ID % allColors.length
      assignedColor = allColors[colorIndex]
    }
  }
  else {
    // 硬编码的备用映射（兼容性保证）
    const fallbackColors = {
      'admin': 'danger',
      '管理员': 'danger',
      '超级管理员': 'warning',
      '系统管理员': 'danger',
      '部门管理员': 'warning',
      '质量管理员': 'info',
      '审核员': 'success',
      '操作员': 'primary',
      '普通用户': 'info',
      '用户': ''
    }
    
    if (fallbackColors[roleName]) {
      assignedColor = fallbackColors[roleName]
    } else {
      // 根据角色名称的哈希值分配颜色
      let hash = 0
      for (let i = 0; i < roleName.length; i++) {
        hash = roleName.charCodeAt(i) + ((hash << 5) - hash)
      }
      assignedColor = allColors[Math.abs(hash) % allColors.length] || 'primary'
    }
  }
  
  // 缓存颜色分配结果
  window.roleColorCache.set(roleName, assignedColor)
  
  return assignedColor
}

onMounted(() => {
  loadColumnSettings()
  fetchUsers()
  fetchAllRoles() // 获取角色数据用于动态颜色分配
})

// 用户操作方法
/**
 * 编辑用户
 * @param {Object} row - 用户数据
 */
/**
 * 编辑用户信息
 * 通过API获取最新的用户数据并填充到编辑表单中
 * @param {Object} row - 表格行数据（包含用户ID）
 */
const editUser = async (row) => {
  try {
    // 显示加载状态
    loading.value = true
    
    // 使用apiService调用API获取最新的用户详细信息
    const apiInstance = await apiService.getInstance()
    const res = await apiInstance.get(`/auth/user/${row.ID}`)
    
    if (res.data && res.data.success) {
      const latestUserData = res.data.data
      
      // 设置编辑模式
      isEdit.value = true
      
      // 使用最新的用户数据填充表单，清空密码字段
      addUserForm.value = { 
        ...latestUserData, 
        Password: '', 
        ConfirmPassword: '' 
      }
      
      // 设置当前操作用户，用于重置密码功能
      currentUser.value = latestUserData
      
      // 保存原始用户数据，用于比较头像是否有变化
      originalUserData.value = { ...latestUserData }
      
      // 清空头像相关临时变量，但保留原有头像数据用于显示
      avatarBase64.value = ''
      avatarPreviewUrl.value = ''
      cropperImg.value = ''
      
      // 如果编辑的是当前登录用户，优先使用store中的头像数据
      if (currentLoginUser.value && 
          (latestUserData.Username === currentLoginUser.value.username || 
           latestUserData.ID === currentLoginUser.value.id)) {
        // 当前登录用户，优先使用store中的头像数据
        addUserForm.value.Avatar = currentLoginUser.value.Avatar || latestUserData.Avatar || ''
      } else {
        // 其他用户，使用数据库中的最新头像数据
        addUserForm.value.Avatar = latestUserData.Avatar || ''
      }
      
      // 显示编辑对话框
      showAddUser.value = true
      
    } else {
      console.error('❌ API返回错误:', res.data)
      ElMessage.error(res.data.message || '获取用户信息失败')
    }
    
  } catch (error) {
    console.error('💥 获取用户详细信息失败:', error)
    ElMessage.error('获取用户信息失败，请重试')
  } finally {
    loading.value = false
  }
}

const deleteUser = async (row) => {
  if (row.Role === 'admin' || (row.RoleNames && row.RoleNames.includes('admin'))) {
    ElMessage.warning('不能删除管理员账户')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${row.RealName}" 吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        appendTo: 'body',
        lockScroll: false
      }
    )
    
    const token = localStorage.getItem('token')
    const res = await api.delete(`/auth/user/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data && res.data.success) {
      ElMessage.success('删除成功')
      fetchUsers()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

const viewUser = (row) => {
  currentUser.value = row
  showUserDetail.value = true
}

// ===================== 权限设置相关 =====================
const showPermissionDialog = ref(false)
const currentPermissionUser = ref({})
const availableRoles = ref([])
const selectedRoleIds = ref([])
const permissionLoading = ref(false)
const roleTable = ref(null)

// 获取所有角色列表
const fetchAllRoles = async () => {
  try {
    const response = await api.get('/roles', {
      params: { page: 1, size: 1000 } // 获取所有角色
    })
    // 修复数据结构：API响应拦截器返回response.data，所以直接访问response.data?.list
    availableRoles.value = response.data?.list || []
  } catch (error) {
    console.error('获取角色列表失败:', error)
    ElMessage.error('获取角色列表失败')
  }
}

// 获取用户当前角色
const fetchUserRoles = async (userId) => {
  try {
    const response = await api.get(`/auth/user/${userId}/roles-permissions`)
    const userRoles = response.data.roles || []
    selectedRoleIds.value = userRoles.map(role => role.ID)
    
    // 设置表格中的选中状态
    nextTick(() => {
      if (roleTable.value) {
        roleTable.value.clearSelection()
        availableRoles.value.forEach(role => {
          if (selectedRoleIds.value.includes(role.ID)) {
            roleTable.value.toggleRowSelection(role, true)
          }
        })
      }
    })
  } catch (error) {
    console.error('获取用户角色失败:', error)
    ElMessage.error('获取用户角色失败')
  }
}

// 处理表格选择变化
const handleRoleSelectionChange = (selection) => {
  selectedRoleIds.value = selection.map(role => role.ID)
}

// 保存用户角色分配
const saveUserRoles = async () => {
  try {
    permissionLoading.value = true
    
    await api.post(`/auth/user/${currentPermissionUser.value.ID}/assign-roles`, {
      roleIds: selectedRoleIds.value
    })
    
    ElMessage.success('角色分配成功')
    showPermissionDialog.value = false
    await fetchUsers() // 刷新用户列表
  } catch (error) {
    console.error('角色分配失败:', error)
    ElMessage.error('角色分配失败')
  } finally {
    permissionLoading.value = false
  }
}

// 打开权限设置对话框
const setPermission = async (row) => {
  currentPermissionUser.value = row
  showPermissionDialog.value = true
  
  // 并行获取角色列表和用户当前角色
  try {
    await Promise.all([
      fetchAllRoles(),
      fetchUserRoles(row.ID)
    ])
  } catch (error) {
    console.error('权限设置对话框数据加载失败:', error)
  }
}

/**
 * 导出用户数据为XLSX格式
 * 包含完整的格式设置和样式
 */
const exportUsers = async () => {
  try {
    // 构建查询参数
    const params = {
      page: 1,
      pageSize: 10000, // 导出所有数据
      search: search.value
    }
    if (filterRole.value !== '') params.role = filterRole.value
    if (filterStatus.value !== '') params.status = filterStatus.value

    ElMessage.info('正在导出用户数据...')
    
    const res = await api.get('/auth/user-list', { params })

    // api拦截器已返回response.data，直接判断res.success
    if (res && res.success) {
      const userData = res.data
      
      // 导入本地安装的xlsx-js-style库（支持样式）
       const XLSX = await import('xlsx-js-style')
      
      // 准备导出数据
      const exportData = userData.map((user, index) => ({
        '序号': index + 1,
        '用户名': user.Username,
        '真实姓名': user.RealName,
        '角色': user.RoleNames || '普通用户',
        '部门': user.Department || '未分配',
        '邮箱': user.Email || '',
        '联系电话': user.Phone || '',
        '状态': user.Status === 1 ? '启用' : '禁用',
        '创建时间': user.CreateTime ? new Date(user.CreateTime).toLocaleString('zh-CN') : '',
        '最后登录': user.LastLoginTime ? new Date(user.LastLoginTime).toLocaleString('zh-CN') : '从未登录'
      }))

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      
      // 创建工作表
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // 设置列宽
      const colWidths = [
        { wch: 8 },   // 序号
        { wch: 15 },  // 用户名
        { wch: 12 },  // 真实姓名
        { wch: 10 },  // 角色
        { wch: 15 },  // 部门
        { wch: 25 },  // 邮箱
        { wch: 15 },  // 联系电话
        { wch: 8 },   // 状态
        { wch: 20 },  // 创建时间
        { wch: 20 }   // 最后登录
      ]
      ws['!cols'] = colWidths
      
      // 设置表头样式
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      // 设置数据行样式
      const dataStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      // 应用样式到表头（第一行）
      const headerCells = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1']
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = headerStyle
        }
      })
      
      // 应用样式到数据行
      for (let row = 2; row <= exportData.length + 1; row++) {
        // 判断是否为偶数行（从第二行开始计算，第二行为第1行数据）
        const isEvenRow = (row - 1) % 2 === 0
        
        // 设置隔行背景色的数据行样式
        const rowDataStyle = {
          ...dataStyle,
          fill: isEvenRow ? { fgColor: { rgb: 'F5F5F5' } } : undefined // 偶数行填充浅灰色
        }
        
        for (let col = 0; col < 10; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col })
          if (ws[cellRef]) {
            ws[cellRef].s = rowDataStyle
            
            // 为状态列设置特殊颜色
            if (col === 7) { // 状态列
              const status = ws[cellRef].v
              if (status === '启用') {
                ws[cellRef].s = {
                  ...rowDataStyle,
                  font: { color: { rgb: '008000' }, bold: true }
                }
              } else if (status === '禁用') {
                ws[cellRef].s = {
                  ...rowDataStyle,
                  font: { color: { rgb: 'FF0000' }, bold: true }
                }
              }
            }
            
            // 为角色列设置特殊颜色
            if (col === 3) { // 角色列
              const role = ws[cellRef].v
              if (role === '管理员') {
                ws[cellRef].s = {
                  ...rowDataStyle,
                  font: { color: { rgb: 'FF6600' }, bold: true }
                }
              }
            }
          }
        }
      }
      
      // 设置工作表名称
      const sheetName = '用户列表'
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      
      // 生成文件名
      const fileName = `用户列表_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      
      // 导出文件
      XLSX.writeFile(wb, fileName)
      
      ElMessage.success(`成功导出 ${userData.length} 条用户数据到 ${fileName}`)
    } else {
      ElMessage.error(res?.message || '获取用户数据失败')
    }
  } catch (error) {
    console.error('导出用户数据失败:', error)
    
    // 根据错误类型提供具体的错误信息
    let errorMessage = '导出用户数据失败'
    
    if (error.message && error.message.includes('Failed to fetch')) {
      errorMessage = '网络连接失败，请检查网络连接后重试'
    } else if (error.message && error.message.includes('Cannot resolve module')) {
      errorMessage = 'Excel库加载失败，请刷新页面后重试'
    } else if (error.message && error.message.includes('token')) {
      errorMessage = '登录已过期，请重新登录'
    } else if (error.response && error.response.status === 401) {
      errorMessage = '权限验证失败，请重新登录'
    } else if (error.response && error.response.status === 500) {
      errorMessage = '服务器内部错误，请联系管理员'
    } else if (error.message) {
      errorMessage = `导出失败：${error.message}`
    }
    
    ElMessage.error(errorMessage)
    
    // 提供备用的CSV导出方案
    if (error.message && (error.message.includes('xlsx') || error.message.includes('Excel'))) {
      ElMessage.info('正在尝试CSV格式导出...')
      setTimeout(() => {
        exportUsersAsCSV()
      }, 1000)
    }
  }
}

/**
 * 备用CSV导出方法
 * 当XLSX导出失败时使用
 */
const exportUsersAsCSV = async () => {
  try {
    // 构建查询参数
    const params = {
      page: 1,
      pageSize: 10000, // 导出所有数据
      search: search.value
    }
    if (filterRole.value !== '') params.role = filterRole.value
    if (filterStatus.value !== '') params.status = filterStatus.value

    const res = await api.get('/auth/user-list', { params })

    // api拦截器已返回response.data，直接判断res.success
    if (res && res.success) {
      const userData = res.data
      
      // 准备导出数据
      const exportData = userData.map((user, index) => ({
        '序号': index + 1,
        '用户名': user.Username,
        '真实姓名': user.RealName,
        '角色': user.RoleNames || '普通用户',
        '部门': user.Department || '未分配',
        '邮箱': user.Email || '',
        '联系电话': user.Phone || '',
        '状态': user.Status === 1 ? '启用' : '禁用',
        '创建时间': user.CreateTime ? new Date(user.CreateTime).toLocaleString('zh-CN') : '',
        '最后登录': user.LastLoginTime ? new Date(user.LastLoginTime).toLocaleString('zh-CN') : '从未登录'
      }))

      // 创建CSV内容
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n')

      // 添加BOM以支持中文
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `用户列表_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      ElMessage.success(`成功导出 ${userData.length} 条用户数据（CSV格式）`)
    } else {
      ElMessage.error(res?.message || '获取用户数据失败')
    }
  } catch (error) {
    console.error('CSV导出失败:', error)
    ElMessage.error('CSV导出也失败了，请联系管理员')
  }
}

// 头像上传相关
// 头像上传裁剪相关
const triggerFileInput = () => {
  fileInput.value && fileInput.value.click()
}

/**
 * 图片压缩函数（与个人中心保持一致）
 * @param {File} file - 要压缩的图片文件
 * @returns {Promise<string>} 压缩后的base64数据
 */
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // 设置最大尺寸
      const maxDimension = 800
      let { width, height } = img
      
      // 计算新尺寸
      if (width > height) {
        if (width > maxDimension) {
          height = (height * maxDimension) / width
          width = maxDimension
        }
      } else {
        if (height > maxDimension) {
          width = (width * maxDimension) / height
          height = maxDimension
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, width, height)
      
      // 转换为base64，如果还是太大则降低质量
      let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      
      // 如果压缩后仍然太大，继续降低质量
      let quality = 0.8
      while (compressedDataUrl.length > 2000000 && quality > 0.1) {
        quality -= 0.1
        compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      }
      
      resolve(compressedDataUrl)
    }
    
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const openCropper = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  
  // 检查文件大小
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage.error('头像大小不能超过 10MB!')
    return
  }
  
  try {
    let avatarData
    
    // 如果文件大小超过2MB，进行压缩
    if (file.size > 2 * 1024 * 1024) {
      ElMessage.info('图片较大，正在自动压缩...')
      avatarData = await compressImage(file)
      ElMessage.success('图片压缩完成')
    } else {
      // 文件大小合适，直接读取
      avatarData = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = ev => resolve(ev.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
    
    // 直接保存到表单中，与个人中心逻辑一致
    addUserForm.value.Avatar = avatarData
    avatarBase64.value = avatarData
    avatarPreviewUrl.value = avatarData
    
    ElMessage.success('头像已更新，请点击保存按钮保存更改')
    
    // 清空文件输入框
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    console.error('头像处理失败:', error)
    ElMessage.error('头像处理失败，请重试')
    
    // 如果直接上传失败，回退到裁剪模式
    const reader = new FileReader()
    reader.onload = ev => {
      cropperImg.value = ev.target.result
      cropperVisible.value = true
    }
    reader.readAsDataURL(file)
  }
}

/**
 * 裁剪头像并转换为base64格式
 * 将裁剪后的图片保存到临时变量，等待表单提交时一起保存
 */
const doCrop = async () => {
  // 获取裁剪后的canvas
  const result = cropper.value.getResult()
  if (!result || !result.canvas) {
    ElMessage.error('请先选择图片区域')
    return
  }
  
  const canvas = result.canvas
  
  // 压缩图片到2MB以下
  let quality = 0.8
  let base64 = canvas.toDataURL('image/jpeg', quality)
  
  // 如果图片仍然太大，继续压缩
  while (base64.length > 2000000 && quality > 0.1) {
    quality -= 0.1
    base64 = canvas.toDataURL('image/jpeg', quality)
  }
  
  if (base64.length > 2000000) {
    ElMessage.error('头像图片过大，请选择更小的图片')
    return
  }
  
  // 保存base64到临时变量
  avatarBase64.value = base64
  avatarPreviewUrl.value = base64
  
  // 更新表单中的头像显示
  addUserForm.value.Avatar = base64
  
  ElMessage.success('头像裁剪完成，将在提交表单时保存')
  
  cropperVisible.value = false
  // 清空文件输入框
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 打开重置密码对话框
const openResetPasswordDialog = () => {
  // 重置表单数据
  resetPasswordForm.value = {
    newPassword: '',
    confirmPassword: '',
    notifyMethod: 'none'
  }
  showResetPassword.value = true
}

// 关闭重置密码对话框
const closeResetPasswordDialog = () => {
  // 重置表单数据
  resetPasswordForm.value = {
    newPassword: '',
    confirmPassword: '',
    notifyMethod: 'none'
  }
  showResetPassword.value = false
}

// 密码重置方法
const doResetPassword = async () => {
  // 验证当前用户是否存在
  if (!currentUser.value || !currentUser.value.ID) {
    ElMessage.error('未选择要重置密码的用户')
    return
  }
  
  // 验证密码
  if (!resetPasswordForm.value.newPassword) {
    ElMessage.error('请输入新密码')
    return
  }
  
  if (resetPasswordForm.value.newPassword.length < 6) {
    ElMessage.error('密码至少6位')
    return
  }
  
  if (resetPasswordForm.value.newPassword !== resetPasswordForm.value.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  
  try {
    const token = localStorage.getItem('token')
    const res = await api.post('/auth/reset-user-password', {
      userId: currentUser.value.ID,
      username: currentUser.value.Username,
      newPassword: resetPasswordForm.value.newPassword,
      notifyMethod: resetPasswordForm.value.notifyMethod
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data && res.data.success) {
      ElMessage.success('密码重置成功')
      closeResetPasswordDialog()
    } else {
      ElMessage.error(res.data.message || '密码重置失败')
    }
  } catch (error) {
    console.error('密码重置失败:', error)
    ElMessage.error('密码重置失败，请重试')
  }
}
const changeStatus = async (row, val) => {
  if (row.Role === 'admin' || (row.RoleNames && row.RoleNames.includes('admin'))) {
    row.Status = 1;
    ElMessage.warning('超级管理员状态不可修改！')
    return;
  }
  const oldStatus = row.Status;
  row.Status = val;
  try {
    const res = await api.post('/auth/user-status', {
      username: row.Username,
      status: val
    });
    // api拦截器已返回response.data，所以直接判断res.success
    if (res && res.success) {
      ElMessage.success('状态已更新');
    } else {
      ElMessage.error(res?.message || '状态更新失败');
      row.Status = oldStatus;
    }
  } catch (e) {
    ElMessage.error('状态更新失败');
    row.Status = oldStatus;
  }
}

// 批量操作方法
const batchEnable = async () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要启用的用户')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${selectedUsers.value.length} 个用户吗？`,
      '批量启用确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
        appendTo: 'body',
        lockScroll: false
      }
    )
    
    const token = localStorage.getItem('token')
    const userIds = selectedUsers.value.map(user => user.ID)
    
    const res = await api.post('/auth/batch-status', {
      userIds,
      status: 1
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data && res.data.success) {
      ElMessage.success('批量启用成功')
      fetchUsers()
      selectedUsers.value = []
    } else {
      ElMessage.error(res.data.message || '批量启用失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量启用失败:', error)
      ElMessage.error('批量启用失败，请重试')
    }
  }
}

const batchDisable = async () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要禁用的用户')
    return
  }
  
  // 检查是否包含管理员
  const hasAdmin = selectedUsers.value.some(user => user.Role === 'admin' || (user.RoleNames && user.RoleNames.includes('admin')))
  if (hasAdmin) {
    ElMessage.warning('不能禁用管理员账户')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要禁用选中的 ${selectedUsers.value.length} 个用户吗？`,
      '批量禁用确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        appendTo: 'body',
        lockScroll: false
      }
    )
    
    const token = localStorage.getItem('token')
    const userIds = selectedUsers.value.map(user => user.ID)
    
    const res = await api.post('/auth/batch-status', {
      userIds,
      status: 0
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data && res.data.success) {
      ElMessage.success('批量禁用成功')
      fetchUsers()
      selectedUsers.value = []
    } else {
      ElMessage.error(res.data.message || '批量禁用失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量禁用失败:', error)
      ElMessage.error('批量禁用失败，请重试')
    }
  }
}

const batchDelete = async () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要删除的用户')
    return
  }
  
  // 检查是否包含管理员
  const hasAdmin = selectedUsers.value.some(user => user.Role === 'admin' || (user.RoleNames && user.RoleNames.includes('admin')))
  if (hasAdmin) {
    ElMessage.warning('不能删除管理员账户')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUsers.value.length} 个用户吗？此操作不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        appendTo: 'body',
        lockScroll: false
      }
    )
    
    const token = localStorage.getItem('token')
    const userIds = selectedUsers.value.map(user => user.ID)
    
    const res = await api.post('/auth/batch-delete', {
      userIds
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data && res.data.success) {
      ElMessage.success('批量删除成功')
      fetchUsers()
      selectedUsers.value = []
    } else {
      ElMessage.error(res.data.message || '批量删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败，请重试')
    }
  }
}

// 列设置相关方法
/**
 * 更新列可见性状态
 */
const updateColumnVisibility = () => {
  const visibleCount = columnSettings.value.filter(col => col.visible).length
  const totalCount = columnSettings.value.length
  
  selectAllColumns.value = visibleCount === totalCount
  isIndeterminate.value = visibleCount > 0 && visibleCount < totalCount
}

/**
 * 处理全选/取消全选
 */
const handleSelectAllColumns = (checked) => {
  columnSettings.value.forEach(column => {
    if (!column.fixed) { // 固定列不受全选影响
      column.visible = checked
    }
  })
  isIndeterminate.value = false
}

/**
 * 向上移动列
 */
const moveColumnUp = (index) => {
  if (index > 0) {
    const temp = columnSettings.value[index]
    columnSettings.value[index] = columnSettings.value[index - 1]
    columnSettings.value[index - 1] = temp
  }
}

/**
 * 向下移动列
 */
const moveColumnDown = (index) => {
  if (index < columnSettings.value.length - 1) {
    const temp = columnSettings.value[index]
    columnSettings.value[index] = columnSettings.value[index + 1]
    columnSettings.value[index + 1] = temp
  }
}

/**
 * 重置列设置为默认值
 */
const resetColumnSettings = () => {
  columnSettings.value = [
    { key: 'username', label: '用户名', visible: true, fixed: true },
    { key: 'realname', label: '真实姓名', visible: true, fixed: false },
    { key: 'department', label: '所属部门', visible: true, fixed: false },
    { key: 'role', label: '用户角色', visible: true, fixed: false },
    { key: 'status', label: '账户状态', visible: true, fixed: false },
    { key: 'contact', label: '联系方式', visible: true, fixed: false },
    { key: 'createtime', label: '创建时间', visible: false, fixed: false },
    { key: 'lastlogin', label: '最后登录', visible: false, fixed: false }
  ]
  updateColumnVisibility()
  ElMessage.success('已重置为默认设置')
}

/**
 * 应用列设置
 */
const applyColumnSettings = () => {
  // 保存设置到本地存储
  localStorage.setItem('userListColumnSettings', JSON.stringify(columnSettings.value))
  showColumnSettings.value = false
  ElMessage.success('列设置已应用')
}

/**
 * 从本地存储加载列设置
 */
const loadColumnSettings = () => {
  const saved = localStorage.getItem('userListColumnSettings')
  if (saved) {
    try {
      columnSettings.value = JSON.parse(saved)
    } catch (error) {
      console.error('加载列设置失败:', error)
    }
  }
  updateColumnVisibility()
}

/**
 * 检查列是否应该显示
 */
const isColumnVisible = (columnKey) => {
  const column = columnSettings.value.find(col => col.key === columnKey)
  return column ? column.visible : true
}

/**
 * 处理头像上传成功
 */
/**
 * 处理头像上传成功事件
 * @param {string} avatarData - base64格式的头像数据
 */
const handleAvatarUploadSuccess = (avatarData) => {
  // 更新当前编辑用户的头像数据
  if (addUserForm.value) {
    addUserForm.value.Avatar = avatarData
  }
  
  // 更新头像预览
  avatarPreviewUrl.value = avatarData
  avatarBase64.value = avatarData
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  
  try {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return '-'
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    return '-'
  }
}

// 生成用户ID标签的动态样式
const getUserIdTagStyle = (userId) => {
  if (!userId) return {}
  
  // 预定义的颜色组合
  const colorCombinations = [
    { bg: '#e3f2fd', color: '#1976d2' }, // 蓝色
    { bg: '#f3e5f5', color: '#7b1fa2' }, // 紫色
    { bg: '#e8f5e8', color: '#388e3c' }, // 绿色
    { bg: '#fff3e0', color: '#f57c00' }, // 橙色
    { bg: '#fce4ec', color: '#c2185b' }, // 粉色
    { bg: '#e0f2f1', color: '#00796b' }, // 青色
    { bg: '#f1f8e9', color: '#689f38' }, // 浅绿色
    { bg: '#fff8e1', color: '#fbc02d' }, // 黄色
    { bg: '#e8eaf6', color: '#3f51b5' }, // 靛蓝色
    { bg: '#efebe9', color: '#5d4037' }  // 棕色
  ]
  
  // 根据用户ID生成一个稳定的索引
  const index = userId % colorCombinations.length
  const colors = colorCombinations[index]
  
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    border: `1px solid ${colors.color}20`
  }
}


</script>

<style scoped>
/* 主容器样式 */
.user-management {
  padding: 16px;
  background: #f5f7fa;
  height: auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 页面头部样式 */
.page-header {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.title-section {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #303133;
}

.title-icon {
  font-size: 24px;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px;
  border-radius: 6px;
}

.page-description {
  margin: 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.header-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  min-width: 180px;
  position: relative;
  overflow: hidden;
}

.stat-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409eff, #67c23a);
  transition: all 0.3s ease;
}

.stat-item.total-users::before {
  background: linear-gradient(90deg, #409eff, #79bbff);
}

.stat-item.active-users::before {
  background: linear-gradient(90deg, #67c23a, #95d475);
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-item:hover::before {
  height: 6px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  margin-right: 16px;
  font-size: 24px;
  transition: all 0.3s ease;
}

.total-users .stat-icon {
  background: linear-gradient(135deg, #409eff, #79bbff);
  color: white;
}

.active-users .stat-icon {
  background: linear-gradient(135deg, #67c23a, #95d475);
  color: white;
}

.stat-item:hover .stat-icon {
  transform: scale(1.1);
}

.stat-content {
  flex: 1;
  text-align: left;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  font-weight: 600;
  margin-bottom: 2px;
}

.stat-desc {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
}

/* 工具栏样式 */
.toolbar-card {
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.toolbar-row {
  align-items: center;
}

/* 左侧操作区样式 */
.left-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 中间搜索区样式 */
.center-search {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.search-input {
  min-width: 200px;
  max-width: 280px;
}

.filter-select {
  min-width: 120px;
  max-width: 160px;
}

/* 右侧操作区样式 */
.right-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.primary-btn {
  background: #409eff;
  border: none;
  font-weight: 600;
  color: white;
}

.export-btn {
  background: #67c23a;
  border: none;
  color: white;
}

/* 表格样式 */
.table-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 减小卡片头部高度 */
.table-card :deep(.el-card__header) {
  padding: 12px 16px;
}

.table-card :deep(.el-card__body) {
  padding: 12px 16px 10px 16px;
}

/* 减小表格行高度 */
.table-card :deep(.el-table .el-table__cell) {
  padding: 8px 0;
}

.table-card :deep(.el-table__header th) {
  padding: 10px 0;
}

.table-container {
  overflow: auto;
  width: 100%;
}

/* 表格响应式优化 */
.modern-table {
  width: 100%;
  table-layout: auto;
}

.modern-table :deep(.el-table) {
  width: 100% !important;
}

/* 确保表格不会超出容器宽度 */
.modern-table :deep(.el-table__body-wrapper) {
  overflow-x: auto;
}

/* 移动端优化 */
@media (max-width: 1200px) {
  .table-container .modern-table :deep(.el-table .el-table__cell) {
    padding: 12px 8px;
  }
  
  .user-info {
    gap: 8px;
  }
  
  .user-avatar {
    width: 28px !important;
    height: 28px !important;
  }
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.count-tag {
  margin-left: 8px;
}

.table-tools {
  display: flex;
  gap: 8px;
}

.modern-table {
  border-radius: 0;
}

.index-number {
  font-weight: 600;
  color: #409eff;
}

/* 表格内容样式 */
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  border: 2px solid #f0f0f0;
  transition: all 0.3s ease;
}

.user-avatar:hover {
  border-color: #667eea;
  transform: scale(1.05);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.username {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
}

.user-id {
  font-size: 12px;
  color: #909399;
}

.user-id-container {
  margin-top: 2px;
}

.user-id-container .el-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
}

.user-id-container .el-icon {
  margin-right: 2px;
  font-size: 10px;
}

.real-name {
  font-weight: 500;
  color: #606266;
}

.department-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-weight: 500;
  max-width: 75px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0 auto;
}

.role-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  padding: 6px 12px;
  margin: 2px;
}

.role-tags-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4px;
  min-height: 32px;
}

.contact-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #606266;
  margin: 0 auto;
}

.last-login-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #606266;
  margin: 0 auto;
  font-size: 13px;
}

.last-login-info .el-icon {
  color: #909399;
}

.create-time-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #606266;
  margin: 0 auto;
  font-size: 13px;
}

.create-time-info .el-icon {
  color: #67c23a;
}

.no-data {
  color: #c0c4cc;
  font-style: italic;
  text-align: center;
  display: block;
  width: 100%;
}

.status-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.status-text {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: nowrap;
}

.action-buttons .el-button {
  margin: 0;
  transition: all 0.3s ease;
}

.action-buttons .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 分页样式 */
.pagination-wrapper {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.pagination-info {
  color: #909399;
  font-size: 14px;
}

.modern-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

/* 批量操作样式 */
.batch-actions {
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #fdf6ec;
}

.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e6a23c;
  font-weight: 500;
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

/* 对话框样式 */
:deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

:deep(.el-dialog__header) {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px 24px;
  border-top: 1px solid #f0f0f0;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dialog-header .header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-header .dialog-title {
    flex: 1;
    margin-left: 8px;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

.dialog-icon {
  font-size: 20px;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px;
  border-radius: 6px;
}

.dialog-title {
  color: #303133;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 表单样式 */
.user-form {
  background: transparent;
  padding: 0;
}

/* 表单分区样式 - 简洁版 */
.form-section {
  margin-bottom: 10px;
}

.form-section:last-child {
  margin-bottom: 0;
}

/* 分区标题样式 - 简洁版 */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #409eff;
}

.section-title .el-icon {
  font-size: 16px;
  color: #409eff;
}

.role-option,
.department-option {
  display: flex;
  align-items: center;
  gap: 8px;
}


/* 用户详情样式 */
.user-detail {
  padding: 0;
}

.user-detail .detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #67C23A;
  border-radius: 12px;
  margin-bottom: 24px;
  color: white;
}

.user-detail .user-basic h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
}

.user-detail .user-basic p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.user-detail-form {
  background: #fafafa;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
}

.user-detail-form .el-form-item {
  margin-bottom: 12px;
}

.user-detail-form .el-form-item__label {
  font-weight: 600;
  color: #606266;
}

.user-detail-form .el-input__wrapper {
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
}

.user-detail-form .el-input.is-disabled .el-input__wrapper {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #606266;
}

.user-detail-form .el-textarea.is-disabled .el-textarea__inner {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
  color: #606266;
}

.user-detail-form .el-tag {
  font-weight: 500;
  border-radius: 6px;
  padding: 4px 12px;
}

.user-detail-form .role-tag-detail {
  max-width: 100%;
  word-break: break-all;
  white-space: normal;
  line-height: 1.4;
  padding: 6px 12px;
  display: inline-block;
  margin-right: 8px;
  margin-bottom: 4px;
}

.role-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
/* 移除重复的样式定义，使用上面更好的样式 */

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 0;
  border-bottom: 1px solid #f5f7fa;
  font-size: 15px !important;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-button) {
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.3s ease;
  padding: 12px 20px;
}

:deep(.el-button:hover) {
  opacity: 0.8;
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

:deep(.el-input) {
  border-radius: 5px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.el-input) {
  border-radius: 6px;
}

:deep(.el-input__wrapper) {
  border-radius: 6px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-select) {
  border-radius: 6px;
}

:deep(.el-dialog) {
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

/* 新增用户对话框样式优化 */
.user-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.user-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
  color: white;
  padding: 20px 32px;
  border-bottom: none;
}

.user-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-dialog :deep(.el-dialog__body) {
  padding: 0.9375rem;
  background: white;
  max-height: 70vh;
  overflow-y: auto;
}

.user-dialog :deep(.el-dialog__footer) {
  padding: 20px 32px;
  background: white;
  border-top: 1px solid #e4e7ed;
}

:deep(.el-table) {
  border-radius: 0;
  border: none;
}

:deep(.el-table .el-table__cell) {
  padding: 16px 12px;
  border-bottom: 1px solid #f8f9fa;
  font-size: 15px !important;
}

.modern-table :deep(.el-table__header) {
  background: #F8F9FA !important;
}

.modern-table :deep(.el-table__header th) {
  background: #F8F9FA !important;
  color: #303133 !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.modern-table :deep(.el-table__header-wrapper) {
  background: #F8F9FA !important;
}

.table-container .modern-table :deep(.el-table__header .el-table__cell) {
  background: #F8F9FA !important;
  white-space: nowrap !important;
  padding: 12px 8px !important;
  text-align: center !important;
  vertical-align: middle !important;
  font-size: 16px !important;
}

.table-container .modern-table :deep(.el-table__header th .cell) {
  white-space: nowrap !important;
  font-size: 16px !important;
}

.table-container .modern-table :deep(.el-table__header .el-table__cell .cell) {
  white-space: nowrap !important;
  font-size: 16px !important;
}

.table-container .modern-table :deep(.el-table__body .el-table__cell) {
  vertical-align: middle !important;
  font-size: 15px !important;
}

.table-container .modern-table :deep(.el-table__body .el-table__row .el-table__cell) {
  vertical-align: middle !important;
  font-size: 15px !important;
}

.table-container .modern-table :deep(.el-table__body .el-table__row .el-table__cell .cell) {
  font-size: 15px !important;
}

.table-container .modern-table :deep(.el-table__body td.el-table__cell) {
  font-size: 15px !important;
}

.table-container .modern-table :deep(.el-table__body tr td) {
  font-size: 15px !important;
}

.table-container .modern-table :deep(.el-table__body tr td .cell) {
  font-size: 15px !important;
}

.table-container .modern-table :deep(.el-table) {
  font-size: 15px !important;
}

.table-container .modern-table :deep(.el-table *) {
  font-size: inherit !important;
}

/* 操作列单元格居中 */
.table-container .modern-table :deep(.el-table__body .el-table__row .el-table__cell:last-child) {
  text-align: center !important;
  vertical-align: middle !important;
}

/* 操作列内容居中 */
.table-container .modern-table :deep(.el-table__body .el-table__row .el-table__cell:last-child .cell) {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

:deep(.el-table__row:hover) {
  background: #f5f7fa;
}

:deep(.el-table .el-table__row.admin-row) {
  background: transparent;
}

:deep(.el-table .el-table__row.disabled-row) {
  background: #f5f7fa;
  opacity: 0.7;
}

:deep(.el-card) {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
}

:deep(.el-card__body) {
  padding: 24px;
}

.user-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.user-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  line-height: 1.5;
  text-align: right;
  vertical-align: middle;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 28px;
}

.user-form :deep(.el-input__wrapper) {
  border-radius: 5px;
  transition: all 0.3s ease;
  min-height: 28px;
}

.user-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 5px rgba(64, 158, 255, 0.1);
}

.user-form :deep(.el-select .el-input__wrapper) {
  border-radius: 5px;
  min-height: 28px;
}

.user-form :deep(.el-input) {
  height: 28px;
}

.user-form :deep(.el-select) {
  height: 28px;
}

.user-form :deep(.el-row) {
  margin-bottom: 4px;
}

.user-form :deep(.el-date-editor) {
  height: 28px;
}

.user-form :deep(.el-date-editor .el-input__wrapper) {
  min-height: 28px;
}

/* 对话框分割线样式 */
.user-dialog :deep(.el-divider) {
  margin: 0;
  border-color: #e4e7ed;
}

:deep(.el-tag) {
  border-radius: 20px;
  font-weight: 600;
  padding: 6px 16px;
  border: none;
}

:deep(.el-tag.el-tag--success) {
  background: #67c23a;
  color: white;
}

:deep(.el-tag.el-tag--warning) {
  background: #e6a23c;
  color: white;
}

:deep(.el-tag.el-tag--danger) {
  background: #f56c6c;
  color: white;
}

:deep(.el-tag.el-tag--info) {
  background: #909399;
  color: white;
}

:deep(.el-pagination) {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

/* 修复分页器每页数量选择框宽度 */
:deep(.el-pagination .el-pagination__sizes) {
  margin-right: 8px;
}

:deep(.el-pagination .el-pagination__sizes .el-select) {
  width: 100px;
}

:deep(.el-pagination .el-pagination__sizes .el-input) {
  width: 100px !important;
}

:deep(.el-pagination .el-pagination__sizes .el-input__wrapper) {
  min-width: 80px;
}

:deep(.el-pagination .btn-next),
:deep(.el-pagination .btn-prev) {
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

:deep(.el-pagination .btn-next:hover),
:deep(.el-pagination .btn-prev:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.el-pager li) {
  border-radius: 8px;
  margin: 0 4px;
  font-weight: 600;
  transition: all 0.3s ease;
}

:deep(.el-pager li:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.el-pager li.is-active) {
  background: #409eff;
  color: white;
}

:deep(.el-switch) {
  --el-switch-on-color: #67c23a;
  --el-switch-off-color: #dcdfe6;
}

:deep(.el-avatar) {
  border: 3px solid #f0f0f0;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.el-avatar:hover) {
  border-color: #667eea;
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

:deep(.el-descriptions) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-descriptions__header) {
  background: #f8f9fa;
}

:deep(.el-descriptions__body) {
  background: white;
}

:deep(.el-descriptions-item__label) {
  font-weight: 600;
  color: #495057;
}

:deep(.el-upload) {
  display: block;
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}



/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.action-buttons .el-button {
  margin: 0;
  min-width: auto;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.action-buttons .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-content {
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .user-management {
    padding: 16px;
  }
  
  .page-header {
    padding: 20px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-description {
    font-size: 14px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .search-section {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-group {
    flex-direction: column;
    gap: 12px;
  }
  
  .search-input,
  .filter-select {
    min-width: auto;
    width: 100%;
  }
  
  .search-actions {
    justify-content: center;
  }
  
  .action-section {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .table-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .table-tools {
    align-self: stretch;
    justify-content: center;
  }
  
  .modern-table {
    font-size: 15px;
  }
  
  .user-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  } 
}

/* 列设置对话框样式 */
.column-settings {
  padding: 10px 0;
}

.settings-header {
  margin-bottom: 20px;
}

.column-list {
  max-height: 400px;
  overflow-y: auto;
  position: relative;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 15px;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.column-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.column-item:hover {
  background: #f5f7fa;
  border-color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.column-control {
  flex: 1;
}

.column-actions {
  display: flex;
  gap: 8px;
}

.column-actions .el-button {
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 14px;
  font-weight: bold;
}

.column-actions .el-button:disabled {
  opacity: 0.3;
}

.user-avatar {
  align-self: center;
}

/* 操作按钮样式 - 大屏状态下不换行 */
.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  white-space: nowrap;
  justify-content: center;
  align-items: center;
}

.action-buttons .el-button {
  font-size: 12px;
  padding: 6px 10px;
  min-width: auto;
  margin: 0;
}

/* 小屏幕下的操作按钮样式 */
@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .action-buttons .el-button {
    font-size: 12px;
    padding: 8px 12px;
  }
}

.pagination-wrapper {
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.batch-toolbar {
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}

.batch-buttons {
  justify-content: center;
}

@media (max-width: 480px) {
  .user-management {
    padding: 12px;
  }
  
  .page-header {
    padding: 16px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .toolbar-card,
  .table-card {
    border-radius: 12px;
  }
  
  .modern-dialog {
    width: 95%;
    margin: 0 auto;
    border-radius: 10px;
  }
  
  .dialog-header {
    padding: 20px;
  }
  
  .dialog-title {
    font-size: 18px;
  }
  
  .dialog-body {
    padding: 30px;
  }
  
  .dialog-footer {
    padding: 16px 20px;
    flex-direction: column;
    gap: 8px;
  }
  
  .dialog-footer .el-button {
    width: 100%;
  }
  
  .user-form {
    padding: 16px;
  }
  
  .avatar {
    width: 100px;
    height: 100px;
  }
}

/* 打印样式 */
@media print {
  .toolbar-card,
  .pagination-wrapper,
  .batch-actions {
    display: none;
  }
  
  .table-card {
    box-shadow: none;
    border: 1px solid #ddd;
  }
  
  .action-buttons {
    display: none;
  }
  
  .modern-table {
    font-size: 12px;
  }
  
  .page-header {
    background: none;
    color: #000;
  }
}

/* ===================== 权限设置对话框样式 ===================== */
.permission-dialog {
  padding: 0;
}

.user-info-section {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.user-basic-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  background: #409EFF;
  border-radius: 12px;
  border: 1px solid #409EFF;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.user-details h3 {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
}

.user-details p {
  margin: 3px 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.user-dept {
  color: rgba(255, 255, 255, 0.8) !important;
  font-size: 13px !important;
}

.role-assignment-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.role-assignment-section h4 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  flex-shrink: 0;
}

.role-table-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.role-table-container :deep(.el-table) {
  border-radius: 8px;
}

.role-table-container :deep(.el-table__header-wrapper) {
  border-radius: 8px 8px 0 0;
}

.role-table-container :deep(.el-table th) {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
  padding: 8px 12px !important;
}

.role-table-container :deep(.el-table td) {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 12px !important;
}

.role-table-container :deep(.el-table__body tr:hover td) {
  background-color: #f5f7fa;
}

.section-desc {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: #606266;
  line-height: 1.6;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
  flex-shrink: 0;
}

.role-name-cell {
  display: flex;
  align-items: center;
}

.role-name-text {
  font-weight: 600;
  color: #303133;
}

/* 权限设置对话框标题样式 */
.permission-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.permission-icon {
  font-size: 20px;
  color: #409EFF;
}

.permission-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 对话框底部按钮样式 */
.dialog-footer {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 16px 0 !important;
  margin-top: auto !important;
  flex-shrink: 0 !important;
}

.dialog-footer .el-button {
  width: 150px !important;
  height: 40px !important;
}

/* 权限设置对话框样式 - 简化版本 */
.permission-dialog-wrapper :deep(.el-dialog) {
  display: flex;
  flex-direction: column;
}

.permission-dialog-wrapper :deep(.el-dialog__header) {
  flex-shrink: 0;
  padding: 20px 24px 16px;
}

.permission-dialog-wrapper :deep(.el-dialog__body) {
  flex: 1;
  overflow: hidden;
  padding: 16px 24px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.permission-dialog-wrapper :deep(.el-dialog__footer) {
  flex-shrink: 0;
  padding: 16px 24px 20px;
}

/* 响应式设计 */
@media (min-width: 1200px) {
  .permission-dialog-wrapper :deep(.el-dialog) {
    min-width: 600px;
    max-width: 90vw;
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .permission-dialog-wrapper :deep(.el-dialog) {
    min-width: 500px;
    max-width: 85vw;
  }
  
  .permission-dialog-wrapper :deep(.el-dialog__header) {
    padding: 18px 20px 14px;
  }
  
  .permission-dialog-wrapper :deep(.el-dialog__body) {
    padding: 14px 20px;
  }
  
  .permission-dialog-wrapper :deep(.el-dialog__footer) {
    padding: 14px 20px 18px;
  }
  
  .role-col {
    margin-bottom: 18px;
  }
  
  .role-item {
    padding: 14px 14px 14px 44px;
    min-height: 90px;
  }
  
  .dialog-footer .el-button {
    width: 140px !important;
    height: 38px !important;
  }
}

@media (max-width: 767px) {
  .permission-dialog-wrapper :deep(.el-dialog) {
    min-width: 320px;
    max-width: 95vw;
    margin: 0 auto !important;
  }
  
  .permission-dialog-wrapper :deep(.el-dialog__header) {
    padding: 16px 16px 12px !important;
  }
  
  .permission-dialog-wrapper :deep(.el-dialog__body) {
    padding: 12px 16px !important;
  }
  
  .permission-dialog-wrapper :deep(.el-dialog__footer) {
    padding: 12px 16px 16px !important;
  }
  
  .user-basic-info {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    padding: 16px 0;
  }
  
  .permission-dialog {
    padding: 0;
  }
  
  .role-table-container {
    overflow: auto;
  }
  
  .role-table-container :deep(.el-table) {
    font-size: 14px;
  }
}

/* 头像预览样式 */
.avatar-preview-section {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

/* 减小头像上传区域尺寸 */
.avatar-preview-section :deep(.upload) {
  width: 100px !important;
  height: 100px !important;
}

.avatar-preview-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
}

.avatar-placeholder .el-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-name-text {
  font-size: 15px;
}

.role-code {
  font-size: 12px;
}

.section-desc {
  font-size: 14px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

.dialog-footer .el-button {
  width: 120px !important;
  height: 36px !important;
  font-size: 14px !important;
}

</style>