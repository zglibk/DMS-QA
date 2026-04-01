const fs = require('fs')
const { parse } = require('@vue/compiler-sfc')
const babel = require('@babel/parser')
const file = 'E:/WebProject/DMS-QA/frontend/src/views/ShipmentReport.vue'
const src = fs.readFileSync(file, 'utf8')
const { descriptor } = parse(src, { filename: file })
const s = descriptor.scriptSetup.content
const ast = babel.parse(s, { sourceType:'module', plugins:['jsx','typescript'], errorRecovery:true })
console.log('errors', ast.errors.length)
ast.errors.slice(0,5).forEach(e=>console.log(e.message,'loc',e.loc))
