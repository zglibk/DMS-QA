<template>
  <div class="qualification-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2>人员资质管理</h2>
        <p class="desc">管理印刷、质检、实验等岗位人员的专业能力资质认证</p>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="handleAddPerson">新增人员</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card total">
          <el-icon class="stat-icon"><User /></el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalPersonnel || 0 }}</div>
            <div class="stat-label">资质人员</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card success">
          <el-icon class="stat-icon"><CircleCheck /></el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stats.validCertifications || 0 }}</div>
            <div class="stat-label">有效认证</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card warning">
          <el-icon class="stat-icon"><Warning /></el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stats.expiringSoon || 0 }}</div>
            <div class="stat-label">即将到期</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card danger">
          <el-icon class="stat-icon"><CircleClose /></el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stats.expiredCertifications || 0 }}</div>
            <div class="stat-label">已过期</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="姓名">
          <el-input v-model="searchForm.name" placeholder="输入姓名" clearable style="width: 120px;" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="部门">
          <el-tree-select v-model="searchForm.department" :data="departments" :props="{ value: 'label', label: 'label', children: 'children' }" placeholder="选择部门" check-strictly clearable style="width: 140px;" />
        </el-form-item>
        <el-form-item label="岗位类型">
          <el-select v-model="searchForm.positionType" placeholder="选择" clearable style="width: 120px;">
            <el-option label="A类-色彩关键" value="A" />
            <el-option label="B类-色彩相关" value="B" />
            <el-option label="C类-一般检验" value="C" />
            <el-option label="D类-非色彩" value="D" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择" clearable style="width: 100px;">
            <el-option label="合格" value="合格" />
            <el-option label="部分合格" value="部分合格" />
            <el-option label="待评估" value="待评估" />
            <el-option label="不合格" value="不合格" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 人员列表 -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" stripe border size="default" :header-cell-style="{ textAlign: 'center' }">
        <el-table-column prop="name" label="姓名" width="80" align="center">
          <template #default="{ row }">
            <span class="person-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="employeeNo" label="工号" width="90" align="center">
          <template #default="{ row }">
            <span class="employee-no">{{ row.employeeNo || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="部门" width="90" show-overflow-tooltip />
        <el-table-column prop="position" label="岗位" width="120" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.position || '-' }}</template>
        </el-table-column>
        <el-table-column prop="positionType" label="岗位类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.positionType" :type="positionTypeStyle(row.positionType).type" size="small" effect="light">
              {{ positionTypeStyle(row.positionType).short }}
            </el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        
        <!-- 资质概览：显示多个资质类型 -->
        <el-table-column label="资质认证概览" min-width="180">
          <template #default="{ row }">
            <div class="cert-tags" v-if="row.certifications && row.certifications.length > 0">
              <el-tooltip v-for="(cert, idx) in row.certifications.slice(0, 4)" :key="idx" placement="top" :show-after="300">
                <template #content>
                  <div class="cert-tooltip">
                    <div class="tooltip-title">{{ cert.typeName }}</div>
                    <div class="tooltip-row"><span>类别:</span> {{ cert.categoryName }}</div>
                    <div class="tooltip-row"><span>等级:</span> {{ cert.certLevel }}</div>
                    <div class="tooltip-row"><span>状态:</span> {{ cert.certStatus }}</div>
                    <div class="tooltip-row" v-if="cert.expiryDate">
                      <span>到期:</span> {{ formatDate(cert.expiryDate) }}
                      <em v-if="cert.daysUntilExpiry !== null && cert.daysUntilExpiry <= 30 && cert.daysUntilExpiry > 0" class="expiring-tip">({{ cert.daysUntilExpiry }}天后)</em>
                      <em v-if="cert.daysUntilExpiry !== null && cert.daysUntilExpiry <= 0" class="expired-tip">(已过期)</em>
                    </div>
                  </div>
                </template>
                <el-tag 
                  :type="getCertTagType(cert)" 
                  size="small"
                  effect="dark"
                  :class="['cert-tag', { 'is-expired': cert.certStatus === '已过期', 'is-expiring': cert.daysUntilExpiry !== null && cert.daysUntilExpiry <= 30 && cert.daysUntilExpiry > 0 && cert.certStatus !== '已过期' }]"
                >
                  <span class="cert-name">{{ (cert.typeName === 'FM100' ? '色觉' : (cert.typeName.length > 3 ? cert.typeName.substring(0, 3) : cert.typeName)) }}</span>
                  <span class="cert-level-badge">{{ cert.certLevel.substring(0, 1) }}</span>
                </el-tag>
              </el-tooltip>
              <el-tag v-if="row.certifications.length > 4" type="info" size="small" effect="dark" class="more-tag" @click="handleViewDetail(row)">
                +{{ row.certifications.length - 4 }}
              </el-tag>
            </div>
            <!-- 如果没有正式资质，但有最近的FM100测试记录，显示测试结果提示 -->
            <div v-else-if="row.fm100Diagnosis" class="cert-tags">
              <el-tag :type="getDiagnosisType(row.fm100Diagnosis)" size="small" effect="dark" class="cert-tag">
                <span class="cert-name">色觉</span>
                <span class="cert-level-badge">{{ getDiagnosisLabel(row.fm100Diagnosis) }}</span>
              </el-tag>
            </div>
            <span v-else class="no-cert">暂无资质</span>
          </template>
        </el-table-column>
        
        <!-- 资质统计 -->
        <el-table-column label="资质统计" width="110" align="center">
          <template #header>
            <el-tooltip content="有效 / 即将到期 / 已过期" placement="top">
              <span>资质统计 <el-icon style="font-size: 12px;"><QuestionFilled /></el-icon></span>
            </el-tooltip>
          </template>
          <template #default="{ row }">
            <div class="cert-stats">
              <span class="stat-valid">{{ row.validCertCount || 0 }}</span>
              <span class="stat-sep">/</span>
              <span class="stat-expiring">{{ row.expiringCount || 0 }}</span>
              <span class="stat-sep">/</span>
              <span class="stat-expired">{{ row.expiredCertCount || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="overallStatus" label="综合状态" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="statusStyle(row.overallStatus)" size="small" effect="dark">
              {{ row.overallStatus || '待评估' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="lastTestDate" label="最近考核" width="95" align="center">
          <template #default="{ row }">
            <span v-if="row.lastTestDate" class="date-text">{{ formatDate(row.lastTestDate) }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-tooltip content="查看详情" placement="top" :show-after="500">
                <el-button type="primary" link size="small" @click="handleViewDetail(row)">
                  <el-icon><View /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="添加认证" placement="top" :show-after="500">
                <el-button type="success" link size="small" @click="handleAddCert(row)">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top" :show-after="500">
                <el-button type="primary" link size="small" @click="handleEdit(row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top" :show-after="500">
                <el-button type="danger" link size="small" @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination 
          v-model:current-page="pagination.page" 
          v-model:page-size="pagination.pageSize" 
          :page-sizes="[5, 10, 20, 50]" 
          :total="pagination.total" 
          layout="total, sizes, prev, pager, next, jumper" 
          @size-change="fetchData" 
          @current-change="fetchData" 
        />
      </div>
    </el-card>

    <!-- 新增/编辑人员对话框 -->
    <el-dialog v-model="personDialog.visible" :title="personDialog.isEdit ? '编辑人员' : '新增人员'" width="580px" destroy-on-close>
      <el-form ref="personFormRef" :model="personForm" :rules="personRules" label-width="85px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="personForm.name" placeholder="输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工号">
              <el-input v-model="personForm.employeeNo" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="部门" prop="department">
              <el-tree-select v-model="personForm.department" :data="departments" :props="{ value: 'label', label: 'label', children: 'children' }" placeholder="选择部门" check-strictly style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位">
              <el-input v-model="personForm.position" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="岗位类型" prop="positionType">
              <el-select v-model="personForm.positionType" placeholder="选择" style="width: 100%;">
                <el-option label="A类-色彩关键" value="A" />
                <el-option label="B类-色彩相关" value="B" />
                <el-option label="C类-一般检验" value="C" />
                <el-option label="D类-非色彩" value="D" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入职日期">
              <el-date-picker v-model="personForm.hireDate" type="date" placeholder="选填" style="width: 100%;" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16" v-if="personDialog.isEdit">
          <el-col :span="12">
            <el-form-item label="综合状态">
              <el-select v-model="personForm.overallStatus" placeholder="选择" style="width: 100%;">
                <el-option label="合格" value="合格" />
                <el-option label="部分合格" value="部分合格" />
                <el-option label="待评估" value="待评估" />
                <el-option label="不合格" value="不合格" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="personForm.remarks" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="personDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitPerson" :loading="personDialog.loading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 人员资质详情对话框 -->
    <el-dialog v-model="detailDialog.visible" title="人员资质详情" width="960px" destroy-on-close top="4vh">
      <div v-loading="detailDialog.loading" class="detail-content">
        <!-- 基本信息 -->
        <el-descriptions :column="4" border size="small" class="detail-desc">
          <el-descriptions-item label="姓名">
            <span class="detail-name">{{ detailData.name }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="工号">{{ detailData.employeeNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ detailData.department || '-' }}</el-descriptions-item>
          <el-descriptions-item label="岗位">{{ detailData.position || '-' }}</el-descriptions-item>
          <el-descriptions-item label="岗位类型">
            <el-tag v-if="detailData.positionType" :type="positionTypeStyle(detailData.positionType).type" size="small">
              {{ positionTypeStyle(detailData.positionType).label }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="入职日期">{{ detailData.hireDate ? formatDate(detailData.hireDate) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="综合状态">
            <el-tag :type="statusStyle(detailData.overallStatus)" size="small">{{ detailData.overallStatus || '待评估' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailData.createdAt ? formatDateTime(detailData.createdAt) : '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-descriptions v-if="detailData.remarks" :column="1" border size="small" class="detail-desc" style="margin-top: -1px;">
          <el-descriptions-item label="备注">{{ detailData.remarks }}</el-descriptions-item>
        </el-descriptions>

        <!-- 资质认证列表 -->
        <div class="section-title">
          <span>资质认证</span>
          <el-button type="primary" size="small" :icon="Plus" @click="handleAddCert(detailData)">添加认证</el-button>
        </div>
        
        <div v-if="groupedCertifications.length > 0" class="cert-groups">
          <div v-for="group in groupedCertifications" :key="group.category" class="cert-group">
            <div class="group-header">
              <el-tag :type="categoryTagType(group.category)" size="small" effect="dark">{{ group.category }}</el-tag>
              <span class="group-count">{{ group.items.length }} 项</span>
            </div>
            <el-table :data="group.items" stripe size="small" class="cert-table">
              <el-table-column prop="typeName" label="资质名称" width="110" />
              <el-table-column prop="certLevel" label="等级" width="65" align="center">
                <template #default="{ row }">
                  <el-tag :type="certLevelType(row.certLevel)" size="small">{{ row.certLevel }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="certNo" label="证书编号" width="100" show-overflow-tooltip>
                <template #default="{ row }">{{ row.certNo || '-' }}</template>
              </el-table-column>
              <el-table-column prop="certDate" label="认证日期" width="95">
                <template #default="{ row }">{{ formatDate(row.certDate) }}</template>
              </el-table-column>
              <el-table-column prop="expiryDate" label="到期日期" width="120">
                <template #default="{ row }">
                  <template v-if="row.expiryDate">
                    <span :class="{ 'text-warning': row.daysUntilExpiry > 0 && row.daysUntilExpiry <= 30, 'text-danger': row.daysUntilExpiry <= 0 }">
                      {{ formatDate(row.expiryDate) }}
                    </span>
                    <el-tag v-if="row.daysUntilExpiry > 0 && row.daysUntilExpiry <= 30" type="warning" size="small" class="days-tag">{{ row.daysUntilExpiry }}天</el-tag>
                    <el-tag v-else-if="row.daysUntilExpiry <= 0" type="danger" size="small" class="days-tag">已过期</el-tag>
                  </template>
                  <span v-else class="text-muted">长期</span>
                </template>
              </el-table-column>
              <el-table-column prop="certStatus" label="状态" width="65" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.certStatus === '有效' ? 'success' : 'danger'" size="small">{{ row.certStatus }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="issuer" label="发证机构" width="90" show-overflow-tooltip>
                <template #default="{ row }">{{ row.issuer || '-' }}</template>
              </el-table-column>
              <el-table-column label="附件" width="50" align="center">
                <template #default="{ row }">
                  <el-link v-if="row.attachmentPath" type="primary" :href="getAttachmentUrl(row.attachmentPath)" target="_blank" :underline="false">
                    <el-icon><Document /></el-icon>
                  </el-link>
                  <span v-else class="text-muted">-</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="55" align="center">
                <template #default="{ row }">
                  <el-button type="danger" link size="small" @click="deleteCert(row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        <el-empty v-else description="暂无资质认证记录" :image-size="50" />

        <!-- 考核记录 -->
        <div class="section-title"><span>最近考核记录</span></div>
        <el-table v-if="detailData.testRecords && detailData.testRecords.length > 0" :data="detailData.testRecords" stripe size="small" max-height="200" class="test-table">
          <el-table-column prop="typeName" label="考核项目" width="100" />
          <el-table-column prop="testType" label="类型" width="65">
            <template #default="{ row }">{{ testTypeLabel(row.testType) }}</template>
          </el-table-column>
          <el-table-column prop="testDate" label="日期" width="95">
            <template #default="{ row }">{{ formatDate(row.testDate) }}</template>
          </el-table-column>
          <el-table-column prop="score" label="得分" width="60" align="center">
            <template #default="{ row }">{{ row.score ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="grade" label="等级" width="70" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.grade" :type="gradeTagType(row.grade)" size="small">{{ row.grade }}</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="testResult" label="结果" width="60" align="center">
            <template #default="{ row }">
              <el-tag :type="row.testResult === '通过' ? 'success' : 'danger'" size="small">{{ row.testResult }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="时长" width="60" align="center">
            <template #default="{ row }">{{ row.duration ? row.duration + '分' : '-' }}</template>
          </el-table-column>
          <el-table-column prop="examiner" label="考核人" width="80">
            <template #default="{ row }">{{ row.examiner || '-' }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无考核记录" :image-size="50" />
      </div>
    </el-dialog>

    <!-- 添加资质认证对话框 -->
    <el-dialog v-model="certDialog.visible" title="添加资质认证" width="600px" destroy-on-close>
      <el-form ref="certFormRef" :model="certForm" :rules="certRules" label-width="90px">
        <el-form-item label="人员">
          <el-input :value="certDialog.personnelName" disabled />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="资质类别" prop="categoryCode">
              <el-select v-model="certForm.categoryCode" placeholder="选择类别" style="width: 100%;" @change="handleCategoryChange">
                <el-option v-for="cat in categoryOptions" :key="cat.value" :label="cat.label" :value="cat.value">
                  <span>{{ cat.label }}</span>
                  <span style="float: right; color: #909399; font-size: 12px;">{{ cat.count }}种</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资质类型" prop="qualificationTypeId">
              <el-select v-model="certForm.qualificationTypeId" placeholder="选择资质" style="width: 100%;" :disabled="!certForm.categoryCode" @change="handleTypeChange">
                <el-option v-for="t in filteredTypes" :key="t.id" :label="t.typeName" :value="t.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-alert v-if="selectedType" type="info" :closable="false" class="type-info">
          <template #title>
            <span>{{ selectedType.typeName }}</span>
            <el-tag v-if="selectedType.requiresTest" type="warning" size="small" style="margin-left: 8px;">需考核</el-tag>
          </template>
          <template #default>
            <div class="type-desc">{{ selectedType.description || '暂无描述' }}</div>
            <div class="type-meta">
              有效期: {{ selectedType.validityPeriod ? selectedType.validityPeriod + '个月' : '长期' }} | 
              等级: {{ selectedType.certLevels || '无' }}
            </div>
          </template>
        </el-alert>
        
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="认证等级" prop="certLevel">
              <el-select v-model="certForm.certLevel" placeholder="选择等级" style="width: 100%;">
                <el-option v-for="lv in certLevelOptions" :key="lv" :label="lv" :value="lv" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="证书编号">
              <el-input v-model="certForm.certNo" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="认证日期" prop="certDate">
              <el-date-picker v-model="certForm.certDate" type="date" placeholder="选择" style="width: 100%;" value-format="YYYY-MM-DD" @change="calcExpiryDate" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="到期日期">
              <el-date-picker v-model="certForm.expiryDate" type="date" placeholder="自动计算" style="width: 100%;" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="发证机构">
          <el-input v-model="certForm.issuer" placeholder="选填" />
        </el-form-item>
        <el-form-item label="证书附件">
          <el-upload action="#" :auto-upload="false" :limit="1" :on-change="handleFileChange" :on-remove="handleFileRemove" :file-list="fileList" accept=".jpg,.jpeg,.png,.pdf">
            <template #trigger>
              <el-button :icon="Upload" size="small">选择文件</el-button>
            </template>
            <template #tip>
              <div class="upload-tip">支持 jpg/png/pdf，不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="certForm.remarks" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="certDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitCert" :loading="certDialog.loading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, View, Edit, Delete, User, CircleCheck, Warning, CircleClose, Document, Upload, QuestionFilled } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'

// ==================== 数据定义 ====================
const stats = ref({})
const searchForm = reactive({ name: '', department: '', positionType: '', status: '' })
const departments = ref([])
const tableData = ref([])
const loading = ref(false)
const pagination = reactive({ page: 1, pageSize: 5, total: 0 })

const personDialog = reactive({ visible: false, isEdit: false, loading: false })
const personFormRef = ref()
const personForm = reactive({
  id: null, employeeNo: '', name: '', department: '', position: '', 
  positionType: '', hireDate: null, overallStatus: '待评估', remarks: ''
})
const personRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  positionType: [{ required: true, message: '请选择岗位类型', trigger: 'change' }]
}

const detailDialog = reactive({ visible: false, loading: false })
const detailData = ref({})

const certDialog = reactive({ visible: false, loading: false, personnelId: null, personnelName: '' })
const certFormRef = ref()
const certFile = ref(null)
const fileList = ref([])
const certForm = reactive({
  categoryCode: '', qualificationTypeId: null, certLevel: '', certNo: '', 
  certDate: null, expiryDate: null, issuer: '', remarks: ''
})
const certRules = {
  categoryCode: [{ required: true, message: '请选择类别', trigger: 'change' }],
  qualificationTypeId: [{ required: true, message: '请选择资质', trigger: 'change' }],
  certLevel: [{ required: true, message: '请选择等级', trigger: 'change' }],
  certDate: [{ required: true, message: '请选择日期', trigger: 'change' }]
}

const qualificationTypes = ref([])

// ==================== 计算属性 ====================
const groupedCertifications = computed(() => {
  const certs = detailData.value.certifications || []
  const groups = {}
  certs.forEach(c => {
    const cat = c.categoryName || '其他'
    if (!groups[cat]) groups[cat] = { category: cat, items: [] }
    groups[cat].items.push(c)
  })
  return Object.values(groups)
})

const categoryOptions = computed(() => {
  const cats = {}
  qualificationTypes.value.forEach(t => {
    if (!cats[t.categoryCode]) cats[t.categoryCode] = { value: t.categoryCode, label: t.categoryName, count: 0 }
    cats[t.categoryCode].count++
  })
  return Object.values(cats)
})

const filteredTypes = computed(() => qualificationTypes.value.filter(t => t.categoryCode === certForm.categoryCode))
const selectedType = computed(() => qualificationTypes.value.find(t => t.id === certForm.qualificationTypeId))
const certLevelOptions = computed(() => {
  if (!selectedType.value || !selectedType.value.certLevels) return ['初级', '中级', '高级', '合格']
  return selectedType.value.certLevels.split(',').map(s => s.trim())
})

// ==================== 生命周期 ====================
onMounted(async () => {
  await Promise.all([fetchDepartments(), fetchQualificationTypes(), fetchStatistics()])
  await fetchData()
})

// ==================== API 调用 ====================
const fetchStatistics = async () => {
  try {
    const res = await apiService.get('/qualification/statistics/overview')
    if (res.data.success) stats.value = res.data.data
  } catch (e) { console.error('获取统计失败:', e) }
}

const fetchDepartments = async () => {
  try {
    const res = await apiService.get('/departments/options/list')
    if (res.data.success) departments.value = res.data.data
  } catch (e) { console.error('获取部门失败:', e) }
}

const fetchQualificationTypes = async () => {
  try {
    const res = await apiService.get('/qualification/types', { params: { active: true } })
    if (res.data.success) qualificationTypes.value = res.data.data
  } catch (e) { console.error('获取资质类型失败:', e) }
}

const fetchData = async () => {
  try {
    loading.value = true
    const params = { page: pagination.page, pageSize: pagination.pageSize, ...searchForm }
    Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
    const res = await apiService.get('/qualification/personnel', { params })
    if (res.data.success) { 
      tableData.value = res.data.data || []
      pagination.total = res.data.total || 0 
    }
  } catch (e) { 
    ElMessage.error('获取数据失败') 
  } finally { 
    loading.value = false 
  }
}

// ==================== 搜索/重置 ====================
const handleSearch = () => { pagination.page = 1; fetchData() }
const handleReset = () => { 
  Object.assign(searchForm, { name: '', department: '', positionType: '', status: '' })
  pagination.page = 1; fetchData() 
}

// ==================== 人员管理 ====================
const handleAddPerson = () => {
  personDialog.isEdit = false
  Object.assign(personForm, { id: null, employeeNo: '', name: '', department: '', position: '', positionType: '', hireDate: null, overallStatus: '待评估', remarks: '' })
  personDialog.visible = true
}

const handleEdit = (row) => {
  personDialog.isEdit = true
  Object.assign(personForm, { 
    id: row.id, employeeNo: row.employeeNo || '', name: row.name, department: row.department || '',
    position: row.position || '', positionType: row.positionType || '',
    hireDate: row.hireDate ? row.hireDate.split('T')[0] : null,
    overallStatus: row.overallStatus || '待评估', remarks: row.remarks || ''
  })
  personDialog.visible = true
}

const submitPerson = async () => {
  try {
    await personFormRef.value?.validate()
    personDialog.loading = true
    const payload = {
      employeeNo: personForm.employeeNo || null, name: personForm.name, department: personForm.department,
      position: personForm.position || null, positionType: personForm.positionType,
      hireDate: personForm.hireDate || null, remarks: personForm.remarks || null
    }
    if (personDialog.isEdit) {
      payload.overallStatus = personForm.overallStatus
      await apiService.put(`/qualification/personnel/${personForm.id}`, payload)
    } else {
      await apiService.post('/qualification/personnel', payload)
    }
    ElMessage.success(personDialog.isEdit ? '更新成功' : '新增成功')
    personDialog.visible = false
    fetchData(); fetchStatistics()
  } catch (e) { 
    if (e !== false) ElMessage.error(e.response?.data?.message || '保存失败') 
  } finally { 
    personDialog.loading = false 
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除 ${row.name} 的资质记录？`, '提示', { type: 'warning' })
    await apiService.delete(`/qualification/personnel/${row.id}`)
    ElMessage.success('删除成功')
    fetchData(); fetchStatistics()
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}

// ==================== 详情查看 ====================
const handleViewDetail = async (row) => {
  detailDialog.visible = true
  detailDialog.loading = true
  try {
    const res = await apiService.get(`/qualification/personnel/${row.id}`)
    if (res.data.success) detailData.value = res.data.data
  } catch (e) { ElMessage.error('获取详情失败') }
  finally { detailDialog.loading = false }
}

// ==================== 资质认证管理 ====================
const handleAddCert = (row) => {
  certDialog.personnelId = row.id
  certDialog.personnelName = row.name
  Object.assign(certForm, { categoryCode: '', qualificationTypeId: null, certLevel: '', certNo: '', certDate: new Date().toISOString().split('T')[0], expiryDate: null, issuer: '', remarks: '' })
  certFile.value = null; fileList.value = []
  certDialog.visible = true
}

const handleCategoryChange = () => { certForm.qualificationTypeId = null; certForm.certLevel = '' }
const handleTypeChange = () => { certForm.certLevel = ''; calcExpiryDate() }

const calcExpiryDate = () => {
  if (certForm.certDate && selectedType.value && selectedType.value.validityPeriod > 0) {
    const d = new Date(certForm.certDate)
    d.setMonth(d.getMonth() + selectedType.value.validityPeriod)
    certForm.expiryDate = d.toISOString().split('T')[0]
  }
}

const handleFileChange = (file) => { certFile.value = file.raw }
const handleFileRemove = () => { certFile.value = null }

const submitCert = async () => {
  try {
    await certFormRef.value?.validate()
    certDialog.loading = true
    const formData = new FormData()
    formData.append('personnelId', certDialog.personnelId)
    formData.append('qualificationTypeId', certForm.qualificationTypeId)
    formData.append('certLevel', certForm.certLevel)
    formData.append('certDate', certForm.certDate)
    if (certForm.expiryDate) formData.append('expiryDate', certForm.expiryDate)
    if (certForm.certNo) formData.append('certNo', certForm.certNo)
    if (certForm.issuer) formData.append('issuer', certForm.issuer)
    if (certForm.remarks) formData.append('remarks', certForm.remarks)
    if (certFile.value) formData.append('attachment', certFile.value)
    await apiService.post('/qualification/certifications', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    ElMessage.success('添加成功')
    certDialog.visible = false
    if (detailDialog.visible && detailData.value.id) {
      const res = await apiService.get(`/qualification/personnel/${detailData.value.id}`)
      if (res.data.success) detailData.value = res.data.data
    }
    fetchData(); fetchStatistics()
  } catch (e) { if (e !== false) ElMessage.error(e.response?.data?.message || '添加失败') }
  finally { certDialog.loading = false }
}

const deleteCert = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除该资质认证？', '提示', { type: 'warning' })
    await apiService.delete(`/qualification/certifications/${id}`)
    ElMessage.success('删除成功')
    if (detailDialog.visible && detailData.value.id) {
      const res = await apiService.get(`/qualification/personnel/${detailData.value.id}`)
      if (res.data.success) detailData.value = res.data.data
    }
    fetchData(); fetchStatistics()
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}

// ==================== 样式函数 ====================
const positionTypeStyle = t => ({ 
  A: { type: 'danger', label: 'A类-色彩关键', short: 'A类' }, 
  B: { type: 'warning', label: 'B类-色彩相关', short: 'B类' }, 
  C: { type: 'info', label: 'C类-一般检验', short: 'C类' }, 
  D: { type: '', label: 'D类-非色彩', short: 'D类' } 
}[t] || { type: '', label: t || '-', short: '-' })

const statusStyle = s => ({ '合格': 'success', '部分合格': 'warning', '待评估': 'info', '不合格': 'danger' }[s] || 'info')
const categoryTagType = c => ({ '生产技能': '', '质量检验': 'success', '质量管理': 'warning', '专项能力': 'danger', '实验检测': 'info' }[c] || '')
const certLevelType = l => ({ '高级': 'danger', '中级': 'warning', '初级': 'info', '合格': 'success', '优异': 'success', '良好': 'success' }[l] || '')
const gradeTagType = g => ({ '优异': 'success', '良好': 'success', '合格': 'success', '通过': 'success', '需关注': 'warning', '不合格': 'danger', '未通过': 'danger' }[g] || '')
const getDiagnosisType = d => {
  if (d === 'Normal' || d === 'Superior Discrimination') return 'success'
  if (d === 'Low Discrimination') return 'warning'
  if (d && d.includes('Deficiency')) return 'danger'
  return 'info'
}
const testTypeLabel = t => ({ WRITTEN: '笔试', PRACTICAL: '实操', FM100: 'FM100', ONLINE: '在线' }[t] || t || '-')

const getCertTagType = (cert) => {
  if (cert.certStatus === '已过期') return 'info'
  if (cert.daysUntilExpiry !== null && cert.daysUntilExpiry <= 30 && cert.daysUntilExpiry > 0) return 'warning'
  return certLevelType(cert.certLevel) || 'success'
}

const getDiagnosisLabel = (val) => {
  const map = {
    'Normal': '正常',
    'Superior Discrimination': '优秀分辨力',
    'Protan Deficiency': '红色弱',
    'Deutan Deficiency': '绿色弱',
    'Tritan Deficiency': '蓝色弱',
    'Low Discrimination': '低分辨力'
  }
  return map[val] || val
}

const formatDate = d => {  
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` 
}

const formatDateTime = d => { 
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` 
}

const getAttachmentUrl = p => p ? `${import.meta.env.VITE_API_BASE_URL || ''}/uploads/${p}` : ''
</script>

<style scoped>
.qualification-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; font-size: 18px; color: #303133; }
.page-header .desc { margin: 0; font-size: 13px; color: #909399; }

/* 统计卡片 */
.stat-row { margin-bottom: 16px; }
.stat-card { display: flex; align-items: center; padding: 14px 16px; border-radius: 8px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.stat-card .stat-icon { font-size: 32px; margin-right: 12px; }
.stat-card .stat-value { font-size: 24px; font-weight: 600; line-height: 1.2; }
.stat-card .stat-label { font-size: 12px; color: #909399; margin-top: 2px; }
.stat-card.total .stat-icon { color: #409eff; }
.stat-card.success .stat-icon { color: #67c23a; }
.stat-card.warning .stat-icon { color: #e6a23c; }
.stat-card.danger .stat-icon { color: #f56c6c; }

.filter-card { margin-bottom: 12px; }
.filter-card :deep(.el-card__body) { padding: 14px 16px; }
.table-card :deep(.el-card__body) { padding: 12px 16px; }
.pagination-wrap { margin-top: 12px; display: flex; justify-content: center; }

/* 表格样式 */
.employee-no { font-family: monospace; color: #606266; }
.person-name { font-weight: 500; color: #303133; }
.text-muted { color: #c0c4cc; font-size: 12px; }
.text-warning { color: #e6a23c; }
.text-danger { color: #f56c6c; }
.date-text { font-size: 13px; color: #606266; }
.no-cert { color: #c0c4cc; font-size: 12px; font-style: italic; }

/* 资质标签样式 */
.cert-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.cert-tag { cursor: default; padding: 0 6px; }
.cert-tag .cert-name { font-size: 12px; }
.cert-tag .cert-level-badge { 
  display: inline-block; margin-left: 3px; padding: 0 4px; 
  background: rgba(255,255,255,0.2); border-radius: 2px; font-size: 10px; 
}
.cert-tag.is-expired { opacity: 0.5; text-decoration: line-through; }
.cert-tag.is-expiring { animation: blink 1.5s ease-in-out infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.more-tag { cursor: pointer; }
.more-tag:hover { background-color: #409eff; color: #fff; }

/* 资质统计 */
.cert-stats { display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; }
.stat-valid { color: #67c23a; }
.stat-expiring { color: #e6a23c; }
.stat-expired { color: #f56c6c; }
.stat-sep { color: #dcdfe6; margin: 0 3px; }

/* 操作按钮 */
.action-btns { display: flex; justify-content: center; gap: 4px; }
.action-btns .el-button { padding: 4px 4px; margin-left: 0; }
.action-btns .el-icon { font-size: 14px; }

/* Tooltip样式 */
.cert-tooltip { line-height: 1.6; }
.cert-tooltip .tooltip-title { font-weight: 600; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px; }
.cert-tooltip .tooltip-row span { color: rgba(255,255,255,0.7); margin-right: 4px; }
.cert-tooltip .expiring-tip { color: #e6a23c; margin-left: 4px; }
.cert-tooltip .expired-tip { color: #f56c6c; margin-left: 4px; }

/* 详情对话框 */
.detail-content { max-height: 70vh; overflow-y: auto; }
.detail-desc { margin-bottom: 0; }
.detail-name { font-weight: 600; font-size: 14px; }
.section-title { 
  display: flex; justify-content: space-between; align-items: center; 
  margin: 16px 0 10px; font-size: 14px; font-weight: 600; color: #303133; 
}
.section-title span { padding-left: 8px; border-left: 3px solid #409eff; }

.cert-groups { margin-bottom: 12px; }
.cert-group { margin-bottom: 12px; }
.group-header { 
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px; 
  padding: 4px 10px; background: #f5f7fa; border-radius: 4px; 
}
.group-count { font-size: 12px; color: #909399; }
.cert-table, .test-table { border-radius: 4px; }
.days-tag { margin-left: 4px; transform: scale(0.9); }

/* 认证对话框 */
.type-info { margin-bottom: 12px; }
.type-info :deep(.el-alert__title) { font-size: 14px; font-weight: 600; }
.type-desc { font-size: 12px; color: #606266; margin-bottom: 4px; }
.type-meta { font-size: 11px; color: #909399; }
.upload-tip { font-size: 11px; color: #909399; margin-top: 4px; }
</style>
