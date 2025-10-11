<template>
  <div v-show="fullPreviewVisable" class="fullpreview" :class="isFullPreview ? `fullPreviewEnable` : null">
    <div class="fullpreview-container">
      <div class="header" v-if="showHeader">
        <div class="title-container">
          <div class="title">
            <fileSvg :url="file?.filename" class="file-type" />
            <span>{{ fileName }}</span>
          </div>
        </div>

        <div class="btns">
          <a-tooltip placement="bottom" :arrow="false" color="#ffffff" trigger="click" overlayClassName="tooltip-com" v-model:open="downloadTooltipVisible">
            <template #title>
              <div class="custom-tooltip">
                <div
                  class="svg-tooltip"
                  @click="
                    handleFileDownload(file);
                    downloadTooltipVisible = false;
                  "
                >
                  <downloadSvgDown />
                  {{ $t("lemon.fullPreview.download") }}
                </div>
                <div
                  class="svg-tooltip"
                  v-if="canBeMd"
                  @click="
                    handleExportPDF();
                    downloadTooltipVisible = false;
                  "
                >
                  <pdfExportSvg />
                  {{ $t("lemon.fullPreview.exportToPDF") }}
                </div>

                <!-- <div class="line"></div> -->
                <!-- <div class="svg-tooltip"
                    @click="handleSaveToGoogleDrive(); downloadTooltipVisible = false">
                    <googleDriverSvg /> {{ $t('lemon.fullPreview.saveToGoogleDrive') }}
                </div> -->
              </div>
            </template>
            <button class="icon-bt">
              <downloadSvg />
            </button>
          </a-tooltip>

          <a-tooltip v-if="!isFullPreview" :arrow="false" overStyle="font-size:10px" overlayClassName="tooltip-tips">
            <template #title>
              <span class="tips-text">{{ $t("lemon.fullPreview.maximize") }}</span>
            </template>
            <button class="icon-bt" @click="isFullPreview = true">
              <maxMizeSvg />
            </button>
          </a-tooltip>
          <a-tooltip v-if="isFullPreview" :arrow="false" overStyle="font-size:10px" overlayClassName="tooltip-tips">
            <template #title>
              <span class="tips-text">{{ $t("lemon.fullPreview.minimize") }}</span>
            </template>
            <button class="icon-bt" @click="isFullPreview = false">
              <minMizeSvg />
            </button>
          </a-tooltip>

          <a-tooltip :arrow="false" overStyle="font-size:10px" overlayClassName="tooltip-tips">
            <template #title>
              <span class="tips-text">{{ $t("lemon.fullPreview.previous") }}</span>
            </template>
            <button class="icon-bt" @click="currentIndex--" :class="currentIndex > 0 ? null : 'disableBtn'">
              <leftSvg />
            </button>
          </a-tooltip>
          <a-tooltip :arrow="false" overStyle="font-size:10px" overlayClassName="tooltip-tips">
            <template #title>
              <span class="tips-text">{{ $t("lemon.fullPreview.next") }}</span>
            </template>
            <button class="icon-bt" @click="currentIndex++" :class="currentIndex < fileList.length - 1 ? null : 'disableBtn'">
              <rightSvg />
            </button>
          </a-tooltip>
          <a-tooltip placement="bottom" :arrow="false" color="#ffffff" trigger="click" overlayClassName="tooltip-com" v-model:open="moreOptionsTooltipVisible">
            <template #title>
              <div class="custom-tooltip more-tooltip">
                <div
                  class="svg-tooltip"
                  @click="
                    handleCopyContent(content);
                    moreOptionsTooltipVisible = false;
                  "
                >
                  <copySvg />
                  {{ $t("lemon.fullPreview.copy") }}
                </div>
                <div
                  class="svg-tooltip"
                  v-if="rendering && (canBeMd || canBeHtml || canBeDiff)"
                  @click="
                    rendering = false;
                    moreOptionsTooltipVisible = false;
                  "
                >
                  <codeSvg />
                  {{ $t("lemon.fullPreview.code") }}
                </div>
                <div
                  class="svg-tooltip"
                  v-if="(canBeMd && !rendering) || (canBeHtml && !rendering) || (canBeDiff && !rendering)"
                  @click="
                    rendering = true;
                    moreOptionsTooltipVisible = false;
                  "
                >
                  <eyeSvg />
                  {{ $t("lemon.fullPreview.preview") }}
                </div>
              </div>
            </template>
            <button class="icon-bt">
              <moreOptionsSvg />
            </button>
          </a-tooltip>
          <a-tooltip :arrow="false" overStyle="font-size:10px" overlayClassName="tooltip-tips">
            <template #title>
              <span class="tips-text">{{ $t("lemon.fullPreview.close") }}</span>
            </template>
            <button class="icon-bt icon-tip" @click="previewVisavleClose">
              <closeSvg />
            </button>
          </a-tooltip>
        </div>
      </div>

      <div class="content" :class="{ 'html-content': rendering && canBeHtml }">
        <!-- Loading-->
        <div v-if="contentLoading" style="height: 100%; display: flex; justify-content: center; align-items: center">
          <a-spin tip="loading ..." style="color: #8b8b8b" />
        </div>
        <!-- Markdown rendering -->
        <MarkDown v-else-if="rendering && canBeMd" :content="content" />
        <!-- Html rendering -->
        <template v-else-if="rendering && canBeHtml">
          <RenderComponent v-if="editable" :path="file.filepath" class="html-render-iframe" />
          <iframe v-else :srcdoc="content" class="html-render-iframe" frameborder="0"></iframe>
        </template>
        <!-- Diff rendering -->

        <DiffViewer
          v-else-if="rendering && canBeDiff"
          :key="`${file.filename}-${file.find?.substring(0, 20)}-${file.with?.substring(0, 20)}`"
          :filename="file.filename"
          :find="file.find"
          :with="file.with"
        />

        <!-- sandbox="allow-scripts" -->
        <!-- Source code rendering -->
        <CodeViewer v-else-if="canCodePreview" :file-path="file.filepath" :file-content="content" />
        <!-- office 文件预览 PDF Excel DOC DOCX-->
        <officePreview v-else-if="canOfficePreview" :filePath="file.filepath" />
        <!-- 无法预览的格式 -->
        <div v-else class="no-preview">
          <div class="detail">
            <div class="detail-info">
              <div class="icon">
                <!-- 预览图标 -->
                <fileSvg :url="file?.filepath" class="file-type" />
              </div>
              <div class="file-info">
                <div class="file-name">{{ file.filepath.split("/").pop() }}</div>
                <div class="file-type">{{ $t("lemon.fullPreview.fileTypePresentation") }}</div>
              </div>
            </div>
          </div>
          <div class="tips">
            {{ $t("lemon.fullPreview.cannotPreviewFormat") }}<br />
            {{ $t("lemon.fullPreview.downloadToView") }}
          </div>
          <a-button class="download-bt" @click="handleFileDownload(file)">
            <downloadSvg />
            <span class="text">{{ $t("lemon.fullPreview.download") }}</span>
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import emitter from "@/utils/emitter";
import { message } from "ant-design-vue";
// Import SVGs
import fileSvg from "@/components/fileClass/fileSvg.vue";
import downloadSvg from "@/assets/filePreview/download.svg";
import maxMizeSvg from "@/assets/filePreview/maxmize.svg";
import minMizeSvg from "@/assets/filePreview/minmize.svg";
import leftSvg from "@/assets/filePreview/left.svg";
import rightSvg from "@/assets/filePreview/right.svg";
import moreOptionsSvg from "@/assets/filePreview/moreOptions.svg";
import closeSvg from "@/assets/filePreview/close.svg";
import downloadSvgDown from "@/assets/fileClass/download.svg";
// import googleDriverSvg from '@/assets/fileClass/googleDriver.svg'
import pdfExportSvg from "@/assets/filePreview/pdfExport.svg";
import copySvg from "@/assets/filePreview/copy.svg";
import codeSvg from "@/assets/filePreview/code.svg";
import eyeSvg from "@/assets/filePreview/eye.svg";
// Import content rendering components
import MarkDown from "@/components/markdown/index.vue";
import CodeViewer from "@/components/file/index.vue";
import officePreview from "@/components/file/officePreview.vue";
import RenderComponent from "@/view/editor/render/index.vue";
import DiffViewer from "@/components/DiffViewer/index.vue";
import workspaceService from "@/services/workspace";
import { useChatStore } from "@/store/modules/chat";
import { storeToRefs } from "pinia";
import { viewList } from "@/utils/viewList";
import MarkdownIt from "markdown-it";
import html2pdf from "html2pdf.js";
import fileUtils from "@/utils/file";
import { useRoute } from "vue-router";
const route = useRoute();
const chatStore = useChatStore();
const editable = ref(false);
const editableFlag = import.meta.env.VITE_EDITABLE || "ON";
editable.value = editableFlag === "ON" && route.name !== "share" && route.name !== "preview";


