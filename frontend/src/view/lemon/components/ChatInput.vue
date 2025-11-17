<template>
  <div class="chat-input">
    <!-- 选中元素预览组件 -->
    <SelectionPreview />
    <div class="input-wrapper">
      <div class="input-area">
        <ChatInputFile v-model:fileList="fileList" v-model:conversation_id="conversation_id" />
        <div class="input-container">
          <a-textarea class="input-textarea" v-model:value="messageText" :placeholder="placeholder"
            :auto-size="{ minRows: 2, maxRows: 8 }" @keydown="keydown" />
          <div class="input-actions">
            <div class="left-actions">
              <!-- 第一行按钮 -->
              <div class="button-row first-row">
                <!-- 文件上传 -->
                <ChatInputUpload v-model:fileList="fileList" v-model:conversation_id="conversation_id"
                  :isPublic="isPublic" />
                <ModelSelect/>
                <!-- 模式切换器 - 响应式 -->
                <ModeSelector v-model:modelValue="workMode" :disabled="hasTwinsId" @modeChange="handleModeChange" />

                <!-- <div class="visibility-toggle">
                  <a-select v-if="!isMobile" v-model:value="isPublic" class="visibility-select"
                    :options="visibilityOptions" @change="handleVisibilityChange" :dropdownMatchSelectWidth="false"
                    :bordered="false">
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
                    <span class="visibility-name">{{visibilityOptions.find((opt) => opt.value === isPublic)?.label ||
                      "Public" }}</span>
                    <DownOutlined class="dropdown-icon" />
                  </div>
                </div> -->
                <div class="mcp-button-container" v-if="!isTwins && workMode !== 'chat'">
                  <!-- MCP服务器 -->
                  <a-dropdown :trigger="['click']" placement="top" class="mcp-dropdown">
                    <a-button class="mcp-button"
                      :class="{ 'mcp-button-active': selectedMcpServerIds && selectedMcpServerIds.length > 0 }">
                      <template #icon>
                        <CloudServerOutlined />
                      </template>
                      MCP
                    </a-button>
                    <template #overlay>
                      <a-menu :selectedKeys="mcpMenuSelectedKeys" multiple class="mcp-server-menu"
                        @click="handleMcpMenuClick">
                        <a-menu-item key="disable">
                          <span>Close MCP</span>
                        </a-menu-item>
                        <a-menu-divider />
                        <a-menu-item v-for="server in mcpServers" :key="server.id" class="mcp-server-item">
                          <span>{{ server.name }}</span>
                          <CheckOutlined v-if="selectedMcpServerIds && selectedMcpServerIds.includes(server.id)"
                            class="check-icon" />
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
                <SendIcon />
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
          <div v-for="option in visibilityOptions" :key="option.value" class="option-item"
            :class="{ selected: option.value === isPublic }" @click="handleMobileVisibilitySelect(option.value)">
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
  <a-modal v-model:open="showUpgradeModal" :title="upgradeTitle" centered width="1200px" :footer="null"
    @cancel="closeModal">
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
import SendIcon from '@/assets/svg/send-icon.svg';
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
import ModeSelector from "./ModeSelector.vue";

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
const fileList = ref([]);
const currentMode = ref("text");
const isPublic = ref(true); // 默认 public
const showRechargeModal = ref(false);

// 工作模式
const workMode = ref(localStorage.getItem("workMode") || "twins"); // 从缓存读取，默认Auto模式
const isManualWorkModeChange = ref(false); // 标记是否为手动切换模式

const mcpServers = ref([]);
const selectedMcpServerIds = ref([]);

const emit = defineEmits(["send", "modeChange"]);

// const visibilityOptions = computed(() => {
//   // 如果当前 agent 是私有的，显示提示信息和所有选项（Public 为只读）
//   if (agent.value && agent.value.is_public === false) {
//     return [
//       {
//         value: "disabled-info",
//         label: "Info",
//         desc: "Agent is Personal, so conversation must be Personal",
//         disabled: true,
//         isInfo: true
//       },
//       {
//         value: true,
//         label: "Public",
//         desc: "Anyone can view and remix",
//         disabled: true,
//         isReadonly: true
//       },
//       {
//         value: false,
//         label: "Personal",
//         desc: "Only visible to yourself",
//       },
//     ];
//   }

//   // 默认情况下显示所有选项
//   return [
//     {
//       value: true,
//       label: "Public",
//       desc: "Anyone can view and remix",
//     },
//     {
//       value: false,
//       label: "Personal",
//       desc: "Only visible to yourself",
//     },
//   ];
// });

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
const isMobile = ref(window.innerWidth <= 768); // 初始化时立即检测
const showVisibilityModal = ref(false);

