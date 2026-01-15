<template>
  <div class="app-container">
    <el-container class="h-full">
      <el-aside width="240px" class="seal-tree-aside">
        <div class="tree-header">
          <span>印章分类</span>
        </div>
        <el-input
          v-model="filterText"
          placeholder="输入部门名称过滤"
          prefix-icon="Search"
          class="mb-2"
        />
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="defaultProps"
          :filter-node-method="filterNode"
          default-expand-all
          highlight-current
          node-key="id"
          @node-click="handleNodeClick"
          :current-node-key="activeNodeId"
        >
          <template #default="{ node, data }">
            <span class="custom-tree-node">
              <span>{{ data.labelText || data.label }}</span>
              <span 
                v-if="data.count !== undefined" 
                class="tree-count"
                :class="{ 'tree-count-primary': data.type === 'all' }"
              >({{ data.count }})</span>
            </span>
          </template>
        </el-tree>
      </el-aside>
      
      <el-main>
        <div class="mb-4 pl-5" style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
          <el-button
            type="primary"
            icon="Plus"
            v-hasPermi="['system:seal:add']"
            @click="handleAdd"
          >新增印章</el-button>
          <el-button
            type="danger"
            icon="Delete"
            :disabled="selectedRows.length === 0"
            v-hasPermi="['system:seal:delete']"
            @click="handleBatchDelete"
          >批量删除</el-button>
          <el-button
            type="success"
            icon="Check"
            :disabled="selectedRows.length === 0"
            v-hasPermi="['system:seal:edit']"
            @click="handleBatchEnable"
          >批量启用</el-button>
          <el-button
            type="warning"
            icon="Close"
            :disabled="selectedRows.length === 0"
            v-hasPermi="['system:seal:edit']"
            @click="handleBatchDisable"
          >批量禁用</el-button>
          <span v-if="selectedRows.length > 0" class="selected-info">
            已选择 {{ selectedRows.length }} 项
          </span>
        </div>

        <el-table 
          ref="tableRef"
          :data="paginatedSeals" 
          border 
          style="width: 100%" 
          v-loading="loading"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column label="印章图片" width="100" align="center">
            <template #default="scope">
              <el-image 
                style="width: 60px; height: 60px" 
                :src="scope.row.ImageUrl" 
                :preview-src-list="[scope.row.ImageUrl]" 
                fit="contain"
                preview-teleported
              />
            </template>
          </el-table-column>
          <el-table-column prop="SealName" label="印章名称" min-width="110" align="center" />
          <el-table-column prop="SealType" label="类型" width="80" align="center">
            <template #default="scope">
              <el-tag :type="scope.row.SealType === 'special' ? 'warning' : 'success'" size="small">
                {{ scope.row.SealType === 'special' ? '专用章' : '部门章' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="DepartmentName" label="所属部门" width="100" align="center">
             <template #default="scope">
                {{ scope.row.DepartmentName || '-' }}
             </template>
          </el-table-column>
          <el-table-column prop="Description" label="备注" min-width="120" align="center" show-overflow-tooltip />
          <el-table-column prop="IsActive" label="状态" width="70" align="center">
            <template #default="scope">
              <el-tag :type="scope.row.IsActive ? 'success' : 'info'" size="small">
                {{ scope.row.IsActive ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="IsDefault" label="默认" width="70" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.IsDefault" type="warning" effect="dark" size="small">
                <el-icon style="vertical-align: middle;"><Star /></el-icon>
                默认
              </el-tag>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="CreatorName" label="创建人" width="80" align="center" />
          <el-table-column prop="CreatedAt" label="创建时间" width="150" align="center">
            <template #default="scope">
              {{ formatDate(scope.row.CreatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="185" align="center">
            <template #default="scope">
              <div style="display: flex; justify-content: center; gap: 0; white-space: nowrap;">
                <el-button
                  link
                  type="warning"
                  icon="Star"
                  size="small"
                  v-hasPermi="['system:seal:setDefault']"
                  :disabled="scope.row.IsDefault"
                  @click="handleSetDefault(scope.row)"
                >{{ scope.row.IsDefault ? '已默认' : '设默认' }}</el-button>
                <el-button
                  link
                  type="primary"
                  icon="Edit"
                  size="small"
                  v-hasPermi="['system:seal:edit']"
                  @click="handleEdit(scope.row)"
                >编辑</el-button>
                <el-button
                  link
                  type="danger"
                  icon="Delete"
                  size="small"
                  v-hasPermi="['system:seal:delete']"
                  @click="handleDelete(scope.row)"
                >删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页器放在表格下方 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-main>
    </el-container>

    <!-- 添加/修改对话框 -->
    <el-dialog :title="title" v-model="open" width="550px" append-to-body @close="handleDialogClose">
      <el-form ref="sealRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="印章类型" prop="SealType">
          <el-radio-group v-model="form.SealType" :disabled="isEdit">
            <el-radio label="department">部门章</el-radio>
            <el-radio label="special">专用章</el-radio>
          </el-radio-group>
          <span v-if="isEdit" class="edit-type-tip">（编辑时不可更改类型）</span>
        </el-form-item>

        <el-form-item label="印章名称" prop="SealName">
          <el-input v-model="form.SealName" placeholder="请输入印章名称" />
        </el-form-item>
        
        <el-form-item v-if="form.SealType === 'department'" label="所属部门" prop="DepartmentID">
          <el-tree-select
            v-model="form.DepartmentID"
            :data="deptOptions"
            :render-after-expand="false"
            placeholder="请选择或输入搜索部门"
            check-strictly
            filterable
            :filter-node-method="filterDeptNode"
            @change="handleDeptChange"
          />
        </el-form-item>
        
        <el-form-item label="印章图片" prop="ImageUrl">
          <div class="seal-upload-container">
            <el-upload
              ref="uploadRef"
              class="seal-uploader square-uploader"
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleFileChange"
              drag
              accept="image/png,image/jpeg,image/jpg"
            >
              <!-- 已有图片预览 -->
              <div v-if="previewUrl" class="image-preview-wrapper">
                <img 
                  :src="previewUrl" 
                  class="seal-image" 
                  :style="{ transform: `rotate(${imageRotation}deg)` }"
                  alt="印章图片" 
                />
                <div class="image-hover-mask">
                  <div class="mask-actions">
                    <el-button type="primary" link @click.stop="handlePreviewImage">
                      <el-icon><ZoomIn /></el-icon>
                    </el-button>
                    <el-button type="primary" link @click.stop="handleRotateImage(-90)">
                      <el-icon><RefreshLeft /></el-icon>
                    </el-button>
                    <el-button type="primary" link @click.stop="handleRotateImage(90)">
                      <el-icon><RefreshRight /></el-icon>
                    </el-button>
                    <el-button type="danger" link @click.stop="handleRemoveImage">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
              
              <!-- 默认上传占位 -->
              <div v-else class="upload-placeholder">
                <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                <div class="el-upload__text">
                  将文件拖到此处，或<em>点击上传</em>
                </div>
                <div class="el-upload__tip">
                  支持 PNG/JPG 格式，不超过 2MB<br>
                  也可以使用 <strong>Ctrl+V</strong> 粘贴图片
                </div>
              </div>
            </el-upload>
            <!-- 旋转提示 -->
            <div v-if="previewUrl && imageRotation !== 0" class="rotation-tip">
              已旋转 {{ imageRotation }}°，保存时将应用旋转
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="备注" prop="Description">
          <el-input v-model="form.Description" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm" :loading="submitLoading">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 隐藏的el-image用于预览 -->
    <el-image
      ref="imagePreviewRef"
      style="display: none;"
      :src="previewUrl"
      :preview-src-list="[previewUrl]"
      :initial-index="0"
      fit="contain"
      preview-teleported
    />
  </div>
</template>

<script setup>
import { ref, reactive, toRefs, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, UploadFilled, ZoomIn, Delete, RefreshLeft, RefreshRight, Star } from '@element-plus/icons-vue';
import api from '@/services/api';

// 简单实现 getToken
const getToken = () => localStorage.getItem('token');

const loading = ref(true);
const sealList = ref([]);
const deptOptions = ref([]);
const open = ref(false);
const title = ref('');

// 表格选择
const tableRef = ref(null);
const selectedRows = ref([]);

// 获取适配的图片URL（与其他模块保持一致）
const getAdaptedImageUrl = (imagePath, preventCache = false) => {
  if (!imagePath) return '';
  
  // 如果已经是完整的HTTP URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // 如果是data URL或blob URL，直接返回
  if (imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath;
  }
  
  // 根据当前页面的hostname判断环境
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // 处理路径：将 /uploads/seals/ 转换为 /files/seals/
  let cleanPath = imagePath;
  if (cleanPath.startsWith('/uploads/seals/')) {
    cleanPath = cleanPath.replace('/uploads/seals/', '/files/seals/');
  } else if (!cleanPath.startsWith('/files/')) {
    // 如果路径不是以 /files/ 开头，添加前缀
    cleanPath = `/files/seals/${cleanPath.replace(/^\/+/, '')}`;
  }
  
  // 构建图片URL
  let url;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 开发环境：使用Vite代理
    url = cleanPath;
  } else {
    // 生产环境：使用Nginx文件服务器
    url = `${protocol}//${hostname}:8080${cleanPath}`;
  }
  
  // 只在需要防止缓存时添加时间戳参数
  if (preventCache) {
    const timestamp = Date.now();
    url += `?t=${timestamp}`;
  }
  
  return url;
};

// 上传相关状态
const uploadRef = ref(null);
const pendingFile = ref(null);  // 待上传的文件
const previewUrl = ref('');     // 本地预览URL
const submitLoading = ref(false);
const imageRotation = ref(0);   // 图片旋转角度

// 图片预览
const imagePreviewRef = ref(null);

const treeRef = ref(null);
const filterText = ref('');
const activeNodeId = ref('all'); // 默认选中全部印章
const currentNode = ref({ id: 'special', type: 'special' }); // 当前选中的节点信息

// 是否为编辑模式
const isEdit = computed(() => form.value.ID !== undefined);

// 分页数据
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

// 树形数据
const treeData = ref([]);
const defaultProps = {
  children: 'children',
  label: 'label'
};

const data = reactive({
  form: {},
  rules: {
    SealName: [{ required: true, message: "印章名称不能为空", trigger: "blur" }],
    SealType: [{ required: true, message: "请选择印章类型", trigger: "change" }],
    DepartmentID: [{ required: true, message: "归属部门不能为空", trigger: "change" }],
    ImageUrl: [{ required: true, message: "请上传印章图片", trigger: "blur" }]
  }
});

const { form, rules } = toRefs(data);
const sealRef = ref(null);

// 过滤后的印章列表（不带分页）
const allFilteredSeals = computed(() => {
  if (!currentNode.value) return sealList.value;
  
  const { id, type, data } = currentNode.value;
  
  // 如果选中的是具体的印章节点，则只显示该印章
  if (type === 'seal_item') {
    // 从sealList中找到对应的印章（确保数据最新）
    const seal = sealList.value.find(s => s.ID === id);
    return seal ? [seal] : [];
  }
  
  // 全部印章
  if (type === 'all') {
    return sealList.value;
  }
  
  if (type === 'special') {
    return sealList.value.filter(item => item.SealType === 'special');
  } else if (type === 'dept_root') {
     // 选中"部门章"根节点，显示所有部门章
    return sealList.value.filter(item => item.SealType === 'department');
  }
  
  return sealList.value;
});

// 计算total
const computedTotal = computed(() => allFilteredSeals.value.length);

// 分页后的印章列表
const paginatedSeals = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return allFilteredSeals.value.slice(start, end);
});

// 监听过滤结果变化，更新total并重置页码
watch(allFilteredSeals, (newVal) => {
  total.value = newVal.length;
  // 如果当前页超出范围，重置到第一页
  if (currentPage.value > Math.ceil(newVal.length / pageSize.value) && newVal.length > 0) {
    currentPage.value = 1;
  }
}, { immediate: true });

watch(filterText, (val) => {
  treeRef.value.filter(val);
});

onMounted(() => {
  loadData();
});

// 加载所有数据
async function loadData() {
  await getList();
  await getDeptTree();
}

// 获取印章列表
function getList() {
  return new Promise((resolve) => {
    loading.value = true;
    // 管理页面需要显示所有印章（包括禁用的）
    api.get('/electronic-seals', { params: { includeInactive: 'true' } }).then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      sealList.value = data.map(item => {
        return {
          ...item,
          ImageUrl: getAdaptedImageUrl(item.ImageUrl)
        };
      });
      loading.value = false;
      resolve();
    }).catch((err) => {
      console.error('获取印章列表失败:', err);
      loading.value = false;
      resolve();
    });
  });
}

// 获取部门树并构建印章树
function getDeptTree() {
  return new Promise((resolve) => {
    api.get('/departments').then(res => {
      // 兼容不同的返回格式
      let data = [];
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
          data = res.data.data;
      } else if (Array.isArray(res.data)) {
          data = res.data;
      }
      
      // 标准化字段名：兼容 Name/DepartmentName 和 ParentID
      const normalizedData = data.map(dept => ({
        ...dept,
        DepartmentName: dept.DepartmentName || dept.Name || '',
        ParentID: dept.ParentID ?? null
      }));
      
      // 检查是否有层级结构（是否有ParentID字段且有非null值）
      const hasHierarchy = normalizedData.some(d => d.ParentID !== null && d.ParentID !== undefined);
      
      let deptTree;
      if (hasHierarchy) {
        deptTree = handleTree(normalizedData, "ID", "ParentID");
      } else {
        // 没有层级结构，直接作为平铺列表
        deptTree = normalizedData;
      }
      
      // 保存完整的部门树（用于buildSealTree）
      const fullDeptTree = convertDeptTreeFormat(deptTree);
      
      // 为下拉选择框提取二级部门（跳过一级公司）
      let secondLevelDepts = [];
      fullDeptTree.forEach(topLevel => {
        if (topLevel.children && topLevel.children.length > 0) {
          // 有子节点，说明是公司级别，取其子节点（部门及其下级）
          secondLevelDepts = secondLevelDepts.concat(topLevel.children);
        } else {
          // 没有子节点，本身就是部门级别
          secondLevelDepts.push(topLevel);
        }
      });
      
      // deptOptions 只包含二级部门（用于下拉选择和侧边栏）
      deptOptions.value = secondLevelDepts;
      
      // 构建印章树
      buildSealTree();
      resolve();
    }).catch((err) => {
      console.error('获取部门树失败:', err);
      resolve();
    });
  });
}

// 转换部门树格式，添加label和value字段供el-tree-select使用
function convertDeptTreeFormat(depts) {
  if (!depts || !Array.isArray(depts)) return [];
  
  return depts.map(dept => ({
    ...dept,
    label: dept.DepartmentName || dept.Name || String(dept.ID),
    value: dept.ID,
    children: dept.children && dept.children.length > 0 
      ? convertDeptTreeFormat(dept.children) 
      : undefined
  }));
}

// 构建印章分类树
function buildSealTree() {
  // 专用章列表
  const specialSeals = sealList.value
      .filter(seal => seal.SealType === 'special')
      .map(seal => ({
          id: seal.ID,
          label: seal.SealName,
          labelText: seal.SealName,
          type: 'seal_item',
          data: seal
      }));
  
  // 部门章列表（不按部门分组，直接列出所有部门章）
  const departmentSeals = sealList.value
      .filter(seal => seal.SealType === 'department')
      .map(seal => ({
          id: seal.ID,
          label: seal.SealName,
          labelText: seal.SealName,
          type: 'seal_item',
          data: seal
      }));

  treeData.value = [
    {
      id: 'all',
      label: '全部印章',
      labelText: '全部印章',
      count: sealList.value.length,
      type: 'all',
      children: [
        {
          id: 'special',
          label: '专用章',
          labelText: '专用章',
          count: specialSeals.length,
          type: 'special',
          children: specialSeals
        },
        {
          id: 'dept_root',
          label: '部门章',
          labelText: '部门章',
          count: departmentSeals.length,
          type: 'dept_root',
          children: departmentSeals
        }
      ]
    }
  ];
  
  // 默认展开并选中全部印章
  nextTick(() => {
      if (treeRef.value) {
          treeRef.value.setCurrentKey('all');
      }
  });
}

// Tree structure helper
function handleTree(data, id, parentId, children, rootId) {
  id = id || 'id'
  parentId = parentId || 'parentId'
  children = children || 'children'
  rootId = rootId || 0
  const cloneData = JSON.parse(JSON.stringify(data))
  const treeData =  cloneData.filter(father => {
    let branchArr = cloneData.filter(child => {
      return father[id] === child[parentId]
    });
    if (branchArr.length > 0) {
      father[children] = branchArr;
    }
    return father[parentId] === rootId;
  });
  return treeData.length > 0 ? treeData : data;
}

function filterNode(value, data) {
  if (!value) return true;
  return data.label.includes(value);
}

function handleNodeClick(nodeData) {
  currentNode.value = { 
    id: nodeData.id, 
    type: nodeData.type,
    data: nodeData.data  // 保存印章数据（对于seal_item类型）
  };
  activeNodeId.value = nodeData.id;
}

function cancel() {
  open.value = false;
  reset();
}

function reset() {
  form.value = {
    ID: undefined,
    SealName: undefined,
    SealType: 'department', // 默认值
    DepartmentID: undefined,
    DepartmentName: undefined,
    ImageUrl: undefined,
    Description: undefined
  };
  // 清理预览状态
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';
  pendingFile.value = null;
  imageRotation.value = 0; // 重置旋转角度
}

function handleAdd() {
  reset();
  // 根据当前选中节点预设类型和部门
  if (currentNode.value.type === 'special') {
      form.value.SealType = 'special';
  } else if (currentNode.value.type === 'department') {
      form.value.SealType = 'department';
      form.value.DepartmentID = currentNode.value.id;
      // 触发部门名称填充
      handleDeptChange(currentNode.value.id);
  } else {
      form.value.SealType = 'department';
  }
  
  open.value = true;
  title.value = "新增印章";
}

function handleEdit(row) {
  reset();
  // 复制行数据到表单
  form.value = { ...row };
  
  // 编辑时设置预览URL为已有图片
  if (row.ImageUrl) {
    previewUrl.value = row.ImageUrl;
  }
  
  // 确保DepartmentID是数字类型（el-tree-select的value是数字）
  if (form.value.DepartmentID) {
    form.value.DepartmentID = Number(form.value.DepartmentID);
  }
  
  open.value = true;
  title.value = "修改印章";
}

function handleDelete(row) {
  ElMessageBox.confirm('是否确认删除印章"' + row.SealName + '"的数据项?', "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(function() {
    return api.delete('/electronic-seals/' + row.ID);
  }).then(async () => {
    await getList();
    buildSealTree(); // 重建侧边栏树
    ElMessage.success("删除成功");
  }).catch(() => {});
}

