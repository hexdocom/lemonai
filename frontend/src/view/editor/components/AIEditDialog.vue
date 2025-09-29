<template>
  <a-modal v-model:open="visible" width="700px" :footer="null" @cancel="handleCancel" class="ai-edit-modal">
    <template #title>
      <div class="flex items-center">
        <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
          <i class="fas fa-magic text-white"></i>
        </div>
        <span class="text-lg font-semibold">AI 智能编辑</span>
      </div>
    </template>
    <div class="space-y-4">
      <div v-if="selectedElement">
        <h4 class="font-medium text-gray-800 mb-2">当前选中元素:</h4>
        <div class="bg-gray-100 p-3 rounded text-sm font-mono whitespace-pre-line">
          {{ elementInfoText }}
        </div>
      </div>

      <!-- 模板选择 -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700"> AI 编辑模板: </label>
          <a-button type="link" size="small" @click="showPromptPreview = !showPromptPreview">
            <template #icon>
              <i :class="showPromptPreview ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </template>
            {{ showPromptPreview ? "隐藏" : "显示" }}提示词
          </a-button>
        </div>
        <a-select v-model:value="selectedTemplate" class="w-full" placeholder="选择编辑模板类型">
          <a-select-option v-for="option in templateOptions" :key="option.value" :value="option.value">
            <div class="flex items-center justify-between w-full">
              <div>
                <span class="font-medium">{{ option.label }}</span>
                <span class="ml-2 text-xs text-gray-500 capitalize">[{{ option.category }}]</span>
              </div>
              <i v-if="selectedTemplate === option.value && prompt.trim() && detectTemplateType(prompt) === option.value" class="fas fa-magic text-purple-500 text-xs" title="智能推荐"></i>
            </div>
          </a-select-option>
        </a-select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2"> 请描述您想要的修改: </label>
        <a-textarea v-model:value="prompt" :rows="3" placeholder="例如：将这个标题改为红色，增大字体..." class="w-full" />
        <div class="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <i class="fas fa-lightbulb"></i>
          系统将根据您的输入自动选择最合适的模板
          <span v-if="prompt.trim() && detectTemplateType(prompt) !== 'basic'" class="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
            推荐: {{ promptTemplates[detectTemplateType(prompt)]?.name }}
          </span>
        </div>
      </div>

      <!-- 实时提示词预览 -->
      <div v-if="showPromptPreview && fullPrompt" class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="font-medium text-gray-800">完整 AI 提示词:</h4>
          <a-button type="text" size="small" @click="copyPrompt">
            <template #icon>
              <i class="fas fa-copy"></i>
            </template>
            复制
          </a-button>
        </div>
        <div class="bg-slate-50 p-4 rounded-lg border max-h-60 overflow-y-auto">
          <pre class="text-xs text-gray-700 whitespace-pre-wrap font-mono">{{ fullPrompt }}</pre>
        </div>
      </div>

      <div v-if="isProcessing" class="flex items-center justify-center py-4">
        <a-spin size="small" />
        <span class="ml-2 text-gray-600">AI 正在分析您的需求...</span>
      </div>

      <div v-if="previewResult" class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-medium text-gray-800">AI 预览结果:</h4>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-1 rounded-full font-medium" :class="previewResult.action === 'replace' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'">
              {{ previewResult.action === "replace" ? "部分替换" : "整体重写" }}
            </span>
            <span class="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
              {{ promptTemplates[previewResult.templateType]?.name || "基础编辑" }}
            </span>
          </div>
        </div>

        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="mb-3">
            <h5 class="text-sm font-medium text-blue-900 mb-1">修改说明:</h5>
            <p class="text-sm text-blue-800">{{ previewResult.description }}</p>
          </div>

          <div class="mb-3">
            <div class="flex items-center justify-between mb-2">
              <h5 class="text-sm font-medium text-blue-900">生成的代码:</h5>
              <div class="flex items-center gap-2">
                <span class="text-xs text-blue-600">
                  {{ previewResult.action === "replace" ? "仅替换当前元素" : "完整HTML文档" }}
                </span>
                <a-button type="text" size="small" @click="copyCode">
                  <template #icon>
                    <i class="fas fa-copy"></i>
                  </template>
                  复制代码
                </a-button>
              </div>
            </div>
            <div class="bg-white p-3 rounded border font-mono text-xs max-h-40 overflow-y-auto">
              <pre class="whitespace-pre-wrap">{{ previewResult.code }}</pre>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <details>
              <summary class="cursor-pointer text-blue-700 hover:text-blue-900 font-medium"><i class="fas fa-eye mr-1"></i>查看AI提示词</summary>
              <div class="mt-2 p-2 bg-gray-50 rounded text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {{ previewResult.usedPrompt }}
              </div>
            </details>

            <details v-if="previewResult.xmlResponse">
              <summary class="cursor-pointer text-blue-700 hover:text-blue-900 font-medium"><i class="fas fa-code mr-1"></i>查看XML响应</summary>
              <div class="mt-2 p-2 bg-gray-50 rounded text-gray-600 font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                {{ previewResult.xmlResponse }}
              </div>
            </details>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-2 pt-4 border-t">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleGenerate" :disabled="!prompt.trim()" :loading="isProcessing"> 生成预览 </a-button>
        <a-button v-if="previewResult" type="primary" @click="handleApply" class="bg-green-500 border-green-500 hover:bg-green-600"> 应用修改 </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { message } from "ant-design-vue";
