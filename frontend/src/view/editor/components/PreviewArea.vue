<template>
  <div class="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- 预览区顶部信息栏 -->
    <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div class="flex items-center">
        <i class="fas fa-eye text-blue-500 mr-2"></i>
        <span class="text-sm font-medium text-gray-700">实时预览</span>
      </div>
      <div class="text-xs text-gray-500">点击选择元素，双击直接编辑 (Enter保存，Esc取消)</div>
    </div>

    <div class="flex-1 relative">
      <div class="preview-container">
        <div class="preview-content">
          <iframe ref="previewIframe" class="preview-frame" sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms" @load="onIframeLoad"></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

// 定义事件
const emit = defineEmits(["elementSelected", "elementDoubleClick", "editStarted", "editComplete", "mediaElementDoubleClick"]);

const previewIframe = ref(null);
const isIframeReady = ref(false);
const messageHandlers = new Map();

// iframe加载完成事件
const onIframeLoad = () => {
  const iframe = previewIframe.value;
  if (!iframe) return;

  try {
    // 注入通信脚本到iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const script = iframeDoc.createElement("script");
    script.textContent = `
      (function() {
        // 向父窗口发送消息的工具函数
        function sendMessage(type, data) {
          window.parent.postMessage({
            type: type,
            data: data,
            timestamp: Date.now()
          }, '*');
        }
        
        // 当前选中的元素
        let selectedElement = null;
        let hoveredElement = null;
        
        // 元素选择处理
        function handleElementClick(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // 清除之前的选中状态
          if (selectedElement) {
            selectedElement.classList.remove('selected-element');
          }
          
          selectedElement = e.target;
          selectedElement.classList.add('selected-element');
          
          // 生成元素路径
          const path = generateElementPath(selectedElement);
          
          sendMessage('elementSelected', {
            element: getElementInfo(selectedElement),
            path: path
          });
        }
        
        // 检查是否为多媒体元素
        function isMediaElement(element) {
          const mediaTypes = ['IMG', 'VIDEO', 'AUDIO', 'EMBED', 'OBJECT', 'IFRAME'];
          return mediaTypes.includes(element.tagName);
        }
        
        // 双击编辑处理 - 区分多媒体元素和文本元素
        function handleElementDoubleClick(e) {
          e.preventDefault();
          e.stopPropagation();
          
          if (isMediaElement(e.target)) {
            // 多媒体元素，触发媒体编辑
            sendMessage('mediaElementDoubleClick', {
              element: getElementInfo(e.target),
              mediaType: e.target.tagName.toLowerCase()
            });
          } else {
            // 普通元素，启用直接编辑模式
            enableDirectEdit(e.target);
          }
        }
        
        // 当前正在编辑的元素
        let currentEditingElement = null;
        
        // 启用直接编辑模式
        function enableDirectEdit(element) {
          // 如果已有编辑中的元素，先完成编辑
          if (currentEditingElement && currentEditingElement !== element) {
            disableDirectEdit(currentEditingElement, false);
          }
          
          // 跳过不可编辑的元素
          if (element.tagName === 'BODY' || element.tagName === 'HTML') return;
          
          // 隐藏悬浮提示
          hideHoverTooltip();
          
          currentEditingElement = element;
          currentEditingElement.contentEditable = 'true';
          currentEditingElement.classList.add('editing-element');
          
          // 设置编辑样式
          currentEditingElement.style.outline = '2px solid #00aaff';
          currentEditingElement.style.boxShadow = '0 0 10px rgba(0, 170, 255, 0.7)';
          currentEditingElement.style.transition = 'all 0.2s ease';
          
          // 显示编辑提示
          showEditingTooltip(element);
          
          // 聚焦并选中内容
          currentEditingElement.focus();
          
          // 通知父窗口编辑开始
          sendMessage('editStarted', {
            element: getElementInfo(currentEditingElement)
          });
        }
        
        // 禁用直接编辑模式
        function disableDirectEdit(element, save = true) {
          if (!element) return;
          
          element.contentEditable = 'false';
          element.classList.remove('editing-element');
          
          // 清除编辑样式
          element.style.outline = 'none';
          element.style.boxShadow = 'none';
          
          // 隐藏编辑提示
          hideEditingTooltip();
          
          if (save) {
            // 发送编辑完成的内容
            sendMessage('editComplete', {
              element: getElementInfo(element),
              content: element.innerHTML
            });
          }
          
          if (currentEditingElement === element) {
            currentEditingElement = null;
          }
        }
        
        // 监听编辑元素的失焦事件
        function handleEditBlur(e) {
          if (e.target === currentEditingElement) {
            disableDirectEdit(currentEditingElement, true);
          }
        }
        
        // 监听编辑时的键盘事件
        function handleEditKeyDown(e) {
          if (currentEditingElement && e.target === currentEditingElement) {
            // Enter保存并退出编辑
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              disableDirectEdit(currentEditingElement, true);
            }
            // Escape取消编辑
            else if (e.key === 'Escape') {
              e.preventDefault();
              disableDirectEdit(currentEditingElement, false);
            }
          }
        }
        
        
        // 悬浮提示元素
        let hoverTooltip = null;
        let editingTooltip = null;
        
        // 创建悬浮提示
        function createHoverTooltip() {
          if (hoverTooltip) return hoverTooltip;
          
          hoverTooltip = document.createElement('div');
          hoverTooltip.className = 'hover-tooltip';
          hoverTooltip.style.cssText = \`
            position: fixed;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            pointer-events: none;
            z-index: 999999;
            opacity: 0;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            transform: translateY(-8px);
          \`;
          document.body.appendChild(hoverTooltip);
          return hoverTooltip;
        }
        
        // 显示悬浮提示
        function showHoverTooltip(element, x, y) {
          const tooltip = createHoverTooltip();
          
          // 获取元素信息
          const tagName = element.tagName.toLowerCase();
          const elementId = element.id ? \`#\${element.id}\` : '';
          
          // 处理className，过滤掉编辑器状态类和复杂类名
          let className = '';
          if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ')
              .filter(cls => cls && !cls.includes('selected') && !cls.includes('hovered') && !cls.includes('editing'))
              .slice(0, 3) // 只显示前3个类名，避免过长
              .join('.');
            if (classes) className = \`.\${classes}\`;
          }
          
          // 构建显示文本
          let displayText = \`<\${tagName}\`;
          if (elementId) displayText += elementId;
          if (className) displayText += className;
          displayText += '> 双击编辑';
          
          // 限制文本长度，避免悬浮框过宽
          if (displayText.length > 50) {
            displayText = displayText.substring(0, 47) + '...> 双击编辑';
          }
          
          tooltip.innerHTML = displayText;
          
          // 计算位置，确保不超出视窗
          const rect = element.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();
          
          let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          let top = rect.top - 40;
          
          // 边界检查
          if (left < 10) left = 10;
          if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
          }
          if (top < 10) top = rect.bottom + 10;
          
          tooltip.style.left = left + 'px';
          tooltip.style.top = top + 'px';
          tooltip.style.opacity = '1';
          tooltip.style.transform = 'translateY(0)';
        }
        
        // 隐藏悬浮提示
        function hideHoverTooltip() {
          if (hoverTooltip) {
            hoverTooltip.style.opacity = '0';
            hoverTooltip.style.transform = 'translateY(-8px)';
            setTimeout(() => {
              if (hoverTooltip && hoverTooltip.parentNode) {
                hoverTooltip.parentNode.removeChild(hoverTooltip);
                hoverTooltip = null;
              }
            }, 200);
          }
        }
        
        // 创建编辑提示
        function createEditingTooltip() {
          if (editingTooltip) return editingTooltip;
          
          editingTooltip = document.createElement('div');
          editingTooltip.className = 'editing-tooltip';
          editingTooltip.style.cssText = \`
            position: fixed;
            background: linear-gradient(135deg, #00aaff 0%, #0066cc 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            pointer-events: none;
            z-index: 999999;
            opacity: 0;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 170, 255, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            transform: translateY(-8px);
          \`;
          editingTooltip.innerHTML = '正在编辑... (Enter保存, Esc取消)';
          document.body.appendChild(editingTooltip);
          return editingTooltip;
        }
        
        // 显示编辑提示
        function showEditingTooltip(element) {
          const tooltip = createEditingTooltip();
          
          // 计算位置
          const rect = element.getBoundingClientRect();
          
          let left = rect.left;
          let top = rect.top - 45;
          
          // 边界检查
          if (left < 10) left = 10;
          if (left + 200 > window.innerWidth - 10) {
            left = window.innerWidth - 210;
          }
          if (top < 10) top = rect.bottom + 10;
          
          tooltip.style.left = left + 'px';
          tooltip.style.top = top + 'px';
          tooltip.style.opacity = '1';
          tooltip.style.transform = 'translateY(0)';
        }
        
        // 隐藏编辑提示
        function hideEditingTooltip() {
          if (editingTooltip) {
            editingTooltip.style.opacity = '0';
            editingTooltip.style.transform = 'translateY(-8px)';
            setTimeout(() => {
              if (editingTooltip && editingTooltip.parentNode) {
                editingTooltip.parentNode.removeChild(editingTooltip);
                editingTooltip = null;
              }
            }, 300);
          }
        }
        
        // 鼠标悬停处理
        function handleElementMouseOver(e) {
          e.stopPropagation();
          
          // 跳过不可编辑的元素
          if (e.target.tagName === 'BODY' || e.target.tagName === 'HTML') return;
          
          if (hoveredElement && hoveredElement !== selectedElement) {
            hoveredElement.classList.remove('hovered-element');
          }
          
          if (e.target !== selectedElement && e.target !== currentEditingElement) {
            hoveredElement = e.target;
            hoveredElement.classList.add('hovered-element');
            
            // 显示悬浮提示
            showHoverTooltip(e.target, e.clientX, e.clientY);
          }
        }
        
        function handleElementMouseOut(e) {
          if (hoveredElement && hoveredElement !== selectedElement) {
            hoveredElement.classList.remove('hovered-element');
            hoveredElement = null;
            
            // 隐藏悬浮提示
            hideHoverTooltip();
          }
        }
        
        // 生成元素路径
        function generateElementPath(element) {
          const path = [];
          let current = element;
          
          while (current && current !== document.body && current !== document.documentElement) {
            let selector = current.tagName.toLowerCase();
            
            if (current.id) {
              selector += '#' + current.id;
              path.unshift(selector);
              break; // ID是唯一的，可以停止
            } else if (current.className && typeof current.className === 'string') {
              selector += '.' + current.className.trim().split(/\\s+/).join('.');
            }
            
            // 如果有兄弟节点，添加nth-child
            const parent = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(child => 
                child.tagName === current.tagName
              );
              if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                selector += ':nth-child(' + index + ')';
              }
            }
            
            path.unshift(selector);
            current = current.parentElement;
          }
          
          return path;
        }
        
        // 获取元素信息
        function getElementInfo(element) {
          const info = {
            tagName: element.tagName.toLowerCase(),
            id: element.id || '',
            className: element.className || '',
            textContent: element.textContent ? element.textContent.substring(0, 100) : '',
            outerHTML: element.outerHTML.substring(0, 500),
            innerHTML: element.innerHTML.substring(0, 500)
          };
          
          // 为元素添加唯一标识符以便准确定位
          if (!element.dataset.editorId) {
            element.dataset.editorId = 'editor-element-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          }
          info.editorId = element.dataset.editorId;
          
          // 添加媒体元素的特殊属性
          if (element.tagName === 'IMG') {
            info.src = element.src || '';
            info.alt = element.alt || '';
            info.width = element.naturalWidth || element.width || '';
            info.height = element.naturalHeight || element.height || '';
          } else if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
            info.src = element.src || '';
            info.controls = element.controls || false;
            info.autoplay = element.autoplay || false;
            info.loop = element.loop || false;
            if (element.tagName === 'VIDEO') {
              info.width = element.videoWidth || element.width || '';
              info.height = element.videoHeight || element.height || '';
            }
          } else if (element.tagName === 'IFRAME') {
            info.src = element.src || '';
            info.width = element.width || '';
            info.height = element.height || '';
            info.frameborder = element.frameBorder || '';
          } else if (element.tagName === 'EMBED' || element.tagName === 'OBJECT') {
            info.src = element.src || '';
            info.data = element.data || '';
            info.type = element.type || '';
            info.width = element.width || '';
            info.height = element.height || '';
          } else if (element.tagName === 'A') {
            info.href = element.href || '';
            info.target = element.target || '';
          }
          
          return info;
        }
        
        // 根据路径选择元素
        function selectElementByPath(path) {
          try {
            const selector = path.join(' > ');
            const element = document.querySelector(selector);
            if (element) {
              // 清除之前的选中状态
              if (selectedElement) {
                selectedElement.classList.remove('selected-element');
              }
              
              selectedElement = element;
              selectedElement.classList.add('selected-element');
              
              // 滚动到元素位置
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              sendMessage('elementSelected', {
                element: getElementInfo(selectedElement),
                path: path
              });
            }
          } catch (error) {
            console.error('选择元素失败:', error);
          }
        }
        
        // 更新元素内容
        function updateElementContent(selector, content) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              element.innerHTML = content;
              
              // 如果这是当前选中的元素，更新选中状态
              if (selectedElement && (selectedElement === element || selectedElement.contains(element))) {
                selectedElement.classList.remove('selected-element');
                selectedElement = element;
                selectedElement.classList.add('selected-element');
              }
              
              sendMessage('contentUpdated', {
                success: true,
                element: getElementInfo(element)
              });
            } else {
              sendMessage('contentUpdated', {
                success: false,
                error: '未找到目标元素'
              });
            }
          } catch (error) {
            sendMessage('contentUpdated', {
              success: false,
              error: error.message
            });
          }
        }
        
        // 监听来自父窗口的消息
        window.addEventListener('message', function(event) {
          const { type, data, action } = event.data;
          
          // 处理新的消息格式
          if (action) {
            switch (action) {
              case 'enableEdit':
                const editElement = document.querySelector(data.selector);
                if (editElement) {
                  enableDirectEdit(editElement);
                }
                break;
              case 'saveEdit':
                if (currentEditingElement) {
                  disableDirectEdit(currentEditingElement, true);
                }
                break;
              case 'cancelEdit':
                if (currentEditingElement) {
                  disableDirectEdit(currentEditingElement, false);
                }
                break;
            }
            return;
          }
          
          // 处理原有的消息格式
          switch (type) {
            case 'selectElement':
              selectElementByPath(data.path);
              break;
            case 'updateContent':
              updateElementContent(data.selector, data.content);
              break;
            case 'clearSelection':
              if (selectedElement) {
                selectedElement.classList.remove('selected-element');
                selectedElement = null;
              }
              break;
          }
        });
        
        // 等待DOM加载完成后绑定事件
        function initEventListeners() {
          // 为所有元素添加交互事件
          document.addEventListener('click', handleElementClick, true);
          document.addEventListener('dblclick', handleElementDoubleClick, true);
          document.addEventListener('mouseover', handleElementMouseOver, true);
          document.addEventListener('mouseout', handleElementMouseOut, true);
          
          // 添加编辑相关事件监听
          document.addEventListener('blur', handleEditBlur, true);
          document.addEventListener('keydown', handleEditKeyDown, true);
          
          // 页面滚动时隐藏提示
          document.addEventListener('scroll', function() {
            hideHoverTooltip();
            hideEditingTooltip();
          }, true);
          
          // 窗口大小改变时隐藏提示
          window.addEventListener('resize', function() {
            hideHoverTooltip();
            hideEditingTooltip();
          });
          
          
          // 阻止右键菜单
          document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
          });
          
          sendMessage('iframeReady', { ready: true });
        }
        
        // DOM加载完成后初始化
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initEventListeners);
        } else {
          initEventListeners();
        }
      })();
    `;

    iframeDoc.head.appendChild(script);

    // 添加样式
    const style = iframeDoc.createElement("style");
    style.textContent = `
      .selected-element {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px;
        background-color: rgba(59, 130, 246, 0.08) !important;
        border-radius: 4px;
        position: relative;
        transition: all 0.2s ease;
      }
      
      .selected-element::before {
        content: "";
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        background: linear-gradient(45deg, #3b82f6, #8b5cf6);
        border-radius: 8px;
        opacity: 0.1;
        z-index: -1;
        animation: pulse 2s infinite;
      }
      
      .hovered-element {
        outline: 2px solid #667eea !important;
        outline-offset: 1px;
        background-color: rgba(102, 126, 234, 0.08) !important;
        border-radius: 3px;
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15) !important;
      }
      
      .hovered-element:hover {
        outline-color: #4f46e5 !important;
        background-color: rgba(79, 70, 229, 0.12) !important;
        transform: translateY(-1px);
      }
      
      @keyframes pulse {
        0% { opacity: 0.1; }
        50% { opacity: 0.2; }
        100% { opacity: 0.1; }
      }
      
      /* 编辑状态样式 */
      .editing-element {
        outline: 2px solid #00aaff !important;
        box-shadow: 0 0 10px rgba(0, 170, 255, 0.7) !important;
        transition: all 0.2s ease !important;
        background-color: rgba(0, 170, 255, 0.05) !important;
      }
      
      .editing-element:focus {
        outline: 2px solid #0066cc !important;
        box-shadow: 0 0 15px rgba(0, 102, 204, 0.8) !important;
      }
      
      /* 编辑提示已移至JavaScript动态创建 */
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;

    iframeDoc.head.appendChild(style);
    isIframeReady.value = true;
  } catch (error) {
    console.error("Failed to initialize iframe:", error);
  }
};

// 处理来自iframe的消息
const handleMessage = (event) => {
  const { type, data, action } = event.data;

  // 处理新的编辑消息格式
  if (type === "editStarted") {
    emit("editStarted", data);
    return;
  }

  if (type === "editComplete") {
    emit("editComplete", data);
    return;
  }

  if (type === "mediaElementDoubleClick") {
    emit("mediaElementDoubleClick", data);
    return;
  }

  if (messageHandlers.has(type)) {
    messageHandlers.get(type)(data);
  }
};

// 向iframe发送消息
const sendMessageToIframe = (type, data) => {
  if (!previewIframe.value || !isIframeReady.value) {
    console.warn("Iframe not ready for message:", type);
    return;
  }

  try {
    previewIframe.value.contentWindow.postMessage(
      {
        type,
        data,
        timestamp: Date.now(),
      },
      "*"
    );
  } catch (error) {
    console.error("Failed to send message to iframe:", error);
  }
};

// 更新预览内容
const updatePreview = (htmlContent) => {
  const iframe = previewIframe.value;
  if (!iframe) return;

  try {
    // 在更新iframe之前，为HTML中的媒体元素添加editorId
    const processedHtml = addEditorIdsToMediaElements(htmlContent);

    // 创建完整的HTML文档
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>预览</title>
      </head>
      <body>
        ${processedHtml}
      </body>
      </html>
    `;

    // 使用srcdoc属性更新内容，这样可以避免跨域问题
    iframe.srcdoc = fullHtml;
  } catch (error) {
    console.error("Failed to update preview:", error);
  }
};

