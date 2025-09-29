<template>
  <div class="h-screen flex flex-col">
    <!-- 顶部工具栏 -->
    <RenderToolBar
      :versions="versionList"
      :current-version="currentVersionData"
      :active-tab="activeTab"
      :ai-edit-mode="aiEditMode"
      :advanced-edit-mode="advancedEditMode"
      @version-change="handleVersionChange"
      @tab-change="handleTabChange"
      @save="handleSave"
      @ai-edit-toggle="handleAiEditToggle"
      @advanced-edit-toggle="handleAdvancedEditToggle"
    />

    <!-- 主内容区域 -->
    <div class="flex-1 overflow-hidden">
      <!-- 预览模式 -->
      <RenderPreview
        v-if="activeTab === 'preview'"
        :html-content="htmlContent"
        :path="props.path"
        :ai-edit-mode="aiEditMode"
        :advanced-edit-mode="advancedEditMode"
        @content-updated="handlePreviewContentUpdate"
        @element-selected="handleElementSelected"
        @media-edit="handleMediaEdit"
        @refresh="handleRefresh"
      />

      <!-- 代码编辑模式 -->
      <RenderCodeEditor v-else-if="activeTab === 'code'" :html-content="htmlContent" @content-change="handleContentChange" />
    </div>

    <!-- 多媒体编辑对话框 -->
    <MediaEditDialog ref="mediaEditDialogRef" @save="handleMediaSave" @close="handleMediaClose" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, provide, watch } from "vue";
import { useRoute } from "vue-router";
import fileService from "@/services/files.js";
import { useVersionManager } from "../composables/useVersionManager";
import { useNotification } from "../composables/useNotification";
import { useFileManager } from "../composables/useFileManager";
import RenderToolBar from "./components/RenderToolBar.vue";
import RenderPreview from "./components/RenderPreview.vue";
import RenderCodeEditor from "./components/RenderCodeEditor.vue";
import MediaEditDialog from "../components/MediaEditDialog.vue";
import { useEditorStore } from "@/store/modules/editor";
import emitter from "@/utils/emitter";

const props = defineProps({
  path: {
    type: String,
    required: true,
  },
});

provide("path", props.path);

const route = useRoute();
const { showNotification } = useNotification();
const { exportHTML } = useFileManager();
const editorStore = useEditorStore();

// 状态管理
const htmlContent = ref(``);
const activeTab = ref("preview");
const loading = ref(false);
const aiEditMode = ref(false);
const advancedEditMode = ref(false);

// 组件引用
const mediaEditDialogRef = ref(null);
const selectedElement = ref(null);

// 版本管理
const versionManager = useVersionManager();
const { initialize, switchToVersion, saveCurrentVersion, markAsModified, getVersionHistory, refreshVersions, versionState, currentVersion, hasVersions } = versionManager;

// 计算属性
const versionList = computed(() => getVersionHistory());
const isLoading = computed(() => versionState.isLoading);
const currentVersionData = computed(() => currentVersion.value);

// 提取对话路径
const extractConversationPath = (filePath) => {
  // Find the index of "Conversation"
  const startIndex = filePath.indexOf("Conversation");
  // If "Conversation" is not found, return null or an appropriate error message
  if (startIndex === -1) {
    return null;
  }
  // Slice the string from the start index to the end
  return filePath.slice(startIndex);
};

// 加载文件内容
const loadFileContent = async () => {
  if (!props.path) return;

  loading.value = true;
  try {
    // 处理路径，提取 Conversation 部分
    const processedPath = extractConversationPath(props.path) || props.path;
    const response = await fileService.getFileByPath(processedPath);
    const content = response.data;
    const conversation_id = route.params.id;
    if (content) {
      htmlContent.value = content;
      // 初始化版本管理，传入初始内容
      await initialize(conversation_id, processedPath, content);
    }
  } catch (error) {
    console.error("加载文件失败:", error);
    showNotification("文件加载失败", "error");
  } finally {
    loading.value = false;
  }
};

// 事件处理
const handleVersionChange = async (version) => {
  try {
    const content = await switchToVersion(version.id);
    if (content) {
      htmlContent.value = content;
    }
  } catch (error) {
    console.error("版本切换失败:", error);
    showNotification("版本切换失败", "error");
  }
};

const handleTabChange = (tab) => {
  activeTab.value = tab;

  // 如果切换到代码模式，同步状态到 store
  if (tab === "code") {
    editorStore.setEditorMode("code");
  } else if (tab === "preview") {
    // 根据当前编辑模式状态同步
    if (aiEditMode.value) {
      editorStore.setEditorMode("ai-edit");
    } else if (advancedEditMode.value) {
      editorStore.setEditorMode("advanced-edit");
    } else {
      editorStore.setEditorMode("preview");
    }
  }
};

// AI 编辑模式切换
const handleAiEditToggle = () => {
  // 如果当前是高级编辑模式，先关闭它
  if (advancedEditMode.value) {
    advancedEditMode.value = false;
  }

  aiEditMode.value = !aiEditMode.value;

  // 同步状态到 store
  const newMode = aiEditMode.value ? "ai-edit" : "preview";
  editorStore.setEditorMode(newMode);

  console.log("AI 编辑模式:", aiEditMode.value ? "开启" : "关闭", "store mode:", newMode);
};

// 高级编辑模式切换
const handleAdvancedEditToggle = () => {
  // 如果当前是AI编辑模式，先关闭它
  if (aiEditMode.value) {
    aiEditMode.value = false;
  }

  advancedEditMode.value = !advancedEditMode.value;

  // 同步状态到 store
  const newMode = advancedEditMode.value ? "advanced-edit" : "preview";
  editorStore.setEditorMode(newMode);

  console.log("高级编辑模式:", advancedEditMode.value ? "开启" : "关闭", "store mode:", newMode);
};