import { useAIPrompts } from "../composables/useAIPrompts";

const emit = defineEmits(["apply-edit"]);

const visible = ref(false);
const selectedElement = ref(null);
const prompt = ref("");
const isProcessing = ref(false);
const previewResult = ref(null);
const selectedTemplate = ref("basic");
const showPromptPreview = ref(false);
const fullPageHTML = ref("");

// 使用 AI 提示词 composable
const { promptTemplates, detectTemplateType, generatePrompt, getTemplateSuggestions, formatElementInfo, getTemplateCategories, parseAIResponse, generateSampleResponse, detectComplexity } =
  useAIPrompts();

// 模板选项
const templateOptions = computed(() => {
  return Object.entries(promptTemplates).map(([key, template]) => ({
    value: key,
    label: template.name,
    category: template.category,
  }));
});

// 实时生成的完整提示词
const fullPrompt = computed(() => {
  if (!selectedElement.value || !prompt.value.trim()) {
    return "";
  }

  return generatePrompt(selectedTemplate.value, selectedElement.value, prompt.value, fullPageHTML.value);
});

// 监听用户输入，自动检测模板类型
watch(
  prompt,
  (newPrompt) => {
    if (newPrompt.trim()) {
      const detectedType = detectTemplateType(newPrompt);
      if (detectedType !== selectedTemplate.value) {
        selectedTemplate.value = detectedType;
      }
    }
  },
  { debounce: 300 }
);

// 格式化的元素信息
const elementInfoText = computed(() => {
  return formatElementInfo(selectedElement.value);
});

const show = (element, pageHTML = "") => {
  selectedElement.value = element;
  fullPageHTML.value = pageHTML;
  visible.value = true;
  prompt.value = "";
  previewResult.value = null;
  selectedTemplate.value = "basic";
  showPromptPreview.value = false;
};

const handleCancel = () => {
  visible.value = false;
  selectedElement.value = null;
  fullPageHTML.value = "";
  prompt.value = "";
  previewResult.value = null;
  selectedTemplate.value = "basic";
  showPromptPreview.value = false;
};

// 复制提示词到剪贴板
const copyPrompt = async () => {
  if (!fullPrompt.value) return;

  try {
    await navigator.clipboard.writeText(fullPrompt.value);
    message.success("提示词已复制到剪贴板");
  } catch (error) {
    message.error("复制失败，请手动选择复制");
  }
};

// 复制生成的代码到剪贴板
const copyCode = async () => {
  if (!previewResult.value?.code) return;

  try {
    await navigator.clipboard.writeText(previewResult.value.code);
    message.success("代码已复制到剪贴板");
  } catch (error) {
    message.error("复制失败，请手动选择复制");
  }
};

const getElementInfo = (element) => {
  if (!element) return "";
  const tagName = element.tagName.toLowerCase();
  const className = element.className ? ` class="${element.className}"` : "";
  const id = element.id ? ` id="${element.id}"` : "";
  return `<${tagName}${id}${className}>`;
};

