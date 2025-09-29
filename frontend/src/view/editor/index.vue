<template>
  <div class="h-screen flex flex-col">
    <!-- 顶部工具栏 -->
    <ToolBar
      @import-html="importHTML"
      @save-file="saveFileContent"
      @export-html="exportHTML"
      @toggle-code-panel="toggleCodePanel"
      @toggle-upload-area="toggleUploadArea"
      @toggle-version-panel="toggleVersionPanel"
    />

    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧面板 -->
      <SidePanel
        :element-path="elementPath"
        :selected-element="selectedElement"
        @select-from-path="selectFromPath"
        @open-ai-dialog="openAIDialog"
        @open-rich-editor="openRichEditor"
        @open-inline-editor="openInlineEditor"
      />

      <!-- 中间预览区域 -->
      <div class="flex-1 flex flex-col">
        <!-- 文件上传区域 -->
        <div v-if="showUploadArea" class="upload-area-wrapper">
          <FileUploadArea @file-uploaded="handleFileUploaded" @files-uploaded="handleFilesUploaded" />
        </div>

        <!-- 预览区域 -->
        <div class="flex-1">
          <PreviewArea ref="previewAreaRef" @editStarted="onEditStarted" @editComplete="onDirectEditComplete" @mediaElementDoubleClick="onMediaElementDoubleClick" />
        </div>
      </div>

      <!-- 右侧面板 -->
      <div v-if="showCodePanel || showVersionPanel" class="right-panels">
        <!-- 代码面板 -->
        <CodePanel v-if="showCodePanel" :html-content="htmlContent" @sync-from-code="syncFromCode" class="code-panel" />

        <!-- 版本历史面板 -->
        <VersionHistoryPanel
          v-if="showVersionPanel"
          :version-manager="versionManagerInstance"
          @version-change="onVersionChange"
          @export-history="onExportHistory"
          @import-history="onImportHistory"
          class="version-panel"
        />
      </div>
    </div>

    <!-- AI编辑对话框 -->
    <AIEditDialog ref="aiEditDialogRef" @apply-edit="onAIEditApplied" />

    <!-- 富文本编辑器 -->
    <RichTextEditor ref="richTextEditorRef" @save-content="onRichTextSaved" />

    <!-- 上传状态提示 -->
    <UploadStatus
      :visible="uploadState.visible"
      :status="uploadState.status"
      :title="uploadState.title"
      :message="uploadState.message"
      :files="uploadState.files"
      :auto-close="uploadState.autoClose"
      :auto-close-delay="uploadState.autoCloseDelay"
      @close="hideUploadStatus"
      @confirm="confirmUpload"
      @retry="retryLastUpload"
    />

    <!-- 浮动版本操作栏 -->
    <VersionActions :can-undo="versionCanUndo" :can-redo="versionCanRedo" :version-count="versionCount" :has-unsaved-changes="hasUnsavedChanges" @undo="undo" @redo="redo" />

    <!-- 内联编辑模态框 -->
    <InlineEditModal ref="inlineEditModalRef" @save="onInlineEditSave" @cancel="onInlineEditCancel" />

    <!-- 多媒体编辑对话框 -->
    <MediaEditDialog ref="mediaEditDialogRef" @save="onMediaEditSave" @close="onMediaEditClose" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import fileService from "@/services/files.js";
import ToolBar from "./components/ToolBar.vue";
import SidePanel from "./components/SidePanel.vue";
import PreviewArea from "./components/PreviewArea.vue";
import CodePanel from "./components/CodePanel.vue";
import AIEditDialog from "./components/AIEditDialog.vue";
import RichTextEditor from "./components/RichTextEditor.vue";
import FileUploadArea from "./components/FileUploadArea.vue";
import UploadStatus from "./components/UploadStatus.vue";
import { useEditorCore } from "./composables/useEditorCore";
import { useFileManager } from "./composables/useFileManager";
import { useNotification } from "./composables/useNotification";
import { useDragDrop } from "./composables/useDragDrop";
import { useFileUpload } from "./composables/useFileUpload";
import { useVersionManager } from "./composables/useVersionManager";
import VersionHistoryPanel from "./components/VersionHistoryPanel.vue";
import VersionActions from "./components/VersionActions.vue";
import InlineEditModal from "./components/InlineEditModal.vue";
import MediaEditDialog from "./components/MediaEditDialog.vue";

// 路由参数
const route = useRoute();
const currentFileId = ref(route.params.file_id || null);

