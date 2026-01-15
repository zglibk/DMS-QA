<template>
  <component :is="containerComponent">
    <div class="shipment-report-page" :class="{ 'admin-page': isAdmin, 'frontend-page': !isAdmin }">
      <!-- 页面标题 -->
      <div class="page-header">
          <div class="header-content">
            <div class="title-section">
              <el-icon class="header-icon"><Box /></el-icon>
              <h1>出货检验报告</h1>
            </div>
            <p class="subtitle">查询工单信息，生成客户出货检验报告</p>
          </div>
          <div class="header-actions">
            <el-button :disabled="!userStore.hasPermission('shipment:template:view')" type="primary" plain @click="showTemplateManager = true">
              <el-icon style="margin-right: 4px;"><Setting /></el-icon> 模板管理
            </el-button>
          </div>
        </div>

        <!-- 主内容区域 -->
        <div class="main-content">
          <el-tabs v-model="activeTab" class="main-tabs" tab-position="top" @tab-click="handleTabClick">
            <el-tab-pane label="生成报告" name="generate">
              <div class="generate-pane-content">
                <!-- 左侧：查询和结果 -->
                <div class="left-panel">
            <!-- 搜索区域 -->
            <el-card shadow="hover" class="search-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Search /></el-icon>
                  <span>第一步：查询产品信息</span>
                  <el-radio-group v-model="searchMode" size="small" style="margin-left: auto;">
                    <el-radio-button value="single">单条查询</el-radio-button>
                    <el-radio-button value="batch">批量查询</el-radio-button>
                  </el-radio-group>
                </div>
              </template>
              
              <!-- 单条查询模式 -->
              <el-form v-if="searchMode === 'single'" :model="searchForm" label-width="100px" class="search-form">
                <el-row :gutter="16">
                  <el-col :span="6">
                    <el-form-item label="工单号">
                      <el-input v-model.trim="searchForm.pNum" placeholder="如 GD25080001" clearable @keyup.enter="handleSearch">
                        <template #prefix><el-icon><Document /></el-icon></template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="产品编号">
                      <el-input v-model.trim="searchForm.materialId" placeholder="客户料号/产品编码" clearable @keyup.enter="handleSearch">
                        <template #prefix><el-icon><Collection /></el-icon></template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="CPO">
                      <el-input v-model.trim="searchForm.cpo" placeholder="客户采购订单号" clearable @keyup.enter="handleSearch">
                        <template #prefix><el-icon><Tickets /></el-icon></template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="产品名称">
                      <el-input v-model.trim="searchForm.materialName" placeholder="产品名称关键字" clearable @keyup.enter="handleSearch">
                        <template #prefix><el-icon><Goods /></el-icon></template>
                      </el-input>
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <el-row :gutter="16">
                  <el-col :span="6">
                    <el-form-item label="开始时间">
                      <el-date-picker v-model="searchForm.startDate" type="datetime" placeholder="选择开始时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="结束时间">
                      <el-date-picker v-model="searchForm.endDate" type="datetime" placeholder="选择结束时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="4">
                    <el-form-item label="匹配范围">
                       <el-tooltip content="以工单开单日期为中心，前后N个月作为物料入库匹配范围" placement="top">
                          <el-input-number v-model="searchForm.matchMonthRange" :min="1" :max="24" style="width: 100%" controls-position="right" />
                       </el-tooltip>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label=" ">
                      <div class="btn-group">
                        <el-button :disabled="!userStore.hasPermission('shipment:report:search')" type="primary" @click="handleSearch" :loading="loading">
                          <el-icon style="margin-right: 4px;"><Search /></el-icon> 查询
                        </el-button>
                        <el-button @click="handleReset">
                          <el-icon style="margin-right: 4px;"><Refresh /></el-icon> 重置
                        </el-button>
                        <span class="search-tip">提示：无工单号时，需同时输入产品编号和CPO</span>
                      </div>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form>
              
              <!-- 批量查询模式 -->
              <div v-else class="batch-search-form">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <div class="batch-input-section">
                      <div class="section-header">
                        <span class="section-title">从 欠料表/ERP 粘贴数据</span>
                        <el-tooltip content="从欠料表/ERP复制2列数据（CPO列 + 产品编号列），支持多行" placement="top">
                          <el-icon class="help-icon"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </div>
                      <el-input 
                        ref="batchInputRef"
                        v-model="batchInputText" 
                        type="textarea" 
                        :rows="6" 
                        placeholder="从欠料表/ERP批量复制后，在此处粘贴（Ctrl+V）&#10;&#10;格式：同时复制【CPO】+【产品编号】这2列的一行或多行&#10;示例：&#10;4200014505	R64-873129-020&#10;5000065230	RKT64-015392-020"
                        @paste="handleBatchPaste"
                      />
                      <div class="batch-actions">
                        <el-button type="primary" plain @click="parseBatchInput">
                          <el-icon style="margin-right: 4px;"><DocumentCopy /></el-icon> 解析数据
                        </el-button>
                        <el-button type="danger" plain @click="clearBatchInput">
                          <el-icon style="margin-right: 4px;"><Delete /></el-icon> 清空
                        </el-button>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="12">
                    <div class="batch-preview-section">
                      <div class="section-header">
                        <span class="section-title">待查询列表</span>
                        <el-tag v-if="batchQueryList.length > 0" size="small" type="success">{{ batchQueryList.length }} 条</el-tag>
                      </div>
                      <el-table :data="batchQueryList" size="small" max-height="180" border>
                        <el-table-column type="index" label="#" width="45" align="center" />
                        <el-table-column prop="cpo" label="CPO" width="110" show-overflow-tooltip align="center" />
                        <el-table-column prop="productId" label="产品编号" min-width="120" show-overflow-tooltip align="center" />
                        <el-table-column prop="pNum" label="工单号" width="110" show-overflow-tooltip align="center">
                          <template #default="{ row }">
                            <span v-if="row.pNum" class="pnum-cell">{{ row.pNum }}</span>
                            <span v-else-if="row.matched === false" class="pnum-unmatched">未匹配</span>
                            <span v-else class="pnum-pending">待查询</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="操作" width="110" align="center">
                          <template #default="{ $index }">
                            <el-button type="danger" link size="small" @click="removeBatchItem($index)">
                              <el-icon style="margin-right: 4px;"><Delete /></el-icon> 删除
                            </el-button>
                          </template>
                        </el-table-column>
                      </el-table>
                    </div>
                  </el-col>
                </el-row>
                <el-row :gutter="16" style="margin-top: 16px;">
                  <el-col :span="6">
                    <el-form-item label="开始时间" label-width="70px" style="margin-bottom: 0;">
                      <el-date-picker v-model="searchForm.startDate" type="datetime" placeholder="选择开始时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="结束时间" label-width="70px" style="margin-bottom: 0;">
                      <el-date-picker v-model="searchForm.endDate" type="datetime" placeholder="选择结束时间" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <div class="btn-group" style="padding-top: 0;">
                      <el-button :disabled="!userStore.hasPermission('shipment:report:search') || batchQueryList.length === 0" type="primary" @click="handleBatchSearch" :loading="loading">
                        <el-icon style="margin-right: 4px;"><Search /></el-icon> 批量查询 ({{ batchQueryList.length }})
                      </el-button>
                      <el-button @click="handleReset">
                        <el-icon style="margin-right: 4px;"><Refresh /></el-icon> 重置
                      </el-button>
                      <span class="search-tip">适用于A08等客户的多产品合并出货报告</span>
                    </div>
                  </el-col>
                </el-row>
              </div>
            </el-card>

            <!-- 工单信息卡片（仅单条查询时显示，批量查询时不显示） -->
            <el-card v-if="result.workOrderInfo && !result.isBatchResult" shadow="hover" class="result-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Tickets /></el-icon>
                  <span>工单信息</span>
                  <el-tag type="success" v-if="result.workOrderInfo.StatusDes">{{ result.workOrderInfo.StatusDes }}</el-tag>
                </div>
              </template>
              
              <el-descriptions :column="4" border size="small">
                <el-descriptions-item label="工单号"><el-text type="primary" tag="b">{{ result.workOrderInfo.PNum }}</el-text></el-descriptions-item>
                <el-descriptions-item label="订单号">{{ result.workOrderInfo.OrderNum }}</el-descriptions-item>
                <el-descriptions-item label="CPO">{{ result.workOrderInfo.CPO || '-' }}</el-descriptions-item>
                <el-descriptions-item label="客户编码"><el-tag size="small">{{ result.workOrderInfo.CustomerID }}</el-tag></el-descriptions-item>
                <el-descriptions-item label="客户名称">{{ result.workOrderInfo.Customer }}</el-descriptions-item>
                <el-descriptions-item label="产品名称" :span="2">{{ result.workOrderInfo.Product }}</el-descriptions-item>
                <el-descriptions-item label="开单日期">{{ result.workOrderInfo.InDate || '-' }}</el-descriptions-item>
                <el-descriptions-item label="交货日期">{{ result.workOrderInfo.DeliveryDate }}</el-descriptions-item>
                <el-descriptions-item label="业务员" :span="2">{{ result.workOrderInfo.Sales }}</el-descriptions-item>
              </el-descriptions>
            </el-card>

            <!-- 产品资料卡片 -->
            <el-card v-if="result.productInfo && result.productInfo.length > 0" shadow="hover" class="result-card product-card">
              <template #header>
                <div class="card-header product-card-header">
                  <div class="header-left">
                    <el-icon><ShoppingBag /></el-icon>
                    <span>第二步：选择产品生成报告</span>
                    <el-tag>{{ result.productInfo.length }} 项</el-tag>
                    <el-button v-if="selectedProducts.length > 1" :disabled="!userStore.hasPermission('shipment:report:export')" type="success" @click="handleBatchGenerateReport">
                      <el-icon style="margin-right: 4px;"><Printer /></el-icon> 合并生成报告 ({{ selectedProducts.length }}项)
                    </el-button>
                  </div>
                  <span class="header-tip">勾选多个产品可合并生成一份报告</span>
                </div>
              </template>
              
              <el-table 
                ref="productTableRef"
                :data="result.productInfo" 
                stripe border 
                highlight-current-row 
                @row-click="handleProductSelect" 
                @selection-change="handleSelectionChange"
                :row-class-name="getProductRowClass"
              >
                <el-table-column type="selection" width="45" align="center" />
                <el-table-column type="index" label="序号" width="60" align="center" />
                <el-table-column prop="cpo" label="CPO" width="120" align="center" show-overflow-tooltip />
                <el-table-column prop="cProductId" label="客户料号" min-width="140" align="center" show-overflow-tooltip />
                <el-table-column prop="product" label="产品名称" min-width="180" header-align="center" show-overflow-tooltip />
                <el-table-column prop="cProduct" label="工厂订单号" min-width="120" align="center" show-overflow-tooltip />
                <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
                <el-table-column prop="pCount" label="成品数" width="80" align="center" />
                <el-table-column label="操作" width="120" align="center" fixed="right">
                  <template #default="{ row }">
                    <el-button :disabled="!userStore.hasPermission('shipment:report:export')" type="primary" size="small" @click.stop="handleGenerateReport(row)">
                      <el-icon style="margin-right: 4px;"><Printer /></el-icon> 生成报告
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <!-- 物料信息折叠面板（仅单条查询时显示） -->
            <el-collapse v-if="!result.isBatchResult && (result.materialList.length > 0 || result.materialInList.length > 0)" v-model="activeCollapse" class="material-collapse">
              <el-collapse-item name="material" v-if="result.materialList.length > 0">
                <template #title>
                  <div class="collapse-title">
                    <el-icon><Files /></el-icon>
                    <span>物料信息</span>
                    <el-tag type="info" size="small">{{ result.materialList.length }} 项</el-tag>
                  </div>
                </template>
                <el-table :data="result.materialList" stripe border size="small" max-height="300">
                  <el-table-column prop="type" label="类型" width="70">
                    <template #default="{ row }">
                      <el-tag :type="row.type === '纸张' ? 'primary' : 'warning'" size="small">{{ row.type }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="name" label="物料名称" min-width="180" show-overflow-tooltip />
                  <el-table-column prop="brand" label="品牌/供应商" width="120" show-overflow-tooltip />
                  <el-table-column prop="spec" label="规格" width="100" show-overflow-tooltip />
                  <el-table-column label="数量" width="100" align="right">
                    <template #default="{ row }">{{ row.srcCount || row.count || '-' }}</template>
                  </el-table-column>
                </el-table>
              </el-collapse-item>

              <el-collapse-item name="materialIn" v-if="result.materialInList.length > 0">
                <template #title>
                  <div class="collapse-title">
                    <el-icon><OfficeBuilding /></el-icon>
                    <span>物料入库明细（供应商信息）</span>
                    <el-tag type="success" size="small">{{ result.materialInList.length }} 条</el-tag>
                  </div>
                </template>
                <el-table :data="result.materialInList" stripe border size="small" max-height="300">
                  <el-table-column prop="inId" label="入库单号" width="110" align="center" header-align="center" show-overflow-tooltip />
                  <el-table-column prop="inDate" label="入库日期" width="150" align="center" header-align="center" show-overflow-tooltip />
                  <el-table-column prop="apoid" label="采购单号" width="110" align="center" header-align="center" show-overflow-tooltip />
                  <el-table-column prop="supply" label="供应商" min-width="200" align="left" header-align="center" show-overflow-tooltip>
                    <template #default="{ row }">
                      <el-text type="primary" tag="b">{{ row.supply }}</el-text>
                    </template>
                  </el-table-column>
                  <el-table-column prop="materialName" label="物料名称" min-width="200" align="left" header-align="center" show-overflow-tooltip />
                  <el-table-column prop="spec" label="规格" width="120" align="center" header-align="center" show-overflow-tooltip />
                  <el-table-column prop="model" label="型号" width="100" align="center" header-align="center" show-overflow-tooltip />
                  <el-table-column prop="materialType" label="物料类型" width="100" align="center" header-align="center" show-overflow-tooltip />
                  <el-table-column prop="materialSubType" label="子类型" width="120" align="center" header-align="center" show-overflow-tooltip />
                  <el-table-column prop="count" label="入库数量" width="90" align="center" header-align="center" />
                  <el-table-column prop="calUnit" label="单位" width="60" align="center" header-align="center" />
                </el-table>
              </el-collapse-item>
            </el-collapse>

            <!-- 初始提示 -->
            <div v-if="!hasSearched" class="initial-hint">
              <div class="hint-header">
                <el-icon :size="24" color="#c0c4cc"><Search /></el-icon>
                <span class="hint-title">请输入工单号或物料信息进行查询</span>
              </div>
              <div class="hint-text">
                <p>使用说明：</p>
                <ul>
                  <li>1. 输入<strong>工单号</strong>、<strong>物料编号</strong>或<strong>物料名称</strong>查询</li>
                  <li>2. 在产品资料中点击<strong>生成报告</strong>按钮</li>
                  <li>3. 系统根据客户模板生成出货检验报告</li>
                </ul>
              </div>
            </div>

            <el-empty v-if="hasSearched && !result.workOrderInfo && result.materialList.length === 0 && result.productInfo.length === 0" description="未查询到相关数据">
              <el-button type="primary" @click="handleReset">重置条件</el-button>
            </el-empty>
          </div>

          <!-- 右侧：报告预览（批量查询时不显示） -->
          <div class="right-panel" v-if="selectedProduct && !result.isBatchResult">
            <el-card shadow="hover" class="preview-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Document /></el-icon>
                  <span>报告预览</span>
                  <div class="preview-actions">
                    <el-button :disabled="!userStore.hasPermission('shipment:report:export')" type="success" size="small" @click="handleQuickExport"><el-icon style="margin-right: 4px;"><Download /></el-icon> 导出</el-button>
                    <el-button :disabled="!userStore.hasPermission('shipment:report:export')" type="primary" size="small" @click="handleQuickPrint"><el-icon style="margin-right: 4px;"><Printer /></el-icon> 打印</el-button>
                  </div>
                </div>
              </template>

              <div class="report-preview" ref="previewRef">
                <div class="report-header">
                  <h2>出货检验报告</h2>
                  <p class="report-no">报告编号：{{ reportPreview.reportNo }}</p>
                </div>

                <el-descriptions :column="2" border size="small" class="report-info">
                  <el-descriptions-item label="客户编码">{{ result.workOrderInfo?.CustomerID }}</el-descriptions-item>
                  <el-descriptions-item label="工单号">{{ result.workOrderInfo?.PNum }}</el-descriptions-item>
                  <el-descriptions-item label="CPO">{{ result.workOrderInfo?.CPO || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="订单号">{{ result.workOrderInfo?.OrderNum }}</el-descriptions-item>
                  <el-descriptions-item label="产品编码">{{ selectedProduct.productId }}</el-descriptions-item>
                  <el-descriptions-item label="客户料号">{{ selectedProduct.cProductId }}</el-descriptions-item>
                  <el-descriptions-item label="产品名称" :span="2">{{ selectedProduct.product }}</el-descriptions-item>
                  <el-descriptions-item label="规格">{{ selectedProduct.scale }}</el-descriptions-item>
                  <el-descriptions-item label="数量">{{ selectedProduct.pCount || selectedProduct.orderCount }}</el-descriptions-item>
                </el-descriptions>

                <div class="report-section">
                  <h4>原材料信息</h4>
                  <el-table :data="result.materialList" border size="small" max-height="180">
                    <el-table-column prop="type" label="类型" width="60" />
                    <el-table-column prop="name" label="物料名称" min-width="120" show-overflow-tooltip />
                    <el-table-column prop="brand" label="供应商" width="100" show-overflow-tooltip />
                    <el-table-column prop="spec" label="规格" width="80" />
                  </el-table>
                </div>

                <div class="report-section">
                  <h4>检验结果</h4>
                  <el-descriptions :column="2" border size="small">
                    <el-descriptions-item label="外观检验"><el-tag type="success" size="small">合格</el-tag></el-descriptions-item>
                    <el-descriptions-item label="尺寸检验"><el-tag type="success" size="small">合格</el-tag></el-descriptions-item>
                    <el-descriptions-item label="功能检验"><el-tag type="success" size="small">合格</el-tag></el-descriptions-item>
                    <el-descriptions-item label="包装检验"><el-tag type="success" size="small">合格</el-tag></el-descriptions-item>
                  </el-descriptions>
                </div>

                <div class="report-footer">
                  <div class="signature-row">
                    <div class="signature-item"><span>检验员：</span><span class="signature-line"></span></div>
                    <div class="signature-item"><span>审核：</span><span class="signature-line"></span></div>
                    <div class="signature-item"><span>日期：</span><span class="signature-line">{{ reportPreview.date }}</span></div>
                  </div>
                </div>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="报告记录" name="history">
        <div class="history-pane-content">
          <el-card shadow="never" class="history-card">
            <div class="history-toolbar">
              <el-input v-model="historyQuery.keyword" placeholder="搜索报告编号/工单号/CPO" clearable style="width: 300px" @keyup.enter="fetchHistory" @clear="fetchHistory">
                <template #append><el-button @click="fetchHistory"><el-icon><Search /></el-icon></el-button></template>
              </el-input>
              <el-button @click="fetchHistory"><el-icon style="margin-right: 4px;"><Refresh /></el-icon> 刷新</el-button>
            </div>
            
            <el-table 
              :data="historyList" 
              v-loading="historyLoading" 
              stripe border 
              style="width: 100%; margin-top: 12px; flex: 1; cursor: default;" 
              :row-style="{ cursor: 'default' }"
              highlight-current-row
              @current-change="handleHistoryRowChange"
            >
              <el-table-column type="index" label="#" width="50" align="center" />
              <el-table-column prop="ReportNo" label="报告编号" width="140" align="center" show-overflow-tooltip />
              <el-table-column prop="CustomerID" label="客户编码" width="90" align="center" />
              <el-table-column prop="PNum" label="工单号" min-width="140" align="center" show-overflow-tooltip />
              <el-table-column prop="OrderNum" label="订单号" min-width="140" align="center" show-overflow-tooltip />
              <el-table-column prop="CPO" label="CPO" min-width="130" align="center" show-overflow-tooltip />
              <el-table-column prop="ReportDate" label="报告日期" width="160" align="center">
                <template #default="{ row }">{{ formatDateTime(row.ReportDate) }}</template>
              </el-table-column>
              <el-table-column prop="CreatorName" label="创建人" width="80" align="center" />
              <el-table-column label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.Status === 'Generated' || row.Status === 'Saved'" type="info" size="small">草稿</el-tag>
                  <el-tag v-else-if="row.Status === 'Submitted'" type="warning" size="small">待审核</el-tag>
                  <el-tag v-else-if="row.Status === 'Approved'" type="success" size="small">已审核</el-tag>
                  <el-tag v-else-if="row.Status === 'Rejected'" type="danger" size="small">已驳回</el-tag>
                  <el-tag v-else type="info" size="small">{{ row.Status || '草稿' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" align="center" fixed="right">
                <template #default="{ row }">
                  <div class="action-buttons">
                    <el-button link type="primary" size="small" @click="handleExportHistoryReport(row)">导出</el-button>
                    <el-dropdown trigger="click" @command="(cmd) => handleShipmentCommand(cmd, row)">
                      <el-button link type="primary" size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="submit" :disabled="!canSubmitShipment(row)">
                            <el-icon color="#67c23a"><Promotion /></el-icon> 提交审核
                          </el-dropdown-item>
                          <el-dropdown-item command="revoke" :disabled="!canRevokeShipment(row)">
                            <el-icon color="#e6a23c"><RefreshLeft /></el-icon> 撤回
                          </el-dropdown-item>
                          <el-dropdown-item command="audit" :disabled="!canAuditShipment(row)">
                            <el-icon color="#409eff"><Check /></el-icon> 审核
                          </el-dropdown-item>
                          <el-dropdown-item command="print" divided>
                            <el-icon color="#909399"><Printer /></el-icon> 打印
                          </el-dropdown-item>
                          <el-dropdown-item command="delete" :disabled="row.Status === 'Submitted'">
                            <el-icon color="#f56c6c"><Delete /></el-icon> 删除
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="pagination-container" style="display: flex; justify-content: center; margin-top: 16px;">
              <el-pagination
                v-model:current-page="historyQuery.page"
                v-model:page-size="historyQuery.pageSize"
                :total="historyTotal"
                :page-sizes="[5, 10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="fetchHistory"
                @current-change="fetchHistory"
              />
            </div>

            <el-card v-if="currentHistoryRow" class="detail-card" style="margin-top: 16px; flex-shrink: 0; max-height: 40%; overflow-y: auto;" shadow="never">
              <template #header>
                <div class="card-header" style="display: flex; align-items: center;">
                  <el-icon style="margin-right: 6px; color: #909399;"><Tickets /></el-icon>
                  <span>报告详情</span>
                </div>
              </template>
              <div class="report-info-grid">
                <el-row :gutter="20" justify="center">
                  <el-col :span="6">
                    <div class="info-block">
                      <div class="label">报告编号：</div>
                      <div class="value">{{ currentHistoryRow.ReportNo }}</div>
                    </div>
                  </el-col>
                  <el-col :span="3">
                    <div class="info-block">
                      <div class="label">客户编码：</div>
                      <div class="value">{{ currentHistoryRow.CustomerID }}</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="info-block">
                      <div class="label">报告日期：</div>
                      <div class="value">{{ formatDateTime(currentHistoryRow.ReportDate) }}</div>
                    </div>
                  </el-col>
                  <el-col :span="3">
                    <div class="info-block">
                      <div class="label">创建人：</div>
                      <div class="value">{{ currentHistoryRow.CreatorName }}</div>
                    </div>
                  </el-col>
                  <el-col :span="6">
                    <div class="info-block">
                      <div class="label">创建时间：</div>
                      <div class="value">{{ formatDateTime(currentHistoryRow.CreatedAt) }}</div>
                    </div>
                  </el-col>
                </el-row>
              </div>
              
              <div style="margin-top: 16px;">
                <div style="margin-bottom: 8px; font-weight: bold; font-size: 14px; display: flex; align-items: center;">
                  <el-icon style="margin-right: 6px; color: #409EFF;"><Goods /></el-icon>
                  产品信息
                </div>
                <el-table 
                  ref="historyProductTableRef"
                  :data="currentProductList" 
                  border 
                  size="small"
                  highlight-current-row
                  @current-change="handleHistoryProductSelect"
                  style="cursor: pointer;"
                >
                   <el-table-column type="index" label="#" width="45" align="center" />
                   <el-table-column prop="cpo" label="CPO" width="110" show-overflow-tooltip align="center" />
                   <el-table-column prop="orderNum" label="订单号" width="100" show-overflow-tooltip align="center" />
                   <el-table-column prop="pNum" label="工单号" width="100" show-overflow-tooltip align="center" />
                   <el-table-column prop="cProductId" label="客户料号" width="130" show-overflow-tooltip align="center" />
                   <el-table-column prop="product" label="产品名称" min-width="120" show-overflow-tooltip header-align="center" />
                   <el-table-column label="规格" min-width="80" show-overflow-tooltip align="center">
                     <template #default="{ row }">
                       {{ getProductScaleFromInspectionData(row) || row.scale || '-' }}
                     </template>
                   </el-table-column>
                   <el-table-column prop="cProduct" label="工厂订单号" width="90" show-overflow-tooltip align="center" />
                   <el-table-column prop="orderCount" label="订单数" width="70" align="center" />
                   <el-table-column prop="pCount" label="成品数" width="70" align="center" />
                   <el-table-column label="抽检数" width="70" align="center">
                     <template #default="{ row }">
                       {{ calculateSampleSize(row.pCount || row.orderCount) }}
                     </template>
                   </el-table-column>
                </el-table>
              </div>

              <div style="margin-top: 16px;">
                <div style="margin-bottom: 12px; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
                  <span style="display: flex; align-items: center;">
                    <el-icon style="margin-right: 6px; color: #67C23A;"><CircleCheck /></el-icon>
                    检验数据
                    <span v-if="selectedProductRow" style="font-weight: normal; color: #409EFF; font-size: 13px; margin-left: 8px;">
                      {{ selectedProductRow.product }}
                    </span>
                  </span>
                  <span v-if="getSelectedProductInspectionData().productInfo?.sampleCount" style="font-weight: normal; font-size: 13px;">
                    <el-tag type="info" size="small" effect="plain">抽检: {{ getSelectedProductInspectionData().productInfo?.sampleCount }}</el-tag>
                    <el-tag type="primary" size="small" effect="plain" style="margin-left: 4px;">出货: {{ getSelectedProductInspectionData().productInfo?.count }}</el-tag>
                  </span>
                </div>
                <div v-if="currentHistoryRow.InspectionData && selectedProductRow">
                  <!-- 检验核对结果表格 - 横向布局，类似Excel报告格式 -->
                  <div style="overflow-x: auto; margin-bottom: 12px;">
                    <table class="inspection-check-table" style="width: 100%; min-width: 900px; border-collapse: collapse; font-size: 12px;">
                      <!-- 表头第一行：分组标题 -->
                      <thead>
                        <tr>
                          <th colspan="5" style="border: 1px solid #DCDFE6; padding: 8px 4px; background: #f5f7fa; text-align: center; font-weight: 500;">首件核对</th>
                          <th colspan="3" style="border: 1px solid #DCDFE6; padding: 8px 4px; background: #f5f7fa; text-align: center; font-weight: 500;">工单核对</th>
                          <th colspan="2" style="border: 1px solid #DCDFE6; padding: 8px 4px; background: #f5f7fa; text-align: center; font-weight: 500;">图纸核对</th>
                          <th rowspan="2" style="border: 1px solid #DCDFE6; padding: 8px 4px; background: #f5f7fa; text-align: center; font-weight: 500; vertical-align: middle; min-width: 80px;">规格尺寸</th>
                          <th rowspan="2" style="border: 1px solid #DCDFE6; padding: 8px 4px; background: #f5f7fa; text-align: center; font-weight: 500; vertical-align: middle; min-width: 80px;">实测尺寸</th>
                          <th rowspan="2" style="border: 1px solid #DCDFE6; padding: 8px 4px; background: #f5f7fa; text-align: center; font-weight: 500; vertical-align: middle; min-width: 70px;">结果判定</th>
                        </tr>
                        <!-- 表头第二行：具体检验项 -->
                        <tr>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 45px;">外观</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 45px;">颜色</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 45px;">图文</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 45px;">字体</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 55px;">啤切线</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 65px;">物料编号</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 65px;">模切方式</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 65px;">包装方式</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 45px;">材质</th>
                          <th style="border: 1px solid #DCDFE6; padding: 6px 4px; background: #fafafa; text-align: center; font-weight: normal; color: #606266; min-width: 65px;">印刷内容</th>
                        </tr>
                      </thead>
                      <!-- 数据行 -->
                      <tbody>
                        <tr>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().firstPieceCheck?.appearance || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().firstPieceCheck?.color || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().firstPieceCheck?.graphics || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().firstPieceCheck?.font || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().firstPieceCheck?.dieLine || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().workOrderCheck?.materialNum || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().workOrderCheck?.dieCutStyle || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().workOrderCheck?.packingStyle || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().drawingCheck?.material || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().drawingCheck?.printContent || 'OK' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">{{ getSelectedProductInspectionData().productInfo?.scale || '-' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center; color: #67C23A; font-weight: 500;">{{ getSelectedProductInspectionData().measuredSize || '-' }}</td>
                          <td style="border: 1px solid #DCDFE6; padding: 8px 4px; text-align: center;">
                            <el-tag :type="getSelectedProductInspectionData().result === '合格' ? 'success' : 'danger'" size="small">
                              {{ getSelectedProductInspectionData().result || '合格' }}
                            </el-tag>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <!-- 原材料信息 -->
                  <div style="border: 1px solid #EBEEF5; border-radius: 6px;">
                    <div style="background: #f5f7fa; padding: 8px 12px; border-bottom: 1px solid #EBEEF5; font-size: 13px; font-weight: 500; color: #606266; display: flex; align-items: center;">
                      <el-icon style="margin-right: 6px; color: #E6A23C;"><Files /></el-icon>
                      原材料信息
                    </div>
                    <el-table 
                      :data="getSelectedProductInspectionData().materialList || parseInspectionData(currentHistoryRow.InspectionData)?.materialList || []" 
                      size="small" 
                      max-height="150"
                      :show-header="true"
                    >
                      <el-table-column prop="type" label="类型" width="80" align="center" />
                      <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
                      <el-table-column prop="brand" label="供应商/品牌" min-width="150" show-overflow-tooltip />
                      <el-table-column prop="spec" label="规格" min-width="120" show-overflow-tooltip />
                    </el-table>
                    <div v-if="!(getSelectedProductInspectionData().materialList?.length || parseInspectionData(currentHistoryRow.InspectionData)?.materialList?.length)" style="text-align: center; padding: 20px; color: #C0C4CC; font-size: 12px;">
                      暂无原材料数据
                    </div>
                  </div>
                  
                  <!-- 检验时间 -->
                  <div v-if="getSelectedProductInspectionData().inspectedAt" style="margin-top: 8px; font-size: 11px; color: #909399; text-align: right;">
                    检验时间: {{ formatDateTime(getSelectedProductInspectionData().inspectedAt) }}
                  </div>
                </div>
                <div v-else style="text-align: center; padding: 30px 20px; color: #C0C4CC; font-size: 13px;">
                  <el-icon style="font-size: 32px; margin-bottom: 8px;"><Document /></el-icon>
                  <div>暂无详细检验数据</div>
                  <div style="font-size: 12px; margin-top: 4px;">旧记录或未保存详细信息</div>
                </div>
              </div>
            </el-card>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>

        <!-- 模板管理对话框 -->
        <el-dialog v-model="showTemplateManager" title="出货报告模板管理" width="900px">
          <div class="template-toolbar">
            <el-button :disabled="!userStore.hasPermission('shipment:template:add')" type="primary" @click="handleAddTemplate"><el-icon style="margin-right: 4px;"><Plus /></el-icon> 新增模板</el-button>
            <el-button @click="fetchTemplates"><el-icon style="margin-right: 4px;"><Refresh /></el-icon> 刷新</el-button>
          </div>
          <el-table :data="templateList" stripe border>
            <el-table-column prop="customerId" label="客户编码" width="100" />
            <el-table-column prop="customerName" label="客户名称" width="120" show-overflow-tooltip />
            <el-table-column prop="templateName" label="模板名称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="fileName" label="文件名" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <el-link v-if="row.fileName" type="primary" :underline="false" @click="downloadTemplate(row)">
                  {{ row.fileName }}
                </el-link>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="updateTime" label="更新时间" width="110" />
            <el-table-column label="状态" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" align="center">
              <template #default="{ row }">
                <el-button :disabled="!userStore.hasPermission('shipment:template:edit')" type="primary" link size="small" @click="handleEditTemplate(row)">
                  <el-icon style="margin-right: 4px;"><Edit /></el-icon> 编辑
                </el-button>
                <el-button :disabled="!userStore.hasPermission('shipment:template:delete')" type="danger" link size="small" @click="handleDeleteTemplate(row)">
                  <el-icon style="margin-right: 4px;"><Delete /></el-icon> 删除
                </el-button>
                <el-button :disabled="!userStore.hasPermission('shipment:template:mapping')" type="success" link size="small" @click="openMappingDialog(row)">
                  <el-icon style="margin-right: 4px;"><Setting /></el-icon> 映射
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-dialog>

        <!-- 模板预览与映射编辑 - 已移至独立页面 TemplateMappingEditor.vue -->

        <!-- 新增/编辑模板对话框 -->
        <el-dialog v-model="showTemplateForm" :title="templateFormMode === 'add' ? '新增报告模板' : '编辑报告模板'" width="550px">
          <el-form :model="templateForm" label-width="100px" :rules="templateRules" ref="templateFormRef">
            <el-form-item label="客户编码" prop="customerId">
              <el-input v-model="templateForm.customerId" placeholder="请输入客户编码" />
            </el-form-item>
            <el-form-item label="客户名称" prop="customerName">
              <el-input v-model="templateForm.customerName" placeholder="请输入客户名称" />
            </el-form-item>
            <el-form-item label="模板名称" prop="templateName">
              <el-input v-model="templateForm.templateName" placeholder="请输入模板名称" />
            </el-form-item>
            <el-form-item label="模板说明">
              <el-input v-model="templateForm.description" type="textarea" :rows="3" placeholder="请输入模板说明" />
            </el-form-item>
            <el-form-item label="模板文件" :required="templateFormMode === 'add'">
              <!-- 编辑模式：显示当前文件 -->
              <div v-if="templateFormMode === 'edit' && templateForm.fileName" class="current-file-info">
                <div class="file-row">
                  <el-icon><Document /></el-icon>
                  <span class="file-name" :title="templateForm.fileName">{{ templateForm.fileName }}</span>
                  <el-button type="primary" link size="small" @click="downloadCurrentTemplate">
                    <el-icon style="margin-right: 4px;"><Download /></el-icon> 下载
                  </el-button>
                </div>
                <div class="file-action">
                  <el-upload 
                    ref="replaceUploadRef"
                    :auto-upload="false" 
                    :limit="1" 
                    :show-file-list="false"
                    accept=".xlsx,.xls,.docx,.doc" 
                    :on-change="handleReplaceTemplateFile"
                  >
                    <el-button type="warning" size="small">
                      <el-icon style="margin-right: 4px;"><RefreshRight /></el-icon> 替换文件
                    </el-button>
                  </el-upload>
                  <span v-if="templateForm.newFileName" class="new-file-hint">
                    <el-icon><Check /></el-icon>
                    新文件：{{ templateForm.newFileName }}
                  </span>
                </div>
              </div>
              <!-- 新增模式：选择文件 -->
              <el-upload 
                v-else
                :auto-upload="false" 
                :limit="1" 
                accept=".xlsx,.xls,.docx,.doc" 
                :on-change="handleTemplateFileChange"
              >
                <el-button type="primary"><el-icon style="margin-right: 4px;"><Upload /></el-icon> 选择文件</el-button>
                <template #tip><div class="el-upload__tip">支持 Excel、Word 格式</div></template>
              </el-upload>
            </el-form-item>
            <el-form-item label="启用状态">
              <el-switch v-model="templateForm.enabled" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showTemplateForm = false">取消</el-button>
            <el-button type="primary" @click="handleSaveTemplate">保存</el-button>
          </template>
        </el-dialog>

        <!-- 生成报告对话框 -->
        <el-dialog v-model="showReportDialog" title="生成出货检验报告" width="580px">
          <el-alert 
            :type="reportDialogProducts.length > 1 ? 'success' : 'info'" 
            :closable="false" 
            show-icon 
            :title="reportDialogProducts.length > 1 ? `将合并 ${reportDialogProducts.length} 个产品生成一份报告` : '即将为以下产品生成出货检验报告'" 
          />
          
          <!-- 单产品显示 -->
          <el-descriptions v-if="reportDialogProducts.length === 1" :column="2" border size="small" style="margin-top: 16px">
            <el-descriptions-item label="客户编码">{{ result.workOrderInfo?.CustomerID || reportDialogProducts[0]?.customerId }}</el-descriptions-item>
            <el-descriptions-item label="产品编码">{{ reportDialogProducts[0]?.productId }}</el-descriptions-item>
            <el-descriptions-item label="客户料号">{{ reportDialogProducts[0]?.cProductId }}</el-descriptions-item>
            <el-descriptions-item label="产品名称">{{ reportDialogProducts[0]?.product }}</el-descriptions-item>
            <el-descriptions-item label="数量">{{ reportDialogProducts[0]?.pCount || reportDialogProducts[0]?.orderCount }}</el-descriptions-item>
            <el-descriptions-item label="抽检数">{{ calculateSampleSize(reportDialogProducts[0]?.pCount || reportDialogProducts[0]?.orderCount) }}</el-descriptions-item>
          </el-descriptions>
          
          <!-- 多产品列表 -->
          <div v-else style="margin-top: 16px">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="客户编码">{{ result.workOrderInfo?.CustomerID || reportDialogProducts[0]?.customerId }}</el-descriptions-item>
              <el-descriptions-item label="工单号">{{ result.workOrderInfo?.PNum }}</el-descriptions-item>
            </el-descriptions>
            <el-table :data="reportDialogProducts" border size="small" style="margin-top: 12px" max-height="200">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="cProductId" label="客户料号" min-width="140" show-overflow-tooltip />
              <el-table-column prop="product" label="产品名称" min-width="150" show-overflow-tooltip />
              <el-table-column prop="pCount" label="数量" width="80" align="right">
                <template #default="{ row }">{{ row.pCount || row.orderCount }}</template>
              </el-table-column>
            </el-table>
            <div style="margin-top: 8px; color: #909399; font-size: 12px;">
              合计：{{ reportDialogProducts.reduce((sum, p) => sum + (p.pCount || p.orderCount || 0), 0) }} 件
            </div>
          </div>
          
          <el-form label-width="100px" style="margin-top: 16px">
            <el-form-item label="报告模板">
              <el-select v-model="selectedTemplateId" placeholder="选择报告模板" style="width: 100%">
                <el-option v-for="tpl in availableTemplates" :key="tpl.id" :label="tpl.templateName" :value="tpl.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="报告格式">
              <el-radio-group v-model="reportFormat">
                <el-radio label="excel">Excel</el-radio>
                <el-radio label="pdf">PDF</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showReportDialog = false">取消</el-button>
            <el-button type="primary" @click="confirmGenerateReport" :loading="generatingReport">
              <el-icon style="margin-right: 4px;"><Printer /></el-icon> 生成报告
            </el-button>
          </template>
        </el-dialog>

        <!-- 出货检验审核对话框 -->
        <el-dialog v-model="shipmentAuditDialogVisible" title="审核出货检验报告" width="400px">
          <el-form>
            <el-form-item label="审核结果">
              <el-radio-group v-model="shipmentAuditForm.action">
                <el-radio label="pass">通过</el-radio>
                <el-radio label="reject">驳回</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="审核意见">
              <el-input type="textarea" v-model="shipmentAuditForm.comment" :placeholder="shipmentAuditForm.action === 'reject' ? '请输入驳回原因（必填）' : '请输入审核意见（选填）'" :rows="3" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="shipmentAuditDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmShipmentAudit" :loading="shipmentAuditLoading" :disabled="shipmentAuditForm.action === 'reject' && !shipmentAuditForm.comment">确定</el-button>
          </template>
        </el-dialog>
      </div>
  </component>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Box, Search, Document, Collection, Goods, Refresh, Tickets, ShoppingBag, Files, OfficeBuilding, Setting, Plus, Upload, Download, Printer, RefreshRight, Check, QuestionFilled, DocumentCopy, Delete, Edit, Grid, Position, CircleCheck, Promotion, ArrowDown, RefreshLeft } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import ExcelJS from 'exceljs'
import api from '@/utils/api'
import { submitShipmentReport, approveShipmentReport, rejectShipmentReport, revokeShipmentReport } from '@/api/inspection'

const route = useRoute()
const router = useRouter()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const containerComponent = computed(() => 'div')

const searchForm = reactive({ pNum: '', materialId: '', materialName: '', cpo: '', startDate: '', endDate: '', matchMonthRange: 1 })
const loading = ref(false)
const hasSearched = ref(false)
const result = reactive({ workOrderInfo: null, materialList: [], materialInList: [], productInfo: [], isBatchResult: false })
const activeCollapse = ref(['material'])
const selectedProduct = ref(null)

// 批量查询相关
const searchMode = ref('batch')  // 默认批量查询模式
const batchInputText = ref('')
const batchQueryList = ref([])  // { cpo: string, productId: string, pNum?: string }[]
const batchInputRef = ref(null)
const previewRef = ref(null)
const reportPreview = reactive({ reportNo: '', date: '' })
const productTableRef = ref(null)
const historyProductTableRef = ref(null)  // 报告详情中的产品表格 ref
const selectedProducts = ref([])  // 多选的产品列表
const activeTab = ref('history')
const historyLoading = ref(false)
const historyList = ref([])
const historyTotal = ref(0)
const todayReportCount = ref(0)
const currentHistoryRow = ref(null)
const selectedProductRow = ref(null)
const historyQuery = reactive({
  page: 1,
  pageSize: 5,
  keyword: ''
})

// 初始化查询时间范围（默认前90天）
onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 6)
  searchForm.startDate = formatDateTime(start)
  searchForm.endDate = formatDateTime(end)
  
  // 加载模板列表
  loadTemplatesFromStorage()
  fetchTemplates()
  fetchHistory()
})
const currentProductList = computed(() => {
  if (!currentHistoryRow.value || !currentHistoryRow.value.ProductInfo) return []
  return parseProductInfo(currentHistoryRow.value.ProductInfo)
})

// 引入用户Store
import { useUserStore } from '@/store/user'
const userStore = useUserStore()

/**
 * 获取当前登录用户名
 * 优先从 Pinia userStore 获取，其次从 localStorage 获取
 */
function getCurrentUserName() {
  // 1. 优先从 Pinia userStore 获取
  try {
    if (userStore?.user) {
      const user = userStore.user
      // 尝试多种用户名字段
      const name = user.realName || user.RealName || 
                   user.userName || user.UserName ||
                   user.username || user.Username || 
                   user.name || user.Name ||
                   user.nickName || user.NickName ||
                   user.displayName || user.DisplayName
      if (name) return name
    }
  } catch (e) {
    console.warn('从userStore获取用户信息失败:', e)
  }
  
  // 2. 从 localStorage 获取（Pinia 持久化存储）
  try {
    // Pinia 持久化通常存储在这些键名下
    const possibleKeys = ['user', 'userInfo', 'pinia-user', 'auth', 'currentUser', 'loginUser']
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        // 可能是 { user: {...} } 或直接是用户对象
        const userObj = parsed.user || parsed
        const name = userObj.realName || userObj.RealName ||
                     userObj.userName || userObj.UserName ||
                     userObj.username || userObj.Username || 
                     userObj.name || userObj.Name ||
                     userObj.nickName || userObj.NickName ||
                     userObj.displayName || userObj.DisplayName
        if (name) return name
      }
    }
  } catch (e) {
    console.warn('从localStorage获取用户信息失败:', e)
  }
  
  return '' // 未找到用户信息时返回空
}

