<!--
  DMS-QA Quality Management System
  Copyright (c) 2024-2025 David Lee (zglibk)

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

<template>
  <div class="home-bg">
    <!-- 顶部导航栏 -->
    <div class="home-header">
        <!-- 左侧logo及系统名 -->
        <div class="header-left">
          <img :src="siteConfig?.logoBase64Img || '/logo.png'" alt="logo" class="logo" @error="handleLogoError" />
          <span class="logo-text">{{ siteConfig?.siteName || '质量数据管理系统' }}</span>
        </div>
        <!-- 中间菜单栏 -->
        <div class="header-center">
          <div class="nav-menu-wrap">
            <el-menu mode="horizontal" :default-active="activeMenu" @select="handleMenuSelect" class="nav-menu" :ellipsis="false">
              <el-menu-item index="home">首页</el-menu-item>
              <el-menu-item index="complaint">投诉管理</el-menu-item>
              <el-menu-item index="stats">统计分析</el-menu-item>
            </el-menu>
          </div>
        </div>
        <!-- 右侧用户区 -->
        <div class="header-right">  
          <el-button type="primary" text class="admin-btn" @click="goAdmin">登录后台</el-button>
          <el-avatar :size="32" :src="user.Avatar" class="avatar-icon" @click="goProfile">
            <template v-if="!user.Avatar">
              <el-icon><User /></el-icon>
            </template>
          </el-avatar>
          <span class="username" @click="goProfile">{{ user.Username }}</span>
          <el-dropdown>
            <span class="el-dropdown-link">
              <el-icon><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goProfile">个人中心</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
    </div>

    <!-- 内容区 -->
    <div class="home-main">
        <!-- 统计控制区 -->
        <div class="stats-control">
          <div class="stats-control-left">
            <el-date-picker
              v-model="selectedMonth"
              type="month"
              placeholder="选择月份"
              format="YYYY年MM月"
              value-format="YYYY-MM"
              size="default"
              @change="handleMonthChange"
              :clearable="false"
              style="width: 160px;"
            />
          </div>
          <div class="stats-control-right">
            <el-switch
              v-model="showTodayStats"
              :active-text="isCurrentMonth ? '显示今日统计' : '仅当前月份可用'"
              :inactive-text="isCurrentMonth ? '隐藏今日统计' : '仅当前月份可用'"
              @change="handleTodayStatsToggle"
              :disabled="!isCurrentMonth"
            />
          </div>
        </div>

        <!-- 上部统计卡片区 -->
      <div class="stat-row-flex">
        <!-- 加载状态 -->
        <div v-if="statsLoading" class="stat-card loading-card">
          <div class="stat-title">加载中...</div>
          <div class="stat-value"><el-icon class="is-loading"><Loading /></el-icon></div>
        </div>

        <!-- 统计卡片（数据加载完成后显示） -->
        <template v-else>
          <!-- 今日投诉卡片 -->
          <div v-if="shouldShowTodayCard" class="stat-card card-today">
            <div class="stat-title">今日投诉</div>
            <div class="stat-value"><b>{{ todayCount }}</b></div>
          </div>

          <!-- 选定月份总投诉卡片 -->
          <div v-if="showMonthCount" class="stat-card card-month">
            <div class="stat-title">{{ selectedMonthText }}总投诉</div>
            <div class="stat-value"><b>{{ monthCount }}</b></div>
          </div>

          <!-- 各单位统计卡片 -->
          <div
            v-for="(item, idx) in statUnits"
            :key="item.unit + idx"
            :class="['stat-card', 'unit-card', getUnitCardClass(item.type, idx)]"
          >
            <div class="stat-title">
              {{ item.unit }}
              <el-tag
                size="small"
                :type="item.type === 'workshop' ? 'primary' : 'success'"
                style="margin-left: 4px; font-size: 10px;"
              >
                {{ item.type === 'workshop' ? '车间' : '部门' }}
              </el-tag>
            </div>
            <div class="stat-value" style="display: flex; justify-content: center; align-items: center; gap: 8px;">
              <span>内诉: <b>{{ item.inner }}</b></span>
              <span>|</span>
              <span>客诉: <b>{{ item.outer }}</b></span>
            </div>
          </div>
        </template>
      </div>

      <!-- 中部左右结构 -->
      <div class="middle-row">
        <div class="table-container">
          <!-- 历史投诉记录表格卡片 -->
          <el-card class="table-card complaint-table-card">
            <template #header>
              <div class="table-header">
                <div class="table-title">
                  <el-icon><Document /></el-icon>
                  <span>历史投诉记录</span>
                </div>
                <div class="table-actions">
                  <el-input
                    v-model="searchKeyword"
                    placeholder="搜索客户、工单号、产品名称..."
                    clearable
                    style="width: 280px;"
                    @keyup.enter="handleSimpleSearch"
                    @clear="handleSimpleSearch"
                  >
                    <template #append>
                      <el-button :icon="Search" @click="handleSimpleSearch" />
                    </template>
                  </el-input>
                  <el-button type="primary" @click="router.push('/add')" style="margin-left: 12px;">
                    <el-icon><Plus /></el-icon>
                    新增投诉
                  </el-button>
                  <el-button type="success" @click="showExportDialog = true" style="margin-left: 8px;">
                    <el-icon><ArrowDown /></el-icon>
                    导出Excel
                  </el-button>
                </div>
              </div>
            </template>

            <el-table
              :data="tableData"
              style="width: 100%;"
              stripe
              :loading="tableLoading"
              empty-text="暂无投诉记录"
            >
              <el-table-column label="#" type="index" width="60" :index="(index) => (page - 1) * pageSize + index + 1" />
              <el-table-column prop="Date" label="日期" width="110" sortable>
                <template #default="scope">
                  <el-tag type="info" size="small">
                    {{ scope.row.Date ? (scope.row.Date.length > 10 ? scope.row.Date.slice(0, 10) : scope.row.Date) : '' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="Customer" label="客户编号" width="120" show-overflow-tooltip />
              <el-table-column prop="OrderNo" label="工单号" width="130" show-overflow-tooltip />
              <el-table-column prop="ProductName" label="产品名称" width="140" show-overflow-tooltip />
              <el-table-column prop="Workshop" label="发生车间" width="110">
                <template #default="scope">
                  <el-tag size="small" :type="getWorkshopTagType(scope.row.Workshop)">
                    {{ scope.row.Workshop }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="ComplaintCategory" label="投诉类别" width="110">
                <template #default="scope">
                  <el-tag size="small" :type="scope.row.ComplaintCategory === '客诉' ? 'danger' : 'warning'">
                    {{ scope.row.ComplaintCategory }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="DefectiveCategory" label="不良类别" width="120" show-overflow-tooltip />
              <el-table-column prop="DefectiveItem" label="不良项" width="120" show-overflow-tooltip />
              <el-table-column prop="DefectiveDescription" label="不良描述" width="150" show-overflow-tooltip />
              <el-table-column prop="MainDept" label="主责部门" width="110" show-overflow-tooltip />
              <el-table-column prop="MainPerson" label="主责人" width="100" show-overflow-tooltip />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button type="primary" :icon="View" size="small" @click="viewDetail(scope.row)">
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页器 -->
            <div class="table-footer">
              <el-pagination
                background
                layout="total, sizes, prev, pager, next, jumper"
                :total="total"
                :page-size="pageSize"
                :current-page="page"
                :page-sizes="pageSizes"
                @size-change="handleSizeChange"
                @current-change="handlePageChange"
              />
            </div>
          </el-card>
          <!-- 统计分析图表卡片 -->
          <el-card class="chart-card">
            <div class="chart-title">统计分析图表</div>
            <!-- 图表筛选条件区 -->
            <div class="chart-filter-row">
              <el-form :inline="true" size="small" @submit.prevent>
                <el-form-item label="部门">
                  <el-select v-model="chartFilter.department" placeholder="请选择部门" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.departments" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="车间">
                  <el-select v-model="chartFilter.workshop" placeholder="请选择车间" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.workshops" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="不良项">
                  <el-select v-model="chartFilter.defectiveItem" placeholder="请选择不良项" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.defectiveItems" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="日期">
                  <el-date-picker v-model="chartFilter.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:220px" @change="fetchChartData" />
                </el-form-item>
              </el-form>
            </div>
            <!-- 图表区 -->
            <div class="chart-content-flex">
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('柱形图') }}</div><div class="chart-ec" id="barChart"></div></div>
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('趋势图') }}</div><div class="chart-ec" id="lineChart"></div></div>
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('占比分析图') }}</div><div class="chart-ec" id="roseChart"></div></div>
            </div>
          </el-card>
        </div>
        <!-- 右侧高级查询卡片 -->
        <div :span="4">
          <el-card class="query-card">
            <template #header>
              <div class="query-header">
                <el-icon><Search /></el-icon>
                <span>高级查询</span>
              </div>
            </template>

            <el-form :model="advancedQuery" label-width="70px" size="small" class="advanced-form">
              <!-- 客户查询 -->
              <el-form-item label="客户">
                <el-input
                  v-model="advancedQuery.customer"
                  placeholder="输入客户名称"
                  clearable
                />
              </el-form-item>

              <!-- 工单号查询 -->
              <el-form-item label="工单号">
                <el-input
                  v-model="advancedQuery.orderNo"
                  placeholder="输入工单号"
                  clearable
                />
              </el-form-item>

              <!-- 产品名称查询 -->
              <el-form-item label="产品名称">
                <el-input
                  v-model="advancedQuery.productName"
                  placeholder="输入产品名称"
                  clearable
                />
              </el-form-item>

              <!-- 车间查询 -->
              <el-form-item label="车间">
                <el-select
                  v-model="advancedQuery.workshop"
                  placeholder="选择或输入车间"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="workshop in workshopOptions"
                    :key="workshop"
                    :label="workshop"
                    :value="workshop"
                  />
                </el-select>
              </el-form-item>

              <!-- 投诉类别 -->
              <el-form-item label="投诉类别">
                <el-select
                  v-model="advancedQuery.complaintCategory"
                  placeholder="选择或输入投诉类别"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="category in complaintCategoryOptions"
                    :key="category"
                    :label="category"
                    :value="category"
                  />
                </el-select>
              </el-form-item>

              <!-- 客诉类型 -->
              <el-form-item label="客诉类型">
                <el-select
                  v-model="advancedQuery.customerComplaintType"
                  placeholder="选择或输入客诉类型"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="type in customerComplaintTypeOptions"
                    :key="type"
                    :label="type"
                    :value="type"
                  />
                </el-select>
              </el-form-item>

              <!-- 不良类别 -->
              <el-form-item label="不良类别">
                <el-select
                  v-model="advancedQuery.defectiveCategory"
                  placeholder="选择或输入不良类别"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="category in defectiveCategoryOptions"
                    :key="category"
                    :label="category"
                    :value="category"
                  />
                </el-select>
              </el-form-item>

              <!-- 主责部门 -->
              <el-form-item label="主责部门">
                <el-select
                  v-model="advancedQuery.mainDept"
                  placeholder="选择或输入主责部门"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="dept in departmentOptions"
                    :key="dept"
                    :label="dept"
                    :value="dept"
                  />
                </el-select>
              </el-form-item>

              <!-- 主责人 -->
              <el-form-item label="主责人">
                <el-select
                  v-model="advancedQuery.mainPerson"
                  placeholder="选择或输入主责人"
                  clearable
                  filterable
                  allow-create
                  default-first-option
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="person in personOptions"
                    :key="person"
                    :label="person"
                    :value="person"
                  />
                </el-select>
              </el-form-item>

              <!-- 日期范围 -->
              <el-form-item label="日期">
                <el-date-picker
                  v-model="advancedQuery.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  size="small"
                />
              </el-form-item>

              <!-- 不良率范围 -->
              <el-form-item label="不良率">
                <div class="rate-range">
                  <el-input-number
                    v-model="advancedQuery.defectiveRateMin"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="最小值"
                    style="width: 70px"
                    size="small"
                  />
                  <span style="margin: 0 8px; color: #909399;">-</span>
                  <el-input-number
                    v-model="advancedQuery.defectiveRateMax"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="最大值"
                    style="width: 70px"
                    size="small"
                  />
                  <span style="margin-left: 4px; color: #909399; font-size: 12px;">%</span>
                </div>
              </el-form-item>

              <!-- 退货状态 -->
              <el-form-item label="退货状态">
                <el-select
                  v-model="advancedQuery.returnGoods"
                  placeholder="选择退货状态"
                  clearable
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option label="已退货" value="1" />
                  <el-option label="未退货" value="0" />
                </el-select>
              </el-form-item>

              <!-- 补印状态 -->
              <el-form-item label="补印状态">
                <el-select
                  v-model="advancedQuery.isReprint"
                  placeholder="选择补印状态"
                  clearable
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option label="已补印" value="1" />
                  <el-option label="未补印" value="0" />
                </el-select>
              </el-form-item>

              <!-- 操作按钮 -->
              <el-form-item>
                <div class="query-actions">
                  <el-button
                    type="primary"
                    size="small"
                    @click="handleAdvancedQuery"
                    :loading="tableLoading"
                  >
                    <el-icon><Search /></el-icon>
                    查询
                  </el-button>
                  <el-button
                    size="small"
                    @click="resetAdvancedQuery"
                  >
                    <el-icon><RefreshLeft /></el-icon>
                    重置
                  </el-button>
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 底部版权栏 -->
    <div class="home-footer">
      © 2024 质量数据管理系统 版权所有
    </div>

    <!-- 详情查看弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      title="投诉记录详情"
      width="90%"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      class="detail-dialog"
      center
      top="10vh"
      :style="{ height: '80vh' }"
    >
      <div v-if="detailData" class="detail-content">
        <!-- 基本信息 -->
        <div class="detail-section">
          <div class="section-header">
            <el-icon class="section-icon"><InfoFilled /></el-icon>
            <span class="section-title">基本信息</span>
          </div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">记录ID</span>
                <span class="info-value">{{ detailData.ID }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">投诉日期</span>
                <span class="info-value">{{ formatDate(detailData.Date) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">客户编号</span>
                <span class="info-value">{{ detailData.Customer }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">工单号</span>
                <span class="info-value">{{ detailData.OrderNo }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">产品名称</span>
                <span class="info-value">{{ detailData.ProductName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">规格</span>
                <span class="info-value">{{ detailData.Specification || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">车间</span>
                <span class="info-value">{{ detailData.Workshop }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">生产数量</span>
                <span class="info-value highlight-number">{{ detailData.ProductionQty }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">不良数量</span>
                <span class="info-value highlight-error">{{ detailData.DefectiveQty }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 投诉信息 -->
        <div class="detail-section">
          <div class="section-header">
            <el-icon class="section-icon warning"><WarningFilled /></el-icon>
            <span class="section-title">投诉信息</span>
          </div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">投诉类别</span>
                <el-tag type="warning" size="small">{{ detailData.ComplaintCategory }}</el-tag>
              </div>
              <div class="info-item">
                <span class="info-label">客户投诉类型</span>
                <span class="info-value">{{ detailData.CustomerComplaintType || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">不良率</span>
                <span class="info-value highlight-error">{{ detailData.DefectiveRate }}%</span>
              </div>
              <div class="info-item">
                <span class="info-label">不良类别</span>
                <span class="info-value">{{ detailData.DefectiveCategory || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">不良项目</span>
                <el-tag type="danger" size="small">{{ detailData.DefectiveItem }}</el-tag>
              </div>
            </div>

            <div class="text-fields">
              <div class="text-field">
                <div class="text-label">
                  <el-icon><Document /></el-icon>
                  <span>不良描述</span>
                </div>
                <div class="text-content">{{ detailData.DefectiveDescription }}</div>
              </div>

              <div class="text-field" v-if="detailData.DefectiveReason">
                <div class="text-label">
                  <el-icon><QuestionFilled /></el-icon>
                  <span>不良原因</span>
                </div>
                <div class="text-content">{{ detailData.DefectiveReason }}</div>
              </div>

              <div class="text-field">
                <div class="text-label">
                  <el-icon><Tools /></el-icon>
                  <span>处置措施</span>
                </div>
                <div class="text-content">{{ detailData.Disposition }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 责任信息 -->
        <div class="detail-section">
          <div class="section-header">
            <el-icon class="section-icon success"><UserFilled /></el-icon>
            <span class="section-title">责任信息</span>
          </div>
          <div class="section-content">
            <div class="responsibility-info">
              <div class="resp-item">
                <div class="resp-label">
                  <el-icon><OfficeBuilding /></el-icon>
                  <span>主责部门</span>
                </div>
                <el-tag type="primary" size="default">{{ detailData.MainDept }}</el-tag>
              </div>
              <div class="resp-item">
                <div class="resp-label">
                  <el-icon><User /></el-icon>
                  <span>主责人</span>
                </div>
                <el-tag type="success" size="default">{{ detailData.MainPerson }}</el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 附件信息 -->
        <div v-if="detailData.AttachmentFile" class="detail-section">
          <div class="section-header">
            <el-icon class="section-icon info"><Paperclip /></el-icon>
            <span class="section-title">附件信息</span>
          </div>
          <div class="section-content">
            <div class="attachment-info">
              <el-icon class="file-icon"><Document /></el-icon>
              <span class="file-name">{{ detailData.AttachmentFile }}</span>
              <el-button type="primary" size="small" link>
                <el-icon><Download /></el-icon>
                下载
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="showDetailDialog = false">
            <el-icon><Close /></el-icon>
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Excel导出字段选择对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="选择导出字段"
      width="600px"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
    >
      <div class="export-field-selection">
        <div class="field-selection-header">
          <el-button
            size="small"
            @click="selectAllFields"
            :type="activeSelectionButton === 'all' ? 'primary' : ''"
            :class="{ 'active-selection-btn': activeSelectionButton === 'all' }"
          >
            全选
          </el-button>
          <el-button
            size="small"
            @click="selectNoneFields"
            :type="activeSelectionButton === 'none' ? 'primary' : ''"
            :class="{ 'active-selection-btn': activeSelectionButton === 'none' }"
          >
            全不选
          </el-button>
          <el-button
            size="small"
            @click="selectDefaultFields"
            :type="activeSelectionButton === 'default' ? 'primary' : ''"
            :class="{ 'active-selection-btn': activeSelectionButton === 'default' }"
          >
            默认选择
          </el-button>
        </div>

        <div class="field-selection-content">
          <el-row :gutter="20">
            <el-col :span="12" v-for="field in exportFields" :key="field.key">
              <el-checkbox
                v-model="field.checked"
                :disabled="field.required"
                class="field-checkbox"
              >
                {{ field.label }}
                <span v-if="field.required" class="required-mark">(必选)</span>
              </el-checkbox>
            </el-col>
          </el-row>
        </div>

        <div class="field-selection-info">
          <el-alert
            title="提示"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              已选择 <strong>{{ selectedFieldsCount }}</strong> 个字段进行导出。
              序号字段为必选项，无法取消。
            </template>
          </el-alert>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showExportDialog = false">取消</el-button>
          <el-button
            type="primary"
            @click="confirmExport"
            :loading="exportLoading"
            :disabled="selectedFieldsCount === 0"
          >
            <el-icon><ArrowDown /></el-icon>
            确认导出
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick, reactive } from 'vue'
import { ArrowDown, User, Document, Search, Plus, View, RefreshLeft, InfoFilled, WarningFilled, UserFilled, Paperclip, Loading, QuestionFilled, Tools, OfficeBuilding, Download, Close } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElPagination, ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { useUserStore } from '../store/user'
import { storeToRefs } from 'pinia'
import { useSiteConfig } from '../composables/useSiteConfig'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

const router = useRouter()
const activeMenu = ref('home')

// 网站配置
const { siteConfig, loadSiteConfig } = useSiteConfig()
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(5)
const pageSizes = ref([5, 10, 20, 50, 100])
const gotoPage = ref(1)
const pageCount = computed(() => Math.ceil(total.value / pageSize.value))
const searchKeyword = ref('')
const tableLoading = ref(false)

// 详情弹窗相关
const showDetailDialog = ref(false)
const detailData = ref(null)
const detailLoading = ref(false)

// 高级查询数据
const advancedQuery = ref({
  customer: '',
  orderNo: '',
  productName: '',
  workshop: '',
  complaintCategory: '',
  customerComplaintType: '',
  defectiveCategory: '',
  mainDept: '',
  mainPerson: '',
  dateRange: null,
  defectiveRateMin: null,
  defectiveRateMax: null,
  returnGoods: '',
  isReprint: ''
})

// 下拉选项数据
const workshopOptions = ref([])
const complaintCategoryOptions = ref([])
const customerComplaintTypeOptions = ref([])
const defectiveCategoryOptions = ref([])
const departmentOptions = ref([])
const personOptions = ref([])

// 是否使用高级查询
const isAdvancedQuery = ref(false)
const todayCount = ref(0)
const monthCount = ref(0)
const showTodayCount = ref(false) // 初始为false，等待数据加载
const showMonthCount = ref(false) // 初始为false，等待数据加载

// 月份选择和今日统计控制
const selectedMonth = ref(new Date().toISOString().slice(0, 7)) // 默认当前月份 YYYY-MM
const showTodayStats = ref(true) // 今日统计开关

// 添加统计数据加载状态
const statsLoading = ref(true)

// 计算属性：选定月份的显示文本
const selectedMonthText = computed(() => {
  if (!selectedMonth.value) return '本月'
  const [year, month] = selectedMonth.value.split('-')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  if (parseInt(year) === currentYear && parseInt(month) === currentMonth) {
    return '本月'
  }
  return `${year}年${month}月`
})

// 计算属性：是否为当前月份
const isCurrentMonth = computed(() => {
  if (!selectedMonth.value) return true
  const [year, month] = selectedMonth.value.split('-')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return parseInt(year) === currentYear && parseInt(month) === currentMonth
})

// 计算属性：是否显示今日投诉卡片（只有当前月份且开关开启时才显示）
const shouldShowTodayCard = computed(() => {
  return showTodayCount.value && showTodayStats.value && isCurrentMonth.value
})

// 导出功能
const exportLoading = ref(false)
const showExportDialog = ref(false)
const activeSelectionButton = ref('')

// 可导出的字段定义（动态从后端获取）
const exportFields = ref([])

// 获取字段信息
const fetchExportFields = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/fields', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success) {
      exportFields.value = res.data.data
      console.log('获取到字段信息:', exportFields.value.length, '个字段')
    } else {
      ElMessage.error('获取字段信息失败')
    }
  } catch (error) {
    console.error('获取字段信息失败:', error)
    ElMessage.error('获取字段信息失败: ' + (error.response?.data?.message || error.message))
  }
}

// 计算属性：已选择的字段数量
const selectedFieldsCount = computed(() => {
  return exportFields.value.filter(field => field.checked).length
})

// 字段选择方法
const selectAllFields = () => {
  exportFields.value.forEach(field => {
    field.checked = true
  })
  activeSelectionButton.value = 'all'
  // 2秒后清除高亮
  setTimeout(() => {
    activeSelectionButton.value = ''
  }, 2000)
}

const selectNoneFields = () => {
  exportFields.value.forEach(field => {
    if (!field.required) {
      field.checked = false
    }
  })
  activeSelectionButton.value = 'none'
  // 2秒后清除高亮
  setTimeout(() => {
    activeSelectionButton.value = ''
  }, 2000)
}

const selectDefaultFields = async () => {
  // 重新获取字段信息以恢复默认状态
  await fetchExportFields()
  activeSelectionButton.value = 'default'
  // 2秒后清除高亮
  setTimeout(() => {
    activeSelectionButton.value = ''
  }, 2000)
}
const statUnits = ref([])

const chartFilter = ref({
  department: '',
  workshop: '',
  defectiveItem: '',
  dateRange: [],
  chartType: 'bar'
})
const chartOptions = ref({
  departments: [],
  workshops: [],
  defectiveItems: []
})

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const fetchProfile = async () => {
  const token = localStorage.getItem('token')
  const res = await axios.get('/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data.success) {
    user.value = res.data.data
  }
}

const handleMenuSelect = (index) => {
  activeMenu.value = index
  if (index === 'complaint') {
    router.push('/add')
  }
}
const goProfile = () => {
  router.push('/profile')
}
const logout = () => {
  // 清除token并跳转登录
  localStorage.removeItem('token')
  window.location.href = '/login'
}
const goAdmin = () => {
  // 权限校验：仅admin或有后台权限的用户可进入
  if (user.value.Role === 'admin') {
    router.push('/admin/dashboard')
  } else {
    ElMessage.error('无后台权限')
  }
}

// 删除原有的 loadSiteConfig 函数，现在使用 composable 中的

// LOGO加载错误处理
const handleLogoError = (event) => {
  event.target.src = '/logo.png' // 回退到默认LOGO
}

const fetchTableData = async () => {
  tableLoading.value = true
  try {
    const token = localStorage.getItem('token')

    // 构建查询参数
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }
    // console.log('发送请求参数:', params)

    // 如果使用高级查询，则使用高级查询参数，否则使用简单搜索
    if (isAdvancedQuery.value) {
      // 高级查询参数
      if (advancedQuery.value.customer) params.customer = advancedQuery.value.customer
      if (advancedQuery.value.orderNo) params.orderNo = advancedQuery.value.orderNo
      if (advancedQuery.value.productName) params.productName = advancedQuery.value.productName
      if (advancedQuery.value.workshop) params.workshop = advancedQuery.value.workshop
      if (advancedQuery.value.complaintCategory) params.complaintCategory = advancedQuery.value.complaintCategory
      if (advancedQuery.value.customerComplaintType) params.customerComplaintType = advancedQuery.value.customerComplaintType
      if (advancedQuery.value.defectiveCategory) params.defectiveCategory = advancedQuery.value.defectiveCategory
      if (advancedQuery.value.mainDept) params.mainDept = advancedQuery.value.mainDept
      if (advancedQuery.value.mainPerson) params.mainPerson = advancedQuery.value.mainPerson
      if (advancedQuery.value.dateRange && advancedQuery.value.dateRange.length === 2) {
        params.startDate = advancedQuery.value.dateRange[0]
        params.endDate = advancedQuery.value.dateRange[1]
      }
      if (advancedQuery.value.defectiveRateMin !== null) params.defectiveRateMin = advancedQuery.value.defectiveRateMin
      if (advancedQuery.value.defectiveRateMax !== null) params.defectiveRateMax = advancedQuery.value.defectiveRateMax
      if (advancedQuery.value.returnGoods !== '') params.returnGoods = advancedQuery.value.returnGoods
      if (advancedQuery.value.isReprint !== '') params.isReprint = advancedQuery.value.isReprint
    } else {
      // 简单搜索参数
      if (searchKeyword.value) params.search = searchKeyword.value
    }

    const res = await axios.get('/api/complaint/list', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success) {
      // console.log('🔍 数据接收调试:')
      // console.log('- 接收到的数据条数:', res.data.data.length)
      // console.log('- 总记录数:', res.data.total)
      // console.log('- 页面大小:', res.data.pageSize)

      tableData.value = res.data.data
      total.value = res.data.total

      // console.log('- 设置后tableData长度:', tableData.value.length)
      // console.log('- tableData前3条:', res.data.data.slice(0, 3))
    }
  } catch (e) {
    tableData.value = []
    total.value = 0
  } finally {
    tableLoading.value = false
  }
}

// 处理月份变化
const handleMonthChange = (value) => {
  console.log('月份变化:', value, '当前selectedMonth:', selectedMonth.value)
  // 强制更新selectedMonth值
  selectedMonth.value = value

  // 智能控制今日统计开关：非当前月份时自动关闭，当前月份时自动开启
  const [year, month] = value.split('-')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const isCurrentMonthSelected = parseInt(year) === currentYear && parseInt(month) === currentMonth

  if (!isCurrentMonthSelected) {
    // 非当前月份，关闭今日统计显示
    showTodayStats.value = false
    console.log('非当前月份，自动关闭今日统计显示')
  } else {
    // 当前月份，开启今日统计显示
    showTodayStats.value = true
    console.log('当前月份，自动开启今日统计显示')
  }

  // 确保使用最新的月份值
  nextTick(() => {
    console.log('准备获取统计数据，月份:', selectedMonth.value)
    fetchStats()
  })
}

// 处理今日统计开关
const handleTodayStatsToggle = (value) => {
  console.log('今日统计开关:', value)
  // 不需要重新获取数据，只是控制显示
}

const fetchStats = async () => {
  try {
    statsLoading.value = true // 开始加载
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('未找到token，跳转到登录页')
      window.location.href = '/login'
      return
    }

    // 添加月份参数
    const params = {
      month: selectedMonth.value
    }

    console.log('发送统计请求，参数:', params)

    const res = await axios.get('/api/complaint/month-stats', {
      headers: { Authorization: `Bearer ${token}` },
      params: params
    })

    if (res.data.success) {
      // 根据配置显示卡片
      showTodayCount.value = res.data.showTodayCount !== false
      showMonthCount.value = res.data.showMonthCount !== false
      todayCount.value = res.data.todayCount || 0
      monthCount.value = res.data.monthCount || 0
      statUnits.value = res.data.units || []

      console.log('统计数据获取成功:', {
        targetMonth: res.data.targetMonth,
        selectedMonth: selectedMonth.value,
        todayCount: todayCount.value,
        monthCount: monthCount.value,
        unitsCount: statUnits.value.length
      })
    } else {
      console.error('统计数据获取失败:', res.data.message)
    }
  } catch (e) {
    console.error('获取统计数据失败:', e)
    if (e.response && e.response.status === 401) {
      console.warn('认证失败，跳转到登录页')
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
  } finally {
    statsLoading.value = false // 加载完成
  }
}

const fetchChartOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })
    chartOptions.value.departments = res.data.departments || []
    chartOptions.value.workshops = res.data.workshops || []
    chartOptions.value.defectiveItems = res.data.defectiveItems || []
  } catch (e) {}
}

const demoBarData = {
  x: ['数码印刷', '轮转机', '跟单', '设计', '品检', '品检2', '品检3'],
  y: [12, 20, 15, 8, 18, 10, 7]
}
const demoLineData = {
  x: ['一月', '二月', '三月', '四月', '五月', '六月'],
  y: [5, 8, 6, 12, 10, 15]
}
const demoRoseData = [
  { value: 10, name: '印刷不良' },
  { value: 15, name: '裁切不良' },
  { value: 8, name: '装订不良' },
  { value: 20, name: '表面不良' },
  { value: 12, name: '其它不良' }
]
const renderCharts = () => {
  // 柱形图
  const barChart = echarts.init(document.getElementById('barChart'))
  barChart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: demoBarData.x, axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
    grid: { show: false, left: 30, right: 20, top: 30, bottom: 30 },
    series: [{ type: 'bar', data: demoBarData.y, itemStyle: { color: '#409EFF' } }]
  })
  // 折线图
  const lineChart = echarts.init(document.getElementById('lineChart'))
  lineChart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: demoLineData.x, axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
    grid: { show: false, left: 30, right: 20, top: 30, bottom: 30 },
    series: [{ type: 'line', data: demoLineData.y, smooth: true, lineStyle: { color: '#67C23A' } }]
  })
  // 玫瑰图
  const roseChart = echarts.init(document.getElementById('roseChart'))
  roseChart.setOption({
    tooltip: {},
    legend: { show: false },
    series: [{
      name: '不良项',
      type: 'pie',
      radius: ['30%', '70%'],
      roseType: 'radius',
      data: demoRoseData,
      label: { show: true, fontWeight: 'bold' }
    }]
  })
}
const fetchChartData = () => {
  // 预留：根据chartFilter自动刷新3个图表
  nextTick(() => renderCharts())
}

const handlePageChange = (val) => {
  page.value = val
  gotoPage.value = val
  fetchTableData()
}

const handleSizeChange = (val) => {
  // console.log('分页大小改变:', val)
  pageSize.value = val
  page.value = 1
  // console.log('当前pageSize:', pageSize.value)
  fetchTableData()
}

const jumpToPage = (val) => {
  if (val >= 1 && val <= pageCount.value) {
    page.value = val
    fetchTableData()
  }
}

// 简单搜索方法
const handleSimpleSearch = () => {
  isAdvancedQuery.value = false
  page.value = 1 // 重置到第一页
  fetchTableData()
}

// 高级查询方法
const handleAdvancedQuery = () => {
  isAdvancedQuery.value = true
  page.value = 1 // 重置到第一页
  fetchTableData()
}

// 重置高级查询
const resetAdvancedQuery = () => {
  advancedQuery.value = {
    customer: '',
    orderNo: '',
    productName: '',
    workshop: '',
    complaintCategory: '',
    customerComplaintType: '',
    defectiveCategory: '',
    mainDept: '',
    mainPerson: '',
    dateRange: null,
    defectiveRateMin: null,
    defectiveRateMax: null,
    returnGoods: '',
    isReprint: ''
  }
  isAdvancedQuery.value = false
  page.value = 1
  fetchTableData()
}

// 获取下拉选项数据
const fetchOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })

    workshopOptions.value = res.data.workshops.map(item => item.Name)
    complaintCategoryOptions.value = res.data.complaintCategories.map(item => item.Name)
    customerComplaintTypeOptions.value = res.data.customerComplaintTypes.map(item => item.Name)
    defectiveCategoryOptions.value = res.data.defectiveCategories.map(item => item.Name)
    departmentOptions.value = res.data.departments.map(item => item.Name)
    personOptions.value = res.data.persons.map(item => item.Name)
  } catch (error) {
    console.error('获取下拉选项失败:', error)
  }
}