const handleContentChange = (newContent) => {
  if (newContent !== htmlContent.value) {
    htmlContent.value = newContent;
    // 标记内容已修改
    markAsModified(newContent);
  }
};

const handleSave = async () => {
  // 使用版本管理器保存
  const saved = await saveCurrentVersion(htmlContent.value);
  if (saved) {
    console.log("文件已手动保存");
  }
};

// 保存内容到文件
const saveContentToFile = async (content) => {
  if (!versionManager.versionState.conversation_id || !versionManager.versionState.filepath) {
    console.warn("未初始化版本管理器，跳过保存");
    return;
  }

  // 使用版本管理器保存
  await saveCurrentVersion(content);
};

// 防抖保存函数
let saveTimer = null;

// 内容格式化函数，用于统一比较
const normalizeContent = (content) => {
  if (!content) return "";
  return content.trim().replace(/\s+/g, " ");
};

// 预览内容更新处理
const handlePreviewContentUpdate = (updatedContent) => {
  // console.log("handlePreviewContentUpdate", updatedContent);
  // console.log("htmlContent", htmlContent.value);
  // 使用统一格式化后的内容进行比较
  const normalizedUpdated = normalizeContent(updatedContent);
  const normalizedCurrent = normalizeContent(htmlContent.value);
  // console.log("normalized updated:", normalizedUpdated.substring(0, 1200));
  // console.log("normalized current:", normalizedCurrent.substring(0, 1200));
  // console.log("is equal after normalization:", normalizedUpdated === normalizedCurrent);
  // return;
  if (normalizedUpdated === normalizedCurrent) {
    return;
  }

  // 直接使用iframe返回的完整body内容，不重复添加包装器
  htmlContent.value = updatedContent;
  // 标记内容已修改
  markAsModified(updatedContent);

  // 防抖保存，避免频繁调用接口
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveContentToFile(updatedContent);
    saveTimer = null;
  }, 500);
};

// 元素选择处理
const handleElementSelected = (data) => {
  selectedElement.value = data.element;
  console.log("选中元素:", data.element);
};

// 多媒体编辑处理
const handleMediaEdit = (data) => {
  console.log("多媒体编辑:", data);
  if (mediaEditDialogRef.value) {
    mediaEditDialogRef.value.show(data.element, data.mediaType);
  }
};

// 多媒体保存处理
const handleMediaSave = async (data) => {
  console.log("多媒体保存:", data);
  const { element, newSrc, mediaType } = data;
  console.log("多媒体保存:", element, element.src);

  // 在htmlContent中替换对应的媒体元素
  let updatedContent = htmlContent.value;
  element.src = newSrc;
  if (element.src && newSrc) {
    // 简单的字符串替换
    updatedContent = updatedContent.replace(element.src, newSrc);
    htmlContent.value = updatedContent;
    // 保存媒体更改
    markAsModified(updatedContent);
    await saveContentToFile(updatedContent);
    showNotification("媒体已更新", "success");
  }
};

// 多媒体编辑关闭处理
const handleMediaClose = () => {
  console.log("多媒体编辑对话框关闭");
};

// 处理刷新请求 - AI修改成功后重新加载文件
const handleRefresh = async () => {
  console.log("[index.vue] Refresh requested, reloading file content...");
  showNotification("AI修改成功, 正在重新加载...", "info");

  // 重新加载文件
  await loadFileContent();

  // 刷新版本列表
  await refreshVersions();

  console.log("[index.vue] File reloaded successfully");
};

// 清理事件监听
onUnmounted(() => {
  emitter.off("coding-message-sent", handleCodingMessageSent);
});

// 监听path变化
watch(
  () => props.path,
  async (newPath, oldPath) => {
    if (newPath && newPath !== oldPath) {
      console.log("[index.vue] Path changed from", oldPath, "to", newPath);
      await loadFileContent();
      await refreshVersions();
    }
  }
);

// 生命周期
onMounted(async () => {
  // 页面刷新后清理临时状态
  editorStore.clearSelection();
  console.log("Cleared temporary selection states on page refresh");

  // 从 store 恢复编辑模式状态
  const storedMode = editorStore.editorMode;
  console.log("Restoring editor mode from store:", storedMode);

  if (storedMode === "ai-edit") {
    aiEditMode.value = true;
    advancedEditMode.value = false;
  } else if (storedMode === "advanced-edit") {
    aiEditMode.value = false;
    advancedEditMode.value = true;
  } else if (storedMode === "code") {
    activeTab.value = "code";
  } else {
    // 默认预览模式
    aiEditMode.value = false;
    advancedEditMode.value = false;
    activeTab.value = "preview";
  }

  // 如果有路径参数，尝试加载文件
  if (props.path) {
    await loadFileContent();
  }

  // 监听coding消息发送事件
  emitter.on("coding-message-sent", handleCodingMessageSent);
});

// 处理coding消息发送事件
const handleCodingMessageSent = async (data) => {
  console.log("[index.vue] Received coding-message-sent event:", data);
  const currentConversationId = route.params.id;
  console.log("currentConversationId", currentConversationId);
  // 只有当前对话ID匹配时才重新加载
  if (data.conversationId === currentConversationId) {
    // 重新加载文件内容
    await loadFileContent();
    // 刷新版本列表
    await refreshVersions();

    console.log("[index.vue] File and versions reloaded after coding message");
  }
};
</script>

<style lang="scss" scoped>
.h-screen {
  height: 100vh;
}
</style>