const { agent, messages } = storeToRefs(chatStore);

const { t } = useI18n();

// Define states
const fullPreviewVisable = ref(false);
const file = ref({});
const rendering = ref(true);
const content = ref();
const contentLoading = ref(true);
const isFullPreview = ref(false);
const moreOptionsTooltipVisible = ref(false);
const downloadTooltipVisible = ref(false);
const canBeMd = ref(false);
const canBeHtml = ref(false);
const showHeader = ref(true);
const canBeDiff = ref(false);
const codePreviewType = ref([
  "js",
  "ts",
  "py",
  "json",
  "html",
  "htm",
  "css",
  "md",
  "xml",
  "java",
  "c",
  "cpp",
  "cc",
  "cxx",
  "h",
  "rb",
  "go",
  "sql",
  "yaml",
  "yml",
  "php",
  "sh",
  "bash",
  "cs",
  "rs",
  "kt",
  "scala",
  "pl",
  "swift",
  "r",
  "m",
  "dart",
  "lua",
]);
const officePreviewType = ref(["pdf", "xlsx", "xls", "docx", "pptx"]);
// Local file list
const fileList = ref([]);

watch(
  () => messages.value,
  (newValue) => {
    fileList.value = viewList.viewLocal(newValue, true);
  },
  { immediate: true }
);