/**
 * 获取报告历史记录
 */
async function fetchHistory() {
  historyLoading.value = true
  try {
    const res = await api.get('/shipment-report', {
      params: {
        page: historyQuery.page,
        pageSize: historyQuery.pageSize,
        keyword: historyQuery.keyword
      }
    })
    // 注意：api 响应拦截器已经返回 response.data，所以这里直接使用 res
    if (res) {
      historyList.value = res.data || []
      historyTotal.value = res.total || 0
      todayReportCount.value = res.todayCount || 0
    }
  } catch (e) {
    ElMessage.error('获取历史记录失败: ' + (e.message || '未知错误'))
  } finally {
    historyLoading.value = false
  }
}

/**
 * 切换标签页
 */
function handleTabClick(tab) {
  if (tab.paneName === 'history') {
    fetchHistory()
  }
}

/**
 * 删除历史记录
 */
function handleDeleteHistory(row) {
  ElMessageBox.confirm(
    `确定要删除报告记录 "${row.ReportNo}" 吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await api.delete(`/shipment-report/${row.ID}`)
      ElMessage.success('删除成功')
      fetchHistory()
      if (currentHistoryRow.value && currentHistoryRow.value.ID === row.ID) {
        currentHistoryRow.value = null
      }
    } catch (e) {
      ElMessage.error('删除失败: ' + (e.message || '未知错误'))
    }
  }).catch(() => {})
}

// 下拉菜单命令处理
function handleShipmentCommand(command, row) {
  switch (command) {
    case 'submit':
      handleSubmitShipment(row)
      break
    case 'revoke':
      handleRevokeShipment(row)
      break
    case 'audit':
      handleAuditShipment(row)
      break
    case 'print':
      handleExportHistoryReport(row)
      break
    case 'delete':
      handleDeleteHistory(row)
      break
  }
}

/**
 * 判断当前用户是否为出货检验报告的创建人
 * @param {Object} row 报告记录
 * @returns {boolean}
 */
function isShipmentCreator(row) {
  if (!row || !userStore.user) return false
  
  // 比较用户名（CreatedBy存储的是username）
  const createdBy = (row.CreatedBy || '').toLowerCase()
  const currentUsername = (userStore.user.username || '').toLowerCase()
  
  if (createdBy && currentUsername && createdBy === currentUsername) {
    return true
  }
  
  // 也比较用户ID（如果有的话）
  if (row.CreatedByID && userStore.user.id && row.CreatedByID === userStore.user.id) {
    return true
  }
  
  // 比较真实姓名（作为兜底）
  const creatorName = (row.CreatorName || '').toLowerCase()
  const currentRealName = (userStore.user.realName || userStore.user.RealName || '').toLowerCase()
  
  if (creatorName && currentRealName && creatorName === currentRealName) {
    return true
  }
  
  return false
}

/**
 * 判断是否可以提交审核
 * 条件：草稿/生成/驳回状态 且 是创建人
 */
function canSubmitShipment(row) {
  if (!row) return false
  const allowedStatus = ['Generated', 'Saved', 'Rejected', '', null, undefined]
  const statusOk = !row.Status || allowedStatus.includes(row.Status)
  return statusOk && isShipmentCreator(row)
}

/**
 * 判断是否可以撤回
 * 条件：待审核状态 且 是创建人
 */
function canRevokeShipment(row) {
  if (!row) return false
  return row.Status === 'Submitted' && isShipmentCreator(row)
}

/**
 * 判断是否可以审核
 * 条件：待审核状态 且 不是创建人
 */
function canAuditShipment(row) {
  if (!row) return false
  return row.Status === 'Submitted' && !isShipmentCreator(row)
}

/**
 * 提交出货检验报告审核
 */
async function handleSubmitShipment(row) {
  try {
    await ElMessageBox.confirm(
      '确定要提交此报告进行审核吗？提交后将发送待办事项给审核人。',
      '提交审核',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const res = await submitShipmentReport(row.ID)
    ElMessage.success(res.message || '已提交审核')
    fetchHistory()
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error(e.response?.data?.message || '提交失败')
    }
  }
}

/**
 * 撤回出货检验报告审核
 */
async function handleRevokeShipment(row) {
  try {
    await ElMessageBox.confirm(
      '确定要撤回此报告的审核申请吗？',
      '撤回审核',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const res = await revokeShipmentReport(row.ID)
    ElMessage.success(res.message || '已撤回')
    fetchHistory()
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error(e.response?.data?.message || '撤回失败')
    }
  }
}

/**
 * 审核出货检验报告
 */
const shipmentAuditDialogVisible = ref(false)
const shipmentAuditRow = ref(null)
const shipmentAuditForm = reactive({
  action: 'pass',
  comment: ''
})
const shipmentAuditLoading = ref(false)

function handleAuditShipment(row) {
  shipmentAuditRow.value = row
  shipmentAuditForm.action = 'pass'
  shipmentAuditForm.comment = ''
  shipmentAuditDialogVisible.value = true
}

async function confirmShipmentAudit() {
  if (!shipmentAuditRow.value) return
  
  shipmentAuditLoading.value = true
  try {
    const apiCall = shipmentAuditForm.action === 'pass'
      ? approveShipmentReport(shipmentAuditRow.value.ID, shipmentAuditForm.comment)
      : rejectShipmentReport(shipmentAuditRow.value.ID, shipmentAuditForm.comment)
    
    const res = await apiCall
    ElMessage.success(res.message || '审核完成')
    shipmentAuditDialogVisible.value = false
    fetchHistory()
  } catch (e) {
    console.error(e)
    ElMessage.error(e.response?.data?.message || '审核失败')
  } finally {
    shipmentAuditLoading.value = false
  }
}

function handleHistoryRowChange(val) {
  currentHistoryRow.value = val
  selectedProductRow.value = null // 清空之前选中的产品
  if (val) {
    // 默认选中第一个产品，显示其检验数据
    const products = parseProductInfo(val.ProductInfo)
    if (products.length > 0) {
      selectedProductRow.value = products[0]
      // 使用 nextTick 确保表格渲染后再设置选中行
      nextTick(() => {
        if (historyProductTableRef.value) {
          historyProductTableRef.value.setCurrentRow(products[0])
        }
      })
    }
  }
}

function handleHistoryProductSelect(val) {
  console.log('handleHistoryProductSelect called, val =', val)
  // 如果 val 为 null（取消选择），保持当前选中的产品
  if (val !== null) {
    selectedProductRow.value = val
  }
}

/**
 * 获取选中产品的检验数据
 * 支持新版数据结构（带首件核对、工单核对、图纸核对等）
 */
function getSelectedProductInspectionData() {
  if (!currentHistoryRow.value?.InspectionData) {
    console.log('getSelectedProductInspectionData: No InspectionData')
    return { productInfo: {}, materialList: [] }
  }
  
  if (!selectedProductRow.value) {
    console.log('getSelectedProductInspectionData: No selectedProductRow')
    return { productInfo: {}, materialList: [] }
  }
  
  const data = parseInspectionData(currentHistoryRow.value.InspectionData)
  console.log('getSelectedProductInspectionData: parsed data keys =', Object.keys(data))
  console.log('getSelectedProductInspectionData: selectedProductRow =', selectedProductRow.value)
  
  // 新版数据结构（v2）：按产品ID存储，包含完整检验数据
  if (data.products) {
    // 尝试多种方式匹配产品
    const row = selectedProductRow.value
    const possibleKeys = [
      row.cProductId,
      row.productId, 
      row.CProductID,
      row.ProductID
    ].filter(Boolean)
    
    console.log('getSelectedProductInspectionData: possibleKeys =', possibleKeys)
    console.log('getSelectedProductInspectionData: available keys =', Object.keys(data.products))
    
    let productData = null
    
    // 直接匹配
    for (const key of possibleKeys) {
      if (data.products[key]) {
        productData = data.products[key]
        console.log('getSelectedProductInspectionData: found by direct key =', key)
        break
      }
    }
    
    // 遍历查找
    if (!productData) {
      for (const key in data.products) {
        const pd = data.products[key]
        const pdCProductId = pd.productInfo?.cProductId || pd.productInfo?.CProductID
        const pdProductId = pd.productInfo?.productId || pd.productInfo?.ProductID
        
        if (possibleKeys.includes(pdCProductId) || possibleKeys.includes(pdProductId) || possibleKeys.includes(key)) {
          productData = pd
          console.log('getSelectedProductInspectionData: found by iteration, key =', key)
          break
        }
      }
    }
    
    if (productData) {
      console.log('getSelectedProductInspectionData: found productData =', productData)
      
      // 新版结构包含 firstPieceCheck, workOrderCheck, drawingCheck 等
      if (productData.firstPieceCheck !== undefined) {
        return {
          ...productData,
          materialList: productData.materialList || data.materialList || []
        }
      }
      
      // 兼容旧版 v1 结构
      return {
        materialList: productData.materialList || data.materialList || [],
        inspectionResults: formatInspectionResults(productData.inspectionResults),
        productInfo: productData.productInfo || {},
        sampleSize: productData.sampleSize,
        totalQuantity: productData.totalQuantity,
        inspectedAt: productData.inspectedAt
      }
    } else {
      console.log('getSelectedProductInspectionData: productData not found for any key')
    }
  }
  
  // 兼容旧版数据结构：直接返回全局数据
  console.log('getSelectedProductInspectionData: fallback to global data')
  return {
    materialList: data.materialList || [],
    inspectionResults: formatInspectionResults(data.inspectionResults),
    productInfo: {},
    summary: data.summary
  }
}

/**
 * 将检验核对数据转换为表格格式
 * 用于更整洁的表格展示
 */
function getInspectionCheckTableData() {
  const data = getSelectedProductInspectionData()
  
  return [
    {
      category: '首件核对',
      item1: { label: '外观', value: data.firstPieceCheck?.appearance },
      item2: { label: '颜色', value: data.firstPieceCheck?.color },
      item3: { label: '图文', value: data.firstPieceCheck?.graphics },
      item4: { label: '字体', value: data.firstPieceCheck?.font },
      item5: { label: '啤切线', value: data.firstPieceCheck?.dieLine }
    },
    {
      category: '工单核对',
      item1: { label: '物料编号', value: data.workOrderCheck?.materialNum },
      item2: { label: '模切方式', value: data.workOrderCheck?.dieCutStyle },
      item3: { label: '包装方式', value: data.workOrderCheck?.packingStyle },
      item4: null,
      item5: null
    },
    {
      category: '图纸核对',
      item1: { label: '材质', value: data.drawingCheck?.material },
      item2: { label: '印刷内容', value: data.drawingCheck?.printContent },
      item3: null,
      item4: null,
      item5: null
    },
    {
      category: '结果判定',
      item1: { label: '判定结果', value: data.result },
      item2: null,
      item3: null,
      item4: null,
      item5: null
    }
  ]
}

/**
 * 将检验核对数据转换为扁平化的表格格式（每个检验项一行）
 * 用于名称和判定结果分列显示
 */
function getInspectionCheckFlatData() {
  const data = getSelectedProductInspectionData()
  
  const rows = []
  
  // 首件核对 - 5项
  const firstPieceItems = [
    { name: '外观', value: data.firstPieceCheck?.appearance },
    { name: '颜色', value: data.firstPieceCheck?.color },
    { name: '图文', value: data.firstPieceCheck?.graphics },
    { name: '字体', value: data.firstPieceCheck?.font },
    { name: '啤切线', value: data.firstPieceCheck?.dieLine }
  ]
  firstPieceItems.forEach((item, index) => {
    rows.push({
      category: '首件核对',
      name: item.name,
      value: item.value,
      rowIndex: rows.length,
      categoryRowSpan: index === 0 ? 5 : 0
    })
  })
  
  // 工单核对 - 3项
  const workOrderItems = [
    { name: '物料编号', value: data.workOrderCheck?.materialNum },
    { name: '模切方式', value: data.workOrderCheck?.dieCutStyle },
    { name: '包装方式', value: data.workOrderCheck?.packingStyle }
  ]
  workOrderItems.forEach((item, index) => {
    rows.push({
      category: '工单核对',
      name: item.name,
      value: item.value,
      rowIndex: rows.length,
      categoryRowSpan: index === 0 ? 3 : 0
    })
  })
  
  // 图纸核对 - 2项
  const drawingItems = [
    { name: '材质', value: data.drawingCheck?.material },
    { name: '印刷内容', value: data.drawingCheck?.printContent }
  ]
  drawingItems.forEach((item, index) => {
    rows.push({
      category: '图纸核对',
      name: item.name,
      value: item.value,
      rowIndex: rows.length,
      categoryRowSpan: index === 0 ? 2 : 0
    })
  })
  
  // 结果判定 - 1项
  rows.push({
    category: '结果判定',
    name: '综合判定',
    value: data.result,
    rowIndex: rows.length,
    categoryRowSpan: 1
  })
  
  return rows
}

/**
 * 检验数据表格的单元格合并方法
 */
function inspectionTableSpanMethod({ row, column, rowIndex, columnIndex }) {
  if (columnIndex === 0) {
    // 第一列（检验类别）需要合并
    if (row.categoryRowSpan > 0) {
      return { rowspan: row.categoryRowSpan, colspan: 1 }
    } else {
      return { rowspan: 0, colspan: 0 }
    }
  }
}

/**
 * 从 InspectionData 中获取产品的规格尺寸
 * @param {Object} row - 产品行数据
 * @returns {string} 规格尺寸
 */
function getProductScaleFromInspectionData(row) {
  if (!currentHistoryRow.value?.InspectionData) return ''
  
  const data = parseInspectionData(currentHistoryRow.value.InspectionData)
  if (!data.products) return ''
  
  const productKey = row.cProductId || row.productId
  
  // 直接匹配
  let productData = data.products[productKey]
  
  // 遍历查找
  if (!productData) {
    for (const key in data.products) {
      const pd = data.products[key]
      const pdCProductId = pd.productInfo?.cProductId || pd.productInfo?.CProductID
      const pdProductId = pd.productInfo?.productId || pd.productInfo?.ProductID
      if (pdCProductId === productKey || pdProductId === productKey || key === productKey) {
        productData = pd
        break
      }
    }
  }
  
  if (productData) {
    return productData.productInfo?.scale || ''
  }
  
  return ''
}

/**
 * 格式化检验结果，兼容新旧数据结构
 * 旧版：{ appearance: '合格', dimension: '合格', ... }
 * 新版：{ appearance: { result: '合格', details: '...' }, ... }
 */
function formatInspectionResults(results) {
  if (!results) return {}
  
  const formatted = {}
  for (const key in results) {
    const value = results[key]
    if (typeof value === 'string') {
      // 旧版格式
      formatted[key] = value
    } else if (typeof value === 'object' && value !== null) {
      // 新版格式，提取 result 字段用于显示
      formatted[key] = value.result || '-'
      // 保留完整对象用于详情展示
      formatted[`${key}Detail`] = value
    }
  }
  return formatted
}

function parseProductInfo(jsonStr) {
  try {
    if (!jsonStr) return []
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (e) {
    console.error('Parse product info error:', e)
    return []
  }
}

const parseInspectionData = (jsonStr) => {
  try {
    if (!jsonStr) return { materialList: [], inspectionResults: {} }
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
  } catch (e) {
    console.error('Parse inspection data error:', e)
    return { materialList: [], inspectionResults: {} }
  }
}

/**
 * 查看/重新生成历史报告
 */
function handleViewHistory(row) {
  try {
    // 恢复产品信息
    let products = []
    if (typeof row.ProductInfo === 'string') {
      products = JSON.parse(row.ProductInfo)
    } else {
      products = row.ProductInfo
    }
    
    if (!products || products.length === 0) {
      ElMessage.warning('该记录缺少产品信息，无法预览')
      return
    }

    // 切换到生成报告标签页
    activeTab.value = 'generate'
    
    // 设置模式为单条或批量（根据产品数量）
    if (products.length > 1) {
      // 批量模式模拟
      // 这里比较复杂，因为界面逻辑是基于查询结果的。
      // 简单做法：直接设置 reportDialogProducts 并打开预览对话框
      // 稍微复杂做法：尝试还原查询状态（比较困难，因为查询条件可能丢失）
      
      // 我们采用直接打开预览对话框的方式
      selectedProduct.value = products[0]
      reportDialogProduct.value = products[0]
      reportDialogProducts.value = products
    } else {
      // 单条模式
      selectedProduct.value = products[0]
      reportDialogProduct.value = products[0]
      reportDialogProducts.value = [products[0]]
    }
    
    // 恢复报告编号和日期
    reportPreview.reportNo = row.ReportNo
    reportPreview.date = row.ReportDate ? new Date(row.ReportDate).toISOString().slice(0, 10) : ''
    
    // 自动匹配模板
    const customerId = row.CustomerID || products[0].customerId || ''
    const matched = templateList.value.find(t => t.customerId === customerId && t.enabled)
    selectedTemplateId.value = matched?.id || templateList.value[0]?.id
    
    // 打开对话框
    showReportDialog.value = true
    
  } catch (e) {
    console.error(e)
    ElMessage.error('解析报告数据失败')
  }
}

/**
 * 从历史记录导出报告
 * 使用后端保存的 InspectionData 数据填充模板生成 Excel 报告
 */
async function handleExportHistoryReport(row) {
  try {
    // 解析产品信息
    let products = []
    if (typeof row.ProductInfo === 'string') {
      products = JSON.parse(row.ProductInfo)
    } else {
      products = row.ProductInfo || []
    }
    
    if (!products || products.length === 0) {
      ElMessage.warning('该记录缺少产品信息，无法导出')
      return
    }
    
    // 解析检验数据
    let inspectionData = {}
    if (row.InspectionData) {
      inspectionData = typeof row.InspectionData === 'string' 
        ? JSON.parse(row.InspectionData) 
        : row.InspectionData
    }
    
    // 获取客户ID并匹配模板
    const customerId = row.CustomerID || products[0]?.customerId || ''
    const matched = templateList.value.find(t => t.customerId === customerId && t.enabled)
    
    if (!matched) {
      ElMessage.warning(`未找到客户 ${customerId} 的可用模板，请先配置模板`)
      return
    }
    
    ElMessage.info('正在导出报告...')
    
    // 下载模板文件
    let templateBuffer = null
    try {
      const resp = await api.get(`/shipment-report/templates/${matched.id}/download`, { responseType: 'arraybuffer' })
      templateBuffer = resp
    } catch (e) {
      ElMessage.error('获取模板文件失败: ' + (e.message || ''))
      return
    }
    
    // 使用 ExcelJS 加载模板
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(templateBuffer)
    
    // 获取模板映射配置
    let mapping = null
    try {
      const resp = await api.get(`/shipment-report/templates/${matched.id}/mapping`)
      mapping = resp?.data ?? resp
    } catch (e) {
      console.warn('获取映射配置失败，使用默认映射:', e)
    }
    
    // 构建填充数据（从 InspectionData 中获取）
    const tableData = inspectionData.tableData || []
    
    // 如果没有 tableData，从 products 构建
    if (tableData.length === 0 && inspectionData.products) {
      for (const key in inspectionData.products) {
        const pd = inspectionData.products[key]
        tableData.push({
          序号: pd.index || tableData.length + 1,
          客户料号: pd.productInfo?.cProductId || key,
          产品名称: pd.productInfo?.product || '',
          规格尺寸: pd.productInfo?.scale || '',
          出货数量: pd.productInfo?.count || 0,
          抽检数量: pd.productInfo?.sampleCount || 0,
          实测尺寸: pd.measuredSize || '',
          外观: pd.firstPieceCheck?.appearance || 'OK',
          颜色: pd.firstPieceCheck?.color || 'OK',
          图文: pd.firstPieceCheck?.graphics || 'OK',
          字体: pd.firstPieceCheck?.font || 'OK',
          啤切线: pd.firstPieceCheck?.dieLine || 'OK',
          物料编号: pd.workOrderCheck?.materialNum || 'OK',
          模切方式: pd.workOrderCheck?.dieCutStyle || 'OK',
          包装方式: pd.workOrderCheck?.packingStyle || 'OK',
          材质: pd.drawingCheck?.material || 'OK',
          印刷内容: pd.drawingCheck?.printContent || 'OK',
          结果判定: pd.result || '合格'
        })
      }
    }
    
    const fillContext = {
      // 报告信息
      ReportNo: row.ReportNo,
      报告编号: row.ReportNo,
      ReportDate: row.ReportDate ? new Date(row.ReportDate).toISOString().slice(0, 10) : '',
      日期: row.ReportDate ? new Date(row.ReportDate).toISOString().slice(0, 10) : '',
      报告日期: row.ReportDate ? new Date(row.ReportDate).toISOString().slice(0, 10) : '',
      
      // 客户信息
      CustomerID: customerId,
      客户编码: customerId,
      
      // 工单信息
      PNum: row.PNum || '',
      工单号: row.PNum || '',
      OrderNum: row.OrderNum || '',
      订单号: row.OrderNum || '',
      CPO: row.CPO || '',
      
      // 检验人员
      Inspector: inspectionData.reportInfo?.inspector || row.CreatorName || '',
      检验人员: inspectionData.reportInfo?.inspector || row.CreatorName || '',
      检验员: inspectionData.reportInfo?.inspector || row.CreatorName || '',
      InspectDate: row.ReportDate ? new Date(row.ReportDate).toISOString().slice(0, 10) : '',
      检验日期: row.ReportDate ? new Date(row.ReportDate).toISOString().slice(0, 10) : '',
      
      // 表格数据
      tableData: tableData
    }
    
    // 填充模板 - 使用已有的 applyMappingFill 函数
    if (mapping) {
      console.log('使用映射配置填充模板')
      applyMappingFill(workbook, mapping, fillContext)
    } else {
      // 无映射时，使用占位符方式填充
      console.log('无映射配置，使用占位符方式填充')
      const ws = workbook.worksheets[0]
      
      // 遍历所有单元格，替换 {{key}} 占位符
      ws.eachRow((row, rowNum) => {
        row.eachCell((cell, colNum) => {
          if (cell.value && typeof cell.value === 'string') {
            const newValue = cell.value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
              return fillContext[key] !== undefined ? fillContext[key] : match
            })
            if (newValue !== cell.value) {
              cell.value = newValue
            }
          }
        })
      })
      
      // 尝试填充表格数据（查找表头行）
      if (tableData.length > 0) {
        const tableHeaders = ['序号', '客户料号', '产品名称', '规格尺寸', '出货数量']
        let headerRowNum = null
        
        // 查找表头行
        ws.eachRow((row, rowNum) => {
          if (headerRowNum) return
          let matchCount = 0
          row.eachCell((cell) => {
            const cellValue = String(cell.value || '').trim()
            if (tableHeaders.some(h => cellValue.includes(h))) {
              matchCount++
            }
          })
          if (matchCount >= 2) {
            headerRowNum = rowNum
          }
        })
        
        if (headerRowNum) {
          // 获取列映射
          const headerRow = ws.getRow(headerRowNum)
          const colMap = {}
          headerRow.eachCell((cell, colNum) => {
            const header = String(cell.value || '').trim()
            colMap[header] = colNum
          })
          
          // 填充数据
          tableData.forEach((item, idx) => {
            const dataRow = ws.getRow(headerRowNum + 1 + idx)
            
            // 根据表头填充对应列
            Object.keys(colMap).forEach(header => {
              const colNum = colMap[header]
              let value = null
              
              // 映射表头到数据字段
              if (header.includes('序号')) value = item['序号'] || idx + 1
              else if (header.includes('客户料号')) value = item['客户料号']
              else if (header.includes('产品名称')) value = item['产品名称']
              else if (header.includes('规格')) value = item['规格尺寸']
              else if (header.includes('出货数量') || header.includes('数量')) value = item['出货数量']
              else if (header.includes('抽检')) value = item['抽检数量']
              else if (header.includes('实测')) value = item['实测尺寸']
              else if (header.includes('外观')) value = item['外观']
              else if (header.includes('颜色')) value = item['颜色']
              else if (header.includes('图文')) value = item['图文']
              else if (header.includes('字体')) value = item['字体']
              else if (header.includes('啤切线')) value = item['啤切线']
              else if (header.includes('物料编号')) value = item['物料编号']
              else if (header.includes('模切方式')) value = item['模切方式']
              else if (header.includes('包装方式')) value = item['包装方式']
              else if (header.includes('材质')) value = item['材质']
              else if (header.includes('印刷内容')) value = item['印刷内容']
              else if (header.includes('结果') || header.includes('判定')) value = item['结果判定']
              
              if (value !== null && value !== undefined) {
                dataRow.getCell(colNum).value = value
              }
            })
          })
        }
      }
    }
    
    // 设置列宽（与自动生成报告使用相同的逻辑）
    const ws = workbook.worksheets[0]
    const handler = CUSTOMER_HANDLERS[customerId]
    
    // 根据用户反馈的数据对比，ExcelJS 写入时列宽会变窄约 0.63
    const WIDTH_COMPENSATION = 0.63
    // Excel中的列宽单位是字符数，但实际渲染受到默认字体影响
    // 这里添加一个全局放大系数 1.43
    const GLOBAL_SCALE = 1.43

    // 列宽来源优先级：1.映射配置中的columnWidths  2.客户处理器的硬编码columnWidths
    let widthSource = null
    let widthSourceName = ''
    
    // 优先使用映射配置中的列宽（模板映射编辑器中手动配置的）
    if (mapping?.layout?.columnWidths && Array.isArray(mapping.layout.columnWidths) && mapping.layout.columnWidths.length > 0) {
      widthSource = mapping.layout.columnWidths
      widthSourceName = '映射配置'
    }
    // 其次使用客户处理器的硬编码列宽
    else if (handler?.columnWidths && Array.isArray(handler.columnWidths)) {
      widthSource = handler.columnWidths
      widthSourceName = `客户${customerId}硬编码`
    }

    if (ws && widthSource) {
      console.log(`使用${widthSourceName}列宽, 长度: ${widthSource.length}`)

      widthSource.forEach((w, idx) => {
        if (typeof w === 'number' && w > 0) {
          try {
            const col = ws.getColumn(idx + 1)
            if (col) {
              const finalWidth = (w * GLOBAL_SCALE) + WIDTH_COMPENSATION
              col.width = finalWidth
              // 关键修复：显式标记 customWidth，否则 Excel 可能会忽略该宽度
              col.customWidth = true 
              console.log(`列 ${idx + 1} 设置宽度: ${finalWidth} (原值: ${w})`)
            }
          } catch (e) { /* 忽略 */ }
        }
      })
    } else {
      console.log('未找到列宽配置，跳过列宽设置')
    }

    console.log('=== 列宽设置完成 ===')
    
    // 导出文件
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `出货检验报告_${row.ReportNo}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('报告导出成功')
    
  } catch (e) {
    console.error('导出报告失败:', e)
    ElMessage.error('导出报告失败: ' + (e.message || '未知错误'))
  }
}

