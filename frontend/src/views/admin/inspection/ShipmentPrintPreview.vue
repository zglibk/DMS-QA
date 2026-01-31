<template>
    <div v-loading="loading" class="shipment-print-page">
        <!-- 工具栏 -->
        <div class="print-toolbar no-print" v-if="!loading && htmlContent">
            <div class="toolbar-left">
                <span class="label">电子签章：</span>
                <el-select 
                    v-model="selectedSealId" 
                    placeholder="选择印章" 
                    clearable 
                    @change="handleSealChange"
                    style="width: 200px"
                    popper-class="seal-select-popper"
                >
                    <el-option 
                        v-for="seal in availableSeals" 
                        :key="seal.ID" 
                        :label="seal.SealName" 
                        :value="seal.ID" 
                        class="seal-option-item"
                    >
                        <div class="seal-option-content">
                            <img 
                                v-if="seal.ImageUrl"
                                :src="getAdaptedSealUrl(seal.ImageUrl)" 
                                class="seal-thumb" 
                                @error="(e) => e.target.style.display = 'none'"
                            />
                            <span class="seal-name">{{ seal.SealName }}</span>
                        </div>
                    </el-option>
                </el-select>
                
                <div v-if="selectedSealId" class="seal-size-control">
                    <span class="size-label">尺寸:</span>
                    <el-input-number 
                        v-model="sealWidth" 
                        :min="1" :max="8" :step="0.1" :precision="1" 
                        size="small" controls-position="right" style="width: 70px;"
                        @change="onWidthChange"
                    />
                    <span class="size-sep">×</span>
                    <el-input-number 
                        v-model="sealHeight" 
                        :min="1" :max="8" :step="0.1" :precision="1" 
                        size="small" controls-position="right" style="width: 70px;"
                        @change="onHeightChange"
                    />
                    <span class="size-unit">cm</span>
                    
                    <el-tooltip :content="lockAspectRatio ? '点击解锁比例' : '点击锁定比例'" placement="top">
                        <el-button 
                            link 
                            :type="lockAspectRatio ? 'danger' : 'primary'"
                            :icon="lockAspectRatio ? Lock : Unlock" 
                            @click="toggleLock" 
                            class="lock-btn" 
                            style="margin-left: 5px; font-size: 18px;"
                        />
                    </el-tooltip>
                </div>
            </div>
            
            <div class="toolbar-right">
                <el-button type="primary" :icon="Printer" @click="handlePrint">打印</el-button>
                <el-button :icon="Close" @click="handleClose">关闭</el-button>
            </div>
        </div>

        <!-- 预览区域 -->
        <div v-if="htmlContent" class="preview-container">
            <div class="report-preview" ref="reportPreviewRef">
                <!-- 使用iframe渲染Excel转换的HTML -->
                <iframe 
                    ref="reportIframe"
                    :srcdoc="htmlContentWithSeal"
                    class="report-iframe"
                    frameborder="0"
                    @load="onIframeLoad"
                ></iframe>
                
                <!-- 可拖拽印章（相对于report-preview定位） -->
                <DraggableSeal 
                    v-if="selectedSealId && sealImageUrl"
                    :sealUrl="sealImageUrl"
                    :initialX="sealPosition.x"
                    :initialY="sealPosition.y"
                    :width="pixelWidth"
                    :height="pixelHeight"
                    @update:position="updateSealPosition"
                    @remove="removeSeal"
                />
            </div>
        </div>
        
        <div v-else-if="!loading" class="error-msg">
            <el-empty :description="errorMessage || '加载失败或报告不存在'">
                <el-button type="primary" @click="handleClose">关闭</el-button>
            </el-empty>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import request from '@/utils/api'