// 响应式数据
const htmlContent = ref(`<div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold text-gray-800 mb-4">欢迎使用 HTML 编辑器</h1>
    <p class="text-gray-600 mb-6">这是一个示例段落，您可以点击任何元素进行编辑。</p>
    <div class="bg-blue-100 p-4 rounded-lg">
        <h2 class="font-semibold text-lg">添加记账</h2>
        <p class="text-gray-700 mb-4">测试富文本编辑器的类名保持功能 - 点击上面的标题进行编辑</p>
        <h3 class="text-xl font-semibold text-blue-800 mb-2">功能特性</h3>
        <ul class="list-disc list-inside text-blue-700">
            <li>实时预览</li>
            <li>元素选择</li>
            <li>AI 智能编辑</li>
            <li>富文本编辑（保持类名）</li>
            <li>快速内联编辑</li>
        </ul>
    </div>
</div>`);

const showCodePanel = ref(false);
const showUploadArea = ref(false);
const showVersionPanel = ref(false);
const selectedElement = ref(null);
const elementPath = ref([]);

// 组件引用
const previewAreaRef = ref(null);
const aiEditDialogRef = ref(null);
const richTextEditorRef = ref(null);
const inlineEditModalRef = ref(null);
const mediaEditDialogRef = ref(null);

// 使用 composables
const {
  selectedElement: coreSelectedElement,
  elementPath: coreElementPath,
  initializeEditor,
  updatePreview,
  selectFromPath,
  clearInlineEdit,
  openAIDialog: editorOpenAI,
  openRichEditor: editorOpenRich,
  openInlineEditor: editorOpenInline,
  syncToCode,
  addToHistory,
  setOnContentChangeCallback,
  setOnInlineEditCallback,
  updateElementContent,
} = useEditorCore();

// 同步状态
watch(coreSelectedElement, (newVal) => {
  selectedElement.value = newVal;
});

watch(coreElementPath, (newVal) => {
  elementPath.value = newVal;
});

const { importHTML: fileImportHTML, exportHTML: fileExportHTML } = useFileManager();

const { showNotification } = useNotification();

const { initDragDrop, setCallbacks: setDragCallbacks } = useDragDrop();

const { uploadState, handleSingleFileUpload, handleMultipleFileUpload, hideUploadStatus, confirmUpload } = useFileUpload();

// 版本管理
const versionManagerInstance = useVersionManager();
const {
  initialize: initializeVersionManager,
  addVersion,
  undo: versionUndo,
  redo: versionRedo,
  canUndo: versionCanUndo,
  canRedo: versionCanRedo,
  versionCount,
  hasUnsavedChanges,
} = versionManagerInstance;

// 方法
const toggleCodePanel = () => {
  showCodePanel.value = !showCodePanel.value;
};

const toggleUploadArea = () => {
  showUploadArea.value = !showUploadArea.value;
};

const toggleVersionPanel = () => {
  showVersionPanel.value = !showVersionPanel.value;
};

const syncFromCode = (newContent) => {
  if (newContent !== htmlContent.value) {
    htmlContent.value = newContent;
    updatePreview(newContent);
    // 添加版本记录
    addVersion(newContent, "代码同步", { source: "代码编辑" });
  }
};

const undo = () => {
  // 使用版本管理的撤销功能
  const version = versionUndo();
  if (version) {
    htmlContent.value = version.content;
    updatePreview(version.content);
  }
};

const redo = () => {
  // 使用版本管理的重做功能
  const version = versionRedo();
  if (version) {
    htmlContent.value = version.content;
    updatePreview(version.content);
  }
};

const openAIDialog = () => {
  if (selectedElement.value && aiEditDialogRef.value) {
    // 先清理任何正在进行的内联编辑
    clearInlineEdit();
    // 传递当前完整的HTML内容
    aiEditDialogRef.value.show(selectedElement.value, htmlContent.value);
  }
};

const openRichEditor = () => {
  if (selectedElement.value && richTextEditorRef.value) {
    // 先清理任何正在进行的内联编辑
    clearInlineEdit();
    richTextEditorRef.value.show(selectedElement.value);
  }
};

const openInlineEditor = () => {
  if (selectedElement.value) {
    editorOpenInline(selectedElement.value);
  }
};

