<template>
  <div class="data-management">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>数据管理</h2>
          <p>管理系统数据的导入导出功能</p>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" class="data-tabs">
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
            <el-empty description="数据备份功能开发中..." />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

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
                      <el-button
                        type="text"
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


  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Download, Warning, InfoFilled } from '@element-plus/icons-vue'
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
const sessionId = ref('')

// 文件上传相关
const uploadRef = ref()

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

const isIndeterminate = computed(() => {
  const total = Object.keys(fieldMapping.value).length
  const selected = selectedFields.value.length
  return selected > 0 && selected < total
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
    const response = await axios.post('/api/import/preview', formData, {
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
    console.error('预览文件失败:', error)
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
    const response = await axios.post('/api/import/preview-sheet', formData, {
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
    console.error('预览工作表失败:', error)
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
    const response = await axios.post('/api/import/validate', formData, {
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
    console.error('数据校验失败:', error)
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
      const response = await axios.get(`/api/import/progress/${sessionId.value}`)
      if (response.data.success) {
        importProgress.value = response.data.data

        if (importProgress.value.status === 'completed' || importProgress.value.status === 'error') {
          clearInterval(progressInterval)
          setTimeout(() => {
            showProgressDialog.value = false
          }, 2000) // 2秒后关闭进度对话框
        }
      }
    } catch (error) {
      console.error('获取进度失败:', error)
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
    const apiEndpoint = '/api/import/execute-with-copy'

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
    console.error('导入失败:', error)
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
    const response = await axios.get('/api/import/field-mapping')
    if (response.data.success) {
      fieldMapping.value = response.data.data
    }
  } catch (error) {
    console.error('获取字段映射失败:', error)
    ElMessage.error('获取字段映射失败')
  }
}

// 下载Excel模板
const downloadTemplate = async () => {
  try {
    const response = await axios.get('/api/import/template', {
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
    console.error('下载模板失败:', error)
    ElMessage.error('下载模板失败: ' + (error.response?.data?.message || error.message))
  }
}

// 生命周期
onMounted(() => {
  fetchFieldMapping()
})
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
@media (max-width: 768px) {
  .data-management {
    padding: 10px;
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
</style>
