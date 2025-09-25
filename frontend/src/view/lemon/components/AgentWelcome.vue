<template>
  <div class="welcome-screen" @click="closeDropdown">
    <div class="welcome-mode">
      <span>{{ agent.name }}</span>
      <div class="dropdown-icon-wrapper" @click.stop="toggleDropdown">
        <CaretDownOutlined class="dropdown-icon" />
        <div v-if="showDropdown" class="dropdown-menu">
          <div class="menu-item" @click.stop="openEdit">
            <EditOutlined class="icon" /> Edit
          </div>
          <div class="menu-item" @click.stop="editKnowledge">
            <ReadOutlined class="icon" /> Knowledge
          </div>
          <!-- <div class="menu-item danger" @click.stop="confirmDelete(agent.id)">
            <DeleteOutlined class="icon" /> Delete
          </div> -->
        </div>
      </div>
    </div>


    <div class="welcome-content">
      <h1>{{ $t('lemon.welcome.greeting', { username }) }}</h1>
      <p>Create, Training, Evoloving you new Agent</p>
      <ChatInput @send="handleWelcomeInput" />
    </div>

    <KnowledgeModal ref="knowledgeModalRef" :agentId="null" />
    <AgentsEdit v-model:visible="editVisible" v-model:id="agent.id" />
   
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ChatInput from './ChatInput.vue';

import { CaretDownOutlined } from '@ant-design/icons-vue';
import { useChatStore } from '@/store/modules/chat';
import seeAgent from '@/services/see-agent';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import emitter from '@/utils/emitter';
import { storeToRefs } from 'pinia';
import { EditOutlined, DeleteOutlined, ReadOutlined } from '@ant-design/icons-vue'

const chatStore = useChatStore();
const router = useRouter();
const { t } = useI18n();
const { mode, agent } = storeToRefs(chatStore);
const props = defineProps({
  username: String
});

import KnowledgeModal from '@/view/agents/components/KnowledgeModal.vue';
import AgentsEdit from '@/view/agents/components/agentsEdit.vue'

const knowledgeModalRef = ref(null);
const editVisible = ref(false);

const editKnowledge = () => {
  console.log('editKnowledge');
  showDropdown.value = false;
  knowledgeModalRef.value.visible = true;
};

const openEdit = () => {
  showDropdown.value = false;
  editVisible.value = true;
};

const sampleClick = (item) => {
  emitter.emit('changeMessageText', item.content);
};

const handleWelcomeInput = async (value) => {
  const { text, files, mcp_server_ids,workMode } = value;
  const result = await chatStore.createConversation(text, mode.value);
  const { conversation_id } = result;
  if (conversation_id) {
    router.push(`/lemon/${agent.value.id}/${conversation_id}`);
  }
  if (mode.value === 'chat') {
    await seeAgent.sendMessage(text, conversation_id, [], mcp_server_ids,workMode);
  } else {
    await seeAgent.sendMessage(text, conversation_id, files, mcp_server_ids,workMode);
  }
};

const handleModeTitle = computed(() => {
  return 'Agent';
});

const showDropdown = ref(false);

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const closeDropdown = () => {
  showDropdown.value = false;
};
</script>

<style lang="scss" scoped>
.welcome-screen {
  background: #f8f8f7;
  overflow: auto;
  height: 100%;
}

.welcome-content {
  margin-top: 180px;
  margin-left: auto;
  margin-right: auto;
  max-width: 768px;
  width: 100%;
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;

  h1 {
    line-height: 40px;
    font-size: 32px;
    color: #34322d;
    margin: 0 !important;
  }

  p {
    color: #858481;
    font-size: 32px;
    margin-bottom: 16px;
  }
}

.welcome-mode {
  display: flex;
  align-items: center;
  position: relative;
  font-size: 16px;
  margin-top: 8px;
  color: #333;
  width: fit-content;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    // background-color: #0000000f;
  }
}

.dropdown-icon-wrapper {
  position: relative; // 作为 dropdown-menu 的定位基准
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;

  .dropdown-menu {
    position: absolute;
    top: 100%; // 紧挨着下拉 icon 下边
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


.case-container {
  margin-top: 92px;
  padding: 0 2.5rem 100px;
}

.store {
  margin-top: 100px;

  ::v-deep(.card-grid) {
    max-height: unset;
  }
}

@media (max-width: 768px) {
  .case-container {
    padding-left: 2px !important;
    padding-right: 2px !important;
  }

  .welcome-screen{
      padding: 0px 16px;
      ::v-deep(.store .mobile-menu-btn) {
        display: none!important;
      }
      //main-content
      ::v-deep(.store .main-content) { 
        padding:0px;
      }
      //search-bar-wrapper
      ::v-deep(.store .search-bar-wrapper) {
        width: 100%;
        justify-content: space-between!important;
      }
  }
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;

  &::-webkit-scrollbar {
    display: none;
  }
}

.case-title {
  margin: 1.25rem 0;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #b9b9b7;
}

.tab {
  padding: 7px 1rem;
  border-radius: 999999px;
  border: 1px solid #0000000f;
  color: #858481;
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: #f5f5f5;
  }

  &.active {
    background: #000;
    color: #fff;
    font-weight: 600;
  }
}

@media screen and (max-width: 768px) {
  .welcome-header {
    height: 48px;
    position: sticky;
    top: 0;
    background-color: #f8f8f7;
    z-index: 1;
  }

  .icon {
    display: none;
  }
}

.dropdown-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.dropdown-icon {
  font-size: 16px;
  color: #999;
}

/* 适配 移动端 */
@media screen and (max-width: 768px) {
  .welcome-content {
    h1 {
      display: none;
    }

    p {
      font-size: 16px !important;
      text-align: center;
    }
  }
}
</style>
