<template>
  <WelcomeLayout
    :greeting="$t('lemon.welcome.greeting', { username })"
    :description="welcomeDescription"
    @rootClick="closeDropdown"
  >
    <template #header>
      <!-- AgentWelcome 模式：显示 agent 名称和下拉菜单 -->
      <div v-if="isAgentMode" class="welcome-mode agent-mode">
        <span>{{ agent.name }}</span>
        <div class="dropdown-icon-wrapper" @click.stop="toggleDropdown">
          <CaretDownOutlined class="dropdown-icon" />
          <div v-if="showDropdown" class="dropdown-menu">
            <div class="menu-item" @click.stop="openEdit">
              <EditOutlined class="icon" /> Edit
            </div>
            <div class="menu-item" @click.stop="editKnowledge">
              <ReadOutlined class="icon" /> Experience
            </div>
          </div>
        </div>
      </div>

      <!-- Welcome 模式：显示移动端菜单 -->
      <template v-else>
        <div class="welcome-header">
          <button class="mobile-menu-btn" @click="toggleMobileMenu">
            <MobileMenuIcon />
          </button>
        </div>
        <div class="welcome-mode">
          <!-- <h2>{{handleModeTitle }}</h2> -->
        </div>
      </template>
    </template>

    <template #input>
      <ChatInput @send="handleWelcomeInput" @modeChange="handleModeChange" />
    </template>

    <template #sample>
      <Sample @sampleClick="sampleClick" />
    </template>

    <template #extra>
      <!-- AgentWelcome 模式：编辑和知识库模态框 -->
      <template v-if="isAgentMode">
        <KnowledgeModal ref="knowledgeModalRef" :agentId="null" />
        <AgentsEdit v-model:visible="editVisible" v-model:id="agent.id" />
      </template>

      <!-- Welcome 模式：Agent 创建加载动画 -->
      <div v-if="isLoadingVisible" class="agent-loading">
        <div class="loader"></div>
        <p class="tip">{{ tip }}</p>
      </div>
    </template>
  </WelcomeLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { CaretDownOutlined, EditOutlined, DeleteOutlined, ReadOutlined } from '@ant-design/icons-vue';

import WelcomeLayout from './components/WelcomeLayout.vue';
import ChatInput from '@/view/lemon/components/ChatInput.vue';
import Sample from '@/view/lemon/components/Sample.vue';
import MobileMenuIcon from '@/assets/svg/mobile-menu-icon.svg';
import KnowledgeModal from '@/view/agents/components/KnowledgeModal.vue';
import AgentsEdit from '@/view/agents/components/agentsEdit.vue';

import { useChatStore } from '@/store/modules/chat';
import seeAgent from '@/services/see-agent';
import agentServices from '@/services/agent';
import emitter from '@/utils/emitter';
import { useWelcomeCommon } from './composables/useWelcomeCommon';

const chatStore = useChatStore();
const router = useRouter();
const { chatInfo, mode, agent } = storeToRefs(chatStore);

// 使用共享逻辑
const { username, welcomeDescription, sampleClick, handleModeChange } = useWelcomeCommon();

// 判断是否为 Agent 模式（有 agentId）
const props = defineProps({
  agentId: {
    type: String,
    default: null
  }
});

const isAgentMode = computed(() => !!props.agentId);

// Agent 模式特有的逻辑
const knowledgeModalRef = ref(null);
const editVisible = ref(false);
const showDropdown = ref(false);

const editKnowledge = () => {
  console.log('editKnowledge');
  showDropdown.value = false;
  knowledgeModalRef.value.visible = true;
};

