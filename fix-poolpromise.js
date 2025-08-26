/**
 * 批量替换poolPromise引用的脚本
 */
const fs = require('fs');
const path = require('path');

// 要处理的文件路径
const filePath = path.join(__dirname, 'server', 'controllers', 'workPlanController.js');

// 读取文件内容
let content = fs.readFileSync(filePath, 'utf8');

// 替换所有的poolPromise引用
content = content.replace(/await poolPromise/g, 'await getConnection()');

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('已完成poolPromise引用的批量替换');
console.log('文件路径:', filePath);