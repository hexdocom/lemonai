<template>
  <div class="agent">
    <div class="agent-header">
          <span class="disabled">Agents</span>
          <span>
            <MenuSearch class="search-icon" @click="onSearch" />
          </span>
      </div>
    <div class="agent-list">
      <div v-for="agent in agents" :key="agent.id" class="agent-item"
      :class="{ active: selectedAgent?.id === agent.id }" @mouseenter="hoverAgent = agent.id"
      @mouseleave="hoverAgent = null" @click.stop="selectAgent(agent, true)">
      <span class="agent-name" :title="agent.name.length > 20 ? agent.name : null">{{ agent.name }}</span>
      <div v-if="hoverAgent === agent.id" class="ellipsis" @click.stop="openMenu(agent.id,$event)">
        ⋯
      </div>
      <Teleport to="body">
      <div v-if="showMenu === agent.id" class="menu" :style="menuStyle" @mouseleave="showMenu = null">
        <div class="menu-item" @click.stop="openEdit(agent.id)">
          <EditOutlined class="icon" /> Edit
        </div>
        <div class="menu-item" @click.stop="openKnowledge(agent.id)">
          <ReadOutlined class="icon" /> Experience 
        </div>
        <div class="menu-item danger" @click.stop="confirmDelete(agent.id)">
          <DeleteOutlined class="icon" /> Delete
        </div>
      </div>
    </Teleport>
    </div>
    </div>

  </div>
  <AgentsEdit v-model:visible="visible" v-model:id="agentId" />
  <KnowledgeModal :agentId="agentId" ref="knowledgeModalRef" />
  <a-modal
        :footer="null"
        :centered="true"
        v-model:open="searchModalVisible"
        @cancel="handleCancel"
        :closable="false"
      >
        <template #title>
          <div class="search-header">
            <div class="search-header-icon">
              <MenuSearch />
            </div>
            <a-input ref="searchInputRef" v-model:value="searchValue" placeholder="Search Agents..." />
            <div class="search-header-icon" @click="handleCancel">
              <Close />
            </div>
          </div>
        </template>
        <!-- 
         @click="setActiveChat(chat)"
            :class="{ 'active': chat.conversation_id === conversationId }"
        -->
        <div class="search-content">
          <div
            v-for="agent in filteredAgents"
            :key="agent.id"
            class="search-item"
            @click="selectAgent(agent, true)"
          >
            <!-- <div class="search-item-avatar">
              <div class="avatar-placeholder">{{ agent.name.charAt(0).toUpperCase() }}</div>
            </div> -->
            <div class="search-item-content">
              <div class="search-item-name">{{ agent.name }}</div>
              <div class="search-item-time">{{ formatTime(agent.create_at) }}</div>
            </div>
          </div>
          <div v-if="filteredAgents.length === 0 && searchValue.trim()" class="no-results">
            No agents found for "{{ searchValue }}"
          </div>
        </div>
      </a-modal>
</template>
<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { EditOutlined, DeleteOutlined, ReadOutlined } from '@ant-design/icons-vue'
import AgentsEdit from '@/view/agents/components/agentsEdit.vue'
import KnowledgeModal from '@/view/agents/components/KnowledgeModal.vue'
import { message, Modal } from 'ant-design-vue'
import agentService from "@/services/agent"
import emitter from '@/utils/emitter'
import { useRouter, useRoute } from 'vue-router'
import MenuSearch from '@/assets/svg/menuSearch.svg';
import Close from '@/assets/filePreview/close.svg';
import { formatTime } from '@/utils/time';
const router = useRouter()
const route = useRoute()

import { storeToRefs } from 'pinia';
import { useChatStore } from '@/store/modules/chat';
const chatStore = useChatStore();
const { agent,conversationId } = storeToRefs(chatStore);


const agents = ref([])
const visible = ref(false)
const agentId = ref(null)
const knowledgeModalRef = ref(null)
const hoverAgent = ref(null)
const showMenu = ref(null)
const selectedAgent = ref(null)
const menuStyle = ref({})


const searchModalVisible = ref(false)
const searchValue = ref("")
const searchInputRef = ref(null)


const filteredAgents = computed(() => {
  if (!searchValue.value.trim()) {
    return agents.value
  }
  return agents.value.filter(agent => 
    agent.name.toLowerCase().includes(searchValue.value.toLowerCase())
  )
})

const onSearch = async () => {
  searchModalVisible.value = true
  searchValue.value = ""
  await nextTick()
  searchInputRef.value?.focus()
}

const handleCancel = () => {
  searchModalVisible.value = false
  searchValue.value = ""
}

function openEdit(id) {
  visible.value = true
  agentId.value = id
}

function confirmDelete(id) {
  Modal.confirm({
    title: 'Confirm Delete',
    content: 'Are you sure you want to delete this agent?',
    onOk: async () => {
      await agentService.delete(id)
      fetchAgents()
      message.success("Delete Success")
      router.push("/lemon")
    }
  })
}

