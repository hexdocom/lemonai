<template>
  <div v-if="meta && meta.screenshot" class="chat-reference">
    <div class="reference-header">
      <div class="reference-title">
        <i class="fas fa-file-image"></i>
        <span class="filename">{{ extractConversationPath(meta.filepath) }}</span>
      </div>
    </div>

    <div v-if="meta.screenshot" class="reference-content">
      <div class="reference-image-container">
        <img :src="meta.screenshot" :alt="meta.filepath" class="reference-image" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from "vue";

const extractConversationPath = (filePath) => {
  const startIndex = filePath.indexOf("Conversation");
  if (startIndex === -1) {
    return null;
  }
  return filePath.slice(startIndex);
};
defineProps({
  meta: {
    type: Object,
    default: () => ({}),
  },
});
</script>

<style lang="scss" scoped>
.chat-reference {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  margin-bottom: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  max-width: 70%;
}

.reference-header {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.reference-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #333;

  i {
    color: #1890ff;
    font-size: 11px;
  }

  .filename {
    word-break: break-all;
    line-height: 1.4;
  }
}

.reference-content {
  padding: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.reference-image-container {
  display: inline-block;
  max-width: 100%;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.reference-image {
  display: block;
  max-width: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background: #f5f5f5;
}

@media (max-width: 768px) {
  .chat-reference {
    max-width: 100%;
  }

  .reference-header {
    padding: 6px 10px;
  }

  .reference-content {
    padding: 6px;
  }

  .reference-image {
    max-height: 100px;
  }
}
</style>