const currentIndex = ref(-1);

watch(currentIndex, (newValue) => {
  if (currentIndex.value === -1) {
    return;
  }
  file.value = fileList.value[newValue];
});
// file name
const fileName = ref("");
//
watch(file, (newValue) => {
  //content is loading
  contentLoading.value = true;

  // 判断文件类型
  canBeDiff.value = newValue.type === "diff";
  canBeMd.value = newValue.filepath?.split(".").pop() === "md";
  canBeHtml.value = newValue.filepath?.split(".").pop() === "html";

  // 更新文件名
  fileName.value = newValue.filename || newValue.filepath?.split("/").pop() || "未知文件";
  fileName.value = fileName.value.split("\\").pop();

  // 准备内容
  if (canBeDiff.value) {
    // diff 类型：准备对比内容用于代码视图
    const findContent = newValue.find || "";
    const withContent = newValue.with || "";
    content.value = `--- 删除的内容 ---\n${findContent}\n\n+++ 添加的内容 +++\n${withContent}`;
  } else {
    // 判断是否为代码文件（直接检查文件扩展名）
    const fileExtension = newValue.filepath?.split(".").pop();
    if (codePreviewType.value.includes(fileExtension)) {
      // 代码文件：从服务器加载内容
      workspaceService.getFile(newValue.filepath).then((res) => {
        let resString = typeof res === "string" ? res : JSON.stringify(res);
        content.value = handleFileContent(resString);
      });
    }
  }

  // 设置渲染模式
  rendering.value = canBeMd.value || canBeHtml.value || canBeDiff.value;

  // loaded
  contentLoading.value = false;
});

// file content process
function handleFileContent(content) {
  //this function is process differ file content,The output content format may not be correct
  // markdown file process
  if (content.startsWith("```markdown")) {
    content = content.replace("```markdown", "").replace("```", "");
  }
  // html file process: `&lt;` to `<` ;  `&gt;` to `>`
  content = content.replaceAll("&lt;", "<").replaceAll("&gt;", ">");
  content = processMdContent(content);
  return content;
}

function processMdContent(content) {
  // code process markdown
  content = content.replaceAll("````markdown", "").replaceAll("````", "");
  content = content.replace(/```markdown\n([\s\S]*)\n```/, "$1");
  return content;
}