const handleGenerate = async () => {
  if (!prompt.value.trim() || !selectedElement.value) return;

  isProcessing.value = true;

  try {
    // 生成完整的提示词
    const aiPrompt = fullPrompt.value;

    // 模拟发送到 AI API
    console.log("发送到 AI 的提示词:", aiPrompt);

    // 模拟 AI 处理时间
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 生成模拟的XML响应
    const xmlResponse = generateSampleResponse(prompt.value, selectedTemplate.value, selectedElement.value, fullPageHTML.value);
    console.log("AI返回的XML响应:", xmlResponse);

    // 解析XML响应
    const parsedResponse = parseAIResponse(xmlResponse);

    if (!parsedResponse.isValid) {
      message.error("AI响应格式错误: " + parsedResponse.error);
      return;
    }

    // 构建预览结果
    previewResult.value = {
      action: parsedResponse.action,
      description: parsedResponse.description,
      code: parsedResponse.code,
      usedPrompt: aiPrompt,
      templateType: selectedTemplate.value,
      xmlResponse: xmlResponse,
      isValid: parsedResponse.isValid,
    };
  } catch (error) {
    message.error("AI 处理失败，请重试");
    console.error("AI处理错误:", error);
  } finally {
    isProcessing.value = false;
  }
};

const simulateAIResponse = (promptText, element) => {
  const lowerPrompt = promptText.toLowerCase();

  if (lowerPrompt.includes("红色") || lowerPrompt.includes("颜色")) {
    return {
      type: "style",
      property: "color",
      value: "text-red-500",
      description: "将文字颜色改为红色",
      code: "element.className = element.className.replace(/text-\\w+-\\d+/g, '') + ' text-red-500'",
    };
  } else if (lowerPrompt.includes("蓝色")) {
    return {
      type: "style",
      property: "color",
      value: "text-blue-500",
      description: "将文字颜色改为蓝色",
      code: "element.className = element.className.replace(/text-\\w+-\\d+/g, '') + ' text-blue-500'",
    };
  } else if (lowerPrompt.includes("大") || lowerPrompt.includes("标题")) {
    return {
      type: "style",
      property: "size",
      value: "text-2xl font-bold",
      description: "增大字体并加粗",
      code: "element.className = element.className.replace(/text-\\w+/g, '').replace(/font-\\w+/g, '') + ' text-2xl font-bold'",
    };
  } else {
    return {
      type: "content",
      description: "修改元素内容",
      code: `element.textContent = "${promptText}"`,
    };
  }
};

const handleApply = () => {
  if (!previewResult.value || !selectedElement.value) return;

  try {
    // 应用修改
    if (previewResult.value.type === "style") {
      if (previewResult.value.property === "color") {
        // 移除现有颜色类并添加新的
        selectedElement.value.className = selectedElement.value.className.replace(/text-\w+-\d+/g, "").trim() + " " + previewResult.value.value;
      } else if (previewResult.value.property === "size") {
        selectedElement.value.className =
          selectedElement.value.className
            .replace(/text-\w+/g, "")
            .replace(/font-\w+/g, "")
            .trim() +
          " " +
          previewResult.value.value;
      }
    } else if (previewResult.value.type === "content") {
      selectedElement.value.textContent = prompt.value;
    }

    emit("apply-edit", previewResult.value);
    message.success("修改已应用");
    handleCancel();
  } catch (error) {
    message.error("应用修改失败");
  }
};

defineExpose({
  show,
});
</script>

<style lang="scss" scoped>
:deep(.ai-edit-modal) {
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }

  .ant-modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-bottom: none;
    padding: 20px 24px;

    .ant-modal-title {
      color: white;
      margin: 0;
    }
  }

  .ant-modal-close {
    color: white;

    &:hover {
      color: rgba(255, 255, 255, 0.8);
    }
  }

  .ant-modal-body {
    padding: 24px;
  }
}

:deep(.ant-input) {
  border-radius: 8px;
  border-color: #e1e5e9;
  transition: all 0.3s ease;

  &:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
  }
}

:deep(.ant-btn) {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
  }
}
</style>