// 为HTML中的媒体元素添加editorId (使用字符串替换，不破坏script标签)
const addEditorIdsToMediaElements = (htmlContent) => {
  try {
    let modifiedHtml = htmlContent;
    
    // 定义媒体元素标签
    const mediaSelectors = ["img", "video", "audio", "embed", "object", "iframe"];
    
    mediaSelectors.forEach((selector) => {
      // 匹配没有data-editor-id属性的媒体元素开标签
      const regex = new RegExp(`(<${selector}(?![^>]*data-editor-id)[^>]*?)>`, 'gi');
      
      modifiedHtml = modifiedHtml.replace(regex, (match, tag) => {
        const editorId = "editor-element-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        // 在标签末尾（>之前）添加data-editor-id属性
        return tag + ` data-editor-id="${editorId}">`;
      });
    });
    
    return modifiedHtml;
  } catch (error) {
    console.error("Failed to add editor IDs:", error);
    return htmlContent;
  }
};

// 选择元素
const selectElementByPath = (path) => {
  sendMessageToIframe("selectElement", { path });
};

// 清除选中状态
const clearSelection = () => {
  sendMessageToIframe("clearSelection");
};

// 更新元素内容
const updateElementContent = (selector, content) => {
  sendMessageToIframe("updateContent", { selector, content });
};

// 注册消息处理器
const onMessage = (type, handler) => {
  messageHandlers.set(type, handler);
};

// 移除消息处理器
const offMessage = (type) => {
  messageHandlers.delete(type);
};

// 获取iframe元素（兼容旧接口）
const getPreviewElement = () => {
  return previewIframe.value;
};

// 生命周期
onMounted(() => {
  window.addEventListener("message", handleMessage);
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
  messageHandlers.clear();
});

defineExpose({
  getPreviewElement,
  updatePreview,
  selectElementByPath,
  clearSelection,
  updateElementContent,
  onMessage,
  offMessage,
  isIframeReady,
  previewIframe, // 暴露iframe引用
});
</script>

<style lang="scss" scoped>
.preview-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  overflow: hidden;
}

.preview-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  position: relative;
}

.preview-frame {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 200px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
}
</style>
