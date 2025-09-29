/**
 * iframe 管理器
 * 负责处理iframe的DOM操作、内容注入、事件监听等
 */

import { snapdom } from '@zumer/snapdom';

export class IframeManager {
  constructor(iframe, options = {}) {
    this.iframe = iframe;
    this.document = null;
    this.window = null;
    this.options = {
      editable: true,
      ...options
    };

    // 注入的元素ID
    this.INJECTED_STYLE_ID = 'iframe-injected-styles';
    this.INJECTED_SCRIPT_ID = 'iframe-injected-script';

    // 事件回调
    this.callbacks = {
      onContentChange: null,
      onElementClick: null,
      onElementHover: null,
      onScroll: null,
      onEditModeChange: null,
      onMediaElementDoubleClick: null
    };

    // 编辑状态
    this.isEditingMode = false;

    // 内容变化监听器
    this.mutationObserver = null;
    this.contentChangeTimer = null;
    this.lastContent = null; // 记录上次的内容，用于比较是否真的变化了
    this.originalBodyStyle = null; // 记录原始body样式

    // 记录原始的head元素信息，用于识别动态添加的内容
    this.originHeadElementSet = new Set();
  }

  /**
   * 重置 iframe，清理所有内容和脚本状态
   */
  resetIframe() {
    if (!this.iframe) return;
    console.log(`[resetIframe] Resetting iframe for ${this.iframe}`);
    try {
      this.cleanup();
      this.iframe.src = 'about:blank';
      this.iframe.contentWindow?.location.reload?.();

    } catch (error) {
      console.error('Error resetting iframe:', error);
    }
  }

  /**
   * 清理管理器状态
   */
  cleanup() {
    // 停止观察
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // 清除定时器
    if (this.contentChangeTimer) {
      clearTimeout(this.contentChangeTimer);
      this.contentChangeTimer = null;
    }

    // 重置状态
    this.isEditingMode = false;
    this.document = null;
    this.window = null;
    this.lastContent = null;
    this.originHeadElementSet.clear();
  }