// 设为默认印章
function handleSetDefault(row) {
  ElMessageBox.confirm(
    `是否确认将"${row.SealName}"设为默认印章？`,
    '设置默认印章',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      await api.put(`/electronic-seals/${row.ID}/set-default`);
      ElMessage.success(`已将"${row.SealName}"设为默认印章`);
      await getList();
      buildSealTree();
    } catch (error) {
      console.error('设置默认印章失败:', error);
      ElMessage.error('设置默认印章失败');
    }
  }).catch(() => {});
}

// 表格选择变化
function handleSelectionChange(selection) {
  selectedRows.value = selection;
}

// 批量删除
function handleBatchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的印章');
    return;
  }
  
  const names = selectedRows.value.map(r => r.SealName).join('、');
  ElMessageBox.confirm(`是否确认删除印章"${names}"？共 ${selectedRows.value.length} 项`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    const ids = selectedRows.value.map(r => r.ID);
    await api.post('/electronic-seals/batch-delete', { ids });
    ElMessage.success(`成功删除 ${ids.length} 项`);
    selectedRows.value = [];
    await getList();
    buildSealTree(); // 重建侧边栏树
  }).catch(() => {});
}

// 批量启用
function handleBatchEnable() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要启用的印章');
    return;
  }
  
  ElMessageBox.confirm(`是否确认启用选中的 ${selectedRows.value.length} 个印章？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  }).then(async () => {
    const ids = selectedRows.value.map(r => r.ID);
    await api.post('/electronic-seals/batch-status', { ids, isActive: true });
    ElMessage.success(`成功启用 ${ids.length} 项`);
    selectedRows.value = [];
    await getList();
    buildSealTree(); // 重建侧边栏树
  }).catch(() => {});
}

// 批量禁用
function handleBatchDisable() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要禁用的印章');
    return;
  }
  
  ElMessageBox.confirm(`是否确认禁用选中的 ${selectedRows.value.length} 个印章？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    const ids = selectedRows.value.map(r => r.ID);
    await api.post('/electronic-seals/batch-status', { ids, isActive: false });
    ElMessage.success(`成功禁用 ${ids.length} 项`);
    selectedRows.value = [];
    await getList();
    buildSealTree(); // 重建侧边栏树
  }).catch(() => {});
}