/**
 * 格式化日期为 yyyy-MM-dd HH:mm:ss 字符串
 */
function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

// 模板管理
const showTemplateManager = ref(false)
const templateList = ref([])
const showTemplateForm = ref(false)
const templateFormMode = ref('add')
const templateFormRef = ref(null)
const replaceUploadRef = ref(null)
const templateForm = reactive({ 
  id: null, 
  customerId: '', 
  customerName: '', 
  templateName: '', 
  description: '', 
  enabled: true, 
  fileName: '',      // 当前文件名
  fileType: '', 
  fileArrayBuffer: null, 
  fileBase64: null,
  newFileName: '',   // 替换的新文件名
  newFileArrayBuffer: null,  // 替换的新文件内容
  newFileBase64: null
})
const templateRules = {
  customerId: [{ required: true, message: '请输入客户编码', trigger: 'blur' }],
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

// 报告生成
const showReportDialog = ref(false)
const reportDialogProduct = ref(null)  // 兼容旧代码
const reportDialogProducts = ref([])   // 支持多产品
const selectedTemplateId = ref(null)
const reportFormat = ref('excel')
const generatingReport = ref(false)

const availableTemplates = computed(() => {
  if (!result.workOrderInfo?.CustomerID) return templateList.value.filter(t => t.enabled)
  return templateList.value.filter(t => t.enabled && (t.customerId === result.workOrderInfo.CustomerID || t.customerId === 'DEFAULT'))
})

const TEMPLATE_STORAGE_KEY = 'shipment_report_templates'

/**
 * 将ArrayBuffer转换为Base64字符串
 */
function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 将Base64字符串转换为ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 将模板列表持久化到localStorage
 */
function saveTemplatesToStorage() {
  try {
    const data = templateList.value.map(t => ({
      id: t.id,
      customerId: t.customerId,
      customerName: t.customerName,
      templateName: t.templateName,
      description: t.description,
      updateTime: t.updateTime,
      enabled: t.enabled,
      fileName: t.fileName || templateForm.fileName || null,
      fileType: t.fileType || templateForm.fileType || null,
      fileBase64: t.fileBase64 || null
    }))
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

/**
 * 从localStorage加载模板列表
 */
function loadTemplatesFromStorage() {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (!raw) return
    const list = JSON.parse(raw)
    if (Array.isArray(list)) {
      templateList.value = list.map(item => ({
        ...item,
        fileArrayBuffer: item.fileBase64 ? base64ToArrayBuffer(item.fileBase64) : null
      }))
    }
  } catch {}
}

/**
 * 处理模板文件选择，读取并缓存Excel模板的二进制内容
 */
function handleTemplateFileChange(uploadFile) {
  try {
    const raw = uploadFile?.raw
    if (!raw) { ElMessage.warning('未选择有效文件'); return }
    const isExcel = /\.(xlsx|xls)$/i.test(raw.name)
    if (!isExcel) {
      ElMessage.warning('当前仅支持Excel模板（.xlsx/.xls），Word模板暂不渲染')
    }
    const reader = new FileReader()
    reader.onload = e => {
      const arrayBuffer = e.target?.result
      templateForm.fileName = raw.name
      templateForm.fileType = raw.type
      templateForm.fileArrayBuffer = isExcel ? arrayBuffer : null
      templateForm.fileBase64 = isExcel ? arrayBufferToBase64(arrayBuffer) : null
      templateForm.rawFile = raw
      ElMessage.success('模板文件已加载')
    }
    reader.onerror = () => ElMessage.error('读取模板文件失败')
    reader.readAsArrayBuffer(raw)
  } catch (e) {
    ElMessage.error('处理模板文件失败：' + (e.message || '未知错误'))
  }
}

/**
 * ============================================================
 * 客户特殊处理器配置
 * 不同客户的报告模板可能需要不同的数据处理逻辑
 * ============================================================
 */

/**
 * 从产品名称中提取规格（格式：数字*数字mm）
 * 适用于：A08 等客户
 * @param {string} productName - 产品名称
 * @returns {string} 提取的规格，如无则返回空字符串
 */
function extractSpecFromProductName(productName) {
  if (!productName) return ''
  
  const starPos = productName.indexOf('*')
  const mmPos = productName.toLowerCase().indexOf('mm')
  
  // 必须同时包含 * 和 mm，且 mm 在 * 之后
  if (starPos === -1 || mmPos === -1 || mmPos <= starPos) {
    return ''
  }
  
  // 从 * 向前找数字的起始位置
  let startPos = starPos
  while (startPos > 0 && /[\d.]/.test(productName[startPos - 1])) {
    startPos--
  }
  
  // 提取从数字开始到 mm 结束的字符串
  return productName.substring(startPos, mmPos + 2)
}

/**
 * 根据 GB/T1804-c 级公差标准获取允许偏差
 * @param {number} nominal - 标称尺寸(mm)
 * @returns {number} 允许偏差(±)
 */
function getGBT1804cTolerance(nominal) {
  // GB/T1804-c 级线性尺寸公差表
  if (nominal <= 3) return 0.2
  if (nominal <= 6) return 0.3
  if (nominal <= 30) return 0.5
  if (nominal <= 120) return 0.8
  if (nominal <= 400) return 1.2
  if (nominal <= 1000) return 2.0
  if (nominal <= 2000) return 3.0
  return 4.0 // > 2000mm
}

/**
 * 根据规格尺寸生成实测尺寸（按GB/T1804-c级公差）
 * 在公差范围内生成随机的实测值，每次调用生成不同的值
 * @param {string} spec - 规格尺寸，如 "110*220mm"
 * @returns {string} 实测尺寸，如 "110.1*220.2"
 */
function generateMeasuredSize_GBT1804c(spec) {
  if (!spec) return ''
  
  // 提取规格中的数字，格式如 110*220mm 或 110*220
  const match = spec.match(/([\d.]+)\s*\*\s*([\d.]+)/)
  if (!match) return ''
  
  const width = parseFloat(match[1])
  const height = parseFloat(match[2])
  
  if (isNaN(width) || isNaN(height)) return ''
  
  // 获取公差范围
  const widthTol = getGBT1804cTolerance(width)
  const heightTol = getGBT1804cTolerance(height)
  
  // 生成真随机偏差，在公差范围内 [-tolerance, +tolerance]
  // 使用 Math.random() 生成真随机数，每次调用结果不同
  const widthOffset = (Math.random() * 2 - 1) * widthTol   // 范围: -widthTol ~ +widthTol
  const heightOffset = (Math.random() * 2 - 1) * heightTol // 范围: -heightTol ~ +heightTol
  
  const measuredWidth = width + widthOffset
  const measuredHeight = height + heightOffset
  
  // 根据原始精度决定输出精度
  const widthDecimals = (match[1].split('.')[1] || '').length
  const heightDecimals = (match[2].split('.')[1] || '').length
  
  // 实测值至少保留1位小数
  const outWidthDecimals = Math.max(1, widthDecimals)
  const outHeightDecimals = Math.max(1, heightDecimals)
  
  return `${measuredWidth.toFixed(outWidthDecimals)}*${measuredHeight.toFixed(outHeightDecimals)}`
}

/**
 * 客户特殊处理器配置表
 * 每个客户可以配置不同的处理函数
 * 
 * 配置项说明：
 * - extractSpec: 从产品名称提取规格的函数，参数(productName)，返回规格字符串
 * - generateMeasuredSize: 生成实测尺寸的函数，参数(spec)，返回实测尺寸字符串
 * - customFields: 自定义字段处理函数，参数(product, context)，返回额外字段对象
 * - columnWidths: 模板列宽配置数组（从Excel中读取的实际列宽值，A列开始）
 * 
 * 添加新客户处理器示例：
 * 'B01': {
 *   extractSpec: (name) => { ... },  // 自定义规格提取
 *   generateMeasuredSize: (spec) => { ... },  // 自定义实测尺寸计算
 *   customFields: (product, ctx) => ({ 自定义字段: '值' }),
 *   columnWidths: [4.4, 6.9, ...]  // A列开始的列宽数组
 * }
 */
const CUSTOMER_HANDLERS = {
  // A08 客户：贴纸类产品，规格在产品名称中，按GB/T1804-c公差
  'A08': {
    extractSpec: extractSpecFromProductName,
    generateMeasuredSize: generateMeasuredSize_GBT1804c,
    // 自定义字段：检测项自动填OK，结果判定填合格
    customFields: () => ({
      // 首件核对（J~N列）
      外观: 'OK',
      颜色: 'OK',
      图文: 'OK',
      字体: 'OK',
      啤切线: 'OK',
      // 工单核对（O~Q列）
      物料编号: 'OK',
      模切方式: 'OK',
      包装方式: 'OK',
      // 图纸核对（R~S列）
      材质: 'OK',
      印刷内容: 'OK',
      // 结果判定（V列）
      结果判定: '合格'
    }),
    // 模板列宽配置（Excel中A~W列的实际列宽值）
    // 这是从Excel模板中直接读取的列宽，确保生成报告与模板打印效果一致
    columnWidths: [4.4, 6.9, 6.9, 5.5, 7.7, 8.9, 5.5, 8.6, 4.4, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 12, 12, 8.9, 1.7]
  },
  
  // A84 客户：与A08使用相同的处理逻辑和模板
  'A84': {
    extractSpec: extractSpecFromProductName,
    generateMeasuredSize: generateMeasuredSize_GBT1804c,
    customFields: () => ({
      外观: 'OK',
      颜色: 'OK',
      图文: 'OK',
      字体: 'OK',
      啤切线: 'OK',
      物料编号: 'OK',
      模切方式: 'OK',
      包装方式: 'OK',
      材质: 'OK',
      印刷内容: 'OK',
      结果判定: '合格'
    }),
    columnWidths: [4.4, 6.9, 6.9, 5.5, 7.7, 8.9, 5.5, 8.6, 4.4, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 12, 12, 8.9, 1.7]
  }
  
  // 示例：添加其他客户处理器
  // 'B01': {
  //   extractSpec: (name) => { /* B01客户的规格提取逻辑 */ },
  //   generateMeasuredSize: (spec) => { /* B01客户的实测尺寸计算 */ }
  // },
  // 'C02': {
  //   extractSpec: null,  // 不需要提取规格
  //   generateMeasuredSize: generateMeasuredSize_GBT1804c,  // 复用GB/T1804-c
  //   customFields: (product, ctx) => ({
  //     '批次号': `${ctx.PNum}-${product.productId}`
  //   })
  // }
}

/**
 * 获取客户处理器
 * @param {string} customerID - 客户编码
 * @returns {object|null} 处理器配置对象
 */
function getCustomerHandler(customerID) {
  return CUSTOMER_HANDLERS[customerID] || null
}

/**
 * 构造填充模板的上下文数据
 * 支持单产品和多产品模式
 */
function buildTemplateContext() {
  const wo = result.workOrderInfo || {}
  // 优先从工单信息获取客户编码，其次从产品数据获取
  const customerID = wo.CustomerID || 
                     reportDialogProducts.value?.[0]?.customerId || 
                     selectedProduct.value?.customerId || 
                     ''
  
  // 获取客户特殊处理器
  const handler = getCustomerHandler(customerID)
  console.log('buildTemplateContext - customerID:', customerID, 'handler:', handler ? '已获取' : '未找到')

  // 获取要处理的产品列表（多产品或单产品）
  const products = reportDialogProducts.value && reportDialogProducts.value.length > 0 
    ? reportDialogProducts.value 
    : (selectedProduct.value ? [selectedProduct.value] : [])
  
  // 第一个产品用于填充顶部字段（单产品模式时的主要产品）
  const sp = products[0] || {}
  
  // 构建表格数据 - 支持多产品，只包含明确定义的字段
  const tableData = products.map((p, index) => {
    // 只提取我们明确需要的字段，避免原始对象的其他属性干扰
    const count = p.pCount || p.orderCount || ''
    
    // 规格处理：优先使用原有规格，否则尝试用处理器提取
    let scale = p.scale || ''
    if (!scale && handler?.extractSpec && p.product) {
      scale = handler.extractSpec(p.product)
    }
    
    // 实测尺寸：如果处理器配置了生成函数，则自动生成
    const measuredSize = handler?.generateMeasuredSize ? handler.generateMeasuredSize(scale) : ''
    console.log(`产品 ${index + 1} - scale: ${scale}, measuredSize: ${measuredSize}`)
    
    // 基础字段
    const baseFields = {
      // 序号
      Index: index + 1,
      序号: index + 1,
      
      // 产品编码
      ProductID: p.productId || '',
      产品编码: p.productId || '',
      
      // 客户料号
      CProductID: p.cProductId || '',
      客户料号: p.cProductId || '',
      
      // 产品名称
      Product: p.product || '',
      产品名称: p.product || '',
      品名: p.product || '',
      
      // 工厂订单号
      CProduct: p.cProduct || '',
      工厂订单号: p.cProduct || '',
      
      // 规格（可由处理器自动提取）
      Scale: scale,
      规格: scale,
      规格尺寸: scale,
      
      // 实测尺寸（可由处理器自动生成）
      MeasuredSize: measuredSize,
      实测尺寸: measuredSize,
      实测: measuredSize,
      
      // 数量 - 统一使用同一个值
      Count: count,
      数量: count,
      出货数量: count,
      OrderCount: count,
      订单数: count,
      PCount: count,
      成品数: count,

      // 检验项目 - 默认值填充
      Appearance: 'OK',
      外观: 'OK',
      Color: 'OK',
      颜色: 'OK',
      Graphics: 'OK',
      图文: 'OK',
      Font: 'OK',
      字体: 'OK',
      DieLine: 'OK',
      啤切线: 'OK',
      MaterialNumCheck: 'OK',
      物料编号: 'OK',
      DieCutStyle: 'OK',
      模切方式: 'OK',
      PackingStyle: 'OK',
      包装方式: 'OK',
      MaterialCheck: 'OK',
      材质: 'OK',
      PrintContent: 'OK',
      印刷内容: 'OK',
      Result: '合格',
      结果判定: '合格',
      
      // 抽检数量 - 计算值
      SampleCount: calculateSampleSize(count),
      抽检数量: calculateSampleSize(count)
    }
    
    // 如果处理器有自定义字段函数，合并自定义字段
    if (handler?.customFields) {
      const customData = handler.customFields(p, { customerID, wo, index })
      console.log(`产品 ${index + 1} - customFields:`, customData)
      Object.assign(baseFields, customData)
    } else {
      console.log(`产品 ${index + 1} - 无customFields函数`)
    }
    
    console.log(`产品 ${index + 1} - 最终baseFields包含字段:`, Object.keys(baseFields))
    
    return baseFields
  })
  
  // 计算合计数量
  const totalCount = products.reduce((sum, p) => sum + (p.pCount || p.orderCount || 0), 0)
  
  // 生成报告编号
  const now = new Date()
  const reportNo = reportPreview.reportNo || `SR${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const reportDate = reportPreview.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  
  // 第一个产品的规格（可由处理器自动提取）
  let spScale = sp.scale || ''
  if (!spScale && handler?.extractSpec && sp.product) {
    spScale = handler.extractSpec(sp.product)
  }
  
  return {
    // 工单信息
    CustomerID: wo.CustomerID || '',
    客户编码: wo.CustomerID || '',
    PNum: wo.PNum || '',
    工单号: wo.PNum || '',
    CPO: wo.CPO || '',
    OrderNum: wo.OrderNum || '',
    订单号: wo.OrderNum || '',
    
    // 产品信息（第一个产品，用于单产品模式或顶部字段）
    ProductID: sp.productId || '',
    产品编码: sp.productId || '',
    CProductID: sp.cProductId || '',
    客户料号: sp.cProductId || '',
    Product: sp.product || '',
    产品名称: sp.product || '',
    品名: sp.product || '',
    CProduct: sp.cProduct || '',
    工厂订单号: sp.cProduct || '',
    Scale: spScale,
    规格: spScale,
    Count: products.length === 1 ? (sp.pCount || sp.orderCount || '') : totalCount,
    数量: products.length === 1 ? (sp.pCount || sp.orderCount || '') : totalCount,
    出货数量: products.length === 1 ? (sp.pCount || sp.orderCount || '') : totalCount,
    
    // 合计信息（多产品模式）
    TotalCount: totalCount,
    合计数量: totalCount,
    ProductCount: products.length,
    产品数量: products.length,
    
    // 报告信息
    ReportNo: reportNo,
    报告编号: reportNo,
    ReportDate: reportDate,
    日期: reportDate,
    报告日期: reportDate,
    
    // 检验人员和日期（底部签名区）
    Inspector: getCurrentUserName(),
    检验人员: getCurrentUserName(),
    检验员: getCurrentUserName(),
    InspectDate: reportDate,
    检验日期: reportDate,
    
    // 表格数据
    tableData
  }
}

/**
 * 使用占位符 {{Key}} 填充Excel模板工作簿
 */
function fillWorkbookPlaceholders(wb, context) {
  try {
    const replaceText = (text) => {
      if (typeof text !== 'string') return text
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '')
    }
    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name]
      Object.keys(ws).forEach(addr => {
        const cell = ws[addr]
        if (cell && cell.v !== undefined) {
          cell.v = replaceText(cell.v)
        }
      })
    })
    return wb
  } catch (e) {
    throw e
  }
}

/**
 * 基于上传的Excel模板执行导出（保留模板样式与布局）
 */
async function exportFromTemplate(template) {
  try {
    const arrayBuffer = template?.fileArrayBuffer
    let buf = arrayBuffer
    if (!buf && template?.id) {
      const resp = await api.get(`/shipment-report/templates/${template.id}/download`, { responseType: 'arraybuffer' })
      buf = resp
    }
    if (!buf) { throw new Error('未加载Excel模板文件') }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buf)
    
    // 优先使用后端保存的映射
    let mapping = null
    try {
      const resp = await api.get(`/shipment-report/templates/${template.id}/mapping`)
      mapping = resp?.data ?? resp
      console.log('获取到的映射配置:', mapping)
    } catch (e) {
      console.warn('获取映射配置失败:', e)
    }

    const ctx = buildTemplateContext()
    console.log('构建的上下文数据:', ctx)
    
    // 检查映射是否有效（非空对象且有字段或表格配置）
    const hasValidMapping = mapping && 
      (
        (mapping.fields && mapping.fields.length > 0) || 
        (mapping.table && mapping.table.columns && mapping.table.columns.length > 0) ||
        (mapping.placeholders && mapping.placeholders.length > 0)
      )
    
    if (hasValidMapping) {
      console.log('使用映射配置填充模板')
      applyMappingFill(workbook, mapping, ctx)
    } else {
      console.log('无有效映射，使用自动识别填充')
      // 无映射时，退化为标签+表头自动填充
      const worksheet = workbook.worksheets[0]
      const headerPairs = [
        { label: '客户编码', value: result.workOrderInfo?.CustomerID },
        { label: '工单号', value: result.workOrderInfo?.PNum },
        { label: '订单号', value: result.workOrderInfo?.OrderNum },
        { label: '客户料号', value: selectedProduct.value?.cProductId },
        { label: '产品名称', value: selectedProduct.value?.product },
        { label: '规格', value: selectedProduct.value?.scale },
        { label: '数量', value: selectedProduct.value?.pCount || selectedProduct.value?.orderCount },
        { label: 'CPO', value: result.workOrderInfo?.CPO },
        { label: '报告编号', value: reportPreview.reportNo },
        { label: '日期', value: reportPreview.date }
      ]
      writeLabelValues(worksheet, headerPairs)
      const tableHeaders = ['序号', '客户料号', '产品名称', '出货数量', '规格']
      const headerRowNumber = findHeaderRow(worksheet, tableHeaders)
      if (headerRowNumber) {
        const startRow = headerRowNumber + 1
        setRowValuesByHeader(worksheet, headerRowNumber, startRow, [
          { header: '序号', value: 1 },
          { header: '客户料号', value: selectedProduct.value?.cProductId },
          { header: '产品名称', value: selectedProduct.value?.product },
          { header: '出货数量', value: selectedProduct.value?.pCount || selectedProduct.value?.orderCount },
          { header: '规格', value: selectedProduct.value?.scale }
        ])
      }
    }

    // 列宽处理：优先使用映射配置中的columnWidths，其次使用客户硬编码配置
    // 优先从工单信息获取客户编码，其次从产品数据获取
    const customerID = result.workOrderInfo?.CustomerID || 
                       reportDialogProducts.value?.[0]?.customerId || 
                       selectedProduct.value?.customerId || 
                       ''
    const handler = getCustomerHandler(customerID)
    const targetSheetIndex = mapping?.table?.sheetIndex || 0
    const ws = workbook.worksheets[targetSheetIndex]
    
    // 根据用户反馈的数据对比，ExcelJS 写入时列宽会变窄约 0.63
    const WIDTH_COMPENSATION = 0.63
    // Excel中的列宽单位是字符数，但实际渲染受到默认字体影响
    // 这里添加一个全局放大系数 1.43
    const GLOBAL_SCALE = 1.43

    // 列宽来源优先级：1.映射配置中的columnWidths  2.客户处理器的硬编码columnWidths
    let widthSource = null
    let widthSourceName = ''
    
    // 优先使用映射配置中的列宽（模板映射编辑器中手动配置的）
    if (mapping?.layout?.columnWidths && Array.isArray(mapping.layout.columnWidths) && mapping.layout.columnWidths.length > 0) {
      widthSource = mapping.layout.columnWidths
      widthSourceName = '映射配置'
    }
    // 其次使用客户处理器的硬编码列宽
    else if (handler?.columnWidths && Array.isArray(handler.columnWidths)) {
      widthSource = handler.columnWidths
      widthSourceName = `客户${customerID}硬编码`
    }

    if (ws && widthSource) {
      console.log(`使用${widthSourceName}列宽, 长度: ${widthSource.length}`)

      widthSource.forEach((w, idx) => {
        if (typeof w === 'number' && w > 0) {
          try {
            const col = ws.getColumn(idx + 1)
            if (col) {
              const finalWidth = (w * GLOBAL_SCALE) + WIDTH_COMPENSATION
              col.width = finalWidth
              // 关键修复：显式标记 customWidth，否则 Excel 可能会忽略该宽度
              // @ts-ignore
              col.customWidth = true 
              console.log(`列 ${idx + 1} 设置宽度: ${finalWidth} (原值: ${w})`)
            }
          } catch (e) { /* 忽略 */ }
        }
      })
    } else {
      console.log('未找到列宽配置，跳过列宽设置')
    }

    console.log('=== 列宽设置完成 ===')

    const outBuffer = await workbook.xlsx.writeBuffer()
    
    // 生成文件名：客户编码_出货检验报告_工单号_x项_yymmddhhmmss.xlsx
    const pNum = result.workOrderInfo?.PNum || ''
    const productCount = reportDialogProducts.value?.length || 1
    
    // 生成时间戳 yymmddhhmmss
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const timestamp = `${yy}${mm}${dd}${hh}${mi}${ss}`
    
    // 组装文件名：A08_出货检验报告_工单号_x项_yymmddhhmmss.xlsx
    let fileName = ''
    if (customerID) fileName += `${customerID}_`
    fileName += '出货检验报告'
    if (pNum) fileName += `_${pNum}`
    if (productCount > 1) fileName += `_${productCount}项`
    fileName += `_${timestamp}.xlsx`
    
    saveAs(new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
    ElMessage.success('报告导出成功')
  } catch (e) {
    ElMessage.error('模板导出失败：' + (e.message || '未知错误'))
  }
}

/**
 * 根据映射配置填充 ExcelJS 工作簿
 * @param {ExcelJS.Workbook} workbook - ExcelJS 工作簿对象
 * @param {Object} mapping - 映射配置
 * @param {Object} ctx - 填充上下文数据
 */
function applyMappingFill(workbook, mapping, ctx) {
  if (!workbook || !mapping) {
    console.warn('applyMappingFill: workbook或mapping为空')
    return
  }
  
  const sheetIndex = mapping.table?.sheetIndex || 0
  const worksheet = workbook.worksheets[sheetIndex]
  if (!worksheet) {
    console.warn(`applyMappingFill: 找不到工作表 ${sheetIndex}`)
    return
  }
  
  console.log('开始填充映射，工作表索引:', sheetIndex)

  // 1. 填充顶部字段 (fields)
  if (mapping.fields && Array.isArray(mapping.fields)) {
    console.log('填充顶部字段，数量:', mapping.fields.length)
    mapping.fields.forEach(field => {
      if (!field.cell) return
      // 支持通过 name 或 label 获取值
      const value = ctx[field.name] ?? ctx[field.label]
      console.log(`  字段 ${field.name} -> ${field.cell} = ${value}`)
      if (value !== undefined && value !== null && value !== '') {
        try {
          const cell = worksheet.getCell(field.cell)
          // 清除可能存在的公式
          if (cell.formula || cell.sharedFormula) {
            cell.formula = undefined
          }
          cell.value = value
        } catch (e) {
          console.warn(`填充字段 ${field.name} 到 ${field.cell} 失败:`, e.message)
        }
      }
    })
  }

  // 2. 填充占位符 (placeholders)
  if (mapping.placeholders && Array.isArray(mapping.placeholders)) {
    console.log('填充占位符，数量:', mapping.placeholders.length)
    mapping.placeholders.forEach(ph => {
      if (!ph.cell) return
      const value = ctx[ph.name]
      console.log(`  占位符 ${ph.name} -> ${ph.cell} = ${value}`)
      if (value !== undefined && value !== null && value !== '') {
        try {
          const cell = worksheet.getCell(ph.cell)
          // 清除可能存在的公式
          if (cell.formula || cell.sharedFormula) {
            cell.formula = undefined
          }
          cell.value = value
        } catch (e) {
          console.warn(`填充占位符 ${ph.name} 到 ${ph.cell} 失败:`, e.message)
        }
      }
    })
  }

  // 3. 填充表格数据 (table)
  // 定义允许的字段名白名单
  const ALLOWED_FIELD_NAMES = new Set([
    // 序号
    'Index', '序号',
    // 产品编码
    'ProductID', '产品编码',
    // 客户料号
    'CProductID', '客户料号',
    // 产品名称
    'Product', '产品名称', '品名',
    // 工厂订单号
    'CProduct', '工厂订单号',
    // 规格
    'Scale', '规格', '规格尺寸',
    // 实测尺寸
    'MeasuredSize', '实测尺寸', '实测',
    // 数量
    'Count', '数量', '出货数量', 'OrderCount', '订单数', 'PCount', '成品数',
    // 检测项（A08客户等）
    '外观', '颜色', '图文', '字体', '啤切线',
    '物料编号', '模切方式', '包装方式',
    '材质', '印刷内容',
    // 结果判定
    '结果判定', '判定结果', '结果'
  ])
  
  const tableData = ctx.tableData
  if (mapping.table && tableData && Array.isArray(tableData) && tableData.length > 0) {
    const { startRow, columns } = mapping.table
    console.log('填充表格数据，起始行:', startRow, '列数:', columns?.length, '数据行数:', tableData.length)
    console.log('列映射配置:', JSON.stringify(columns, null, 2))
    
    if (!startRow || !columns || !Array.isArray(columns) || columns.length === 0) {
      console.warn('表格配置不完整，跳过表格填充')
      return
    }

    // 预先清除数据区域的公式（避免共享公式错误）
    const endRow = startRow + tableData.length - 1
    columns.forEach(col => {
      const targetCol = col.merge ? col.merge.startCol : col.col
      if (!targetCol) return
      for (let r = startRow; r <= endRow; r++) {
        try {
          const cell = worksheet.getCell(r, targetCol)
          // 如果单元格有公式，清除它
          if (cell.formula || cell.sharedFormula || cell._value?.formula) {
            cell.value = null
            cell.formula = undefined
          }
        } catch (e) {
          // 忽略错误，继续处理
        }
      }
    })

    tableData.forEach((rowData, rowIndex) => {
      const excelRowNum = startRow + rowIndex
      console.log(`  填充第 ${excelRowNum} 行`)
      
      columns.forEach(col => {
        // 检查字段名是否在白名单中
        const fieldName = col.name || col.header
        if (!fieldName) {
          console.warn(`    跳过：列配置缺少name和header`)
          return
        }
        
        // 只使用白名单中的字段名
        if (!ALLOWED_FIELD_NAMES.has(fieldName) && !ALLOWED_FIELD_NAMES.has(col.name) && !ALLOWED_FIELD_NAMES.has(col.header)) {
          console.warn(`    跳过：字段名 "${fieldName}" 不在白名单中`)
          return
        }
        
        // 只使用明确配置的字段名获取数据
        let value = undefined
        
        // 优先使用 name 字段匹配
        if (col.name && ALLOWED_FIELD_NAMES.has(col.name) && rowData[col.name] !== undefined) {
          value = rowData[col.name]
        }
        // 其次使用 header 字段匹配
        else if (col.header && ALLOWED_FIELD_NAMES.has(col.header) && rowData[col.header] !== undefined) {
          value = rowData[col.header]
        }
        
        // 跳过空值
        if (value === undefined || value === null || value === '') return

        // 使用起始列（处理合并单元格情况）
        const targetCol = col.merge ? col.merge.startCol : col.col
        if (!targetCol) {
          console.warn(`    列 ${col.name || col.header} 没有指定列号`)
          return
        }

        console.log(`    列 [name=${col.name}, header=${col.header}] -> 第${targetCol}列 = ${value}`)
        try {
          const cell = worksheet.getCell(excelRowNum, targetCol)
          // 公式已在前面预先清除，直接写入值
          cell.value = value
        } catch (e) {
          console.warn(`填充表格数据 (${excelRowNum}, ${targetCol}) 失败:`, e.message)
        }
      })
    })
  } else {
    console.log('无表格数据需要填充')
  }
  
  console.log('映射填充完成')
}

/**
 * 在包含 label 文本的单元格右侧写入值
 */
function writeLabelValues(worksheet, pairs) {
  pairs.forEach(({ label, value }) => {
    if (value === undefined || value === null) return
    const pos = findTextCell(worksheet, label)
    if (pos) {
      const { row, col } = pos
      worksheet.getRow(row).getCell(col + 1).value = value
    }
  })
}

/**
 * 查找包含指定文本的单元格位置
 */
function findTextCell(worksheet, text) {
  for (let r = worksheet.dimensions.top; r <= worksheet.dimensions.bottom; r++) {
    const row = worksheet.getRow(r)
    for (let c = worksheet.dimensions.left; c <= worksheet.dimensions.right; c++) {
      const cell = row.getCell(c)
      if (cell && typeof cell.value === 'string' && cell.value.trim() === text) {
        return { row: r, col: c }
      }
    }
  }
  return null
}

/**
 * 查找表头行（匹配至少一个目标表头）
 */
function findHeaderRow(worksheet, headers) {
  for (let r = worksheet.dimensions.top; r <= worksheet.dimensions.bottom; r++) {
    const row = worksheet.getRow(r)
    const texts = []
    for (let c = worksheet.dimensions.left; c <= worksheet.dimensions.right; c++) {
      const val = row.getCell(c).value
      if (typeof val === 'string') texts.push(val.trim())
    }
    if (headers.some(h => texts.includes(h))) return r
  }
  return null
}

/**
 * 根据表头名称将值写入指定行
 */
function setRowValuesByHeader(worksheet, headerRowNumber, targetRowNumber, pairs) {
  const headerRow = worksheet.getRow(headerRowNumber)
  pairs.forEach(({ header, value }) => {
    if (value === undefined || value === null) return
    for (let c = worksheet.dimensions.left; c <= worksheet.dimensions.right; c++) {
      const val = headerRow.getCell(c).value
      if (typeof val === 'string' && val.trim() === header) {
        worksheet.getRow(targetRowNumber).getCell(c).value = value
        break
      }
    }
  })
}

/**
 * 基于Excel模板渲染为HTML并打印
 */
async function printFromTemplate(template) {
  try {
    const arrayBuffer = template?.fileArrayBuffer
    let buf = arrayBuffer
    if (!buf && template?.id) {
      const resp = await api.get(`/shipment-report/templates/${template.id}/download`, { responseType: 'arraybuffer' })
      buf = resp
    }
    if (!buf) { throw new Error('未加载Excel模板文件') }
    
    // 使用 ExcelJS 加载模板（与 exportFromTemplate 相同的逻辑）
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buf)
    
    // 优先使用后端保存的映射
    let mapping = null
    try {
      const resp = await api.get(`/shipment-report/templates/${template.id}/mapping`)
      mapping = resp?.data ?? resp
      console.log('printFromTemplate - 获取到的映射配置:', mapping)
    } catch (e) {
      console.warn('获取映射配置失败:', e)
    }

    const ctx = buildTemplateContext()
    console.log('printFromTemplate - 构建的上下文数据:', ctx)
    
    // 检查映射是否有效
    const hasValidMapping = mapping && 
      (
        (mapping.fields && mapping.fields.length > 0) || 
        (mapping.table && mapping.table.columns && mapping.table.columns.length > 0) ||
        (mapping.placeholders && mapping.placeholders.length > 0)
      )
    
    if (hasValidMapping) {
      console.log('printFromTemplate - 使用映射配置填充模板')
      applyMappingFill(workbook, mapping, ctx)
    } else {
      console.log('printFromTemplate - 无有效映射，使用自动识别填充')
      const worksheet = workbook.worksheets[0]
      const headerPairs = [
        { label: '客户编码', value: result.workOrderInfo?.CustomerID },
        { label: '工单号', value: result.workOrderInfo?.PNum },
        { label: '订单号', value: result.workOrderInfo?.OrderNum },
        { label: '客户料号', value: selectedProduct.value?.cProductId },
        { label: '产品名称', value: selectedProduct.value?.product },
        { label: '规格', value: selectedProduct.value?.scale },
        { label: '数量', value: selectedProduct.value?.pCount || selectedProduct.value?.orderCount },
        { label: 'CPO', value: result.workOrderInfo?.CPO },
        { label: '报告编号', value: reportPreview.reportNo },
        { label: '日期', value: reportPreview.date }
      ]
      writeLabelValues(worksheet, headerPairs)
    }
    
    // 获取列宽配置
    const customerID = result.workOrderInfo?.CustomerID || 
                       reportDialogProducts.value?.[0]?.customerId || 
                       selectedProduct.value?.customerId || 
                       ''
    const handler = getCustomerHandler(customerID)
    
    // 列宽来源优先级：1.映射配置  2.客户处理器硬编码
    let columnWidths = null
    if (mapping?.layout?.columnWidths && Array.isArray(mapping.layout.columnWidths) && mapping.layout.columnWidths.length > 0) {
      columnWidths = mapping.layout.columnWidths
      console.log('printFromTemplate - 使用映射配置列宽')
    } else if (handler?.columnWidths && Array.isArray(handler.columnWidths)) {
      columnWidths = handler.columnWidths
      console.log('printFromTemplate - 使用客户处理器列宽')
    }
    
    // 将 ExcelJS 工作簿转换为可打印的 HTML
    const worksheet = workbook.worksheets[mapping?.table?.sheetIndex || 0]
    const tableStartRow = mapping?.table?.startRow || 10  // 表格数据起始行
    const html = generatePrintHtml(worksheet, ctx, columnWidths, tableStartRow)
    
    // 打开打印窗口
    let win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 300)  // 延迟打印，确保样式加载完成
    } else {
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow?.document
      if (!doc) throw new Error('打印窗口不可用')
      doc.open()
      doc.write(html)
      doc.close()
      iframe.contentWindow?.focus()
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => document.body.removeChild(iframe), 500)
      }, 300)
    }
    ElMessage.success('按模板打印成功')
  } catch (e) {
    ElMessage.error('模板打印失败：' + (e.message || '未知错误'))
  }
}

/**
 * 根据 GB/T 2828.1-2012 标准计算抽检数量
 * 正常检验一次抽样方案，检验水平II，AQL=4.0
 * @param {number} lotSize - 批量（出货数量）
 * @returns {number} 抽检数量
 */
function calculateSampleSize(lotSize) {
  if (!lotSize || lotSize <= 1) return ''
  
  // GB/T 2828.1 抽样表（检验水平II，一次抽样）
  if (lotSize >= 2 && lotSize <= 8) return 2
  if (lotSize >= 9 && lotSize <= 15) return 3
  if (lotSize >= 16 && lotSize <= 25) return 5
  if (lotSize >= 26 && lotSize <= 50) return 8
  if (lotSize >= 51 && lotSize <= 90) return 13
  if (lotSize >= 91 && lotSize <= 150) return 20
  if (lotSize >= 151 && lotSize <= 280) return 32
  if (lotSize >= 281 && lotSize <= 500) return 50
  if (lotSize >= 501 && lotSize <= 1200) return 80
  if (lotSize >= 1201 && lotSize <= 3200) return 125
  if (lotSize >= 3201 && lotSize <= 10000) return 200
  if (lotSize >= 10001 && lotSize <= 35000) return 315
  if (lotSize >= 35001 && lotSize <= 150000) return 500
  if (lotSize >= 150001 && lotSize <= 500000) return 800
  if (lotSize >= 500001) return 1250
  
  return ''
}

/**
 * 将 ExcelJS 工作表转换为可打印的 HTML
 * @param {ExcelJS.Worksheet} worksheet - ExcelJS 工作表
 * @param {Object} ctx - 填充上下文
 * @param {Array} columnWidths - 列宽配置数组（可选）
 * @param {number} tableStartRow - 表格数据起始行（默认10）
 * @returns {string} HTML 字符串
 */
function generatePrintHtml(worksheet, ctx, columnWidths = null, tableStartRow = 10) {
  const rows = []
  const mergedCells = new Map()  // 记录合并单元格信息
  const skipCells = new Set()    // 记录需要跳过的单元格
  
  // 解析合并单元格 - ExcelJS 使用 worksheet.model.merges 数组
  // 格式如: ['A1:C3', 'D5:F5'] 或通过 _merges 对象
  const merges = worksheet.model?.merges || []
  console.log('合并单元格信息:', merges)
  
  // 计算有效的最大列数（包含数据或合并单元格的最大列）
  let maxCol = 0
  
  // 从合并单元格中获取最大列
  merges.forEach(mergeRange => {
    // 解析合并范围，如 "A1:C3"
    const match = mergeRange.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
    if (match) {
      const startCol = colLetterToNumber(match[1])
      const startRow = parseInt(match[2])
      const endCol = colLetterToNumber(match[3])
      const endRow = parseInt(match[4])
      
      maxCol = Math.max(maxCol, endCol)
      
      const rowspan = endRow - startRow + 1
      const colspan = endCol - startCol + 1
      
      // 记录合并单元格的起始位置
      mergedCells.set(`${startRow}-${startCol}`, { rowspan, colspan })
      
      // 标记被合并的单元格（需要跳过）
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          if (r !== startRow || c !== startCol) {
            skipCells.add(`${r}-${c}`)
          }
        }
      }
    }
  })
  
  // 遍历所有行，找出包含数据的最大列
  const rowCount = Math.min(worksheet.rowCount || 30, 50)
  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        maxCol = Math.max(maxCol, colNumber)
      }
    })
  }
  
  // 确保至少有一列，最多不超过工作表列数
  const colCount = Math.max(1, Math.min(maxCol, worksheet.columnCount || 50))
  console.log('有效最大列数:', colCount)
  
  console.log('合并单元格Map:', mergedCells)
  console.log('跳过单元格Set:', skipCells)
  
  // 获取列宽 - 优先使用传入的配置，否则从工作表读取
  const colWidths = []
  for (let i = 1; i <= colCount; i++) {
    if (columnWidths && columnWidths[i - 1]) {
      // 使用传入的列宽配置（Excel单位转像素，乘以约7）
      colWidths[i - 1] = columnWidths[i - 1] * 7
    } else {
      const col = worksheet.getColumn(i)
      colWidths[i - 1] = col.width ? col.width * 7 : 60
    }
  }
  console.log('列宽配置:', colWidths)
  
  // 遍历工作表生成表格行
  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const cells = []
    const rowHeight = row.height ? row.height * 1.33 : 20
    
    for (let colNumber = 1; colNumber <= colCount; colNumber++) {
      const mergeKey = `${rowNumber}-${colNumber}`
      
      // 跳过被合并的单元格
      if (skipCells.has(mergeKey)) {
        continue
      }
      
      const cell = row.getCell(colNumber)
      let value = cell.value
      
      // 处理各种类型的值
      if (value && typeof value === 'object') {
        if (value.richText) {
          // 富文本
          value = value.richText.map(rt => rt.text).join('')
        } else if (value.text !== undefined) {
          // 超链接等
          value = value.text
        } else if (value.result !== undefined) {
          // 公式结果已计算
          value = value.result
        } else if (value.formula !== undefined) {
          // 有公式但无结果的情况
          // 检查是否是 I 列（第9列）且在数据行范围内 - 抽检数量公式
          if (colNumber === 9 && rowNumber >= tableStartRow) {
            // 获取前一列（H列，第8列）的出货数量值
            const quantityCell = row.getCell(8)  // H列
            let quantity = quantityCell.value
            if (quantity && typeof quantity === 'object') {
              quantity = quantity.result || quantity.text || 0
            }
            quantity = parseInt(quantity) || 0
            // 使用 GB/T 2828.1 计算抽检数量
            value = calculateSampleSize(quantity)
          } else {
            value = ''
          }
        } else if (value.sharedFormula !== undefined) {
          // 共享公式
          if (value.result !== undefined) {
            value = value.result
          } else if (colNumber === 9 && rowNumber >= tableStartRow) {
            // 抽检数量共享公式
            const quantityCell = row.getCell(8)
            let quantity = quantityCell.value
            if (quantity && typeof quantity === 'object') {
              quantity = quantity.result || quantity.text || 0
            }
            quantity = parseInt(quantity) || 0
            value = calculateSampleSize(quantity)
          } else {
            value = ''
          }
        } else {
          // 其他对象类型，尝试转字符串或置空
          console.log(`单元格 ${rowNumber}-${colNumber} 为对象类型:`, value)
          value = ''
        }
      }
      
      // 获取单元格样式（包含边框）
      let style = getCellStyle(cell)
      const mergeInfo = mergedCells.get(mergeKey)
      
      // 调试：检查边框信息
      if (rowNumber <= 12 && colNumber <= 8) {
        console.log(`单元格 ${rowNumber}-${colNumber} 边框:`, JSON.stringify(cell.border), '原始样式:', style)
      }
      
      // 判断是否有内容
      const hasValue = value !== null && value !== undefined && value !== ''
      const hasBorder = style.includes('border')
      
      // 智能边框策略：
      // 1. 如果模板有边框设置（hasBorder），使用模板边框
      // 2. 如果没有边框，根据区域判断是否需要添加：
      //    - 表头区域（约第7-9行，对应序号、物料编号等列头）需要边框
      //    - 数据区域（从tableStartRow开始）需要边框
      //    - 其他区域（公司名称、标题等）不需要边框
      
      // 检测是否在表格区域（表头行或数据行）
      // 表头通常在 tableStartRow - 2 到 tableStartRow - 1 行
      const isTableHeader = rowNumber >= (tableStartRow - 3) && rowNumber < tableStartRow
      const isDataRow = rowNumber >= tableStartRow
      const isTableArea = isTableHeader || isDataRow
      
      // 只对表格区域内没有边框的单元格添加默认边框
      if (!hasBorder && isTableArea) {
        style = style ? style + '; border: 1px solid #000' : 'border: 1px solid #000'
      }
      
      cells.push({
        value: value ?? '',
        style,
        colspan: mergeInfo?.colspan || 1,
        rowspan: mergeInfo?.rowspan || 1,
        width: colWidths[colNumber - 1] || 60,
        colNumber,
        rowNumber,
        hasValue
      })
    }
    
    rows.push({ cells, height: rowHeight, rowNumber })
  }
  
  // 分析表格结构，找出表头行和数据区域
  // 通常表头行是连续的有内容的行，数据区域从 tableStartRow 开始
  const headerEndRow = tableStartRow - 1  // 表头结束行
  
  // 生成 HTML
    // 生成 HTML
    let tableHtml = '<table>'
    
    // 生成列宽定义
    tableHtml += '<colgroup>'
    for (let i = 0; i < colCount; i++) {
      tableHtml += `<col style="width: ${colWidths[i] || 60}px;">`
    }
    tableHtml += '</colgroup>'
    
    rows.forEach(row => {
      tableHtml += `<tr style="height: ${row.height}px;">`
      row.cells.forEach(cell => {
        const attrs = []
        if (cell.colspan > 1) attrs.push(`colspan="${cell.colspan}"`)
        if (cell.rowspan > 1) attrs.push(`rowspan="${cell.rowspan}"`)
        attrs.push(`style="${cell.style}"`)
        tableHtml += `<td ${attrs.join(' ')}>${escapeHtml(String(cell.value))}</td>`
      })
      tableHtml += '</tr>'
    })
    
    tableHtml += '</table>'
    
    // 如果是打印预览，需要包含完整 HTML 结构
    if (!ctx) return tableHtml // 如果只是获取内容，直接返回 table HTML
    
    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>出货检验报告</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 5mm;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: "SimSun", "宋体", "Microsoft YaHei", sans-serif;
        font-size: 9pt;
        margin: 0;
        padding: 3mm;
        line-height: 1.2;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      td {
        padding: 2px 3px;
        word-wrap: break-word;
        overflow: hidden;
        vertical-align: middle;
        text-align: center;
        font-size: 9pt;
        /* 默认无边框，由单元格样式控制 */
      }
      @media print {
        body { 
          margin: 0; 
          padding: 2mm; 
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    ${tableHtml}
  </body>
  </html>`
  }

/**
 * 将列字母转换为数字（A=1, B=2, ..., Z=26, AA=27...）
 */
function colLetterToNumber(letters) {
  let result = 0
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64)
  }
  return result
}

