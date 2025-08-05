<template>
  <div class="data-management">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>数据管理</h2>
          <p>管理系统数据的导入导出功能</p>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" class="data-tabs" @tab-change="handleTabChange">
        <!-- 质量异常数据导入 -->
        <el-tab-pane label="质量异常数据导入" name="import">
          <div class="import-section">
            <el-steps :active="currentStep" finish-status="success" align-center>
              <el-step title="选择文件" description="上传Excel文件"></el-step>
              <el-step title="字段映射" description="配置字段对应关系"></el-step>
              <el-step title="导入数据" description="执行数据导入"></el-step>
            </el-steps>
            
            <!-- 步骤1: 文件上传 -->
            <div v-if="currentStep === 0" class="step-content" v-loading="previewLoading" :element-loading-text="loadingText || '正在处理Excel文件...'">
              <el-card class="upload-card">
                <template #header>
                  <div class="upload-header">
                    <h3>上传Excel文件</h3>
                    <el-button type="primary" size="small" @click="downloadTemplate">
                      <el-icon><Download /></el-icon>
                      下载模板
                    </el-button>
                  </div>
                </template>

                <!-- 必填字段说明 -->
                <el-alert
                  title="必填字段说明"
                  type="info"
                  :closable="false"
                  show-icon
                  class="required-fields-alert"
                >
                  <template #default>
                    <p><strong>以下字段为必填项，请确保Excel文件中包含这些列：</strong></p>
                    <div class="required-fields-list">
                      <el-tag type="danger" size="small">投诉日期</el-tag>
                      <el-tag type="danger" size="small">客户编号</el-tag>
                      <el-tag type="danger" size="small">工单号</el-tag>
                      <el-tag type="danger" size="small">产品名称</el-tag>
                      <el-tag type="danger" size="small">生产数量</el-tag>
                      <el-tag type="danger" size="small">投诉类别</el-tag>
                      <el-tag type="danger" size="small">不良类别</el-tag>
                      <el-tag type="danger" size="small">不良项</el-tag>
                      <el-tag type="danger" size="small">不良描述</el-tag>
                    </div>
                  </template>
                </el-alert>

                <el-upload
                  ref="uploadRef"
                  :key="uploadKey"
                  class="upload-demo"
                  drag
                  :auto-upload="false"
                  :on-change="handleFileChange"
                  :on-remove="handleFileRemove"
                  :before-upload="beforeUpload"
                  :on-exceed="handleFileExceed"
                  @click="handleUploadClick"
                  accept=".xlsx,.xls"
                  :limit="1"
                >
                  <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                  <div class="el-upload__text">
                    将Excel文件拖到此处，或<em>点击上传</em>
                  </div>
                  <template #tip>
                    <div class="el-upload__tip">
                      只能上传 .xlsx/.xls 文件，且不超过20MB
                    </div>
                  </template>
                </el-upload>
                
                <div v-if="selectedFile" class="file-info">
                  <el-alert
                    :title="`已选择文件: ${selectedFile.name}`"
                    type="success"
                    :closable="false"
                    show-icon
                  />

                  <!-- 工作表选择 -->
                  <div v-if="hasMultipleSheets" :key="sheetSelectionKey" class="sheet-selection" style="margin-top: 15px;">
                    <el-alert
                      title="检测到多个工作表"
                      description="请选择要导入数据的工作表"
                      type="info"
                      :closable="false"
                      style="margin-bottom: 15px"
                    />
                    <div class="sheet-buttons">
                      <el-button
                        v-for="sheetName in sheetNames"
                        :key="sheetName"
                        type="primary"
                        plain
                        @click="previewSelectedSheet(sheetName)"
                        :loading="previewLoading"
                        style="margin-right: 10px; margin-bottom: 10px;"
                      >
                        {{ sheetName }}
                      </el-button>
                    </div>
                  </div>

                  <div class="step-actions">
                    <el-button @click="clearFile">重新选择</el-button>
                    <el-button
                      v-if="!hasMultipleSheets"
                      type="primary"
                      @click="previewFile"
                      :loading="previewLoading"
                    >
                      预览文件
                    </el-button>
                  </div>
                </div>
              </el-card>
            </div>
            
            <!-- 步骤2: 字段映射 -->
            <div v-if="currentStep === 1" class="step-content" v-loading="previewLoading" :element-loading-text="loadingText || '正在准备字段映射...'">
              <el-row :gutter="20">
                <!-- 左侧：字段选择 -->
                <el-col :span="12">
                  <el-card class="field-selection-card">
                    <template #header>
                      <h3>选择要导入的字段</h3>
                    </template>
                    
                    <div class="field-selection">
                      <el-checkbox
                        v-model="selectAll"
                        :indeterminate="isIndeterminate"
                        @change="handleSelectAll"
                      >
                        全选
                      </el-checkbox>
                      
                      <el-divider />
                      
                      <el-checkbox-group v-model="selectedFields" @change="handleFieldChange">
                        <div v-for="(field, key) in fieldMapping" :key="key" class="field-item">
                          <el-checkbox :label="key">
                            {{ field.label }}
                            <el-tag v-if="field.required" type="danger" size="small">必填</el-tag>
                          </el-checkbox>
                        </div>
                      </el-checkbox-group>
                    </div>
                  </el-card>
                </el-col>
                
                <!-- 右侧：列映射 -->
                <el-col :span="12">
                  <el-card class="column-mapping-card">
                    <template #header>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>字段与Excel列的对应关系</h3>
                        <div>
                          <el-button
                            v-if="Object.keys(columnMapping).length > 0"
                            size="small"
                            @click="clearAllMappings"
                          >
                            清空映射
                          </el-button>
                          <el-button
                            v-if="selectedFields.length > 1"
                            type="primary"
                            size="small"
                            @click="smartAutoMap"
                            :disabled="selectedFields.length === 0"
                            style="margin-left: 8px;"
                          >
                            智能映射
                          </el-button>
                        </div>
                      </div>
                    </template>

                    <div class="column-mapping">
                      <!-- 智能映射提示 -->
                      <el-alert
                        v-if="selectedFields.length > 1 && Object.keys(columnMapping).length === 0"
                        title="提示：点击【智能映射】按钮可根据字段名自动匹配Excel列，或手动为第一个字段选择列后点击【全选】触发顺序映射"
                        type="info"
                        :closable="false"
                        style="margin-bottom: 15px;"
                      />

                      <div v-for="field in selectedFields" :key="field" class="mapping-item">
                        <label class="mapping-label">{{ fieldMapping[field]?.label }}:</label>
                        <el-select
                          v-model="columnMapping[field]"
                          placeholder="选择Excel列"
                          class="mapping-select"
                        >
                          <el-option
                            v-for="(header, index) in excelHeaders"
                            :key="index"
                            :label="`${header} (列${index + 1})`"
                            :value="index"
                          />
                        </el-select>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
              
              <!-- 预览数据 -->
              <el-card v-if="previewData.length > 0" class="preview-card">
                <template #header>
                  <h3>数据预览 (前5行)</h3>
                </template>
                
                <el-table
                  :data="previewData"
                  border
                  style="width: 100%"
                >
                  <el-table-column
                    v-for="(header, index) in excelHeaders"
                    :key="index"
                    :prop="index.toString()"
                    :label="`${header} (列${index + 1})`"
                    min-width="120"
                  />
                </el-table>
              </el-card>
              
              <div class="step-actions">
                <el-button @click="currentStep = 0">上一步</el-button>
                <el-button type="primary" @click="currentStep = 2" :disabled="selectedFields.length === 0">
                  下一步
                </el-button>
              </div>
            </div>
            
            <!-- 步骤3: 导入确认 -->
            <div v-if="currentStep === 2" class="step-content"
                 v-loading="validationLoading || importLoading"
                 :element-loading-text="loadingText || '正在处理数据...'"
                 element-loading-background="rgba(0, 0, 0, 0.8)"
                 element-loading-lock="true">
              <el-card class="confirm-card">
                <template #header>
                  <h3>确认导入信息</h3>
                </template>
                
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="文件名">{{ selectedFile?.name }}</el-descriptions-item>
                  <el-descriptions-item label="数据行数">{{ totalRows }}</el-descriptions-item>
                  <el-descriptions-item label="选择字段数">{{ selectedFields.length }}</el-descriptions-item>
                  <el-descriptions-item label="目标表">ComplaintRegister</el-descriptions-item>
                </el-descriptions>

                <el-divider />

                <!-- 文件处理说明 -->
                <el-alert
                  title="文件处理模式"
                  type="success"
                  :closable="false"
                  show-icon
                  style="margin-bottom: 20px;"
                >
                  <template #default>
                    <p>Excel中的本地文件将自动拷贝到服务器指定目录，生成HTTP访问链接，确保在任何设备上都能访问。</p>
                    <p><strong>存储位置：</strong>根据当前数据库配置中的文件存储路径设置</p>
                  </template>
                </el-alert>

                <!-- 校验模式设置 -->
                <div style="margin-bottom: 20px;">
                  <h4>校验设置:</h4>
                  <el-row :gutter="20">
                    <el-col :span="24">
                      <el-switch
                        v-model="strictValidationMode"
                        active-text="严格模式：按代码定义的必填字段校验"
                        inactive-text="宽松模式：仅校验数据库必填字段（日期+客户）"
                        style="--el-switch-on-color: #409eff; --el-switch-off-color: #67c23a"
                      />
                    </el-col>
                  </el-row>
                  <el-alert
                    v-if="strictValidationMode"
                    title="严格模式：将校验所有在代码中定义为必填的字段"
                    type="info"
                    :closable="false"
                    style="margin-top: 10px;"
                  />
                  <el-alert
                    v-else
                    title="宽松模式：仅校验数据库中的必填字段（投诉日期、客户编号），提高导入成功率"
                    type="success"
                    :closable="false"
                    style="margin-top: 10px;"
                  />
                </div>

                <el-divider />
                
                <h4>字段映射关系:</h4>
                <el-table
                  :data="mappingTableData"
                  border
                  style="width: 100%"
                >
                  <el-table-column prop="field" label="数据库字段" />
                  <el-table-column prop="excelColumn" label="Excel列" />
                  <el-table-column prop="required" label="是否必填">
                    <template #default="scope">
                      <el-tag :type="scope.row.required ? 'danger' : 'info'" size="small">
                        {{ scope.row.required ? '是' : '否' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
                
                <div class="step-actions">
                  <el-button @click="currentStep = 1">上一步</el-button>
                  <el-button type="warning" @click="() => validateData()" :disabled="validationLoading || importLoading">
                    数据校验
                  </el-button>
                  <el-button type="primary" @click="executeImport" :disabled="validationLoading || importLoading">
                    直接导入
                  </el-button>
                </div>
              </el-card>
            </div>

            <!-- 步骤4: 导入完成 -->
            <div v-if="currentStep === 3" class="step-content">
              <el-card class="success-card">
                <template #header>
                  <div class="success-header">
                    <el-icon class="success-icon"><SuccessFilled /></el-icon>
                    <h3>导入完成</h3>
                  </div>
                </template>

                <div class="success-content">
                  <el-result
                    icon="success"
                    title="数据导入成功！"
                    sub-title="Excel数据已成功导入到系统中"
                  >
                    <template #extra>
                      <div class="success-actions">
                        <el-button type="primary" @click="resetImportProcess">
                          <el-icon><Refresh /></el-icon>
                          重新导入
                        </el-button>
                        <el-button @click="$router.push('/complaint/list')">
                          <el-icon><Document /></el-icon>
                          查看数据
                        </el-button>
                      </div>
                    </template>
                  </el-result>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>
        
        <!-- 数据表初始化 -->
        <el-tab-pane label="数据表初始化" name="initialize">
          <div class="initialize-section">
            <el-alert
              title="⚠️ 危险操作警告"
              type="warning"
              :closable="false"
              show-icon
              class="warning-alert"
            >
              <template #default>
                <p><strong>此功能将完全清空选定表的所有数据并重置自增ID！</strong></p>
                <p>• 适用于开发环境或生产环境初次部署</p>
                <p>• 操作不可撤销，请谨慎使用</p>
                <p>• 系统关键表（User、DbConfig）受保护，不允许清空</p>
              </template>
            </el-alert>

            <el-card class="table-list-card" v-loading="tableListLoading">
              <template #header>
                <div class="card-header">
                  <h3>数据表列表</h3>
                  <el-button type="primary" @click="refreshTableList" :loading="tableListLoading">
                    <el-icon><Refresh /></el-icon>
                    刷新列表
                  </el-button>
                </div>
              </template>

              <!-- 数据表分类标签页 -->
              <el-tabs v-model="activeTableTab" class="table-tabs">
                <!-- 业务数据表标签页 -->
                <el-tab-pane label="业务数据表" name="business">
                  <template #label>
                    <span class="tab-label">
                      <el-icon><Document /></el-icon>
                      业务数据表 ({{ businessTables.length }})
                    </span>
                  </template>
                  <div class="table-grid">
                    <div
                      v-for="table in businessTables"
                      :key="table.tableName"
                      class="table-item"
                      :class="{ 'selected': selectedTable?.tableName === table.tableName }"
                      @click="selectTable(table)"
                    >
                      <div class="table-info">
                        <div class="table-name">{{ table.displayName }}</div>
                        <div class="table-details">
                          <span class="table-code">{{ table.tableName }}</span>
                          <span class="record-count" v-if="tableStats[table.tableName]">
                            {{ formatNumber(tableStats[table.tableName].recordCount) }} 条记录
                          </span>
                        </div>
                      </div>
                      <div class="table-actions">
                        <el-tag type="success" size="small">业务数据</el-tag>
                        <el-tag v-if="table.hasIdentity" type="info" size="small">自增ID</el-tag>
                        <el-tag v-if="tableStats[table.tableName] && tableStats[table.tableName].recordCount > 1000" type="warning" size="small">大数据量</el-tag>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>

                <!-- 基础数据表标签页 -->
                <el-tab-pane label="基础数据表" name="basic">
                  <template #label>
                    <span class="tab-label">
                      <el-icon><Collection /></el-icon>
                      基础数据表 ({{ basicTables.length }})
                    </span>
                  </template>
                  <div class="table-grid">
                    <div
                      v-for="table in basicTables"
                      :key="table.tableName"
                      class="table-item"
                      :class="{ 'selected': selectedTable?.tableName === table.tableName }"
                      @click="selectTable(table)"
                    >
                      <div class="table-info">
                        <div class="table-name">{{ table.displayName }}</div>
                        <div class="table-details">
                          <span class="table-code">{{ table.tableName }}</span>
                          <span class="record-count" v-if="tableStats[table.tableName]">
                            {{ formatNumber(tableStats[table.tableName].recordCount) }} 条记录
                          </span>
                        </div>
                      </div>
                      <div class="table-actions">
                        <el-tag type="primary" size="small">基础数据</el-tag>
                        <el-tag v-if="table.hasIdentity" type="info" size="small">自增ID</el-tag>
                        <el-tag v-if="tableStats[table.tableName] && tableStats[table.tableName].recordCount > 1000" type="warning" size="small">大数据量</el-tag>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>

                <!-- 系统配置表标签页 -->
                <el-tab-pane label="系统配置表" name="system">
                  <template #label>
                    <span class="tab-label">
                      <el-icon><Setting /></el-icon>
                      系统配置表 ({{ systemTables.length }})
                    </span>
                  </template>
                  <div class="table-grid">
                    <div
                      v-for="table in systemTables"
                      :key="table.tableName"
                      class="table-item"
                      :class="{
                        'selected': selectedTable?.tableName === table.tableName,
                        'protected': ['User', 'DbConfig'].includes(table.tableName)
                      }"
                      @click="selectTable(table)"
                    >
                      <div class="table-info">
                        <div class="table-name">{{ table.displayName }}</div>
                        <div class="table-details">
                          <span class="table-code">{{ table.tableName }}</span>
                          <span class="record-count" v-if="tableStats[table.tableName]">
                            {{ formatNumber(tableStats[table.tableName].recordCount) }} 条记录
                          </span>
                        </div>
                      </div>
                      <div class="table-actions">
                        <el-tag type="warning" size="small">系统配置</el-tag>
                        <el-tag v-if="table.hasIdentity" type="info" size="small">自增ID</el-tag>
                        <el-tag v-if="['User', 'DbConfig'].includes(table.tableName)" type="danger" size="small">受保护</el-tag>
                        <el-tag v-if="tableStats[table.tableName] && tableStats[table.tableName].recordCount > 1000" type="warning" size="small">大数据量</el-tag>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>
              </el-tabs>

              <!-- 操作区域 -->
              <div class="operation-area" v-if="selectedTable">
                <el-card class="operation-card">
                  <template #header>
                    <div class="operation-header">
                      <h4>初始化操作</h4>
                      <el-tag type="warning">已选择: {{ selectedTable.displayName }}</el-tag>
                    </div>
                  </template>

                  <div class="operation-content">
                    <div class="operation-info">
                      <el-descriptions :column="2" border>
                        <el-descriptions-item label="表名">{{ selectedTable.tableName }}</el-descriptions-item>
                        <el-descriptions-item label="显示名">{{ selectedTable.displayName }}</el-descriptions-item>
                        <el-descriptions-item label="表类型">
                          <el-tag :type="getTableTypeColor(selectedTable.tableType)">
                            {{ getTableTypeText(selectedTable.tableType) }}
                          </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="当前记录数">
                          <span class="record-count-large">
                            {{ tableStats[selectedTable.tableName]?.recordCount || 0 }} 条
                          </span>
                        </el-descriptions-item>
                        <el-descriptions-item label="自增ID">
                          {{ selectedTable.hasIdentity ? '是' : '否' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="操作结果">
                          {{ selectedTable.hasIdentity ? '清空数据 + 重置自增ID为1' : '清空所有数据' }}
                        </el-descriptions-item>
                      </el-descriptions>
                    </div>

                    <div class="operation-buttons">
                      <el-button
                        type="danger"
                        size="large"
                        @click="showInitializeDialog"
                        :disabled="['User', 'DbConfig'].includes(selectedTable.tableName)"
                        :loading="initializeLoading"
                      >
                        <el-icon><Delete /></el-icon>
                        初始化此表
                      </el-button>

                      <el-button @click="selectedTable = null">
                        取消选择
                      </el-button>
                    </div>

                    <div v-if="['User', 'DbConfig'].includes(selectedTable.tableName)" class="protected-notice">
                      <el-alert
                        title="此表受系统保护，不允许清空"
                        type="error"
                        :closable="false"
                        show-icon
                      />
                    </div>
                  </div>
                </el-card>
              </div>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 其他数据管理功能 -->
        <el-tab-pane label="数据导出" name="export">
          <div class="export-section">
            <el-empty description="数据导出功能开发中..." />
          </div>
        </el-tab-pane>

        <el-tab-pane label="数据备份" name="backup">
          <div class="backup-section">
            <!-- 备份功能Tab标签页 -->
            <el-tabs v-model="activeBackupSubTab" class="backup-sub-tabs" @tab-change="handleBackupSubTabChange">
              <!-- 手动备份 -->
              <el-tab-pane label="手动备份" name="manual">
                <!-- 上部容器：左右布局 -->
                <div class="backup-top-container">
                  <el-row :gutter="20">
                    <!-- 左侧：数据库信息模块 -->
                    <el-col :span="12">
                      <el-card class="database-info-card" v-loading="databaseInfoLoading">
                        <template #header>
                          <div class="card-header">
                            <h3>
                              <el-icon><Setting /></el-icon>
                              数据库信息
                            </h3>
                            <el-button type="primary" @click="fetchDatabaseInfo" :loading="databaseInfoLoading">
                              <el-icon><Refresh /></el-icon>
                              刷新信息
                            </el-button>
                          </div>
                        </template>

                    <div class="database-info" v-if="databaseInfo">
                      <!-- 数据库信息表格 -->
                      <el-table :data="databaseInfoTableData" border style="width: 100%; margin-bottom: 20px;">
                        <el-table-column prop="label" label="项目" width="120" />
                        <el-table-column prop="value" label="值" />
                      </el-table>

                      <!-- 备份路径配置 -->
                      <div class="backup-path-config">
                        <div class="info-label" style="margin-bottom: 8px;">备份路径配置</div>
                        <div class="backup-path-input">
                          <el-input
                            v-model="backupPathConfig"
                            placeholder="\\tj_server\工作\DMS备份"
                            :disabled="backupPathSaving"
                          />
                          <el-button
                            type="primary"
                            @click="saveBackupPath"
                            :loading="backupPathSaving"
                            style="margin-left: 8px;"
                          >
                            <el-icon><Setting /></el-icon>
                            保存配置
                          </el-button>
                        </div>
                        <div class="backup-path-tip" style="margin-top: 8px; color: #909399; font-size: 12px;">
                          支持网络共享路径，SQL Server服务需要有访问权限
                        </div>
                      </div>
                    </div>

                    <div v-else class="no-data">
                      <el-empty description="点击刷新按钮获取数据库信息" />
                    </div>
                  </el-card>
                </el-col>

                <!-- 右侧：创建备份模块 -->
                <el-col :span="12">
                  <el-card class="backup-operations-card">
                    <template #header>
                      <div class="card-header">
                        <h3>
                          <el-icon><FolderAdd /></el-icon>
                          创建备份
                        </h3>
                      </div>
                    </template>

                    <!-- 备份方案Tab标签页 -->
                    <el-tabs v-model="activeBackupTab" class="backup-tabs" @tab-change="handleBackupTabChange">
                      <el-tab-pane label="默认方案" name="default">
                        <div class="tab-description">
                          <el-alert
                            title="推荐方案"
                            description="备份到SQL Server默认路径，可靠性高"
                            type="success"
                            :closable="false"
                            show-icon
                            style="margin-bottom: 15px;"
                          />
                        </div>

                        <!-- 默认方案的路径配置 -->
                        <div class="backup-path-config" style="margin-bottom: 15px;">
                          <el-form :model="defaultBackupConfig" label-width="100px">
                            <el-form-item label="服务器路径">
                              <el-input
                                v-model="defaultBackupConfig.serverPath"
                                placeholder="留空使用默认路径"
                              />
                            </el-form-item>
                            <el-form-item>
                              <el-button
                                type="primary"
                                @click="saveDefaultBackupPath"
                                :loading="defaultPathSaving"
                              >
                                保存路径
                              </el-button>
                              <el-text type="info" style="margin-left: 10px;">
                                默认：D:\Program Files\Microsoft SQL Server\...
                              </el-text>
                            </el-form-item>
                          </el-form>
                        </div>
                      </el-tab-pane>

                      <el-tab-pane label="备选方案" name="alternative">
                        <div class="tab-description">
                          <el-alert
                            title="备选方案"
                            description="适用于没有被Radmin控制的服务器"
                            type="info"
                            :closable="false"
                            show-icon
                            style="margin-bottom: 15px;"
                          />
                        </div>

                        <!-- 备选方案的路径配置 -->
                        <div class="backup-path-config" style="margin-bottom: 15px;">
                          <el-form :model="alternativeBackupConfig" label-width="100px">
                            <el-form-item label="网络路径">
                              <el-input
                                v-model="alternativeBackupConfig.networkPath"
                                placeholder="\\\\server\\backup"
                              />
                            </el-form-item>
                            <el-form-item>
                              <el-button
                                type="primary"
                                @click="saveAlternativeBackupPath"
                                :loading="alternativePathSaving"
                              >
                                保存路径
                              </el-button>
                              <el-text type="warning" style="margin-left: 10px;">
                                需要SQL Server服务账户权限
                              </el-text>
                            </el-form-item>
                          </el-form>
                        </div>
                      </el-tab-pane>
                    </el-tabs>

                    <!-- 备份表单 -->
                    <el-form :model="backupForm" label-width="80px">
                      <el-form-item label="备份名称" required>
                        <el-input
                          v-model="backupForm.backupName"
                          placeholder="请输入备份名称"
                          :disabled="backupLoading"
                        />
                      </el-form-item>
                      <el-form-item label="备份类型">
                        <el-select v-model="backupForm.backupType" :disabled="backupLoading" style="width: 100%;">
                          <el-option label="完整备份" value="FULL" />
                          <el-option label="差异备份" value="DIFFERENTIAL" />
                        </el-select>
                      </el-form-item>
                      <el-form-item label="备份描述">
                        <el-input
                          v-model="backupForm.description"
                          type="textarea"
                          :rows="3"
                          placeholder="请输入备份描述（可选）"
                          :disabled="backupLoading"
                        />
                      </el-form-item>
                      <el-form-item>
                        <el-button
                          type="primary"
                          @click="createDatabaseBackup"
                          :loading="backupLoading"
                          :disabled="!backupForm.backupName"
                        >
                          <el-icon><Download /></el-icon>
                          创建备份
                        </el-button>
                        <el-button @click="resetBackupForm" :disabled="backupLoading" style="margin-left: 8px;">
                          重置
                        </el-button>
                      </el-form-item>
                    </el-form>
                  </el-card>
                </el-col>
              </el-row>
            </div>

                <!-- 下部容器：备份历史记录表格 -->
                <div class="backup-bottom-container">
                  <!-- 备份历史卡片 -->
                  <el-card class="backup-history-card" v-loading="backupListLoading">
                    <template #header>
                      <div class="card-header">
                        <h3>
                          <el-icon><Clock /></el-icon>
                          备份历史
                        </h3>
                        <el-button type="primary" @click="fetchBackupList" :loading="backupListLoading">
                          <el-icon><Refresh /></el-icon>
                          刷新列表
                        </el-button>
                      </div>
                    </template>

                    <div v-if="backupList.length > 0">
                      <el-table :data="backupList" stripe>
                        <el-table-column prop="BackupName" label="备份名称" min-width="180" />
                        <el-table-column prop="DatabaseName" label="数据库" width="100" />
                        <el-table-column prop="BackupType" label="备份类型" width="100">
                          <template #default="{ row }">
                            <el-tag :type="row.BackupType === 'FULL' ? 'success' : 'primary'">
                              {{ row.BackupType === 'FULL' ? '完整备份' : '差异备份' }}
                            </el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column prop="BackupPath" label="备份路径" min-width="300">
                          <template #default="{ row }">
                            <el-tooltip :content="row.BackupPath" placement="top">
                              <span class="backup-path">{{ row.BackupPath }}</span>
                            </el-tooltip>
                          </template>
                        </el-table-column>
                        <el-table-column prop="BackupStartTime" label="备份时间" width="160">
                          <template #default="{ row }">
                            {{ formatDateTime(row.BackupStartTime) }}
                          </template>
                        </el-table-column>
                        <el-table-column prop="BackupSize" label="文件大小" width="100">
                          <template #default="{ row }">
                            {{ formatFileSize(row.BackupSize || 0) }}
                          </template>
                        </el-table-column>
                        <el-table-column prop="BackupStatus" label="状态" width="80">
                          <template #default="{ row }">
                            <el-tag
                              :type="getStatusType(row.BackupStatus)"
                            >
                              {{ getStatusText(row.BackupStatus) }}
                            </el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column label="操作" width="200" fixed="right">
                          <template #default="{ row }">
                            <div class="backup-actions">
                              <el-button-group>
                                <el-button type="info" @click="showBackupDetails(row)">
                                  <el-icon><InfoFilled /></el-icon>
                                  详情
                                </el-button>
                                <el-button type="primary" @click="copyBackupPath(row.BackupPath)">
                                  <el-icon><Document /></el-icon>
                                  复制
                                </el-button>
                              </el-button-group>

                              <el-dropdown trigger="click" style="margin-left: 8px;">
                                <el-button type="warning" circle>
                                  <el-icon><ArrowDown /></el-icon>
                                </el-button>
                                <template #dropdown>
                                  <el-dropdown-menu>
                                    <el-dropdown-item @click="updateBackupPath(row)">
                                      <el-icon><Edit /></el-icon>
                                      更新路径
                                    </el-dropdown-item>
                                    <el-dropdown-item @click="verifyBackupFile(row)">
                                      <el-icon><Check /></el-icon>
                                      验证文件
                                    </el-dropdown-item>
                                    <el-dropdown-item @click="downloadBackup(row)" v-if="row.BackupPath.startsWith('\\\\')">
                                      <el-icon><Download /></el-icon>
                                      下载备份
                                    </el-dropdown-item>
                                    <el-dropdown-item divided @click="deleteBackupRecord(row)" style="color: #f56c6c;">
                                      <el-icon><Delete /></el-icon>
                                      删除记录
                                    </el-dropdown-item>
                                  </el-dropdown-menu>
                                </template>
                              </el-dropdown>
                            </div>
                          </template>
                        </el-table-column>
                      </el-table>
                    </div>
                    <div v-else class="no-data">
                      <el-empty description="暂无备份记录" />
                    </div>
                  </el-card>
                </div>
              </el-tab-pane>

              <!-- 自动备份设置 -->
              <el-tab-pane label="自动备份设置" name="auto">
                <div class="auto-backup-section">
                  <el-row :gutter="20">
                    <!-- 左侧：自动备份配置 -->
                    <el-col :span="12">
                      <el-card class="auto-backup-config-card" v-loading="autoBackupConfigLoading">
                        <template #header>
                          <div class="card-header">
                            <h3>
                              <el-icon><Clock /></el-icon>
                              自动备份配置
                            </h3>
                            <el-button type="primary" @click="fetchAutoBackupConfig" :loading="autoBackupConfigLoading">
                              <el-icon><Refresh /></el-icon>
                              刷新配置
                            </el-button>
                          </div>
                        </template>

                        <el-form :model="autoBackupConfig" label-width="120px" v-loading="autoBackupConfigSaving">
                          <!-- 启用自动备份 -->
                          <el-form-item label="启用自动备份">
                            <el-switch
                              v-model="autoBackupConfig.enabled"
                              active-text="启用"
                              inactive-text="禁用"
                              @change="handleAutoBackupToggle"
                            />
                            <div class="form-tip">
                              启用后系统将按照设定的时间自动创建数据库备份
                            </div>
                          </el-form-item>

                          <!-- 备份频率 -->
                          <el-form-item label="备份频率" v-if="autoBackupConfig.enabled">
                            <el-select v-model="autoBackupConfig.frequency" style="width: 100%;">
                              <el-option label="每日备份" value="daily" />
                              <el-option label="每周备份" value="weekly" />
                              <el-option label="每月备份" value="monthly" />
                            </el-select>
                            <div class="form-tip">
                              选择自动备份的执行频率
                            </div>
                          </el-form-item>

                          <!-- 备份时间 -->
                          <el-form-item label="备份时间" v-if="autoBackupConfig.enabled">
                            <el-time-picker
                              v-model="autoBackupConfig.backupTime"
                              format="HH:mm"
                              value-format="HH:mm"
                              placeholder="选择备份时间"
                              style="width: 100%;"
                            />
                            <div class="form-tip">
                              建议选择系统使用较少的时间段，如凌晨时间
                            </div>
                          </el-form-item>

                          <!-- 每周备份日期 -->
                          <el-form-item label="备份日期" v-if="autoBackupConfig.enabled && autoBackupConfig.frequency === 'weekly'">
                            <el-select v-model="autoBackupConfig.weekDay" style="width: 100%;">
                              <el-option label="周一" :value="1" />
                              <el-option label="周二" :value="2" />
                              <el-option label="周三" :value="3" />
                              <el-option label="周四" :value="4" />
                              <el-option label="周五" :value="5" />
                              <el-option label="周六" :value="6" />
                              <el-option label="周日" :value="0" />
                            </el-select>
                            <div class="form-tip">
                              选择每周执行备份的日期
                            </div>
                          </el-form-item>

                          <!-- 每月备份日期 -->
                          <el-form-item label="备份日期" v-if="autoBackupConfig.enabled && autoBackupConfig.frequency === 'monthly'">
                            <el-input-number
                              v-model="autoBackupConfig.monthDay"
                              :min="1"
                              :max="28"
                              style="width: 100%;"
                            />
                            <div class="form-tip">
                              选择每月执行备份的日期（1-28日）
                            </div>
                          </el-form-item>

                          <!-- 备份保留数量 -->
                          <el-form-item label="保留备份数量" v-if="autoBackupConfig.enabled">
                            <el-input-number
                              v-model="autoBackupConfig.retentionCount"
                              :min="1"
                              :max="30"
                              style="width: 100%;"
                            />
                            <div class="form-tip">
                              自动清理超过指定数量的旧备份文件（1-30个）
                            </div>
                          </el-form-item>

                          <!-- 备份类型 -->
                          <el-form-item label="备份类型" v-if="autoBackupConfig.enabled">
                            <el-select v-model="autoBackupConfig.backupType" style="width: 100%;">
                              <el-option label="完整备份" value="FULL" />
                              <el-option label="差异备份" value="DIFFERENTIAL" />
                            </el-select>
                            <div class="form-tip">
                              完整备份：备份整个数据库；差异备份：仅备份自上次完整备份后的更改
                            </div>
                          </el-form-item>

                          <!-- 备份路径方案 -->
                          <el-form-item label="备份路径方案" v-if="autoBackupConfig.enabled">
                            <el-select v-model="autoBackupConfig.backupScheme" style="width: 100%;">
                              <el-option label="默认方案（推荐）" value="default" />
                              <el-option label="备选方案" value="alternative" />
                            </el-select>
                            <div class="form-tip">
                              默认方案：备份到SQL Server默认路径；备选方案：直接备份到网络共享路径
                            </div>
                          </el-form-item>

                          <!-- 操作按钮 -->
                          <el-form-item>
                            <el-button
                              type="primary"
                              @click="saveAutoBackupConfig"
                              :loading="autoBackupConfigSaving"
                            >
                              <el-icon><Setting /></el-icon>
                              保存配置
                            </el-button>
                            <el-button @click="resetAutoBackupConfig" :disabled="autoBackupConfigSaving">
                              重置
                            </el-button>
                          </el-form-item>
                        </el-form>
                      </el-card>
                    </el-col>

                    <!-- 右侧：自动备份状态和日志 -->
                    <el-col :span="12">
                      <el-card class="auto-backup-status-card" v-loading="autoBackupStatusLoading">
                        <template #header>
                          <div class="card-header">
                            <h3>
                              <el-icon><InfoFilled /></el-icon>
                              自动备份状态
                            </h3>
                            <el-button type="primary" @click="fetchAutoBackupStatus" :loading="autoBackupStatusLoading">
                              <el-icon><Refresh /></el-icon>
                              刷新状态
                            </el-button>
                          </div>
                        </template>

                        <div v-if="autoBackupStatus">
                          <!-- 状态信息 -->
                          <el-descriptions :column="1" border style="margin-bottom: 20px;">
                            <el-descriptions-item label="服务状态">
                              <el-tag :type="autoBackupStatus.serviceStatus === 'running' ? 'success' : 'danger'">
                                {{ autoBackupStatus.serviceStatus === 'running' ? '运行中' : '已停止' }}
                              </el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="下次备份时间">
                              {{ autoBackupStatus.nextBackupTime || '未设置' }}
                            </el-descriptions-item>
                            <el-descriptions-item label="上次备份时间">
                              {{ autoBackupStatus.lastBackupTime || '无记录' }}
                            </el-descriptions-item>
                            <el-descriptions-item label="上次备份状态">
                              <el-tag v-if="autoBackupStatus.lastBackupStatus" :type="getStatusType(autoBackupStatus.lastBackupStatus)">
                                {{ getStatusText(autoBackupStatus.lastBackupStatus) }}
                              </el-tag>
                              <span v-else>无记录</span>
                            </el-descriptions-item>
                          </el-descriptions>

                          <!-- 手动触发备份 -->
                          <div class="manual-trigger" style="margin-bottom: 20px;">
                            <el-button
                              type="warning"
                              @click="triggerManualBackup"
                              :loading="manualBackupTriggering"
                              :disabled="!autoBackupConfig.enabled"
                            >
                              <el-icon><Download /></el-icon>
                              立即执行备份
                            </el-button>
                            <div class="form-tip">
                              手动触发一次自动备份任务
                            </div>
                          </div>

                          <!-- 最近备份日志 -->
                          <div class="backup-logs">
                            <h4>最近备份日志</h4>
                            <el-table
                              :data="autoBackupLogs"
                              size="small"
                              max-height="300"
                              stripe
                            >
                              <el-table-column prop="backupTime" label="备份时间" width="160">
                                <template #default="{ row }">
                                  {{ formatDateTime(row.backupTime) }}
                                </template>
                              </el-table-column>
                              <el-table-column prop="backupType" label="类型" width="80">
                                <template #default="{ row }">
                                  <el-tag size="small" :type="row.backupType === 'FULL' ? 'success' : 'primary'">
                                    {{ row.backupType === 'FULL' ? '完整' : '差异' }}
                                  </el-tag>
                                </template>
                              </el-table-column>
                              <el-table-column prop="status" label="状态" width="80">
                                <template #default="{ row }">
                                  <el-tag size="small" :type="getStatusType(row.status)">
                                    {{ getStatusText(row.status) }}
                                  </el-tag>
                                </template>
                              </el-table-column>
                              <el-table-column prop="message" label="备注" min-width="150" />
                            </el-table>
                          </div>
                        </div>

                        <div v-else class="no-data">
                          <el-empty description="点击刷新按钮获取自动备份状态" />
                        </div>
                      </el-card>
                    </el-col>
                  </el-row>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 备份详情对话框 -->
    <el-dialog
      v-model="backupDetailVisible"
      title="备份详情"
      width="600px"
      :before-close="handleCloseBackupDetail"
      class="backup-detail-dialog"
    >
      <div v-if="selectedBackup" class="backup-detail-content">
        <!-- 基本信息卡片 -->
        <el-card class="detail-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><Document /></el-icon>
              <span class="header-title">基本信息</span>
            </div>
          </template>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">备份名称</span>
              <span class="detail-value">{{ selectedBackup.BackupName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">数据库</span>
              <span class="detail-value">{{ selectedBackup.DatabaseName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">备份类型</span>
              <el-tag :type="selectedBackup.BackupType === 'FULL' ? 'primary' : 'warning'" size="small">
                {{ selectedBackup.BackupType === 'FULL' ? '完整备份' : '差异备份' }}
              </el-tag>
            </div>
            <div class="detail-item">
              <span class="detail-label">状态</span>
              <el-tag :type="getStatusType(selectedBackup.BackupStatus)" size="small">
                {{ getStatusText(selectedBackup.BackupStatus) }}
              </el-tag>
            </div>
          </div>
        </el-card>

        <!-- 文件信息卡片 -->
        <el-card class="detail-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><Folder /></el-icon>
              <span class="header-title">文件信息</span>
            </div>
          </template>
          <div class="detail-grid">
            <div class="detail-item full-width">
              <span class="detail-label">备份路径</span>
              <div class="path-container">
                <span class="detail-value path-text">{{ selectedBackup.BackupPath }}</span>
                <el-button
                  size="small"
                  type="primary"
                  link
                  @click="copyToClipboard(selectedBackup.BackupPath)"
                  class="copy-btn"
                >
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
              </div>
            </div>
            <div class="detail-item">
              <span class="detail-label">文件大小</span>
              <span class="detail-value size-text">{{ formatFileSize(selectedBackup.BackupSize) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">创建者</span>
              <span class="detail-value">{{ selectedBackup.CreatedBy || '系统' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">开始时间</span>
              <span class="detail-value">{{ formatDateTime(selectedBackup.BackupStartTime) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">结束时间</span>
              <span class="detail-value">{{ formatDateTime(selectedBackup.BackupEndTime) }}</span>
            </div>
          </div>
        </el-card>

        <!-- 描述信息卡片 -->
        <el-card v-if="selectedBackup.Description" class="detail-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon class="header-icon"><EditPen /></el-icon>
              <span class="header-title">备份描述</span>
            </div>
          </template>
          <div class="description-content">
            {{ selectedBackup.Description }}
          </div>
        </el-card>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="backupDetailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 数据校验对话框 -->
    <el-dialog
      v-model="showValidationDialog"
      title="数据校验结果"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-loading="validationLoading" :element-loading-text="loadingText || '正在校验数据，请稍候...'">
        <div v-if="validationResult.totalRows">
        <!-- 校验结果汇总 -->
        <div class="validation-summary" style="margin-bottom: 20px;">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="总行数" :value="validationResult.totalRows" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="有效行数" :value="validationResult.validRows" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="无效行数" :value="validationResult.invalidRows || 0" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="错误数量" :value="validationResult.errors?.length || 0" />
            </el-col>
          </el-row>
        </div>

        <el-alert
          :title="validationResult.summary?.canImport ?
                  '数据校验通过，可以进行导入' :
                  '数据校验失败，请修正错误后重试'"
          :type="validationResult.summary?.canImport ? 'success' : 'error'"
          :closable="false"
          style="margin-bottom: 15px"
        />

        <!-- 错误列表 -->
        <div v-if="validationResult.errors?.length > 0" style="margin-bottom: 15px">
          <el-collapse>
            <el-collapse-item>
              <template #title>
                <el-icon color="#F56C6C"><Warning /></el-icon>
                <span style="margin-left: 8px; color: #F56C6C; font-weight: bold;">
                  数据错误 ({{ validationResult.errors.length }} 个)
                </span>
              </template>
              <el-table
                :data="validationResult.errors"
                max-height="300"
                size="small"
                stripe
                border
              >
                <el-table-column prop="row" label="Excel行号" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag type="danger" size="small">第{{ row.row }}行</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="field" label="字段名称" width="150" />
                <el-table-column prop="value" label="错误值" width="150">
                  <template #default="{ row }">
                    <el-text type="danger" truncated>{{ row.value || '(空值)' }}</el-text>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="错误描述" min-width="200">
                  <template #default="{ row }">
                    <el-text type="danger">{{ row.message }}</el-text>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 转换建议 -->
        <div v-if="validationResult.conversions?.length > 0" style="margin-bottom: 15px">
          <el-collapse>
            <el-collapse-item>
              <template #title>
                <el-icon color="#E6A23C"><InfoFilled /></el-icon>
                <span style="margin-left: 8px; color: #E6A23C; font-weight: bold;">
                  智能转换建议 ({{ validationResult.conversions.length }} 个)
                </span>
              </template>
              <div style="margin-bottom: 10px;">
                <el-button
                  size="small"
                  type="primary"
                  @click="selectAllConversions"
                  :loading="conversionLoading"
                >
                  全选
                </el-button>
                <el-button
                  size="small"
                  @click="clearAllConversions"
                >
                  清空
                </el-button>
                <el-text type="info" style="margin-left: 10px;">
                  已选择 {{ selectedConversions.length }} 个转换
                </el-text>
              </div>
              <el-table
                :data="validationResult.conversions"
                max-height="300"
                size="small"
                stripe
                border
                v-loading="conversionLoading"
                element-loading-text="正在处理转换建议..."
              >
                <el-table-column width="60" align="center">
                  <template #default="{ row }">
                    <el-checkbox
                      v-model="selectedConversions"
                      :value="row"
                      @change="(checked) => {
                        if (checked) {
                          if (!selectedConversions.find(c => c.row === row.row && c.field === row.field)) {
                            selectedConversions.push(row)
                          }
                        } else {
                          const index = selectedConversions.findIndex(c => c.row === row.row && c.field === row.field)
                          if (index > -1) selectedConversions.splice(index, 1)
                        }
                      }"
                    />
                  </template>
                </el-table-column>
                <el-table-column prop="row" label="Excel行号" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag type="warning" size="small">第{{ row.row }}行</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="field" label="字段名称" width="150" />
                <el-table-column prop="originalValue" label="原始值" width="150">
                  <template #default="{ row }">
                    <el-text type="warning">{{ row.originalValue }}</el-text>
                  </template>
                </el-table-column>
                <el-table-column prop="convertedValue" label="转换后" width="150">
                  <template #default="{ row }">
                    <el-text type="success">{{ row.convertedValue }}</el-text>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="转换说明" min-width="200" />
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 警告列表 -->
        <div v-if="validationResult.warnings?.length > 0">
          <el-collapse>
            <el-collapse-item>
              <template #title>
                <el-icon color="#E6A23C"><Warning /></el-icon>
                <span style="margin-left: 8px; color: #E6A23C; font-weight: bold;">
                  警告信息 ({{ validationResult.warnings.length }} 个)
                </span>
              </template>
              <el-table
                :data="validationResult.warnings"
                max-height="200"
                size="small"
                stripe
                border
              >
                <el-table-column prop="row" label="Excel行号" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag type="warning" size="small">第{{ row.row }}行</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="field" label="字段名称" width="150" />
                <el-table-column prop="message" label="警告信息" min-width="200">
                  <template #default="{ row }">
                    <el-text type="warning">{{ row.message }}</el-text>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <el-text v-if="validationResult.summary?.canImport" type="success">
              ✓ 数据校验通过，可以进行导入
            </el-text>
            <el-text v-else type="danger">
              <el-icon><InfoFilled /></el-icon> 存在数据错误，请修正后重试
            </el-text>
          </div>
          <div>
            <el-button @click="showValidationDialog = false">取消</el-button>
            <el-button
              v-if="selectedConversions.length > 0"
              type="warning"
              @click="applyConversions"
              :disabled="selectedConversions.length === 0"
            >
              应用转换 ({{ selectedConversions.length }}个)
            </el-button>
            <el-button
              v-if="validationResult.summary?.canImport"
              type="primary"
              @click="showValidationDialog = false; executeImport()"
              :disabled="!validationResult.summary?.canImport"
            >
              确认导入
              <span v-if="selectedConversions.length > 0">
                (含{{ selectedConversions.length }}个转换)
              </span>
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 进度对话框 -->
    <el-dialog
      v-model="showProgressDialog"
      title="数据导入进度"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div style="text-align: center; padding: 20px;">
        <el-progress
          type="dashboard"
          :percentage="importProgress.percentage"
          :status="importProgress.status === 'error' ? 'exception' :
                   importProgress.status === 'completed' ? 'success' : ''"
          :width="150"
        />
        <div style="margin-top: 20px;">
          <p><strong>{{ importProgress.message }}</strong></p>
          <p v-if="importProgress.total > 0">
            {{ importProgress.current }} / {{ importProgress.total }}
          </p>
        </div>
      </div>
    </el-dialog>

    <!-- 导入结果对话框 -->
    <el-dialog v-model="showResultDialog" title="导入结果" width="600px">
      <div class="import-result">
        <el-result
          :icon="importResult.success ? 'success' : 'error'"
          :title="importResult.success ? '导入成功' : '导入失败'"
          :sub-title="importResult.message"
        >
          <template #extra>
            <div v-if="importResult.data" class="result-details">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="成功导入">
                  {{ importResult.data.successCount }} 条
                </el-descriptions-item>
                <el-descriptions-item label="失败记录">
                  {{ importResult.data.errorCount }} 条
                </el-descriptions-item>
              </el-descriptions>
              
              <div v-if="importResult.data.errors && importResult.data.errors.length > 0" class="error-list">
                <h4>错误详情:</h4>
                <el-table
                  :data="importResult.data.failedRows || importResult.data.errors.map((error, index) => ({ rowNumber: index + 1, error: error }))"
                  style="width: 100%; margin-top: 10px;"
                  max-height="300"
                  stripe
                  border
                >
                  <el-table-column prop="rowNumber" label="行号" width="80" align="center" />
                  <el-table-column prop="error" label="错误信息" min-width="200">
                    <template #default="scope">
                      <span v-if="typeof scope.row.error === 'string'">{{ scope.row.error }}</span>
                      <span v-else>{{ scope.row.error }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="100" align="center">
                    <template #default="scope">
                      <el-button :link="true"
                        size="small"
                        @click="showRowDetails(scope.row)"
                        v-if="scope.row.rowData"
                      >
                        查看数据
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
            
            <el-button type="primary" @click="resetImport">重新导入</el-button>
          </template>
        </el-result>
      </div>
    </el-dialog>

    <!-- 失败行详情对话框 -->
    <el-dialog
      v-model="showRowDetailsDialog"
      title="失败行详细数据"
      width="80%"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      center
      top="10vh"
      class="row-details-dialog"
    >
      <div v-if="selectedRowData">
        <h4>错误信息：</h4>
        <el-alert
          :title="selectedRowData.error"
          type="error"
          :closable="false"
          style="margin-bottom: 20px;"
        />

        <h4>行数据：</h4>
        <el-table
          :data="formatRowDataForDisplay(selectedRowData.rowData)"
          style="width: 100%;"
          stripe
          border
          max-height="400"
        >
          <el-table-column prop="field" label="字段名" width="200" />
          <el-table-column prop="value" label="值" min-width="300">
            <template #default="scope">
              <span v-if="scope.row.value === null || scope.row.value === undefined">
                <el-tag type="info" size="small">空值</el-tag>
              </span>
              <span v-else>{{ scope.row.value }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="showRowDetailsDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 初始化确认对话框 -->
  <el-dialog
    v-model="showInitializeConfirmDialog"
    title="数据表初始化确认"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @keyup.enter="handleInitializeDialogEnter"
  >
    <div class="initialize-confirm-content">
      <el-alert
        title="⚠️ 最后确认"
        type="error"
        :closable="false"
        show-icon
        class="final-warning"
      >
        <template #default>
          <p><strong>您即将执行不可逆的数据清空操作！</strong></p>
          <p>表名: <code>{{ selectedTable?.tableName }}</code></p>
          <p>显示名: <strong>{{ selectedTable?.displayName }}</strong></p>
          <p>当前记录数: <strong>{{ tableStats[selectedTable?.tableName]?.recordCount || 0 }} 条</strong></p>
        </template>
      </el-alert>

      <div class="confirm-steps">
        <h4>请按以下步骤确认:</h4>
        <ol>
          <li>
            <el-checkbox v-model="confirmStep1">
              我已确认这是开发环境或生产环境初次部署
            </el-checkbox>
          </li>
          <li>
            <el-checkbox v-model="confirmStep2">
              我已备份重要数据（如有需要）
            </el-checkbox>
          </li>
          <li>
            <el-checkbox v-model="confirmStep3">
              我理解此操作将永久删除表中所有数据
            </el-checkbox>
          </li>
          <li>
            <div class="password-confirm">
              <span>请输入确认密码: </span>
              <el-input
                v-model="confirmPassword"
                type="password"
                placeholder="输入 RESET_TABLE_DATA"
                style="width: 200px; margin-left: 10px;"
                show-password
              />
            </div>
          </li>
        </ol>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="cancelInitialize">取消</el-button>
        <el-button
          type="danger"
          @click="executeInitialize"
          :disabled="!canExecuteInitialize"
          :loading="initializeLoading"
        >
          <el-icon><Delete /></el-icon>
          确认初始化
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 初始化结果对话框 -->
  <el-dialog
    v-model="showInitializeResultDialog"
    title="初始化结果"
    width="500px"
  >
    <div class="initialize-result-content">
      <el-result
        :icon="initializeResult.success ? 'success' : 'error'"
        :title="initializeResult.success ? '初始化成功' : '初始化失败'"
        :sub-title="initializeResult.message"
      >
        <template #extra v-if="initializeResult.success && initializeResult.data">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="表名">{{ initializeResult.data.tableName }}</el-descriptions-item>
            <el-descriptions-item label="原记录数">{{ initializeResult.data.originalCount }} 条</el-descriptions-item>
            <el-descriptions-item label="操作结果">{{ initializeResult.data.message }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </el-result>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="closeResultDialog">确定</el-button>
      </div>
    </template>
  </el-dialog>
</div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Download, Warning, InfoFilled, Refresh, Document, Collection, Setting, Delete, SuccessFilled, FolderAdd, ArrowDown, Edit, Check, Folder, EditPen, CopyDocument, Clock } from '@element-plus/icons-vue'
import axios from 'axios'


// 响应式数据
const activeTab = ref('import')
const currentStep = ref(0)
const selectedFile = ref(null)
const previewLoading = ref(false)
const importLoading = ref(false)

// Loading文字状态
const loadingText = ref('')

// 字段映射相关
const fieldMapping = ref({})
const selectedFields = ref([])
const columnMapping = ref({})
const excelHeaders = ref([])
const previewData = ref([])
const totalRows = ref(0)

// 失败行详情相关
const showRowDetailsDialog = ref(false)
const selectedRowData = ref(null)

// 文件拷贝模式（默认启用）
const enableFileCopy = ref(true)

// 工作表选择相关
const hasMultipleSheets = ref(false)
const sheetNames = ref([])
const selectedSheet = ref('')
const sheetSelectionKey = ref(0) // 用于强制重新渲染工作表选择组件
const uploadKey = ref(0) // 用于强制重新渲染上传组件

// 导入结果
const showResultDialog = ref(false)
const importResult = ref({})

// 数据校验相关
const validationLoading = ref(false)
const conversionLoading = ref(false)
const showValidationDialog = ref(false)
const validationResult = ref({})
const selectedConversions = ref([])
const strictValidationMode = ref(true) // 默认严格模式

// 进度相关
const showProgressDialog = ref(false)
const importProgress = ref({
  current: 0,
  total: 0,
  percentage: 0,
  status: 'not_started',
  message: '准备中...'
})

// 数据表初始化相关
const tableList = ref([])
const tableStats = ref({})
const selectedTable = ref(null)
const tableListLoading = ref(false)
const initializeLoading = ref(false)
const showInitializeConfirmDialog = ref(false)
const showInitializeResultDialog = ref(false)
const initializeResult = ref({})

// 数据表标签页相关
const activeTableTab = ref('business')

// 确认步骤
const confirmStep1 = ref(false)
const confirmStep2 = ref(false)
const confirmStep3 = ref(false)
const confirmPassword = ref('')
const sessionId = ref('')

// 文件上传相关
const uploadRef = ref()

// 数据备份相关
const databaseInfo = ref(null)
const databaseInfoLoading = ref(false)
const backupList = ref([])
const backupListLoading = ref(false)
const backupLoading = ref(false)
const backupPathConfig = ref('\\\\tj_server\\工作\\DMS备份')
const backupPathSaving = ref(false)

// 备份子标签页相关
const activeBackupSubTab = ref('manual')

// 备份方案Tab相关
const activeBackupTab = ref('default')

// 默认备份方案配置
const defaultBackupConfig = ref({
  serverPath: ''
})
const defaultPathSaving = ref(false)

// 备选方案配置
const alternativeBackupConfig = ref({
  networkPath: '\\\\tj_server\\公共\\杂七杂八\\品质部临时文件'
})
const alternativePathSaving = ref(false)

// 备份表单
const backupForm = ref({
  backupName: '',
  backupType: 'FULL',
  description: ''
})

// 自动备份相关
const autoBackupConfig = ref({
  enabled: false,
  frequency: 'daily',
  backupTime: '02:00',
  weekDay: 0, // 周日
  monthDay: 1, // 每月1号
  retentionCount: 7,
  backupType: 'FULL',
  backupScheme: 'default'
})
const autoBackupConfigLoading = ref(false)
const autoBackupConfigSaving = ref(false)
const autoBackupStatus = ref(null)
const autoBackupStatusLoading = ref(false)
const autoBackupLogs = ref([])
const manualBackupTriggering = ref(false)



// 计算属性
const selectAll = computed({
  get() {
    return selectedFields.value.length === Object.keys(fieldMapping.value).length
  },
  set(value) {
    if (value) {
      selectedFields.value = Object.keys(fieldMapping.value)
    } else {
      selectedFields.value = []
    }
  }
})

// 数据库信息表格数据
const databaseInfoTableData = computed(() => {
  if (!databaseInfo.value) return []

  return [
    { label: '数据库名称', value: databaseInfo.value.databaseName },
    { label: '服务器名称', value: databaseInfo.value.serverName },
    { label: '表数量', value: `${databaseInfo.value.tableCount} 个` },
    { label: '总记录数', value: `${formatNumber(databaseInfo.value.totalRecords)} 条` },
    { label: '已用空间', value: `${databaseInfo.value.usedSizeMB} MB` },
    { label: '总空间', value: `${databaseInfo.value.totalSizeMB} MB` },
    { label: '可用空间', value: `${databaseInfo.value.freeSpaceMB} MB` }
  ]
})

const isIndeterminate = computed(() => {
  const total = Object.keys(fieldMapping.value).length
  const selected = selectedFields.value.length
  return selected > 0 && selected < total
})

// 数据表分类计算属性
const businessTables = computed(() => tableList.value.filter(table => table.tableType === 'business'))
const basicTables = computed(() => tableList.value.filter(table => table.tableType === 'basic'))
const systemTables = computed(() => tableList.value.filter(table => table.tableType === 'system'))

// 是否可以执行初始化
const canExecuteInitialize = computed(() => {
  return confirmStep1.value &&
         confirmStep2.value &&
         confirmStep3.value &&
         confirmPassword.value === 'RESET_TABLE_DATA'
})

const mappingTableData = computed(() => {
  return selectedFields.value.map(field => ({
    field: fieldMapping.value[field]?.label,
    excelColumn: excelHeaders.value[columnMapping.value[field]] || '未选择',
    required: fieldMapping.value[field]?.required || false
  }))
})

// 方法
const handleFileChange = async (file) => {
  // 检查是否是相同文件名的文件
  if (selectedFile.value && selectedFile.value.name === file.name) {
    // 对于同名文件，我们总是强制重新处理，因为内容可能不同
    await forceRefreshUpload()
  }

  // 立即重置所有状态
  resetImportData()

  // 等待下一个tick确保状态更新完成
  await nextTick()

  // 设置新文件
  selectedFile.value = file.raw
  // 确保步骤重置为0
  currentStep.value = 0
}

const handleFileRemove = () => {
  // 文件被移除时重置所有状态
  selectedFile.value = null
  resetImportData()
}

const handleUploadClick = () => {
  // 点击上传按钮时立即重置状态
  hasMultipleSheets.value = false
  sheetNames.value = []
  selectedSheet.value = ''
  sheetSelectionKey.value++
}

const handleFileExceed = () => {
  ElMessage.warning('只能选择一个文件')
}

// 强制刷新上传组件以处理同名文件
const forceRefreshUpload = async () => {
  uploadKey.value++
  await nextTick()
  // 重新获取ref引用
  await nextTick()
}

const beforeUpload = (file) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  file.type === 'application/vnd.ms-excel'
  const isLt20M = file.size / 1024 / 1024 < 20

  if (!isExcel) {
    ElMessage.error('只能上传Excel文件!')
    return false
  }
  if (!isLt20M) {
    ElMessage.error('文件大小不能超过20MB!')
    return false
  }
  return false // 阻止自动上传
}

const clearFile = () => {
  selectedFile.value = null
  uploadRef.value.clearFiles()
  resetImportData()
}

const resetImportData = () => {
  selectedFields.value = []
  columnMapping.value = {}
  excelHeaders.value = []
  previewData.value = []
  totalRows.value = 0
  hasMultipleSheets.value = false
  sheetNames.value = []
  selectedSheet.value = ''
  currentStep.value = 0
  sheetSelectionKey.value++ // 强制重新渲染工作表选择组件
  uploadKey.value++ // 强制重新渲染上传组件
}

// 重置导入流程
const resetImportProcess = () => {
  // 重置文件
  selectedFile.value = null

  // 重置所有数据
  resetImportData()

  // 重置加载状态
  previewLoading.value = false
  importLoading.value = false
  validationLoading.value = false
  loadingText.value = ''

  // 重置进度状态
  importProgress.value = {
    current: 0,
    total: 0,
    percentage: 0,
    status: 'not_started',
    message: '准备中...'
  }

  // 关闭对话框
  showProgressDialog.value = false

  ElMessage.success('已重置导入流程，可以重新开始')
}

const previewFile = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  // 重置多工作表状态
  hasMultipleSheets.value = false
  sheetNames.value = []
  selectedSheet.value = ''

  previewLoading.value = true
  loadingText.value = '正在读取Excel文件结构...'
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    loadingText.value = '正在解析Excel工作表...'
    const response = await axios.post('/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.success) {
      const data = response.data.data

      // 检查是否有多个工作表
      if (data.hasMultipleSheets) {
        loadingText.value = '检测到多个工作表，准备选择界面...'
        hasMultipleSheets.value = true
        sheetNames.value = data.sheetNames
        ElMessage.info('检测到多个工作表，请选择要导入的工作表')
        return
      }

      // 单个工作表，直接预览
      loadingText.value = '正在加载预览数据...'
      processPreviewData(data)

    } else {
      ElMessage.error(response.data.message || '预览失败')
    }
  } catch (error) {
    ElMessage.error('预览文件失败: ' + (error.response?.data?.message || error.message))
  } finally {
    previewLoading.value = false
    loadingText.value = ''
  }
}

// 选择工作表后预览
const previewSelectedSheet = async (sheetName) => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  previewLoading.value = true
  loadingText.value = `正在读取工作表"${sheetName}"...`
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('sheetName', sheetName)

    loadingText.value = `正在解析工作表"${sheetName}"的数据...`
    const response = await axios.post('/import/preview-sheet', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.success) {
      selectedSheet.value = sheetName
      loadingText.value = '正在生成预览数据...'
      processPreviewData(response.data.data)
    } else {
      ElMessage.error(response.data.message || '预览失败')
    }
  } catch (error) {
    ElMessage.error('预览工作表失败: ' + (error.response?.data?.message || error.message))
  } finally {
    previewLoading.value = false
    loadingText.value = ''
  }
}

// 处理预览数据
const processPreviewData = (data) => {
  excelHeaders.value = data.headers
  previewData.value = data.previewData.map(row => {
    const obj = {}
    row.forEach((cell, index) => {
      obj[index.toString()] = cell
    })
    return obj
  })
  totalRows.value = data.totalRows
  selectedSheet.value = data.selectedSheet
  currentStep.value = 1

  // 自动选择必填字段
  const requiredFields = Object.keys(fieldMapping.value).filter(
    key => fieldMapping.value[key].required
  )
  selectedFields.value = [...requiredFields]

  ElMessage.success('文件预览成功')
}

const handleSelectAll = (value) => {
  if (value) {
    selectedFields.value = Object.keys(fieldMapping.value)

    // 自动映射功能：如果第一个字段已经有映射，则按顺序自动映射后续字段
    autoMapColumns()
  } else {
    selectedFields.value = []
    // 清空所有映射
    columnMapping.value = {}
  }
}

// 自动映射列功能
const autoMapColumns = () => {
  const fieldKeys = Object.keys(fieldMapping.value)

  // 检查是否有任何字段已经有映射
  const existingMappings = Object.keys(columnMapping.value)

  if (existingMappings.length > 0) {
    // 找到第一个已映射字段的列索引
    const firstMappedField = existingMappings[0]
    const startColumnIndex = columnMapping.value[firstMappedField]

    if (startColumnIndex !== undefined && startColumnIndex !== null) {
      // 从第一个已映射字段开始，按字段顺序自动映射
      const firstFieldIndex = fieldKeys.indexOf(firstMappedField)

      fieldKeys.forEach((fieldKey, index) => {
        // 计算目标列索引
        const targetColumnIndex = startColumnIndex + (index - firstFieldIndex)

        // 确保列索引在有效范围内
        if (targetColumnIndex >= 0 && targetColumnIndex < excelHeaders.value.length) {
          columnMapping.value[fieldKey] = targetColumnIndex
        }
      })

      ElMessage.success(`已自动映射 ${fieldKeys.length} 个字段到Excel列`)
    }
  } else {
    // 如果没有现有映射，提示用户先选择第一个字段的映射
    ElMessage.info('请先为第一个字段选择Excel列，然后重新点击全选以启用自动映射')
  }
}

// 智能映射功能
const smartAutoMap = () => {
  if (selectedFields.value.length === 0) {
    ElMessage.warning('请先选择要导入的字段')
    return
  }

  // 检查是否有任何字段已经有映射
  const existingMappings = Object.keys(columnMapping.value).filter(field =>
    columnMapping.value[field] !== undefined && columnMapping.value[field] !== null
  )

  if (existingMappings.length === 0) {
    // 没有现有映射，尝试智能匹配字段名
    let matchedCount = 0

    selectedFields.value.forEach((fieldKey, fieldIndex) => {
      const fieldLabel = fieldMapping.value[fieldKey]?.label || ''
      let bestMatch = -1
      let bestScore = 0

      // 尝试匹配字段名
      excelHeaders.value.forEach((header, headerIndex) => {
        // 检查该列是否已被使用
        const isUsed = Object.values(columnMapping.value).includes(headerIndex)
        if (isUsed) return

        const score = calculateSimilarity(fieldLabel, header)
        if (score > bestScore && score > 0.3) { // 相似度阈值
          bestScore = score
          bestMatch = headerIndex
        }
      })

      if (bestMatch >= 0) {
        columnMapping.value[fieldKey] = bestMatch
        matchedCount++
      } else if (fieldIndex < excelHeaders.value.length) {
        // 如果没有匹配到，按顺序分配未使用的列
        for (let i = 0; i < excelHeaders.value.length; i++) {
          const isUsed = Object.values(columnMapping.value).includes(i)
          if (!isUsed) {
            columnMapping.value[fieldKey] = i
            break
          }
        }
      }
    })

    ElMessage.success(`智能映射完成：匹配到 ${matchedCount} 个相似字段名，其余按顺序分配`)
  } else {
    // 有现有映射，基于第一个映射进行顺序映射
    const firstMappedField = existingMappings[0]
    const startColumnIndex = columnMapping.value[firstMappedField]
    const firstFieldIndex = selectedFields.value.indexOf(firstMappedField)

    selectedFields.value.forEach((fieldKey, index) => {
      const targetColumnIndex = startColumnIndex + (index - firstFieldIndex)

      // 确保列索引在有效范围内
      if (targetColumnIndex >= 0 && targetColumnIndex < excelHeaders.value.length) {
        columnMapping.value[fieldKey] = targetColumnIndex
      }
    })

    ElMessage.success(`已基于"${fieldMapping.value[firstMappedField]?.label}"的映射自动映射其他字段`)
  }
}

// 计算字符串相似度
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0

  const s1 = str1.toLowerCase().replace(/\s+/g, '')
  const s2 = str2.toLowerCase().replace(/\s+/g, '')

  // 完全匹配
  if (s1 === s2) return 1

  // 包含关系
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  // 关键词匹配
  const keywords = {
    '日期': ['date', '时间', '日期'],
    '客户': ['customer', '客户', '用户'],
    '工单': ['order', 'wo', '工单', '订单'],
    '产品': ['product', '产品', '商品'],
    '数量': ['qty', 'quantity', '数量'],
    '金额': ['amount', 'money', '金额', '价格'],
    '备注': ['remark', 'note', '备注', '说明'],
    '附件': ['attachment', 'file', '附件', '文件']
  }

  for (const [key, values] of Object.entries(keywords)) {
    if (s1.includes(key) && values.some(v => s2.includes(v))) {
      return 0.6
    }
  }

  return 0
}

// 清空所有映射
const clearAllMappings = () => {
  columnMapping.value = {}
  ElMessage.success('已清空所有字段映射')
}

const handleFieldChange = (value) => {
  // 清理未选择字段的映射
  Object.keys(columnMapping.value).forEach(field => {
    if (!value.includes(field)) {
      delete columnMapping.value[field]
    }
  })
}

// 转换选择辅助函数
const selectAllConversions = async () => {
  conversionLoading.value = true
  try {
    // 模拟处理时间，给用户反馈
    await new Promise(resolve => setTimeout(resolve, 100))
    selectedConversions.value = [...validationResult.value.conversions]
    ElMessage.success(`已选择 ${validationResult.value.conversions.length} 个智能转换建议`)
  } finally {
    conversionLoading.value = false
  }
}

const clearAllConversions = () => {
  selectedConversions.value = []
}

// 数据校验
const validateData = async (applyConversions = null) => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  if (selectedFields.value.length === 0) {
    ElMessage.warning('请至少选择一个字段')
    return
  }

  // 验证映射完整性
  const unmappedFields = selectedFields.value.filter(field =>
    columnMapping.value[field] === undefined
  )

  if (unmappedFields.length > 0) {
    ElMessage.warning('请为所有选择的字段配置Excel列映射')
    return
  }

  validationLoading.value = true
  loadingText.value = '正在准备数据校验...'
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('selectedFields', JSON.stringify(selectedFields.value))
    formData.append('columnMapping', JSON.stringify(columnMapping.value))
    formData.append('strictValidation', strictValidationMode.value.toString())
    if (selectedSheet.value) {
      formData.append('selectedSheet', selectedSheet.value)
    }
    if (applyConversions) {
      formData.append('applyConversions', JSON.stringify(applyConversions))
    }

    loadingText.value = '正在校验数据格式和完整性。。。'
    const response = await axios.post('/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.success) {
      loadingText.value = '正在生成校验报告...'
      validationResult.value = response.data.data
      selectedConversions.value = [] // 重置转换选择
      showValidationDialog.value = true
    } else {
      ElMessage.error(response.data.message || '数据校验失败')
    }
  } catch (error) {
    ElMessage.error('数据校验失败: ' + (error.response?.data?.message || error.message))
  } finally {
    validationLoading.value = false
    loadingText.value = ''
  }
}

// 应用转换建议
const applyConversions = async () => {
  if (selectedConversions.value.length === 0) {
    ElMessage.warning('请先选择要应用的转换建议')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要应用 ${selectedConversions.value.length} 个转换建议吗？应用后将重新校验数据。`,
      '确认应用转换',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return
  }

  // 关闭当前对话框
  showValidationDialog.value = false

  // 保存要应用的转换建议
  const conversionsToApply = [...selectedConversions.value]

  // 清空已选择的转换建议
  selectedConversions.value = []

  // 重新校验数据（带转换）
  await validateData(conversionsToApply)
}

const executeImport = async () => {
  // 验证映射完整性
  const unmappedFields = selectedFields.value.filter(field =>
    columnMapping.value[field] === undefined
  )

  if (unmappedFields.length > 0) {
    ElMessage.warning('请为所有选择的字段配置Excel列映射')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要导入 ${totalRows.value} 行数据吗？\n\nExcel中的本地文件将自动拷贝到服务器指定目录。\n\n此操作不可撤销。`,
      '确认导入',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return
  }

  // 生成会话ID
  sessionId.value = 'import_' + Date.now()

  // 显示进度对话框
  showProgressDialog.value = true
  importProgress.value = {
    current: 0,
    total: 0,
    percentage: 0,
    status: 'starting',
    message: '准备导入...'
  }

  // 开始轮询进度
  const progressInterval = setInterval(async () => {
    try {
      const response = await axios.get(`/import/progress/${sessionId.value}`)
      if (response.data.success) {
        importProgress.value = response.data.data

        if (importProgress.value.status === 'completed' || importProgress.value.status === 'error') {
          clearInterval(progressInterval)

          // 如果导入成功，更新步骤状态
          if (importProgress.value.status === 'completed') {
            // 将步骤设置为完成状态（超过最大步骤数表示完成）
            currentStep.value = 3
          }

          setTimeout(() => {
            showProgressDialog.value = false
          }, 2000) // 2秒后关闭进度对话框
        }
      }
    } catch (error) {
      // 获取进度失败，静默处理
    }
  }, 500) // 每500ms更新一次进度

  importLoading.value = true
  loadingText.value = '正在启动数据导入任务...'
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('selectedFields', JSON.stringify(selectedFields.value))
    formData.append('columnMapping', JSON.stringify(columnMapping.value))
    formData.append('sessionId', sessionId.value)
    formData.append('strictValidation', strictValidationMode.value.toString())
    formData.append('enableFileCopy', enableFileCopy.value.toString())
    if (selectedSheet.value) {
      formData.append('selectedSheet', selectedSheet.value)
    }
    if (selectedConversions.value.length > 0) {
      formData.append('applyConversions', JSON.stringify(selectedConversions.value))
    }

    // 使用文件拷贝模式的API端点
    const apiEndpoint = '/import/execute-with-copy'

    loadingText.value = '正在执行数据导入（文件拷贝模式），请查看进度对话框...'

    const response = await axios.post(apiEndpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    importResult.value = response.data
    showResultDialog.value = true

    if (response.data.success) {
      ElMessage.success('数据导入成功')
    }
  } catch (error) {
    importResult.value = {
      success: false,
      message: error.response?.data?.message || error.message
    }
    showResultDialog.value = true
  } finally {
    importLoading.value = false
    loadingText.value = ''
  }
}

const resetImport = () => {
  showResultDialog.value = false
  clearFile()
  resetImportData()
}

// 显示失败行详情
const showRowDetails = (row) => {
  selectedRowData.value = row
  showRowDetailsDialog.value = true
}

// 格式化行数据用于显示
const formatRowDataForDisplay = (rowData) => {
  if (!rowData) return []

  return Object.keys(rowData).map(key => ({
    field: fieldMapping.value[key]?.label || key,
    value: rowData[key]
  }))
}

// 获取字段映射
const fetchFieldMapping = async () => {
  try {
    const response = await axios.get('/import/field-mapping')
    if (response.data.success) {
      fieldMapping.value = response.data.data
    }
  } catch (error) {
    ElMessage.error('获取字段映射失败')
  }
}

// 下载Excel模板
const downloadTemplate = async () => {
  try {
    const response = await axios.get('/import/template', {
      responseType: 'blob'
    })

    // 创建下载链接
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '质量异常数据导入模板.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('模板下载成功')
  } catch (error) {
    ElMessage.error('下载模板失败: ' + (error.response?.data?.message || error.message))
  }
}

// ===================== 数据表初始化相关方法 =====================

// 获取表列表
const fetchTableList = async () => {
  tableListLoading.value = true
  try {
    const response = await axios.get('/config/table-list')
    if (response.data.success) {
      tableList.value = response.data.data
      // 获取每个表的统计信息
      await fetchAllTableStats()
    } else {
      ElMessage.error('获取表列表失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('获取表列表失败: ' + (error.response?.data?.message || error.message))
  } finally {
    tableListLoading.value = false
  }
}

// 获取所有表的统计信息
const fetchAllTableStats = async () => {
  const promises = tableList.value.map(table => fetchTableStats(table.tableName))
  await Promise.all(promises)
}

// 获取单个表的统计信息
const fetchTableStats = async (tableName) => {
  try {
    const response = await axios.get(`/config/table-stats/${tableName}`)
    if (response.data.success) {
      tableStats.value[tableName] = response.data.data
    }
  } catch (error) {
    // 获取表统计失败，静默处理
  }
}

// 刷新表列表
const refreshTableList = async () => {
  await fetchTableList()
  ElMessage.success('表列表已刷新')
}

// 选择表
const selectTable = (table) => {
  selectedTable.value = table
}

// 获取表类型颜色
const getTableTypeColor = (type) => {
  switch (type) {
    case 'business': return 'primary'
    case 'basic': return 'success'
    case 'system': return 'warning'
    default: return 'info'
  }
}

// 获取表类型文本
const getTableTypeText = (type) => {
  switch (type) {
    case 'business': return '业务数据表'
    case 'basic': return '基础数据表'
    case 'system': return '系统配置表'
    default: return '未知类型'
  }
}

// 显示初始化确认对话框
const showInitializeDialog = () => {
  // 重置确认状态
  confirmStep1.value = false
  confirmStep2.value = false
  confirmStep3.value = false
  confirmPassword.value = ''

  showInitializeConfirmDialog.value = true
}

// 取消初始化
const cancelInitialize = () => {
  showInitializeConfirmDialog.value = false
}

// 执行初始化
const executeInitialize = async () => {
  if (!selectedTable.value) {
    ElMessage.error('请选择要初始化的表')
    return
  }

  initializeLoading.value = true
  try {
    const response = await axios.post('/config/initialize-table', {
      tableName: selectedTable.value.tableName,
      confirmPassword: confirmPassword.value
    })

    if (response.data.success) {
      initializeResult.value = {
        success: true,
        message: response.data.message,
        data: response.data.data
      }

      // 刷新表统计
      await fetchTableStats(selectedTable.value.tableName)

      ElMessage.success('表初始化成功')
    } else {
      initializeResult.value = {
        success: false,
        message: response.data.message
      }
      ElMessage.error('初始化失败: ' + response.data.message)
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message
    initializeResult.value = {
      success: false,
      message: errorMessage
    }
    ElMessage.error('初始化失败: ' + errorMessage)
  } finally {
    initializeLoading.value = false
    showInitializeConfirmDialog.value = false
    showInitializeResultDialog.value = true
  }
}

// 处理初始化确认对话框的回车键事件
const handleInitializeDialogEnter = () => {
  // 只有当所有确认条件都满足时才执行初始化
  if (canExecuteInitialize.value && !initializeLoading.value) {
    executeInitialize()
  }
}

// 关闭结果对话框
const closeResultDialog = () => {
  showInitializeResultDialog.value = false
  selectedTable.value = null
}





// 格式化数字
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0'
  return num.toLocaleString()
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  // 处理 null、undefined 或空值
  if (bytes === null || bytes === undefined || bytes === '') {
    return '-'
  }

  const numBytes = parseInt(bytes) || 0
  if (numBytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(numBytes) / Math.log(k))
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 安全的日期时间格式化函数，避免时区转换问题
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  
  try {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return dateTime
    
    // 使用本地时区的年月日时分秒，避免UTC转换
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    return dateTime
  }
}

// 生命周期
onMounted(() => {
  fetchFieldMapping()
  // 如果当前标签是初始化标签，则加载表列表
  if (activeTab.value === 'initialize') {
    fetchTableList()
  }
  // 如果当前标签是备份标签，则加载备份相关数据
  if (activeTab.value === 'backup') {
    fetchDatabaseInfo()
    fetchBackupList()
    if (tableList.value.length === 0) {
      fetchTableList()
    }
  }
})

// 监听标签切换
const handleTabChange = (tabName) => {
  if (tabName === 'initialize' && tableList.value.length === 0) {
    fetchTableList()
  }
  if (tabName === 'backup') {
    // 延迟加载备份相关数据，避免初始化时出错
    nextTick(() => {
      if (!databaseInfo.value) {
        fetchDatabaseInfo()
      }
      if (backupList.value.length === 0) {
        fetchBackupList()
      }
    })
  }
}

// =============================================
// 数据备份相关方法
// =============================================

// 获取数据库信息
const fetchDatabaseInfo = async () => {
  databaseInfoLoading.value = true
  try {
    const response = await axios.get('/config/database-info')
    if (response.data.success) {
      databaseInfo.value = response.data.data
      // 同时获取备份路径配置
      if (response.data.data.backupPath) {
        backupPathConfig.value = response.data.data.backupPath
      }
    } else {
      // 不显示错误消息，避免影响用户体验
    }
  } catch (error) {
    // 不显示错误消息，避免影响用户体验
  } finally {
    databaseInfoLoading.value = false
  }
}

// 获取备份列表
const fetchBackupList = async () => {
  backupListLoading.value = true
  try {
    const response = await axios.get('/config/backup-list')
    if (response.data.success) {
      backupList.value = response.data.data
    } else {
      // 不显示错误消息，避免影响用户体验
    }
  } catch (error) {
    // 不显示错误消息，避免影响用户体验
  } finally {
    backupListLoading.value = false
  }
}

// 创建数据库备份
const createDatabaseBackup = async () => {
  if (!backupForm.value.backupName.trim()) {
    ElMessage.warning('请输入备份名称')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要创建数据库备份吗？备份过程可能需要一些时间。',
      '确认备份',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    backupLoading.value = true
    const response = await axios.post('/config/create-backup', {
      backupName: backupForm.value.backupName.trim(),
      backupType: backupForm.value.backupType,
      description: backupForm.value.description.trim(),
      backupScheme: activeBackupTab.value
    })

    if (response.data.success) {
      const backupData = response.data.data
      ElMessage.success('数据库备份创建成功')

      // 显示备份详情
      ElMessageBox.alert(
        `备份创建成功！\n\n备份名称: ${backupData.backupName}\n备份路径: ${backupData.backupPath}\n文件大小: ${formatFileSize(backupData.backupSize)}`,
        '备份成功',
        {
          confirmButtonText: '确定',
          type: 'success'
        }
      )

      resetBackupForm()
      // 刷新备份列表
      await fetchBackupList()
    } else {
      ElMessage.error('创建备份失败: ' + response.data.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('创建备份失败: ' + (error.response?.data?.message || error.message))
    }
  } finally {
    backupLoading.value = false
  }
}

// 重置备份表单
const resetBackupForm = () => {
  backupForm.value = {
    backupName: '',
    backupType: 'FULL',
    description: ''
  }
}

// 获取备份状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'SUCCESS': return 'success'
    case 'FAILED': return 'danger'
    case 'RUNNING': return 'warning'
    case 'PENDING': return 'info'
    default: return 'info'
  }
}

// 获取备份状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'SUCCESS': return '成功'
    case 'FAILED': return '失败'
    case 'RUNNING': return '进行中'
    case 'PENDING': return '等待中'
    default: return '未知'
  }
}

// 备份详情对话框相关
const backupDetailVisible = ref(false)
const selectedBackup = ref(null)

// 显示备份详情
const showBackupDetails = (backup) => {
  selectedBackup.value = backup
  backupDetailVisible.value = true
}

// 关闭备份详情对话框
const handleCloseBackupDetail = () => {
  backupDetailVisible.value = false
  selectedBackup.value = null
}

// 复制备份路径
const copyBackupPath = async (path) => {
  try {
    await navigator.clipboard.writeText(path)
    ElMessage.success('备份路径已复制到剪贴板')
  } catch (error) {
    // 如果浏览器不支持clipboard API，使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = path
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('备份路径已复制到剪贴板')
  }
}

// 保存备份路径配置
const saveBackupPath = async () => {
  if (!backupPathConfig.value.trim()) {
    ElMessage.warning('请输入备份路径')
    return
  }

  backupPathSaving.value = true
  try {
    const response = await axios.post('/config/backup-path', {
      backupPath: backupPathConfig.value.trim()
    })

    if (response.data.success) {
      ElMessage.success('备份路径配置保存成功')
      // 刷新数据库信息以获取最新的备份路径
      await fetchDatabaseInfo()
    } else {
      ElMessage.error('保存备份路径失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('保存备份路径失败: ' + (error.response?.data?.message || error.message))
  } finally {
    backupPathSaving.value = false
  }
}

// 创建备份文件夹
const createBackupFolder = async () => {
  if (!backupPathConfig.value.trim()) {
    ElMessage.warning('请先输入备份路径')
    return
  }

  folderCreating.value = true
  try {
    const response = await axios.post('/config/create-backup-folder', {
      backupPath: backupPathConfig.value.trim()
    })

    if (response.data.success) {
      ElMessage.success('备份文件夹创建成功')
    } else {
      ElMessage.error('创建备份文件夹失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('创建备份文件夹失败: ' + (error.response?.data?.message || error.message))
  } finally {
    folderCreating.value = false
  }
}

// =============================================
// 新增备份管理方法
// =============================================

// 处理备份子标签页切换
const handleBackupSubTabChange = (tabName) => {
  if (tabName === 'auto') {
    fetchAutoBackupConfig()
    fetchAutoBackupStatus()
  }
}

// 处理备份Tab切换
const handleBackupTabChange = (tabName) => {
  // 备份方案切换处理
}

// 保存默认备份路径
const saveDefaultBackupPath = async () => {
  defaultPathSaving.value = true
  try {
    const response = await axios.post('/config/default-backup-path', {
      serverPath: defaultBackupConfig.value.serverPath.trim()
    })

    if (response.data.success) {
      ElMessage.success('默认备份路径保存成功')
    } else {
      ElMessage.error('保存失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
  } finally {
    defaultPathSaving.value = false
  }
}

// 保存备选方案路径
const saveAlternativeBackupPath = async () => {
  if (!alternativeBackupConfig.value.networkPath.trim()) {
    ElMessage.warning('请输入网络路径')
    return
  }

  alternativePathSaving.value = true
  try {
    const response = await axios.post('/config/alternative-backup-path', {
      networkPath: alternativeBackupConfig.value.networkPath.trim()
    })

    if (response.data.success) {
      ElMessage.success('备选方案路径保存成功')
    } else {
      ElMessage.error('保存失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
  } finally {
    alternativePathSaving.value = false
  }
}

// 更新备份路径
const updateBackupPath = async (backup) => {
  try {
    const { value: newPath } = await ElMessageBox.prompt(
      '请输入新的备份路径',
      '更新备份路径',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: backup.BackupPath,
        inputPlaceholder: '请输入完整的备份文件路径'
      }
    )

    if (newPath && newPath.trim() !== backup.BackupPath) {
      const response = await axios.post('/config/update-backup-path', {
        backupId: backup.ID,
        newPath: newPath.trim()
      })

      if (response.data.success) {
        ElMessage.success('备份路径更新成功')
        await fetchBackupList()
      } else {
        ElMessage.error('更新失败: ' + response.data.message)
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('更新失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

// 验证备份文件
const verifyBackupFile = async (backup) => {
  try {
    ElMessage.info('正在验证备份文件...')
    const response = await axios.post('/config/verify-backup', {
      backupId: backup.ID,
      backupPath: backup.BackupPath
    })

    if (response.data.success) {
      const result = response.data.data
      ElMessageBox.alert(
        `文件验证结果：\n\n文件存在：${result.exists ? '是' : '否'}\n文件大小：${formatFileSize(result.size || 0)}\n最后修改：${result.lastModified || '未知'}`,
        '验证结果',
        {
          confirmButtonText: '确定',
          type: result.exists ? 'success' : 'error'
        }
      )
    } else {
      ElMessage.error('验证失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('验证失败: ' + (error.response?.data?.message || error.message))
  }
}

// 下载备份文件
const downloadBackup = (backup) => {
  ElMessage.info('备份文件位于网络路径，请通过文件管理器访问：' + backup.BackupPath)
}

// 删除备份记录
const deleteBackupRecord = async (backup) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除备份记录"${backup.BackupName}"吗？\n\n注意：这只会删除数据库中的记录，不会删除实际的备份文件。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await axios.delete(`/config/backup-record/${backup.ID}`)

    if (response.data.success) {
      ElMessage.success('备份记录删除成功')
      await fetchBackupList()
    } else {
      ElMessage.error('删除失败: ' + response.data.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }
}

// =============================================
// 自动备份相关方法
// =============================================

// 获取自动备份配置
const fetchAutoBackupConfig = async () => {
  autoBackupConfigLoading.value = true
  try {
    const response = await axios.get('/config/auto-backup-config')
    if (response.data.success) {
      // 合并配置，保留默认值
      autoBackupConfig.value = {
        ...autoBackupConfig.value,
        ...response.data.data
      }
    } else {
      // 获取自动备份配置失败，静默处理
    }
  } catch (error) {
    ElMessage.error('获取自动备份配置失败: ' + (error.response?.data?.message || error.message))
  } finally {
    autoBackupConfigLoading.value = false
  }
}

// 保存自动备份配置
const saveAutoBackupConfig = async () => {
  autoBackupConfigSaving.value = true
  try {
    const response = await axios.post('/config/auto-backup-config', autoBackupConfig.value)
    if (response.data.success) {
      ElMessage.success('自动备份配置保存成功')
      // 刷新状态
      await fetchAutoBackupStatus()
    } else {
      ElMessage.error('保存失败: ' + response.data.message)
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
  } finally {
    autoBackupConfigSaving.value = false
  }
}

// 重置自动备份配置
const resetAutoBackupConfig = () => {
  autoBackupConfig.value = {
    enabled: false,
    frequency: 'daily',
    backupTime: '02:00',
    weekDay: 0,
    monthDay: 1,
    retentionCount: 7,
    backupType: 'FULL',
    backupScheme: 'default'
  }
}

// 处理自动备份开关切换
const handleAutoBackupToggle = async (enabled) => {
  if (enabled) {
    try {
      await ElMessageBox.confirm(
        '启用自动备份后，系统将按照设定的时间自动创建数据库备份。\n\n请确保已正确配置备份路径和相关权限。',
        '确认启用自动备份',
        {
          confirmButtonText: '确定启用',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch (error) {
      if (error === 'cancel') {
        autoBackupConfig.value.enabled = false
        return
      }
    }
  }
}

// 获取自动备份状态
const fetchAutoBackupStatus = async () => {
  autoBackupStatusLoading.value = true
  try {
    const response = await axios.get('/config/auto-backup-status')
    if (response.data.success) {
      autoBackupStatus.value = response.data.data
      autoBackupLogs.value = response.data.data.recentLogs || []
    } else {
      // 获取自动备份状态失败，静默处理
    }
  } catch (error) {
    ElMessage.error('获取自动备份状态失败: ' + (error.response?.data?.message || error.message))
  } finally {
    autoBackupStatusLoading.value = false
  }
}

// 手动触发备份
const triggerManualBackup = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要立即执行一次自动备份任务吗？',
      '确认执行备份',
      {
        confirmButtonText: '确定执行',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    manualBackupTriggering.value = true
    const response = await axios.post('/config/trigger-auto-backup')

    if (response.data.success) {
      ElMessage.success('备份任务已触发，请稍后查看备份状态')
      // 延迟刷新状态
      setTimeout(() => {
        fetchAutoBackupStatus()
        fetchBackupList()
      }, 2000)
    } else {
      ElMessage.error('触发备份失败: ' + response.data.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('触发备份失败: ' + (error.response?.data?.message || error.message))
    }
  } finally {
    manualBackupTriggering.value = false
  }
}
</script>

<style scoped>
.data-management {
  padding: 20px;
}

.page-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.data-tabs {
  margin-top: 20px;
}

.import-section {
  padding: 20px 0;
}

.step-content {
  margin-top: 30px;
}

.upload-card,
.field-selection-card,
.column-mapping-card,
.preview-card,
.confirm-card {
  margin-bottom: 20px;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.mode-description {
  margin-top: 10px;
}

.mode-description .el-alert {
  margin-bottom: 0;
}

.upload-header h3 {
  margin: 0;
}

.required-fields-alert {
  margin-bottom: 20px;
}

.required-fields-list {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.upload-demo {
  width: 100%;
}

.file-info {
  margin-top: 20px;
}

.step-actions {
  margin-top: 20px;
  text-align: center;
}

.step-actions .el-button {
  margin: 0 10px;
}

.field-selection {
  max-height: 400px;
  overflow-y: auto;
}

.field-item {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.field-item:hover {
  background-color: #f5f7fa;
}

.field-item .el-checkbox {
  width: 100%;
}

.field-item .el-tag {
  margin-left: 8px;
}

.column-mapping {
  max-height: 400px;
  overflow-y: auto;
}

.mapping-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fafafa;
}

.mapping-label {
  min-width: 120px;
  font-weight: 500;
  color: #606266;
  margin-right: 12px;
}

.mapping-select {
  flex: 1;
}

.preview-card .el-table {
  margin-top: 10px;
}

.confirm-card .el-descriptions {
  margin-bottom: 20px;
}

.confirm-card h4 {
  margin: 20px 0 10px 0;
  color: #303133;
}

.import-result {
  text-align: center;
}

.result-details {
  margin: 20px 0;
}

.error-list {
  margin-top: 20px;
  text-align: left;
}

.error-list h4 {
  color: #f56c6c;
  margin-bottom: 10px;
}

.error-list ul {
  background-color: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  padding: 15px 20px;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.error-list li {
  color: #f56c6c;
  margin-bottom: 5px;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .table-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
  
  .table-item {
    max-width: 300px;
  }
}

@media (max-width: 768px) {
  .data-management {
    padding: 10px;
  }

  .table-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
  }
  
  .table-item {
    max-width: 280px;
    min-height: 100px;
    padding: 10px;
  }
  
  .table-name {
    font-size: 14px;
  }
  
  .table-actions .el-tag {
    font-size: 10px;
    height: 18px;
    line-height: 16px;
    padding: 0 4px;
  }

  .el-col {
    margin-bottom: 20px;
  }

  .mapping-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .mapping-label {
    margin-bottom: 8px;
    min-width: auto;
  }

  .mapping-select {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .table-grid {
    grid-template-columns: 1fr;
  }
  
  .table-item {
    max-width: 100%;
  }
}

/* 上传组件样式优化 */
.upload-demo :deep(.el-upload-dragger) {
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  width: 100%;
  height: 180px;
  text-align: center;
  background-color: #fafafa;
  transition: border-color 0.3s;
}

.upload-demo :deep(.el-upload-dragger:hover) {
  border-color: #409eff;
}

.upload-demo :deep(.el-icon--upload) {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-demo :deep(.el-upload__text) {
  color: #606266;
  font-size: 14px;
}

.upload-demo :deep(.el-upload__text em) {
  color: #409eff;
  font-style: normal;
}

/* 步骤条样式优化 */
.el-steps {
  margin-bottom: 30px;
}

/* 表格样式优化 */
.el-table {
  border-radius: 6px;
  overflow: hidden;
}

.el-table :deep(.el-table__header) {
  background-color: #f5f7fa;
}

/* 卡片标题样式 */
.el-card :deep(.el-card__header) {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.el-card :deep(.el-card__header h3) {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

/* 数据表初始化样式 */
.initialize-section {
  padding: 20px 0;
}

.warning-alert {
  margin-bottom: 20px;
}

.table-list-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-categories {
  margin-top: 20px;
}

.table-category {
  margin-bottom: 30px;
}

.category-title {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.category-title .el-icon {
  margin-right: 8px;
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  max-width: 100%;
}

.table-item {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
  max-width: 320px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.table-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.table-item.selected {
  border-color: #409eff;
  background: #f0f9ff;
}

.table-item.protected {
  border-color: #f56c6c;
  background: #fef0f0;
}

.table-item.protected:hover {
  border-color: #f56c6c;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.2);
}

.table-info {
  flex: 1;
}

.table-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}



.table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: auto;
}

.table-actions .el-tag {
  font-size: 11px;
  height: 20px;
  line-height: 18px;
  padding: 0 6px;
  border-radius: 3px;
}

.table-code {
  font-family: 'Courier New', monospace;
  background: #f5f7fa;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  color: #606266;
}

.record-count {
  font-weight: 500;
  color: #909399;
  font-size: 11px;
}

.operation-area {
  margin-top: 30px;
}

.operation-card {
  border: 2px solid #e6a23c;
}

.operation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.operation-content {
  padding: 20px 0;
}

.operation-info {
  margin-bottom: 20px;
}

.record-count-large {
  font-size: 18px;
  font-weight: 600;
  color: #e6a23c;
}

.operation-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.protected-notice {
  margin-top: 15px;
}

/* 初始化确认对话框样式 */
.initialize-confirm-content {
  padding: 10px 0;
}

.final-warning {
  margin-bottom: 20px;
}

.confirm-steps {
  margin-top: 20px;
}

.confirm-steps h4 {
  margin-bottom: 15px;
  color: #303133;
}

.confirm-steps ol {
  padding-left: 20px;
}

.confirm-steps li {
  margin-bottom: 15px;
  line-height: 1.6;
}

.password-confirm {
  display: flex;
  align-items: center;
  margin-top: 10px;
}

/* 初始化结果对话框样式 */
.initialize-result-content {
  padding: 10px 0;
}

/* 导入完成样式 */
.success-card {
  border: 2px solid #67c23a;
}

.success-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.success-icon {
  color: #67c23a;
  font-size: 24px;
}

.success-content {
  padding: 20px 0;
}

.success-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

/* 数据备份相关样式 */
.backup-section {
  padding: 20px 0;
}

/* 上下布局容器 */
.backup-top-container {
  margin-bottom: 20px;
}

.backup-bottom-container {
  margin-top: 20px;
}

/* 卡片样式优化 */
.database-info-card,
.backup-operations-card,
.backup-history-card {
  height: 100%;
}

.database-info-card .card-header,
.backup-operations-card .card-header,
.backup-history-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.database-info-card .card-header h3,
.backup-operations-card .card-header h3,
.backup-history-card .card-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 数据库信息表格样式 */
.database-info .el-table {
  font-size: 13px;
}

.database-info .el-table th {
  background-color: #f8f9fa;
}

.database-info .el-table td:first-child {
  font-weight: 600;
  color: #495057;
}

.database-info .el-table td:last-child {
  color: #212529;
}

/* 备份Tab标签页样式 */
.backup-tabs {
  margin-bottom: 20px;
}

.backup-tabs .el-tabs__header {
  margin-bottom: 20px;
}

.backup-tabs .el-tabs__item {
  font-weight: 500;
  font-size: 14px;
}

.backup-tabs .el-tabs__item.is-active {
  color: #409eff;
  font-weight: 600;
}

.tab-description {
  margin-bottom: 20px;
}

.backup-path-config {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.backup-path-config .el-form-item {
  margin-bottom: 15px;
}

.backup-path-config .el-form-item:last-child {
  margin-bottom: 0;
}

/* 操作按钮样式优化 */
.backup-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.backup-actions .el-button-group {
  display: flex;
}

.backup-actions .el-button-group .el-button {
  border-radius: 0;
}

.backup-actions .el-button-group .el-button:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.backup-actions .el-button-group .el-button:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

/* 备份历史表格样式 */
.backup-history-card .el-table {
  font-size: 13px;
}

.backup-history-card .backup-path {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

/* 响应式优化 */
@media (max-width: 1200px) {
  .backup-top-container .el-col {
    margin-bottom: 20px;
  }

  .backup-top-container .el-row {
    flex-direction: column;
  }

  .backup-top-container .el-col:first-child {
    margin-bottom: 20px;
  }
}

.backup-path-config {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.backup-path-input {
  display: flex;
  align-items: center;
}

.backup-path {
  display: inline-block;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #606266;
  font-size: 13px;
}

.database-info {
  padding: 20px 0;
}

.info-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.info-label {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 8px;
}

.info-value {
  font-size: 18px;
  font-weight: 600;
  color: #495057;
}

.no-data {
  text-align: center;
  padding: 40px 0;
  color: #6c757d;
}

/* 自动备份相关样式 */
.backup-sub-tabs {
  margin-bottom: 20px;
}

.auto-backup-section {
  padding: 20px 0;
}

.auto-backup-config-card,
.auto-backup-status-card {
  height: 100%;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}

.manual-trigger {
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
}

.backup-logs h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

/* 备份详情对话框样式 */
.backup-detail-dialog .el-dialog__body {
  padding: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.backup-detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-card {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.detail-card .el-card__header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
  padding: 8px 12px;
}

.detail-card .el-card__body {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  color: #409eff;
  font-size: 14px;
}

.header-title {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  padding: 12px;
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .detail-item.full-width {
    grid-column: 1 / -1;
  }
}

.detail-label {
  font-size: 11px;
  color: #909399;
  font-weight: 500;
  line-height: 1.2;
}

.detail-value {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  line-height: 1.3;
}

.path-container {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #f5f7fa;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  min-height: 28px;
}

.path-text {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
  line-height: 1.2;
}

.copy-btn {
  flex-shrink: 0;
  padding: 2px 6px;
  height: 24px;
}

.size-text {
  color: #67c23a;
  font-weight: 600;
}

.description-content {
  padding: 10px 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #606266;
  line-height: 1.4;
  font-size: 13px;
}

.dialog-footer {
  text-align: right;
}

/* 失败行详情对话框样式 */
.row-details-dialog :deep(.el-dialog) {
  height: 80vh !important;
  max-height: 80vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 0 auto !important;
  top: 10vh !important;
  transform: translateY(0) !important;
}

.row-details-dialog :deep(.el-dialog__header) {
  flex-shrink: 0 !important;
  padding: 24px 24px 16px 24px !important;
  border-bottom: 1px solid #e5e7eb !important;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.row-details-dialog :deep(.el-dialog__title) {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #111827 !important;
  letter-spacing: 0.025em !important;
  position: relative !important;
  padding-left: 32px !important;
  line-height: 1.5 !important;
}

.row-details-dialog :deep(.el-dialog__title::before) {
  content: '📋' !important;
  font-size: 18px !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) !important;
}

.row-details-dialog :deep(.el-dialog__body) {
  flex: 1 !important;
  padding: 24px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}

.row-details-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0 !important;
  padding: 16px 24px 24px 24px !important;
  border-top: 1px solid #e5e7eb !important;
  background: #f9fafb !important;
}
</style>