// 文件选择变化（本地预览）
function handleFileChange(uploadFile) {
  const file = uploadFile.raw;
  if (!file) return;
  
  // 校验文件
  const isImg = file.type === 'image/jpeg' || file.type === 'image/png';
  const isLt2M = file.size / 1024 / 1024 < 2;
  
  if (!isImg) {
    ElMessage.error('只能上传 JPG/PNG 格式的图片!');
    return;
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!');
    return;
  }
  
  // 保存待上传文件
  pendingFile.value = file;
  
  // 创建本地预览URL
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = URL.createObjectURL(file);
  
  // 标记有新图片（用于表单验证）
  form.value.ImageUrl = 'pending';
}

// 预览图片
function handlePreviewImage() {
  if (previewUrl.value && imagePreviewRef.value) {
    // 触发 el-image 的预览
    imagePreviewRef.value.$el.querySelector('img')?.click();
  }
}

// 删除图片
function handleRemoveImage() {
  ElMessageBox.confirm('确定要删除此图片吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 清理本地预览
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = '';
    pendingFile.value = null;
    form.value.ImageUrl = '';
    imageRotation.value = 0;
    ElMessage.success('已删除');
  }).catch(() => {});
}

// 旋转图片
function handleRotateImage(angle) {
  imageRotation.value = (imageRotation.value + angle + 360) % 360;
}

