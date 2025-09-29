/**
 * HTML 预览模板工具
 * 提供可复用的 HTML 模板生成功能
 */

// 基础预览样式（不包含交互样式）
export const PREVIEW_STYLES = `
  body {
    margin: 0;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #fff;
  }
  * {
    box-sizing: border-box;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1rem;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f2f2f2;
    font-weight: bold;
  }
  pre {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
  }
  code {
    background: #f5f5f5;
    padding: 2px 4px;
    border-radius: 2px;
    font-family: 'Monaco', 'Consolas', monospace;
  }
  blockquote {
    border-left: 4px solid #ddd;
    padding-left: 1rem;
    margin-left: 0;
    color: #666;
  }
`

/**
 * 检测是否为完整的HTML文档
 * @param {string} content - HTML内容
 * @returns {boolean}
 */
export const isCompleteHTML = (content) => {
  if (!content) return false;
  const trimmed = content.trim().toLowerCase();
  return trimmed.startsWith('<!doctype') ||
    trimmed.includes('<html') ||
    (trimmed.includes('<head') && trimmed.includes('<body'));
};

/**
 * 提取HTML文档的body内容
 * @param {string} html - 完整的HTML文档
 * @param {boolean} includeScripts - 是否保留script标签
 * @returns {string} body内容
 */
export const extractBodyContent = (html, includeScripts = true) => {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;

  // 如果不需要scripts，移除它们
  if (!includeScripts) {
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  return content;
};

/**
 * 提取HTML文档的head内容
 * @param {string} html - 完整的HTML文档
 * @returns {string} head内容
 */
export const extractHeadContent = (html) => {
  const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i);
  return headMatch ? headMatch[1] : '';
};

/**
 * 创建预览 HTML 文档
 * @param {string} content - HTML 内容
 * @param {Object} options - 选项
 * @param {string} options.customStyles - 自定义样式
 * @param {boolean} options.preserveHead - 是否保留原始head内容
 * @returns {string} 完整的 HTML 文档
 */
export const createPreviewHTML = (content, options = {}) => {
  const { customStyles = '', preserveHead = false } = options;

  // 检测是否为完整HTML
  if (isCompleteHTML(content)) {
    if (preserveHead) {
      // 保留原始HTML结构，只注入必要的样式
      const headContent = extractHeadContent(content);
      const bodyContent = extractBodyContent(content);

      // 解析HTML属性
      const htmlMatch = content.match(/<html([^>]*)>/i);
      const htmlAttrs = htmlMatch ? htmlMatch[1] : ' lang="zh-CN"';

      // 解析body属性
      const bodyMatch = content.match(/<body([^>]*)>/i);
      const bodyAttrs = bodyMatch ? bodyMatch[1] : '';

      // 检查head内容是否已经包含我们的样式
      const hasPreviewStyles = headContent.includes('/* 基础编辑样式 */');

      return [
        '<!DOCTYPE html>',
        `<html${htmlAttrs}>`,
        '<head>',
        headContent,
        !hasPreviewStyles ? `<style>${PREVIEW_STYLES}</style>` : '',
        customStyles ? `<style>${customStyles}</style>` : '',
        '</head>',
        `<body${bodyAttrs}>`,
        bodyContent,
        '</body>',
        '</html>'
      ].filter(Boolean).join('\n');
    } else {
      // 提取body内容和script标签
      const bodyContent = extractBodyContent(content, true);
      const headContent = extractHeadContent(content);

      // 如果有head内容，保留其中的依赖
      if (headContent) {
        // 提取重要的依赖（script和link标签）
        const dependencies = extractDependencies(headContent);
        return createStandardHTMLWithDeps(bodyContent, customStyles, dependencies);
      } else {
        return createStandardHTML(bodyContent, customStyles);
      }
    }
  } else {
    // HTML片段，使用标准模板
    return createStandardHTML(content, customStyles);
  }
};

/**
 * 创建标准HTML模板
 * @param {string} bodyContent - body内容
 * @param {string} customStyles - 自定义样式
 * @returns {string} 完整的HTML文档
 */
const createStandardHTML = (bodyContent, customStyles = '') => {
  const styles = [PREVIEW_STYLES, customStyles].filter(Boolean).join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>HTML Preview</title>',
    `<style>${styles}</style>`,
    '</head>',
    '<body>',
    bodyContent,
    '</body>',
    '</html>'
  ].join('\n');
};

/**
 * 创建静态预览 HTML（无交互）
 * @param {string} content - HTML 内容
 * @param {string} customStyles - 自定义样式
 * @returns {string} HTML 文档
 */
export const createStaticPreviewHTML = (content, customStyles = '') => {
  return createPreviewHTML(content, {
    customStyles,
    preserveHead: false
  });
};

/**
 * 创建保留原始结构的预览HTML
 * @param {string} content - HTML 内容
 * @param {string} customStyles - 自定义样式
 * @returns {string} HTML 文档
 */
export const createPreservingPreviewHTML = (content, customStyles = '') => {
  return createPreviewHTML(content, {
    customStyles,
    preserveHead: true
  });
};

/**
 * 提取HTML中的依赖（script和link标签）
 * @param {string} headContent - head内容
 * @returns {string} 依赖标签
 */
const extractDependencies = (headContent) => {
  const scripts = headContent.match(/<script[^>]*>.*?<\/script>/gis) || [];
  const links = headContent.match(/<link[^>]*>/gi) || [];
  const styles = headContent.match(/<style[^>]*>.*?<\/style>/gis) || [];
  // 保留所有的link, style和script标签
  return [...links, ...styles, ...scripts].join('\n');
};

/**
 * 创建带依赖的标准HTML模板
 * @param {string} bodyContent - body内容
 * @param {string} customStyles - 自定义样式
 * @param {string} dependencies - 依赖标签
 * @returns {string} 完整的HTML文档
 */
const createStandardHTMLWithDeps = (bodyContent, customStyles = '', dependencies = '') => {
  const styles = [PREVIEW_STYLES, customStyles].filter(Boolean).join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>HTML Preview</title>',
    dependencies, // 先加载依赖
    `<style>${styles}</style>`,
    '</head>',
    '<body>',
    bodyContent,
    '</body>',
    '</html>'
  ].filter(Boolean).join('\n');
};