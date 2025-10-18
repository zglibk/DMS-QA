<template>
  <div class="warehouse-dialog-overlay" v-if="visible" @click="handleOverlayClick">
    <div class="warehouse-dialog" @click.stop>
      <!-- 对话框头部 -->
      <div class="dialog-header">
        <h3>入库确认</h3>
        <button class="close-btn" @click="closeDialog">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z"/>
          </svg>
        </button>
      </div>

      <!-- 订单基本信息 -->
      <div class="order-info">
        <div class="info-row">
          <span class="info-label">客户编码:</span>
          <span class="info-value">{{ orderData.customerCode || '未识别' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">工单号:</span>
          <span class="info-value">{{ orderData.workOrderNumber || '未识别' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">CPO:</span>
          <span class="info-value">{{ orderData.cpo || '未识别' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">订单号:</span>
          <span class="info-value">{{ orderData.orderNumber || '未识别' }}</span>
        </div>
      </div>

      <!-- 明细列表 -->
      <div class="materials-section">
        <h4>明细列表</h4>
        <div class="materials-list">
          <div 
            v-for="(material, index) in materials" 
            :key="index"
            class="material-item"
            :class="{ 'has-difference': material.quantityDifference !== 0 }"
          >
            <!-- 物料基本信息 -->
            <div class="material-header">
              <div class="material-info">
                <span class="material-name">{{ material.materialName }}</span>
                <span class="material-code">{{ material.materialCode }}</span>
              </div>
              <div class="material-order">
                <span class="factory-order">{{ material.factoryOrderNumber }}</span>
                <span class="order-quantity">订单数量: {{ material.orderQuantity }}</span>
              </div>
            </div>

            <!-- 入库录入区域 -->
            <div class="warehouse-input">
              <div class="input-row">
                <label class="input-label">实际数量:</label>
                <div class="input-group">
                  <input 
                    type="number" 
                    v-model.number="material.actualQuantity" 
                    class="quantity-input"
                    :placeholder="`预期: ${material.orderQuantity}`"
                    min="0"
                    @input="calculateDifference(index)"
                  >
                  <span class="input-unit">件</span>
                </div>
              </div>

              <!-- 数量差异显示 -->
              <div v-if="material.quantityDifference !== 0" class="quantity-difference">
                <div class="difference-info" :class="material.quantityDifference > 0 ? 'surplus' : 'shortage'">
                  <span class="difference-label">
                    {{ material.quantityDifference > 0 ? '数量盈余:' : '数量短缺:' }}
                  </span>
                  <span class="difference-value">{{ Math.abs(material.quantityDifference) }} 件</span>
                </div>
                
                <div class="difference-reason">
                  <textarea 
                    v-model="material.differenceReason"
                    class="reason-textarea"
                    :placeholder="`请说明${material.quantityDifference > 0 ? '盈余' : '短缺'}原因`"
                    maxlength="200"
                  ></textarea>
                  <div class="char-count">{{ (material.differenceReason || '').length }}/200</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作人员信息 -->
      <div class="operator-section">
        <div class="input-row">
          <label class="input-label">操作人员:</label>
          <div class="input-group">
            <input 
              type="text" 
              v-model="operatorName" 
              class="operator-input"
              placeholder="请输入操作人员姓名"
            >
          </div>
        </div>
      </div>

      <!-- 汇总信息 -->
      <div class="summary-section">
        <div class="summary-row">
          <span class="summary-label">订单总数量:</span>
          <span class="summary-value">{{ totalOrderQuantity }} 件</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">实际总数量:</span>
          <span class="summary-value">{{ totalActualQuantity }} 件</span>
        </div>
        <div class="summary-row" v-if="totalDifference !== 0">
          <span class="summary-label">总差异:</span>
          <span class="summary-value" :class="totalDifference > 0 ? 'surplus' : 'shortage'">
            {{ totalDifference > 0 ? '+' : '' }}{{ totalDifference }} 件
          </span>
        </div>
      </div>

      <!-- 对话框底部按钮 -->
      <div class="dialog-footer">
        <button class="btn btn-cancel" @click="closeDialog">
          取消
        </button>
        <button class="btn btn-confirm" @click="confirmWarehouse" :disabled="!canConfirm">
          确认入库
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ElMessageBox } from 'element-plus'

export default {
  name: 'WarehouseConfirmDialog',
  props: {
    /**
     * 对话框显示状态
     */
    visible: {
      type: Boolean,
      default: false
    },
    /**
     * 订单数据
     */
    orderData: {
      type: Object,
      default: () => ({})
    },
    /**
     * 明细材料列表
     */
    materialsList: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'confirm'],
  data() {
    return {
      /**
       * 操作人员姓名
       */
      operatorName: '',
      /**
       * 材料列表（包含录入的实际数量）
       */
      materials: []
    }
  },
  computed: {
    /**
     * 订单总数量
     */
    totalOrderQuantity() {
      return this.materials.reduce((sum, material) => sum + (material.orderQuantity || 0), 0)
    },
    
    /**
     * 实际总数量
     */
    totalActualQuantity() {
      return this.materials.reduce((sum, material) => sum + (material.actualQuantity || 0), 0)
    },
    
    /**
     * 总差异
     */
    totalDifference() {
      return this.totalActualQuantity - this.totalOrderQuantity
    },
    
    /**
     * 是否可以确认入库
     */
    canConfirm() {
      // 检查是否填写了操作人员
      if (!this.operatorName.trim()) {
        return false
      }
      
      // 检查是否所有物料都填写了实际数量
      const allQuantitiesFilled = this.materials.every(material => 
        material.actualQuantity !== null && material.actualQuantity !== undefined && material.actualQuantity >= 0
      )
      
      if (!allQuantitiesFilled) {
        return false
      }
      
      // 检查有差异的物料是否都填写了差异原因
      const allDifferencesExplained = this.materials.every(material => 
        material.quantityDifference === 0 || (material.differenceReason && material.differenceReason.trim() !== '')
      )
      
      return allDifferencesExplained
    }
  },
  watch: {
    /**
     * 监听材料列表变化，初始化本地数据
     */
    materialsList: {
      handler(newList) {
        this.initializeMaterials(newList)
      },
      immediate: true,
      deep: true
    },
    
    /**
     * 监听对话框显示状态
     */
    visible(newVal) {
      if (newVal) {
        this.resetForm()
      }
    }
  },
  methods: {
    /**
     * 初始化材料数据
     * @param {Array} materialsList - 材料列表
     */
    initializeMaterials(materialsList) {
      this.materials = materialsList.map(material => ({
        ...material,
        actualQuantity: null,
        quantityDifference: 0,
        differenceReason: ''
      }))
    },
    
    /**
     * 计算数量差异
     * @param {number} index - 材料索引
     */
    calculateDifference(index) {
      const material = this.materials[index]
      if (material.actualQuantity !== null && material.actualQuantity !== undefined) {
        material.quantityDifference = material.actualQuantity - (material.orderQuantity || 0)
        
        // 如果差异为0，清空差异原因
        if (material.quantityDifference === 0) {
          material.differenceReason = ''
        }
      } else {
        material.quantityDifference = 0
        material.differenceReason = ''
      }
    },
    
    /**
     * 重置表单数据
     */
    resetForm() {
      this.operatorName = ''
      this.initializeMaterials(this.materialsList)
    },
    
    /**
     * 处理遮罩层点击
     */
    handleOverlayClick() {
      this.closeDialog()
    },
    
    /**
     * 关闭对话框
     */
    closeDialog() {
      this.$emit('close')
    },
    
    /**
     * 确认入库
     */
    async confirmWarehouse() {
      try {
        // 构建确认数据
        const confirmData = {
          orderData: this.orderData,
          materials: this.materials.map(material => ({
            materialName: material.materialName,
            materialCode: material.materialCode,
            factoryOrderNumber: material.factoryOrderNumber,
            orderQuantity: material.orderQuantity,
            actualQuantity: material.actualQuantity,
            quantityDifference: material.quantityDifference,
            differenceReason: material.differenceReason
          })),
          operatorName: this.operatorName,
          totalOrderQuantity: this.totalOrderQuantity,
          totalActualQuantity: this.totalActualQuantity,
          totalDifference: this.totalDifference,
          timestamp: new Date().toISOString()
        }
        
        // 构建确认信息
        let confirmMessage = `确认入库信息：\n`
        confirmMessage += `操作人员：${this.operatorName}\n`
        confirmMessage += `订单总数量：${this.totalOrderQuantity} 件\n`
        confirmMessage += `实际总数量：${this.totalActualQuantity} 件`
        
        if (this.totalDifference !== 0) {
          confirmMessage += `\n总差异：${this.totalDifference > 0 ? '+' : ''}${this.totalDifference} 件`
        }
        
        // 显示确认对话框
        await ElMessageBox.confirm(
          confirmMessage,
          '确认入库',
          {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        // 触发确认事件
        this.$emit('confirm', confirmData)
        
        this.$message.success('入库确认成功！')
        this.closeDialog()
        
      } catch (error) {
        if (error !== 'cancel') {
          console.error('入库确认失败:', error)
          this.$message.error('入库确认失败: ' + (error.message || '未知错误'))
        }
      }
    }
  }
}
</script>

<style scoped>
/* 对话框遮罩层 */
.warehouse-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* 对话框主体 */
.warehouse-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 对话框头部 */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 12px 12px 0 0;
}

.dialog-header h3 {
  margin: 0;
  color: #495057;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e9ecef;
  color: #495057;
}

/* 订单信息区域 */
.order-info {
  padding: 20px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  min-width: 80px;
  font-weight: 500;
  color: #6c757d;
}

.info-value {
  color: #495057;
  font-weight: 500;
}

/* 明细列表区域 */
.materials-section {
  padding: 20px 24px;
  flex: 1;
}

.materials-section h4 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 物料项 */
.material-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: all 0.2s;
}

.material-item.has-difference {
  border-color: #ffc107;
  background: #fff8e1;
}

.material-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.material-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.material-name {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.material-code {
  font-size: 12px;
  color: #6c757d;
}

.material-order {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.factory-order {
  font-size: 12px;
  color: #6c757d;
}

.order-quantity {
  font-size: 13px;
  color: #495057;
  font-weight: 500;
}

/* 入库录入区域 */
.warehouse-input {
  border-top: 1px solid #e9ecef;
  padding-top: 12px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.input-label {
  min-width: 80px;
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.quantity-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.quantity-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.input-unit {
  color: #6c757d;
  font-size: 14px;
}

/* 数量差异 */
.quantity-difference {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #ffc107;
}

.difference-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.difference-info.surplus {
  color: #28a745;
}

.difference-info.shortage {
  color: #dc3545;
}

.difference-label {
  font-weight: 500;
  font-size: 13px;
}

.difference-value {
  font-weight: 600;
  font-size: 14px;
}

.difference-reason {
  position: relative;
}

.reason-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.reason-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.char-count {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 11px;
  color: #6c757d;
  background: white;
  padding: 2px 4px;
}

/* 操作人员区域 */
.operator-section {
  padding: 16px 24px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.operator-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.operator-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* 汇总信息区域 */
.summary-section {
  padding: 16px 24px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-row:last-child {
  margin-bottom: 0;
}

.summary-label {
  font-weight: 500;
  color: #495057;
}

.summary-value {
  font-weight: 600;
  color: #495057;
}

.summary-value.surplus {
  color: #28a745;
}

.summary-value.shortage {
  color: #dc3545;
}

/* 对话框底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background: #5a6268;
}

.btn-confirm {
  background: #007bff;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #0056b3;
}

.btn-confirm:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .warehouse-dialog {
    width: 95%;
    margin: 20px;
  }
  
  .material-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .material-order {
    align-items: flex-start;
  }
  
  .input-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .input-label {
    min-width: auto;
  }
  
  .summary-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>