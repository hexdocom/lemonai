<template>
  <div class="chat-input">
    <div class="input-wrapper">
      <div class="input-area">
        <div style="overflow: auto; width: 100%; min-width: 0">
          <div class="upload-fileList">
            <div class="upload-fileList-item" v-for="(file, index) in fileList" :key="index">
              <fileSvg :url="file.name" :is-update="true" class="file-icon" />
              <div style="min-width: 0; width: 100%">
                <div style="display: flex; width: 100%; align-items: center">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="delete-button" @click="handleDelete(file)">
                    <deleteFile />
                  </div>
                </div>
                <div>
                  <div class="file-size">{{ formatFileSize(file.size) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="input-container">
          <a-textarea class="input-textarea" v-model:value="messageText" :placeholder="placeholder"
            :auto-size="{ minRows: 2, maxRows: 8 }" @keydown="keydown" />
          <div class="input-actions">
            <div class="left-actions">
              <a-upload v-model:file-list="fileList" :before-upload="beforeUpload" :show-upload-list="false">
                <a-button type="text" class="upload-button">
                  <template #icon>
                    <PaperClipOutlined />
                  </template>
                </a-button>
              </a-upload>
              <a-select class="model-select" @change="changeModel" v-model:value="selectedModel"
                :placeholder="$t('lemon.input.chooseModel')" style="width: 200px" :options="groupedOptions"
                optionLabelProp="label" :fieldNames="{ label: 'label', value: 'value', options: 'options' }">
                <template #option="{ label, value, logo_url }">
                  <div style="display: flex; align-items: center">
                    <img v-if="logo_url" :src="logo_url" alt="logo"
                      style="width: 20px; height: 20px; margin-right: 8px" />
                    <span>{{ label }}</span>
                  </div>
                </template>
              </a-select>

              <a-dropdown :trigger="['click']" placement="top">
                <a-button class="mcp-button" :class="{ 'mcp-button-active': selectedMcpServerIds.length > 0 }">
                  <template #icon>
                    <CloudServerOutlined />
                  </template>
                  MCP
                </a-button>
                <template #overlay>
                  <a-menu :selectedKeys="mcpMenuSelectedKeys" multiple class="mcp-server-menu"
                    @click="handleMcpMenuClick">
                    <a-menu-item key="disable">
                      <span>不启用 MCP</span>
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item v-for="server in mcpServers" :key="server.id" class="mcp-server-item">
                      <span>{{ server.name }}</span>
                      <CheckOutlined v-if="selectedMcpServerIds.includes(server.id)" class="check-icon" />
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
            <a-button v-if="!messageStatus" @click="handleSend" class="send-button" :disabled="!messageText">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16" fill="#fff">
                  <path
                    d="M7.91699 15.0642C7.53125 15.0642 7.22119 14.9397 6.98682 14.6907C6.75244 14.4465 6.63525 14.1218 6.63525 13.7166V6.39966L6.77441 3.34546L7.48486 3.89478L5.62451 6.12134L3.99121 7.76196C3.87402 7.87915 3.73975 7.97681 3.58838 8.05493C3.44189 8.13306 3.271 8.17212 3.07568 8.17212C2.73389 8.17212 2.4458 8.05981 2.21143 7.83521C1.98193 7.60571 1.86719 7.3103 1.86719 6.94897C1.86719 6.60229 1.99902 6.29712 2.2627 6.03345L6.97949 1.30933C7.0918 1.19214 7.2334 1.10181 7.4043 1.03833C7.5752 0.969971 7.74609 0.935791 7.91699 0.935791C8.08789 0.935791 8.25879 0.969971 8.42969 1.03833C8.60059 1.10181 8.74463 1.19214 8.86182 1.30933L13.5786 6.03345C13.8423 6.29712 13.9741 6.60229 13.9741 6.94897C13.9741 7.3103 13.8569 7.60571 13.6226 7.83521C13.3931 8.05981 13.1074 8.17212 12.7656 8.17212C12.5703 8.17212 12.397 8.13306 12.2456 8.05493C12.0991 7.97681 11.9673 7.87915 11.8501 7.76196L10.2095 6.12134L8.34912 3.89478L9.05957 3.34546L9.19141 6.39966V13.7166C9.19141 14.1218 9.07422 14.4465 8.83984 14.6907C8.60547 14.9397 8.29785 15.0642 7.91699 15.0642Z"
                    fill="var(--icon-onblack)"></path>
                </svg>
              </template>
            </a-button>
            <!-- stop button -->
            <button v-else class="stop-button" @click="handleStop">
              <div></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, h, computed, watch } from "vue";
import { PaperClipOutlined, SendOutlined, CloudServerOutlined, CheckOutlined } from "@ant-design/icons-vue";
import { useChatStore } from "@/store/modules/chat";
import emitter from "@/utils/emitter";
import mcpService from "@/services/mcp";
import fileSvg from "@/components/fileClass/fileSvg.vue";
import deleteFile from "@/assets/message/deleteFile.svg";
import files from "@/services/files";
import modelService from "@/services/default-model-setting";
import searchEngineService from "@/services/search-engine";
import { notification } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import {checkDockerInstall,
    checkDockerRunning,
    checkDockerEnvironmentReady} from '@/utils/docker.js'
const { t } = useI18n();
import { message } from "ant-design-vue";
import { useRoute, useRouter } from "vue-router";
const router = useRouter();

import { storeToRefs } from "pinia";
import { useUserStore } from "@/store/modules/user.js";
const userStore = useUserStore();
const { user, membership, points } = storeToRefs(userStore);

const chatStore = useChatStore();
const messageText = ref("");
const placeholder = ref(t("lemon.welcome.placeholder"));
const currentMode = ref("text");
const fileList = ref([]);
const selectedModel = ref(null);
const modelList = ref([]); // ✅ 改为响应式

const emit = defineEmits(["send"]);

const mcpServers = ref([]);
const selectedMcpServerIds = ref([]);

const fetchMcpServers = async () => {
  try {
    const servers = await mcpService.activate_servers();
    if (Array.isArray(servers)) {
      mcpServers.value = servers;
    }
  } catch (error) {
    console.error("Error fetching MCP servers:", error);
  }
  selectedMcpServerIds.value = JSON.parse(localStorage.getItem("selectedMcpServerIds") || "[]");
};

const mcpMenuSelectedKeys = computed(() => {
  if (selectedMcpServerIds.value.length === 0) {
    return ["disable"];
  }
  return selectedMcpServerIds.value;
});

const handleMcpMenuClick = ({ key }) => {
  if (key === "disable") {
    selectedMcpServerIds.value = [];
    return;
  }
  const index = selectedMcpServerIds.value.indexOf(key);
  if (index !== -1) {
    selectedMcpServerIds.value.splice(index, 1);
  } else {
    selectedMcpServerIds.value.push(key);
  }
  localStorage.setItem("selectedMcpServerIds", JSON.stringify(selectedMcpServerIds.value));
};

const groupedOptions = computed(() => {
  const groups = {};
  modelList.value.forEach((model) => {
    const group = model.platform_name || "";
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push({
      label: model.model_name,
      value: model.id,
      logo_url: model.logo_url,
    });
  });

  let result = Object.entries(groups).map(([group, options]) => ({
    label: group,
    options,
  }));
  // let Lemon platform at first
  const indexLemon = result.findIndex(item => item.label === 'Lemon');
  if (indexLemon !== -1) {
    result.unshift(result.splice(indexLemon, 1)[0]);
  }
  return result
});

const changeModel = async (modelId) => {
  let model = modelList.value.find((model) => model.id == modelId);
  console.log("model", model);
  let res1 = await modelService.updateModel({
    model_id: modelId,
    setting_type: "assistant",
    config: {},
  });
  let res2 = await modelService.updateModel({
    model_id: modelId,
    setting_type: "topic-naming",
    config: {},
  });
};

const initModel = async () => {
  const res = await modelService.getModels();
  const modelsSettings = await modelService.getModelBySetting();
  console.log("res", res);
  modelList.value = res;
  console.log("modelsSettings", modelsSettings);
  let model = modelsSettings.find((model) => model.setting_type === "assistant");
  if (model) {
    selectedModel.value = model.model_id * 1;
  }
};

const messageStatus = computed(() => {
  //根据会话ID 找到 当前会话的状态
  if (!chatStore.chat) {
    return false;
  }
  console.log("chatStore.chat", chatStore.chat);
  // return chatStore.chat?.status == "running"
  let conversationId = chatStore.chat?.conversation_id;
  let chat = chatStore.list.find((c) => c.conversation_id == conversationId);
  return chat?.status == "running";
});

onMounted(async () => {
  await initModel();
  await getSearchEngineService();
  await fetchMcpServers();
  emitter.on("changeMessageText", (text) => {
    messageText.value = text;
  });
  emitter.on('change-model',async(model)=>{
    if(model){
      selectedModel.value = model.id;
    }
    await initModel();
  })
});

//检查模型和搜索服务的配置情况
// let res =  await modelService.checkModel();
// if(res.has_default_platform && res.has_enabled_platform && res.has_search_setting){
const checkModel = async () => {

  let res = await modelService.checkModel();
  return res;
};

const handleNotification = async (path, message, toMessage) => {
  const key = `jump-notification-${Date.now()}`; // notice key
  notification.warning({
    message: message,
    key,
    description: h(
      "span",
      {
        style: { textDecoration: "underline", cursor: "pointer", color: "#1677ff" },
      },
      toMessage
    ),
    duration: 2,
    onClick: () => {
      notification.close(key);
      router.push(path);
    },
  });
};

const isLogin = computed(() => {
  //Determine whether there is a user present by id

  if (user.value.id) {
    return true;
  }
  return false;
});

const searchEngine = ref(null);

const getSearchEngineService = async () => {
  const userConfig = await searchEngineService.getSearchEngineConfig();
  if (userConfig) {
    searchEngine.value = userConfig;
  }
};

const handleSend = async () => {
  const text = messageText.value.trim();
  if (text || fileList.value.length > 0) {
    let res = await checkModel();
    if (!res.has_default_platform) {
      //请前往设置默认模型
      message.warning(t("please_select_model"));
      return;
    }
    if (!res.has_search_setting) {
      handleNotification("/setting/search-service", t("setting.searchService.searchService"), t("click_here_to_go_to_settings"));
      return;
    }

    let model = modelList.value.find((model) => model.id == selectedModel.value);
    // save model info to localStorage
    localStorage.setItem("model_info", JSON.stringify(model));
    console.log(model);
    if (model.is_subscribe && !isLogin.value) {
      handleNotification("/auth", t("auth.login"), t("auth.subscribeModel"));
      return;
    }
    // provider_name: "Lemon"
    if (searchEngine.value.provider_name === "Lemon" && !isLogin.value) {
      handleNotification("/setting/search-service", t("auth.login"), t("auth.subscribeService"));
      return;
    }
    // 判断积分
    if (points.value.total <= 0 && isLogin.value && (model.is_subscribe || searchEngine.value.provider_name === "Lemon")) {
      handleNotification("/setting/usage", t("auth.insufficientPoints"), t("auth.insufficientPointsPleaseGoToUpgradeOrPurchase"));
      return;
    }
    // electron client？
    if (window.electronAPI) {
      // docker
      let install  = await checkDockerInstall()
      let launch  = await checkDockerRunning()
      let image = await checkDockerEnvironmentReady()
      localStorage.setItem('docker-installed',install.status)
      localStorage.setItem("docker-launch",launch.status)
      localStorage.setItem("docker-image",image.status)
      console.log("docker status",install,launch,image)
      if (!(install.status && launch.status && image.status)) {
        emitter.emit('docker-check', true)
        return
      }
    }


    emit("send", {
      text,
      mode: currentMode.value,
      files: fileList.value,
      mcp_server_ids: selectedMcpServerIds.value,
    });
    messageText.value = "";
    fileList.value = [];
  }
};

//停止
const handleStop = () => {
  chatStore.handleStop();
};

//转化文件大小
const formatFileSize = (size) => {
  if (size < 1024) {
    return size + " B";
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + " KB";
  } else {
    return (size / (1024 * 1024)).toFixed(2) + " MB";
  }
};

const beforeUpload = async (file) => {
  const options = {
    conversation_id: chatStore?.chat?.conversation_id || "",
    files: file,
  };
  const formData = new FormData();
  Object.keys(options).map((k) => {
    formData.append(k, options[k]);
  });

  const result = await files.uploadFile(formData);
  // 获取result data [0].id
  console.log("result", result);
  file.id = result[0]?.id;
  file.workspace_dir = result[0]?.workspace_dir;

  fileList.value = [...fileList.value, file];
  return false;
};

const handleDelete = (file) => {
  fileList.value = fileList.value.filter((f) => f.id !== file.id);
  files.deleteFile(file.id);
};

//输入框键盘事件
const keydown = (e) => {
  if (e.shiftKey && e.key === "Enter") {
    return;
  }
  if (e.isComposing && e.key === "Enter") {
    e.preventDefault();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    handleSend();
  }
};
</script>

<style lang="scss" scoped>
.mcp-server-menu {
  width: 250px;
}

.mcp-server-menu .ant-menu-item-selected {
  background-color: #e6f7ff !important;
}

.check-icon {
  color: #1890ff;
}

.mcp-button {
  border-color: #0000000f;
  border-radius: 9999px;
}

.mcp-button-active {
  background-color: #e6f7ff;
  border-color: #1890ff !important;
  color: #1890ff;
}

:deep(.ant-dropdown-menu-title-content) {
  display: flex;
  justify-content: space-between;
}

:deep(.ant-dropdown-menu-item) {
  margin-bottom: 4px !important;
}

.upload-button {
  border-color: #0000000f;
  border-radius: 9999px;
}

.send-button {
  background: #1a1a19;
  /* 默认背景色 */
  border: 1px solid rgb(229, 231, 235);
  /* 边框颜色 */
  border-radius: 9999px;
  /* 圆角 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.stop-button {
  background: #1a1a19;
  /* 默认背景色 */
  border: 1px solid rgb(229, 231, 235);
  /* 边框颜色 */
  border-radius: 9999px;
  /* 圆角 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: pointer;

  div {
    width: 10px;
    height: 10px;
    background: white;
  }
}

/* 禁用状态下的样式 */
.send-button:disabled,
.send-button[disabled] {
  background: #37352f14;
  /* 浅灰色背景 */
  border: 0px solid #37352f14;
  /* 边框颜色 */
  color: #a8a8a8;
  /* 文字颜色变浅 */
  cursor: not-allowed;
  /* 鼠标悬停时显示禁用状态 */

  svg {
    fill: #b9b9b7;
  }
}

.input-textarea {
  //height: 46px!important;
  //max-height: 240px;
}

.input-textarea::-webkit-scrollbar {
  width: 2px;
}

.input-textarea::-webkit-scrollbar-thumb {
  background-color: #d9d9d9;
  border-radius: 3px;
}

.input-textarea::-webkit-scrollbar-track {
  background-color: #f5f5f5;
}

.chat-input {
  background: #f8f8f7;
  border-radius: 22px;
  margin-top: 0.75rem;
  position: sticky;
  bottom: 0;
  padding-bottom: 0.75rem;
}

.input-wrapper {
  margin: 0 auto;
  width: 100%;
}

.input-area {
  display: flex;
  gap: 0;
  background: #fff;
  align-items: flex-end;
  border: 1px solid rgb(229, 231, 235);
  border-radius: 22px;
  padding: 0.75rem;
  transition: border-color 0.3s;

  overflow: hidden;
  flex-direction: column;
  align-items: baseline;

  &:hover {
    border-color: rgb(229, 231, 235);
  }

  &:focus-within {
    border-color: rgb(229, 231, 235);
  }

  &:focus {
    border-color: rgb(229, 231, 235);
  }

  &:active {
    border-color: rgb(229, 231, 235);
    border: 1px solid rgb(229, 231, 235);
  }
}

.input-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.upload-fileList {
  display: flex;
  gap: 0.75rem;
}

.upload-fileList-item {
  padding: 0.5rem;
  border-radius: 10px;
  gap: 0.375rem;
  cursor: pointer;
  width: 280px;
  min-width: 280px;
  display: flex;
  background-color: #37352f0f;
  font-family: ui-serif;

  .file-icon {
    min-width: 28px;
    min-height: 28px;
  }

  .file-name {
    color: #34322d;
    font-size: 0.875rem;
    line-height: 1.25rem;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    width: 100%;
  }

  .file-size {
    font-size: 0.75rem;
    line-height: 1rem;
    color: #858481;
  }

  .delete-button {
    padding: 2px;
    background-color: #858481;
    border-radius: 99999px;
    color: #fff;
    width: fit-content;
    height: fit-content;
    display: none;
  }

  &:hover {
    .delete-button {
      display: flex;
    }
  }
}

:deep(.ant-input) {
  border: none !important;
  box-shadow: none !important;
  padding: 0 8px;

  &:focus {
    box-shadow: none !important;
  }
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-actions {
  display: flex;
  gap: 16px;
}

.mode-switcher {
  margin-right: 0;
  border: none;
  box-shadow: none;
}

.model-option {
  display: flex;
  align-items: center;
  padding: 4px 8px;
}

.model-logo {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  margin-right: 10px;
  object-fit: cover;
  background-color: #f0f0f0;
}

.model-name {
  font-weight: 500;
  color: #333;
}
</style>
<style>
.model-select .ant-select-selector {
  border: none !important;
}
</style>