// 应用旋转并生成新图片
async function applyRotation(imageSource) {
  if (imageRotation.value === 0) {
    return null; // 无需旋转
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 计算旋转后的尺寸
      const radians = (imageRotation.value * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      
      // 90度或270度旋转时，宽高互换
      if (imageRotation.value === 90 || imageRotation.value === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      // 移动到画布中心，旋转，然后绘制
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // 转为 Blob
      canvas.toBlob((blob) => {
        if (blob) {
          const rotatedFile = new File([blob], 'rotated-seal.png', { type: 'image/png' });
          resolve(rotatedFile);
        } else {
          reject(new Error('旋转图片失败'));
        }
      }, 'image/png', 0.95);
    };
    
    img.onerror = () => {
      reject(new Error('加载图片失败'));
    };
    
    img.src = imageSource;
  });
}

// 对话框关闭时清理
function handleDialogClose() {
  // 清理本地预览URL
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';
  pendingFile.value = null;
  imageRotation.value = 0;
}

// 粘贴处理（本地预览）
function handlePaste(event) {
  if (!open.value) return; // 只在对话框打开时处理
  
  const items = event.clipboardData?.items;
  if (!items) return;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        // 校验文件
        const isImg = file.type === 'image/jpeg' || file.type === 'image/png';
        const isLt2M = file.size / 1024 / 1024 < 2;
        
        if (!isImg) {
          ElMessage.error('只能粘贴 JPG/PNG 格式的图片!');
          return;
        }
        if (!isLt2M) {
          ElMessage.error('粘贴的图片大小不能超过 2MB!');
          return;
        }
        
        // 保存待上传文件并本地预览
        pendingFile.value = file;
        if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl.value);
        }
        previewUrl.value = URL.createObjectURL(file);
        form.value.ImageUrl = 'pending';
        ElMessage.success('已粘贴图片');
      }
      break;
    }
  }
}

