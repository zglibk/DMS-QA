const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'frontend/src/views/admin/supplier/QualifiedSuppliers.vue',
  'frontend/src/views/admin/work-plan/ProgressTracking.vue',
  'frontend/src/views/admin/supplier/AuditReports.vue',
  'frontend/src/views/admin/supplier/AnnualAuditPlan.vue',
  'frontend/src/views/admin/supplier/QualityAssessment.vue',
  'frontend/src/views/admin/MaterialPriceList.vue',
  'frontend/src/views/admin/ReworkManagement.vue',
  'frontend/src/views/admin/RoleManagement.vue',
  'frontend/src/views/admin/work-plan/PlanManagement.vue',
  'frontend/src/views/admin/supplier/SupplierComplaints.vue',
  'frontend/src/views/admin/supplier/SupplierAudit.vue',
  'frontend/src/views/admin/MenuManagement.vue',
  'frontend/src/views/admin/supplier/MaterialSuppliers.vue',
  'frontend/src/views/admin/supplier/Performance.vue',
  'frontend/src/views/admin/sample/SampleApproval.vue',
  'frontend/src/views/admin/PositionManagement.vue',
  'frontend/src/views/admin/work-plan/PlanTemplates.vue',
  'frontend/src/views/admin/supplier/EquipmentSuppliers.vue',
  'frontend/src/views/quality/complaint/CustomerComplaint.vue',
  'frontend/src/views/admin/supplier/Contracts.vue',
  'frontend/src/views/admin/supplier/BasicInfo.vue',
  'frontend/src/views/ReworkAnalysis.vue',
  'frontend/src/views/ComplaintList.vue',
  'frontend/src/views/admin/supplier/InspectionReports.vue',
  'frontend/src/views/admin/PersonManagement.vue',
  'frontend/src/views/admin/work-plan/WorkLogs.vue'
];

/**
 * 修复单个文件的分页组件
 * @param {string} filePath - 文件路径
 */
function fixPaginationInFile(filePath) {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 修复 el-pagination 组件的属性绑定
  content = content.replace(
    /:page-size="([^"]+)"/g,
    'v-model:page-size="$1"'
  );
  
  content = content.replace(
    /:current-page="([^"]+)"/g,
    'v-model:current-page="$1"'
  );
  
  // 移除废弃的事件绑定
  if (content.includes('@size-change=') || content.includes('@current-change=')) {
    content = content.replace(/@size-change="[^"]+"\s*/g, '');
    content = content.replace(/@current-change="[^"]+"\s*/g, '');
    modified = true;
  }
  
  // 查找并替换事件处理函数
  const handleSizeChangePattern = /const\s+handleSizeChange\s*=\s*\([^)]*\)\s*=>\s*{[^}]*}/g;
  const handleCurrentChangePattern = /const\s+handleCurrentChange\s*=\s*\([^)]*\)\s*=>\s*{[^}]*}/g;
  const handleTableSizeChangePattern = /const\s+handleTableSizeChange\s*=\s*\([^)]*\)\s*=>\s*{[^}]*}/g;
  const handleTableCurrentChangePattern = /const\s+handleTableCurrentChange\s*=\s*\([^)]*\)\s*=>\s*{[^}]*}/g;
  
  if (handleSizeChangePattern.test(content) || handleCurrentChangePattern.test(content) ||
      handleTableSizeChangePattern.test(content) || handleTableCurrentChangePattern.test(content)) {
    
    // 移除旧的事件处理函数
    content = content.replace(handleSizeChangePattern, '');
    content = content.replace(handleCurrentChangePattern, '');
    content = content.replace(handleTableSizeChangePattern, '');
    content = content.replace(handleTableCurrentChangePattern, '');
    
    // 查找分页相关的响应式变量
    const pagePattern = /const\s+(\w*[Pp]age\w*)\s*=\s*ref\(/g;
    const pageSizePattern = /const\s+(\w*[Pp]ageSize\w*)\s*=\s*ref\(/g;
    
    let pageVar = 'page';
    let pageSizeVar = 'pageSize';
    let fetchFunction = 'fetchData';
    
    // 尝试找到实际的变量名
    const pageMatch = content.match(pagePattern);
    const pageSizeMatch = content.match(pageSizePattern);
    
    if (pageMatch && pageMatch[0]) {
      pageVar = pageMatch[0].match(/const\s+(\w+)/)[1];
    }
    
    if (pageSizeMatch && pageSizeMatch[0]) {
      pageSizeVar = pageSizeMatch[0].match(/const\s+(\w+)/)[1];
    }
    
    // 尝试找到数据获取函数
    if (content.includes('fetchUsers')) fetchFunction = 'fetchUsers';
    else if (content.includes('fetchTableData')) fetchFunction = 'fetchTableData';
    else if (content.includes('loadData')) fetchFunction = 'loadData';
    else if (content.includes('getData')) fetchFunction = 'getData';
    else if (content.includes('fetch')) {
      const fetchMatch = content.match(/const\s+(fetch\w+)\s*=/g);
      if (fetchMatch && fetchMatch[0]) {
        fetchFunction = fetchMatch[0].match(/const\s+(\w+)/)[1];
      }
    }
    
    // 添加新的 watch 监听器
    const watchCode = `
// 监听分页变化
watch(
  () => [${pageVar}.value, ${pageSizeVar}.value],
  ([newPage, newSize], [oldPage, oldSize]) => {
    // 如果页面大小改变，重置到第一页
    if (newSize !== oldSize) {
      ${pageVar}.value = 1
    }
    ${fetchFunction}()
  }
)
`;
    
    // 在适当位置插入 watch 代码
    const insertPosition = content.lastIndexOf('</script>');
    if (insertPosition !== -1) {
      content = content.slice(0, insertPosition) + watchCode + content.slice(insertPosition);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`已修复: ${filePath}`);
  } else {
    console.log(`无需修复: ${filePath}`);
  }
}

// 批量修复所有文件
console.log('开始批量修复分页组件...');
filesToFix.forEach(fixPaginationInFile);
console.log('批量修复完成!');