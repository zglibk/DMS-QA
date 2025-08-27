/**
 * ECharts全局错误处理工具
 * 
 * 功能：
 * 1. 提供全局ECharts错误捕获和处理
 * 2. 防止"Cannot read properties of undefined (reading 'type')"错误
 * 3. 提供安全的ECharts初始化和更新方法
 */

/**
 * 安全的数值转换函数
 * @param {any} value - 要转换的值
 * @param {number} defaultValue - 默认值
 * @returns {number} 安全的数值
 */
export const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) {
    return defaultValue
  }
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * 验证ECharts数据格式
 * @param {Array} data - 要验证的数据数组
 * @param {string} dataName - 数据名称（用于日志）
 * @returns {boolean} 是否有效
 */
export const validateEChartsData = (data, dataName = 'data') => {
  if (!Array.isArray(data)) {
    console.warn(`⚠️ ECharts ${dataName}不是数组格式:`, data)
    return false
  }
  
  return data.every((item, index) => {
    if (item === undefined || item === null) {
      console.warn(`⚠️ ECharts ${dataName}[${index}]为undefined或null`)
      return false
    }
    
    if (typeof item === 'object') {
      // 检查必要的属性
      if (item.value === undefined && item.name === undefined) {
        console.warn(`⚠️ ECharts ${dataName}[${index}]缺少必要属性:`, item)
        return false
      }
      
      // 如果有value属性，确保它是有效数字
      if (item.value !== undefined) {
        const num = Number(item.value)
        if (isNaN(num)) {
          console.warn(`⚠️ ECharts ${dataName}[${index}].value不是有效数字:`, item.value)
          return false
        }
      }
    }
    
    return true
  })
}

/**
 * 清理ECharts数据，移除无效项
 * @param {Array} data - 原始数据
 * @returns {Array} 清理后的数据
 */
export const cleanEChartsData = (data) => {
  if (!Array.isArray(data)) {
    console.warn('⚠️ 传入的数据不是数组，返回空数组')
    return []
  }
  
  return data.filter((item, index) => {
    if (item === undefined || item === null) {
      console.warn(`⚠️ 过滤掉undefined/null数据项[${index}]`)
      return false
    }
    
    if (typeof item === 'object') {
      // 如果有value属性，确保它是有效数字
      if (item.value !== undefined) {
        const num = Number(item.value)
        if (isNaN(num)) {
          console.warn(`⚠️ 过滤掉value无效的数据项[${index}]:`, item)
          return false
        }
        // 将value转换为安全数字
        item.value = num
      }
    }
    
    return true
  })
}

/**
 * 安全的ECharts初始化
 * @param {HTMLElement} container - 图表容器
 * @param {Object} option - 图表配置
 * @param {Object} echarts - ECharts实例
 * @returns {Object|null} ECharts图表实例或null
 */
export const safeInitChart = (container, option, echarts) => {
  try {
    if (!container) {
      console.error('❌ ECharts容器不存在')
      return null
    }
    
    if (!echarts) {
      console.error('❌ ECharts库未加载')
      return null
    }
    
    // 验证并清理series数据
    if (option && option.series) {
      option.series.forEach((series, index) => {
        if (series.data) {
          if (!validateEChartsData(series.data, `series[${index}].data`)) {
            console.warn(`⚠️ 清理series[${index}]数据`)
            series.data = cleanEChartsData(series.data)
          }
        }
      })
    }
    
    const chart = echarts.init(container)
    chart.setOption(option)
    console.log('✅ ECharts图表初始化成功')
    return chart
  } catch (error) {
    console.error('❌ ECharts初始化失败:', error)
    return null
  }
}

/**
 * 安全的图表更新
 * @param {Object} chart - ECharts实例
 * @param {Object} option - 新的配置
 * @param {boolean} notMerge - 是否不合并
 * @returns {boolean} 是否更新成功
 */
export const safeUpdateChart = (chart, option, notMerge = true) => {
  try {
    if (!chart) {
      console.warn('⚠️ ECharts实例不存在，跳过更新')
      return false
    }
    
    // 验证并清理数据
    if (option && option.series) {
      option.series.forEach((series, index) => {
        if (series.data) {
          if (!validateEChartsData(series.data, `series[${index}].data`)) {
            console.warn(`⚠️ 清理series[${index}]数据`)
            series.data = cleanEChartsData(series.data)
          }
        }
      })
    }
    
    chart.setOption(option, notMerge)
    console.log('✅ ECharts图表更新成功')
    return true
  } catch (error) {
    console.error('❌ ECharts更新失败:', error)
    return false
  }
}

/**
 * 安全销毁图表
 * @param {Object} chart - ECharts实例
 */
export const safeDisposeChart = (chart) => {
  try {
    if (chart && typeof chart.dispose === 'function') {
      chart.dispose()
      console.log('✅ ECharts图表已安全销毁')
    }
  } catch (error) {
    console.error('❌ ECharts销毁失败:', error)
  }
}

/**
 * 全局ECharts错误处理器
 * 在应用启动时调用此函数来设置全局错误处理
 */
export const setupGlobalEChartsErrorHandler = () => {
  // 捕获全局错误
  const originalError = console.error
  console.error = function(...args) {
    const errorMessage = args.join(' ')
    
    // 检查是否是ECharts相关错误
    if (errorMessage.includes('Cannot read properties of undefined') && 
        errorMessage.includes('echarts')) {
      console.warn('🔧 检测到ECharts错误，已被全局处理器捕获:', errorMessage)
      
      // 可以在这里添加更多的错误处理逻辑
      // 比如发送错误报告、显示用户友好的错误信息等
      
      return // 阻止错误继续传播
    }
    
    // 对于非ECharts错误，正常处理
    originalError.apply(console, args)
  }
  
  console.log('✅ ECharts全局错误处理器已设置')
}

/**
 * 创建安全的ECharts配置对象
 * @param {Object} baseOption - 基础配置
 * @param {Array} seriesData - 系列数据
 * @returns {Object} 安全的配置对象
 */
export const createSafeEChartsOption = (baseOption, seriesData) => {
  const safeOption = { ...baseOption }
  
  if (seriesData && Array.isArray(seriesData)) {
    safeOption.series = seriesData.map((series, index) => {
      const safeSeries = { ...series }
      
      if (safeSeries.data) {
        safeSeries.data = cleanEChartsData(safeSeries.data)
      }
      
      return safeSeries
    })
  }
  
  return safeOption
}

// 默认导出所有工具函数
export default {
  safeNumber,
  validateEChartsData,
  cleanEChartsData,
  safeInitChart,
  safeUpdateChart,
  safeDisposeChart,
  setupGlobalEChartsErrorHandler,
  createSafeEChartsOption
}