// 注册/注销粘贴事件
onMounted(() => {
  document.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste);
});

// 部门树过滤方法
function filterDeptNode(value, data) {
  if (!value) return true;
  return data.label?.toLowerCase().includes(value.toLowerCase());
}

function handleDeptChange(val) {
  const findDept = (list, id) => {
    for (const item of list) {
        if (item.value === id) return item;
        if (item.children) {
            const res = findDept(item.children, id);
            if (res) return res;
        }
    }
    return null;
  }
  const dept = findDept(deptOptions.value, val);
  if (dept) form.value.DepartmentName = dept.label || dept.DepartmentName;
}

// 上传图片到服务器
async function uploadImageToServer(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/electronic-seals/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  if (response.data?.url) {
    return response.data.url;
  }
  throw new Error('上传失败：未返回图片地址');
}

// 提交表单
async function submitForm() {
  try {
    const valid = await sealRef.value.validate();
    if (!valid) return;
    
    submitLoading.value = true;
    let submitData = { ...form.value };
    
    // 处理图片上传（包含旋转）
    if (pendingFile.value) {
      // 有新上传的图片
      try {
        let fileToUpload = pendingFile.value;
        
        // 如果有旋转，应用旋转
        if (imageRotation.value !== 0) {
          const rotatedFile = await applyRotation(previewUrl.value);
          if (rotatedFile) {
            fileToUpload = rotatedFile;
          }
        }
        
        const imageUrl = await uploadImageToServer(fileToUpload);
        submitData.ImageUrl = imageUrl;
      } catch (uploadErr) {
        ElMessage.error('图片上传失败：' + (uploadErr.message || '未知错误'));
        submitLoading.value = false;
        return;
      }
    } else if (submitData.ImageUrl === 'pending') {
      // 标记为pending但没有文件，说明有问题
      ElMessage.error('请选择印章图片');
      submitLoading.value = false;
      return;
    } else if (imageRotation.value !== 0 && previewUrl.value) {
      // 编辑时只旋转了图片，没有选择新图片
      try {
        const rotatedFile = await applyRotation(previewUrl.value);
        if (rotatedFile) {
          const imageUrl = await uploadImageToServer(rotatedFile);
          submitData.ImageUrl = imageUrl;
        }
      } catch (rotateErr) {
        ElMessage.error('旋转图片失败：' + (rotateErr.message || '未知错误'));
        submitLoading.value = false;
        return;
      }
    } else if (submitData.ImageUrl && submitData.ImageUrl.startsWith('http')) {
      // 编辑时，已有的图片URL转换为相对路径
      const urlObj = new URL(submitData.ImageUrl);
      submitData.ImageUrl = urlObj.pathname;
    }
    
    // 提交数据
    const request = form.value.ID != undefined
      ? api.put('/electronic-seals/' + form.value.ID, submitData)
      : api.post('/electronic-seals', submitData);
    
    await request;
    ElMessage.success(form.value.ID != undefined ? "修改成功" : "新增成功");
    open.value = false;
    
    // 重置旋转角度
    imageRotation.value = 0;
    
    // 刷新数据：先获取印章列表，再重建树
    await getList();
    buildSealTree();
    
  } catch (err) {
    console.error('提交失败:', err);
    ElMessage.error('操作失败：' + (err.message || '未知错误'));
  } finally {
    submitLoading.value = false;
  }
}

