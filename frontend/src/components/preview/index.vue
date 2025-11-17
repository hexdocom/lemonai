<template>
  <div class="preview-container" v-show="preview">
    <!-- 头部标题栏 -->
    <div class="preview-header">
      <div class="title-t">
        <div class="title">
          {{ $t('lemon.preview.title') }}
        </div>
        <div class="icon-ct">
          <div class="sandbox-content" v-if="showVsCode">
            <a-button type="primary" @click="OpenVsCode" class="vscode-btn item">
              <vscodeSvg class="icon"/>
              {{ $t('lemon.preview.openVsCode') }}
            </a-button>
          </div>
          <div class="close-btn" @click="handleClose">
            <CloseOutlined/>
          </div>
        </div>
      </div>
      <div class="title-status">
        <div class="icon">
          <component :is="typeIcon"/>
        </div>
        <div class="status">
          <div class="use-title">
            {{ $t('lemon.preview.using') }} <span class="typeDescription">{{ typeDescription }}</span>
          </div>
          <div class="commonding">
            {{ $t('lemon.preview.performing') }} <span class="typeDetail">{{ typeDetail }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="preview-content">
      <div class="main-content">
        <div class="title">
          <span>{{ fileName.split('\\').pop() }}</span>
        </div>
        <div class="main-content-main">
          <!-- Terminal展示区 -->
           
          <Terminal class="terminal" v-if="type === 'terminal_run'" :isPreview="true" v-model:content="fileContent"/>
          <!-- 浏览器展示 -->
          <BrowserImage v-else-if="type === 'browser'" :content="browserImageData"/>
          <!-- 文件展示 -->
          <FileContent v-else-if="(((type === 'write_code' || type === 'read_file') && fileName ) || type === 'mcp_tool' || type === 'document_query' )" :filePath="fileName"
                       :file-content="fileContent"/>
          <!-- 浏览器搜索结果-->
          <searchResults v-else-if="type === 'web_search'" :search-results="browserContent"/>
          <FileContent v-else :filePath="fileName" :file-content="fileContent"/>
        </div>
        <div class="time-content">
          <div class="btns">
            <a-popover>
              <template #content>
                <p>{{ $t('lemon.preview.previousStep') }}</p>
              </template>
              <StepBackwardOutlined class="item" @click="msgQueryIDSuMinus" :class="{ disabled: msgQueryID == 0 }"/>
            </a-popover>
            <a-popover>
              <template #content>
                <p>{{ $t('lemon.preview.nextStep') }}</p>
              </template>
              <StepForwardOutlined class="item" @click="msgQueryIDAdd"
                                   :class="{ disabled: !(msgQueryID < messageQueue.length - 1) }"/>
            </a-popover>
          </div>
          <div class="time-slider">
            <div class="code-box-demo">
              <a-slider v-model:value="currentTime" :min="minTime" :max="maxTime" :step="1"
                        :tipFormatter="formatTooltip" @change="handleTimeChange"/>
            </div>
            <div class="realtime-tips">
              <div class="realtime-dot" :class="isRealTime ? 'realon' : 'realoff'"></div>
              <span>{{ $t('lemon.preview.realtime') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch, onMounted, onUnmounted, markRaw} from 'vue';
import {CloseOutlined, CodeSandboxOutlined, StepBackwardOutlined, StepForwardOutlined} from '@ant-design/icons-vue';
import vscodeSvg from '@/assets/svg/vscode.svg';
import Terminal from '@/components/terminal/index.vue';
import BrowserImage from '@/components/browser/image.vue';
import FileContent from '@/components/file/index.vue';
import emitter from '@/utils/emitter';
import workspaceService from '@/services/workspace';
import Browser from '@/assets/message/browse.svg';
import Edit from '@/assets/message/edit.svg';
import Bash from '@/assets/message/bash.svg';
import Tools from '@/assets/message/tools.svg';
import {storeToRefs} from 'pinia';
import {useI18n} from 'vue-i18n';
import files from '@/services/workspace';
import searchResults from '@/components/browser/searchResults.vue';
import {viewList} from '@/utils/viewList';
import {useChatStore} from '@/store/modules/chat';
import {message} from 'ant-design-vue';

import { useRoute } from 'vue-router'
const route = useRoute();

// 移动端检测
const isMobile = ref(false);
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const chatStore = useChatStore();
const {agent, messages} = storeToRefs(chatStore);
const {t} = useI18n();

const msgQueryID = ref(-1);
const previewMessage = ref(null);
const sandboxVisible = ref(false);
const preview = ref(false);
const autoForward = ref(false);
const isRealTime = ref(false);
const messageQueue = computed(() => {
  return viewList.viewRealTime(messages);
});

const svgHash = {
  browser: markRaw(Browser),
  write_code: markRaw(Edit),
  terminal_run: markRaw(Bash),
  read_file: markRaw(Edit),
  web_search: markRaw(Browser),
};

const type = ref('');
const typeIcon = ref(null);
const typeDescription = ref('');
const typeTitle = ref('');
const typeDetail = ref('');
const fileName = ref('');
const fileContent = ref('');
const browserContent = ref('');
const browserImageData = ref('');

const showVsCode = computed(() => {
  // 判断当前路由是不是 share 且不是移动端
  return route.name !== 'share' && !isMobile.value;
});

const msgQueryIDSuMinus = () => {
  if (msgQueryID.value === 0) {
    return;
  }
  msgQueryID.value -= 1;
};

const msgQueryIDAdd = () => {
  if (msgQueryID.value >= messageQueue.value.length - 1) {
    return;
  }
  msgQueryID.value += 1;
};

watch(msgQueryID, (newValue) => {
  if (newValue === -1) {
    previewMessage.value = null;
    type.value = '';
    fileName.value = '';
    fileContent.value = '';
  } else {
    previewMessage.value = messageQueue.value[newValue];
    handleMessageUpdate(previewMessage.value);
    currentTime.value = previewMessage.value?.timestamp || -1;
  }
});

// Utility
function handlemdFile(content) {
  if (content?.startsWith('```')) {
    content = content.replace('```markdown', '').replace('```', '');
    const index = content.indexOf('\n');
    if (index !== -1) {
      content = content.substring(index + 1);
    }
  }
  return content || '';
}

async function handleMessageUpdate(newValue) {
  console.log('handleMessageUpdate:', JSON.stringify(newValue, null, 2));
  if (!newValue || !newValue.meta || !newValue.meta.action_type) {
    type.value = '';
    fileName.value = '';
    fileContent.value = '';
    typeDescription.value = '';
    typeTitle.value = '';
    typeDetail.value = '';
    return;
  }

  const actionType = newValue.meta.action_type;
  type.value = actionType;
  typeIcon.value = svgHash[actionType] || markRaw(Tools);
  let result = newValue.content || '';
  const maxLength = 65;
  if (result && result.length > maxLength) {
    result = result.slice(0, maxLength) + '...';
  }
  if (newValue.meta.action_type === 'terminal_run'){
    typeDetail.value = result[0];
  }else {
    typeDetail.value = result;
  }

  switch (actionType) {
    case 'browser':
      typeDescription.value = t('lemon.preview.browser');
      typeTitle.value = t('lemon.preview.browsing');
      browserImageData.value = newValue.meta.json.browser_history_screenshot || '';
      //TODO sequence browser screenshot display
      let lengthBrowserHistory = newValue.meta.json.browser_history.length;
      fileName.value = newValue.meta.json.browser_history[lengthBrowserHistory-1].url.split('?')[0] || '';
      break;
    case 'write_code':
      typeDescription.value = t('lemon.preview.editor');
      typeTitle.value = t('lemon.preview.editingFile');
      fileName.value = newValue.meta?.filepath ? newValue.meta.filepath.split('/').pop() || '' : '';
      if (!newValue.meta?.filepath) {
        console.warn(`Missing filepath in write_code meta:`, newValue);
      }
      if (fileName.value.endsWith('todo.md')) {
        fileContent.value = handlemdFile(newValue.meta?.content);
      } else if (newValue.meta?.filepath) {
        try {
          const res = await files.getFile(newValue.meta.filepath);
          fileContent.value = typeof res === 'string' ? res : res && typeof res === 'object' ? JSON.stringify(res, null, 2) : '';
        } catch (error) {
          console.error(`Failed to fetch file content for ${newValue.meta.filepath}:`, error);
          fileContent.value = '';
        }
      } else {
        fileContent.value = '';
      }
      break;
    case 'read_file':
      typeDescription.value = t('lemon.preview.editor');
      typeTitle.value = t('lemon.preview.readingFile');
      fileName.value = newValue.meta?.filepath ? newValue.meta.filepath.split('/').pop() || '' : '';
      if (!newValue.meta?.filepath) {
        console.warn(`Missing filepath in read_file meta:`, newValue);
      }
      if (fileName.value.endsWith('todo.md')) {
        fileContent.value = handlemdFile(newValue.meta?.content);
      } else if (newValue.meta?.filepath) {
        try {
          const res = await files.getFile(newValue.meta.filepath);
          fileContent.value = typeof res === 'string' ? res : res && typeof res === 'object' ? JSON.stringify(res, null, 2) : '';
        } catch (error) {
          console.error(`Failed to fetch file content for ${newValue.meta.filepath}:`, error);
          fileContent.value = '';
        }
      } else {
        fileContent.value = '';
      }
      break;
    case 'terminal_run':
      typeDescription.value = t('lemon.preview.terminal');
      typeTitle.value = t('lemon.preview.executingCommand');
      fileName.value = 'shell1';
      fileContent.value = newValue.content || '';
      break;
    case 'web_search':
      typeDescription.value = t('lemon.preview.search');
      typeTitle.value = t('lemon.preview.searching');
      fileName.value = t('lemon.preview.search');
      browserContent.value = newValue.meta.json || [];
      fileContent.value = '';
      break;
    case 'document_query':
      typeDescription.value = t('lemon.preview.search');
      typeTitle.value = t('lemon.preview.searching');
      fileName.value = t('lemon.preview.search');
      fileContent.value = newValue.meta.content || '';
      break;
    case 'mcp_tool':
      typeDescription.value = 'mcp'
      typeTitle.value = '';
      // 截取第一个 __ 前的内容
      fileName.value = newValue.content.split("__")[0];
      fileContent.value = newValue.meta.content || '';
      console.log("fileContent.value ",newValue.content);
      break;
    // case "browser":
    //   typeDescription.value = t('lemon.preview.search');
    //   typeTitle.value = t('lemon.preview.searching');
    //   fileName.value = t('lemon.preview.search');
    //   browserImage.value = newValue.meta.json.browser_history_screenshot || '';
    //   console.log('browserImage', newValue.meta.json.browser_history_screenshot );
    //   break;
    default:
      typeDescription.value = 'Tools';
      typeTitle.value = 'Tools';
      fileName.value = '';
      fileContent.value = newValue.meta.content || '';
  }
}

onMounted(() => {
  emitter.on('preview-close', () => {
    msgQueryID.value = -1;
    preview.value = false;
  });
  emitter.on('preview', ({message}) => {
    //修改css
    document.querySelector('.time-content').style.display = 'flex';
    if(document.querySelector('.sandbox-content')){
      document.querySelector('.sandbox-content').style.display = 'flex';
    }
    // 过滤message为failure的消息
    emitter.emit('fullPreviewVisable-close');
    console.log('messageQueue', messageQueue);
    console.log('message', message);
    const index = messageQueue.value.findIndex((item) => item.uuid === message.uuid);
    console.log('messageQueue_index', index);
    // "status": "failure",
    if (index !== -1) {
      msgQueryID.value = index;
      currentTime.value = message.timestamp || -1;
      preview.value = true;
    } else {
      console.warn('Message not found in messageQueue:', message);
    }
  });
  //新增加一个方法 直接预览 传入的内容
  emitter.on('preview-new', ({message}) => { 
    preview.value = true;
    //用js 隐藏头部 .preview-header
    // document.querySelector('.preview-header').style.display = 'none';
    // .time-content
    document.querySelector('.time-content').style.display = 'none';
    // .sandbox-content
    document.querySelector('.sandbox-content').style.display = 'none';
    //处理一下 message meta.action_type;
    console.log('preview-new message', message);
    //sandbox-content
    //深拷贝
    let new_message = JSON.parse(JSON.stringify(message));
    //判断 如果 meta.json 的项 包含 url 则把 action_type 设置为 web_search 否则为 document_query
    if (new_message.meta.json && new_message.meta.json.length>0 && new_message.meta.json[0].url) {
      new_message.meta.action_type = 'web_search';
    } else {
      new_message.meta.action_type = 'document_query';
    }
    handleMessageUpdate(new_message);
  });
});

onUnmounted(() => {
  msgQueryID.value = -1;
  emitter.off('preview-close');
  emitter.off('preview');
});

const handleClose = () => {
  msgQueryID.value = -1;
  preview.value = false;
  // 通知其他组件预览已关闭
  emitter.emit('preview-close', false);
};
const props = defineProps({
  title: {
    type: String,
    default: 'lemon',
  },
});

const formatTooltip = (value) => {
  const date = new Date(value || 0);
  return date.toISOString().replace('T', ' ').split('.')[0];
};

const OpenVsCode = async () => {
  try {
    const res = await workspaceService.getVsCodeUrl(chatStore.conversationId);
    window.open(res.url);
  } catch (error) {
    console.error('Failed to open VSCode:', error);
    message.error('无法打开 VSCode，请检查 runtime_type 并稍后重试。');
  }
};
watch(() => chatStore.list.find((c) => c.conversation_id == chatStore.chat?.conversation_id)?.status, (newValue) => {
  isRealTime.value = newValue === 'running';
});

const minTime = computed(() => {
  return messageQueue.value.length === 0 ? 0 : Math.floor(new Date(messageQueue.value[0].timestamp).getTime());
});
const currentTime = ref(-1);
const maxTime = computed(() => {
  isRealTime.value = chatStore.list.find((c) => c.conversation_id == chatStore.chat?.conversation_id)?.status  == 'running';
  if (isRealTime.value && messageQueue.value.length > 0) {
    currentTime.value = Math.floor(new Date(messageQueue.value[messageQueue.value.length - 1].timestamp).getTime());
    msgQueryID.value = messageQueue.value.length - 1;
  }
  return messageQueue.value.length === 0 ? 0 : Math.floor(new Date(messageQueue.value[messageQueue.value.length - 1].timestamp).getTime());
});

const handleTimeChange = (newTime) => {
  const targetTimestamp = newTime;
  if (!messageQueue.value || messageQueue.value.length === 0) {
    return;
  }
  let closestIndex = -1;
  let minDifference = Infinity;
  messageQueue.value.forEach((message, index) => {
    const messageTimestamp = new Date(message.timestamp).getTime();
    const difference = Math.abs(messageTimestamp - targetTimestamp);
    if (difference < minDifference) {
      minDifference = difference;
      closestIndex = index;
    }
  });
  if (closestIndex === messageQueue.value.length - 1 && isRealTime.value) {
    autoForward.value = true;
  } else {
    autoForward.value = false;
  }
  if (closestIndex !== -1) {
    msgQueryID.value = closestIndex;
  }
};
</script>


<style lang="scss" scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  margin: 13px 13px 13px 0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: #e7dada 1px solid;
  z-index: 12;

  .preview-header {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-bottom: 1px solid #eee;

    .title-t {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .title {
        font-weight: 500;
        color: #34322d;
        font-size: 1rem;
        line-height: 22px;
      }

      .icon-ct {
        display: flex;
        align-items: center;
        gap: 10px;

        .sandbox-btn {
          cursor: pointer;
          padding: 4px;

          &:hover {
            opacity: 0.8;
          }

          border-right: #eee 1px solid;
          padding-right: 10px;
        }

        .close-btn {
          cursor: pointer;
          padding: 4px 8px;

          &:hover {
            opacity: 0.8;
            background-color: #0000000a;
            border-radius: 8px;
          }
        }
      }
    }

    .title-status {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-direction: row;
      //width: 100%;

      .icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background-color: #eceaea;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 28px;
          height: 28px;
        }
      }

      .status {
        //
        display: flex;
        flex-direction: column;
        max-width: calc(100% - 50px);

        .use-title {
          color: #858481;
          font-size: 12px;

          .typeDescription {
            color: #535350;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
          }
        }

        .commonding {
          color: #535350;
          font-size: 12px;
          padding-top: 3px;
          padding-bottom: 3px;
          padding-left: 10px;
          padding-right: 10px;
          background-color: #37352f0a;
          border-color: #0000000a;
          border-width: 1px;
          //text-overflow: ellipsis;
          align-items: center;
          border-radius: 10px;
          display: inline-flex; /* 使用 inline-flex 自适应内容宽度 */
          //justify-content: center;
          overflow: hidden;
          max-width: 100%; /* 不超过父元素宽度 */
          .typeDetail {
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            flex: 1 1 0%;
            //flex: 1;
            //max-width: 500px; /* 不超过父元素宽度 */

            //min-width: 0;
            margin-left: .25rem;
          }
        }
      }
    }
  }

  .preview-content {
    display: flex;
    flex-direction: column;
    flex: 9;
    height: 100%;
    padding: 14px;
    overflow-y: auto;

    .main-content {
      flex: 15;
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      background-color: #f8f8f7;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      border: #e7dada 1px solid;
      overflow: hidden;

      .title {
        display: flex;
        font-size: 14px;
        min-height: 36px;
        justify-content: center;
        border-bottom: #e7dada 1px solid;
        align-items: center;

        span {
          color: #858481;
        }
      }

      .main-content-main {
        flex: 12;
        overflow: hidden;
      }

      .time-content {
        border-top: #e7dada 1px solid;
        background-color: #fff;
        display: flex;
        flex-direction: row;
        padding: 0px 1rem;
        align-items: center;
        flex: 1;

        .btns {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex: 1;

          .item {
            cursor: pointer;
            padding: 4px;
            color: #464646;
          }

          .item:hover {
            background-color: #fdfdfd;
            border-radius: 5px;
            opacity: 0.8;
          }

          .disabled {
            color: #d9d9d9;
            cursor: not-allowed;
            pointer-events: none;
          }
        }

        .time-slider {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex: 7;

          .code-box-demo {
            flex: 9;
          }

          .realtime-tips {
            margin-left: 20px;
            flex: 2;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: start;

            span {
              width: max-content;
              font-size: .875rem;
              line-height: 1.25rem;
              gap: .25rem;
            }

            .realtime-dot {
              margin-right: 10px;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              border: #a4a1a1 1px solid;
            }

            .realon {
              background-color: #25ba3b;
            }

            .realoff {
              background-color: #858481;
            }
          }
        }
      }
    }

    .main-last {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 18px;
      color: #a4a1a1;
      margin-top: 15px;
      flex-direction: column;
      background-color: #f8f8f7;
      border: #e7dada 1px solid;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }
  }
}

.vscode-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 2px 10px !important;
  border-radius: 8px;
  cursor: pointer;
  background-color: #ffffff;
  box-shadow: none !important;
  color: #34322D;
  gap: 5px;

  .icon {
    // margin-right: 10px;
    width: 32px;
    height: 32px;
  }
}

.vscode-btn:hover {
  background-color: #f8f8f8;
  color: #34322D;
}

.container {
  margin: 0px !important;
  box-shadow: none !important;
  border: none !important;
  border-radius: 0px !important;
  background-color: unset !important;
}

:deep(.terminal-header) {
  display: none !important;
}

:deep(.xterm-viewport) {
  background-color: unset !important;
}

:deep(.xterm-rows) {
  color: #34322D !important;
}

:deep(.xterm-selection div) {
  background-color: unset !important;
}
</style>