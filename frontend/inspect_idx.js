const fs = require('fs')
const { parse } = require('@vue/compiler-sfc')
const file = 'E:/WebProject/DMS-QA/frontend/src/views/ShipmentReport.vue'
const src = fs.readFileSync(file, 'utf8')
const { descriptor } = parse(src, { filename: file })
const s = descriptor.scriptSetup.content
const idx = 114951
console.log('len', s.length)
console.log('around idx:\n' + s.slice(idx-300, idx+120))
const lines = s.split(/\r?\n/)
for (let i=3668;i<=3678;i++) console.log(i+':'+lines[i-1])
