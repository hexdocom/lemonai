<template>
  <div class="agent">
    <div class="agent-header">
          <!-- <span class="disabled">Agents</span> -->
          <!-- <span>
            <MenuSearch class="search-icon" @click="onSearch" />
          </span> -->
      </div>
    <div class="agent-list" ref="agentListRef">
      <div v-for="agent in agents" :key="agent.id" class="agent-item"
      :class="{ active: selectedAgent?.id === agent.id }" 
      :ref="el => setAgentRef(el, agent.id)"
      @mouseenter="hoverAgent = agent.id"
      @mouseleave="hoverAgent = null" @click.stop="selectAgent(agent, true)">
      <span class="agent-name" :title="agent.name.length > 20 ? agent.name : null">{{ agent.name }}</span>
      <div v-if="hoverAgent === agent.id" class="ellipsis" @click.stop="openMenu(agent.id,$event)">
        <EllipsisIcon />
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
        style="width: 800px; height: 500px;"
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
import MenuSearch from '@/assets/svg/menuSearch.svg'
import Close from '@/assets/filePreview/close.svg'
import EllipsisIcon from '@/assets/svg/ellipsis-icon.svg'
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
const agentListRef = ref(null)
const agentRefs = ref(new Map())


const searchModalVisible = ref(false)
const searchValue = ref("")
const searchInputRef = ref(null)

// 过滤后的agents列表
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

// 设置 agent 元素的 ref
const setAgentRef = (el, agentId) => {
  if (el) {
    agentRefs.value.set(agentId, el)
  } else {
    agentRefs.value.delete(agentId)
  }
}

// 滚动到选中的 agent
const scrollToSelectedAgent = () => {
  if (selectedAgent.value && agentRefs.value.has(selectedAgent.value.id)) {
    nextTick(() => {
      const element = agentRefs.value.get(selectedAgent.value.id)
      if (element && agentListRef.value) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      }
    })
  }
}

// 监听 selectedAgent 变化，自动滚动
watch(selectedAgent, () => {
  scrollToSelectedAgent()
})

// 编辑
function openEdit(id) {
  visible.value = true
  agentId.value = id
}

// 删除（使用 Modal 确认）
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

//openKnowledge
function openKnowledge(id) {
  agentId.value = id
  knowledgeModalRef.value.visible = true
}
// 展开更多菜单
function openMenu(id,event) {
  showMenu.value = showMenu.value === id ? null : id
  const targetRect = event.currentTarget.getBoundingClientRect();
  const menuHeight = 120; // 你菜单的实际高度，或者动态获取
  const padding = 8; // 防止贴边太紧

  let top = 0;
  if (window.innerHeight - targetRect.bottom < menuHeight + padding) {
    // 空间不足 → 显示在上方
    top = targetRect.top - menuHeight + 25;
  } else {
    // 空间充足 → 显示在下方
    top = targetRect.bottom;
  }

  menuStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${targetRect.left}px`,
    zIndex: 99999,
  };
}

// 获取全部 agent 列表
const fetchAgents = async () => {
  let res = await agentService.getList()
  // create_at 根据 创建时间 降序
  res.sort((a, b) => new Date(b.create_at) - new Date(a.create_at))
  agents.value = res
}

//全局事件 emitter 更新agent列表
emitter.on('updateAgentList', fetchAgents)
//全局事件 新增agent
emitter.on('addAgent', addAgent)
emitter.on('selectedAgent', findAgent)

//新增回调
function addAgent(item) {
  fetchAgents();
  //选中新增的agent
  selectAgent(item, true,false)
}

//选中agent
function findAgent(item) {
  // 先用ID在agents数组中查找
  const existingAgent = agents.value.find(agent => agent.id === item.id);
  
  if (existingAgent) {
    // 如果存在，走选中函数
    console.log('Agent exists, selecting:', existingAgent);
    selectAgent(existingAgent, true,false);
  } else {
    // 如果不存在，走添加函数
    console.log('Agent not found, adding new agent:', item);
    addAgent(item);
  }
}


// 选中 agent
async function  selectAgent(item, isClick = false,needSelect = true) {
  closeOtherWindows();
  searchModalVisible.value = false
  // emitter.emit('open-collapse');
  console.log("触发了选中事件", conversationId.value)
  selectedAgent.value = selectedAgent.value?.id === item.id ? null : item
  agentId.value = selectedAgent.value?.id ?? null
  //设置当前选中的agent
  agent.value = item
  await chatStore.init("task");
  if(needSelect){
    await chatStore.selectFirst();
  }
  
  // 移动端选择agent后关闭菜单
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


//监听路由中的 agent_id 如果没有 清空 selectedAgent
watch(() => route.params.agentId, (newVal) => {
  console.log("route.params.agentId 改变", newVal)
  if (!newVal) {
    selectedAgent.value = null
  }
})
// 点击空白区域关闭更多菜单
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

// 暴露方法供父组件调用
defineExpose({
  onSearch
})

</script>
<style lang="scss"  scoped>
.agent {
  width: 100%;
  padding: 0 12px;
  display: flex;
  gap: 12px;
  flex-direction: column;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  gap: 5px;
  line-height: 23px;
  border-radius: 12px;
  color: rgba(16,16,16,1);
  font-size: 14px;
  text-align: left;
  font-family: PingFangSC-regular;

}


/* */

.agent-item:hover {
  border: 1px solid rgba(236,236,236,1);
  background-color: #F9F9FB;
}

.agent-item.active {
  border: 1px solid rgba(236,236,236,1);
  background-color: #F9F9FB;
} 

.search-icon{
  width: 20px;
  height: 20px;
  cursor: pointer;
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
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    svg {
      width: 20px;
      height: 20px;
    }
  }
}

.ellipsis {
  cursor: pointer;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 18px;
    height: 18px;
  }
}

.agent-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu {
  background: #ffffff;
  border: 1px solid rgba(224, 224, 224, 0.8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  padding: 4px;
  min-width: 140px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: PingFangSC-regular;
  line-height: 20px;
  cursor: pointer;
  color: rgba(16, 16, 16, 1);
  border-radius: 6px;
  transition: all 0.15s ease;
  user-select: none;

  .icon {
    font-size: 16px;
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);

    .icon {
      transform: scale(1.1);
    }
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.06);
    transform: scale(0.98);
  }

  &.danger {
    color: #ff4d4f;

    &:hover {
      background-color: rgba(255, 77, 79, 0.08);
    }

    &:active {
      background-color: rgba(255, 77, 79, 0.12);
    }
  }
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  gap: 5px;
  line-height: 23px;
  border-radius: 12px;
  color: rgba(16,16,16,1);
  font-size: 16px;
  text-align: left;
  font-family: PingFangSC-regular;
  border: 1px solid rgba(236,236,236,1);
  background-color: #F9F9FB;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    background-color: #0000000f;
  }

  &:active {
    transform: scale(0.98);
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
  align-items: center;
  flex: 1;
  min-width: 0;
}

.search-item-name {
  line-height: 23px;
  color: rgba(16,16,16,1);
  font-size: 16px;
  text-align: left;
  font-family: PingFangSC-regular;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.search-item-time {
  line-height: 17px;
  color: rgba(154,154,154,1);
  font-size: 12px;
  text-align: left;
  font-family: PingFangSC-regular;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 12px;
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