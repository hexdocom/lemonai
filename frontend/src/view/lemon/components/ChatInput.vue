<template>
  <div class="chat-input">
    <!-- 选中元素预览组件 -->
    <SelectionPreview />
    <div class="input-wrapper">
      <div class="input-area">
        <ChatInputFile v-model:fileList="fileList" v-model:conversation_id="conversation_id" />
        <div class="input-container">
          <a-textarea class="input-textarea" v-model:value="messageText" :placeholder="placeholder" :auto-size="{ minRows: 2, maxRows: 8 }" @keydown="keydown" />
          <div class="input-actions">
            <div class="left-actions">
              <!-- 第一行按钮 -->
              <div class="button-row first-row">
                <!-- 文件上传 -->
                <ChatInputUpload v-model:fileList="fileList" v-model:conversation_id="conversation_id" :isPublic="isPublic" v-if="chatMode === 'task'" />
                <ModelSelect/>
                <!-- 模式切换器 - 响应式 -->
                <div class="mode-selector-dropdown">
                  <!-- 桌面端下拉框 -->
                  <a-select
                    v-if="!isMobile"
                    v-model:value="workMode"
                    class="mode-select-dropdown"
                    :options="workModeOptions"
                    @change="handleModeChange"
                    :dropdownMatchSelectWidth="false"
                    :bordered="false"
                  >
                    <template #option="{ value, label, description }">
                      <div class="mode-option">
                        <span class="mode-circle">
                          <span v-if="workMode === value" class="mode-inner-circle" />
                        </span>
                        <div class="mode-texts">
                          <div class="mode-label">{{ label }}</div>
                          <div class="mode-desc">{{ description }}</div>
                        </div>
                      </div>
                    </template>
                  </a-select>

                  <!-- 移动端触发器 -->
                  <div v-else class="mobile-mode-trigger" @click="openModeModal">
                    <span class="mode-name">{{ workModeOptions.find((opt) => opt.value === workMode)?.label || "Auto" }}</span>
                    <DownOutlined class="dropdown-icon" />
                  </div>
                </div>

                <!-- <div class="visibility-toggle">
                  <a-select
                    v-if="!isMobile"
                    v-model:value="isPublic"
                    class="visibility-select"
                    :options="visibilityOptions"
                    @change="handleVisibilityChange"
                    :dropdownMatchSelectWidth="false"
                    :bordered="false"
                  >
                    <template #option="{ value, label, desc }">
                      <div class="custom-option">
                        <span class="radio-circle">
                          <span v-if="isPublic === value" class="inner-circle" />
                        </span>
                        <div class="option-texts">
                          <div style="display: flex; align-items: center; gap: 8px">
                            {{ label }}
                            <a-tag v-if="!value" size="small" class="pro-tag">Pro+</a-tag>
                          </div>
                          <div class="desc">{{ desc }}</div>
                        </div>
                      </div>
                    </template>
                  </a-select>
                  <div v-else class="mobile-visibility-trigger" @click="openVisibilityModal">
                    <span class="visibility-name">{{ visibilityOptions.find((opt) => opt.value === isPublic)?.label || "Public" }}</span>
                    <DownOutlined class="dropdown-icon" />
                  </div>
                </div> -->
                <div class="mcp-button-container">
                  <!-- MCP服务器 -->
                  <a-dropdown :trigger="['click']" placement="top" class="mcp-dropdown">
                    <a-button class="mcp-button" :class="{ 'mcp-button-active': selectedMcpServerIds && selectedMcpServerIds.length > 0 }">
                      <template #icon>
                        <CloudServerOutlined />
                      </template>
                      MCP
                    </a-button>
                    <template #overlay>
                      <a-menu :selectedKeys="mcpMenuSelectedKeys" multiple class="mcp-server-menu" @click="handleMcpMenuClick">
                        <a-menu-item key="disable">
                          <span>Close MCP</span>
                        </a-menu-item>
                        <a-menu-divider />
                        <a-menu-item v-for="server in mcpServers" :key="server.id" class="mcp-server-item">
                          <span>{{ server.name }}</span>
                          <CheckOutlined v-if="selectedMcpServerIds && selectedMcpServerIds.includes(server.id)" class="check-icon" />
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
              </div>

              <!-- 第二行按钮
              <div class="button-row second-row" v-if="chatMode === 'task'">
                

                
              </div> -->
            </div>
            <!-- {{ messageStatus }} -->
            <a-button v-if="messageStatus" @click="handleSend" class="send-button" :disabled="!messageText">
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16" fill="#fff">
                  <path
                    d="M7.91699 15.0642C7.53125 15.0642 7.22119 14.9397 6.98682 14.6907C6.75244 14.4465 6.63525 14.1218 6.63525 13.7166V6.39966L6.77441 3.34546L7.48486 3.89478L5.62451 6.12134L3.99121 7.76196C3.87402 7.87915 3.73975 7.97681 3.58838 8.05493C3.44189 8.13306 3.271 8.17212 3.07568 8.17212C2.73389 8.17212 2.4458 8.05981 2.21143 7.83521C1.98193 7.60571 1.86719 7.3103 1.86719 6.94897C1.86719 6.60229 1.99902 6.29712 2.2627 6.03345L6.97949 1.30933C7.0918 1.19214 7.2334 1.10181 7.4043 1.03833C7.5752 0.969971 7.74609 0.935791 7.91699 0.935791C8.08789 0.935791 8.25879 0.969971 8.42969 1.03833C8.60059 1.10181 8.74463 1.19214 8.86182 1.30933L13.5786 6.03345C13.8423 6.29712 13.9741 6.60229 13.9741 6.94897C13.9741 7.3103 13.8569 7.60571 13.6226 7.83521C13.3931 8.05981 13.1074 8.17212 12.7656 8.17212C12.5703 8.17212 12.397 8.13306 12.2456 8.05493C12.0991 7.97681 11.9673 7.87915 11.8501 7.76196L10.2095 6.12134L8.34912 3.89478L9.05957 3.34546L9.19141 6.39966V13.7166C9.19141 14.1218 9.07422 14.4465 8.83984 14.6907C8.60547 14.9397 8.29785 15.0642 7.91699 15.0642Z"
                    fill="var(--icon-onblack)"
                  ></path>
                </svg>
              </template>
            </a-button>
            <!-- 停止按钮 -->
            <button v-else class="stop-button" @click="handleStop">
              <div></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 移动端模式选择弹窗 -->
  <teleport to="body">
    <div v-if="showModeModal" class="mobile-modal-overlay" @click="closeModeModal">
      <div class="mobile-mode-selector" @click.stop>
        <div class="modal-header">
          <h3>Mode</h3>
          <a-button type="text" @click="closeModeModal" class="close-btn">
            <CloseOutlined />
          </a-button>
        </div>
        <div class="option-list">
          <div v-for="option in workModeOptions" :key="option.value" class="option-item" :class="{ selected: option.value === workMode }" @click="handleMobileModeSelect(option.value)">
            <div class="option-info">
              <span class="option-circle">
                <span v-if="workMode === option.value" class="option-inner-circle" />
              </span>
              <div class="option-texts">
                <div class="option-label">{{ option.label }}</div>
                <div class="option-desc">{{ option.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <!-- 移动端可视选择弹窗 -->
  <teleport to="body">
    <div v-if="showVisibilityModal" class="mobile-modal-overlay" @click="closeVisibilityModal">
      <div class="mobile-visibility-selector" @click.stop>
        <div class="modal-header">
          <h3>Visibility</h3>
          <a-button type="text" @click="closeVisibilityModal" class="close-btn">
            <CloseOutlined />
          </a-button>
        </div>
        <div class="option-list">
          <div v-for="option in visibilityOptions" :key="option.value" class="option-item" :class="{ selected: option.value === isPublic }" @click="handleMobileVisibilitySelect(option.value)">
            <div class="option-info">
              <span class="option-circle">
                <span v-if="isPublic === option.value" class="option-inner-circle" />
              </span>
              <div class="option-texts">
                <div class="option-label">
                  {{ option.label }}
                  <a-tag v-if="!option.value" size="small" class="pro-tag-mobile">Pro+</a-tag>
                </div>
                <div class="option-desc">{{ option.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <!-- 升级弹窗 -->
  <a-modal v-model:open="showUpgradeModal" :title="upgradeTitle" centered width="1200px" :footer="null" @cancel="closeModal">
    <!-- 购买积分按钮 -->
    <div class="buy-credits">
      <div class="upgrade-des-wrapper">
        <span v-if="upgradeDes" class="upgrade-des">{{ upgradeDes }}</span>
        <span v-if="upgradeDes1" class="upgrade-des">{{ upgradeDes1 }}</span>
      </div>
      <a-button v-if="membership?.planName" type="primary" @click="showRechargeModal = true">Buy credits</a-button>
    </div>
    <Pricing isWindow="true" showTitle="false" @close_window="closeModal" />
  </a-modal>
  <RechargeModal v-model:open="showRechargeModal" />
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch, h } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { notification, message } from "ant-design-vue";
import {
  PaperClipOutlined,
  CloudServerOutlined,
  CheckOutlined,
  MessageOutlined,
  ToolOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  SyncOutlined,
  ForkOutlined,
  RobotOutlined,
  BulbOutlined,
  DownOutlined,
  CloseOutlined,
} from "@ant-design/icons-vue";

import ChatInputFile from "./ChatInputFileList.vue";
import ChatInputUpload from "./ChatInputUpload.vue";
import SelectionPreview from "./SelectionPreview.vue";

import ModelSelect from "./ModelSelect.vue";
import Pricing from "@/view/pay/components/pricing.vue";
import RechargeModal from "@/view/pay/components/rechargeProducts.vue";

import emitter from "@/utils/emitter";
import mcpService from "@/services/mcp";
import files from "@/services/files";
import agentService from "@/services/agent";
import chatService from "@/services/chat";
import modelService from "@/services/default-model-setting";

import { storeToRefs } from "pinia";
import { useUserStore } from "@/store/modules/user";
import { useChatStore } from "@/store/modules/chat";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

//Upgrade required
const upgradeTitle = ref("Upgrade required");

const userStore = useUserStore();
const { user, membership, points } = storeToRefs(userStore);

const chatStore = useChatStore();
const { agent, chat, model_id } = storeToRefs(chatStore);

// ---------------- 状态定义 ------------------
const messageText = ref("");
const placeholder = ref(t("lemon.welcome.placeholder"));
const fileList = ref([]);
const currentMode = ref("text");
const isPublic = ref(true); // 默认 public
const showRechargeModal = ref(false);

// 工作模式选项
const workMode = ref(localStorage.getItem("workMode") || "auto"); // 从缓存读取，默认Auto模式
const workModeOptions = [
  { value: "auto", label: "Auto", description: "Automated multi-step chat" },
  { value: "agent", label: "Task", description: "Task-oriented chat with tools" },
  { value: "chat", label: "Chat", description: "Simple conversation chat" },
  // { value: 'twins', label: 'Twins', description: 'Dual-agent collaborative chat' }
];

const mcpServers = ref([]);
const selectedMcpServerIds = ref([]);

const emit = defineEmits(["send"]);

const visibilityOptions = [
  {
    value: true,
    label: "Public",
    desc: "Anyone can view and remix",
  },
  {
    value: false,
    label: "Personal",
    desc: "Only visible to yourself",
  },
];

const showUpgradeModal = ref(false);
const upgradeDes = ref("");
const upgradeDes1 = ref("");

// 移动端相关状态
const isMobile = ref(false);
const showModeModal = ref(false);
const showVisibilityModal = ref(false);

// ---------------- 计算属性 ------------------
const isLogin = computed(() => !!user.value.id);

const chatMode = computed(() => chatStore.mode);

const conversation_id = computed(() => route.params.id || null);

const mcpMenuSelectedKeys = computed(() => {
  return selectedMcpServerIds.value.length === 0 ? ["disable"] : selectedMcpServerIds.value;
});

const messageStatus = computed(() => {
  const chat = chatStore.list.find((c) => c.conversation_id === chatStore.chat?.conversation_id);
  console.log(" chat?.status", chat?.status);
  console.log(" chatStore.chat?.conversation_id ", chatStore.chat?.conversation_id);
  return chat?.status != "running";
});

// 移动端检测
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

// 移动端弹窗控制函数
const openModeModal = () => {
  showModeModal.value = true;
};

const closeModeModal = () => {
  const modalSelector = document.querySelector(".mobile-mode-selector");
  if (modalSelector) {
    modalSelector.classList.add("closing");
  }
  setTimeout(() => {
    showModeModal.value = false;
  }, 250);
};

const openVisibilityModal = () => {
  showVisibilityModal.value = true;
};

const closeVisibilityModal = () => {
  const modalSelector = document.querySelector(".mobile-visibility-selector");
  if (modalSelector) {
    modalSelector.classList.add("closing");
  }
  setTimeout(() => {
    showVisibilityModal.value = false;
  }, 250);
};

// 移动端选项选择处理
const handleMobileModeSelect = (mode) => {
  handleModeChange(mode);
  closeModeModal();
};

const handleMobileVisibilitySelect = (value) => {
  handleVisibilityChange(value);
  closeVisibilityModal();
};

// ---------------- 生命周期 ------------------
onMounted(async () => {
  await initModel();
  await fetchMcpServers();
  checkMobile();
  // 监听窗口大小变化
  window.addEventListener("resize", checkMobile);

  // initIsPublic();
  emitter.on("changeMessageText", (text) => {
    messageText.value = text;
  });
  emitter.on("showUpgrade", () => {
    upgradeTitle.value = "";
    upgradeDes.value = "You don't have enough credits, and the prediction can't complete the task. ";
    upgradeDes1.value = "Please upgrade or purchase more credits.";
    showUpgradeModal.value = true;
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});

// ---------------- 监听路由 ------------------
watch(
  () => route.params.agentId,
  () => {
    console.log("agent.value 改变", agent.value);
    if (agent.value) {
      selectedMcpServerIds.value = agent.value.mcp_server_ids || [];
    }
  }
);

// ---------------- MCP ------------------
const fetchMcpServers = async () => {
  const servers = await mcpService.activate_servers();
  if (Array.isArray(servers)) mcpServers.value = servers;
  if (agent.value) selectedMcpServerIds.value = agent.value.mcp_server_ids || [];
};

const handleMcpMenuClick = ({ key }) => {
  if (key === "disable") {
    selectedMcpServerIds.value = [];
  } else {
    const index = selectedMcpServerIds.value.indexOf(key);
    index !== -1 ? selectedMcpServerIds.value.splice(index, 1) : selectedMcpServerIds.value.push(key);
  }
  localStorage.setItem("selectedMcpServerIds", JSON.stringify(selectedMcpServerIds.value));
  if (agent.value) {
    agent.value.mcp_server_ids = selectedMcpServerIds.value;
    updateAgent();
  }
};

const updateAgent = async () => {
  if (agent.value) {
    await agentService.update(agent.value.id, agent.value.name, agent.value.describe, agent.value.mcp_server_ids, agent.value.is_public);
    emitter.emit("updateAgentList");
  }
};

// -------------- 函数定义 ------------------

const closeModal = () => {
  showUpgradeModal.value = false;
};

// 处理模式切换
const handleModeChange = (mode) => {
  workMode.value = mode;
  console.log("工作模式切换为:", mode);
  // 保存到浏览器缓存
  localStorage.setItem("workMode", mode);
  // 这里可以添加模式切换后的逻辑处理
};
const handleVisibilityChange = (value) => {
  console.log("handleVisibilityChange", value);
  if (!value) {
    // 判断 是不是 会员
    if (!membership.value?.planName) {
      isPublic.value = true;
      upgradeTitle.value = "Upgrade required";
      upgradeDes.value = "";
      showUpgradeModal.value = true;
      return;
    }
  }
  agent.value.is_public = value;
  updateAgent();
};

//监听 agent.value
watch(
  () => agent.value,
  (newValue) => {
    if (agent.value && agent.value.is_public !== undefined) {
      isPublic.value = agent.value?.is_public;
    } else {
      isPublic.value = true;
    }
  },
  {
    immediate: true,
  }
);

// 监听 message
window.addEventListener("message", (event) => {
  if (event.origin !== "https://lemonai.ai") return; // 安全性检查
  const { type, payload } = event.data;
  console.log("监听 message 事件", event.data);
  if (type === "transferData") {
    chatStore.mode = "task";
    messageText.value = payload;
    handleSend();
  }
});

const modelList = ref([]);
const initModel = async () => {
  console.log("membership.value", membership.value);

  // 设置默认模型为 deepseek-v3
  const setDefaultModel = (models) => {
    if (models.length > 0) {
      if (!model_id.value) {
        const defaultId = models[0].id * 1;
        model_id.value = defaultId;
      }
    }
  };

  // Step 1: 读取本地缓存
  const cachedData = localStorage.getItem("modelList");
  if (cachedData) {
    try {
      modelList.value = JSON.parse(cachedData);
      setDefaultModel(modelList.value);
    } catch (e) {
      console.error("Failed to parse cached modelList", e);
    }
  }

  // Step 2: 获取接口数据（用于刷新）
  try {
    const res = await modelService.getModels();

    if (Array.isArray(res)) {
      modelList.value = res;
      localStorage.setItem("modelList", JSON.stringify(res));
      setDefaultModel(res);
    }
  } catch (e) {
    console.error("Failed to fetch models from API", e);
  }
};
// ---------------- 发送与停止 ------------------
const handleSend = () => {
  const text = messageText.value.trim();
  if (!text && fileList.value.length === 0) return;

  // 判断选择的模型 是不是付费模型

  console.log("selectedModelValue.value", model_id.value);
  //获取模型详情
  //浏览器缓存 modelList
  let modelList = JSON.parse(localStorage.getItem("modelList"));
  let modelDetail = modelList.find((item) => item.id === model_id.value);
  console.log("modelDetail", modelDetail);

  //is_subscribe
  if (points.value.total <= 100 && modelDetail.is_subscribe) {
    upgradeDes.value = "You don't have enough credits to use this subscription model. ";
    upgradeDes1.value = "Please subscribe or purchase more credits to continue.";
    upgradeTitle.value = "";
    showUpgradeModal.value = true;
    return;
  }

  emit("send", {
    text,
    mode: currentMode.value,
    files: fileList.value,
    mcp_server_ids: selectedMcpServerIds.value,
    is_public: isPublic.value,
    workMode: workMode.value,
  });

  messageText.value = "";
  fileList.value = [];
};

const handleStop = () => {
  chatStore.handleStop();
};

const handleNotification = (path, title, text) => {
  const key = `jump-${Date.now()}`;
  notification.warning({
    message: title,
    key,
    description: h(
      "span",
      {
        style: { textDecoration: "underline", cursor: "pointer", color: "#1677ff" },
      },
      text
    ),
    duration: 2,
    onClick: () => {
      notification.close(key);
      router.push(path);
    },
  });
};

// 自定义模式图标组件 - 使用对话气泡+右下角图标的组合模式
const ModeIcon = ({ type }) => {
  // 创建复合图标的通用函数
  const createCompositeIcon = (overlayIcon) => {
    return h(
      "div",
      {
        style: {
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "16px",
          height: "16px",
        },
      },
      [
        // 背景对话气泡 - 黑色
        h(MessageOutlined, {
          style: {
            fontSize: "16px",
            color: "#000",
          },
        }),
        // 右下角叠加图标 - 灰色
        h(overlayIcon, {
          style: {
            position: "absolute",
            bottom: "-2px",
            right: "-2px",
            fontSize: "8px",
            color: "#999",
            background: "#fff",
            borderRadius: "50%",
            padding: "1px",
          },
        }),
      ]
    );
  };

  // 根据类型返回对应的复合图标
  switch (type) {
    case "chat":
      // Chat保持简单的对话气泡 - 黑色
      return h(MessageOutlined, { style: { fontSize: "16px", color: "#000" } });

    case "task":
      // Task: 对话气泡 + 右下角灯泡图标（表示智能想法和解决方案）
      return createCompositeIcon(BulbOutlined);

    case "auto":
      // Auto: 对话气泡 + 右下角同步图标
      return createCompositeIcon(SyncOutlined);

    case "twins":
      // Twins: 对话气泡 + 右下角分叉图标（表示分支协作）
      return createCompositeIcon(ForkOutlined);

    default:
      return h(MessageOutlined, { style: { fontSize: "16px", color: "#000" } });
  }
};

// ---------------- 输入框按键事件 ------------------
const keydown = (e) => {
  if ((e.shiftKey && e.key === "Enter") || e.isComposing) return;
  if (e.key === "Enter") {
    e.preventDefault();
    handleSend();
  }
};
</script>

<style lang="scss" scoped>
.mcp-button-container {
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
.visibility-select .desc {
  font-size: 12px;
  color: #888;
}

.upgrade-des {
  font-size: 16px;
  color: #1a1a19;
  font-weight: 500;
}

.upgrade-des-wrapper {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.buy-credits {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.custom-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
}

.radio-circle {
  width: 16px;
  height: 16px;
  border: 2px solid #333;
  border-radius: 50%;
  margin-top: 3px;
  position: relative;
}

.inner-circle {
  position: absolute;
  top: 1.5px;
  left: 1.5px;
  width: 8px;
  height: 8px;
  background-color: #333;
  border-radius: 50%;
}

.option-texts {
  display: flex;
  flex-direction: column;
}

.pro-tag {
  font-size: 12px !important;
  padding: 0 6px !important;
  height: 18px !important;
  line-height: 1 !important;
  border-radius: 4px !important;
  background-color: #1a1a19 !important;
  color: #fff !important;
  border: 1px solid #1a1a19 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.mcp-server-menu {
  width: 250px;
}

.mcp-server-menu .ant-menu-item-selected {
  background-color: #e6f7ff !important;
}

.mcp-server-item {
  border-color: #0000000f;
}

//ant-dropdown .ant-dropdown-menu .ant-dropdown-menu-item-selected
::v-deep(.ant-dropdown-menu-item-selected) {
  background-color: #0000000f !important;
  color: #333 !important;
}

.check-icon {
  color: #1890ff;
}

.mcp-button {
  border-color: #0000000f;
  border-radius: 6px;
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
  border-radius: 6px;
}

.send-button {
  background: #1a1a19;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  width: 32px;
  height: 32px;
}

.send-button:hover:not(:disabled) {
  background: #2d2d2a;
  transform: translateY(-1px);
}

.stop-button {
  background: #1a1a19;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
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
  gap: 4px;
  width: 100%;
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
  margin-top: 8px;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* PC端样式：按钮显示为一行 */
.chat-input .left-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.chat-input .left-actions .button-row {
  display: contents; /* 让button-row容器不影响布局 */
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
  border: 1px solid #e9ecef !important;
  border-radius: 6px !important;
}

/* 为visibility-select添加边框 */
.visibility-select .ant-select-selector {
  border: 1px solid #e9ecef !important;
  border-radius: 6px !important;
}

/* 模式选择下拉框样式 */
.mode-select-dropdown .ant-select-selector {
  border: 1px solid #e9ecef !important;
  border-radius: 6px !important;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
}

.mode-circle {
  width: 16px;
  height: 16px;
  border: 2px solid #333;
  border-radius: 50%;
  margin-top: 3px;
  position: relative;
}

.mode-inner-circle {
  position: absolute;
  top: 1.5px;
  left: 1.5px;
  width: 8px;
  height: 8px;
  background-color: #333;
  border-radius: 50%;
}

.mode-texts {
  display: flex;
  flex-direction: column;
}

.mode-label {
  font-size: 14px;
  font-weight: 500;
}

.mode-desc {
  font-size: 12px;
  color: #888;
}

/* 统一所有Ant Design组件的圆角 */
:deep(.ant-select-selector),
:deep(.ant-btn),
:deep(.ant-dropdown-trigger) {
  border-radius: 6px !important;
}

/* 移动端触发器样式 */
.mobile-mode-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 24px;
  padding: 0 2px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
}

.mobile-visibility-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 24px;
  padding: 0 2px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
}

.mobile-mode-trigger .mode-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 2px;
  max-width: 45px;
}

.mobile-visibility-trigger .visibility-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 2px;
}

.mobile-mode-trigger .dropdown-icon,
.mobile-visibility-trigger .dropdown-icon {
  font-size: 8px;
  color: #999;
}

/* 移动端自定义模态框样式 */
.mobile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;
}

/* 移动端模态框内容样式 */
.mobile-mode-selector,
.mobile-visibility-selector {
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 0;
  max-height: 50vh;
  min-height: 200px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUpIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.mobile-mode-selector.closing,
.mobile-visibility-selector.closing {
  animation: slideDownOut 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  padding: 4px !important;
  color: #999 !important;
}

.option-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.option-item:hover {
  background-color: #f5f5f5;
}

.option-item.selected {
  background-color: #e6f7ff;
}

.option-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.option-circle {
  width: 16px;
  height: 16px;
  border: 2px solid #333;
  border-radius: 50%;
  margin-top: 3px;
  position: relative;
  flex-shrink: 0;
}

.option-inner-circle {
  position: absolute;
  top: 1.5px;
  left: 1.5px;
  width: 8px;
  height: 8px;
  background-color: #333;
  border-radius: 50%;
}

.option-texts {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-desc {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.pro-tag-mobile {
  font-size: 10px !important;
  padding: 0 4px !important;
  height: 16px !important;
  line-height: 1 !important;
  border-radius: 3px !important;
  background-color: #1a1a19 !important;
  color: #fff !important;
  border: 1px solid #1a1a19 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 动画关键帧 */
@keyframes slideUpIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideDownOut {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/** 适配移动设备屏幕 - 限定在chat-input组件内 */
@media (max-width: 768px) {
  .chat-input .input-actions {
    height: auto;
    gap: 50px;
    span {
      height: 24px !important;
      max-height: 24px !important;
      line-height: 24px !important;
    }
  }
  .chat-input .left-actions {
    height: auto;
    flex: 1;
    max-width: calc(100% - 48px);
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    align-items: flex-start !important;
  }

  .chat-input .left-actions .button-row {
    display: flex !important;
    align-items: center;
    gap: 4px;
    height: 24px;
  }

  .chat-input .left-actions .first-row {
    justify-content: flex-start;
  }

  .chat-input .left-actions .second-row {
    justify-content: flex-start;
  }

  /* 第一行按钮样式 */
  .chat-input .left-actions .first-row > * {
    height: 24px;
    display: flex;
    align-items: center;
  }

  /* 第二行按钮样式 */
  .chat-input .left-actions .second-row > * {
    height: 24px;
    display: flex;
    align-items: center;
  }

  /* 上传按钮固定宽度 */
  .chat-input .left-actions .first-row > *:first-child {
    width: 32px;
    flex: 0 0 32px;
    justify-content: center;
  }

  /* 模式选择按钮 */
  .chat-input .left-actions .first-row .mode-selector-dropdown {
    width: 60px;
    flex: 0 0 60px;
    justify-content: center;
  }

  /* 模型选择组件 - 占用剩余空间 */
  .chat-input .left-actions .first-row > *:last-child {
    flex: 1;
    min-width: 80px;
    justify-content: flex-start;
    width: fit-content;
  }

  /* 可视化选择按钮 */
  .chat-input .left-actions .second-row .visibility-toggle {
    width: 70px;
    flex: 0 0 70px;
    justify-content: center;
  }

  /* MCP按钮 */
  .chat-input .left-actions .second-row .mcp-dropdown {
    width: 50px;
    flex: 0 0 50px;
    justify-content: center;
  }
  .chat-input .left-actions .mode-selector-dropdown {
    height: 24px;
    font-size: 10px;

    div {
      height: 24px !important;
      max-height: 24px !important;
      width: 100% !important;
    }
  }
  /** 修改 ant-select-selection-item 字体大小 - 限定在chat-input内 */
  .chat-input .left-actions .mode-select-dropdown .ant-select-selection-item {
    font-size: 10px !important;
    padding-inline-end: 0px !important;
    line-height: 24px !important;
  }
  .chat-input .left-actions .mode-select-dropdown .ant-select-selector {
    padding: 0px 2px !important;
    height: 24px !important;
  }
  .chat-input .left-actions .mode-select-dropdown .ant-select-arrow {
    display: none !important;
  }

  /** 针对可视选择下拉框的特殊样式 - 限定在chat-input内 */
  .chat-input .left-actions .visibility-select .ant-select-selection-item {
    font-size: 10px !important;
    padding-inline-end: 0px !important;
    line-height: 24px !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chat-input .left-actions .visibility-select .ant-select-selector {
    padding: 0px 2px !important;
  }
  .chat-input .left-actions .visibility-select .ant-select-arrow {
    display: none !important;
  }

  /** 可视选择样式 - 限定在chat-input内 */
  .chat-input .left-actions .visibility-toggle {
    height: 24px;
    font-size: 11px;

    div {
      height: 24px !important;
      max-height: 24px !important;
      width: 100% !important;
    }
  }

  /** MCP按钮样式 - 限定在chat-input内 */
  .chat-input .left-actions .mcp-button {
    height: 24px !important;
    max-height: 24px !important;
    font-size: 10px !important;
    padding: 0px 2px !important;

    .anticon {
      display: none !important;
    }
  }
}
</style>
