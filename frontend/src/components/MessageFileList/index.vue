<template>
 
  <div class="file-list" v-if="list.length > 0">
    <div class="file-item" v-for="(file, index) in displayedFiles" :key="index" @click="handleOpenFile(file)" :title="file.filename.split('\\').pop()">
      <div class="file-icon">
        <fileSvg :url="file?.filename" :filepath="file.filepath" />
      </div>
      <div class="file-info">
        <div class="file-name">{{ file.filename.split("\\").pop() }}</div>
        <div class="file-meta">
          <span class="file-type">{{ getFileType(file.filename) }}</span>
          <span class="file-size" v-if="file.filesize && file.filesize>0">{{ formatFileSize(file.filesize) }}</span>
        </div>
      </div>
    </div>
    <div class="view-all-item" v-if="list.length - displayedFiles.length > 0 && action_type === 'finish_summery'" @click="handleViewAllFiles">
      <div class="file-icon">
        <FileSearchOutlined />
      </div>
      <div class="file-name">view all files in this task</div>
    </div>
  </div>
  <imgModal :url="imageUrl" v-model:visible="isModalVisible" @close="isModalVisible = false" />
</template>
<script setup>
import { computed, ref } from "vue";
import fileSvg from "@/components/fileClass/fileSvg.vue";
import emitter from "@/utils/emitter";
import imgModal from "@/components/file/imgModal.vue";
import fileUtil from "@/utils/file";
import workspaceService from "@/services/workspace";
import { FileSearchOutlined } from "@ant-design/icons-vue";

import { storeToRefs } from "pinia";

import { useChatStore } from "@/store/modules/chat";
const chatStore = useChatStore();
const { messages } = storeToRefs(chatStore);

const props = defineProps({
  message: {
    type: Array,
    default: () => [],
  },
  role: {
    type: String,
    default: "assistant",
  },
  action_type: {
    type: String,
    default: "finish_summery",
  },
});

const isModalVisible = ref(false);
const imageUrl = ref("");
const list = computed(() => {
  const json = props?.message?.meta?.json;
  if (!json) return [];
  let files = JSON.parse(JSON.stringify(json));
  if (files && Array.isArray(files)) {
    for (const file of files) {
      if (file.filepath) {
        file.filename = file.filepath.split("/").pop(); // 从路径中取文件名
      } else {
        file.filename = file.name || ""; // 没有 name 的话就设为空字符串
      }
    }
    return files;
  }
  return files;
});

const displayedFiles = computed(() => {
  const types = new Set(["finish_summery", "question", "progress"]);
  if (types.has(props.action_type)) {
    const currentMessageIndex = messages.value.findIndex((msg) => msg.id === props.message.id);

    let filteredFiles = [];
    let planMessage = null;

    if (currentMessageIndex !== -1) {
      // 从当前消息往前查找最近的一条 action_type 为 'plan' 的数据
      for (let i = currentMessageIndex - 1; i >= 0; i--) {
        const message = messages.value[i];
        if (message.meta && message.meta.action_type === "plan") {
          planMessage = message;
          console.log("找到最近的plan数据:", message);
          break;
        }
      }
    }

    // 处理文件过滤逻辑
    if (planMessage && planMessage.meta && planMessage.meta.json) {
      try {
        let planData;
        if (typeof planMessage.meta.json === "string") {
          planData = JSON.parse(planMessage.meta.json);
        } else if (typeof planMessage.meta.json === "object") {
          planData = planMessage.meta.json;
        } else {
          throw new Error("Unsupported json data type");
        }

        const lastPlan = planData[planData.length - 1]; // 获取最后一条数据

        console.log("lastPlan:", lastPlan);

        if (lastPlan && lastPlan.actions && Array.isArray(lastPlan.actions)) {
          // 合并所有 actions 的 content 内容
          const allContent = lastPlan.actions.map((action) => action.content || "").join(" ");
          console.log("所有actions的content内容:", allContent);

          // 过滤文件：文件名出现在actions的content中
          filteredFiles = list.value.filter((file) => {
            const fileName = file.filename || "";
            const isMatched = allContent.includes(fileName) && fileName.toLowerCase() !== "todo.md";
            console.log(`文件 ${fileName} 是否匹配:`, isMatched);
            return isMatched;
          });

          console.log("过滤后的文件:", filteredFiles);
        }
      } catch (error) {
        console.error("解析plan数据出错:", error);
      }
    }
    if (filteredFiles.length === 0) {
      // 如果没有过滤的文件则返回默认的前3个
      filteredFiles = list.value.filter((file) => {
        const fileName = file.filename || "";
        return fileName.toLowerCase() !== "todo.md";
      });
    }

    // 如果有过滤的文件则返回过滤后的，否则返回默认的前3个
    return filteredFiles.length > 0 ? filteredFiles : list.value.slice(0, 3);
  }
  return list.value;
});

// 打开文件
const handleOpenFile = (file) => {
  console.log("handleOpenFile", file, file.filepath);
  if (fileUtil.imgType.includes(file.filepath.split(".").pop())) {
    workspaceService.getFile(file.filepath).then((res) => {
      imageUrl.value = URL.createObjectURL(res);
    });
    isModalVisible.value = true;
  } else {
    emitter.emit("fullPreviewVisable", file);
  }
};

// 查看所有文件
const handleViewAllFiles = () => {
  // 这里可以触发一个事件或者打开一个模态框来显示所有文件
  emitter.emit("file-explorer-visible", true);
};

// 获取文件类型
const getFileType = (filename) => {
  if (!filename) return '';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const typeMap = {
    'md': 'Markdown',
    'txt': 'Text',
    'pdf': 'PDF',
    'doc': 'Word',
    'docx': 'Word',
    'xls': 'Excel',
    'xlsx': 'Excel',
    'ppt': 'PowerPoint',
    'pptx': 'PowerPoint',
    'jpg': 'Image',
    'jpeg': 'Image',
    'png': 'Image',
    'gif': 'Image',
    'svg': 'Image',
    'mp4': 'Video',
    'avi': 'Video',
    'mov': 'Video',
    'mp3': 'Audio',
    'wav': 'Audio',
    'zip': 'Archive',
    'rar': 'Archive',
    '7z': 'Archive',
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'html': 'HTML',
    'css': 'CSS',
    'json': 'JSON',
    'xml': 'XML',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'sql': 'SQL'
  };
  
  return typeMap[extension] || extension?.toUpperCase() || 'File';
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  if (i === 0) return bytes + ' B';
  
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};
</script>
<style scoped>
.file-list {
  flex-wrap: wrap;
  margin-top: 16px;
  display: grid;
  gap: 5px;
  grid-template-columns: repeat(2, 1fr);
  max-width: 100%;
  overflow: hidden;
}
.file-list > :only-child {
  grid-column: 1 / -1;
}

.file-item {
  display: flex;
  padding: 0.5rem;
  background-color: #FFF;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  gap: 0.375rem;
  align-items: center;
  cursor: pointer;
  line-height: 24px;
  min-width: 0;
  max-width: 100%;

  .file-info {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-name {
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
    line-height: 1.4;
    min-width: 0;
    font-size: 14px;
  }

  .file-meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: #7F7F7F;
    line-height: 1rem;
    
    .file-type,
    .file-size {
      white-space: nowrap;
    }
  }
}

.view-all-item {
  display: flex;
  padding: 0.5rem;
  background-color: #FFF;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  gap: 0.375rem;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  line-height: 24px;
  min-height: 55px;
}
</style>