const importHTML = async () => {
  try {
    const result = await fileImportHTML();
    htmlContent.value = result.content;
    updatePreview(result.content);

    // 同步更新编辑器核心历史记录
    addToHistory(result.content);

    // 重置版本历史并添加新的初始版本
    initializeVersionManager(result.content, `导入文件: ${result.filename}`);

    showNotification(`已导入文件: ${result.filename}`, "success");
  } catch (error) {
    showNotification(`导入失败: ${error.message}`, "error");
  }
};

const exportHTML = () => {
  const result = fileExportHTML(htmlContent.value);
  if (result.success) {
    showNotification(`已导出文件: ${result.filename}`, "success");
  } else {
    showNotification(`导出失败: ${result.error}`, "error");
  }
};

const onAIEditApplied = (edit) => {
  console.log("AI编辑应用", edit);

  // 使用核心编辑器的方法获取最新HTML内容
  const newHtmlContent = syncToCode();
  console.log("AI编辑获取的新内容:", newHtmlContent?.substring(0, 100) + "...");

  if (newHtmlContent && newHtmlContent !== htmlContent.value) {
    htmlContent.value = newHtmlContent;

    // 添加到版本管理
    const success = addVersion(newHtmlContent, "AI编辑", { source: "AI", templateType: edit.templateType });
    console.log("版本添加结果:", success);

    // 更新预览
    updatePreview(newHtmlContent);

    showNotification("AI编辑已应用", "success");
  }
};

const onRichTextSaved = (saveData) => {
  console.log("富文本编辑保存", saveData);

  // 在iframe环境下，通过updateElementContent更新内容
  if (selectedElement.value && saveData.content) {
    updateElementContent(selectedElement.value, saveData.content);
    showNotification("富文本编辑已保存", "success");
  }
};

// 处理编辑器内容变化（内联编辑等）
const onEditorContentChange = (newContent, action) => {
  console.log("编辑器内容变化:", action, newContent?.substring(0, 100) + "...");
  console.log("当前htmlContent:", htmlContent.value?.substring(0, 100) + "...");
  console.log("内容是否不同:", newContent !== htmlContent.value);

  if (newContent && newContent !== htmlContent.value) {
    console.log("更新htmlContent从", htmlContent.value?.substring(0, 50), "到", newContent?.substring(0, 50));
    htmlContent.value = newContent;
    // 添加到版本管理
    const success = addVersion(newContent, action, { source: "编辑器" });
    console.log("版本添加结果:", success);
  } else {
    console.log("内容相同，跳过更新");
  }
};

// 处理内联编辑请求
const onInlineEditRequest = (elementInfo) => {
  console.log("内联编辑请求:", elementInfo);
  if (inlineEditModalRef.value) {
    inlineEditModalRef.value.show(elementInfo);
  }
};

// 处理内联编辑保存
const onInlineEditSave = (editData) => {
  console.log("内联编辑保存:", editData);
  updateElementContent(editData.element, editData.content);
};

// 处理内联编辑取消
const onInlineEditCancel = () => {
  console.log("内联编辑取消");
};

// 版本管理事件处理
const onVersionChange = (version) => {
  htmlContent.value = version.content;
  updatePreview(version.content);
  showNotification(`切换到版本: ${version.action}`, "info");
};

const onExportHistory = () => {
  showNotification("版本历史已导出", "success");
};

const onImportHistory = () => {
  showNotification("版本历史已导入", "success");
};

// 处理文件上传
const handleFileUploaded = (result) => {
  handleSingleFileUpload(result, (fileResult) => {
    htmlContent.value = fileResult.content;
    updatePreview(fileResult.content);

    // 同步更新编辑器核心历史记录
    addToHistory(fileResult.content);

    // 重置版本历史并添加新的初始版本
    initializeVersionManager(fileResult.content, `上传文件: ${fileResult.filename}`);
  });
};

const handleFilesUploaded = (results) => {
  handleMultipleFileUpload(results, (fileResult) => {
    htmlContent.value = fileResult.content;
    updatePreview(fileResult.content);

    // 同步更新编辑器核心历史记录
    addToHistory(fileResult.content);

    // 重置版本历史并添加新的初始版本
    initializeVersionManager(fileResult.content, `批量上传文件: ${fileResult.filename}`);
  });
};

// 重试最后的上传操作
const retryLastUpload = () => {
  hideUploadStatus();
  // 这里可以添加重试逻辑
  showNotification("请重新选择文件", "info");
};

// 处理直接编辑开始事件
const onEditStarted = (elementData) => {
  console.log("直接编辑开始:", elementData);
  // 可以在这里显示编辑状态指示
};

