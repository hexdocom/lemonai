/**
 * 内容清理工具
 * 负责清理HTML内容中的注入元素、样式和属性
 */

// 需要清理的元素ID列表
const INJECTED_IDS = [
  'iframe-injected-styles',
  'iframe-injected-script',
  'editing-tooltip'
];

// 需要清理的类名列表
const INJECTED_CLASSES = [
  'iframe-hover-element',
  'iframe-selected-element',
  'selected-element',
  'editing-element',
  'hover-element',
  'hovered-element'
];

// 需要清理的属性
const ATTRIBUTES_TO_CLEAN = {
  contenteditable: ['true', 'false'],
  tabindex: ['-1']
};

// 需要清理的内联样式
const INLINE_STYLES_TO_CLEAN = [
  'outline',
  'min-height',
  'cursor',
  'box-shadow',
  'transition'
];

/**
 * 清理HTML内容
 * @param {Document|Element} source - 要清理的源（document或element）
 * @param {Object} options - 清理选项
 * @returns {string} 清理后的HTML字符串
 */
export function cleanContent(source, options = {}) {
  const {
    removeScripts = true,
    removeStyles = true,
    removeEditableAttr = true,
    removeInjectedClasses = true,
    removeInlineStyles = true,
    customCleaners = []
  } = options;

  // 确定要处理的元素
  let element;
  if (source.nodeType === Node.DOCUMENT_NODE) {
    element = source.body.cloneNode(true);
  } else if (source.nodeType === Node.ELEMENT_NODE) {
    element = source.cloneNode(true);
  } else {
    throw new Error('Source must be a Document or Element');
  }

  // 执行清理步骤
  if (removeScripts) {
    cleanScripts(element);
  }

  if (removeStyles) {
    cleanStyles(element);
  }

  if (removeEditableAttr) {
    cleanEditableAttributes(element);
  }

  if (removeInjectedClasses) {
    cleanClasses(element);
  }

  if (removeInlineStyles) {
    cleanInlineStyles(element);
  }

  // 执行自定义清理器
  customCleaners.forEach(cleaner => {
    if (typeof cleaner === 'function') {
      cleaner(element);
    }
  });

  return element.innerHTML;
}

/**
 * 清理脚本元素
 */
function cleanScripts(element) {
  // 只移除我们注入的脚本，保留用户的脚本
  element.querySelectorAll('script').forEach(script => {
    // 只移除带有特定ID的注入脚本
    if (INJECTED_IDS.includes(script.id)) {
      script.remove();
    }
  });
}

/**
 * 清理样式元素
 */
function cleanStyles(element) {
  // 移除注入的style标签
  INJECTED_IDS.forEach(id => {
    const style = element.querySelector(`#${id}`);
    if (style) {
      style.remove();
    }
  });

  // 移除包含特定内容的style标签
  element.querySelectorAll('style').forEach(style => {
    const content = style.textContent;
    if (content.includes('iframe-hover-element') ||
      content.includes('iframe-selected-element') ||
      content.includes('contenteditable')) {
      style.remove();
    }
  });
}

/**
 * 清理可编辑属性
 */
function cleanEditableAttributes(element) {
  // 清理根元素的contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    element.removeAttribute('contenteditable');
  }

  // 清理所有子元素的contenteditable
  element.querySelectorAll('[contenteditable]').forEach(el => {
    const value = el.getAttribute('contenteditable');
    if (ATTRIBUTES_TO_CLEAN.contenteditable.includes(value)) {
      el.removeAttribute('contenteditable');
    }
  });

  // 清理tabindex
  element.querySelectorAll('[tabindex]').forEach(el => {
    const value = el.getAttribute('tabindex');
    if (ATTRIBUTES_TO_CLEAN.tabindex.includes(value)) {
      el.removeAttribute('tabindex');
    }
  });
}

/**
 * 清理注入的类名
 */
