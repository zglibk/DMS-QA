/**
 * ESLint 配置（Vue3）
 * 说明：
 * - 项目中使用了 Vue3 与 Element Plus，模板允许使用 v-model:arg 语法（多 v-model 绑定）。
 * - 该语法在 Vue2 中会被 eslint-plugin-vue 的规则 vue/no-v-model-argument 报错。
 * - 为消除 IDE 红色波浪线并保持 Vue3 的正确检查，这里切换到 Vue3 推荐规则，并关闭该规则。
 */

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
  ],
  rules: {
    // 关闭仅在 Vue2 有意义的限制，以支持 Vue3 的 v-model:arg 语法
    'vue/no-v-model-argument': 'off',
  },
};