import DraggableSeal from '@/components/DraggableSeal.vue'
import { getElectronicSeals } from '@/api/system'
import { Close, Printer, Lock, Unlock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ExcelJS from 'exceljs'
import { buildFileUrl } from '@/utils/fileServerConfig'

const route = useRoute()
const loading = ref(true)
const errorMessage = ref('')
const htmlContent = ref('')
const report = ref(null)
const reportIframe = ref(null)

// 印章相关
const availableSeals = ref([])
const selectedSealId = ref(null)
const sealPosition = ref({ x: 900, y: 600 }) // 初始位置
const sealPositionForPrint = ref({ x: 900, y: 600 }) // 打印时使用的位置（由拖拽更新）
const reportPreviewRef = ref(null)
const sealWidth = ref(3.5)
const sealHeight = ref(3.5)
const lockAspectRatio = ref(true)
const sealImageUrl = ref('')

// 厘米转像素 (96dpi: 1cm ≈ 37.8px)
const CM_TO_PX = 37.8
const pixelWidth = computed(() => Math.round(sealWidth.value * CM_TO_PX))
const pixelHeight = computed(() => Math.round(sealHeight.value * CM_TO_PX))

// 生成包含印章的HTML内容
const htmlContentWithSeal = computed(() => {
    if (!htmlContent.value) return ''
    
    // 如果没有选择印章，返回原始HTML
    if (!selectedSealId.value || !sealImageUrl.value) {
        return htmlContent.value
    }
    
    // 在</body>前插入印章和拖拽脚本
    const sealHtml = `
<div id="seal-container" style="position: absolute; left: ${sealPosition.value.x}px; top: ${sealPosition.value.y}px; width: ${pixelWidth.value}px; height: ${pixelHeight.value}px; transform: translate(-50%, -50%); cursor: move; z-index: 1000; user-select: none;">
    <img src="${sealImageUrl.value}" style="width: 100%; height: 100%; object-fit: contain; opacity: 0.85; pointer-events: none;" draggable="false" />
</div>
<script>
(function() {
    var seal = document.getElementById('seal-container');
    if (!seal) { console.log('印章元素未找到'); return; }
    
    var isDragging = false;
    var startX, startY, initialLeft, initialTop;
    
    seal.onmousedown = function(e) {
        if (e.button !== 0) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseInt(seal.style.left) || 0;
        initialTop = parseInt(seal.style.top) || 0;
        e.preventDefault();
        e.stopPropagation();
    };
    
    document.onmousemove = function(e) {
        if (!isDragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        seal.style.left = (initialLeft + dx) + 'px';
        seal.style.top = (initialTop + dy) + 'px';
    };
    
    document.onmouseup = function() {
        if (isDragging) {
            isDragging = false;
            var newX = parseInt(seal.style.left) || 0;
            var newY = parseInt(seal.style.top) || 0;
            // 通知父窗口位置变化（仅在拖拽结束时）
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'seal-position', x: newX, y: newY }, '*');
            }
        }
    };
})();
<\/script>`
    
    return htmlContent.value.replace('</body>', sealHtml + '</body>')
})

// 宽度变化（锁定比例时同步高度）
const onWidthChange = (val) => {
    if (lockAspectRatio.value && val > 0) {
        sealHeight.value = val
    }
}

// 高度变化（锁定比例时同步宽度）
const onHeightChange = (val) => {
    if (lockAspectRatio.value && val > 0) {
        sealWidth.value = val
    }
}

// 切换锁定状态
const toggleLock = () => {
    lockAspectRatio.value = !lockAspectRatio.value
    if (lockAspectRatio.value) {
        sealHeight.value = sealWidth.value
    }
}

// 获取适配的印章URL
const getAdaptedSealUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url
    
    let cleanPath = url
    if (cleanPath.startsWith('/uploads/seals/')) {
        cleanPath = cleanPath.replace('/uploads/seals/', '/files/seals/')
    } else if (!cleanPath.startsWith('/files/')) {
        cleanPath = `/files/seals/${cleanPath.replace(/^\/+/, '')}`
    }
    
    if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath
    }
    
    return buildFileUrl(cleanPath)
}

// 预加载图片为base64
const preloadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
        if (url.startsWith('data:')) {
            resolve(url)
            return
        }
        
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                const base64 = canvas.toDataURL('image/png')
                resolve(base64)
            } catch (e) {
                resolve(url)
            }
        }
        
        img.onerror = () => reject(new Error('图片加载失败'))
        
        const separator = url.includes('?') ? '&' : '?'
        img.src = url + separator + '_t=' + Date.now()
    })
}

// 监听印章选择变化
watch(selectedSealId, async (newId) => {
    if (newId) {
        const seal = availableSeals.value.find(s => s.ID === newId)
        if (seal && seal.ImageUrl) {
            const url = getAdaptedSealUrl(seal.ImageUrl)
            try {
                const base64 = await preloadImageAsBase64(url)
                sealImageUrl.value = base64
            } catch (e) {
                sealImageUrl.value = url
            }
        }
    } else {
        sealImageUrl.value = ''
    }
})