function cleanClasses(element) {
  // 清理根元素的类
  INJECTED_CLASSES.forEach(className => {
    element.classList.remove(className);
  });

  // 清理所有子元素的类
  element.querySelectorAll('*').forEach(el => {
    INJECTED_CLASSES.forEach(className => {
      el.classList.remove(className);
    });

    // 如果元素没有类了，移除class属性
    if (el.classList.length === 0) {
      el.removeAttribute('class');
    }
  });
}

/**
 * 清理内联样式
 */
function cleanInlineStyles(element) {
  // 清理根元素的样式
  cleanElementInlineStyles(element);

  // 清理所有子元素的样式
  element.querySelectorAll('*').forEach(el => {
    cleanElementInlineStyles(el);
  });
}

/**
 * 清理单个元素的内联样式
 */
function cleanElementInlineStyles(element) {
  if (!element.style) return;

  INLINE_STYLES_TO_CLEAN.forEach(prop => {
    element.style.removeProperty(prop);
  });

  // 如果style属性为空，移除它
  if (element.getAttribute('style') === '') {
    element.removeAttribute('style');
  }
}

/**
 * 创建自定义清理器
 */
export function createCustomCleaner(selector, action) {
  return (element) => {
    element.querySelectorAll(selector).forEach(el => {
      action(el);
    });
  };
}

/**
 * 智能检测并清理HTML内容
 * 自动检测是完整HTML文档还是片段
 */
export function smartCleanContent(htmlString, options = {}) {
  const isCompleteHTML = htmlString.trim().toLowerCase().startsWith('<!doctype') ||
    htmlString.includes('<html');

  if (isCompleteHTML) {
    // 解析完整HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // 清理head中的注入内容
    cleanHeadContent(doc.head);

    // 清理body
    const cleanedBody = cleanContent(doc, options);

    // 重新组装HTML
    return assembleHTML(doc, cleanedBody);
  } else {
    // 处理HTML片段
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlString;
    return cleanContent(wrapper, options);
  }
}

/**
 * 清理head内容
 */
function cleanHeadContent(head) {
  if (!head) return;

  // 移除注入的style标签
  head.querySelectorAll('style').forEach(style => {
    if (style.id && INJECTED_IDS.includes(style.id)) {
      style.remove();
    }

    // 检查内容
    const content = style.textContent;
    if (content.includes('contenteditable') ||
      content.includes('iframe-hover-element')) {
      style.remove();
    }
  });
}

/**
 * 重新组装HTML文档
 */
function assembleHTML(doc, bodyContent) {
  const htmlParts = [];

  // DOCTYPE
  htmlParts.push('<!DOCTYPE html>');

  // HTML标签和属性
  const htmlAttrs = Array.from(doc.documentElement.attributes)
    .map(attr => `${attr.name}="${attr.value}"`)
    .join(' ');
  htmlParts.push(`<html${htmlAttrs ? ' ' + htmlAttrs : ''}>`);

  // HEAD
  htmlParts.push('<head>');
  htmlParts.push(doc.head.innerHTML);
  htmlParts.push('</head>');

  // BODY
  const bodyAttrs = Array.from(doc.body.attributes)
    .filter(attr => attr.name !== 'contenteditable')
    .map(attr => `${attr.name}="${attr.value}"`)
    .join(' ');
  htmlParts.push(`<body${bodyAttrs ? ' ' + bodyAttrs : ''}>`);
  htmlParts.push(bodyContent);
  htmlParts.push('</body>');

  htmlParts.push('</html>');

  return htmlParts.join('\n');
}

/**
 * 比较清理前后的差异（用于调试）
 */
export function compareBeforeAfter(original, cleaned) {
  const changes = {
    removedScripts: [],
    removedStyles: [],
    removedClasses: [],
    removedAttributes: [],
    modified: false
  };

  // 简单的文本比较
  if (original !== cleaned) {
    changes.modified = true;

    // 统计移除的内容
    const scriptMatches = original.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    const cleanedScripts = cleaned.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    changes.removedScripts = scriptMatches.length - cleanedScripts.length;

    const styleMatches = original.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
    const cleanedStyles = cleaned.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
    changes.removedStyles = styleMatches.length - cleanedStyles.length;
  }

  return changes;
}

/**
 * 导出默认清理函数
 */
export default cleanContent;