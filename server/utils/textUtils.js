/**
 * 文本处理工具函数集合
 * 用于处理字符串计算、格式化等通用操作
 */

/**
 * 估算文本占用的行数
 * 用于Excel导出时自动计算行高
 * 
 * @param {string} text - 文本内容
 * @param {number} width - 列宽（单位：字符宽度，近似值）
 * @returns {number} - 估算的行数
 */
function estimateTextLines(text, width) {
  if (!text) return 1;
  const str = String(text);
  const lines = str.split('\n');
  let totalLines = 0;
  
  lines.forEach(line => {
    let lineWidth = 0;
    for (let i = 0; i < line.length; i++) {
      // 中文字符宽度约为1.7，英文字符约为1.0
      // 调整系数以获得更准确的行高估算
      lineWidth += line.charCodeAt(i) > 255 ? 1.7 : 1.0;
    }
    // 减去少量缓冲宽度 (width - 1)
    const effectiveWidth = Math.max(1, width - 1);
    totalLines += Math.max(1, Math.ceil(lineWidth / effectiveWidth));
  });
  
  return totalLines;
}

module.exports = {
  estimateTextLines
};