/**
 * 获取单元格样式字符串
 */
function getCellStyle(cell) {
  const styles = []
  
  // 字体
  if (cell.font) {
    if (cell.font.bold) styles.push('font-weight: bold')
    if (cell.font.size) styles.push(`font-size: ${cell.font.size}pt`)
    if (cell.font.name) {
      // 映射常用字体
      const fontMap = {
        '宋体': '"SimSun", "宋体"',
        'SimSun': '"SimSun", "宋体"',
        '黑体': '"SimHei", "黑体"',
        '微软雅黑': '"Microsoft YaHei", "微软雅黑"',
        'Arial': 'Arial, sans-serif'
      }
      const fontFamily = fontMap[cell.font.name] || `"${cell.font.name}"`
      styles.push(`font-family: ${fontFamily}`)
    }
  }
  
  // 对齐 - 水平对齐
  if (cell.alignment) {
    if (cell.alignment.horizontal) {
      const alignMap = { 
        left: 'left', 
        center: 'center', 
        right: 'right',
        fill: 'center',
        justify: 'justify',
        centerContinuous: 'center',
        distributed: 'center'
      }
      styles.push(`text-align: ${alignMap[cell.alignment.horizontal] || 'center'}`)
    }
    // 垂直对齐
    if (cell.alignment.vertical) {
      const vAlignMap = { 
        top: 'top', 
        middle: 'middle', 
        bottom: 'bottom',
        justify: 'middle',
        distributed: 'middle'
      }
      styles.push(`vertical-align: ${vAlignMap[cell.alignment.vertical] || 'middle'}`)
    }
    // 自动换行
    if (cell.alignment.wrapText) {
      styles.push('white-space: normal')
      styles.push('word-break: break-all')
    }
  }
  
  // 背景色
  if (cell.fill) {
    if (cell.fill.type === 'pattern' && cell.fill.pattern === 'solid') {
      const fgColor = cell.fill.fgColor
      if (fgColor) {
        let color = null
        if (fgColor.argb && fgColor.argb !== 'FFFFFFFF' && fgColor.argb !== '00000000') {
          color = '#' + fgColor.argb.substring(2)
        } else if (fgColor.theme !== undefined) {
          // 主题色 - 使用常见的浅色
          const themeColors = {
            0: '#FFFFFF', // 背景1
            1: '#000000', // 文字1
            2: '#E7E6E6', // 背景2
            3: '#44546A', // 文字2
            4: '#4472C4', // 着色1
            5: '#ED7D31', // 着色2
            6: '#A5A5A5', // 着色3
            7: '#FFC000', // 着色4
            8: '#5B9BD5', // 着色5
            9: '#70AD47'  // 着色6
          }
          color = themeColors[fgColor.theme] || null
        }
        if (color && color !== '#FFFFFF') {
          styles.push(`background-color: ${color}`)
        }
      }
    }
  }
  
  // 边框处理 - 根据单元格实际边框设置
  // ExcelJS 的边框可能在 cell.border 或 cell.style?.border 中
  const border = cell.border || cell.style?.border
  
  const borderStyleMap = {
    thin: '1px solid #000',
    medium: '2px solid #000',
    thick: '3px solid #000',
    dotted: '1px dotted #000',
    dashed: '1px dashed #000',
    double: '3px double #000',
    hair: '1px solid #ccc',
    mediumDashed: '2px dashed #000',
    dashDot: '1px dashed #000',
    mediumDashDot: '2px dashed #000',
    dashDotDot: '1px dotted #000',
    slantDashDot: '1px dashed #000'
  }
  
  if (border) {
    // 上边框
    if (border.top && border.top.style) {
      styles.push(`border-top: ${borderStyleMap[border.top.style] || '1px solid #000'}`)
    }
    // 下边框
    if (border.bottom && border.bottom.style) {
      styles.push(`border-bottom: ${borderStyleMap[border.bottom.style] || '1px solid #000'}`)
    }
    // 左边框
    if (border.left && border.left.style) {
      styles.push(`border-left: ${borderStyleMap[border.left.style] || '1px solid #000'}`)
    }
    // 右边框
    if (border.right && border.right.style) {
      styles.push(`border-right: ${borderStyleMap[border.right.style] || '1px solid #000'}`)
    }
  }
  
  return styles.join('; ')
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 获取当前选择的模板对象
 */
function getSelectedTemplate() {
  const id = selectedTemplateId.value
  if (!id) return null
  return templateList.value.find(t => t.id === id) || null
}

/**
 * 执行查询，根据工单/物料条件获取报告所需数据
 */
async function handleSearch() {
  // 验证查询条件：工单号必填
  if (!searchForm.pNum) {
    ElMessage.warning('请输入工单号')
    return
  }
  
  loading.value = true
  hasSearched.value = true
  selectedProduct.value = null
  try {
    const params = {}
    if (searchForm.pNum) {
      let pNum = searchForm.pNum.trim()
      // 兼容无前缀GD查询：如果是8位数字（yymmdd+00），自动添加GD前缀
      if (/^\d{8}$/.test(pNum)) {
        pNum = 'GD' + pNum
      }
      params.pNum = pNum
    }
    if (searchForm.materialId) params.materialId = searchForm.materialId.trim()
    if (searchForm.materialName) params.materialName = searchForm.materialName.trim()
    if (searchForm.cpo) params.cpo = searchForm.cpo.trim()
    if (searchForm.matchMonthRange) params.matchMonthRange = searchForm.matchMonthRange
    params.StartDate = searchForm.startDate || formatDateTime(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000))
    params.EndDate = searchForm.endDate || formatDateTime(new Date())

    const response = await api.get('/erp/shipment-report', { params })
    let res = response.data && response.data.workOrderInfo !== undefined ? response.data : response

    if (res.code !== undefined) {
      if (res.code === 0 && res.data) {
        // 调试：打印后端返回的物料入库明细第一条数据，检查字段名
        if (res.data.materialInList && res.data.materialInList.length > 0) {
          console.log('ERP物料入库明细首条数据:', res.data.materialInList[0])
        } else {
          console.log('ERP物料入库明细为空')
        }
        Object.assign(result, { workOrderInfo: res.data.workOrderInfo, materialList: res.data.materialList || [], materialInList: res.data.materialInList || [], productInfo: res.data.productInfo || [], isBatchResult: false })
      } else {
        ElMessage.error(res.message || '查询失败')
        return
      }
    } else {
      Object.assign(result, { workOrderInfo: res.workOrderInfo, materialList: res.materialList || [], materialInList: res.materialInList || [], productInfo: res.productInfo || [], isBatchResult: false })
    }

    const parts = []
    if (result.workOrderInfo) parts.push('工单 1 条')
    if (result.productInfo?.length > 0) parts.push(`产品 ${result.productInfo.length} 项`)
    if (result.materialList.length > 0) parts.push(`物料 ${result.materialList.length} 项`)
    if (result.materialInList.length > 0) parts.push(`入库明细 ${result.materialInList.length} 条`)
    parts.length > 0 ? ElMessage.success(`查询成功：${parts.join('、')}`) : ElMessage.info('未找到匹配的数据')
  } catch (error) {
    ElMessage.error('查询失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}



/**
 * 重置查询条件与结果
 */
function handleReset() {
  Object.assign(searchForm, { pNum: '', materialId: '', materialName: '', cpo: '', startDate: '', endDate: '', matchMonthRange: 1 })
  Object.assign(result, { workOrderInfo: null, materialList: [], materialInList: [], productInfo: [], isBatchResult: false })
  hasSearched.value = false
  selectedProduct.value = null
  selectedProducts.value = []
  reportDialogProducts.value = []
  // 重置批量查询
  batchInputText.value = ''
  batchQueryList.value = []
  if (productTableRef.value) {
    productTableRef.value.clearSelection()
  }
}

/**
 * 处理Excel粘贴事件
 * 解析从Excel复制的表格数据（Tab分隔的CPO和产品编号）
 */
function handleBatchPaste(event) {
  // 延迟执行，确保文本已粘贴到输入框
  setTimeout(() => {
    parseBatchInput()
  }, 100)
}

/**
 * 解析批量输入的文本
 * 支持格式：
 * 1. Tab分隔：CPO[Tab]产品编号
 * 2. 空格分隔：CPO 产品编号
 * 3. 逗号分隔：CPO,产品编号
 */
function parseBatchInput() {
  const text = batchInputText.value.trim()
  if (!text) {
    ElMessage.warning('请先粘贴数据')
    return
  }
  
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  const newItems = []
  const errors = []
  
  lines.forEach((line, index) => {
    // 尝试不同的分隔符
    let parts = null
    
    // 优先Tab分隔（Excel默认）
    if (line.includes('\t')) {
      parts = line.split('\t').map(s => s.trim()).filter(s => s)
    }
    // 其次尝试多个空格分隔
    else if (/\s{2,}/.test(line)) {
      parts = line.split(/\s{2,}/).map(s => s.trim()).filter(s => s)
    }
    // 逗号分隔
    else if (line.includes(',')) {
      parts = line.split(',').map(s => s.trim()).filter(s => s)
    }
    // 单个空格分隔（至少2个部分）
    else {
      parts = line.split(/\s+/).map(s => s.trim()).filter(s => s)
    }
    
    if (parts && parts.length >= 2) {
      // 取前两列：CPO 和 产品编号
      const cpo = parts[0]
      const productId = parts[1]
      
      // 检查是否已存在相同组合
      const exists = newItems.some(item => item.cpo === cpo && item.productId === productId)
      if (!exists) {
        newItems.push({ cpo, productId })
      }
    } else if (parts && parts.length === 1) {
      // 只有一列，可能是产品编号，暂存但标记警告
      errors.push(`第${index + 1}行格式不完整，需要CPO和产品编号两列`)
    }
  })
  
  if (newItems.length > 0) {
    // 合并到现有列表（去重）
    newItems.forEach(newItem => {
      const exists = batchQueryList.value.some(
        item => item.cpo === newItem.cpo && item.productId === newItem.productId
      )
      if (!exists) {
        batchQueryList.value.push(newItem)
      }
    })
    
    ElMessage.success(`成功解析 ${newItems.length} 条数据`)
    
    if (errors.length > 0) {
      ElMessage.warning(errors.slice(0, 3).join('；') + (errors.length > 3 ? '...' : ''))
    }
  } else {
    ElMessage.error('未能解析出有效数据，请确保每行包含CPO和产品编号（用Tab或空格分隔）')
  }
}

/**
 * 清空批量输入
 */
function clearBatchInput() {
  batchInputText.value = ''
  batchQueryList.value = []
}

/**
 * 移除批量列表中的单项
 */
function removeBatchItem(index) {
  batchQueryList.value.splice(index, 1)
}

/**
 * 批量查询
 * 将多个CPO+产品编号组合发送到后端进行查询
 */
async function handleBatchSearch() {
  if (batchQueryList.value.length === 0) {
    ElMessage.warning('请先添加要查询的CPO和产品编号')
    return
  }
  
  loading.value = true
  hasSearched.value = true
  selectedProduct.value = null
  
  try {
    const params = {
      batchQuery: JSON.stringify(batchQueryList.value),  // 批量查询参数
      StartDate: searchForm.startDate || formatDateTime(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),  // 默认90天
      EndDate: searchForm.endDate || formatDateTime(new Date())
    }
    
    const response = await api.get('/erp/shipment-report', { params })
    let res = response.data && response.data.workOrderInfo !== undefined ? response.data : response
    
    if (res.code !== undefined) {
      if (res.code === 0 && res.data) {
        Object.assign(result, { 
          workOrderInfo: res.data.workOrderInfo, 
          materialList: res.data.materialList || [], 
          materialInList: res.data.materialInList || [], 
          productInfo: res.data.productInfo || [],
          isBatchResult: true  // 标记为批量查询结果
        })
      } else {
        ElMessage.error(res.message || '查询失败')
        return
      }
    } else {
      Object.assign(result, { 
        workOrderInfo: res.workOrderInfo, 
        materialList: res.materialList || [], 
        materialInList: res.materialInList || [], 
        productInfo: res.productInfo || [],
        isBatchResult: true  // 标记为批量查询结果
      })
    }
    
    // 更新待查询列表中的工单号（根据返回的产品信息匹配）
    let matchedCount = 0
    let unmatchedCount = 0
    
    batchQueryList.value.forEach(queryItem => {
      const searchCpo = (queryItem.cpo || '').toLowerCase().trim()
      const searchProductId = (queryItem.productId || '').toLowerCase().trim()
      
      // 在返回结果中查找匹配的产品，获取工单号（精确匹配）
      const matchedProduct = result.productInfo.find(p => {
        const itemCpo = (p.cpo || '').toLowerCase().trim()
        const itemCProductId = (p.cProductId || '').toLowerCase().trim()
        const itemProductId = (p.productId || '').toLowerCase().trim()
        
        return itemCpo === searchCpo && 
               (itemCProductId === searchProductId || itemProductId === searchProductId)
      })
      
      if (matchedProduct) {
        queryItem.pNum = matchedProduct.pNum || ''
        queryItem.matched = true
        matchedCount++
      } else {
        queryItem.pNum = ''
        queryItem.matched = false
        unmatchedCount++
      }
    })
    
    const parts = []
    if (result.productInfo?.length > 0) parts.push(`产品 ${result.productInfo.length} 项`)
    if (result.materialList.length > 0) parts.push(`物料 ${result.materialList.length} 项`)
    if (result.materialInList.length > 0) parts.push(`入库明细 ${result.materialInList.length} 条`)
    
    if (parts.length > 0) {
      ElMessage.success(`批量查询成功：${parts.join('、')}`)
      
      // 如果有未匹配的项目，给出提示
      if (unmatchedCount > 0) {
        ElMessage.warning(`${unmatchedCount} 条数据未匹配到入库记录，可能尚未入库或时间范围不够`)
      }
      
      // A08客户提示：可以合并生成报告
      if (result.productInfo?.length > 1) {
        const customerId = result.productInfo[0]?.customerId || result.workOrderInfo?.CustomerID
        if (customerId === 'A08') {
          ElMessage.info('A08客户：可勾选多个产品合并生成一份报告')
        }
      }
    } else {
      ElMessage.info('未找到匹配的数据，请检查CPO和产品编号是否正确，或扩大时间范围')
    }
  } catch (error) {
    ElMessage.error('批量查询失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

/**
 * 选择产品行，刷新右侧预览数据
 */
function handleProductSelect(row) {
  selectedProduct.value = row
  updateReportPreview()
}

/**
 * 更新报告预览编号和日期
 */
function updateReportPreview() {
  const now = new Date()
  reportPreview.reportNo = `SR${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  reportPreview.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}


/**
 * 设置产品行高亮样式
 */
function getProductRowClass({ row }) {
  return selectedProduct.value?.productId === row.productId ? 'selected-row' : ''
}

/**
 * 处理表格多选变化
 */
function handleSelectionChange(selection) {
  selectedProducts.value = selection
}

/**
 * 触发单产品生成报告流程
 */
function handleGenerateReport(row) {
  selectedProduct.value = row
  reportDialogProduct.value = row
  reportDialogProducts.value = [row]  // 单产品数组
  // 优先从工单信息获取客户编码，其次从产品数据获取
  const customerId = result.workOrderInfo?.CustomerID || row.customerId || ''
  const matched = templateList.value.find(t => t.customerId === customerId && t.enabled)
  selectedTemplateId.value = matched?.id || templateList.value[0]?.id
  showReportDialog.value = true
}

/**
 * 触发多产品合并生成报告流程
 */
function handleBatchGenerateReport() {
  if (selectedProducts.value.length < 2) {
    ElMessage.warning('请至少选择2个产品进行合并生成')
    return
  }
  selectedProduct.value = selectedProducts.value[0]
  reportDialogProduct.value = selectedProducts.value[0]
  reportDialogProducts.value = [...selectedProducts.value]  // 多产品数组
  // 优先从工单信息获取客户编码，其次从产品数据获取
  const customerId = result.workOrderInfo?.CustomerID || selectedProducts.value[0]?.customerId || ''
  const matched = templateList.value.find(t => t.customerId === customerId && t.enabled)
  selectedTemplateId.value = matched?.id || templateList.value[0]?.id
  showReportDialog.value = true
}

/**
 * 保存报告记录到数据库
 * 保存生成报告时的完整数据，与报告文件中的内容一致：
 * - 产品信息（包括规格、实测尺寸）
 * - 检验数据（首件核对、工单核对、图纸核对）
 * - 结果判定
 * - 原材料信息
 * - 工单信息
 */
async function saveReportRecord() {
  try {
    const products = reportDialogProducts.value && reportDialogProducts.value.length > 0 
      ? reportDialogProducts.value 
      : (selectedProduct.value ? [selectedProduct.value] : [])
      
    // 确保 reportPreview 已经生成
    if (!reportPreview.reportNo) {
      updateReportPreview()
    }
    
    // 从产品信息中提取工单号、订单号、CPO（支持批量查询模式）
    const firstProduct = products[0] || {}
    const pNums = [...new Set(products.map(p => p.pNum).filter(Boolean))].join(',')
    const orderNums = [...new Set(products.map(p => p.orderNum).filter(Boolean))].join(',')
    const cpos = [...new Set(products.map(p => p.cpo).filter(Boolean))].join(',')
    
    const inspectedAt = new Date().toISOString()
    
    // 使用 buildTemplateContext 获取与报告文件一致的完整数据
    const templateContext = buildTemplateContext()
    
    // 构造完整的检验数据
    const inspectionData = {
      // 报告级别信息
      reportInfo: {
        reportNo: templateContext.ReportNo || reportPreview.reportNo,
        reportDate: templateContext.ReportDate || reportPreview.date,
        customerID: templateContext.CustomerID || '',
        inspector: templateContext.Inspector || '',
        totalCount: templateContext.TotalCount || 0,
        productCount: templateContext.ProductCount || 0
      },
      // 工单信息快照
      workOrderInfo: result.workOrderInfo ? { ...result.workOrderInfo } : null,
      // 按产品存储检验数据（使用 tableData 中的完整数据）
      products: {},
      // 原始 tableData（报告文件中的表格数据，用于完整还原）
      tableData: templateContext.tableData || [],
      // 全局原材料列表
      materialList: result.materialList || [],
      // 全局入库明细
      materialInList: result.materialInList || [],
      // 汇总信息
      summary: {
        totalProducts: products.length,
        passedCount: products.length,
        overallResult: '合格',
        generatedAt: inspectedAt
      }
    }
    
    // 为每个产品构建独立的检验数据（从 tableData 提取）
    if (templateContext.tableData && templateContext.tableData.length > 0) {
      templateContext.tableData.forEach((rowData, index) => {
        const productKey = rowData.CProductID || rowData.客户料号 || rowData.ProductID || `product_${index}`
        
        inspectionData.products[productKey] = {
          // 序号
          index: rowData.Index || rowData.序号 || (index + 1),
          // 产品基本信息
          productInfo: {
            productId: rowData.ProductID || rowData.产品编码 || '',
            cProductId: rowData.CProductID || rowData.客户料号 || '',
            product: rowData.Product || rowData.产品名称 || rowData.品名 || '',
            cProduct: rowData.CProduct || rowData.工厂订单号 || '',
            scale: rowData.Scale || rowData.规格 || rowData.规格尺寸 || '',
            count: rowData.Count || rowData.数量 || rowData.出货数量 || 0,
            sampleCount: rowData.SampleCount || rowData.抽检数量 || 0
          },
          // 实测尺寸
          measuredSize: rowData.MeasuredSize || rowData.实测尺寸 || rowData.实测 || '',
          // 首件核对
          firstPieceCheck: {
            appearance: rowData.外观 || rowData.Appearance || '',
            color: rowData.颜色 || rowData.Color || '',
            graphics: rowData.图文 || rowData.Graphics || '',
            font: rowData.字体 || rowData.Font || '',
            dieLine: rowData.啤切线 || rowData.DieLine || ''
          },
          // 工单核对
          workOrderCheck: {
            materialNum: rowData.物料编号 || rowData.MaterialNumCheck || '',
            dieCutStyle: rowData.模切方式 || rowData.DieCutStyle || '',
            packingStyle: rowData.包装方式 || rowData.PackingStyle || ''
          },
          // 图纸核对
          drawingCheck: {
            material: rowData.材质 || rowData.MaterialCheck || '',
            printContent: rowData.印刷内容 || rowData.PrintContent || ''
          },
          // 结果判定
          result: rowData.结果判定 || rowData.Result || '合格',
          // 检验时间
          inspectedAt: inspectedAt
        }
      })
    }

    const payload = {
      ReportNo: reportPreview.reportNo,
      CustomerID: result.workOrderInfo?.CustomerID || firstProduct.customerId || '',
      PNum: result.workOrderInfo?.PNum || pNums || '',
      OrderNum: result.workOrderInfo?.OrderNum || orderNums || '',
      CPO: result.workOrderInfo?.CPO || cpos || '',
      ReportDate: reportPreview.date,
      ProductInfo: JSON.stringify(products),
      InspectionData: JSON.stringify(inspectionData),
      Status: 'Generated'
    }
    
    await api.post('/shipment-report', payload)
    console.log('Report record saved:', payload)
  } catch (e) {
    console.error('Failed to save report record:', e)
    ElMessage.warning('报告文件已生成，但保存记录失败: ' + (e.message || '未知错误'))
  }
}

/**
 * 确认生成报告
 */
async function confirmGenerateReport() {
  if (!selectedTemplateId.value) { ElMessage.warning('请选择报告模板'); return }
  generatingReport.value = true
  try {
    await new Promise(r => setTimeout(r, 500))
    showReportDialog.value = false
    
    // 如果是单产品，更新预览
    if (reportDialogProducts.value.length === 1) {
      handleProductSelect(reportDialogProducts.value[0])
    }
    
    const tpl = getSelectedTemplate()
    const useTemplate = !!(tpl?.id)
    console.log('生成报告，使用模板:', useTemplate, '模板ID:', tpl?.id, '产品数量:', reportDialogProducts.value.length)
    
    // 先保存记录，再下载文件（或者并行，但最好确保记录保存了）
    // 或者先下载文件，再保存记录。如果下载失败，记录就不保存了。
    
    if (reportFormat.value === 'excel') {
      useTemplate ? await exportFromTemplate(tpl) : await handleExportReport()
    } else {
      useTemplate ? await printFromTemplate(tpl) : handlePrintReport()
    }
    
    // 保存报告记录
    await saveReportRecord()
    
    ElMessage.success('报告生成成功')
    
    // 清空多选
    if (productTableRef.value) {
      productTableRef.value.clearSelection()
    }
  } catch (err) {
    ElMessage.error('导出/打印失败：' + (err.message || '未知错误'))
  } finally {
    generatingReport.value = false
  }
}

/**
 * 快速导出（预览卡片按钮）
 */
async function handleQuickExport() {
  await handleExportReport()
  await saveReportRecord()
}

/**
 * 快速打印（预览卡片按钮）
 */
async function handleQuickPrint() {
  handlePrintReport()
  await saveReportRecord()
}

/**
 * 导出报告为Excel文件
 */
async function handleExportReport() {
  if (!selectedProduct.value || !result.workOrderInfo) {
    ElMessage.warning('请先选择产品')
    return
  }
  const tpl = getSelectedTemplate()
  // 只要选择了模板（有id），就使用模板导出
  if (tpl?.id) {
    await exportFromTemplate(tpl)
    return
  }
  try {
    const materialRows = (result.materialList || []).map(m => [m.type || '', m.name || '', m.brand || '', m.spec || ''])
    const rows = [
      ['出货检验报告'],
      ['报告编号', reportPreview.reportNo],
      ['日期', reportPreview.date],
      [],
      ['客户编码', result.workOrderInfo.CustomerID, '工单号', result.workOrderInfo.PNum],
      ['CPO', result.workOrderInfo.CPO || '-', '订单号', result.workOrderInfo.OrderNum],
      ['产品编码', selectedProduct.value.productId, '客户料号', selectedProduct.value.cProductId],
      ['产品名称', selectedProduct.value.product, '规格', selectedProduct.value.scale],
      ['数量', selectedProduct.value.pCount || selectedProduct.value.orderCount],
      [],
      ['原材料信息'],
      ['类型', '物料名称', '供应商', '规格'],
      ...materialRows,
      [],
      ['检验结果'],
      ['外观检验', '合格'],
      ['尺寸检验', '合格'],
      ['功能检验', '合格'],
      ['包装检验', '合格']
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, '出货报告')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    
    // 生成专业的文件名
    const customerID = result.workOrderInfo?.CustomerID || ''
    const pNum = result.workOrderInfo?.PNum || ''
    const dateStr = reportPreview.date || new Date().toISOString().slice(0, 10)
    let fileName = '出货检验报告'
    if (customerID) fileName += `_${customerID}`
    if (pNum) fileName += `_${pNum}`
    fileName += `_${dateStr}.xlsx`
    
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName)
    ElMessage.success('Excel 导出成功')
  } catch (e) {
    ElMessage.error('导出失败：' + (e.message || '未知错误'))
  }
}
/**
 * 打印报告（可选择另存为PDF）
 */
function handlePrintReport() {
  try {
    if (!previewRef.value) {
      ElMessage.warning('请先选择产品以生成预览')
      return
    }
    const html = previewRef.value.innerHTML
    let printWin = window.open('', '_blank')
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 16px; }
        .report-header { text-align: center; padding-bottom: 12px; border-bottom: 2px solid #333; margin-bottom: 12px; }
        .report-section { margin-bottom: 12px; }
        .report-section h4 { margin: 0 0 8px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
      </style>
    `
    if (printWin) {
      printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${html}</body></html>`)
      printWin.document.close()
      printWin.focus()
      printWin.print()
    } else {
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow?.document
      if (!doc) throw new Error('打印窗口不可用')
      doc.open()
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${html}</body></html>`)
      doc.close()
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 200)
    }
  } catch (e) {
    ElMessage.error('打印失败：' + (e.message || '未知错误'))
  }
}

/**
 * 打开新增模板表单
 */
function handleAddTemplate() {
  templateFormMode.value = 'add'
  Object.assign(templateForm, { 
    id: null, 
    customerId: '', 
    customerName: '', 
    templateName: '', 
    description: '', 
    enabled: true, 
    fileName: '', 
    fileType: '', 
    fileArrayBuffer: null, 
    fileBase64: null,
    rawFile: null,
    newFileName: '',
    newFileArrayBuffer: null,
    newFileBase64: null
  })
  showTemplateForm.value = true
}

/**
 * 编辑模板，填充表单
 */
function handleEditTemplate(row) {
  templateFormMode.value = 'edit'
  Object.assign(templateForm, { 
    ...row, 
    fileArrayBuffer: row.fileBase64 ? base64ToArrayBuffer(row.fileBase64) : row.fileArrayBuffer || null,
    // 清空替换文件相关字段
    newFileName: '',
    newFileArrayBuffer: null,
    newFileBase64: null
  })
  showTemplateForm.value = true
}

/**
 * 下载当前模板文件
 */
function downloadCurrentTemplate() {
  if (!templateForm.id) return
  const tpl = templateList.value.find(t => t.id === templateForm.id)
  if (tpl) {
    downloadTemplate(tpl)
  }
}

/**
 * 处理替换模板文件
 */
function handleReplaceTemplateFile(uploadFile) {
  const file = uploadFile.raw
  if (!file) return
  const reader = new FileReader()
  reader.onload = e => {
    templateForm.newFileName = file.name
    templateForm.newFileArrayBuffer = e.target.result
    templateForm.newFileBase64 = arrayBufferToBase64(e.target.result)
    templateForm.fileType = file.type || file.name.split('.').pop()
    ElMessage.success(`已选择新文件：${file.name}`)
  }
  reader.readAsArrayBuffer(file)
}

/**
 * 打开映射编辑对话框，加载后端解析与已保存映射
 */
/**
 * 打开映射编辑页面
 */
function openMappingDialog(row) {
  router.push(`/shipment-report/template-mapping/${row.id}`)
}

/**
 * 保存当前映射到后端（保留兼容）
 */
async function saveCurrentMapping() {
  try {
    if (!mappingTemplateId) { ElMessage.warning('缺少模板ID'); return }
    await api.post(`/shipment-report/templates/${mappingTemplateId}/mapping`, mappingData)
    ElMessage.success('映射保存成功')
  } catch (e) {
    ElMessage.error('保存映射失败：' + (e.message || '未知错误'))
  }
}

async function fetchTemplates() {
  try {
    const resp = await api.get('/shipment-report/templates')
    const list = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : [])
    templateList.value = list
  } catch {}
}

/**
 * 下载模板文件
 */
async function downloadTemplate(row) {
  try {
    const resp = await api.get(`/shipment-report/templates/${row.id}/download`, { responseType: 'blob' })
    const blob = new Blob([resp], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, row.fileName || `template_${row.id}.xlsx`)
  } catch (e) {
    ElMessage.error('下载失败：' + (e.message || '未知错误'))
  }
}

/**
 * 删除模板，带确认
 */
async function handleDeleteTemplate(row) {
  try {
    await ElMessageBox.confirm(`确定删除模板 "${row.templateName}"？`, '提示', { type: 'warning' })
    await api.delete(`/shipment-report/templates/${row.id}`)
    const idx = templateList.value.findIndex(t => t.id === row.id)
    if (idx > -1) { templateList.value.splice(idx, 1); ElMessage.success('删除成功') }
  } catch {}
}

/**
 * 保存模板（新增/编辑）
 */
async function handleSaveTemplate() {
  try {
    await templateFormRef.value.validate()
    if (templateFormMode.value === 'add') {
      // 新增模式：必须有文件
      if (!templateForm.rawFile) {
        ElMessage.warning('请选择模板文件')
        return
      }
      const fd = new FormData()
      fd.append('customerId', templateForm.customerId || '')
      fd.append('customerName', templateForm.customerName || '')
      fd.append('templateName', templateForm.templateName || '')
      fd.append('description', templateForm.description || '')
      fd.append('enabled', templateForm.enabled ? 'true' : 'false')
      fd.append('file', templateForm.rawFile)
      const resp = await api.post('/shipment-report/templates', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const item = resp?.data ?? resp
      templateList.value.push(item)
      ElMessage.success('模板上传成功')
    } else {
      // 编辑模式：可选替换文件
      const fd = new FormData()
      fd.append('customerId', templateForm.customerId || '')
      fd.append('customerName', templateForm.customerName || '')
      fd.append('templateName', templateForm.templateName || '')
      fd.append('description', templateForm.description || '')
      fd.append('enabled', templateForm.enabled ? 'true' : 'false')
      // 如果有新文件（替换），使用新文件
      if (templateForm.rawFile) {
        fd.append('file', templateForm.rawFile)
      } else if (templateForm.newFileArrayBuffer) {
        // 将 ArrayBuffer 转为 Blob 并上传
        const blob = new Blob([templateForm.newFileArrayBuffer], { type: 'application/octet-stream' })
        fd.append('file', blob, templateForm.newFileName)
      }
      const resp = await api.put(`/shipment-report/templates/${templateForm.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const item = resp?.data ?? resp
      const idx = templateList.value.findIndex(t => t.id === item.id)
      if (idx > -1) { 
        templateList.value[idx] = item
        ElMessage.success(templateForm.newFileName ? '模板文件已替换' : '模板更新成功') 
      }
    }
    showTemplateForm.value = false
    // 清空替换文件相关字段
    templateForm.newFileName = ''
    templateForm.newFileArrayBuffer = null
    templateForm.newFileBase64 = null
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('保存失败：' + (e.message || '验证失败'))
    }
  }
}

onMounted(() => {
  fetchTemplates()
  // 根据默认激活的标签加载数据
  if (activeTab.value === 'history') {
    fetchHistory()
  }
})
</script>

<style scoped>
.shipment-report-page { padding: 8px; height: 100%; overflow: hidden; display: flex; flex-direction: column; box-sizing: border-box; }

.page-header { display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.95); border-radius: 12px; padding: 8px 16px; margin-bottom: 4px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); flex-shrink: 0; }
.header-content { display: flex; align-items: center; gap: 16px; }
.title-section { display: flex; align-items: center; gap: 8px; }
.header-icon { font-size: 24px; color: #667eea; }
.page-header h1 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; }
.subtitle { color: #64748b; font-size: 13px; margin: 0; }

.main-content { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
.left-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 4px; padding-bottom: 20px; }
.right-panel { width: 420px; flex-shrink: 0; height: 100%; overflow-y: auto; padding-bottom: 20px; }

.search-card, .result-card, .preview-card { background: rgba(255, 255, 255, 0.95); border-radius: 12px; border: none; flex-shrink: 0; }
:deep(.el-card__header) { padding: 12px 20px; border-bottom: 1px solid #f0f0f0; }
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #334155; }
.card-header .el-icon { font-size: 18px; color: #667eea; }
.card-header .el-tag { margin-left: auto; }
.header-tip { font-size: 12px; color: #94a3b8; font-weight: normal; margin-left: 8px; }

/* 产品卡片header特殊布局 */
.product-card-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.product-card-header .header-left { display: flex; align-items: center; gap: 8px; }
.product-card-header .header-left .el-tag { margin-left: 0; }
.product-card-header .header-tip { margin-left: 0; }

.search-form { padding: 10px 0; }
.btn-group { display: flex; gap: 10px; align-items: center; }
.search-tip { font-size: 12px; color: #94a3b8; margin-left: 12px; }

.product-card :deep(.el-table) { cursor: pointer; }
.product-card :deep(.selected-row) { background-color: #e8f4ff !important; }

.material-collapse { background: rgba(255, 255, 255, 0.95); border-radius: 12px; overflow: hidden; }
.collapse-title { display: flex; align-items: center; gap: 8px; }
.collapse-title .el-icon { color: #667eea; }
.collapse-title .el-tag { margin-left: 8px; }

.preview-card { position: sticky; top: 20px; }
.preview-actions { margin-left: auto; display: flex; gap: 8px; }

.report-preview { padding: 10px; }
.report-header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #667eea; margin-bottom: 16px; }
.report-header h2 { margin: 0 0 8px 0; color: #1a1a2e; font-size: 20px; }
.report-no { color: #64748b; font-size: 13px; margin: 0; }
.report-info { margin-bottom: 16px; }
.report-section { margin-bottom: 16px; }
.report-section h4 { margin: 0 0 10px 0; color: #334155; font-size: 14px; padding-left: 10px; border-left: 3px solid #667eea; }
.report-footer { border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 20px; }
.signature-row { display: flex; justify-content: space-between; }
.signature-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.signature-line { display: inline-block; min-width: 60px; border-bottom: 1px solid #333; }

.initial-hint { background: rgba(255, 255, 255, 0.95); border-radius: 12px; flex-shrink: 0; }
.hint-header { display: flex; align-items: center; justify-content: center; gap: 8px; color: #909399; font-size: 14px; }
.hint-title { color: #909399; }
.hint-text { text-align: left; color: #64748b; margin-top: 12px; padding: 16px; background: #f8fafc; border-radius: 12px; max-width: 400px; margin-left: auto; margin-right: auto; }
.hint-text p { margin: 0 0 12px 0; font-weight: 500; color: #334155; }
.hint-text ul { margin: 0; padding-left: 20px; }
.hint-text li { margin-bottom: 8px; line-height: 1.6; }
.hint-text strong { color: #667eea; }

.template-toolbar { margin-bottom: 16px; }

.history-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-top: 16px;
  padding-bottom: 12px;
}

/* 模板预览表格样式 */
.mapping-preview {
  overflow: auto;
  max-height: 400px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
.mapping-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
.mapping-preview :deep(th),
.mapping-preview :deep(td) {
  border: 1px solid #d0d0d0;
  padding: 4px 8px;
  text-align: left;
  min-width: 60px;
  position: relative;
}
.mapping-preview :deep(th) {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
}
.mapping-preview :deep(tr:nth-child(even)) {
  background-color: #fafafa;
}
.mapping-preview :deep(tr:hover) {
  background-color: #e8f4ff;
}
.mapping-preview :deep(td:hover) {
  background-color: #d4e9ff;
  cursor: pointer;
  outline: 2px solid #409eff;
  outline-offset: -2px;
}
/* 添加行号列样式 */
.mapping-preview :deep(tr td:first-child),
.mapping-preview :deep(tr th:first-child) {
  background-color: #f0f0f0;
  color: #666;
  font-weight: 500;
  text-align: center;
  min-width: 40px;
}

:deep(.el-table th) { background-color: #f8fafc !important; color: #475569; font-weight: 600; }
:deep(.el-descriptions__label) { background-color: #f8fafc !important; font-weight: 500; }

/* 模板文件信息样式 */
.current-file-info {
  width: 100%;
}
.current-file-info .file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}
.current-file-info .file-row .el-icon {
  color: #409eff;
  font-size: 18px;
}
.current-file-info .file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
  font-size: 13px;
}
.current-file-info .file-action {
  display: flex;
  align-items: center;
  gap: 12px;
}
.current-file-info .new-file-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67c23a;
  font-size: 12px;
}
.current-file-info .new-file-hint .el-icon {
  font-size: 14px;
}

@media (max-width: 1200px) {
  .main-content { flex-direction: column; overflow-y: auto; }
  .left-panel, .right-panel { height: auto; overflow: visible; flex: none; }
  .right-panel { width: 100%; }
  .preview-card { position: static; }
}
@media (max-width: 768px) { .shipment-report-page { padding: 12px; } .page-header { flex-direction: column; gap: 16px; padding: 16px; } }

/* 后台页面特定样式 */
.shipment-report-page.admin-page {
  padding-top: 0;
}

.admin-page .page-header {
  margin-top: 0;
  border-radius: 8px; /* 稍微减小圆角以适应后台风格 */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05); /* 减弱阴影 */
}

/* 前台页面特定样式 */
.frontend-page {
  padding: 0;
  height: 100%;
}

.frontend-page .page-header {
  border-radius: 8px;
  margin-bottom: 12px;
}

.frontend-page .main-content {
  /* height: calc(100vh - 200px); 移除旧的高度计算 */
}

/* 移除旧的特定样式 */
/* 前台页面特定样式 - 修复顶部空距过大问题 */
/* 调整 AppLayout 带来的顶部间距 */

/* 批量查询样式 */
.batch-search-form {
  padding: 10px 0;
}
.batch-input-section,
.batch-preview-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  height: auto;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.section-title {
  font-weight: 600;
  color: #334155;
  font-size: 14px;
}
.help-icon {
  color: #94a3b8;
  cursor: help;
}
.batch-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
.batch-preview-section :deep(.el-table) {
  background: transparent;
}
.batch-preview-section :deep(.el-table__empty-block) {
  min-height: 80px;
}
.pnum-cell {
  color: #409eff;
  font-weight: 500;
}
.pnum-pending {
  color: #c0c4cc;
  font-size: 12px;
  font-style: italic;
}
.pnum-unmatched {
  color: #f56c6c;
  font-size: 12px;
  font-weight: 500;
}

/* Tab页面自适应布局样式 */
.main-tabs {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 强制 el-tabs 使用 column 方向的 flex 布局 */
.main-tabs.el-tabs {
  display: flex !important;
  flex-direction: column !important;
}

/* 确保 header 在顶部，不被压缩 */
.main-tabs :deep(.el-tabs__header) {
  flex-shrink: 0 !important;
  order: -1 !important; /* 强制排在最前面 */
  margin-bottom: 0 !important;
  background: #fff;
  padding: 8px 16px 0 !important;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e4e7ed;
}

.main-tabs :deep(.el-tabs__nav-wrap) {
  margin-bottom: 0;
}

.main-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

/* 内容区域填充剩余空间 */
.main-tabs :deep(.el-tabs__content) {
  flex: 1 !important;
  overflow: hidden;
  padding: 12px 16px;
  background: #fff;
  border-radius: 0 0 8px 8px;
}

.main-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

.generate-pane-content {
  display: flex;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}

.history-pane-content {
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-card {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.history-card :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0 16px 16px 16px;
}

.history-card :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 调整时间选择器标签大小 */
.batch-search-form :deep(.el-form-item__label) {
  font-size: 13px !important;
}
/* 调整时间选择器标签大小 */
.batch-search-form :deep(.el-form-item__label) {
  font-size: 13px !important;
}
/* 报告详情信息块样式 */
.info-block {
  text-align: center;
  padding: 4px;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.info-block .label {
  font-size: 13px;
  color: #606266;
  margin-right: 8px;
  margin-bottom: 0;
  white-space: nowrap;
}
.info-block .value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 自定义表格选中行高亮样式 */
:deep(.el-table__body tr.current-row > td.el-table__cell) {
  background-color: #409EFF !important;
  color: #fff !important;
}

/* 保持选中行的hover样式一致 */
:deep(.el-table__body tr.current-row:hover > td.el-table__cell) {
  background-color: #66b1ff !important; /* 稍微亮一点的蓝色作为hover */
}

/* 选中行中的链接按钮颜色改为白色，确保可见性 */
:deep(.el-table__body tr.current-row .el-button.is-link) {
  color: #fff !important;
}

/* 适配移动端 */
@media (max-width: 1200px) {
  .generate-pane-content {
    flex-direction: column;
    overflow-y: auto;
  }
}

/* 操作列按钮样式 */
.action-buttons {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px;
  height: 100%;
}

.action-buttons .el-dropdown {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
}

:deep(.el-table .el-table__cell .action-buttons) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