// Check if file can be code format previewed
const canCodePreview = computed(() => {
  // Diff 类型也可以显示代码视图
  if (canBeDiff.value) {
    return true;
  }
  return codePreviewType.value.includes(file.value.filepath?.split(".").pop());
});
//
const canOfficePreview = computed(() => {
  return officePreviewType.value.includes(file.value.filepath?.split(".").pop());
});

// Copy content
function handleCopyContent(content) {
  if (!content || content.trim() === "") {
    message.warning(t("lemon.fullPreview.noContentToCopy"));
    return;
  }

  if (!navigator.clipboard) {
    message.error(t("lemon.fullPreview.clipboardNotSupported"));
    return;
  }

  navigator.clipboard
    .writeText(content)
    .then(() => {
      message.success(t("lemon.fullPreview.contentCopied"));
    })
    .catch((err) => {
      // console.error('Copy failed:', err)
      message.error(t("lemon.fullPreview.copyFailed"));
    });
}

// Download file
async function handleFileDownload(file) {
  console.log("handleFileDownload", file);
  fileUtils.handleFileDownload(file);
}

function extractConversationPath(filePath) {
  // Find the index of "Conversation"
  const startIndex = filePath.indexOf("Conversation");
  // If "Conversation" is not found, return null or an appropriate error message
  if (startIndex === -1) {
    return null;
  }
  // Slice the string from the start index to the end
  return filePath.slice(startIndex);
}
const openAIEdit = () => {
  const absolutePath = file.value.filepath;
  const filepath = extractConversationPath(absolutePath);
  window.open(`/editor?path=${filepath}`);
};

// TODO 渲染页面有问题：文本会被页面分割
function handleExportPDF() {
  const md = new MarkdownIt();
  const renderedMarkdown = md.render(content.value);
  const element = document.createElement("div");
  element.innerHTML = renderedMarkdown;
  element.style.padding = "20px";
  element.style.fontFamily = "Arial, sans-serif";

  // Add global pagination control
  element.style.cssText += `
        page-break-inside: avoid;
        break-inside: avoid;
    `;

  // Apply pagination control to specific elements
  const elements = element.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol, li, div");
  elements.forEach((el) => {
    el.style.cssText += `
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-before: auto;
            page-break-after: auto;
            margin-bottom: 10px;
        `;
  });

  const opt = {
    margin: 10,
    filename: fileName.value.split(".")[0] + ".pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      windowHeight: 842, // A4 height in pixels (297mm * 2.83)
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li"],
    },
  };

  html2pdf().set(opt).from(element).save();
  message.info(t("lemon.fullPreview.exportPDFPending"));
}

emitter.on("fullPreviewVisable", (val) => {
  emitter.emit("preview-close");
  console.log("messages.value", val);
  fileList.value = viewList.viewLocal(messages.value, true); // loading again TODO:
  currentIndex.value = fileList.value.findIndex((item) => item.id === val.id);
  //做一个处理 如果currentIndex.value 为-1 则 把数据 添加到fileList.value 中
  if (currentIndex.value === -1) {
    fileList.value.push(val);
    currentIndex.value = fileList.value.length - 1;
  }
  console.log("fileList.value", fileList.value, currentIndex.value);
  fullPreviewVisable.value = true;
});

//预览文件
emitter.on("fullPreviewVisable-open", (val) => {
  showHeader.value = true;
  fileList.value = [val];
  currentIndex.value = 0;
  fullPreviewVisable.value = true;
  file.value = val;
});

emitter.on("fullPreviewVisable-close", () => {
  fullPreviewVisable.value = false;
  fileList.value = [];
  currentIndex.value = -1;
  contentLoading.value = true;
});

const previewVisavleClose = async () => {
  isFullPreview.value = false;
  fullPreviewVisable.value = false;
  emitter.emit("fullPreviewVisable-close");
};
</script>