// 获取车间标签类型
const getWorkshopTagType = (workshop) => {
  const typeMap = {
    '数码印刷': 'primary',
    '轮转机': 'success',
    '跟单': 'warning',
    '设计': 'info',
    '品检': 'danger'
  }
  return typeMap[workshop] || 'primary'
}

// 获取单位卡片样式类
const getUnitCardClass = (type, index) => {
  const baseClasses = ['card-unit']

  // 根据类型添加不同的样式
  if (type === 'workshop') {
    baseClasses.push('card-workshop')
  } else {
    baseClasses.push('card-department')
  }

  // 添加索引样式以保持颜色多样性
  baseClasses.push(`card-unit${index % 6}`)

  return baseClasses.join(' ')
}

// 查看详情
const viewDetail = async (row) => {
  try {
    detailLoading.value = true
    const token = localStorage.getItem('token')

    const response = await axios.get(`/api/complaint/detail/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      detailData.value = response.data.data
      showDetailDialog.value = true
    } else {
      ElMessage.error(response.data.message || '获取详情失败')
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

watch(pageCount, (val) => {
  if (val === 0) {
    gotoPage.value = 1
  } else if (gotoPage.value > val) {
    gotoPage.value = val
  }
})

function getChartTitle(type) {
  let year = ''
  let month = ''
  if (chartFilter.value.dateRange && chartFilter.value.dateRange.length === 2) {
    const start = chartFilter.value.dateRange[0]
    const end = chartFilter.value.dateRange[1]
    if (start && end && start !== end) {
      year = `${new Date(start).getFullYear()}-${(new Date(start).getMonth()+1).toString().padStart(2,'0')}`
      month = `${new Date(end).getFullYear()}-${(new Date(end).getMonth()+1).toString().padStart(2,'0')}`
      return `${year} 至 ${month} 投诉${type}`
    }
  }
  const now = new Date()
  year = now.getFullYear()
  month = (now.getMonth()+1).toString().padStart(2,'0')
  return `${year}年${month}月投诉${type}`
}

// 监听配置更新事件
const handleConfigUpdate = (event) => {
  console.log('收到配置更新事件:', event.detail)
  // 重新获取统计数据，保持当前选择的月份
  nextTick(() => {
    fetchStats()
  })
}

// 确认导出方法
const confirmExport = () => {
  showExportDialog.value = false
  exportToExcel()
}

// Excel导出功能
const exportToExcel = async () => {
  exportLoading.value = true
  try {
    const token = localStorage.getItem('token')

    // 构建查询参数（不包含分页，获取所有数据）
    const params = {}

    // 如果使用高级查询，则使用高级查询参数，否则使用简单搜索
    if (isAdvancedQuery.value) {
      // 高级查询参数
      if (advancedQuery.value.customer) params.customer = advancedQuery.value.customer
      if (advancedQuery.value.orderNo) params.orderNo = advancedQuery.value.orderNo
      if (advancedQuery.value.productName) params.productName = advancedQuery.value.productName
      if (advancedQuery.value.workshop) params.workshop = advancedQuery.value.workshop
      if (advancedQuery.value.complaintCategory) params.complaintCategory = advancedQuery.value.complaintCategory
      if (advancedQuery.value.customerComplaintType) params.customerComplaintType = advancedQuery.value.customerComplaintType
      if (advancedQuery.value.defectiveCategory) params.defectiveCategory = advancedQuery.value.defectiveCategory
      if (advancedQuery.value.mainDept) params.mainDept = advancedQuery.value.mainDept
      if (advancedQuery.value.mainPerson) params.mainPerson = advancedQuery.value.mainPerson
      if (advancedQuery.value.dateRange && advancedQuery.value.dateRange.length === 2) {
        params.startDate = advancedQuery.value.dateRange[0]
        params.endDate = advancedQuery.value.dateRange[1]
      }
      if (advancedQuery.value.defectiveRateMin !== null) params.defectiveRateMin = advancedQuery.value.defectiveRateMin
      if (advancedQuery.value.defectiveRateMax !== null) params.defectiveRateMax = advancedQuery.value.defectiveRateMax
      if (advancedQuery.value.returnGoods !== '') params.returnGoods = advancedQuery.value.returnGoods
      if (advancedQuery.value.isReprint !== '') params.isReprint = advancedQuery.value.isReprint
    } else {
      // 简单搜索参数
      if (searchKeyword.value) params.search = searchKeyword.value
    }

    // 设置大的页面大小以获取所有数据
    params.page = 1
    params.pageSize = 10000

    const res = await axios.get('/api/complaint/list', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success && res.data.data.length > 0) {
      // 获取选中的字段
      const selectedFields = exportFields.value.filter(field => field.checked)

      // 准备Excel数据 - 只包含选中的字段
      const excelData = res.data.data.map((item, index) => {
        const rowData = {}

        selectedFields.forEach(field => {
          if (field.key === 'index') {
            rowData[field.label] = index + 1
          } else {
            // 动态处理字段值
            let value = item[field.key]

            // 根据字段类型进行格式化
            switch (field.type) {
              case 'date':
                value = value ? value.slice(0, 10) : ''
                break
              case 'boolean':
                value = value ? '是' : '否'
                break
              case 'number':
              case 'decimal':
                value = value || 0
                break
              default:
                value = value || ''
            }

            rowData[field.label] = value
          }
        })

        return rowData
      })

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // 动态设置列宽 - 根据字段类型和内容
      const getColumnWidth = (field) => {
        // 根据字段类型和标签长度设置列宽
        if (field.key === 'index') return { wch: 6 }

        switch (field.type) {
          case 'date':
            return { wch: 12 }
          case 'boolean':
            return { wch: 8 }
          case 'number':
          case 'decimal':
            return { wch: 10 }
          case 'string':
            // 根据字段名称判断内容长度
            if (field.label.includes('描述') || field.label.includes('原因') || field.label.includes('措施') || field.label.includes('说明')) {
              return { wch: 25 }
            } else if (field.label.includes('规格') || field.label.includes('名称')) {
              return { wch: 20 }
            } else if (field.label.includes('编号') || field.label.includes('工单')) {
              return { wch: 15 }
            } else {
              return { wch: 12 }
            }
          default:
            return { wch: 15 }
        }
      }

      // 根据选中的字段设置列宽
      const colWidths = selectedFields.map(field => getColumnWidth(field))
      ws['!cols'] = colWidths

      // 设置行高
      const rowHeights = []
      // 标题行高度
      rowHeights[0] = { hpt: 25 }
      // 数据行高度
      for (let i = 1; i <= excelData.length; i++) {
        rowHeights[i] = { hpt: 20 }
      }
      ws['!rows'] = rowHeights

      // 美化表格样式
      const range = XLSX.utils.decode_range(ws['!ref'])

      // 定义样式
      const headerStyle = {
        font: { name: 'Microsoft YaHei', sz: 11, bold: true, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: 'D9D9D9' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }

      const dataStyle = {
        font: { name: 'Microsoft YaHei', sz: 10 },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0D0D0' } },
          bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
          left: { style: 'thin', color: { rgb: 'D0D0D0' } },
          right: { style: 'thin', color: { rgb: 'D0D0D0' } }
        }
      }

      const evenRowStyle = {
        ...dataStyle,
        fill: { fgColor: { rgb: 'F8F9FA' } }
      }

      const oddRowStyle = {
        ...dataStyle,
        fill: { fgColor: { rgb: 'FFFFFF' } }
      }

      // 应用样式
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          if (!ws[cellAddress]) continue

          if (R === 0) {
            // 标题行样式
            ws[cellAddress].s = headerStyle
          } else {
            // 数据行样式 - 隔行变色
            ws[cellAddress].s = R % 2 === 0 ? evenRowStyle : oddRowStyle
          }
        }
      }

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '投诉记录')

      // 生成文件名 - 格式：投诉记录_YYMMDD+时间戳
      const now = new Date()
      const year = now.getFullYear().toString().slice(-2) // 取年份后两位
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const day = now.getDate().toString().padStart(2, '0')
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')

      const dateStr = `${year}${month}${day}`
      const timeStamp = `${hours}${minutes}${seconds}`
      let fileName = `投诉记录_${dateStr}${timeStamp}.xlsx`

      // 如果有查询条件，添加到文件名
      const selectedFieldsText = `${selectedFieldsCount.value}字段`
      if (isAdvancedQuery.value) {
        fileName = `投诉记录_高级查询_${selectedFieldsText}_${dateStr}${timeStamp}.xlsx`
      } else if (searchKeyword.value) {
        fileName = `投诉记录_搜索结果_${selectedFieldsText}_${dateStr}${timeStamp}.xlsx`
      } else {
        fileName = `投诉记录_${selectedFieldsText}_${dateStr}${timeStamp}.xlsx`
      }

      // 导出文件
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      saveAs(blob, fileName)

      ElMessage.success(`成功导出 ${res.data.data.length} 条记录`)
    } else {
      ElMessage.warning('没有数据可导出')
    }
  } catch (error) {
    console.error('导出Excel失败:', error)
    ElMessage.error('导出失败: ' + (error.response?.data?.message || error.message))
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchTableData()
  fetchChartOptions()
  fetchProfile()
  fetchOptions() // 获取下拉选项
  fetchExportFields() // 获取导出字段信息
  loadSiteConfig() // 加载网站配置
  nextTick(() => {
    renderCharts()
    // 初始化查询卡片位置
    initQueryCardPosition()
  })

  // 添加配置更新监听器
  window.addEventListener('homeConfigUpdated', handleConfigUpdate)

  // 添加网站配置更新监听器
  window.addEventListener('siteConfigUpdated', (event) => {
    Object.assign(siteConfig, event.detail)
    document.title = siteConfig.siteName
  })

  // 添加滚动监听，动态调整查询卡片位置
  window.addEventListener('scroll', handleScroll)

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

// 滚动处理函数（带防抖）
let scrollTimeout = null
const handleScroll = () => {
  // 在小屏幕下不执行固定定位
  if (window.innerWidth <= 1200) return

  // 清除之前的定时器
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }

  // 设置新的定时器，防抖处理
  scrollTimeout = setTimeout(() => {
    const queryCard = document.querySelector('.query-card')
    const tableCard = document.querySelector('.table-card')

    if (!queryCard || !tableCard) return

    const tableCardRect = tableCard.getBoundingClientRect()
    const headerHeight = 80 // 导航栏实际高度
    const padding = 20 // 与导航栏的间距

    // 计算查询卡片应该的位置（始终与表格卡片顶部对齐）
    const targetTop = Math.max(headerHeight + padding, tableCardRect.top)

    // 设置查询卡片位置
    queryCard.style.top = `${targetTop}px`
  }, 10) // 10ms防抖延迟，保持响应性
}

// 完全重置查询卡片到初始状态
const resetQueryCardToInitialState = () => {
  const queryCard = document.querySelector('.query-card')
  const tableCard = document.querySelector('.table-card')

  if (!queryCard || !tableCard) return

  // 完全重置样式
  queryCard.style.position = 'fixed'
  queryCard.style.right = '2.5rem'
  queryCard.style.width = '300px'
  queryCard.style.transform = 'none'

  // 获取表格当前位置
  const tableCardRect = tableCard.getBoundingClientRect()
  const headerHeight = 80 // 导航栏实际高度
  const padding = 20 // 与导航栏的间距

  // 设置查询卡片位置（与表格顶部对齐）
  const initialTop = Math.max(headerHeight + padding, tableCardRect.top)
  queryCard.style.top = `${initialTop}px`
}

// 初始化查询卡片位置
const initQueryCardPosition = () => {
  setTimeout(() => {
    // 在小屏幕下不执行固定定位
    if (window.innerWidth <= 1200) return

    resetQueryCardToInitialState()
    // 立即执行一次滚动处理，确保位置正确
    handleScroll()
  }, 100) // 延迟100ms确保DOM完全渲染
}

// 组件卸载时移除监听器
import { onUnmounted } from 'vue'

// 防抖函数
let resizeTimeout = null
// 窗口大小变化处理函数
const handleResize = () => {
  // 清除之前的定时器
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  // 设置新的定时器，防抖处理
  resizeTimeout = setTimeout(() => {
    const queryCard = document.querySelector('.query-card')
    if (!queryCard) return

    // 如果是小屏幕，重置查询卡片样式
    if (window.innerWidth <= 1200) {
      queryCard.style.position = 'relative'
      queryCard.style.top = 'auto'
      queryCard.style.right = 'auto'
      queryCard.style.width = '100%'
    } else {
      // 大屏幕时完全重置并重新初始化位置
      setTimeout(() => {
        // 使用新的重置函数
        resetQueryCardToInitialState()

        // 重新初始化滚动监听
        setTimeout(() => {
          initQueryCardPosition()
        }, 100)
      }, 100)
    }
  }, 200) // 防抖延迟200ms
}

onUnmounted(() => {
  window.removeEventListener('homeConfigUpdated', handleConfigUpdate)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)

  // 清理定时器
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto; /* 明确允许垂直滚动 */
  height: auto; /* 确保高度可以自动增长 */
  /* 允许垂直滚动 */
}
/* 自定义滚动条样式 */
body::-webkit-scrollbar {
  width: 8px;
}
body::-webkit-scrollbar-track {
  background: #f1f1f1;
}
body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 全局样式 - 详情对话框标题栏美化 */
.el-dialog.detail-dialog .el-dialog__header {
  flex-shrink: 0 !important;
  padding: 24px 24px 16px 24px !important;
  border-bottom: 1px solid #e5e7eb !important;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.el-dialog.detail-dialog .el-dialog__title {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #111827 !important;
  letter-spacing: 0.025em !important;
  position: relative !important;
  padding-left: 32px !important;
  line-height: 1.5 !important;
}

.el-dialog.detail-dialog .el-dialog__title::before {
  content: '📋' !important;
  font-size: 18px !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) !important;
}

.el-dialog.detail-dialog .el-dialog__headerbtn {
  top: 20px !important;
  right: 20px !important;
  width: 36px !important;
  height: 36px !important;
  background: rgba(107, 114, 128, 0.1) !important;
  border-radius: 8px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.el-dialog.detail-dialog .el-dialog__headerbtn:hover {
  background: rgba(239, 68, 68, 0.1) !important;
  transform: scale(1.05) !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15) !important;
}

.el-dialog.detail-dialog .el-dialog__close {
  color: #6b7280 !important;
  font-size: 18px !important;
  font-weight: 500 !important;
  transition: color 0.2s ease !important;
}

.el-dialog.detail-dialog .el-dialog__headerbtn:hover .el-dialog__close {
  color: #ef4444 !important;
}
</style>

<style scoped>
.home-bg {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
  /* 确保页面内容超出视窗时显示滚动条 */
}
.home-header {
  background: #fff;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  height: 4rem;
  padding: 0 2.5rem;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
}
.header-left {
  display: flex;
  align-items: center;
}
.logo {
  height: 2.25rem;
  margin-right: 0.625rem;
}
.logo-text {
  font-size: 1.25rem;
  font-weight: bold;
  color: #b0b4ba;
}
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}
.nav-menu-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}
.nav-menu {
  background: transparent;
  border-bottom: none;
  display: inline-block;
  min-width: 0;
  flex-shrink: 0;
}
.nav-menu :deep(.el-menu-item) {
  background: transparent !important;
  position: relative;
}
.nav-menu :deep(.el-menu-item)::after {
  content: '';
  display: block;
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 2.5px;
  background: #409EFF;
  border-radius: 2px;
  transition: width 0.2s, left 0.2s;
}
.nav-menu :deep(.el-menu-item:hover)::after,
.nav-menu :deep(.el-menu-item.is-active)::after {
  width: 60%;
  left: 20%;
}
.nav-menu :deep(.el-menu-item:hover),
.nav-menu :deep(.el-menu-item.is-active) {
  background: transparent !important;
  color: #409EFF !important;
  box-shadow: none !important;
  border-bottom: none !important;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.admin-btn {
  margin-right: 0.625rem;
}
.avatar-icon {
  background: #e6e6e6;
  color: #409EFF;
  cursor: pointer;
}
.username {
  margin: 0 0.5rem;
  font-weight: 500;
  cursor: pointer;
}
.home-main {
  flex: 1;
  padding: 1.5rem 2.5rem 4rem 2.5rem; /* 减少顶部内边距，增加底部边距避免被footer遮挡 */
  margin-top: 4rem; /* 为固定导航栏留出空间 */
  /* 移除overflow限制，让页面自然滚动 */
  overflow: visible; /* 确保内容可见 */
}

/* 统计控制区样式 */
.stats-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.stats-control-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stats-control-right {
  display: flex;
  align-items: center;
}
.stat-row-flex {
  display: flex;
  flex-wrap: nowrap;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}
.stat-row-flex .stat-card {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  height: 6.875rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 1rem;
  box-shadow: 0 0 0.625rem #ddd;
  text-align: center;
  border: none;
}
.stat-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}
.stat-value {
  font-size: 1rem;
  font-weight: normal;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}
.stat-value b {
  font-size: 1.75rem;
  font-weight: bold;
  color: #fff !important;
  margin: 0 0.125rem;
  text-shadow: 0 0 0.625rem #ddd;
}
.middle-row {
  margin-bottom: 1.5rem;
  position: relative;
}

.table-container {
  margin-right: 320px; /* 为固定定位的查询卡片留出空间：300px宽度 + 20px间距 */
}
.table-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
  margin-bottom: 1.5rem;
  margin-top: 0 !important; /* 确保顶部对齐 */
}
.table-title {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.query-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
  height: auto;
  min-height: unset;
  display: block;
  position: fixed; /* 使用fixed定位以便精确控制 */
  top: 120px; /* 初始位置，避免与导航栏重叠 */
  right: 2.5rem; /* 与页面右边距保持一致 */
  width: 300px; /* 固定宽度 */
  margin-top: 0 !important; /* 确保与左侧卡片顶部对齐 */
  z-index: 1000; /* 确保在其他元素之上 */
  transition: top 0.2s ease-out; /* 平滑过渡效果 */
}

.query-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: bold;
  color: #409eff;
}

.advanced-form {
  padding: 0;
}

.advanced-form .el-form-item {
  margin-bottom: 16px;
}

.advanced-form .el-form-item:last-child {
  margin-bottom: 0;
}

.advanced-form .el-form-item__content {
  width: 100% !important;
}

.advanced-form .el-form-item__label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.advanced-form .el-input,
.advanced-form .el-select {
  font-size: 12px;
}

.rate-range {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.query-actions {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.query-actions .el-button {
  font-size: 12px;
  border-radius: 4px;
  width: 100% !important;
  height: 36px !important;
  margin: 0 !important;
  flex: 1;
  box-sizing: border-box;
}

/* 针对小尺寸按钮的特殊样式 */
.query-actions .el-button--small {
  height: 36px !important;
  padding: 8px 15px !important;
  font-size: 12px !important;
  line-height: 1 !important;
}

/* 更具体的选择器确保样式生效 */
.query-actions .el-button.el-button--small {
  height: 36px !important;
  min-height: 36px !important;
}

.query-actions .el-button.el-button--small.el-button--primary {
  height: 36px !important;
  min-height: 36px !important;
}

.query-actions .el-button.el-button--small.el-button--default {
  height: 36px !important;
  min-height: 36px !important;
}

.query-actions .el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.query-actions .el-button--primary:hover {
  background: linear-gradient(135deg, #337ecc 0%, #5aa3e6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.query-actions .el-button--default {
  height: 36px !important;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  color: #606266;
}

.query-actions .el-button--default:hover {
  border-color: #c0c4cc;
  background: #f5f7fa;
  color: #409eff;
}

.query-title {
  font-size: 0.95rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.chart-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
}
.chart-title {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.home-footer {
  background: #fff;
  color: #888;
  text-align: center;
  padding: 1rem 0 0.5rem 0;
  font-size: 0.9rem;
  letter-spacing: 1px;
  box-shadow: 0 -0.0625rem 0.375rem 0 rgba(0,0,0,0.03);
}
.unit-card {
  /* 只保留阴影和无边框，不设置background，避免覆盖子类 */
  box-shadow: 0 0 10px #ddd !important;
  border: none !important;
}
/* 清爽型卡片颜色 - 使用渐变和柔和色调 */
.card-today {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(168, 237, 234, 0.3) !important;
}

.card-month {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(252, 182, 159, 0.3) !important;
}

.loading-card {
  background: linear-gradient(135deg, #f0f2f5 0%, #e6e8eb 100%) !important;
  color: #666 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(240, 242, 245, 0.3) !important;
}

.loading-card .stat-value {
  font-size: 1.5rem !important;
}

.card-unit0 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3) !important;
}

.card-unit1 {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(240, 147, 251, 0.3) !important;
}

.card-unit2 {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.3) !important;
}

.card-unit3 {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(67, 233, 123, 0.3) !important;
}

.card-unit4 {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(250, 112, 154, 0.3) !important;
}

.card-unit5 {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(168, 237, 234, 0.3) !important;
}

.card-unit6 {
  background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(210, 153, 194, 0.3) !important;
}
.stat-label {
  font-size: 13px;
  color: #409EFF;
  margin-left: 2px;
}
.el-dropdown-link:focus,
.el-dropdown-link:focus-visible,
.el-dropdown-link:active {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
.chart-filter-row {
  margin-bottom: 10px;
  padding: 0 10px;
}
.chart-content-flex {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 15px;
  margin-top: 8px;
  padding: 0 15px;
  box-sizing: border-box;
}
.chart-box {
  flex: 1 1 0;
  min-width: 0;
  background: #fafbfc;
  border-radius: 8px;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-shadow: 0 4px 16px 0 rgba(64,158,255,0.10);
  border: 1.5px solid #e0e3ea;
  padding: 8px 0 0 0;
  box-sizing: border-box;
}
.chart-label {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 4px;
  color: #409EFF;
}
.chart-ec {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
}
/* 表格头部样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-actions {
  display: flex;
  align-items: center;
}

/* 表格底部样式 */
.table-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* 投诉记录表格卡片样式 */
.complaint-table-card {
  margin-top: 24px;
  /* 移除高度限制，让表格自然展开 */
  display: flex;
  flex-direction: column;
}

/* 详情弹窗样式 - 使用深度选择器 */
.detail-dialog :deep(.el-dialog) {
  height: 80vh !important;
  max-height: 80vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 0 auto !important;
  top: 10vh !important;
  transform: translateY(0) !important;
}

/* 详情对话框标题栏美化样式已移至全局样式 */

.detail-dialog :deep(.el-dialog__body) {
  flex: 1 !important;
  padding: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
  height: calc(80vh - 120px) !important;
}

.detail-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0 !important;
}

.detail-dialog .detail-content {
  flex: 1 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 16px 24px !important;
  background: #fafbfc !important;
  height: 100% !important;
  max-height: calc(80vh - 160px) !important;
}

/* 详情区块样式 */
.detail-section {
  background: #ffffff;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.detail-section:last-child {
  margin-bottom: 0;
}

/* 区块头部 */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #e4e7ed;
  font-weight: 600;
  font-size: 15px;
}

.section-icon {
  font-size: 18px;
  color: #409eff;
}

.section-icon.warning {
  color: #e6a23c;
}

.section-icon.success {
  color: #67c23a;
}

.section-icon.info {
  color: #909399;
}

.section-title {
  color: #303133;
  font-weight: 600;
}

/* 区块内容 */
.section-content {
  padding: 20px;
}

/* 信息网格布局 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px 24px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #e4e7ed;
  transition: all 0.3s ease;
  min-height: 44px;
  overflow: hidden;
}

.info-item:hover {
  background: #f0f2f5;
  border-left-color: #409eff;
}

.info-label {
  font-weight: 600;
  color: #606266;
  font-size: 13px;
  min-width: 80px;
  flex-shrink: 0;
}

.info-value {
  color: #1f2937;
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
}

.info-value.highlight-number {
  color: #2563eb;
  font-weight: 600;
}

.info-value.highlight-error {
  color: #dc2626;
  font-weight: 600;
}

/* 文本字段样式 */
.text-fields {
  margin-top: 20px;
}

.text-field {
  margin-bottom: 16px;
}

.text-field:last-child {
  margin-bottom: 0;
}

.text-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #606266;
  font-size: 14px;
}

.text-label .el-icon {
  color: #909399;
  font-size: 16px;
}

.text-content {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  color: #1f2937;
  line-height: 1.6;
  min-height: 60px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  overflow-wrap: break-word;
}

/* 责任信息样式 */
.responsibility-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.resp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  flex: 1;
  min-width: 200px;
  overflow: hidden;
}

.resp-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #606266;
  font-size: 14px;
  flex-shrink: 0;
}

.resp-label .el-icon {
  color: #909399;
  font-size: 16px;
}

/* 附件信息样式 */
.attachment-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 10px;
  border: 1px solid #bae6fd;
  overflow: hidden;
}

.file-icon {
  color: #0ea5e9;
  font-size: 20px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  color: #1f2937;
  font-weight: 500;
  font-size: 14px;
  word-break: break-word;
  overflow-wrap: break-word;
}

.dialog-footer {
  text-align: center;
  padding: 16px 24px;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.complaint-table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 移除overflow: hidden，允许内容自然滚动 */
}

.complaint-table-card .el-table {
  flex: 1;
}

/* 移除表格高度限制，让页面自然滚动 */
/*
.complaint-table-card .el-table__body-wrapper {
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}
*/

/* 卡片类型样式 */
.card-workshop {
  border-left: 4px solid #409eff;
}

.card-department {
  border-left: 4px solid #67c23a;
}

.admin-main, .main, .home-main {
  background: #fafbfc;
}
/* 大屏幕到中等屏幕的过渡 */
@media (max-width: 1200px) {
  .query-card {
    position: relative !important;
    top: auto !important;
    right: auto !important;
    width: 100% !important;
    margin-bottom: 1.5rem;
    transition: none !important;
  }

  .table-container {
    margin-right: 0 !important;
  }

  .middle-row {
    flex-direction: column;
  }
}

/* 平板设备 */
@media (max-width: 768px) {
  .home-header {
    padding: 0.5rem 1rem;
    flex-wrap: wrap;
    min-height: 100px; /* 给导航菜单换行留出空间 */
    align-items: flex-start;
  }

  /* 平板设备下隐藏logo文字以节省空间 */
  .logo-text {
    display: none; /* 隐藏logo文字 */
  }

  .header-left {
    flex-shrink: 0; /* 防止被压缩 */
    min-width: auto; /* 自动宽度，因为只显示图标 */
  }

  /* 确保右侧区域不挤压左侧logo */
  .header-right {
    flex-shrink: 0; /* 防止被压缩 */
    gap: 0.5rem; /* 稍微减少间距 */
  }

  .home-header .nav-menu {
    order: 3;
    width: 100%;
    margin-top: 0.5rem;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 0.5rem;
    padding: 0.25rem 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .home-header .nav-menu .el-menu {
    background: transparent;
    border: none;
  }

  .home-header .nav-menu .el-menu-item {
    padding: 0 1rem;
    font-size: 0.875rem;
    height: 36px;
    line-height: 36px;
  }

  .home-main {
    margin-top: 5rem; /* 为导航菜单留出额外空间 */
    padding: 1rem 1rem 3rem 1rem; /* 增加底部边距避免被footer遮挡 */
  }

  .stats-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  /* 平板设备下统计控制区调整 */
  .stats-control {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
    padding: 1rem;
  }

  .stats-control-left,
  .stats-control-right {
    justify-content: center;
    width: 100%;
  }

  .stats-control-left .el-date-picker {
    width: 200px;
  }

  /* 平板设备下统计卡片调整 */
  .stat-row-flex .stat-card {
    height: 8rem; /* 增加平板设备高度 */
    padding: 1rem 0.5rem; /* 增加内边距 */
  }

  .stat-row-flex .stat-card .stat-title {
    font-size: 1rem;
    margin-bottom: 0.75rem; /* 增加标题下边距 */
  }

  .stat-row-flex .stat-card .stat-value {
    font-size: 1.1rem;
  }

  .table-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .table-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .table-actions .el-input {
    flex: 1;
    min-width: 200px;
  }

  .chart-content-flex {
    flex-direction: column;
    gap: 1rem;
  }

  .chart-box {
    width: 100% !important;
    min-height: 250px;
  }

  /* 平板设备下分页器优化 */
  .table-footer {
    justify-content: center;
  }

  .table-footer .el-pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 手机设备 */
@media (max-width: 600px) {
  .home-header, .home-main {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .home-header {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    min-height: 90px; /* 手机设备稍微减少高度 */
  }

  /* 手机设备下隐藏logo文字以节省空间 */
  .logo-text {
    display: none; /* 隐藏logo文字 */
  }

  .header-left {
    flex-shrink: 0; /* 防止被压缩 */
    min-width: auto; /* 自动宽度，因为只显示图标 */
  }

  .logo {
    height: 2rem; /* 稍微缩小logo */
    margin-right: 0; /* 移除右边距，因为没有文字了 */
  }

  .home-header .nav-menu {
    margin-top: 0.25rem;
    padding: 0.125rem 0;
  }

  .home-header .nav-menu .el-menu-item {
    padding: 0 0.5rem;
    font-size: 0.8rem;
    height: 32px;
    line-height: 32px;
  }

  .home-main {
    margin-top: 6rem; /* 手机设备需要更多上边距，因为导航栏高度约90px */
    padding: 1rem 1rem 3rem 1rem; /* 增加底部边距避免被footer遮挡 */
  }

  /* 手机设备下统计控制区调整 */
  .stats-control {
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    margin-bottom: 1rem;
    margin-left: 0;
    margin-right: 0;
  }

  .stats-control-left {
    justify-content: center;
    width: 100%;
  }

  .stats-control-left .el-date-picker {
    width: 100% !important;
    max-width: 250px;
  }

  .stats-control-right {
    justify-content: center;
    width: 100%;
  }

  /* 确保开关文字在小屏幕下完整显示 */
  .stats-control-right .el-switch {
    width: 100%;
    max-width: 280px;
  }

  .stats-control-right .el-switch .el-switch__label {
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-row-flex {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem; /* 确保与导航菜单有足够间距 */
  }

  .stat-row-flex .stat-card {
    height: 9rem; /* 进一步增加小屏幕高度 */
    border-radius: 0.5rem;
    padding: 1.2rem 0.8rem; /* 增加内边距 */
  }

  /* 小屏幕下统计卡片文字调整 */
  .stat-row-flex .stat-card .stat-title {
    font-size: 0.9rem; /* 标题文字稍微缩小 */
    margin-bottom: 0.8rem; /* 增加标题下边距 */
    line-height: 1.2;
  }

  .stat-row-flex .stat-card .stat-value {
    font-size: 1rem; /* 数字稍微缩小 */
    font-weight: normal;
    line-height: 1.3;
  }

  .stat-row-flex .stat-card .stat-value b {
    font-size: 1.2rem; /* 加粗数字稍大一些 */
    font-weight: bold;
  }

  .home-footer {
    font-size: 0.8rem;
  }

  .query-card .el-form-item__label {
    width: 50px !important;
    font-size: 0.8rem;
  }

  .query-card .el-input,
  .query-card .el-select {
    font-size: 0.875rem;
  }

  .table-actions .el-input {
    min-width: 150px;
  }

  .table-actions .el-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .table-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    justify-content: center; /* 居中对齐 */
  }

  /* 小屏幕下分页器样式优化 */
  .table-footer .el-pagination {
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  /* 确保分页器组件在小屏幕下完整显示 */
  .table-footer .el-pagination .el-pagination__sizes {
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .table-footer .el-pagination .el-pagination__total {
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }

  /* 分页器按钮组在小屏幕下的样式 */
  .table-footer .el-pagination .el-pager {
    margin: 0.25rem;
  }

  .table-footer .el-pagination .btn-prev,
  .table-footer .el-pagination .btn-next {
    margin: 0.25rem;
  }

  .chart-box {
    min-height: 200px;
  }
}

/* Excel导出字段选择对话框样式 */
.export-field-selection {
  padding: 10px 0;
}

/* 确保对话框不影响页面布局 */
:deep(.el-dialog) {
  position: fixed !important;
}

:deep(.el-overlay) {
  position: fixed !important;
}

.field-selection-header {
  margin-bottom: 20px;
  text-align: center;
}

.field-selection-header .el-button {
  margin: 0 5px;
}

.field-selection-content {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
}

.field-checkbox {
  margin-bottom: 12px;
  width: 100%;
  display: block;
}

.field-checkbox .el-checkbox__label {
  font-size: 14px;
  color: #606266;
}

.required-mark {
  color: #f56c6c;
  font-size: 12px;
  margin-left: 4px;
}

.field-selection-info {
  margin-top: 15px;
}

.field-selection-info .el-alert {
  border-radius: 4px;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 10px;
}

/* 按钮高亮效果 */
.active-selection-btn {
  animation: buttonHighlight 2s ease-in-out;
}

@keyframes buttonHighlight {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(64, 158, 255, 0.3);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}
</style>