const closeOtherWindows = () => {
  emitter.emit('preview-close', false);
  emitter.emit('terminal-visible', false);
  emitter.emit('fullPreviewVisable-close');
};

function openKnowledge(id) {
  agentId.value = id
  knowledgeModalRef.value.visible = true
}
function openMenu(id,event) {
  showMenu.value = showMenu.value === id ? null : id
  const targetRect = event.currentTarget.getBoundingClientRect();
  const menuHeight = 120; 
  const padding = 8; 

  let top = 0;
  if (window.innerHeight - targetRect.bottom < menuHeight + padding) {
    top = targetRect.top - menuHeight + 25;
  } else {
    top = targetRect.bottom;
  }

  menuStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${targetRect.left}px`,
    zIndex: 99999,
  };
}

const fetchAgents = async () => {
  let res = await agentService.getList()
  res.sort((a, b) => new Date(b.create_at) - new Date(a.create_at))
  agents.value = res
}

emitter.on('updateAgentList', fetchAgents)
emitter.on('addAgent', addAgent)
emitter.on('selectedAgent', findAgent)

function addAgent(item) {
  fetchAgents();
  selectAgent(item, true,false)
}

function findAgent(item) {
  const existingAgent = agents.value.find(agent => agent.id === item.id);
  
  if (existingAgent) {
    selectAgent(existingAgent, true,false);
  } else {
    addAgent(item);
  }
}


async function  selectAgent(item, isClick = false,needSelect = true) {
  closeOtherWindows();
  searchModalVisible.value = false
  selectedAgent.value = selectedAgent.value?.id === item.id ? null : item
  agentId.value = selectedAgent.value?.id ?? null
  agent.value = item
  await chatStore.init("task");
  if(needSelect){
    await chatStore.selectFirst();
  }
  
  if (window.innerWidth <= 768) {
    emitter.emit('toggleMobileMenu', false);
  }
  
  if (isClick) {
    if(conversationId.value){
      router.push(`/lemon/${agent.value.id}/${conversationId.value}`)
    }else{
      router.push(`/lemon/${agent.value.id}`)
    }
   
  }
}


watch(() => route.params.agentId, (newVal) => {
  if (!newVal) {
    selectedAgent.value = null
  }
})
function closeMenu() {
  showMenu.value = null
}

onMounted(async () => {
  await fetchAgents()
  const agentId = route.params.agentId
  if (agentId && agentId!='chat') {
    selectAgent(agents.value.find(item => item.id == agentId), false)
  }
  window.addEventListener('click', closeMenu)
})


onUnmounted(() => {
  window.removeEventListener('click', closeMenu)
})

</script>
<style lang="scss"  scoped>
.agent {
  width: 100%;
  padding: 0 12px;
  display: flex;
  gap: 12px;
  flex-direction: column;
  height: calc(100vh - 270px);
  overflow: hidden;
}
.agent-list{
  width: 100%;
  display: flex;
  gap: 12px;
  flex-direction: column;
  overflow: auto;
}

.agent-item {
  position: relative;
  padding: 6px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #0d0d0d;
  gap: 5px;

  
}

.search-icon{
  width: 20px;
  height: 20px;
  cursor: pointer;
}

/* */

.agent-item:hover {
  background-color: #0000000f;
}

.agent-item.active {
  background-color: #0000000f;
} 


.search-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;

  input {
    border: unset !important;
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

.ellipsis {
  cursor: pointer;
  padding: 0 4px;
  font-weight: bold;
}

.agent-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu {
  background: white;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  width: 120px;
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
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.icon {
  font-size: 16px;
}

.agent-header{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  font-size: 14px;
  color: #0d0d0d;
}
.disabled {
  color: #8f8f8f;
  pointer-events: none;
}

/* Search Content Styles */
.search-content {
  height: 400px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
}

.search-item {
  display: flex;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  margin: 4px 0;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #f8f9fa;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.search-item-avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #34322d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  text-transform: uppercase;
}

.search-item-content {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
}

.search-item-name {
  font-size: 15px;
  font-weight: 500;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-item-time {
  font-size: 12px;
  color: #8f8f8f;
  white-space: nowrap;
  flex-shrink: 0;
}

.search-item-desc {
  font-size: 13px;
  color: #718096;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Empty state */
.search-content:empty::after {
  content: "No agents found";
  display: block;
  text-align: center;
  color: #a0aec0;
  font-size: 14px;
  padding: 32px 16px;
}

.no-results {
  text-align: center;
  color: #a0aec0;
  font-size: 14px;
  padding: 32px 16px;
  font-style: italic;
}

/* Scrollbar styling */
.search-content::-webkit-scrollbar {
  width: 6px;
}

.search-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.search-content::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
  
  &:hover {
    background: #a0aec0;
  }
}
</style>