function handleSizeChange(val) {
  pageSize.value = val;
  currentPage.value = 1;
}

function handleCurrentChange(val) {
  currentPage.value = val;
}

function formatDate(cellValue) {
  if (!cellValue) return ''
  return new Date(cellValue).toLocaleString()
}
</script>

<style scoped>
.app-container {
    height: 100%; /* 跟随父容器高度 */
    display: flex;
    flex-direction: column;
    padding: 20px 0;
    box-sizing: border-box;
    overflow: hidden;
}

.h-full {
    flex: 1; /* 自动填充剩余空间 */
    overflow: hidden;
    background: #fff;
    /* border: 1px solid #dcdfe6; */
    /* border-radius: 4px; */
}

.seal-tree-aside {
    background: #fff;
    border-right: 1px solid #dcdfe6;
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    box-sizing: border-box; /* 确保 padding 不会撑大容器 */
}

.tree-header {
    margin-bottom: 15px;
    font-size: 16px;
    font-weight: bold;
    color: #303133;
    flex-shrink: 0;
}

.el-input {
    flex-shrink: 0;
}

/* 让树形控件自适应高度并可滚动 */
:deep(.el-tree) {
    flex: 1;
    overflow-y: auto;
    margin-top: 10px;
    min-height: 0; /* 关键：防止 flex 子元素溢出 */
}

