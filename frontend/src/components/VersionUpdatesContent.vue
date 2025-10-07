<template>
  <!-- 页面容器 -->
  <div class="page-container">
    <!-- 统计概览区域 -->
    <div class="stats-overview" v-if="versionStats">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon-wrapper primary">
                <el-icon class="stat-icon"><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ versionStats.totalVersions || 0 }}</div>
                <div class="stat-label">总版本数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon-wrapper success">
                <el-icon class="stat-icon"><Plus /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ versionStats.totalFeatures || 0 }}</div>
                <div class="stat-label">新功能</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon-wrapper warning">
                <el-icon class="stat-icon"><Tools /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ versionStats.totalFixes || 0 }}</div>
                <div class="stat-label">问题修复</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon-wrapper info">
                <el-icon class="stat-icon"><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ versionStats.totalImprovements || 0 }}</div>
                <div class="stat-label">功能改进</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 主内容区域 -->
  <div class="main-content">
    <el-row :gutter="20">
      <!-- 左侧：版本列表 -->
      <el-col :span="8">
        <el-card class="version-list-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">版本列表</span>
              <div class="header-right">
                <el-select
                  v-model="statusFilter"
                  placeholder="筛选状态"
                  size="small"
                  style="width: 100px; margin-right: 10px;"
                  clearable
                >
                  <el-option label="全部" value="" />
                  <el-option label="已发布" value="published" />
                  <el-option label="草稿" value="draft" />
                  <el-option label="已归档" value="archived" />
                </el-select>
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索版本"
                  size="small"
                  style="width: 100px; margin-right: 10px;"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="fetchVersionUpdates"
                  :loading="loading"
                >
                  <el-icon><Refresh /></el-icon>
                  刷新数据
                </el-button>
                <el-button 
                  type="success" 
                  size="small" 
                  @click="showGenerateChangelogDialog"
                  :loading="generateLoading"
                  style="margin-left: 8px;"
                >
                  <el-icon><DocumentAdd /></el-icon>
                  生成日志
                </el-button>
              </div>
            </div>
          </template>
          
          <!-- 加载状态 -->
          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="5" animated />
          </div>
          
          <!-- 版本列表 -->
          <div v-else-if="filteredVersionList.length > 0" class="version-list">
            <div 
              v-for="version in filteredVersionList" 
              :key="version.ID"
              class="version-item"
              :class="{ active: selectedVersionId === version.ID }"
              @click="selectVersion(version.ID)"
            >
              <div class="version-header">
                <div class="version-info">
                  <!-- 确保版本号格式正确，避免双重'v'前缀 -->
                  <span class="version-number">{{ version.Version.startsWith('v') ? version.Version : 'v' + version.Version }}</span>
                  <el-tag 
                    :type="getStatusType(version.Status)" 
                    size="small"
                    class="version-status"
                  >
                    {{ getStatusText(version.Status) }}
                  </el-tag>
                </div>
                <div class="version-date">{{ formatDate(version.ReleaseDate) }}</div>
              </div>
              <div class="version-title">{{ version.Title }}</div>
              <div class="version-summary">{{ version.Description }}</div>
            </div>
          </div>
          
          <!-- 无数据状态 -->
          <div v-else class="no-data">
            <el-empty description="暂无版本更新数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>
      
      <!-- 右侧：版本详情 -->
      <el-col :span="16">
        <el-card class="version-detail-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="title-and-meta">
                <span class="card-title">版本详情</span>
                <div v-if="selectedVersion" class="version-meta">
                  <el-tag type="info" size="small">
                    <el-icon><Calendar /></el-icon>
                    {{ formatDate(selectedVersion.ReleaseDate) }}
                  </el-tag>
                  <el-tag type="success" size="small" v-if="selectedVersion.CommitHash">
                    <el-icon><Link /></el-icon>
                    {{ selectedVersion.CommitHash.substring(0, 8) }}
                  </el-tag>
                </div>
              </div>
              <div v-if="selectedVersion" class="action-buttons">
                  <el-button 
                    type="success" 
                    size="small" 
                    @click="openVersionDialog('create')"
                    :icon="Plus"
                  >
                    新增版本
                  </el-button>
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="openVersionDialog('edit')"
                    :disabled="!selectedVersion"
                    :icon="Edit"
                  >
                    编辑版本
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="deleteVersion"
                    :disabled="!selectedVersion"
                    :icon="Delete"
                  >
                    删除版本
                  </el-button>
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="openNotificationDialog" 
                    :loading="notificationLoading"
                    :disabled="!selectedVersion"
                    :icon="Bell"
                  >
                    发送通知
                  </el-button>
                </div>
            </div>
          </template>
          
          <!-- 详情加载状态 -->
          <div v-if="detailLoading" class="loading-container">
            <el-skeleton :rows="8" animated />
          </div>
          
          <!-- 版本详情内容 -->
          <div v-else-if="selectedVersion" class="version-detail">
            <!-- 版本基本信息 -->
            <div class="detail-section">
              <h2 class="version-title-large">{{ selectedVersion.Title }}</h2>
              <p class="version-summary-large">{{ selectedVersion.Summary }}</p>
              
              <!-- 版本元信息 -->
              <div class="version-metadata">
                <div class="metadata-item">
                  <el-icon><User /></el-icon>
                  <span>发布者：{{ selectedVersion.CreatedByName || '系统管理员' }}</span>
                </div>
                <div class="metadata-item" v-if="selectedVersion.CommitHash">
                  <el-icon><Link /></el-icon>
                  <span>提交哈希：{{ selectedVersion.CommitHash }}</span>
                </div>
                <div class="metadata-item" v-if="selectedVersion.CommitMessage">
                  <el-icon><Document /></el-icon>
                  <span>提交信息：{{ selectedVersion.CommitMessage }}</span>
                </div>
              </div>
            </div>
            
            <!-- 版本描述 -->
            <div v-if="selectedVersion.Description" class="detail-section">
              <h3 class="section-title">版本描述</h3>
              <div class="description-content">
                {{ selectedVersion.Description }}
              </div>
            </div>
            
            <!-- 更新内容 -->
            <div class="detail-section">
              <h3 class="section-title">更新内容</h3>
              
              <!-- 如果有ChangelogMarkdown字段，优先显示 -->
              <MarkdownEditor v-if="selectedVersion.ChangelogMarkdown" :modelValue="selectedVersion.ChangelogMarkdown" :autoSave="false" :readonly="true" />
              
              <!-- 如果没有ChangelogMarkdown但有items，显示结构化内容 -->
              <div v-else-if="selectedVersion.items && selectedVersion.items.length > 0" class="structured-content">
              
              <!-- 按类别分组显示 -->
              <div v-for="category in getCategories(selectedVersion.items)" :key="category" class="category-group">
                <h4 class="category-title">
                  <el-icon v-if="category === 'features'" class="category-icon"><Plus /></el-icon>
                  <el-icon v-else-if="category === 'improvements'" class="category-icon"><TrendCharts /></el-icon>
                  <el-icon v-else-if="category === 'fixes'" class="category-icon"><Tools /></el-icon>
                  <el-icon v-else class="category-icon"><Star /></el-icon>
                  {{ getCategoryName(category) }}
                </h4>
                
                <div class="update-items">
                  <div 
                    v-for="item in selectedVersion.items.filter(i => i.Category === category)" 
                    :key="item.ID"
                    class="update-item"
                    :class="item.IsHighlight ? 'highlight' : ''"
                  >
                    <div class="item-content">
                      <div class="item-title">
                        {{ item.Title }}
                        <el-tag v-if="item.IsHighlight" type="warning" size="small" class="highlight-tag">
                          <el-icon><Star /></el-icon>
                          重要
                        </el-tag>
                      </div>
                      <div class="item-description">{{ item.Description }}</div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
              
              <!-- 无更新内容时的提示 -->
              <div v-else class="no-content">
                <el-empty description="暂无详细更新信息" :image-size="60" />
              </div>
            </div>
          </div>
          
          <!-- 未选择版本时的提示 -->
          <div v-else class="no-selection">
            <el-empty description="请从左侧选择一个版本查看详情" :image-size="100" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>

  <!-- 发送通知对话框 -->
  <el-dialog 
    v-model="showNotificationDialog" 
    title="发送版本更新通知" 
    width="600px"
    @close="resetNotificationForm"
  >
    <el-form :model="notificationForm" :rules="notificationRules" ref="notificationFormRef" label-width="100px">
      <el-form-item label="通知标题" prop="title">
        <el-input v-model="notificationForm.title" placeholder="请输入通知标题" />
      </el-form-item>
      <el-form-item label="通知类型" prop="type">
        <el-select v-model="notificationForm.type" placeholder="请选择通知类型" style="width: 100%">
          <el-option label="系统通知" value="system" />
          <el-option label="更新通知" value="update" />
          <el-option label="一般通知" value="general" />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级" prop="priority">
        <el-select v-model="notificationForm.priority" placeholder="请选择优先级" style="width: 100%">
          <el-option label="低" value="low" />
          <el-option label="中" value="medium" />
          <el-option label="高" value="high" />
          <el-option label="紧急" value="urgent" />
        </el-select>
      </el-form-item>
      <el-form-item label="通知内容" prop="content">
        <el-input 
          v-model="notificationForm.content" 
          type="textarea" 
          :rows="6" 
          placeholder="请输入通知内容"
        />
      </el-form-item>
      <el-form-item label="发送范围">
        <el-checkbox-group v-model="notificationForm.recipients">
          <el-checkbox value="all">所有用户</el-checkbox>
          <el-checkbox value="admin">管理员</el-checkbox>
          <el-checkbox value="developer">开发人员</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="showNotificationDialog = false">取消</el-button>
        <el-button type="primary" @click="sendNotification" :loading="notificationLoading">
          发送通知
        </el-button>
      </div>
    </template>
  </el-dialog>

    <!-- 版本管理对话框 -->
    <el-dialog
      v-model="showVersionDialog"
      :title="versionDialogMode === 'create' ? '新增版本' : '编辑版本'"
      width="750px"
      @close="closeVersionDialog"
    >
      <el-form
        ref="versionFormRef"
        :model="versionForm"
        :rules="versionRules"
        label-width="120px"
      >
        <el-row :gutter="10">
          <el-col :span="8">
            <el-form-item label="版本号" prop="version">
              <el-input 
                v-model="versionForm.version" 
                placeholder="版本号,如2.3.1"
                :disabled="versionDialogMode === 'edit'"
                @input="handleVersionInput"
              />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="发布日期" prop="releaseDate">
              <el-date-picker
                v-model="versionForm.releaseDate"
                type="datetime"
                placeholder="选择发布日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="主要更新">
              <el-switch v-model="versionForm.isMajorUpdate" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="版本标题" prop="title">
          <el-input v-model="versionForm.title" placeholder="请输入版本标题" />
        </el-form-item>
        
        <el-form-item label="版本描述" prop="description">
          <el-input
            v-model="versionForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入版本描述"
          />
        </el-form-item>
        
        <el-row :gutter="10">
          <el-col :span="8">
            <el-form-item label="版本状态" prop="status">
              <el-select v-model="versionForm.status" style="width: 100%">
                <el-option label="草稿" value="draft" />
                <el-option label="已发布" value="published" />
                <el-option label="已归档" value="archived" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="总提交数">
              <el-input-number 
                v-model="versionForm.totalCommits" 
                :min="0" 
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="新功能数">
              <el-input-number 
                v-model="versionForm.featuresCount" 
                :min="0" 
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="10">
          <el-col :span="8">
            <el-form-item label="修复数">
              <el-input-number 
                v-model="versionForm.fixesCount" 
                :min="0" 
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="改进数">
              <el-input-number 
                v-model="versionForm.improvementsCount" 
                :min="0" 
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="其他数">
              <el-input-number 
                v-model="versionForm.otherCount" 
                :min="0" 
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="更新日志" prop="changelogMarkdown">
          <div class="dialog-markdown-editor">
            <MarkdownEditor
              v-model="versionForm.changelogMarkdown"
              :autoSave="false"
              placeholder="请输入Markdown格式的更新日志"
            />
          </div>
        </el-form-item>
        
        <el-form-item label="贡献者">
          <el-input
            v-model="versionForm.contributors"
            placeholder="请输入贡献者信息，多个用逗号分隔"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeVersionDialog">取消</el-button>
          <el-button 
            type="primary" 
            @click="saveVersion" 
            :loading="versionSaving"
          >
            {{ versionDialogMode === 'create' ? '创建' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 生成版本更新日志对话框 -->
    <el-dialog
      v-model="showGenerateDialog"
      title="生成版本更新日志"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <el-form
        ref="generateFormRef"
        :model="generateForm"
        :rules="generateRules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item label="版本号" prop="version">
          <el-input
            v-model="generateForm.version"
            placeholder="请输入版本号，如：2.3.1"
            style="width: 100%;"
            @input="handleVersionInput"
          >
            <template #prepend>v</template>
          </el-input>
          <div class="form-tip">版本号格式：主版本.次版本.修订版本（无需输入v前缀）</div>
        </el-form-item>
        
        <el-form-item label="起始提交" prop="from">
          <el-select
            v-model="generateForm.from"
            placeholder="选择起始提交（可选）"
            style="width: 100%;"
            filterable
            clearable
            remote
            :remote-method="searchCommits"
            :loading="commitsLoading"
            @focus="loadCommitOptions"
          >
            <el-option-group label="最近提交">
              <el-option
                v-for="commit in commitOptions"
                :key="commit.hash"
                :label="commit.display"
                :value="commit.hash"
              />
            </el-option-group>
            <el-option-group label="标签" v-if="tagOptions.length > 0">
              <el-option
                v-for="tag in tagOptions"
                :key="tag.name"
                :label="tag.display"
                :value="tag.name"
              />
            </el-option-group>
          </el-select>
          <div class="form-tip">留空将自动从上一个版本标签开始</div>
        </el-form-item>
        
        <el-form-item label="结束提交" prop="to">
          <el-select
            v-model="generateForm.to"
            placeholder="选择结束提交"
            style="width: 100%;"
            filterable
            remote
            :remote-method="searchCommits"
            :loading="commitsLoading"
            @focus="loadCommitOptions"
          >
            <el-option label="HEAD（最新提交）" value="HEAD" />
            <el-option-group label="最近提交">
              <el-option
                v-for="commit in commitOptions"
                :key="commit.hash"
                :label="commit.display"
                :value="commit.hash"
              />
            </el-option-group>
            <el-option-group label="标签" v-if="tagOptions.length > 0">
              <el-option
                v-for="tag in tagOptions"
                :key="tag.name"
                :label="tag.display"
                :value="tag.name"
              />
            </el-option-group>
            <el-option-group label="分支" v-if="branchOptions.length > 0">
              <el-option
                v-for="branch in branchOptions"
                :key="branch.name"
                :label="branch.display"
                :value="branch.name"
              />
            </el-option-group>
          </el-select>
          <div class="form-tip">默认为HEAD（最新提交）</div>
        </el-form-item>
        
        <el-form-item label="输出格式">
          <el-select v-model="generateForm.format" style="width: 100%;">
            <el-option label="Markdown" value="markdown" />
            <el-option label="纯文本" value="text" />
            <el-option label="JSON" value="json" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="选项配置">
          <el-checkbox v-model="generateForm.saveToDb">保存到数据库</el-checkbox>
          <el-checkbox v-model="generateForm.sendNotification" style="margin-left: 20px;">发送通知</el-checkbox>
        </el-form-item>
        
        <el-alert
          title="注意事项"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div>
              <p>• 脚本将分析Git提交历史并生成结构化的版本更新日志</p>
              <p>• 使用优化的连接池管理，确保不会导致后端服务崩溃</p>
              <p>• 生成过程可能需要几秒钟，请耐心等待</p>
            </div>
          </template>
        </el-alert>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeGenerateDialog">取消</el-button>
          <el-button 
            type="primary" 
            @click="executeGenerateChangelog" 
            :loading="generateLoading"
          >
            <el-icon><DocumentAdd /></el-icon>
            开始生成
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 版本更新内容组件
 * 
 * 功能说明：
 * 1. 显示版本统计信息
 * 2. 显示版本列表和详情
 * 3. 支持搜索和刷新功能
 */

import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { versionUpdatesAPI } from '@/utils/api'
import { useUserStore } from '@/store/user'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import {
  Bell,
  Calendar,
  Document,
  DocumentAdd,
  Plus,
  Tools,
  TrendCharts,
  Link,
  Star,
  Refresh,
  Search,
  User,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

// 响应式数据
const loading = ref(false)
const detailLoading = ref(false)
const versionList = ref([])
const versionStats = ref(null)
const selectedVersionId = ref(null)
const selectedVersion = ref(null)
const searchKeyword = ref('')
const statusFilter = ref('')

// 生成日志相关数据
const generateLoading = ref(false)
const showGenerateDialog = ref(false)
const generateFormRef = ref(null)
const generateForm = ref({
  version: '',
  from: '',
  to: 'HEAD',
  saveToDb: true,
  format: 'markdown',
  sendNotification: true
})

// Git选项相关数据
const commitOptions = ref([])
const tagOptions = ref([])
const branchOptions = ref([])
const commitsLoading = ref(false)
const gitDataLoaded = ref(false)

// 通知相关数据
const showNotificationDialog = ref(false)
const notificationLoading = ref(false)
const notificationFormRef = ref(null)
const notificationForm = ref({
  title: '',
  type: 'update',
  priority: 'medium',
  content: '',
  recipients: ['all']
})

// 版本管理相关
const showVersionDialog = ref(false)
const versionDialogMode = ref('create') // 'create' 或 'edit'
const versionForm = ref({
  id: null,
  version: '',
  title: '',
  description: '',
  releaseDate: null,
  status: 'draft',
  isMajorUpdate: false,
  totalCommits: 0,
  featuresCount: 0,
  fixesCount: 0,
  improvementsCount: 0,
  otherCount: 0,
  changelogMarkdown: '',
  contributors: ''
})
const versionSaving = ref(false)
const versionFormRef = ref(null)

// 版本表单验证规则
const versionRules = {
  version: [
    { required: true, message: '请输入版本号', trigger: 'blur' },
    { pattern: /^v?\d+\.\d+\.\d+/, message: '版本号格式不正确，如：v2.3.1', trigger: 'blur' }
  ],
  title: [
    { required: true, message: '请输入版本标题', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入版本描述', trigger: 'blur' }
  ],
  releaseDate: [
    { required: true, message: '请选择发布日期', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择版本状态', trigger: 'change' }
  ]
}

// 通知表单验证规则
const notificationRules = {
  title: [{ required: true, message: '请输入通知标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择通知类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  content: [{ required: true, message: '请输入通知内容', trigger: 'blur' }]
}

// 生成日志表单验证规则
const generateRules = {
  version: [
    { required: true, message: '请输入版本号', trigger: 'blur' },
    { 
      pattern: /^\d+\.\d+\.\d+$/, 
      message: '版本号格式不正确，只能包含数字和小数点，如：2.3.1', 
      trigger: 'blur' 
    },
    {
      validator: (rule, value, callback) => {
        // 检查是否包含v前缀
        if (value && value.toLowerCase().includes('v')) {
          callback(new Error('版本号无需输入v前缀，系统会自动添加'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  to: [
    { required: true, message: '请选择结束提交', trigger: 'change' },
    {
      validator: (rule, value, callback) => {
        // 验证结束提交不能为空
        if (!value || value.trim() === '') {
          callback(new Error('结束提交不能为空，请选择一个有效的提交或使用HEAD'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  from: [
    {
      validator: (rule, value, callback) => {
        // 起始提交可以为空，但如果有值则需要验证格式
        if (value && value.trim() !== '') {
          // 检查是否为有效的Git哈希或标签格式
          const isValidHash = /^[a-f0-9]{7,40}$/i.test(value)
          const isValidTag = /^v?\d+\.\d+\.\d+/.test(value) || /^[a-zA-Z][a-zA-Z0-9._-]*$/.test(value)
          
          if (!isValidHash && !isValidTag) {
            callback(new Error('请选择有效的提交哈希或标签'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 计算属性
/**
 * 过滤后的版本列表
 * 根据搜索关键词和状态筛选版本
 */
const filteredVersionList = computed(() => {
  let filtered = versionList.value
  
  // 状态筛选
  if (statusFilter.value) {
    filtered = filtered.filter(version => version.Status === statusFilter.value)
  }
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(version => {
      return version.Version.toLowerCase().includes(keyword) ||
             version.Title.toLowerCase().includes(keyword) ||
             version.Description.toLowerCase().includes(keyword)
    })
  }
  
  return filtered
})

/**
 * 选择版本
 * @param {number} versionId - 版本ID
 */
const selectVersion = async (versionId) => {
  if (selectedVersionId.value === versionId) {
    return // 如果已经选中，不重复加载
  }
  
  selectedVersionId.value = versionId
  detailLoading.value = true
  
  try {
    // 先从列表中找到基本信息
    const basicVersion = versionList.value.find(v => v.ID === versionId)
    if (basicVersion) {
      selectedVersion.value = basicVersion
    }
    
    // 获取详细信息
    const detailData = await fetchVersionDetail(versionId)
    if (detailData) {
      selectedVersion.value = { ...basicVersion, ...detailData }
    }
  } catch (error) {
    console.error('选择版本失败:', error)
  } finally {
    detailLoading.value = false
  }
}

/**
 * 获取版本更新统计数据
 * 使用api.js中定义的getVersionStats API
 */
const fetchVersionStats = async () => {
  try {
    console.log('🔄 [VersionUpdates] 开始获取版本统计数据')
    
    const response = await versionUpdatesAPI.getVersionStats()
    
    console.log('📥 [VersionUpdates] 统计数据响应:', response)
    
    if (response.success) {
      // 后端返回的统计数据结构
      const stats = response.data
      versionStats.value = {
        totalVersions: stats.totalVersions || 0,
        totalFeatures: stats.totalFeatures || 0,
        totalFixes: stats.totalFixes || 0,
        totalImprovements: stats.totalImprovements || 0,
        publishedVersions: stats.publishedVersions || 0,
        draftVersions: stats.draftVersions || 0,
        majorUpdates: stats.majorUpdates || 0,
        totalCommits: stats.totalCommits || 0,
        latestVersion: stats.latestVersion || '',
        latestReleaseDate: stats.latestReleaseDate
      }
      
      console.log('✅ [VersionUpdates] 统计数据更新成功:', versionStats.value)
    } else {
      console.log('❌ [VersionUpdates] 统计数据获取失败:', response.message)
      ElMessage.error(response.message || '获取版本统计数据失败')
    }
  } catch (error) {
    console.error('💥 [VersionUpdates] 获取统计数据失败:', error)
    ElMessage.error('获取版本统计数据失败')
  }
}

/**
 * 获取版本更新列表
 * 使用api.js中定义的getVersionUpdates API
 */
const fetchVersionUpdates = async () => {
  try {
    loading.value = true
    console.log('🔄 [VersionUpdates] 开始获取版本更新列表')
    
    // 使用api.js中定义的getVersionUpdates API
    const response = await versionUpdatesAPI.getVersionUpdates({
      page: 1,
      pageSize: 50
      // 移除状态限制，获取所有状态的版本以支持筛选功能
    })
    
    console.log('📥 [VersionUpdates] API响应:', response)
    
    if (response.success) {
      // 后端返回的数据结构是 {success: true, data: [...], pagination: {...}}
      versionList.value = response.data || []
      
      console.log('✅ [VersionUpdates] 版本列表更新成功，数量:', versionList.value.length)
      console.log('📄 [VersionUpdates] 分页信息:', response.pagination)
      
      // 自动选中最新版本（第一个）
      if (versionList.value.length > 0 && !selectedVersionId.value) {
        console.log('🎯 [VersionUpdates] 自动选中最新版本:', versionList.value[0].Version)
        await selectVersion(versionList.value[0].ID)
      }
    } else {
      console.log('❌ [VersionUpdates] response.success为false，显示错误信息:', response.message)
      ElMessage.error(response.message || '获取版本更新列表失败')
    }
  } catch (error) {
    console.error('💥 [VersionUpdates] catch块执行，错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      fullError: error
    })
    ElMessage.error('获取版本更新列表失败')
    // 如果API调用失败，显示空状态
    versionList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 获取版本更新详情
 * 使用api.js中定义的getVersionUpdateDetail API
 * @param {number} versionId - 版本ID
 */
const fetchVersionDetail = async (versionId) => {
  try {
    console.log('🔄 [VersionUpdates] 获取版本详情，ID:', versionId)
    
    // 使用api.js中定义的getVersionUpdateDetail API
    const response = await versionUpdatesAPI.getVersionUpdateDetail(versionId)
    
    console.log('📥 [VersionUpdates] 版本详情响应:', response)
    console.log('📥 [VersionUpdates] 版本详情数据结构:', response.data)
    console.log('📥 [VersionUpdates] items字段:', response.data?.items)
    
    if (response.success) {
      // 更新对应版本的详情数据
      const versionIndex = versionList.value.findIndex(v => v.ID === versionId)
      if (versionIndex !== -1) {
        versionList.value[versionIndex] = { ...versionList.value[versionIndex], ...response.data }
        
        // 如果更新的是当前选中的版本，同步更新selectedVersion
        if (selectedVersion.value && selectedVersion.value.ID === versionId) {
          selectedVersion.value = versionList.value[versionIndex]
        }
      }
      return response.data
    } else {
      ElMessage.error(response.message || '获取版本详情失败')
      return null
    }
  } catch (error) {
    console.error('💥 [VersionUpdates] 获取版本详情失败:', error)
    ElMessage.error('获取版本详情失败')
    return null
  }
}

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * 获取状态类型
 * @param {string} status - 状态值
 * @returns {string} Element Plus tag类型
 */
const getStatusType = (status) => {
  const statusMap = {
    'published': 'success',
    'draft': 'warning',
    'archived': 'info'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 * @param {string} status - 状态值
 * @returns {string} 状态显示文本
 */
const getStatusText = (status) => {
  const statusMap = {
    'published': '已发布',
    'draft': '草稿',
    'archived': '已归档'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取更新项目的所有类别
 * @param {Array} items - 更新项目列表
 * @returns {Array} 类别列表
 */
const getCategories = (items) => {
  if (!items || !Array.isArray(items)) return []
  const categories = [...new Set(items.map(item => item.Category))]
  // 按优先级排序
  const order = ['features', 'improvements', 'fixes', 'other']
  return categories.sort((a, b) => {
    const aIndex = order.indexOf(a)
    const bIndex = order.indexOf(b)
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
  })
}

/**
 * 获取类别名称
 * @param {string} category - 类别值
 * @returns {string} 类别显示名称
 */
const getCategoryName = (category) => {
  const categoryMap = {
    'features': '新功能',
    'improvements': '功能改进',
    'fixes': '问题修复',
    'other': '其他更新'
  }
  return categoryMap[category] || '其他更新'
}



/**
 * 发送版本更新通知
 * 功能：向指定用户群体发送版本更新通知
 */
const sendNotification = async () => {
  if (!selectedVersion.value) {
    ElMessage.error('请先选择一个版本')
    return
  }

  try {
    // 验证表单
    await notificationFormRef.value.validate()
    
    notificationLoading.value = true
    
    // 构建通知数据
    const notificationData = {
      versionId: selectedVersion.value.ID,
      versionNumber: selectedVersion.value.Version,
      title: notificationForm.value.title,
      type: notificationForm.value.type,
      priority: notificationForm.value.priority,
      content: notificationForm.value.content,
      recipients: notificationForm.value.recipients
    }
    
    
    
    // 调用发送通知API
    const response = await versionUpdatesAPI.sendVersionNotification(selectedVersion.value.ID, notificationData)
    
    if (response.success) {
      ElMessage.success('版本更新通知发送成功')
      showNotificationDialog.value = false
      resetNotificationForm()
      
      // 刷新铃铛组件的未读消息数量
      const userStore = useUserStore()
      await userStore.refreshNotifications()
    } else {
      ElMessage.error(response.message || '发送通知失败')
    }
  } catch (error) {
    console.error('💥 [发送通知] 发送失败:', error)
    ElMessage.error('发送通知失败，请稍后重试')
  } finally {
    notificationLoading.value = false
  }
}

/**
 * 重置通知表单
 * 功能：清空通知表单数据
 */
const resetNotificationForm = () => {
  notificationForm.value = {
    title: selectedVersion.value ? `版本 ${selectedVersion.value.Version} 更新通知` : '',
    type: 'update',
    priority: 'medium',
    content: selectedVersion.value ? `系统已发布新版本 ${selectedVersion.value.Version}，请及时了解更新内容。` : '',
    recipients: ['all']
  }
  
  // 清除表单验证状态
  if (notificationFormRef.value) {
    notificationFormRef.value.clearValidate()
  }
}

/**
 * 打开发送通知对话框
 * 功能：初始化通知表单并显示对话框
 */
const openNotificationDialog = () => {
  if (!selectedVersion.value) {
    ElMessage.warning('请先选择一个版本')
    return
  }
  
  // 初始化表单数据
  resetNotificationForm()
  showNotificationDialog.value = true
}

/**
 * 关闭通知对话框
 * 功能：关闭对话框并重置表单
 */
const closeNotificationDialog = () => {
  showNotificationDialog.value = false
  resetNotificationForm()
}

/**
 * 打开版本管理对话框
 * @param {string} mode - 对话框模式：'create' 或 'edit'
 */
const openVersionDialog = (mode) => {
  versionDialogMode.value = mode
  
  if (mode === 'edit' && selectedVersion.value) {
    // 编辑模式：填充现有数据
    versionForm.value = {
      id: selectedVersion.value.ID,
      version: selectedVersion.value.Version,
      title: selectedVersion.value.Title,
      description: selectedVersion.value.Description,
      releaseDate: selectedVersion.value.ReleaseDate ? new Date(selectedVersion.value.ReleaseDate) : null,
      status: selectedVersion.value.Status || 'draft',
      isMajorUpdate: selectedVersion.value.IsMajorUpdate || false,
      totalCommits: selectedVersion.value.TotalCommits || 0,
      featuresCount: selectedVersion.value.FeaturesCount || 0,
      fixesCount: selectedVersion.value.FixesCount || 0,
      improvementsCount: selectedVersion.value.ImprovementsCount || 0,
      otherCount: selectedVersion.value.OtherCount || 0,
      changelogMarkdown: selectedVersion.value.ChangelogMarkdown || '',
      contributors: selectedVersion.value.Contributors || ''
    }
  } else {
    // 创建模式：重置表单
    resetVersionForm()
  }
  
  showVersionDialog.value = true
}

/**
 * 关闭版本管理对话框
 */
const closeVersionDialog = () => {
  showVersionDialog.value = false
  resetVersionForm()
}

/**
 * 重置版本表单
 */
const resetVersionForm = () => {
  versionForm.value = {
    id: null,
    version: '',
    title: '',
    description: '',
    releaseDate: null,
    status: 'draft',
    isMajorUpdate: false,
    totalCommits: 0,
    featuresCount: 0,
    fixesCount: 0,
    improvementsCount: 0,
    otherCount: 0,
    changelogMarkdown: '',
    contributors: ''
  }
  
  // 清除表单验证状态
  if (versionFormRef.value) {
    versionFormRef.value.clearValidate()
  }
}

/**
 * 保存版本
 */
const saveVersion = async () => {
  try {
    // 验证表单
    await versionFormRef.value.validate()
    
    // 如果是创建模式，检查版本号是否已存在
    if (versionDialogMode.value === 'create') {
      try {
        const checkResponse = await versionUpdatesAPI.checkVersionExists(versionForm.value.version)
        if (checkResponse.success && checkResponse.exists) {
          ElMessage.error('该版本号已存在，请修改版本号后再试')
          return
        }
      } catch (error) {
        console.error('检查版本号失败:', error)
        ElMessage.error('检查版本号失败，请稍后重试')
        return
      }
    }
    
    versionSaving.value = true
    
    const versionData = {
      version: versionForm.value.version,
      title: versionForm.value.title,
      description: versionForm.value.description,
      releaseDate: versionForm.value.releaseDate,
      status: versionForm.value.status,
      isMajorUpdate: versionForm.value.isMajorUpdate,
      totalCommits: versionForm.value.totalCommits,
      featuresCount: versionForm.value.featuresCount,
      fixesCount: versionForm.value.fixesCount,
      improvementsCount: versionForm.value.improvementsCount,
      otherCount: versionForm.value.otherCount,
      changelogMarkdown: versionForm.value.changelogMarkdown,
      contributors: versionForm.value.contributors
    }
    
    let response
    if (versionDialogMode.value === 'create') {
      response = await versionUpdatesAPI.createVersionUpdate(versionData)
    } else {
      response = await versionUpdatesAPI.updateVersionUpdate(versionForm.value.id, versionData)
    }
    
    if (response.success) {
      ElMessage.success(versionDialogMode.value === 'create' ? '版本创建成功' : '版本更新成功')
      closeVersionDialog()
      
      // 刷新列表和统计数据
      await Promise.all([
        fetchVersionStats(),
        fetchVersionUpdates()
      ])
      
      // 等待DOM更新后再刷新版本详情
      await nextTick()
      
      // 如果是编辑模式且有选中的版本，刷新版本详情
      if (versionDialogMode.value === 'edit' && selectedVersion.value) {
        await fetchVersionDetail(selectedVersion.value.ID)
      }
      // 如果是创建模式，选中新创建的版本
      else if (versionDialogMode.value === 'create' && response.data?.ID) {
        // 等待列表刷新完成后选中新版本
        await nextTick()
        const newVersion = versionList.value.find(v => v.ID === response.data.ID)
        if (newVersion) {
          selectedVersion.value = newVersion
          await fetchVersionDetail(newVersion.ID)
        }
      }
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存版本失败:', error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    versionSaving.value = false
  }
}

/**
 * 删除版本
 */
const deleteVersion = async () => {
  if (!selectedVersion.value) {
    ElMessage.warning('请先选择一个版本')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除版本 ${selectedVersion.value.Version} 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await versionUpdatesAPI.deleteVersionUpdate(selectedVersion.value.ID)
    
    if (response.success) {
      ElMessage.success('版本删除成功')
      selectedVersionId.value = null
      selectedVersion.value = null
      // 刷新列表和统计数据
      await Promise.all([
        fetchVersionStats(),
        fetchVersionUpdates()
      ])
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除版本失败:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }
}

/**
 * 处理版本号输入限制
 * 功能：只允许输入数字和小圆点分隔符，自动清除'v'前缀并提醒
 * @param {string} value - 输入的值
 */
/**
 * 处理版本号输入
 * 功能：自动清除非法字符，只保留数字和小数点，并提醒用户不要输入v前缀
 * @param {string} value - 输入的版本号值
 */
const handleVersionInput = (value) => {
  // 检测是否包含'v'或'V'前缀
  if (value.toLowerCase().includes('v')) {
    ElMessage.warning('版本号无需输入v前缀，系统会自动添加')
  }
  
  // 移除所有非数字和非小数点的字符（包括v前缀）
  let filteredValue = value.replace(/[^0-9.]/g, '')
  
  // 防止多个连续的小数点
  filteredValue = filteredValue.replace(/\.{2,}/g, '.')
  
  // 防止以小数点开头
  filteredValue = filteredValue.replace(/^\./g, '')
  
  // 防止以小数点结尾（如果有多个小数点）
  const parts = filteredValue.split('.')
  if (parts.length > 3) {
    // 版本号格式应该是 x.y.z，最多3个部分
    filteredValue = parts.slice(0, 3).join('.')
  }
  
  // 更新对应的表单值
  if (versionForm.value) {
    versionForm.value.version = filteredValue
  }
  if (generateForm.value) {
    generateForm.value.version = filteredValue
  }
}

/**
 * 显示生成日志对话框
 * 功能：打开生成版本更新日志的配置对话框
 */
const showGenerateChangelogDialog = () => {
  // 重置表单
  generateForm.value = {
    version: '',
    from: '',
    to: 'HEAD',
    saveToDb: true,
    format: 'markdown',
    sendNotification: true
  }
  
  // 清除表单验证状态
  nextTick(() => {
    generateFormRef.value?.clearValidate()
  })
  
  showGenerateDialog.value = true
}

/**
 * 关闭生成日志对话框
 */
const closeGenerateDialog = () => {
  showGenerateDialog.value = false
  generateForm.value = {
    version: '',
    from: '',
    to: 'HEAD',
    saveToDb: true,
    format: 'markdown',
    sendNotification: true
  }
  
  // 清除表单验证状态
  nextTick(() => {
    generateFormRef.value?.clearValidate()
  })
}

/**
 * 加载Git提交选项
 * 功能：获取Git提交记录、标签和分支信息用于下拉选择
 */
const loadCommitOptions = async () => {
  if (gitDataLoaded.value) return // 避免重复加载
  
  try {
    commitsLoading.value = true
    
    // 并行获取提交记录、标签和分支
    const [commitsRes, tagsRes, branchesRes] = await Promise.all([
      versionUpdatesAPI.getGitCommits({ limit: 20 }),
      versionUpdatesAPI.getGitTags({ limit: 10 }),
      versionUpdatesAPI.getGitBranches()
    ])
    
    // 处理提交记录
    if (commitsRes.success && commitsRes.data) {
      commitOptions.value = commitsRes.data.map(commit => ({
        hash: commit.hash,
        display: `${commit.hash.substring(0, 8)} - ${commit.message}`,
        message: commit.message,
        author: commit.author,
        date: commit.date
      }))
    }
    
    // 处理标签
    if (tagsRes.success && tagsRes.data) {
      tagOptions.value = tagsRes.data.map(tag => ({
        name: tag.name,
        display: `${tag.name} - ${tag.message || '标签'}`,
        message: tag.message,
        date: tag.date
      }))
    }
    
    // 处理分支
    if (branchesRes.success && branchesRes.data) {
      branchOptions.value = branchesRes.data.map(branch => ({
        name: branch.name,
        display: `${branch.name}${branch.current ? ' (当前)' : ''}`,
        current: branch.current
      }))
    }
    
    gitDataLoaded.value = true
    
  } catch (error) {
    console.error('加载Git选项失败:', error)
    ElMessage.error('加载Git信息失败')
  } finally {
    commitsLoading.value = false
  }
}

/**
 * 搜索提交记录
 * 功能：根据关键词搜索Git提交记录
 * @param {string} query - 搜索关键词
 */
const searchCommits = async (query) => {
  if (!query || query.length < 2) {
    return // 搜索关键词太短，不执行搜索
  }
  
  try {
    commitsLoading.value = true
    
    const response = await versionUpdatesAPI.getGitCommits({ 
      limit: 10,
      search: query 
    })
    
    if (response.success && response.data) {
      // 更新提交选项，保留原有选项并添加搜索结果
      const searchResults = response.data.map(commit => ({
        hash: commit.hash,
        display: `${commit.hash.substring(0, 8)} - ${commit.message}`,
        message: commit.message,
        author: commit.author,
        date: commit.date
      }))
      
      // 合并搜索结果，去重
      const existingHashes = new Set(commitOptions.value.map(c => c.hash))
      const newCommits = searchResults.filter(c => !existingHashes.has(c.hash))
      commitOptions.value = [...commitOptions.value, ...newCommits]
    }
    
  } catch (error) {
    console.error('搜索提交记录失败:', error)
  } finally {
    commitsLoading.value = false
  }
}

/**
 * 执行生成日志
 * 功能：调用后端API执行高级版本更新日志生成器脚本
 */
const executeGenerateChangelog = async () => {
  try {
    // 验证表单
    const valid = await generateFormRef.value.validate().catch(() => false)
    if (!valid) {
      ElMessage.error('请检查表单输入')
      return
    }
    
    generateLoading.value = true
    
    // 准备API参数，为版本号添加'v'前缀
    const apiParams = {
      ...generateForm.value,
      version: `v${generateForm.value.version}` // 前端渲染已显示v前缀，后端需要完整版本号
    }
    
    // 调用API
    const response = await versionUpdatesAPI.generateChangelog(apiParams)
    
    if (response.success) {
      ElMessage.success('版本更新日志生成成功！')
      
      // 显示生成结果
      const result = response.data
      ElMessageBox.alert(
        `版本：${result.version}\n` +
        `总提交数：${result.totalCommits}\n` +
        `新功能：${result.stats?.features || 0}\n` +
        `问题修复：${result.stats?.fixes || 0}\n` +
        `功能改进：${result.stats?.improvements || 0}\n` +
        `其他更新：${result.stats?.other || 0}\n` +
        `数据库保存：${result.dbSaved ? '是' : '否'}`,
        '生成结果',
        {
          confirmButtonText: '确定',
          type: 'success'
        }
      )
      
      // 关闭对话框
      closeGenerateDialog()
      
      // 刷新版本列表和统计数据，同时刷新通知数量
      await Promise.all([
        fetchVersionStats(),
        fetchVersionUpdates(),
        userStore.refreshNotifications() // 刷新通知数量，因为生成日志会发送通知
      ])
      
    } else {
      ElMessage.error(response.message || '生成失败')
    }
    
  } catch (error) {
    console.error('生成版本更新日志失败:', error)
    ElMessage.error('生成失败，请稍后重试')
  } finally {
    generateLoading.value = false
  }
}

// 组件挂载时获取数据
onMounted(async () => {
  // 同时获取统计数据和版本列表
  await Promise.all([
    fetchVersionStats(),
    fetchVersionUpdates()
  ])
})

// 导出响应式引用和方法
defineExpose({
  // 数据
  versionList,
  versionStats,
  loading,
  detailLoading,
  selectedVersionId,
  selectedVersion,
  searchKeyword,
  
  // 通知相关
  showNotificationDialog,
  notificationForm,
  notificationLoading,
  notificationRules,
  
  // 版本管理相关
  showVersionDialog,
  versionDialogMode,
  versionForm,
  versionSaving,
  versionFormRef,
  versionRules,
  
  // 生成日志相关
  generateLoading,
  showGenerateDialog,
  generateFormRef,
  generateForm,
  
  // 方法
  fetchVersionStats,
  fetchVersionUpdates,
  selectVersion,
  openNotificationDialog,
  closeNotificationDialog,
  sendNotification,
  openVersionDialog,
  closeVersionDialog,
  saveVersion,
  deleteVersion,
  showGenerateChangelogDialog,
  closeGenerateDialog,
  executeGenerateChangelog,
  formatDate,
  getStatusType,
  getStatusText,
  getCategories,
  getCategoryName
})
</script>

<style scoped>
/* 页面容器样式 */
.page-container {
  width: 80%;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
  transition: none; /* 移除过渡动画避免闪烁 */
}

/* 后台访问时的页面容器样式 - 100%宽度 */
.version-updates-container:not(.frontend-layout) .page-container {
  width: 100%;
  margin: 0;
  padding: 0;
  transition: none; /* 移除过渡动画避免闪烁 */
}

/* 统计概览样式 */
.stats-overview {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon-wrapper.primary {
  background: linear-gradient(135deg, #409eff, #66b3ff);
}

.stat-icon-wrapper.success {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stat-icon-wrapper.warning {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
}

.stat-icon-wrapper.info {
  background: linear-gradient(135deg, #909399, #a6a9ad);
}

.stat-icon {
  font-size: 20px;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  line-height: 1;
}

/* 主内容区域样式 */
.main-content {
  min-height: 600px;
}

/* 卡片样式 */
.version-list-card,
.version-detail-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  height: 700px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 加载状态 */
.loading-container {
  padding: 20px;
}

/* 版本列表样式 */
.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.version-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.version-item:hover {
  background: #f8f9ff;
  border-color: #409eff;
}

.version-item.active {
  background: linear-gradient(135deg, #409eff, #66b3ff);
  color: white;
  border-color: #409eff;
}

.version-item.active .version-date,
.version-item.active .version-summary {
  color: rgba(255, 255, 255, 0.9);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-number {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.version-item.active .version-number {
  color: white;
}

.version-status {
  font-size: 12px;
}

.version-date {
  font-size: 12px;
  color: #909399;
}

.version-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1.4;
}

.version-item.active .version-title {
  color: white;
}

.version-summary {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 版本详情样式 */
.version-detail {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.detail-section {
  margin-bottom: 32px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #ffffff;
}

.version-title-large {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  line-height: 1.3;
}

.version-summary-large {
  font-size: 16px;
  color: #606266;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.version-metadata {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.metadata-item .el-icon {
  color: #409eff;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
}

.category-group {
  margin-bottom: 24px;
}

.category-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-icon {
  color: #409eff;
}

.update-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.update-item {
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border-left: 4px solid #e4e7ed;
  box-sizing: border-box;
}

.update-item:hover {
  background: #f0f9ff;
  border-left-color: #409eff;
}

.update-item.highlight {
  background: #fff7e6;
  border-left-color: #e6a23c;
}

.update-item.highlight:hover {
  background: #fef5e7;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 版本描述样式 */
.version-description {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #67c23a;
}

.version-description p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
  font-weight: normal;
}

/* Markdown内容样式 */
.changelog-content {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.markdown-content {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  font-weight: normal;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3 {
  margin: 12px 0 6px 0;
  font-weight: 500;
  color: #303133;
}

.markdown-content h1 {
  font-size: 16px;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 4px;
}

.markdown-content h2 {
  font-size: 15px;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 6px;
}

.markdown-content h3 {
  font-size: 14px;
}

.markdown-content ul {
  margin: 12px 0;
  padding-left: 20px;
}

.markdown-content li {
  margin: 6px 0;
  line-height: 1.5;
  font-weight: normal;
}

.markdown-content em {
  font-style: italic;
  color: #606266;
  font-weight: normal;
}

.markdown-content code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #e6a23c;
  font-weight: normal;
}

.markdown-content a {
  color: #409eff;
  text-decoration: none;
  font-weight: normal;
}

.markdown-content a:hover {
  text-decoration: underline;
}

/* 结构化内容样式 */
.structured-content {
  margin-top: 16px;
}

.structured-content .item {
  margin-bottom: 12px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #28a745;
}

.structured-content .item-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.structured-content .item-content {
  color: #666;
  line-height: 1.6;
  font-size: 14px;
  font-weight: normal;
}

/* 表单提示样式 */
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

/* 确保所有文本内容都不使用粗体 */
.version-details * {
  font-weight: normal !important;
}

.version-details h1,
.version-details h2,
.version-details h3 {
  font-weight: 500 !important;
}

.version-details .description-content,
.version-details .markdown-content,
.version-details .structured-content {
  font-weight: normal !important;
}

.version-details .markdown-content p,
.version-details .markdown-content li,
.version-details .markdown-content span,
.version-details .markdown-content div {
  font-weight: normal !important;
}

/* 无内容提示样式 */
.no-content {
  padding: 40px 20px;
  text-align: center;
}

.highlight-tag {
  font-size: 12px;
}

.item-description {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

/* 标题和元信息容器 */
.title-and-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 版本元信息 */
.version-meta {
  display: flex;
  gap: 8px;
}

/* 版本描述内容样式 */
.description-content {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  color: #606266;
  line-height: 1.6;
  font-size: 14px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 无数据状态 */
.no-data,
.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

/* 修复表单中数字输入框宽度塌陷问题 */
.el-input-number {
  width: 100% !important;
}

.el-input-number .el-input {
  width: 100% !important;
}

.el-input-number .el-input__wrapper {
  width: 100% !important;
}

/* 优化表单布局间距 */
.el-form-item {
  margin-bottom: 16px !important;
}

/* 统计数字控件特殊样式 */
.el-row .el-col:nth-child(n) .el-form-item {
  margin-bottom: 12px;
}

.el-input-number .el-input__inner {
  text-align: center;
}

/* 对话框中的 Markdown 编辑器样式 */
.dialog-markdown-editor {
  height: 350px;
}

.dialog-markdown-editor .markdown-editor {
  height: 100%;
}

.dialog-markdown-editor .editor-container {
  min-height: 320px;
  height: 320px;
}

/* 对话框内边距样式 */
:deep(.el-dialog__body) {
  padding: 24px 32px !important;
}

/* 对话框底部按钮区域样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 8px;
}

.dialog-footer .el-button {
  min-width: 80px;
}
</style>