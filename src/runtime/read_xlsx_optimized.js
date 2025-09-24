const fs = require('fs');
const xlsx = require('node-xlsx');

/**
 * 将 xlsx 数据转换为 markdown 格式
 * @param {Array} list - xlsx 文件的数据
 * @returns {string} markdown 格式的数据
 */
const xlsxToMarkdown = (list) => {
  if (!list || list.length === 0) return '';
  // 1. 获取表头
  const headers = list[0];
  // 2. 生成分隔符
  const separator = headers.map(() => '---').join('|');
  // 3. 生成表格头部
  let markdown = `|${headers.join('|')}|\n|${separator}|\n`;
  // 4. 生成表格行
  for (let i = 1; i < list.length; i++) {
    markdown += `|${list[i].join('|')}|\n`;
  }
  return markdown;
};

/**
 * 优化的 XLSX 文件读取器
 * 支持大文件处理，当内容超过指定字符数或行数时返回摘要
 */
class OptimizedXlsxReader {
  constructor(maxChars = 10000, maxRows = 30) {
    this.maxChars = maxChars;
    this.maxRows = maxRows;
  }

  /**
   * 过滤空行数据
   * @param {Array} data - 原始数据数组
   * @returns {Array} 过滤后的数据数组
   */
  filterEmptyRows(data) {
    if (!data || data.length === 0) return [];

    const filteredData = [];
    for (const row of data) {
      // 检查行是否为空（所有单元格都为空、null、undefined或空字符串）
      const hasContent = row.some(cell => {
        return cell !== null && cell !== undefined && cell !== '';
      });

      if (hasContent) {
        filteredData.push(row);
      }
    }

    return filteredData;
  }

  /**
   * 读取 XLSX 文件
   * @param {string} filePath - 文件路径
   * @returns {Object} 包含内容、是否截断、统计信息的对象
   */
  readXlsxFile(filePath) {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      // 使用 node-xlsx 解析文件
      const sheets = xlsx.parse(filePath);

      const result = {
        content: '',
        isTruncated: false,
        totalSheets: sheets.length,
        totalRows: 0,
        dataStructure: {},
        customMessage: ''
      };

      let fullContent = '';
      let totalRowCount = 0;

      // 遍历所有工作表
      for (const sheet of sheets) {
        const { name, data } = sheet;

        // 过滤空行，获取实际有效数据
        const filteredData = this.filterEmptyRows(data);
        const actualRowCount = filteredData.length;
        totalRowCount += actualRowCount;

        // 分析数据结构（使用过滤后的数据）
        if (actualRowCount > 0) {
          result.dataStructure[name] = {
            rows: actualRowCount,
            columns: filteredData[0] ? filteredData[0].length : 0,
            headers: filteredData[0] || [],
            sampleData: filteredData.slice(0, 3) // 前3行作为样本
          };
        } else {
          // 如果没有有效数据，仍然记录结构信息
          result.dataStructure[name] = {
            rows: 0,
            columns: 0,
            headers: [],
            sampleData: []
          };
        }

        // 检查是否需要限制行数
        let processedData = filteredData;
        if (actualRowCount > this.maxRows) {
          // 如果数据行数超过限制，只取前maxRows行
          processedData = filteredData.slice(0, this.maxRows);
        }

        // 使用原有的 markdown 转换逻辑
        const markdown = xlsxToMarkdown(processedData);
        const markdownWithSheetName = `### Sheet: ${name}\n${markdown}`;
        fullContent += markdownWithSheetName + '\n\n';
      }

      result.totalRows = totalRowCount;

      // 检查是否需要截断（基于字符数或行数限制）
      const shouldTruncate = fullContent.length > this.maxChars || totalRowCount > this.maxRows;

      if (!shouldTruncate) {
        // 内容未超过限制，返回完整内容
        result.content = fullContent;
        result.isTruncated = false;
      } else {
        // 内容超过限制，返回摘要
        result.content = this.generateSummary(sheets, result.dataStructure);
        result.isTruncated = true;
        result.customMessage = this.getCustomMessage(result.totalSheets, result.totalRows);
      }

      return result;

    } catch (error) {
      throw new Error(`读取 XLSX 文件失败: ${error.message}`);
    }
  }

  /**
   * 生成数据摘要
   * @param {Array} sheets - 工作表数组
   * @param {Object} dataStructure - 数据结构信息
   * @returns {string} 摘要内容
   */
  generateSummary(sheets, dataStructure) {
    let summary = '=== XLSX 文件数据摘要 ===\n\n';

    // 添加文件基本信息和各工作表行数概览
    summary += `文件包含 ${sheets.length} 个工作表，各工作表数据行数如下：\n`;
    for (const sheet of sheets) {
      const { name } = sheet;
      const structure = dataStructure[name];
      if (structure) {
        summary += `- ${name}: ${structure.rows} 行\n`;
      }
    }
    summary += '\n';

    // 遍历每个工作表生成详细摘要
    for (const sheet of sheets) {
      const { name, data } = sheet;
      const structure = dataStructure[name];

      if (!structure) continue;

      summary += `--- 工作表: ${name} (${structure.rows} 行数据) ---\n`;
      summary += `列数: ${structure.columns}\n`;

      // 添加表头信息
      if (structure.headers && structure.headers.length > 0) {
        summary += `表头: `;
        for (const header of structure.headers) {
          if (header !== undefined && header !== null) {
            summary += `${header} | `;
          }
        }
        summary += '\n';
      }

      // 添加样本数据 (前3行)
      summary += `样本数据 (前3行):\n`;
      for (const sampleRow of structure.sampleData) {
        let rowContent = '';
        for (const cell of sampleRow) {
          if (cell !== undefined && cell !== null) {
            rowContent += `${cell} | `;
          } else {
            rowContent += ' | ';
          }
        }
        summary += rowContent + '\n';
      }
      summary += '\n';
    }

    return summary;
  }

  /**
   * 获取自定义提示消息
   * @param {number} totalSheets - 总工作表数
   * @param {number} totalRows - 总行数
   * @returns {string} 自定义消息
   */
  getCustomMessage(totalSheets, totalRows) {
    return `
数据量较大，已返回摘要信息。
- 总工作表数: ${totalSheets}
- 总数据行数: ${totalRows}

建议：
1. 根据表头信息确定数据字段含义
2. 基于上述数据结构编写代码进行数据处理
`.trim();
  }

  /**
   * 设置最大字符数限制
   * @param {number} maxChars - 最大字符数
   */
  setMaxChars(maxChars) {
    this.maxChars = maxChars;
  }

  /**
   * 设置最大行数限制
   * @param {number} maxRows - 最大行数
   */
  setMaxRows(maxRows) {
    this.maxRows = maxRows;
  }

  /**
   * 获取当前最大字符数限制
   * @returns {number} 最大字符数
   */
  getMaxChars() {
    return this.maxChars;
  }

  /**
   * 获取当前最大行数限制
   * @returns {number} 最大行数
   */
  getMaxRows() {
    return this.maxRows;
  }
}

/**
 * 便捷函数：读取 XLSX 文件
 * @param {string} filePath - 文件路径
 * @param {number} maxChars - 最大字符数限制，默认 10000
 * @param {number} maxRows - 最大行数限制，默认 30
 * @returns {Object} 读取结果
 */
function readXlsxOptimized(filePath, maxChars = 10000, maxRows = 30) {
  const reader = new OptimizedXlsxReader(maxChars, maxRows);
  return reader.readXlsxFile(filePath);
}

module.exports = {
  OptimizedXlsxReader,
  readXlsxOptimized,
  xlsxToMarkdown
};
