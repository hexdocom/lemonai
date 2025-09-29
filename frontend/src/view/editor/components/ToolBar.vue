<template>
  <div class="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg border-b px-6 py-3 flex items-center justify-between">
    <div class="flex items-center space-x-6">
      <div class="flex items-center">
        <i class="fas fa-code text-white text-xl mr-3"></i>
        <h1 class="text-xl font-bold text-white">HTML 可视化编辑器</h1>
      </div>
    </div>

    <div class="flex items-center space-x-3">
      <a-button @click="$emit('import-html')" size="middle" title="导入 HTML 文件" class="action-btn import-btn">
        <template #icon>
          <i class="fas fa-upload"></i>
        </template>
        <span class="ml-1">导入</span>
      </a-button>

      <a-button @click="$emit('save-file')" size="middle" title="保存文件" class="action-btn save-btn">
        <template #icon>
          <i class="fas fa-save"></i>
        </template>
        <span class="ml-1">保存</span>
      </a-button>

      <a-button @click="$emit('export-html')" size="middle" title="导出 HTML 文件" class="action-btn export-btn">
        <template #icon>
          <i class="fas fa-download"></i>
        </template>
        <span class="ml-1">导出</span>
      </a-button>

      <a-button @click="$emit('toggle-upload-area')" size="middle" title="显示/隐藏上传区域" class="action-btn upload-btn">
        <template #icon>
          <i class="fas fa-cloud-upload-alt"></i>
        </template>
        <span class="ml-1">上传</span>
      </a-button>

      <a-button @click="$emit('toggle-code-panel')" size="middle" title="切换代码面板" class="action-btn code-btn">
        <template #icon>
          <i class="fas fa-code"></i>
        </template>
        <span class="ml-1">代码</span>
      </a-button>

      <a-button @click="$emit('toggle-version-panel')" size="middle" title="切换版本历史面板" class="action-btn version-btn">
        <template #icon>
          <i class="fas fa-history"></i>
        </template>
        <span class="ml-1">版本</span>
      </a-button>
    </div>
  </div>
</template>

<script setup>
defineEmits(["import-html", "export-html", "toggle-upload-area", "toggle-code-panel", "toggle-version-panel"]);
</script>

<style lang="scss" scoped>
.fas {
  font-size: 14px;
}

.history-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.action-btn {
  background: white;
  border: none;
  color: #1f2937;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.import-btn:hover {
  color: #059669;
  border-color: #059669;
}

.export-btn:hover {
  color: #dc2626;
  border-color: #dc2626;
}

.upload-btn:hover {
  color: #f59e0b;
  border-color: #f59e0b;
}

.code-btn:hover {
  color: #7c3aed;
  border-color: #7c3aed;
}

.version-btn:hover {
  color: #10b981;
  border-color: #10b981;
}

:deep(.ant-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
