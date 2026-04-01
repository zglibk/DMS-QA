const fs = require('fs')
const { parse, compileScript } = require('@vue/compiler-sfc')
const file = 'E:/WebProject/DMS-QA/frontend/src/views/ShipmentReport.vue'
const src = fs.readFileSync(file, 'utf8')
const parsed = parse(src, { filename: file })
console.log('parse_errors', parsed.errors.length)
if (parsed.errors.length) console.log(parsed.errors)
try {
  compileScript(parsed.descriptor, { id: 'test' })
  console.log('compileScript ok')
} catch (e) {
  console.log('compileScript error', e.message)
  if (e.loc) console.log('loc', e.loc)
}
