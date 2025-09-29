<template>
  <div class="render-toolbar">
    <div class="toolbar-content">
      <!-- 左侧版本选择 -->
      <div class="toolbar-left">
        <a-select v-model:value="selectedVersionId" class="version-selector" :placeholder="getVersionPlaceholder()" @change="handleVersionSelect">
          <template #suffixIcon>
            <i class="fas fa-history text-gray-400"></i>
          </template>
          <a-select-option v-for="version in versions" :key="version.id" :value="version.id">
            <div class="version-option">
              <span class="version-number">v{{ version.version }}</span>
              <span class="version-status" v-if="version.active">
                <i class="fas fa-dot-circle"></i>
              </span>
              <span class="version-status" v-else>
                <i class="fas fa-save"></i>
              </span>
              <span class="version-time">{{ formatTimeShort(version.create_at) }}</span>
            </div>
          </a-select-option>
        </a-select>
      </div>

      <!-- 中间标签页 -->
      <div class="toolbar-center">
        <div class="tab-group">
          <button class="tab-button" :class="{ active: activeTab === 'preview' }" @click="$emit('tab-change', 'preview')">
            <i class="fas fa-eye mr-2"></i>
            Preview
          </button>
          <button class="tab-button" :class="{ active: activeTab === 'code' }" @click="$emit('tab-change', 'code')">
            <i class="fas fa-code mr-2"></i>
            Code
          </button>
        </div>
      </div>

      <!-- 右侧操作按钮 -->
      <div class="toolbar-right">
        <div class="edit-buttons">
          <button @click="$emit('ai-edit-toggle')" :class="['edit-button', { active: aiEditMode }]">
            <i class="fas fa-robot mr-2"></i>
            AI
          </button>
          <button @click="$emit('advanced-edit-toggle')" :class="['edit-button', { active: advancedEditMode }]">
            <i class="fas fa-code mr-2"></i>
            Advanced
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  versions: {
    type: Array,
    default: () => [],
  },
  currentVersion: {
    type: Object,
    default: null,
  },
  activeTab: {
    type: String,
    default: "preview",
  },
  aiEditMode: {
    type: Boolean,
    default: false,
  },
  advancedEditMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["version-change", "tab-change", "save", "ai-edit-toggle", "advanced-edit-toggle"]);

const selectedVersionId = ref(null);

// 监听当前版本变化
watch(
  () => props.currentVersion,
  (newVersion) => {
    if (newVersion) {
      selectedVersionId.value = newVersion.id;
    }
  },
  { immediate: true }
);

// 处理版本选择
const handleVersionSelect = (versionId) => {
  const version = props.versions.find((v) => v.id === versionId);
  if (version) {
    emit("version-change", version);
  }
};

// 获取版本占位符文本
const getVersionPlaceholder = () => {
  if (!props.versions || props.versions.length === 0) {
    return "No versions";
  }

  const currentVersion = props.versions.find((v) => v.isCurrent);
  if (currentVersion) {
    return `Current: v${currentVersion.index + 1}`;
  }

  return `Total: ${props.versions.length}`;
};

// 格式化时间 - 简短版本
const formatTimeShort = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // 小于1分钟
  if (diff < 60000) {
    return "just now";
  }
  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min ago`;
  }
  // 小于24小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hr ago`;
  }
  // 小于30天
  if (diff < 2592000000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day ago`;
  }
  // 显示月日
  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
};
</script>

<style lang="scss" scoped>
.render-toolbar {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
  min-height: 64px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.toolbar-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-left {
  flex: 1;
  max-width: 180px;

  .version-selector {
    width: 100%;

    :deep(.ant-select-selector) {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #374151;
      border-radius: 8px;
      transition: all 0.3s ease;

      &:hover,
      &:focus {
        background: #ffffff;
        border-color: #f6c82c;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(246, 200, 44, 0.15);
      }
    }

    :deep(.ant-select-selection-item) {
      color: #374151 !important;
    }

    :deep(.ant-select-arrow) {
      color: #6b7280;
    }

    :deep(.ant-select-focused .ant-select-selector) {
      border-color: #f6c82c !important;
      box-shadow: 0 0 0 2px rgba(246, 200, 44, 0.2) !important;
    }

    :deep(.ant-select-selection-placeholder) {
      color: #6b7280 !important;
      font-size: 13px;
    }
  }
}

.version-option {
  display: flex;
  align-items: center;
  gap: 8px;

  .version-number {
    font-weight: 600;
    color: #1f2937;
    font-size: 13px;
    font-family: "Monaco", "Consolas", monospace;
    min-width: 24px;
  }

  .version-status {
    i {
      font-size: 10px;
      color: #3b82f6;

      &.fa-save {
        color: #10b981;
      }
    }
  }

  .version-time {
    font-size: 11px;
    color: #6b7280;
    margin-left: auto;
  }
}

.toolbar-center {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  max-width: 200px;
}

.tab-group {
  display: flex;
  background: #f9fafb;
  border-radius: 50px;
  padding: 4px;
  gap: 4px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-width: 140px;
}

.tab-button {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
  font-weight: 500;
  min-width: 60px;
  justify-content: center;

  &:hover {
    background: #e5e7eb;
    color: #374151;
    transform: translateY(-1px);
  }

  &.active {
    background: #232425;
    color: #ffffff;
    font-weight: 600;
    transform: translateY(-2px);
  }

  i {
    font-size: 13px;
    margin-right: 6px;
  }
}

.toolbar-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  max-width: 200px;
}

.action-button {
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;

  &.save-button {
    background: #f6c82c;
    border: 1px solid #f6c82c;
    color: #ffffff;
    font-weight: 600;

    &:hover {
      background: #f5c321;
      border-color: #f5c321;
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(246, 200, 44, 0.3);
    }
  }
}

.edit-buttons {
  display: flex;
  gap: 8px;
}

.edit-button {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
  font-weight: 500;

  &:hover {
    background: #f9fafb;
    color: #374151;
    border-color: #9ca3af;
    transform: translateY(-1px);
  }

  &.active {
    background: #3b82f6;
    color: #ffffff;
    border-color: #3b82f6;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
  }

  i {
    font-size: 12px;
    margin-right: 4px;
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .toolbar-left,
  .toolbar-right {
    max-width: 200px;
  }
}

@media (max-width: 768px) {
  .render-toolbar {
    padding: 0 16px;
    min-height: 56px;
  }

  .toolbar-content {
    flex-wrap: wrap;
    gap: 12px;
  }

  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    flex: none;
  }

  .toolbar-left {
    order: 1;
    width: 100%;
    max-width: none;
  }

  .toolbar-center {
    order: 2;
    max-width: none;
  }

  .toolbar-right {
    order: 3;
    max-width: none;
    flex-direction: column;
    gap: 8px;
  }

  .edit-buttons {
    flex-wrap: wrap;
    justify-content: center;
  }

  .edit-button {
    font-size: 11px;
    padding: 6px 8px;
  }
}
</style>