<style lang="scss">
.fullpreview {
  width: 100%;
  height: 100%;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  outline: none;
  border: 0 solid #e5e7eb;
  z-index: 2;

  .fullpreview-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
    flex-direction: column;
    display: flex;
    border-left: #0000000f 1px solid;
    background-color: #f8f8f7;

    .header {
      display: flex;
      padding-top: 0.6rem;
      padding-bottom: 0.6rem;
      flex-direction: row;
      padding-left: 1rem;
      padding-right: 1rem;
      border-bottom: #0000000f 1px solid;
      justify-content: space-between;
      align-items: center;

      .title-container {
        padding: 0;
        gap: 1rem;
        flex: 1 1 0%;
        width: max-content;

        .title {
          display: flex;
          align-items: center;
          flex-direction: row;
          color: #535350;
          font-weight: 500;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          gap: 0.25rem;

          span {
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
          }
        }
      }

      .btns {
        padding-top: 0;
        padding-bottom: 0;
        width: auto;
        display: flex;
        flex-direction: row;
        gap: 0.5rem;

        .icon-bt {
          border-radius: 0.5rem;
          cursor: pointer;
          user-select: none;
          border: #00000000;
          color: #535350;
          display: flex;
          justify-items: center;
          align-items: center;
          background-color: unset;
        }

        .icon-bt:hover {
          background-color: #37352f0a;
        }
      }
    }

    .content {
      padding: 0.5rem;
      width: 100%;
      height: 100%;
      overflow-y: auto;

      &.html-content {
        padding: 0;
      }

      .file-content-container {
        background-color: #00000000 !important;
      }

      .no-preview {
        display: flex;
        gap: 1.5rem;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        align-content: center;
        height: 100%;
        width: 100%;
        flex: 1 1 0%;

        .download-bt {
          display: flex;
          border-radius: 10px;
          cursor: pointer;
          user-select: none;
          border-color: #0000001f;
          box-shadow: none;
          background-color: #0081f2;
          color: white;
          justify-items: center;
          align-items: center;
          justify-content: center;
        }

        .detail {
          display: flex;
          align-items: center;
          flex-direction: row;

          .detail-info {
            display: flex;
            flex-direction: row;
            padding: 0.5rem;
            background-color: #37352f0a;
            border-radius: 10px;
            gap: 0.375rem;
            align-items: center;
            width: fit-content;

            .file-info {
              gap: 0.125rem;
              display: flex;
              flex-direction: column;
              align-items: center;

              .file-name {
                color: #34322d;
                font-size: 0.875rem;
                line-height: 1.25rem;
                overflow: hidden;
                white-space: nowrap;
              }

              .file-type {
                color: #858481;
                font-size: 0.75rem;
                line-height: 1rem;
                overflow: hidden;
                white-space: nowrap;
              }
            }
          }
        }

        .tips {
          color: #858481;
          font-size: 0.875rem;
          line-height: 1.25rem;
          text-align: center;
        }
      }

      .html-render-iframe {
        display: block; // 确保 iframe 是块级元素
        width: 100%;
        height: 100%; // 需要确保父容器 .content 有高度
        border: none; // 再次确认无边框
      }
    }
  }
}

.fullPreviewEnable {
  position: absolute;
  z-index: 1000;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 100% !important;

  .fullpreview-container {
    .content {
      // max-width: 768px;
      // margin: auto;
    }
  }
}

.custom-tooltip {
  box-sizing: border-box;
  outline: none;

  .svg-tooltip {
    color: #535350;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    border-radius: 8px;
    gap: 0.75rem;
    align-items: center;
    cursor: pointer;
    display: flex;
    width: 100%;
  }

  .line {
    border-bottom: #0000000f 1px solid;
    margin: 1px;
  }

  .svg-tooltip:hover {
    background-color: #37352f0f;
  }
}

.more-tooltip {
  width: 138px;
}

.tooltip-com {
  padding: 0 !important;
  border: #0000001f 1px solid;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow:
    0 0 #0000,
    0 0 #0000,
    0 4px 11px 0px #00000014;

  .ant-tooltip-inner {
    padding: 0.25rem !important;
  }
}

.tooltip-tips {
  padding: 0 !important;

  .ant-tooltip-inner {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    display: flex;
    justify-items: center;
    align-items: center;
  }

  font-size: 0.75rem !important;
}

.tips-text {
  display: flex;
  justify-content: center;
  align-content: center;
}

.disableBtn {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .fullpreview {
    .fullpreview-container {
      .header {
        .title-container {
          width: 50%;
          .title {
            .file-icon {
              min-width: 32px;
              min-height: 32px;
            }
            span {
              text-overflow: ellipsis;
              overflow: hidden;
              white-space: nowrap;
            }
          }
        }
      }
    }
  }
}
</style>

<style scoped></style>
