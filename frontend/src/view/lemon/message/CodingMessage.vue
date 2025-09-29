<template>
  <div class="coding-message">
    <div class="coding-header">
      <div class="coding-icon">
        <i class="fas fa-code"></i>
      </div>
      <div class="coding-info">
        <div class="coding-title">Edit File</div>
        <div class="file-path" v-if="filePath">{{ filePath }}</div>
      </div>
    </div>

    <div class="coding-actions">
      <a-button type="text" size="small" @click="handleViewDiff" class="view-diff-btn">
        <i class="fas fa-eye mr-1"></i>
        View Diff
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import emitter from "@/utils/emitter";

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
});

// 从消息中提取文件路径
const filePath = computed(() => {
  const json = props.message?.meta?.json;
  const filepath = json?.filepath;
  if (filepath && filepath.includes("Conversation")) {
    return filepath.substring(filepath.indexOf("Conversation"));
  }
  return filepath;
});

// 处理查看 diff 的点击事件
const handleViewDiff = () => {
  const diffData = {
    type: "diff",
    filename: filePath.value,
    find: props.message?.meta?.json?.find || "",
    with: props.message?.meta?.json?.with || "",
    file: filePath.value,
  };

  emitter.emit("fullPreviewVisable-open", diffData);
};
</script>

<style lang="scss" scoped>
.coding-message {
  max-width: calc(100% - 16px);
  margin: 8px 0;
  padding: 4px 12px;
  cursor: pointer;
  background-color: #37352f0a;
  border: 1px solid #0000000a;
  border-radius: 15px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .coding-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;

    .coding-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;

      i {
        font-size: 14px;
        color: #666;
      }
    }

    .coding-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;

      .coding-title {
        font-size: 14px;
        font-weight: normal;
        color: #333;
      }

      .file-path {
        font-size: 14px;
        color: #666;
        font-family: monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .coding-actions {
    .view-diff-btn {
      color: #666;
      background: transparent;
      border: none;
      font-size: 12px;
      height: auto;
      padding: 2px 6px;
      border-radius: 4px;

      &:hover {
        background: #f0f0f0;
        color: #333;
      }

      i {
        font-size: 10px;
        margin-right: 3px;
      }
    }
  }
}
</style>