// 处理直接编辑完成事件
const onDirectEditComplete = (data) => {
  console.log("直接编辑完成:", data);

  const { element, content } = data;

  try {
    // 使用更精确的方法：基于元素信息进行定位和替换
    console.log("接收到的编辑内容:", content);
    console.log("编辑的元素信息:", element);

    if (!element || content === undefined) {
      console.error("缺少必要的元素信息或内容");
      return;
    }

    // 使用updateElementContent方法来更新特定元素
    // 这样可以保持完整的HTML结构
    const elementInfo = {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      innerHTML: element.innerHTML,
      outerHTML: element.outerHTML,
    };

    console.log("准备更新元素内容，元素信息:", elementInfo);

    // 调用useEditorCore的updateElementContent方法
    updateElementContent(elementInfo, content);

    showNotification("内容已保存", "success");
  } catch (error) {
    console.error("更新内容失败:", error);
    showNotification("保存失败", "error");
  }
};

// 处理多媒体元素双击事件
const onMediaElementDoubleClick = (data) => {
  console.log("多媒体元素双击:", data);

  const { element, mediaType } = data;

  if (mediaEditDialogRef.value) {
    mediaEditDialogRef.value.show(element, mediaType);
  }
};

// 处理多媒体编辑保存
const onMediaEditSave = (data) => {
  console.log("多媒体编辑保存:", data);

  const { element, newSrc, mediaType, fileData } = data;

  try {
    // 处理base64数据，确保它是有效的
    let finalSrc = newSrc;

    if (fileData && fileData.base64) {
      finalSrc = fileData.base64;
      console.log("使用base64数据，长度:", finalSrc.length);
    }

    const currentHtml = htmlContent.value;
    let newHtml = currentHtml;

    console.log("开始替换媒体元素，标识符:", element.editorId);
    console.log("元素信息:", element);

    // 基于字符串替换的安全替换策略，不破坏HTML结构
    const replaceElementInHtml = (html, targetElement, newSrcValue) => {
      try {
        let modifiedHtml = html;
        let replaced = false;

        // 转义新值中的特殊字符
        const escapedNewValue = newSrcValue.replace(/["'&<>]/g, (match) => {
          const escapeMap = {
            '"': "&quot;",
            "'": "&#39;",
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
          };
          return escapeMap[match];
        });

        // 策略1: 通过editorId精确匹配 (最可靠)
        if (targetElement.editorId && !replaced) {
          try {
            const attrName = mediaType === "object" ? "data" : "src";
            const editorIdPattern = `data-editor-id="${targetElement.editorId}"`;
            const tagStart = `<${targetElement.tagName}`;

            // 查找包含editorId的标签开始位置
            const startIndex = html.indexOf(tagStart);
            if (startIndex !== -1) {
              const editorIdIndex = html.indexOf(editorIdPattern, startIndex);
              if (editorIdIndex !== -1) {
                // 找到标签的结束位置
                const tagEndIndex = html.indexOf(">", editorIdIndex);
                if (tagEndIndex !== -1) {
                  const tagContent = html.substring(startIndex, tagEndIndex + 1);
                  const srcPattern = new RegExp(`\\s*(${attrName})="[^"]*"`, "gi");
                  const newTagContent = tagContent.replace(srcPattern, ` ${attrName}="${escapedNewValue}"`);
                  modifiedHtml = html.substring(0, startIndex) + newTagContent + html.substring(tagEndIndex + 1);
                  replaced = true;
                  console.log("通过editorId替换成功");
                }
              }
            }
          } catch (error) {
            console.warn("editorId匹配失败:", error);
          }
        }

        // 策略2: 通过ID匹配
        if (!replaced && targetElement.id) {
          try {
            const attrName = mediaType === "object" ? "data" : "src";
            const idPattern = `id="${targetElement.id}"`;
            const tagStart = `<${targetElement.tagName}`;

            const startIndex = html.indexOf(tagStart);
            if (startIndex !== -1) {
              const idIndex = html.indexOf(idPattern, startIndex);
              if (idIndex !== -1) {
                const tagEndIndex = html.indexOf(">", idIndex);
                if (tagEndIndex !== -1) {
                  const tagContent = html.substring(startIndex, tagEndIndex + 1);
                  const srcPattern = new RegExp(`\\s*(${attrName})="[^"]*"`, "gi");
                  const newTagContent = tagContent.replace(srcPattern, ` ${attrName}="${escapedNewValue}"`);
                  modifiedHtml = html.substring(0, startIndex) + newTagContent + html.substring(tagEndIndex + 1);
                  replaced = true;
                  console.log("通过ID替换成功");
                }
              }
            }
          } catch (error) {
            console.warn("ID匹配失败:", error);
          }
        }

        // 策略3: 通过src属性值匹配 (使用字符串操作而不是复杂正则)
        if (!replaced && targetElement.src) {
          try {
            const attrName = mediaType === "object" ? "data" : "src";
            const srcToFind = `${attrName}="${targetElement.src}"`;

            const srcIndex = html.indexOf(srcToFind);
            if (srcIndex !== -1) {
              const beforeSrc = html.substring(0, srcIndex);
              const afterSrc = html.substring(srcIndex + srcToFind.length);
              modifiedHtml = beforeSrc + `${attrName}="${escapedNewValue}"` + afterSrc;
              replaced = true;
              console.log("通过src属性替换成功");
            }
          } catch (error) {
            console.warn("src属性匹配失败:", error);
          }
        }

        if (replaced) {
          console.log("元素属性已更新");
          return modifiedHtml;
        } else {
          console.error("无法找到目标元素进行替换");
          return html;
        }
      } catch (error) {
        console.error("字符串替换失败:", error);
        return html;
      }
    };

    // 执行替换
    newHtml = replaceElementInHtml(currentHtml, element, finalSrc);

    if (newHtml !== currentHtml) {
      // 确保htmlContent中也包含editorId，与iframe保持同步
      const processedHtml = ensureHtmlEditorIds(newHtml);
      htmlContent.value = processedHtml;
      updatePreview(processedHtml);

      // 添加到版本历史
      addToHistory(processedHtml);
      addVersion(processedHtml, "媒体替换", {
        source: "多媒体编辑",
        mediaType: mediaType,
        oldSrc: element.src || element.href || element.data,
        newSrc: finalSrc,
        fileInfo: fileData
          ? {
              name: fileData.name,
              type: fileData.type,
              size: fileData.size,
            }
          : null,
      });

      showNotification(`${mediaTypeText(mediaType)}已成功替换`, "success");
    } else {
      console.warn("HTML内容未发生变化");
      showNotification("未能找到要替换的元素", "warning");
    }
  } catch (error) {
    console.error("媒体更新失败:", error);
    showNotification("媒体更新失败: " + error.message, "error");
  }
};