// ---------------- 计算属性 ------------------
const isLogin = computed(() => !!user.value.id);

const chatMode = computed(() => chatStore.mode);

// 根据 workMode 动态返回 placeholder
const placeholder = computed(() => {
  return t(`lemon.welcome.placeholders.${workMode.value}`) || t("lemon.welcome.placeholder");
});

// 检查是否为 twins 模式（基于模式选择器的值）
const isTwins = computed(() => {
  return workMode.value === 'twins';
});

// 检查当前对话是否有 twins_id（用于判断是否禁用模式切换）
const hasTwinsId = computed(() => {
  // 如果当前对话没有 twins_id 但有普通消息，则不能切换到 twins 模式
  const hasRegularMessages = (chatStore.messages?.length || 0) > 0;
  const currentHasTwinsId = chatStore.chat?.twins_id;

  console.log("hasTwinsId check:", {
    hasRegularMessages,
    currentHasTwinsId,
    twinsChatMessagesLength: chatStore.twinsChatMessages?.length || 0
  });

  // 只有真正有 twins_id 的对话才返回 true
  return currentHasTwinsId && (chatStore.twinsChatMessages?.length || 0) > 0;
});

// 监听 twins_id 变化，自动设置 workMode
watch([hasTwinsId, () => chatStore.messages?.length || 0, () => chatStore.chat?.twins_id], (newVal, oldVal) => {
  // 如果是手动切换模式，跳过自动设置逻辑
  if (isManualWorkModeChange.value) {
    return;
  }

  // 如果是首次执行（oldVal 为 undefined），不执行自动设置
  // 让组件使用 localStorage 中的初始值
  if (!oldVal) {
    return;
  }

  const currentHasTwinsId = chatStore.chat?.twins_id;
  const hasRegularMessages = (chatStore.messages?.length || 0) > 0;

  if (hasTwinsId.value && workMode.value !== 'twins') {
    // 如果当前对话有 twins_id，自动设置为 twins 模式
    workMode.value = 'twins';
    localStorage.setItem("workMode", 'twins');
  } else if (!currentHasTwinsId && hasRegularMessages && workMode.value === 'twins') {
    // 如果没有 twins_id 但有普通消息，且当前是twins模式，则切换到 auto 模式
    workMode.value = 'auto';
    localStorage.setItem("workMode", 'auto');
  }
}, { immediate: true });

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
  const newIsMobile = window.innerWidth <= 768;
  if (isMobile.value !== newIsMobile) {
    isMobile.value = newIsMobile;
  }
};

// 移动端弹窗控制函数
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
const handleMobileVisibilitySelect = (value) => {
  // 过滤掉信息提示选项
  if (value === "disabled-info") {
    return;
  }
  handleVisibilityChange(value);
  closeVisibilityModal();
};

// ---------------- 生命周期 ------------------
// 监听 localStorage 变化
const handleStorageChange = (e) => {
  if (e.key === 'workMode' && e.newValue) {
    // 设置手动切换标志，防止 watch 覆盖
    isManualWorkModeChange.value = true;
    workMode.value = e.newValue;

    // 延迟重置标志，给 watch 足够的时间检测到
    setTimeout(() => {
      isManualWorkModeChange.value = false;
    }, 100);
  }
};