const openEdit = () => {
  showDropdown.value = false;
  editVisible.value = true;
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const closeDropdown = () => {
  if (isAgentMode.value) {
    showDropdown.value = false;
  }
};

// Welcome 模式特有的逻辑
const isLoadingVisible = ref(false);
const tip = ref('Creating Agent...');

function show(initialTip = 'Creating Agent...') {
  tip.value = initialTip;
  isLoadingVisible.value = true;
}

function update(newTip) {
  tip.value = newTip;
}

function hide() {
  isLoadingVisible.value = false;
}

// 移动端菜单按钮点击处理
const toggleMobileMenu = () => {
  console.log('toggleMobileMenu');
  emitter.emit('toggleMobileMenu', true);
};

// 统一的输入处理逻辑
const handleWelcomeInput = async (value) => {
  const { text, files, mcp_server_ids, is_public, workMode } = value;
  const result = await chatStore.createConversation(text, workMode);
  const { conversation_id } = result;

  // Agent 模式：直接使用当前 agent
  if (isAgentMode.value) {
    console.log('agent.value', agent.value);  
    if (conversation_id) {
      router.push(`/lemon/${agent.value.id}/${conversation_id}`);
    }
    await seeAgent.sendMessage(text, conversation_id, files, mcp_server_ids, workMode);
  }
  // Welcome 模式：创建新 agent
  else {
    show('Creating Agent...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    update('Learning from the Experience base...');
    let res = await agentServices.generate(text, conversation_id, is_public);
    hide();
    // 刷新 agent
    emitter.emit('selectedAgent', res);
    router.push(`/lemon/${res.id}/${conversation_id}`);
    await seeAgent.sendMessage(text, conversation_id, files, mcp_server_ids, workMode);
  }
};

const handleModeTitle = computed(() => {
  if (mode.value === 'chat') {
    return 'ChatBot';
  }
  return 'Agent';
});

// 监听工作模式变化
onMounted(() => {
  emitter.on('updateWorkMode', (workMode) => {
    console.log('收到 updateWorkMode 事件:', workMode);
  });
});

onUnmounted(() => {
  emitter.off('updateWorkMode');
});
</script>

<style lang="scss" scoped>
.welcome-mode {
  display: flex;
  width: 100%;
  justify-content: center;
  margin-top: 20px;

  &.agent-mode {
    align-items: center;
    position: sticky;
    top: 0;
    font-size: 16px;
    margin-top: 8px;
    color: #333;
    width: fit-content;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: #f8f8f7;
    z-index: 100;
    width: 100%;
  }
}

.dropdown-icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 4px 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 120px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 13px;
    cursor: pointer;
    color: #333;

    &.danger {
      color: #ff4d4f;
    }

    &:hover {
      background-color: #0000000f;
    }
  }
}

.dropdown-icon {
  font-size: 16px;
  color: #999;
}

/* 默认隐藏移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
}

.agent-loading {
  position: fixed;
  top: 0;
  left: 278px;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.loader {
  --w: 10ch;
  font-weight: bold;
  font-family: monospace;
  font-size: 30px;
  line-height: 1.4em;
  letter-spacing: var(--w);
  width: var(--w);
  overflow: hidden;
  white-space: nowrap;
  color: #0000;
  text-shadow:
    calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000,
    calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000;
  animation: l20 2s infinite linear;
}

.loader:before {
  content: "Loading...";
}

.tip {
  margin-top: 20px;
  font-size: 18px;
  color: #333;
}

@keyframes l20 {
  9.09% { text-shadow: calc(0 * var(--w)) -10px #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000 }
  18.18% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) -10px #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000 }
  27.27% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) -10px #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000 }
  36.36% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) -10px #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000 }
  45.45% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) -10px #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000 }
  54.54% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) -10px #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000 }
  63.63% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) -10px #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000 }
  72.72% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) -10px #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) 0 #000 }
  81.81% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) -10px #000, calc(-9 * var(--w)) 0 #000 }
  90.90% { text-shadow: calc(0 * var(--w)) 0 #000, calc(-1 * var(--w)) 0 #000, calc(-2 * var(--w)) 0 #000, calc(-3 * var(--w)) 0 #000, calc(-4 * var(--w)) 0 #000, calc(-5 * var(--w)) 0 #000, calc(-6 * var(--w)) 0 #000, calc(-7 * var(--w)) 0 #000, calc(-8 * var(--w)) 0 #000, calc(-9 * var(--w)) -10px #000 }
}

@media (max-width: 768px) {
  .agent-loading {
    left: 0 !important;
  }
}

@media screen and (max-width: 768px) {
  .welcome-mode {
    margin-top: 8px;

    &.agent-mode {
      height: 48px;
      position: sticky;
      top: 0;
      background-color: #f8f8f7;
      z-index: 1;
    }
  }

  .welcome-header {
    height: 48px;
    position: sticky;
    top: 0;
    background-color: #f8f8f7;
    z-index: 1;
    display: flex;
    align-items: center;
  }

  /* 移动端显示菜单按钮 */
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    color: #333;
    transition: background-color 0.2s ease;

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .icon {
    display: none;
  }
}
</style>