// 辅助函数：获取媒体类型的中文名称
const mediaTypeText = (type) => {
  const typeMap = {
    img: "图片",
    video: "视频",
    audio: "音频",
    iframe: "框架",
    embed: "嵌入内容",
    object: "对象",
  };
  return typeMap[type] || "媒体";
};

// 确保HTML中的媒体元素都有editorId (使用字符串替换，不破坏script标签)
const ensureHtmlEditorIds = (htmlContent) => {
  try {
    let modifiedHtml = htmlContent;

    // 定义媒体元素标签
    const mediaSelectors = ["img", "video", "audio", "embed", "object", "iframe"];

    mediaSelectors.forEach((selector) => {
      // 匹配没有data-editor-id属性的媒体元素开标签
      const regex = new RegExp(`(<${selector}(?![^>]*data-editor-id)[^>]*?)>`, "gi");

      modifiedHtml = modifiedHtml.replace(regex, (match, tag) => {
        const editorId = "editor-element-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        // 在标签末尾（>之前）添加data-editor-id属性
        return tag + ` data-editor-id="${editorId}">`;
      });
    });

    return modifiedHtml;
  } catch (error) {
    console.error("Failed to ensure editor IDs:", error);
    return htmlContent;
  }
};

// 处理多媒体编辑关闭
const onMediaEditClose = () => {
  console.log("多媒体编辑对话框关闭");
};

// 版本管理状态已经通过props直接传递给VersionActions组件

// 移除自动监听内容变化，改为在具体操作中手动添加版本
// 这样可以避免重复添加版本和控制版本创建的时机

// 键盘快捷键处理
const handleKeyDown = (event) => {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
      event.preventDefault();
      redo();
    }
  }
};