// =====================================================
// Excel模板渲染相关函数
// =====================================================

function colLetterToNumber(letters) {
    let result = 0
    for (let i = 0; i < letters.length; i++) {
        result = result * 26 + (letters.charCodeAt(i) - 64)
    }
    return result
}

function getCellStyle(cell, rowNumber, colNumber, colCount = 23, tableStartRow = 8) {
    const styles = []
    
    if (cell.font) {
        if (cell.font.bold) styles.push('font-weight: bold')
        if (cell.font.size) styles.push(`font-size: ${cell.font.size}pt`)
        if (cell.font.name) {
            const fontMap = { 
                '宋体': 'SimSun', 
                'SimSun': 'SimSun', 
                '黑体': 'SimHei', 
                '微软雅黑': 'Microsoft YaHei',
                'Microsoft YaHei': 'Microsoft YaHei',
                'Arial': 'Arial',
                'Arial Unicode MS': 'Arial'
            }
            const fontFamily = fontMap[cell.font.name] || cell.font.name.replace(/['"]/g, '')
            styles.push(`font-family: ${fontFamily}`)
        }
        if (cell.font.color?.argb && cell.font.color.argb !== 'FF000000') {
            styles.push(`color: #${cell.font.color.argb.substring(2)}`)
        }
    }
    
    if (cell.alignment) {
        if (cell.alignment.horizontal) {
            const alignMap = { left: 'left', center: 'center', right: 'right', fill: 'center', justify: 'justify' }
            styles.push(`text-align: ${alignMap[cell.alignment.horizontal] || 'center'}`)
        }
        if (cell.alignment.vertical) {
            const vAlignMap = { top: 'top', middle: 'middle', bottom: 'bottom' }
            styles.push(`vertical-align: ${vAlignMap[cell.alignment.vertical] || 'middle'}`)
        }
        if (cell.alignment.wrapText) {
            styles.push('white-space: normal')
            styles.push('word-break: break-all')
        }
    }
    
    if (cell.fill?.type === 'pattern' && cell.fill.pattern === 'solid') {
        const fgColor = cell.fill.fgColor
        if (fgColor?.argb && fgColor.argb !== 'FFFFFFFF' && fgColor.argb !== '00000000') {
            styles.push(`background-color: #${fgColor.argb.substring(2)}`)
        }
    }
    
    // 边框处理 - 优先使用Excel中定义的边框
    const border = cell.border || cell.style?.border
    const borderStyleMap = { thin: '1px solid #000', medium: '2px solid #000', thick: '3px solid #000' }
    
    let hasTop = false, hasBottom = false, hasLeft = false, hasRight = false
    
    if (border) {
        if (border.top?.style) { styles.push(`border-top: ${borderStyleMap[border.top.style] || '1px solid #000'}`); hasTop = true }
        if (border.bottom?.style) { styles.push(`border-bottom: ${borderStyleMap[border.bottom.style] || '1px solid #000'}`); hasBottom = true }
        if (border.left?.style) { styles.push(`border-left: ${borderStyleMap[border.left.style] || '1px solid #000'}`); hasLeft = true }
        if (border.right?.style) { styles.push(`border-right: ${borderStyleMap[border.right.style] || '1px solid #000'}`); hasRight = true }
    }
    
    // 对于主表格区域，自动补充缺失的边框
    // 包括：数据表格区域（第7-25行）和签名区域（第26-27行）
    const isInMainTableArea = rowNumber >= 7 && rowNumber <= 25 && colNumber >= 1 && colNumber <= 22
    const isInSignatureArea = rowNumber >= 26 && rowNumber <= 27 && colNumber >= 1 && colNumber <= 22
    
    if (isInMainTableArea || isInSignatureArea) {
        if (!hasTop) styles.push('border-top: 1px solid #000')
        if (!hasBottom) styles.push('border-bottom: 1px solid #000')
        if (!hasLeft) styles.push('border-left: 1px solid #000')
        if (!hasRight) styles.push('border-right: 1px solid #000')
    }
    
    // 对于第22列（V列，结果判定列），确保有右边框
    if (colNumber === 22 && rowNumber >= 4 && rowNumber <= 27 && !hasRight) {
        styles.push('border-right: 1px solid #000')
    }
    
    return styles.join('; ')
}

function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function calculateSampleSize(lotSize) {
    if (!lotSize || lotSize <= 1) return ''
    if (lotSize <= 8) return 2
    if (lotSize <= 15) return 3
    if (lotSize <= 25) return 5
    if (lotSize <= 50) return 8
    if (lotSize <= 90) return 13
    if (lotSize <= 150) return 20
    if (lotSize <= 280) return 32
    if (lotSize <= 500) return 50
    if (lotSize <= 1200) return 80
    if (lotSize <= 3200) return 125
    if (lotSize <= 10000) return 200
    if (lotSize <= 35000) return 315
    if (lotSize <= 150000) return 500
    if (lotSize <= 500000) return 800
    return 1250
}

function applyMappingFill(workbook, mapping, ctx) {
    if (!workbook || !mapping) return
    
    const sheetIndex = mapping.table?.sheetIndex || 0
    const worksheet = workbook.worksheets[sheetIndex]
    if (!worksheet) return
    
    if (mapping.fields?.length) {
        mapping.fields.forEach(field => {
            if (!field.cell) return
            const value = ctx[field.name] ?? ctx[field.label]
            if (value != null && value !== '') {
                try {
                    const cell = worksheet.getCell(field.cell)
                    if (cell.formula) cell.formula = undefined
                    cell.value = value
                } catch (e) { /* ignore */ }
            }
        })
    }
    
    if (mapping.placeholders?.length) {
        mapping.placeholders.forEach(ph => {
            if (!ph.cell) return
            const value = ctx[ph.name]
            if (value != null && value !== '') {
                try {
                    const cell = worksheet.getCell(ph.cell)
                    if (cell.formula) cell.formula = undefined
                    cell.value = value
                } catch (e) { /* ignore */ }
            }
        })
    }
    
    const tableData = ctx.tableData
    if (mapping.table && tableData?.length) {
        const { startRow, columns } = mapping.table
        if (!startRow || !columns?.length) return
        
        tableData.forEach((rowData, rowIndex) => {
            const excelRowNum = startRow + rowIndex
            columns.forEach(col => {
                const fieldName = col.name || col.header
                if (!fieldName) return
                
                let value = rowData[fieldName]
                if (value === undefined) {
                    const altKeys = {
                        'CProductID': ['客户料号', 'cProductId'],
                        'Product': ['产品名称', 'product'],
                        'Scale': ['规格', '规格尺寸', 'scale'],
                        'Count': ['出货数量', '数量', 'count', 'pCount'],
                        'MeasuredSize': ['实测尺寸', 'measuredSize']
                    }
                    for (const alt of (altKeys[fieldName] || [])) {
                        if (rowData[alt] !== undefined) { value = rowData[alt]; break }
                    }
                }
                
                if (value == null) return
                
                const targetCol = col.merge ? col.merge.startCol : col.col
                if (!targetCol) return
                
                try {
                    const cell = worksheet.getCell(excelRowNum, targetCol)
                    if (cell.formula) cell.formula = undefined
                    cell.value = value
                } catch (e) { /* ignore */ }
            })
        })
    }
}

function generatePrintHtml(worksheet, ctx, columnWidths = null, tableStartRow = 10, logoUrl = null) {
    const mergedCells = new Map()
    const skipCells = new Set()
    const merges = worksheet.model?.merges || []
    let maxCol = 0
    let maxRow = 0
    
    // 解析合并单元格
    merges.forEach(mergeRange => {
        const match = mergeRange.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
        if (match) {
            const startCol = colLetterToNumber(match[1])
            const startRow = parseInt(match[2])
            const endCol = colLetterToNumber(match[3])
            const endRow = parseInt(match[4])
            maxCol = Math.max(maxCol, endCol)
            maxRow = Math.max(maxRow, endRow)
            mergedCells.set(`${startRow}-${startCol}`, { rowspan: endRow - startRow + 1, colspan: endCol - startCol + 1 })
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    if (r !== startRow || c !== startCol) skipCells.add(`${r}-${c}`)
                }
            }
        }
    })
    
    // 扫描工作表确定实际使用的行列范围
    const rowCount = Math.min(worksheet.rowCount || 30, 50)
    for (let rowNumber = 1; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber)
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            if (cell.value != null && cell.value !== '') {
                maxCol = Math.max(maxCol, colNumber)
                maxRow = Math.max(maxRow, rowNumber)
            }
        })
    }
    
    // 确定最终的列数
    const colCount = columnWidths ? columnWidths.length : Math.max(1, Math.min(maxCol, worksheet.columnCount || 26))
    
    // Excel列宽单位转像素的系数
    // A4横向可打印宽度约280mm ≈ 1058px @96dpi
    // A08模板总Excel宽度约126单位，系数12 → 约1512px
    const COL_WIDTH_MULTIPLIER = 12
    
    // 计算列宽
    const colWidths = []
    for (let i = 1; i <= colCount; i++) {
        let width
        if (columnWidths && columnWidths[i - 1] !== undefined) {
            width = columnWidths[i - 1]
        } else {
            const col = worksheet.getColumn(i)
            width = col.width || 8.43 // Excel默认列宽
        }
        colWidths.push(Math.round(width * COL_WIDTH_MULTIPLIER))
    }
    
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0)
    console.log('columnWidths配置:', columnWidths)
    console.log('列宽(px):', colWidths)
    console.log('表格总宽度:', totalWidth, 'px')
    
    // 构建行数据
    const rows = []
    // 强制限制为28行（A08模板实际使用的行数）
    const actualRowCount = 28
    console.log('渲染行数:', actualRowCount)
    
    // 行高：Excel行高单位是点(pt)，减小系数使行高更紧凑
    const ROW_HEIGHT_MULTIPLIER = 1.2
    
    for (let rowNumber = 1; rowNumber <= actualRowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber)
        const cells = []
        
        // 行高：Excel默认行高约15点
        let excelHeight = row.height || 15
        // 限制最大行高为40像素，避免某些行过高
        const rowHeight = Math.min(Math.max(Math.round(excelHeight * ROW_HEIGHT_MULTIPLIER), 18), 40)
        
        let colIndex = 1
        while (colIndex <= colCount) {
            // 检查是否是被合并单元格覆盖的位置
            if (skipCells.has(`${rowNumber}-${colIndex}`)) {
                colIndex++
                continue
            }
            
            const cell = row.getCell(colIndex)
            let value = cell.value
            
            // 处理各种值类型
            if (value && typeof value === 'object') {
                if (value.richText) value = value.richText.map(rt => rt.text).join('')
                else if (value.text !== undefined) value = value.text
                else if (value.result !== undefined) value = value.result
                else if (value.formula !== undefined) {
                    // 公式单元格 - 尝试获取计算结果
                    value = ''
                } else value = ''
            }
            
            // 特殊处理：抽检数量列（根据A08模板，抽检数量在第6列F列，出货数量在第5列E列）
            // 数据行从tableStartRow开始
            if (rowNumber >= tableStartRow && rowNumber < tableStartRow + 15) {
                // 检查是否是抽检数量列（第6列）且值为空
                if (colIndex === 6 && (value === '' || value === null || value === undefined || value === 0)) {
                    let qty = row.getCell(5).value // E列：出货数量
                    if (qty && typeof qty === 'object') qty = qty.result || qty.text || qty
                    const numQty = parseInt(qty) || 0
                    if (numQty > 0) {
                        value = calculateSampleSize(numQty)
                        console.log(`行${rowNumber} 抽检数量计算: 出货数量=${numQty}, 抽检数量=${value}`)
                    }
                }
                // 调试：输出前几行的列值
                if (rowNumber === tableStartRow && colIndex <= 8) {
                    console.log(`行${rowNumber} 列${colIndex}: 值=${JSON.stringify(cell.value)}`)
                }
            }
            
            let style = getCellStyle(cell, rowNumber, colIndex, colCount, tableStartRow)
            const mergeInfo = mergedCells.get(`${rowNumber}-${colIndex}`)
            const colspan = mergeInfo?.colspan || 1
            const rowspan = mergeInfo?.rowspan || 1
            
            cells.push({ 
                value: value ?? '', 
                style, 
                colspan,
                rowspan
            })
            
            // 移动到下一列（跳过被colspan占用的列）
            colIndex += colspan
        }
        rows.push({ cells, height: rowHeight, rowNumber })
    }
    
    // 生成HTML表格 - 使用固定宽度
    let tableHtml = `<table style="width: ${totalWidth}px;"><colgroup>`
    colWidths.forEach(w => tableHtml += `<col style="width: ${w}px;">`)
    tableHtml += '</colgroup>'
    
    rows.forEach((row, rowIdx) => {
        tableHtml += `<tr style="height: ${row.height}px;">`
        let colPos = 0
        row.cells.forEach((cell, cellIdx) => {
            const attrs = []
            if (cell.colspan > 1) attrs.push(`colspan="${cell.colspan}"`)
            if (cell.rowspan > 1) attrs.push(`rowspan="${cell.rowspan}"`)
            
            // 计算单元格宽度（合并多列时累加宽度）
            let cellWidth = 0
            for (let i = 0; i < cell.colspan && (colPos + i) < colWidths.length; i++) {
                cellWidth += colWidths[colPos + i]
            }
            
            // 添加宽度到style
            let cellStyle = cell.style
            if (cellWidth > 0) {
                cellStyle = cellStyle ? `width: ${cellWidth}px; ${cellStyle}` : `width: ${cellWidth}px`
            }
            
            const safeStyle = cellStyle.replace(/"/g, '&quot;')
            attrs.push(`style="${safeStyle}"`)
            
            // 在第1行第1个单元格插入LOGO
            let cellContent = escapeHtml(String(cell.value))
            if (rowIdx === 0 && cellIdx === 0 && logoUrl) {
                cellContent = `<img src="${logoUrl}" style="max-height: 60px; max-width: 150px; object-fit: contain;" />`
            }
            
            tableHtml += `<td ${attrs.join(' ')}>${cellContent}</td>`
            colPos += cell.colspan
        })
        tableHtml += '</tr>'
    })
    tableHtml += '</table>'
    
    // A4横向: 297mm x 210mm
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>出货检验报告</title>
<style>
@page { size: A4 landscape; margin: 8mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; }
body { 
    font-family: SimSun, Microsoft YaHei, sans-serif; 
    font-size: 10pt; 
    margin: 0; 
    padding: 5mm; 
    line-height: 1.2; 
    position: relative;
}
table { 
    border-collapse: collapse; 
    table-layout: fixed; 
}
td { 
    padding: 2px 3px; 
    word-wrap: break-word; 
    overflow: hidden; 
    vertical-align: middle; 
    text-align: center; 
    font-size: 10pt;
}
@media print { 
    @page { size: A4 landscape; margin: 8mm; }
    body { margin: 0; padding: 5mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
    table { page-break-inside: avoid; } 
}
</style></head><body>${tableHtml}</body></html>`
}

// =====================================================
// 主逻辑
// =====================================================

onMounted(async () => {
    const id = route.params.id
    if (!id) { loading.value = false; errorMessage.value = '缺少报告ID'; return }
    
    try {
        const reportRes = await request({ url: `/shipment-report/${id}`, method: 'get' })
        const reportData = reportRes.data || reportRes
        report.value = reportData
        
        let inspectionData = {}
        let products = []
        
        if (reportData.InspectionData) {
            inspectionData = typeof reportData.InspectionData === 'string' ? JSON.parse(reportData.InspectionData) : reportData.InspectionData
        }
        if (reportData.ProductInfo) {
            products = typeof reportData.ProductInfo === 'string' ? JSON.parse(reportData.ProductInfo) : reportData.ProductInfo
        }
        
        const customerId = reportData.CustomerID || products[0]?.customerId || ''
        console.log('客户ID:', customerId)
        
        const templatesRes = await request({ url: '/shipment-report/templates', method: 'get' })
        const templates = templatesRes.data || templatesRes || []
        const matchedTemplate = templates.find(t => t.customerId === customerId && t.enabled)
        
        if (!matchedTemplate) throw new Error(`未找到客户 ${customerId} 的可用模板`)
        
        const templateBuffer = await request({ url: `/shipment-report/templates/${matchedTemplate.id}/download`, method: 'get', responseType: 'arraybuffer' })
        
        let mapping = null
        try { const mappingRes = await request({ url: `/shipment-report/templates/${matchedTemplate.id}/mapping`, method: 'get' }); mapping = mappingRes?.data ?? mappingRes } catch (e) { /* ignore */ }
        
        // 获取客户处理器配置（包含columnWidths）- A08/A84客户的23列配置
        const customerHandlers = {
            'A08': { columnWidths: [4.4, 6.9, 6.9, 5.5, 7.7, 8.9, 5.5, 8.6, 4.4, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 12, 12, 8.9, 1.7] },
            'A84': { columnWidths: [4.4, 6.9, 6.9, 5.5, 7.7, 8.9, 5.5, 8.6, 4.4, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 12, 12, 8.9, 1.7] }
        }
        const customerHandler = customerHandlers[customerId]
        console.log('客户处理器:', customerHandler ? '找到' : '未找到')
        
        // 列宽来源优先级：1.映射配置  2.客户处理器  3.Excel读取
        let columnWidths = null
        if (mapping?.layout?.columnWidths?.length > 0) {
            columnWidths = mapping.layout.columnWidths
            console.log('使用映射配置列宽:', columnWidths.length, '列')
        } else if (customerHandler?.columnWidths?.length > 0) {
            columnWidths = customerHandler.columnWidths
            console.log('使用客户处理器列宽:', columnWidths.length, '列', columnWidths)
        } else {
            console.log('未找到列宽配置，将从Excel读取')
        }
        
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(templateBuffer)
        
        const tableData = inspectionData.tableData || []
        if (!tableData.length && inspectionData.products) {
            for (const key in inspectionData.products) {
                const pd = inspectionData.products[key]
                tableData.push({
                    序号: tableData.length + 1, 客户料号: pd.productInfo?.cProductId || key, 产品名称: pd.productInfo?.product || '',
                    规格尺寸: pd.productInfo?.scale || '', 出货数量: pd.productInfo?.count || 0, 抽检数量: pd.productInfo?.sampleCount || 0,
                    实测尺寸: pd.measuredSize || '', 外观: pd.firstPieceCheck?.appearance || 'OK', 颜色: pd.firstPieceCheck?.color || 'OK',
                    图文: pd.firstPieceCheck?.graphics || 'OK', 字体: pd.firstPieceCheck?.font || 'OK', 啤切线: pd.firstPieceCheck?.dieLine || 'OK',
                    物料编号: pd.workOrderCheck?.materialNum || 'OK', 模切方式: pd.workOrderCheck?.dieCutStyle || 'OK',
                    包装方式: pd.workOrderCheck?.packingStyle || 'OK', 材质: pd.drawingCheck?.material || 'OK',
                    印刷内容: pd.drawingCheck?.printContent || 'OK', 结果判定: pd.result || '合格'
                })
            }
        }
        
        const ctx = {
            ReportNo: reportData.ReportNo, 报告编号: reportData.ReportNo,
            ReportDate: reportData.ReportDate ? new Date(reportData.ReportDate).toISOString().slice(0, 10) : '',
            日期: reportData.ReportDate ? new Date(reportData.ReportDate).toISOString().slice(0, 10) : '',
            检验日期: reportData.ReportDate ? new Date(reportData.ReportDate).toISOString().slice(0, 10) : '',
            CustomerID: customerId, 客户编码: customerId, PNum: reportData.PNum || '', 工单号: reportData.PNum || '',
            OrderNum: reportData.OrderNum || '', 订单号: reportData.OrderNum || '', CPO: reportData.CPO || '',
            Inspector: inspectionData.reportInfo?.inspector || reportData.CreatorName || '',
            检验员: inspectionData.reportInfo?.inspector || reportData.CreatorName || '',
            检验人员: inspectionData.reportInfo?.inspector || reportData.CreatorName || '', tableData
        }
        
        if (mapping) applyMappingFill(workbook, mapping, ctx)
        
        // 获取公司LOGO
        let logoUrl = null
        try {
            const configRes = await request({ url: '/config/site-config', method: 'get' })
            const siteConfig = configRes?.data || configRes
            if (siteConfig?.logoBase64Img) {
                logoUrl = siteConfig.logoBase64Img
                console.log('已加载公司LOGO')
            }
        } catch (e) {
            console.warn('加载LOGO失败:', e)
        }
        
        const worksheet = workbook.worksheets[mapping?.table?.sheetIndex || 0]
        const tableStartRow = mapping?.table?.startRow || 10
        htmlContent.value = generatePrintHtml(worksheet, ctx, columnWidths, tableStartRow, logoUrl)
        
        const sealsRes = await getElectronicSeals({ forPrint: true })
        availableSeals.value = Array.isArray(sealsRes) ? sealsRes : (sealsRes?.data || sealsRes?.recordset || [])
        
        const defaultSeal = availableSeals.value.find(s => s.SealName === '品质部门章-腾佳')
        selectedSealId.value = defaultSeal?.ID || availableSeals.value[0]?.ID || null
        
    } catch (e) {
        console.error('加载报告失败:', e)
        errorMessage.value = e.message || '加载失败'
        ElMessage.error('加载报告失败：' + (e.message || ''))
    } finally {
        loading.value = false
    }
})

const onIframeLoad = () => {
    // 监听iframe内的印章位置变化消息
    window.addEventListener('message', handleSealMessage)
    
    // 自动调整iframe大小以适应内容
    setTimeout(() => {
        if (reportIframe.value) {
            try {
                const iframeDoc = reportIframe.value.contentDocument || reportIframe.value.contentWindow.document
                const body = iframeDoc.body
                const table = iframeDoc.querySelector('table')
                if (table) {
                    // 获取表格实际尺寸
                    const tableWidth = table.offsetWidth + 40 // 加上padding
                    const tableHeight = table.offsetHeight + 40
                    console.log('表格实际尺寸:', tableWidth, 'x', tableHeight)
                    
                    // 设置iframe尺寸
                    reportIframe.value.style.width = tableWidth + 'px'
                    reportIframe.value.style.height = tableHeight + 'px'
                }
            } catch (e) {
                console.warn('无法调整iframe尺寸:', e)
            }
        }
    }, 100)
}

// 处理iframe发来的印章位置消息
const handleSealMessage = (event) => {
    if (event.data && event.data.type === 'seal-position') {
        // 只更新打印用位置，不更新sealPosition（避免触发htmlContentWithSeal重新计算）
        sealPositionForPrint.value = { x: event.data.x, y: event.data.y }
    }
}

const handleSealChange = (val) => { 
    if (val && !sealPosition.value.x) {
        sealPosition.value = { x: 900, y: 600 } // 默认位置在右下角
    }
}
const updateSealPosition = (pos) => { sealPosition.value = pos }
const removeSeal = () => { selectedSealId.value = null }
const handleClose = () => { window.close() }

const handlePrint = () => {
    // 打印时不需要再注入印章，因为印章已经在HTML中
    // 只需要确保使用最新的位置
    if (reportIframe.value && selectedSealId.value && sealImageUrl.value) {
        const iframeDoc = reportIframe.value.contentDocument || reportIframe.value.contentWindow.document
        const seal = iframeDoc.getElementById('seal-container')
        if (seal) {
            // 印章已经在正确位置，不需要额外操作
            console.log('打印印章位置:', seal.style.left, seal.style.top)
        }
    }
    
    // 执行打印
    if (reportIframe.value) {
        reportIframe.value.contentWindow.print()
    } else {
        window.print()
    }
}
</script>

<style scoped>
.shipment-print-page { height: 100vh; width: 100vw; overflow: hidden; position: relative; background-color: #525659; display: flex; flex-direction: column; }
.print-toolbar { background: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1); z-index: 2000; flex-shrink: 0; }
.toolbar-left { display: flex; align-items: center; gap: 15px; }
.toolbar-right { display: flex; gap: 10px; }
.label { font-size: 14px; color: #606266; }
.seal-size-control { display: flex; align-items: center; gap: 5px; margin-left: 10px; font-size: 14px; color: #606266; }
.size-label { margin-right: 5px; }
.size-sep { margin: 0 5px; color: #909399; }
.size-unit { margin-left: 5px; color: #909399; }
.preview-container { flex: 1; overflow: auto; padding: 20px; display: flex; justify-content: center; align-items: flex-start; }
.report-preview { position: relative; background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.15); overflow: visible; }
.report-iframe { border: none; min-width: 800px; min-height: 500px; }
.error-msg { flex: 1; display: flex; align-items: center; justify-content: center; background: white; }
.seal-option-item { height: 50px; line-height: 50px; }
.seal-option-content { display: flex; align-items: center; width: 100%; }
.seal-thumb { width: 40px; height: 40px; object-fit: contain; margin-right: 10px; background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 4px; }
.seal-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media print { .shipment-print-page { background: white; height: auto; overflow: visible; } .print-toolbar, .no-print { display: none !important; } .preview-container { padding: 0; overflow: visible; } .report-preview { box-shadow: none; } }
@page { size: A4 landscape; margin: 5mm; }
</style>
<style>.seal-select-popper .el-select-dropdown__item { height: auto !important; padding: 5px 20px; }</style>
