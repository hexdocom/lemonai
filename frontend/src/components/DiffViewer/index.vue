<template>
  <div class="diff-viewer">
    <div class="diff-content">
      <div class="diff-sections">
        <!-- 统一 diff 视图 -->
        <div class="diff-section unified">
          <div class="section-header">
            <span class="section-title"> <i class="fas fa-exchange-alt mr-1"></i> Code Diff </span>
          </div>
          <div class="unified-diff">
            <div v-for="(line, index) in unifiedDiff" :key="index" :class="['diff-line', line.type]">
              <span class="line-number">{{ line.number }}</span>
              <span class="line-content">{{ line.content }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  filename: {
    type: String,
    default: "Unknown File",
  },
  find: {
    type: String,
    default: "",
  },
  with: {
    type: String,
    default: "",
  },
});

// 处理内容
const findContent = computed(() => props.find.trim());
const withContent = computed(() => props.with.trim());

// 生成统一的 diff 视图
const unifiedDiff = computed(() => {
  console.log("DiffViewer props:", {
    filename: props.filename,
    find: props.find,
    with: props.with,
  });

  const lines = [];
  let lineNumber = 1;

  // 添加删除的行
  if (findContent.value) {
    findContent.value.split("\n").forEach((line) => {
      lines.push({
        type: "removed",
        number: `-${lineNumber}`,
        content: line,
      });
      lineNumber++;
    });
  }

  // 添加新增的行
  if (withContent.value) {
    let addLineNumber = 1;
    withContent.value.split("\n").forEach((line) => {
      lines.push({
        type: "added",
        number: `+${addLineNumber}`,
        content: line,
      });
      addLineNumber++;
    });
  }

  console.log("Generated unified diff lines:", lines);
  return lines;
});
</script>

<style lang="scss" scoped>
.diff-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.diff-content {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
}

.diff-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.diff-section {
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  overflow: hidden;

  .section-header {
    padding: 12px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e1e8ed;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .line-count {
      font-size: 12px;
      color: #6b7280;
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 12px;
    }
  }

  &.removed .section-header {
    background: #fef2f2;
    border-bottom-color: #fecaca;

    .section-title {
      color: #dc2626;
    }
  }

  &.added .section-header {
    background: #f0fdf4;
    border-bottom-color: #bbf7d0;

    .section-title {
      color: #16a34a;
    }
  }
}

.code-block {
  background: #1e1e1e;

  pre {
    margin: 0;
    padding: 16px;
    overflow-x: auto;

    code {
      font-family: "Monaco", "Consolas", monospace;
      font-size: 13px;
      line-height: 1.5;
      color: #d4d4d4;

      &.removed-code {
        background: rgba(220, 38, 38, 0.1);
      }

      &.added-code {
        background: rgba(22, 163, 74, 0.1);
      }
    }
  }
}

.unified-diff {
  background: #1e1e1e;
  font-family: "Monaco", "Consolas", monospace;
  font-size: 13px;
  line-height: 1.5;

  .diff-line {
    display: flex;
    padding: 2px 16px;

    &.removed {
      background: rgba(220, 38, 38, 0.15);
      color: #fca5a5;
    }

    &.added {
      background: rgba(22, 163, 74, 0.15);
      color: #86efac;
    }

    .line-number {
      width: 60px;
      color: #6b7280;
      text-align: right;
      margin-right: 16px;
      user-select: none;
    }

    .line-content {
      flex: 1;
      white-space: pre-wrap;
      word-break: break-all;
      color: #d4d4d4;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .diff-content {
    padding: 12px;
  }

  .diff-sections {
    gap: 16px;
  }

  .code-block pre {
    padding: 12px;
    font-size: 12px;
  }

  .unified-diff {
    font-size: 12px;

    .diff-line {
      padding: 1px 12px;

      .line-number {
        width: 50px;
        margin-right: 12px;
      }
    }
  }
}
</style>