onMounted(async () => {
  checkMobile();
  // 监听窗口大小变化
  window.addEventListener("resize", checkMobile);
  // 监听 localStorage 变化
  window.addEventListener("storage", handleStorageChange);

  // 立即注册所有监听器，不要等待异步操作
  emitter.on("changeMessageText", (text) => {
    messageText.value = text;
  });

  emitter.on("showUpgrade", () => {
    upgradeTitle.value = "";
    upgradeDes.value = "You don't have enough credits, and the prediction can't complete the task. ";
    upgradeDes1.value = "Please upgrade or purchase more credits.";
    showUpgradeModal.value = true;
  });

  // 监听菜单发送的 workMode 更新事件
  emitter.on("updateWorkMode", (newWorkMode) => {
    // 设置手动切换标志，防止 watch 覆盖
    isManualWorkModeChange.value = true;
    workMode.value = newWorkMode;

    // 延迟重置标志，给 watch 足够的时间检测到
    setTimeout(() => {
      isManualWorkModeChange.value = false;
    }, 100);
  });

  // 检查是否有来自落地页的预填充问题
  const prefillQuestion = sessionStorage.getItem('prefillQuestion');
  const prefillQuestionSource = sessionStorage.getItem('prefillQuestionSource');

  if (prefillQuestion && prefillQuestionSource === 'landing') {
    // 预填充到输入框
    messageText.value = prefillQuestion;

    // 清除 sessionStorage 中的数据，避免重复使用
    sessionStorage.removeItem('prefillQuestion');
    sessionStorage.removeItem('prefillQuestionSource');
  }

  // 最后再执行异步操作
  await initModel();
  await fetchMcpServers();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  window.removeEventListener("storage", handleStorageChange);
  // 清理 emitter 事件监听器
  emitter.off("changeMessageText");
  emitter.off("showUpgrade");
  emitter.off("updateWorkMode");
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

const updateChat = async () => {
  if (chat.value) {
    chatStore.updateConversationVisibilityById(chat.value.is_public, chat.value.conversation_id);
  }
};

// -------------- 函数定义 ------------------

const closeModal = () => {
  showUpgradeModal.value = false;
};

// 处理模式切换 (简化版，主要逻辑已移到 ModeSelector 组件)
const handleModeChange = (mode) => {
  console.log("Mode changed to:", mode);
  // 向父组件抛出模式切换事件
  emit("modeChange", mode);
};
const handleVisibilityChange = (value) => {
  console.log("handleVisibilityChange", value);

  // // 过滤掉信息提示选项
  // if (value === "disabled-info") {
  //   return;
  // }

  // // 如果 agent 是私有的，不允许设置 conversation 为公开
  // if (agent.value && agent.value.is_public === false && value === true) {
  //   return; // 静默阻止，因为选项已经显示为只读
  // }

  // if (!value) {
  //   // 判断 是不是 会员
  //   if (!membership.value?.planName) {
  //     isPublic.value = true;
  //     upgradeTitle.value = "Upgrade required";
  //     upgradeDes.value = "";
  //     showUpgradeModal.value = true;
  //     return;
  //   }
  // }
  // agent.value.is_public = value;
  // updateAgent();
  // updateChat();

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

// 监听 agent.value
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

// 监听 agent 变化，如果 agent 是私有的，强制设置 conversation 为私有
// watch(
//   () => agent.value,
//   (newAgent) => {
//     if (newAgent && newAgent.is_public === false) {
//       // 如果 agent 是私有的，强制将 conversation 设置为私有
//       if (isPublic.value === true) {
//         isPublic.value = false;
//         if (chat.value) {
//           chat.value.is_public = false;
//           updateChat();
//         }
//       }
//     }
//   },
//   {
//     immediate: true,
//   }
// );

const modelList = ref([]);
const initModel = async () => {
  console.log("membership.value", membership.value);

  // 设置默认模型为 deepseek-v3
  const setDefaultModel = (models) => {
    if (models.length > 0 && !model_id.value) {
        const defaultId = models[0].id * 1;
        model_id.value = defaultId;
        console.log("未找到 kimi-k2 模型，使用第一个模型:", defaultId);
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
  if (!text) return;

  if (points.value.total <= 100) {
    // handleNotification("/setting/usage", t("auth.insufficientPoints"), t("auth.insufficientPointsPleaseGoToUpgradeOrPurchase"));
    upgradeDes.value = "You don’t have enough credits, and the prediction can’t complete the task. ";
    upgradeDes1.value = "Please upgrade or purchase more credits.";
    upgradeTitle.value = "";
    showUpgradeModal.value = true;
    return;
  }
  console.log("workMode.value", workMode.value);

  // 在 chat 或 twins 模式下清空文件列表
  // if (workMode.value === 'chat' || workMode.value === 'twins') {
  //   fileList.value = [];
  // }

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
    // 只有满足 messageStatus 才能发送
    console.log("Enter messageStatus.value", messageStatus.value);
    if (messageStatus.value) {
      handleSend();
    }
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

/* 信息提示选项样式 - 简化版 */
.info-option {}

.disabled-option {
  cursor: not-allowed !important;
  opacity: 0.5;
  color: #999 !important;
}

.readonly-option {
  cursor: not-allowed !important;
  opacity: 0.6;
  background-color: #f9f9f9 !important;
}

.info-icon {
  width: 16px;
  height: 16px;
  border: 1px solid #333;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #333;
  background-color: #fff;
  margin-top: 3px;
}

.info-icon-mobile {
  width: 16px;
  height: 16px;
  border: 1px solid #333;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #333;
  background-color: #fff;
  margin-top: 3px;
}

/* 移动端信息选项样式 */
.info-item {
  background-color: #f5f5f5 !important;
  cursor: default !important;
}

.disabled-item {
  cursor: not-allowed !important;
  opacity: 0.5;
  color: #999 !important;
}

.readonly-item {
  cursor: not-allowed !important;
  opacity: 0.6;
  background-color: #f9f9f9 !important;
}

.info-item:hover {
  background-color: #f5f5f5 !important;
}

.readonly-item:hover {
  background-color: #f9f9f9 !important;
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
  width: 32px;
  height: 31px;
  border-radius: 8px;
  border: unset !important;
  background-color: rgba(255, 199, 0, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  width: 32px;
  height: 32px;
}

.send-button:hover:not(:disabled) {
  background: rgba(255, 199, 0, 1);
  transform: translateY(-1px);
}

.stop-button {
  background: rgba(255, 199, 0, 1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: pointer;
  border: unset !important;

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


@media (min-width: 640px) {
  .chat-input {
    max-width: 1039px !important;
    min-width: 390px !important;
  }
}

.chat-input {
  border-radius: 22px;
  position: sticky;
  bottom: 0;
  padding-bottom: 0.75rem;
  background: #f8f8f7;
  padding-top: 0.75rem;
}

.input-wrapper {
  margin: 0 auto;
  width: 100%;
}

.input-area {
  // display: flex;
  // gap: 0;
  // background: #fff;
  // align-items: flex-end;
  // border: 1px solid rgb(229, 231, 235);
  // border-radius: 22px;
  // padding: 0.75rem;
  // transition: border-color 0.3s;


  display: flex;
  flex-direction: column;
  min-height: 140px;
  padding: 20px 20px 12px 20px;
  line-height: 20px;
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 1);
  color: rgba(255, 255, 255, 1);
  font-size: 14px;
  text-align: center;
  box-shadow: 0px 1px 10px 0px rgba(0, 0, 0, 0.03);
  font-family: PingFangSC-regular;
  border: 1px solid rgba(236, 236, 236, 1);

}

.input-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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
  display: contents;
  /* 让button-row容器不影响布局 */
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

/* 统一所有Ant Design组件的圆角 */
:deep(.ant-select-selector),
:deep(.ant-btn),
:deep(.ant-dropdown-trigger) {
  border-radius: 6px !important;
}

/* 移动端触发器样式 */
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

.mobile-visibility-trigger .visibility-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 2px;
}

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
  .chat-input .left-actions .first-row>* {
    height: 24px;
    display: flex;
    align-items: center;
  }

  /* 第二行按钮样式 */
  .chat-input .left-actions .second-row>* {
    height: 24px;
    display: flex;
    align-items: center;
  }

  /* 第一行：上传按钮 */
  .chat-input .left-actions .first-row .chat-input-upload {
    width: auto;
    flex: 0 0 auto;
    justify-content: center;
  }

  /* 第一行：模式选择器 */
  .chat-input .left-actions .first-row .mode-selector-wrapper {
    flex: 0 0 auto;
    min-width: 60px;
    max-width: 90px;
    pointer-events: auto !important;
    position: relative !important;
  }

  .chat-input .left-actions .mode-selector-wrapper .mobile-mode-trigger {
    width: 100% !important;
    font-size: 10px !important;
    padding: 0 4px !important;
    pointer-events: auto !important;
    cursor: pointer !important;
    position: relative !important;
    z-index: 1 !important;
  }

  .chat-input .left-actions .mode-selector-wrapper .mobile-mode-trigger .mode-name {
    max-width: none !important;
    flex: 1 !important;
    color: #333 !important;
    line-height: 24px !important;
    pointer-events: none !important;
  }

  .chat-input .left-actions .mode-selector-wrapper .mobile-mode-trigger .dropdown-icon {
    font-size: 10px !important;
    color: #666 !important;
    pointer-events: none !important;
  }

  /* 第一行：可视化选择 */
  .chat-input .left-actions .first-row .visibility-toggle {
    flex: 0 0 auto;
    min-width: 60px;
    max-width: 80px;
  }

  /* 第一行：MCP按钮 */
  .chat-input .left-actions .first-row .mcp-button-container {
    flex: 0 0 auto;
    min-width: 50px;
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
    width: 100%;

    div {
      height: 24px !important;
      max-height: 24px !important;
      width: 100% !important;
    }

    .mobile-visibility-trigger {
      width: 100% !important;
      font-size: 10px !important;
      padding: 0 4px !important;
      pointer-events: auto !important;
      cursor: pointer !important;
      position: relative !important;
      z-index: 1 !important;
    }

    .mobile-visibility-trigger .visibility-name {
      flex: 1 !important;
      color: #333 !important;
      line-height: 24px !important;
      pointer-events: none !important;
    }

    .mobile-visibility-trigger .dropdown-icon {
      font-size: 10px !important;
      color: #666 !important;
      pointer-events: none !important;
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