.el-main {
    height: 100%;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
}

/* 印章上传容器 */
.seal-upload-container {
  width: 200px; /* 固定宽度 */
}

.seal-uploader {
  width: 200px;
}

.seal-uploader :deep(.el-upload) {
  width: 200px;
}

.seal-uploader :deep(.el-upload-dragger) {
  width: 200px;
  height: 200px; /* 正方形 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  background-color: #fafafa;
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.seal-uploader :deep(.el-upload-dragger:hover) {
  border-color: #409EFF;
  background-color: #f0f7ff;
}

.seal-uploader :deep(.el-upload-dragger.is-dragover) {
  border-color: #409EFF;
  background-color: #ecf5ff;
}

/* 上传占位符 */
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
  width: 100%;
  height: 100%;
  padding: 15px;
  box-sizing: border-box;
}

.upload-placeholder .el-icon--upload {
  font-size: 40px;
  color: #c0c4cc;
  margin-bottom: 8px;
}

.upload-placeholder .is-loading {
  font-size: 32px;
  color: #409EFF;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-placeholder .el-upload__text {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.upload-placeholder .el-upload__text em {
  color: #409EFF;
  font-style: normal;
}

.upload-placeholder .el-upload__tip {
  font-size: 11px;
  color: #909399;
  line-height: 1.5;
  text-align: center;
}