// 加载文件内容
const loadFileContent = async () => {
  if (!currentFileId.value) return;

  try {
    const response = await fileService.getFileById(currentFileId.value);
    if (response && response.content) {
      htmlContent.value = response.content;
      // 初始化版本管理
      initializeVersionManager(response.content, `加载文件: ${response.filename || "file"}`);
      // 初始化编辑器核心历史
      addToHistory(response.content);
    }
  } catch (error) {
    console.error("加载文件失败:", error);
    showNotification("加载文件失败", "error");
  }
};

// 保存文件内容
const saveFileContent = async () => {
  const path = route.query.path;
  if (!path) {
    showNotification("文件路径不存在", "error");
    return;
  }

  try {
    await fileService.saveFileByPath(path, htmlContent.value);
    showNotification("文件保存成功", "success");
  } catch (error) {
    console.error("保存文件失败:", error);
    showNotification("保存文件失败", "error");
  }
};

const loadFileContentByPath = async () => {
  const path = route.query.path;
  try {
    const response = await fileService.getFileByPath(path);
    console.log("response", response);
    const content = response.data;
    if (content) {
      htmlContent.value = content;
      // 初始化版本管理
      initializeVersionManager(content, `加载文件: ${path}`);
      // 初始化编辑器核心历史
      addToHistory(content);
    }
  } catch (error) {
    console.error("加载文件失败:", error);
    showNotification("加载文件失败", "error");
  }
};

// 生命周期
onMounted(() => {
  // 等待DOM更新后再初始化
  nextTick(async () => {
    // 如果有文件ID，先加载文件内容
    const path = route.query.path;
    if (currentFileId.value) {
      await loadFileContent();
    }
    if (path) {
      await loadFileContentByPath();
    }

    // 先初始化编辑器
    if (previewAreaRef.value) {
      initializeEditor(previewAreaRef.value, htmlContent.value);
      // 设置内容变化回调
      setOnContentChangeCallback(onEditorContentChange);
      // 设置内联编辑回调
      setOnInlineEditCallback(onInlineEditRequest);
    }

    // 再初始化版本管理（确保编辑器已经就绪）
    setTimeout(() => {
      if (!currentFileId.value) {
        // 只有在没有加载文件时才初始化默认内容
        initializeVersionManager(htmlContent.value, "初始内容");
      }
      console.log("版本管理初始化完成", {
        canUndo: versionCanUndo.value,
        canRedo: versionCanRedo.value,
        versionCount: versionCount.value,
      });
    }, 100);

    // 添加键盘事件监听
    document.addEventListener("keydown", handleKeyDown);

    // 设置拖拽功能
    setDragCallbacks({
      onFileProcessed: (result) => {
        if (result.success) {
          htmlContent.value = result.content;
          updatePreview(result.content);

          // 同步更新编辑器核心历史记录
          addToHistory(result.content);

          // 重置版本历史并添加新的初始版本
          initializeVersionManager(result.content, `拖拽导入: ${result.filename}`);

          showNotification(`已成功导入文件: ${result.filename}`, "success");
        }
      },
      onMultipleFilesProcessed: (results) => {
        const lastFile = results[results.length - 1];
        if (lastFile && lastFile.success) {
          htmlContent.value = lastFile.content;
          updatePreview(lastFile.content);

          // 同步更新编辑器核心历史记录
          addToHistory(lastFile.content);

          // 重置版本历史并添加新的初始版本
          initializeVersionManager(lastFile.content, `批量拖拽导入: ${lastFile.filename} (${results.length}个文件)`);

          showNotification(`已成功导入 ${results.length} 个文件，当前显示: ${lastFile.filename}`, "success");
        }
      },
    });

    // 初始化拖拽到整个编辑器区域
    initDragDrop(document.body);
  });
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style lang="scss" scoped>
.h-screen {
  height: 100vh;
}

.upload-area-wrapper {
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 确保预览区域在有上传区域时能正确显示
.flex-1 {
  min-height: 0;
}

// 右侧面板样式
.right-panels {
  display: flex;
  flex-direction: column;
  width: 400px;
  border-left: 1px solid #e5e7eb;
  background: #fafafa;
}

.code-panel {
  flex: 1;
  min-height: 0;
  border-bottom: 1px solid #e5e7eb;
}

.version-panel {
  height: 350px;
  min-height: 300px;
}

// 响应式设计
@media (max-width: 1024px) {
  .right-panels {
    width: 350px;
  }
}

@media (max-width: 768px) {
  .right-panels {
    width: 100%;
    position: fixed;
    top: 60px;
    right: 0;
    bottom: 0;
    z-index: 1000;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  }
}
</style>
