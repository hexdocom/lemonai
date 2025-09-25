<template>
  <div :class="isCollapsed ? 'second-menu' : 'second-menu collapsed'" v-show="!(isPreviewVisible && isMobile())" @click="handleOverlayClick">
    <button class="menu-button" @click.stop="toggleCollapse" v-if="isCollapsed && showCollapse && !(isPreviewVisible && isMobile())">
      <span class="menu-icon">
        <LeftList style="width: 22px; height: 22px;" />
      </span>
    </button>
    <!-- side container -->
    <div class="sidebar-container" v-show="!isCollapsed && showCollapse" @click.stop>
      <div class="sidebar" :class="{ 'collapsed': isCollapsed }">
        <!-- header -->
        <div class="sidebar-header">
          <div class="header-content">
            <!-- <span class="header-title"></span> -->
            <!-- 移动端显示返回箭头 -->
            <button class="collapse-btn mobile-only" @click="handleBackToLemon">
              <ArrowLeftOutlined style="width: 20px; height: 20px;" />
            </button>
            <!-- PC端显示收起按钮 -->
            <button class="collapse-btn pc-only" @click="toggleCollapse">
              <LeftList style="width: 20px; height: 20px;" />
            </button>
          </div>
        </div>

        <!-- new task -->
        <div class="sidebar-new-task">
          <button class="new-task-button" @click="handleNewChat">
            <span class="plus-icon">
              <Add style="width: 16px; height: 16px;" />
            </span>
            <span v-if="mode == 'task'" class="button-text">New Task</span>
            <span v-else class="button-text">New Chat</span>
          </button>
        </div>

        <!-- sconver -->
        <div class="sidebar-content">
          <div class="chat-list">
             <!-- {{ conversationId }} -->
            <div v-for="chat in chats" :key="chat.conversation_id" class="chat-item"
              :class="{ 'active': chat.conversation_id === conversationId }" @click="handleChatClick(chat)">
              <div class="chat-details">
                <div class="chat-header">
                  <div class="chat-title">{{ chat.title }}</div>
                  <div class="chat-time">{{ formatTime(chat.update_at,t) }}</div>
                </div>
                <div class="chat-last-message" :title="chat.last_message">{{ chat?.latest_message?.content }}</div>
                <div class="chat-footer">
                  <div class="chat-model-info">
                    <div class="chat-model-name" v-if="chat.model_name">
                      {{ chat.model_name }}
                    </div>
                  </div>
                  <div class="more-options">
                    <a-tooltip title="More" placement="top" :arrow="false">
                      <More class="more-options-icon" @click.stop="toggleDropdown(chat.conversation_id)" />
                    </a-tooltip>
                    <div class="more-options-dropdown" @mouseleave="dropdownVisible = null"  v-if="dropdownVisible === chat.conversation_id">
                      <div class="more-options-item" @click.stop="handleEditName(chat)">
                        <Edit />
                        <span class="more-options-item-text">Rename</span>
                      </div>
                      <div class="more-options-item err" @click.stop="showDeleteConfirm(chat)">
                        <Delete />
                        <span class="more-options-item-text">Delete</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!chats.length" class="no-chats">
              <Chat style="width: 24px; height: 24px;" />
              <span>No Conversation</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- delete modal -->
    <a-modal v-model:open="deleteModalVisible" :title="$t('lemon.sidebar.confirmDelete')">
      <p>{{ $t('lemon.sidebar.deleteConfirmation') }}</p>
      <template #footer>
        <a-button @click="handleCancel">{{ $t('lemon.sidebar.cancel') }}</a-button>
        <a-button type="primary" @click="handleDelete">{{ $t('lemon.sidebar.confirm') }}</a-button>
      </template>
    </a-modal>

    <!-- edit modal -->
    <a-modal v-model:open="editModalOpen" title="Edit Title" centered :width="400" :footer="null" class="edit-title-modal">
      <span class="edit-title">Enter new title</span>
      <a-input v-model:value="titleValue" class="edit-title-input" />
      <footer>
        <div class="footer-btn">
          <div class="cancel-btn" @click="handleCancelEdit">Cancel</div>
          <div class="confirm-btn" @click="handleOkEdit">Confirm</div>
        </div>
      </footer>
    </a-modal>

    <!-- search modal -->
    <a-modal v-model:open="searchModalVisible" :footer="null" :centered="true" :closable="false">
      <template #title>
        <div class="search-header">
          <div class="search-header-icon">
            <MenuSearch style="width: 24px; height: 24px;" />
          </div>
          <a-input v-model:value="searchValue" placeholder="Search conversations" />
          <div class="search-header-icon" @click="handleCancel">
            <Close style="width: 24px; height: 24px;" />
          </div>
        </div>
      </template>
      <div class="search-content">
        <div v-for="chat in chats" :key="chat.conversation_id" class="chat-item"
          :class="{ 'active': chat.conversation_id === conversationId }" @click="handleChatClick(chat)">
          <div class="chat-details">
            <div class="chat-header">
              <div class="chat-title">{{ chat.title }}</div>
              <div class="chat-time">{{ formatTime(chat.update_at,t) }}</div>
            </div>
            <div class="chat-footer" v-if="modal == 'task'">
              <div class="chat-last-message" :title="chat.last_message">{{ chat?.latest_message?.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'

import { useChatStore } from '@/store/modules/chat'
import { formatTime } from '@/utils/time'
import emitter from '@/utils/emitter'

import LeftList from '@/assets/svg/leftList.svg'
import Add from '@/assets/svg/add.svg'
import MenuSearch from '@/assets/svg/menuSearch.svg'
import Close from '@/assets/filePreview/close.svg'
import Chat from '@/assets/svg/chat.svg'
import More from '@/assets/svg/more.svg'
import Edit from '@/assets/svg/edit.svg'
import Delete from '@/assets/svg/delete.svg'
const chatStore = useChatStore()
const { chatInfo, agent, conversationId, mode } = storeToRefs(chatStore)
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const isCollapsed = ref(true)

// define props
const props = defineProps({
  chats: {
    type: Array,
    default: () => [],
  }
});

const showCollapse = ref(false)
const isPreviewVisible = ref(false)

const isMobile = () => {
  return window.innerWidth <= 768
}

function updateCollapse() {
  console.log('route ===== ', route.path.includes('/lemon'))
  if (!route.path.includes('/lemon')) {
    showCollapse.value = false
    return
  }
  showCollapse.value = !!route.params.agentId
}

updateCollapse()

watch(
  () => route.fullPath,
  () => {
    updateCollapse()
  }
)


const emit = defineEmits(['update:isCollapsed', 'selectChat', 'newChat', 'editChat', 'deleteChat'])

const dropdownVisible = ref(null)
const deleteModalVisible = ref(false)
const editModalOpen = ref(false)
const searchModalVisible = ref(false)
const titleValue = ref('')
const chatToDelete = ref(null)
const editChat = ref(null)

const toggleCollapse = () => {
  console.log('toggleCollapse', isCollapsed)
  isCollapsed.value = !isCollapsed.value
}

const handleBackToLemon = () => {
  isCollapsed.value = true
  
  chatStore.conversationId = null
  chatStore.clearMessages()
  
  setTimeout(() => {
    emitter.emit('toggleMobileMenu', true)
  }, 100)
  
  router.push('/lemon')
}

const handleOverlayClick = () => {
  if (isMobile()) {
    console.log('handleOverlayClick')
    closeCollapse()
  }
}

const closeCollapse = () => {
  isCollapsed.value = true
}

const openCollapse = () => {
  isCollapsed.value = false
}

emitter.on('close-collapse', closeCollapse)
emitter.on('open-collapse', openCollapse)

emitter.on('preview', () => {
  console.log('Preview opened, hiding second-menu');
  isPreviewVisible.value = true;
});
emitter.on('preview-close', () => {
  console.log('Preview closed, showing second-menu');
  isPreviewVisible.value = false;
});

//fullPreviewVisable-open
emitter.on('fullPreviewVisable', () => {
  console.log('Preview opened, hiding second-menu');
  isPreviewVisible.value = true;
});

// // fullPreviewVisable-close
emitter.on('fullPreviewVisable-close', () => {
  isPreviewVisible.value = false;
});

onUnmounted(() => {
  emitter.off('close-collapse', closeCollapse);
  emitter.off('open-collapse', openCollapse);
  emitter.off('preview');
  emitter.off('preview-close');
  emitter.off('fullPreviewVisable');
  emitter.off('fullPreviewVisable-close');
});

// process new chat click
const handleNewChat = () => {
  closeOtherWindows();
  chatStore.conversationId = null;
  chatStore.clearMessages();
  if(mode.value === 'task'){
    router.push(`/lemon/${agent.value.id}`);
  }else{
    router.push('/lemon');
  }
  
};

const closeOtherWindows = () => {
  emitter.emit('preview-close', false);
  emitter.emit('terminal-visible', false);
  emitter.emit('fullPreviewVisable-close');
};

// process chat click 
const handleChatClick = (chat) => {
  closeCollapse();
  closeOtherWindows();
  console.log("handleChatClick",chat)
  chatStore.conversationId = chat.conversation_id;
  console.log("chatStore.conversationId",conversationId.value)

  chatStore.chat = chat;
  chatStore.clearMessages();
  chatStore.initConversation(chat.conversation_id);
  if(mode.value == 'chat'){
    router.push(`/lemon/chat/${chat.conversation_id}`);
  }else{
    router.push(`/lemon/${agent.value.id}/${chat.conversation_id}`);
  }
};

const toggleDropdown = (conversationId) => {
  dropdownVisible.value = dropdownVisible.value === conversationId ? null : conversationId;
};

const handleEditName = (chat) => {
  editChat.value = chat;
  titleValue.value = chat.title;
  editModalOpen.value = true;
  dropdownVisible.value = null;
};

const handleOkEdit = () => {
  // if (editChat.value) {
  //   emit('editChat', { ...editChat.value, title: titleValue.value });
  // }
  editModalOpen.value = false;
  editModalOpen.value = false
  chatStore.updateConversationTitleById(titleValue.value, editChat.value.conversation_id);
  editChat.value = null
};

const handleCancelEdit = () => {
  editModalOpen.value = false;
  editChat.value = null;
};

const showDeleteConfirm = (chat) => {
  chatToDelete.value = chat;
  deleteModalVisible.value = true;
  dropdownVisible.value = null;
};

const handleDelete = async () => {
  if (chatToDelete.value) {
    try {
      await chatStore.removeConversation(chatToDelete.value.conversation_id);
      deleteModalVisible.value = false;
      chatToDelete.value = null;
      router.push('/lemon');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }
};

const handleCancel = () => {
  deleteModalVisible.value = false;
  searchModalVisible.value = false;
  chatToDelete.value = null;
};

</script>

<style scoped lang="less">
.second-menu {
  display: flex;
  flex-direction: column;
}

.menu-button {
  display: flex;
  top: 1rem;
  // left: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  z-index: 11;
  padding: 8px 8px;

  .menu-icon {
    max-height: 20px;
  }

  .icon {
    display: flex;
    align-items: center;
    margin-left: 8px;
    font-size: 18px;
    font-weight: 700;
    color: #111827;

    img {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
  }
}

.sidebar-container {
  width: 248px;
  height: 100vh;
  background-color: #ebebeb;
  transition: width 0.3s ease;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &.collapsed {
    display: none;
  }
}

.sidebar-header {
  padding: 10px 16px;
  border-bottom: 1px solid #e0e0e0;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      font-size: 16px;
      font-weight: 600;
    }

    .collapse-btn {
      background: none;
      border: none;
      cursor: pointer;
    }
  }
}

.sidebar-new-task {
  padding: 0.75rem;
}

.new-task-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border-radius: 0.5rem;
  background-color: white;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  color: #34322d;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 0 #0000, 0 0 #0000, 0px 0.5px 3px 0px #00000014;
  height: 36px;

  &:hover {
    background-color: #fafafa;
  }

  .plus-icon {
    width: 1rem;
    height: 1rem;
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0.5rem 1.25rem 0.5rem;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #ddd;
    border-radius: 5px;
  }
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-chats {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 48px - 36px - 120px);
  color: #858481;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 10px;
  cursor: pointer;

  &:hover {
    background-color: #37352f0a;

    .more-options-icon{
      display: block;
    }
  }

  &.active {
    background-color: #fff;
  }
}

.chat-details {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.chat-title {
  font-weight: 500;
  font-size: 14px;
  color: #34322d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  margin-left: 8px;
}

.chat-last-message {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #858481;
}

.chat-model-name {
  font-size: 12px;
  color: #34322d;
  white-space: nowrap;
}

.chat-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.more-options {
  border-radius: 6px;
  position: relative;
  width: 22px;
  height: 22px;

  .more-options-icon {
    display: none;
  }

  &:hover {
    border: 1px solid #0000000f;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;

    .more-options-icon {
      display: block;
    }
  }
}

.more-options-dropdown {
  position: absolute;
  padding: 4px;
  z-index: 9999;
  top: 25px;
  right: -10px;
  min-width: 126px;
  border-radius: 0.75rem;
  border: 1px solid #0000001f;
  background-color: #fff;
  box-shadow: 0 4px 11px 0px #00000014;

  .more-options-item {
    display: flex;
    align-items: center;
    justify-content: start;
    gap: 0.75rem;
    cursor: pointer;
    border-radius: 8px;
    color: #535350;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding: 0.5rem 0.75rem;

    &.err {
      color: #f25a5a;
    }

    &:hover {
      background-color: #37352f0f;
    }
  }
}

.edit-title {
  font-size: 13px;
  font-weight: 400;
  color: #858481;
}

.edit-title-input {
  margin-top: 10px;
}

.footer-btn {
  display: flex;
  padding-top: 1.25rem;
  gap: 0.5rem;
  justify-content: flex-end;

  .cancel-btn {
    cursor: pointer;
    font-size: 13px;
    font-weight: 400;
    color: #535350;
    padding: 0.5rem 0.75rem;
    border: 1px solid #0000001f;
    border-radius: 10px;
  }

  .confirm-btn {
    cursor: pointer;
    font-size: 13px;
    font-weight: 400;
    background: #1a1a19;
    color: #fff;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ffffff33;
    border-radius: 10px;
  }
}

.search-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;

  input {
    border: none !important;
    color: #34322d;
    font-size: 18px;
    font-weight: 400;
    line-height: 1.75rem;
  }

  .search-header-icon {
    max-width: 24px;
    max-height: 24px;
    min-width: 24px;
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 100%;
      height: 100%;
    }
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .menu-button{
    position: absolute;
    top: 0px;
    left: 0px;
  }

  .second-menu .collapsed{
    position: absolute;
    top: 0px;
    left: 0px;
    background-color: #000000b3;
    width: 100%;
    height: 100%;
    z-index: 9999;
  }

  .sidebar-container{
    width: 80%!important;
  }

  /* 移动端显示返回按钮，隐藏收起按钮 */
  .mobile-only {
    display: block;
  }

  .pc-only {
    display: none;
  }
}

/* PC端适配 */
@media (min-width: 769px) {
  /* PC端隐藏返回按钮，显示收起按钮 */
  .mobile-only {
    display: none;
  }

  .pc-only {
    display: block;
  }
}



</style>

<style lang="less">
.edit-title-modal {
  .ant-modal-header {
    margin-bottom: 5px !important;
  }

  .ant-modal-content {
    border-radius: 20px !important;
  }
}
</style>