/* 图片预览容器 */
.image-preview-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
}

.seal-image {
  max-width: 180px;
  max-height: 180px;
  object-fit: contain;
  border-radius: 4px;
}

/* 悬停遮罩 */
.image-hover-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 6px;
}

.image-preview-wrapper:hover .image-hover-mask {
  opacity: 1;
}

.mask-actions {
  display: flex;
  gap: 8px;
}

.mask-actions .el-button {
  color: #fff !important;
  font-size: 16px;
  padding: 4px;
}

.mask-actions .el-button:hover {
  opacity: 0.8;
}

.mask-actions .el-icon {
  margin-right: 0;
}

/* 分页容器 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 编辑时类型提示 */
.edit-type-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}

/* 旋转提示 */
.rotation-tip {
  font-size: 12px;
  color: #E6A23C;
  margin-top: 8px;
  text-align: center;
}

/* 图片旋转过渡效果 */
.seal-image {
  transition: transform 0.3s ease;
}

/* 已选择信息 */
.selected-info {
  color: #409eff;
  font-size: 13px;
  margin-left: 10px;
}

/* 表头强制一行显示 */
:deep(.el-table__header) th .cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 操作按钮间距调整 */
:deep(.el-table__body) .el-button.is-link + .el-button.is-link {
  margin-left: 0;
}

:deep(.el-table__body) .el-button.is-link {
  padding: 4px 6px;
}

/* 树节点自定义样式 */
.custom-tree-node {
  display: flex;
  align-items: center;
  flex: 1;
}

.tree-count {
  margin-left: 4px;
  color: #f56c6c;
  font-size: 13px;
  font-weight: 500;
}

.tree-count-primary {
  color: #f56c6c;
  font-weight: 600;
}

:deep(.el-tree-node__content) {
  height: 32px;
}

/* 表格隔行变色 */
:deep(.el-table__body tr:nth-child(even)) {
  background-color: #fafafa;
}

:deep(.el-table__body tr:hover > td) {
  background-color: #ecf5ff !important;
}

/* 表头背景色 */
:deep(.el-table__header-wrapper th) {
  background-color: #f5f7fa !important;
}

:deep(.el-table__header-wrapper th .cell) {
  color: #303133;
  font-weight: 600;
}
</style>