  /**
   * 写入 HTML 内容
   */
  writeContent(html) {
    if (!this.iframe) {
      console.error('Cannot write content: iframe not found');
      return;
    }

    try {
      this.resetIframe();

      // 先从HTML源码中解析原始head元素
      this.parseOriginalHeadElements(html);

      setTimeout(() => {
        const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
        if (!doc) {
          console.error('Cannot access iframe document');
          return;
        }

        doc.open();

        if (html.includes('<!DOCTYPE') || html.includes('<html')) {
          doc.write(html);
        } else {
          doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>${html}</body>
</html>`);
        }

        doc.close();

        this.document = doc;
        this.window = this.iframe.contentWindow;

        this.waitForContent();
      }, 50);
    } catch (error) {
      console.error('Error writing iframe content:', error);
    }
  }

  /**
   * 从HTML源码中解析原始head元素
   */
  parseOriginalHeadElements(html) {
    this.originHeadElementSet.clear();

    try {
      // 使用DOMParser解析HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      if (doc && doc.head) {
        const headElements = doc.head.querySelectorAll('style, link[rel="stylesheet"], script');
        console.log(`[parseOriginalHeadElements] Found ${headElements.length} original head elements in source HTML`);

        headElements.forEach(element => {
          const identifier = this.getElementIdentifier(element);
          if (identifier) {
            this.originHeadElementSet.add(identifier);
            console.log(`[parseOriginalHeadElements] Added: ${identifier}`);
          }
        });

        console.log(`[parseOriginalHeadElements] Total recorded: ${this.originHeadElementSet.size} elements`);
      }
    } catch (error) {
      console.error('[parseOriginalHeadElements] Error parsing HTML:', error);
    }
  }

  /**
   * 获取元素的唯一标识
   * 算法逻辑：
   * 1. 取元素的outerHTML前200个字符
   * 2. 生成一个简单的哈希值
   * 3. 返回格式为 `${tagName}-${hash}` 的字符串
   */
  getElementIdentifier(element) {
    if (!element) return null;

    const tagName = element.tagName.toLowerCase();
    const encodedHtml = element.outerHTML.substring(0, 200);

    let hash = 0;
    for (let i = 0; i < encodedHtml.length; i++) {
      const char = encodedHtml.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const identifier = `${tagName}-${hash}`;
    // console.log('identifier', identifier);
    return identifier;
  }

  /**
   * 等待内容加载完成
   */
  waitForContent() {
    let attempts = 0;
    const maxAttempts = 50; // 最多尝试50次

    const checkContent = () => {
      attempts++;

      if (!this.document) {
        console.error('Document reference lost');
        return;
      }

      // 检查body是否存在
      if (this.document.body) {
        // 记录初始内容
        this.lastContent = this.document.body.innerHTML;

        // 增强功能
        this.enhance();
      } else if (attempts < maxAttempts) {
        // 继续等待
        setTimeout(checkContent, 20);
      } else {
        console.error('Timeout waiting for iframe body');
      }
    };

    // 根据document状态决定何时开始检查
    if (this.document.readyState === 'loading') {
      this.document.addEventListener('DOMContentLoaded', checkContent);
    } else {
      // 立即开始检查
      setTimeout(checkContent, 10);
    }
  }

  /**
   * 增强 iframe 功能
   */
  enhance() {
    // 再次检查body是否存在
    if (!this.document || !this.document.body) {
      console.warn('Document body not ready for enhancement');
      return;
    }
    // 设置事件监听
    this.setupEventListeners();
  }

  /**
   * 启用编辑功能
   */
  enableEditing() {
    if (!this.document.body) return;

    // 保存原始body样式
    this.originalBodyStyle = this.document.body.getAttribute('style') || '';

    // 只设置contentEditable，不修改其他样式
    this.document.body.contentEditable = 'true';

    // 只在没有设置的情况下添加最小高度
    if (!this.document.body.style.minHeight) {
      this.document.body.style.minHeight = '100vh';
    }

    // 防止编辑时的默认聚焦框
    this.document.body.addEventListener('focus', () => {
      this.document.body.style.outline = 'none';
    });
  }

  /**
   * 禁用编辑功能
   */
  disableEditing() {
    if (!this.document.body) return;

    this.document.body.contentEditable = 'false';
    this.isEditingMode = false;

    // 停止内容监听
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // 清除防抖定时器
    if (this.contentChangeTimer) {
      clearTimeout(this.contentChangeTimer);
      this.contentChangeTimer = null;
    }
  }

  /**
   * 进入编辑模式
   */
  enterEditMode() {
    if (!this.document || !this.document.body) {
      console.warn('Cannot enter edit mode: document not ready');
      return false;
    }

    if (this.isEditingMode) {
      return true; // 已经在编辑模式
    }

    this.isEditingMode = true;
    this.enableEditing();
    this.setupContentMonitor();

    // 触发编辑模式回调
    if (this.callbacks.onEditModeChange) {
      this.callbacks.onEditModeChange(true);
    }

    return true;
  }

  /**
   * 退出编辑模式
   */
  exitEditMode() {
    if (!this.isEditingMode) {
      return null; // 不在编辑模式
    }

    // 获取完整HTML内容
    const completeHTML = this.getCompleteHTML();

    this.disableEditing();

    // 触发编辑模式回调
    if (this.callbacks.onEditModeChange) {
      this.callbacks.onEditModeChange(false);
    }

    return completeHTML;
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 点击事件 - 不要阻止默认行为，否则无法编辑
    this.document.addEventListener('click', async (e) => {
      // 只在选择元素时触发，不影响编辑
      if (this.callbacks.onElementClick) {
        const elementInfo = this.getElementInfo(e.target);

        // 使用 snapdom 获取元素截图
        try {
          const result = await snapdom(e.target, {
            format: 'png',
            quality: 0.9
          });

          // 使用 toCanvas 获取 canvas 元素，然后转换为 base64
          const canvas = await result.toCanvas();
          const imageBase64 = canvas.toDataURL('image/png');
          elementInfo.screenshot = imageBase64;

          console.log('Element screenshot captured:', {
            element: e.target.tagName,
            id: e.target.id,
            class: e.target.className,
            imageSize: imageBase64.length
          });
        } catch (error) {
          console.error('Failed to capture element screenshot:', error);
          elementInfo.screenshot = null;
        }

        this.callbacks.onElementClick(elementInfo, e);
      }
    });

    // 双击事件 - 处理多媒体元素快速编辑
    this.document.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (this.isMediaElement(e.target)) {
        // 多媒体元素，触发媒体编辑回调
        if (this.callbacks.onMediaElementDoubleClick) {
          const elementInfo = this.getElementInfo(e.target);
          this.callbacks.onMediaElementDoubleClick({
            ...elementInfo,
            mediaType: e.target.tagName.toLowerCase()
          }, e);
        }
      }
    });

    // 鼠标移动事件（悬停）
    this.document.addEventListener('mousemove', (e) => {
      if (this.callbacks.onElementHover) {
        const elementInfo = this.getElementInfo(e.target);
        this.callbacks.onElementHover(elementInfo, e);
      }
    });

    // 滚动事件
    this.window.addEventListener('scroll', (e) => {
      if (this.callbacks.onScroll) {
        this.callbacks.onScroll({
          scrollTop: this.window.scrollY,
          scrollLeft: this.window.scrollX
        }, e);
      }
    });

    // 键盘事件
    this.document.addEventListener('keydown', (e) => {
      // 阻止一些默认行为
      if (e.key === 'Tab') {
        e.preventDefault();
        // 插入制表符
        document.execCommand('insertText', false, '\t');
      }
    });
  }

  /**
   * 设置内容监听
   */
  setupContentMonitor() {
    if (!this.document.body) {
      console.warn('Document body not available for content monitoring');
      return;
    }

    // 使用 MutationObserver 监听DOM变化
    this.mutationObserver = new MutationObserver((mutations) => {
      // 过滤掉只是样式变化的mutation
      const hasContentChange = mutations.some(mutation => {
        // 忽略只是属性变化的情况
        if (mutation.type === 'attributes') {
          const attr = mutation.attributeName;
          // 忽略样式和contenteditable属性的变化
          if (attr === 'style' || attr === 'contenteditable' || attr === 'data-editor-id') {
            return false;
          }
        }
        // 文本内容或子节点变化才算真正的内容变化
        return mutation.type === 'characterData' || mutation.type === 'childList';
      });

      if (hasContentChange) {
        this.handleContentChange();
      }
    });

    this.mutationObserver.observe(this.document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeOldValue: true, // 启用旧值记录
      attributeFilter: ['src', 'href', 'alt', 'title', 'class'] // 监听这些属性的变化
    });

    // 监听input事件（更即时的响应）
    this.document.body.addEventListener('input', () => {
      this.handleContentChange();
    });
  }

  /**
   * 处理内容变化
   */
  handleContentChange() {
    // 防抖处理
    if (this.contentChangeTimer) {
      clearTimeout(this.contentChangeTimer);
    }

    this.contentChangeTimer = setTimeout(() => {
      if (this.callbacks.onContentChange) {
        const cleanContent = this.getCleanContent();

        // 只有内容真正变化时才触发回调
        // 使用trim()比较，忽略空白字符差异
        if (cleanContent.trim() !== this.lastContent?.trim()) {
          this.lastContent = cleanContent;
          this.callbacks.onContentChange(cleanContent);
        }
      }
    }, 800); // 增加防抖时间，避免频繁触发
  }

  /**
   * 获取元素信息
   */
  getElementInfo(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const computedStyle = this.window.getComputedStyle(element);
    const attrs = this.getElementAttributes(element);

    // 为多媒体元素特别处理 src 属性
    let currentSrc = null;
    if (this.isMediaElement(element)) {
      currentSrc = this.getMediaElementSrc(element);
      // 为多媒体元素添加唯一标识符（如果还没有的话）
      this.ensureMediaElementId(element);
    }

    return {
      element,
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      innerHTML: element.innerHTML,
      textContent: element.textContent,
      attributes: attrs,
      // 直接提供常用的媒体属性
      src: currentSrc || attrs.src,
      href: attrs.href,
      data: attrs.data,
      alt: attrs.alt,
      title: attrs.title,
      // 添加编辑器专用的ID
      editorId: attrs['data-editor-id'] || this.generateElementId(),
      rect: {
        top: rect.top + this.window.scrollY,
        left: rect.left + this.window.scrollX,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom + this.window.scrollY,
        right: rect.right + this.window.scrollX
      },
      style: {
        display: computedStyle.display,
        position: computedStyle.position,
        zIndex: computedStyle.zIndex
      },
      isEditable: element.isContentEditable,
      path: this.getElementPath(element)
    };
  }

  /**
   * 获取元素属性
   */
  getElementAttributes(element) {
    const attrs = {};
    for (let attr of element.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  /**
   * 获取元素路径
   */
  getElementPath(element) {
    const path = [];
    let current = element;

    while (current && current !== this.document.body) {
      const tagName = current.tagName.toLowerCase();
      const id = current.id ? `#${current.id}` : '';
      const className = current.className ? `.${current.className.split(' ').join('.')}` : '';
      path.unshift(`${tagName}${id}${className}`);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * 检查是否为多媒体元素
   */
  isMediaElement(element) {
    if (!element || !element.tagName) return false;
    const mediaTypes = ['IMG', 'VIDEO', 'AUDIO', 'EMBED', 'OBJECT', 'IFRAME'];
    return mediaTypes.includes(element.tagName.toUpperCase());
  }

  /**
   * 获取多媒体元素的正确 src 值
   */
  getMediaElementSrc(element) {
    if (!element || !this.isMediaElement(element)) return null;

    const tagName = element.tagName.toUpperCase();
    let srcValue = null;

    try {
      // 根据元素类型获取对应的 src 属性
      switch (tagName) {
        case 'IMG':
        case 'VIDEO':
        case 'AUDIO':
        case 'IFRAME':
          // 优先使用 DOM 属性（已解析的绝对路径）
          srcValue = element.src;
          // 如果 DOM 属性为空，使用特性值
          if (!srcValue) {
            srcValue = element.getAttribute('src');
          }
          break;
        case 'EMBED':
          srcValue = element.src || element.getAttribute('src');
          break;
        case 'OBJECT':
          srcValue = element.data || element.getAttribute('data');
          break;
      }

      // 如果获取到相对路径，转换为绝对路径
      if (srcValue && !this.isAbsoluteUrl(srcValue)) {
        const originalSrc = srcValue;
        srcValue = this.resolveUrl(srcValue);
      }

    } catch (error) {
      // 降级到特性值
      srcValue = element.getAttribute('src') || element.getAttribute('data') || element.getAttribute('href');
    }
    return srcValue;
  }

  /**
   * 检查是否为绝对URL
   */
  isAbsoluteUrl(url) {
    if (!url) return false;
    return /^https?:\/\//.test(url) || /^data:/.test(url) || /^blob:/.test(url);
  }

  /**
   * 解析相对URL为绝对URL
   */
  resolveUrl(url) {
    if (!url || this.isAbsoluteUrl(url)) return url;

    try {
      // 使用iframe的baseURI解析相对路径
      const baseUrl = this.document.baseURI || this.window.location.href;
      return new URL(url, baseUrl).href;
    } catch (error) {
      console.warn('Error resolving URL:', error);
      return url;
    }
  }

  /**
   * 更新多媒体元素的 src
   */
  updateMediaElementSrc(element, newSrc) {
    if (!element || !this.isMediaElement(element)) {
      console.warn('[updateMediaElementSrc] Invalid media element for src update:', element);
      return false;
    }

    const tagName = element.tagName.toUpperCase();
    const oldSrc = this.getMediaElementSrc(element);

    console.log(`[updateMediaElementSrc] Updating ${tagName} element:`, {
      element,
      oldSrc,
      newSrc,
      editorId: element.getAttribute('data-editor-id')
    });

    try {
      // 根据元素类型设置对应的属性
      switch (tagName) {
        case 'IMG':
        case 'VIDEO':
        case 'AUDIO':
        case 'IFRAME':
        case 'EMBED':
          console.log(`[updateMediaElementSrc] Setting src attribute: ${newSrc}`);
          // 同时更新 DOM 属性和 HTML 特性
          element.src = newSrc;
          element.setAttribute('src', newSrc);
          console.log(`[updateMediaElementSrc] DOM src after update:`, element.src);
          console.log(`[updateMediaElementSrc] HTML src after update:`, element.getAttribute('src'));
          break;
        case 'OBJECT':
          console.log(`[updateMediaElementSrc] Setting data attribute: ${newSrc}`);
          element.data = newSrc;
          element.setAttribute('data', newSrc);
          console.log(`[updateMediaElementSrc] DOM data after update:`, element.data);
          console.log(`[updateMediaElementSrc] HTML data after update:`, element.getAttribute('data'));
          break;
        default:
          console.warn('[updateMediaElementSrc] Unsupported media element type:', tagName);
          return false;
      }

      // 验证更新是否成功
      const verifyNewSrc = this.getMediaElementSrc(element);
      console.log(`[updateMediaElementSrc] Verification - new src:`, verifyNewSrc);

      if (verifyNewSrc !== newSrc) {
        console.warn(`[updateMediaElementSrc] Src update may have failed. Expected: ${newSrc}, Got: ${verifyNewSrc}`);
      }

      // 触发内容变化事件
      console.log('[updateMediaElementSrc] Triggering content change event');
      this.handleContentChange();
      return true;

    } catch (error) {
      console.error('[updateMediaElementSrc] Error updating media element src:', error);
      return false;
    }
  }

  /**
   * 为多媒体元素确保有唯一标识符
   */
  ensureMediaElementId(element) {
    if (!element || !this.isMediaElement(element)) return;

    let editorId = element.getAttribute('data-editor-id');
    if (!editorId) {
      editorId = this.generateElementId();
      element.setAttribute('data-editor-id', editorId);
    }
    return editorId;
  }

  /**
   * 生成唯一的元素ID
   */
  generateElementId() {
    return 'media-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 通过编辑器ID查找并更新多媒体元素
   */
  updateMediaElementById(editorId, newSrc) {
    if (!editorId || !newSrc) {
      console.warn('[updateMediaElementById] Invalid parameters:', { editorId, newSrc });
      return false;
    }

    console.log(`[updateMediaElementById] Searching for element with editorId: ${editorId}`);

    try {
      const selector = `[data-editor-id="${editorId}"]`;
      console.log(`[updateMediaElementById] Using selector: ${selector}`);

      const element = this.document.querySelector(selector);
      console.log(`[updateMediaElementById] Found element:`, element);

      if (element) {
        const isMedia = this.isMediaElement(element);
        console.log(`[updateMediaElementById] Is media element: ${isMedia}`);
        console.log(`[updateMediaElementById] Element tagName: ${element.tagName}`);

        if (isMedia) {
          console.log(`[updateMediaElementById] Calling updateMediaElementSrc with newSrc: ${newSrc}`);
          return this.updateMediaElementSrc(element, newSrc);
        } else {
          console.warn('[updateMediaElementById] Element found but not a media element:', element);
          return false;
        }
      } else {
        console.warn(`[updateMediaElementById] No element found with editorId: ${editorId}`);
        // 让我们检查一下文档中是否有任何带 data-editor-id 的元素
        const allElementsWithId = this.document.querySelectorAll('[data-editor-id]');
        console.log(`[updateMediaElementById] All elements with data-editor-id:`, allElementsWithId);
        allElementsWithId.forEach((el, index) => {
          console.log(`  [${index}] tagName: ${el.tagName}, editorId: ${el.getAttribute('data-editor-id')}`);
        });
        return false;
      }
    } catch (error) {
      console.error('[updateMediaElementById] Error finding media element by ID:', error);
      return false;
    }
  }

  /**
   * 通过选择器查找并更新多媒体元素
   */
  updateMediaElementBySrc(oldSrc, newSrc, mediaType) {
    if (!oldSrc || !newSrc) {
      console.warn('[updateMediaElementBySrc] Invalid src values for media update:', { oldSrc, newSrc, mediaType });
      return false;
    }

    console.log(`[updateMediaElementBySrc] Updating media element:`, { oldSrc, newSrc, mediaType });

    // 构建可能的选择器
    const selectors = [];
    const tagName = mediaType ? mediaType.toUpperCase() : null;

    if (tagName && tagName !== 'OBJECT') {
      selectors.push(`${tagName}[src="${oldSrc}"]`);
    }
    if (tagName === 'OBJECT') {
      selectors.push(`OBJECT[data="${oldSrc}"]`);
    }

    // 如果没有指定类型，尝试所有可能的媒体类型
    if (!tagName) {
      selectors.push(
        `img[src="${oldSrc}"]`,
        `video[src="${oldSrc}"]`,
        `audio[src="${oldSrc}"]`,
        `iframe[src="${oldSrc}"]`,
        `embed[src="${oldSrc}"]`,
        `object[data="${oldSrc}"]`
      );
    }

    console.log(`[updateMediaElementBySrc] Using selectors:`, selectors);

    // 尝试找到并更新元素
    for (const selector of selectors) {
      try {
        console.log(`[updateMediaElementBySrc] Trying selector: ${selector}`);
        const elements = this.document.querySelectorAll(selector);
        console.log(`[updateMediaElementBySrc] Found ${elements.length} elements with selector: ${selector}`);

        if (elements.length > 0) {
          let updated = false;
          elements.forEach((element, index) => {
            console.log(`[updateMediaElementBySrc] Updating element ${index}:`, element);
            if (this.updateMediaElementSrc(element, newSrc)) {
              updated = true;
            }
          });
          if (updated) {
            console.log(`[updateMediaElementBySrc] Successfully updated ${elements.length} media element(s) from ${oldSrc} to ${newSrc}`);
            return true;
          }
        }
      } catch (error) {
        console.warn('[updateMediaElementBySrc] Error with selector:', selector, error);
      }
    }

    console.warn(`[updateMediaElementBySrc] Could not find media element to update with src: ${oldSrc}`);

    // 让我们看看文档中所有的媒体元素
    const allMediaElements = this.document.querySelectorAll('img, video, audio, iframe, embed, object');
    console.log(`[updateMediaElementBySrc] All media elements in document (${allMediaElements.length}):`, allMediaElements);
    allMediaElements.forEach((el, index) => {
      const currentSrc = this.getMediaElementSrc(el);
      console.log(`  [${index}] ${el.tagName}: ${currentSrc}`);
    });

    return false;
  }

  /**
   * 获取干净的内容（移除注入的元素）
   */
  getCleanContent() {
    if (!this.document || !this.document.body) {
      console.warn('Document body not available for content cleaning');
      return '';
    }

    // 克隆body
    const bodyClone = this.document.body.cloneNode(true);

    // 移除注入的样式
    const injectedStyle = bodyClone.querySelector(`#${this.INJECTED_STYLE_ID}`);
    if (injectedStyle) {
      injectedStyle.remove();
    }

    // 只移除我们注入的脚本，保留用户的脚本
    bodyClone.querySelectorAll('script').forEach(script => {
      if (script.id === this.INJECTED_SCRIPT_ID) {
        script.remove();
      }
    });

    // 清理contentEditable属性
    if (bodyClone.getAttribute('contenteditable') === 'true') {
      bodyClone.removeAttribute('contenteditable');
    }

    // 清理我们在enableEditing中添加的样式
    if (bodyClone.style.outline === 'none') {
      bodyClone.style.removeProperty('outline');
    }
    if (bodyClone.style.minHeight === '100vh') {
      bodyClone.style.removeProperty('min-height');
    }

    // 清理空的style属性
    if (bodyClone.getAttribute('style') === '') {
      bodyClone.removeAttribute('style');
    }

    // 清理data-editor-id属性
    bodyClone.querySelectorAll('[data-editor-id]').forEach(el => {
      el.removeAttribute('data-editor-id');
    });

    return bodyClone.innerHTML;
  }

  /**
   * 获取完整的HTML文档（移除注入的元素）
   */
  getCompleteHTML() {
    const document = this.iframe.contentDocument || this.iframe.contentWindow?.document;

    if (!document) {
      console.warn('[getCompleteHTML] Document not available for HTML extraction');
      return '';
    }

    // 先获取原始文档的HTML字符串
    const originalHTML = document.documentElement.outerHTML;

    // 创建一个新的Document来处理
    const parser = new DOMParser();
    const tempDoc = parser.parseFromString(`<!DOCTYPE html>${originalHTML}`, 'text/html');

    if (!tempDoc || !tempDoc.documentElement) {
      console.warn('[getCompleteHTML] Failed to create temp document');
      return `<!DOCTYPE html>\n${originalHTML}`;
    }

    // 清理动态添加的元素
    // 只移除不在原始HTML中的元素
    if (this.originHeadElementSet && this.originHeadElementSet.size > 0) {
      const tempHead = tempDoc.querySelector('head');
      if (tempHead) {
        // 移除 head 中动态添加的样式
        const headElements = tempHead.querySelectorAll('style, link[rel="stylesheet"], script');
        for (const element of headElements) {
          const identifier = this.getElementIdentifier(element);
          if (!this.originHeadElementSet.has(identifier)) {
            console.log('[getCompleteHTML] Removing dynamic element:', element.outerHTML.substring(0, 100), this.originHeadElementSet);
            element.remove();
          }
        }
      }
    }
    // 清理编辑器相关的属性和样式
    this.cleanDocumentForSave(tempDoc);

    // 获取最终HTML
    const finalHTML = tempDoc.documentElement.outerHTML;
    console.log("final html", finalHTML.substring(0, 500));
    return `<!DOCTYPE html>\n${finalHTML}`;
  }


  /**
   * 清理文档以便保存
   */
  cleanDocumentForSave(doc) {
    // 移除编辑器注入的元素（如果存在的话）
    const injectedIds = [this.INJECTED_STYLE_ID, this.INJECTED_SCRIPT_ID];
    injectedIds.forEach(id => {
      const element = doc.querySelector(`#${id}`);
      if (element) element.remove();
    });

    // 清理编辑器添加的属性
    doc.querySelectorAll('[data-editor-id]').forEach(el => {
      el.removeAttribute('data-editor-id');
    });

    // 清理contentEditable属性（在enableEditing中设置）
    doc.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute('contenteditable');
    });

    // 清理body的编辑样式（在enableEditing中设置）
    if (doc.body) {
      // 只清理我们确实添加的样式
      if (doc.body.style.outline === 'none') {
        doc.body.style.removeProperty('outline');
      }
      if (doc.body.style.minHeight === '100vh') {
        doc.body.style.removeProperty('min-height');
      }
      // 清理空的style属性
      if (doc.body.getAttribute('style') === '') {
        doc.body.removeAttribute('style');
      }
    }
  }

  /**
   * 设置回调函数
   */
  on(event, callback) {
    const eventName = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
    if (eventName in this.callbacks) {
      this.callbacks[eventName] = callback;
    }
  }

  /**
   * 销毁
   */
  destroy() {
    // 使用统一的清理方法
    this.cleanup();

    // 清理回调
    this.callbacks = {
      onContentChange: null,
      onElementClick: null,
      onElementHover: null,
      onScroll: null,
      onEditModeChange: null,
      onMediaElementDoubleClick: null
    };

    // 清理引用
    this.iframe = null;
  }
}

/**
 * 创建iframe管理器实例
 */
export const createIframeManager = (iframe, options) => {
  return new IframeManager(iframe, options);
};