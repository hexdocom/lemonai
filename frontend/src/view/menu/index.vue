<!-- LeftMenu.vue -->
<template>
  <div class="left-menu" :class="{ 'menu-visible': isShowMenu, 'menu-collapsed': isMenuCollapsed }" v-show="showMenu && !isMenuCollapsed" @click.self="closeMenu">
    <!-- 收起按钮 -->
    <div class="collapse-button" @click="toggleMenuCollapse">
      <ChevronLeft />
    </div>

    <!-- 左侧菜单面板 -->
    <div class="menu-panel">
      <!-- Logo -->
      <div class="menu-header">
        <Logo />
      </div>

      <!-- 菜单操作按钮 -->
      <div class="menu-actions">
        <div
          v-for="item in menuItems"
          :key="item.mode"
          class="menu-button"
          :class="{
            active: !item.isAgentsHistory && (item.isStore ? isStorePage : (!isStorePage && currentWorkMode === item.mode)),
            'no-hover': item.isAgentsHistory
          }"
          @click="handleMenuClick(item)"
          @mouseenter="item.showTooltip = true"
          @mouseleave="item.showTooltip = false"
        >
          <component :is="item.icon" />
          <span class="truncate">{{ item.label }}</span>
          <span v-if="item.isNew" class="new-badge">new</span>
          <component
            v-if="item.rightIcon"
            :is="item.rightIcon"
            class="right-icon"
            @click.stop="openAgentSearch"
          />
          <div v-if="item.showTooltip && item.description != '' " class="menu-tooltip">
            {{ item.description }}
          </div>
        </div>
      </div>

      <!-- Agent 列表（可滚动区域） -->
      <div class="agent-list-container">
        <AgentList ref="agentListRef" />
      </div>

      <!-- 底部用户区域 -->
      <div class="menu-bottom">
        <UserVersion :isCollapsed="isCollapsed" :chats="chats" />
      </div>
      <FooterSocial />
    </div>
  </div>

  <!-- 收起状态下的展开按钮 -->
  <div class="expand-button" v-if="isMenuCollapsed && !isMobile" @click="toggleMenuCollapse">
    <ChevronRight />
  </div>

  <!-- 二级菜单 -->
  <div class="second-menu">
    <secondMenu :chats="chatList" />
  </div>

  <!-- 编辑弹窗 -->
  <AgentsEdit v-model:visible="visible" id="" />
</template>

<script setup>
// SVG 组件导入
import Store from '@/assets/svg/store.svg'
import TwinsChat from '@/assets/svg/twins-chat.svg'
import SuperAgent from '@/assets/svg/super-agent.svg'
import AiChat from '@/assets/svg/ai-chat.svg'
import Adaptive from '@/assets/svg/adaptive.svg'
import ChevronLeft from '@/assets/svg/chevron-left.svg'
import ChevronRight from '@/assets/svg/chevron-right.svg'
import AgentsHistoryIcon from '@/assets/svg/agents-history-icon.svg'
import SearchAgentsIcon from '@/assets/svg/search-agents-icon.svg'

// 组件导入
import Logo from '@/components/logo.vue'
import AgentList from '@/view/agents/index.vue'
import AgentsEdit from '@/view/agents/components/agentsEdit.vue'
import secondMenu from './secondMenu.vue'
import UserVersion from './UserVersion.vue'
import FooterSocial from './FooterSocial.vue'

// Store & Vue
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/store/modules/chat'
import { useUserStore } from '@/store/modules/user.js'
import emitter from '@/utils/emitter'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()
const { agent, mode } = storeToRefs(chatStore)

const selectedMenu = ref('task')
const visible = ref(false)
const isShowMenu = ref(false) // 移动端菜单显示状态,默认隐藏
const isMenuCollapsed = ref(false) // 菜单收起状态
const chats = ref([])
const currentWorkMode = ref(localStorage.getItem('workMode') || 'auto') // 当前工作模式
const agentListRef = ref(null) // AgentList 组件引用




// 菜单项配置
const menuItems = ref([
  {
    mode: 'twins',
    label: 'Twins Chat',
    icon: TwinsChat,
    description: 'Dual AI perspective',
    showTooltip: false,
    isStore: false,
    isNew: true // 标记为新功能
  },
  {
    mode: 'task',
    label: 'Evolving Agent',
    icon: SuperAgent, // 暂时使用 SuperAgent 图标，后续替换
    description: 'Goal-driven, Self-improving',
    showTooltip: false,
    isStore: false
  },
  {
    mode: 'chat',
    label: 'AI Chat',
    icon: AiChat,
    description: 'Instant Q&A',
    showTooltip: false,
    isStore: false
  },
  {
    mode: 'auto',
    label: 'Adaptive',
    icon: Adaptive, // 暂时使用 SuperAgent 图标，后续替换
    description: 'Smart routing',
    showTooltip: false,
    isStore: false
  },
  {
    mode: 'store',
    label: 'Agent Store',
    icon: Store,
    description: '',
    showTooltip: false,
    isStore: true
  },
  {
    mode: 'agentsHistory',
    label: 'Agents History',
    icon: AgentsHistoryIcon,
    rightIcon: SearchAgentsIcon,
    description: '',
    showTooltip: false,
    isStore: false,
    isAgentsHistory: true
  }
])



// 判断当前是否在 Store 或 UserCase 页面
const isStorePage = computed(() => route.path === '/store')
const isUserCasePage = computed(() => route.path === '/userCase')

// 响应式判断移动端
const isMobile = ref(window.innerWidth <= 768)
const handleResize = () => {
  const newIsMobile = window.innerWidth <= 768
  // 如果从移动端切换到PC端，关闭移动端菜单
  if (isMobile.value && !newIsMobile && isShowMenu.value) {
    isShowMenu.value = false
  }
  isMobile.value = newIsMobile
}


watch(currentWorkMode, (newVal) => {
  // 工作模式变化时的处理逻辑
})

onMounted(() => {
  selectedMenu.value = localStorage.getItem('mode') || 'task'
  currentWorkMode.value = localStorage.getItem('workMode') || 'auto'
  window.addEventListener('resize', handleResize)

  // 监听移动端菜单切换事件
  emitter.on('toggleMobileMenu', toggleMobileMenu)

  // 监听工作模式更新事件
  emitter.on('updateWorkMode', (workMode) => {
    currentWorkMode.value = workMode
  })
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  emitter.off('toggleMobileMenu', toggleMobileMenu)
  emitter.off('updateWorkMode')
})

const showMenu = computed(() => {
  return !isMobile.value || isShowMenu.value
})

function changeMode(modeType) {
  closeOtherWindows()
  selectedMenu.value = modeType
  mode.value = modeType
  const oldMode = localStorage.getItem('mode')
  if (oldMode !== modeType) {
    localStorage.setItem('mode', modeType)
    agent.value = {}
    chatStore.conversationId = null
  }

  if (modeType === 'task') {
    emitter.emit('close-collapse')
    chatStore.clearAgent()
  } else {
    chatStore.init(modeType)
  }
  
  // 移动端操作后关闭菜单
  if (isMobile.value && isShowMenu.value) {
    isShowMenu.value = false
    emitter.emit('mobileMenuStateChange', false)
  }
  
  router.push('/lemon')
}

// 新增函数：同时设置模式和工作模式
function changeModeWithWorkMode(modeType, workMode) {
  closeOtherWindows()
  selectedMenu.value = modeType
  mode.value = modeType
  const oldMode = localStorage.getItem('mode')
  if (oldMode !== modeType) {
    localStorage.setItem('mode', modeType)
    agent.value = {}
    chatStore.conversationId = null
  }

  // 设置工作模式到 localStorage，供 ChatInput 读取
  const oldValue = localStorage.getItem('workMode')
  localStorage.setItem('workMode', workMode)
  currentWorkMode.value = workMode // 更新当前工作模式状态

  // 手动触发 storage 事件（因为同页面的 localStorage.setItem 不会触发 storage 事件）
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'workMode',
    newValue: workMode,
    oldValue: oldValue,
    url: window.location.href,
    storageArea: localStorage
  }))

  if (modeType === 'task') {
    emitter.emit('close-collapse')
    chatStore.clearAgent()
  } else {
    chatStore.init(modeType)
  }

  // 移动端操作后关闭菜单
  if (isMobile.value && isShowMenu.value) {
    isShowMenu.value = false
    emitter.emit('mobileMenuStateChange', false)
  }

  // 如果已经在 /lemon 路由上，直接触发事件
  if (router.currentRoute.value.path === '/lemon') {
    // 延迟一下，确保 localStorage 和 StorageEvent 已经被处理
    setTimeout(() => {
      emitter.emit('updateWorkMode', workMode)
    }, 50)
  } else {
    // 如果不在 /lemon 路由，先跳转再触发事件
    router.push('/lemon').then(() => {
      // 路由跳转完成后，延迟触发事件
      setTimeout(() => {
        emitter.emit('updateWorkMode', workMode)
      }, 300)
    })
  }
}

function toStore() {
  // 移动端操作后关闭菜单
  if (isMobile.value && isShowMenu.value) {
    isShowMenu.value = false
    emitter.emit('mobileMenuStateChange', false)
  }
  window.open('https://app.lemonai.ai/store', '_blank')
}

// 处理菜单项点击
function handleMenuClick(item) {
  if (item.isStore) {
    toStore()
  } else if (item.isAgentsHistory) {
    // 点击 Agents History 触发搜索
    openAgentSearch()
  } else {
    changeModeWithWorkMode('task', item.mode)
  }
}

//toUserCase
function toUserCase() {
  // 移动端操作后关闭菜单
  if (isMobile.value && isShowMenu.value) {
    isShowMenu.value = false
    emitter.emit('mobileMenuStateChange', false)
  }
  router.push('/userCase')
}

function closeMenu() {
  if (!isMobile.value) return
  isShowMenu.value = false
  // 通知主布局菜单状态变化
  emitter.emit('mobileMenuStateChange', false)
}

// 切换移动端菜单显示状态
function toggleMobileMenu(show) {
  if (!isMobile.value) return
  if (typeof show === 'boolean') {
    isShowMenu.value = show
  } else {
    isShowMenu.value = !isShowMenu.value
  }
  // 通知主布局菜单状态变化
  emitter.emit('mobileMenuStateChange', isShowMenu.value)
}

function closeOtherWindows() {
  emitter.emit('preview-close', false)
  emitter.emit('terminal-visible', false)
  emitter.emit('fullPreviewVisable-close')
}

const chatList = computed(() => chatStore.list)

// 切换菜单收起状态
const toggleMenuCollapse = () => {
  isMenuCollapsed.value = !isMenuCollapsed.value
}

// 打开 Agent 搜索
const openAgentSearch = () => {
  if (agentListRef.value) {
    agentListRef.value.onSearch()
  }
}
</script>

<style scoped lang="less">
.left-menu {
  position: relative;
  display: flex;
  height: 100vh;
  width: 100%;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);
  transition: opacity 2s ease;

  @media (min-width: 769px) {
    background-color: transparent;
    width: auto;
  }

  /* 移动端：推拉式布局 */
  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 80%;
    max-width: 320px;
    background-color: transparent;
    z-index: 1000;
    
    .menu-panel {
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      width: 100%;
    }
    
    /* 当菜单显示时，面板滑入 */
    &.menu-visible .menu-panel {
      transform: translateX(0);
    }
  }
}

/* 收起按钮 */
.collapse-button {
  position: absolute;
  top: 50%;
  right: 0; /* 贴着右边缘 */
  transform: translateY(-50%) translateX(50%); /* 向右平移自身宽度的一半 */
  width: 48px;
  height: 48px;
  background-color: rgba(255,255,255,1);
  border: 1px solid rgba(224,224,224,1);
  border-radius: 50%; /* 圆形 */
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 图标靠右对齐 */
  padding-right: 8px; /* 图标距离右边缘的距离 */
  cursor: pointer;
  z-index: 1001;
  transition: all 0.2s ease;
  clip-path: inset(0 0 0 50%); /* 裁剪掉左半边 */

  /* 使用伪元素重新绘制右半圆的边框 */
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    right: -1px;
    width: 48px;
    height: 48px;
    border: 1px solid rgba(224,224,224,1);
    border-radius: 50%;
    clip-path: inset(0 0 0 50%);
    pointer-events: none;
  }

  svg {
    width: 16px;
    height: 16px;
    color: #9a9a9a;
    transition: color 0.2s ease;
    position: relative;
    z-index: 1;
  }

  &:hover {
    svg {
      color: #333;
    }
  }

  @media (max-width: 768px) {
    display: none;
  }
}

/* 展开按钮 */
.expand-button {
  position: fixed;
  top: 50%;
  left: 0; /* 贴着左边缘 */
  transform: translateY(-50%) translateX(-50%); /* 向左平移自身宽度的一半，让左半边隐藏 */
  width: 48px;
  height: 48px;
  background-color: rgba(255,255,255,1);
  border: 1px solid rgba(224,224,224,1);
  border-radius: 50%; /* 圆形 */
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 图标靠右对齐 */
  padding-right: 8px; /* 图标距离右边缘的距离 */
  cursor: pointer;
  z-index: 1001;
  transition: all 0.2s ease;
  clip-path: inset(0 0 0 50%); /* 裁剪掉左半边，保留右半边 */

  /* 使用伪元素重新绘制右半圆的边框 */
  &::before {
    content: '';
    position: absolute;
    top: -1px;
    right: -1px;
    width: 48px;
    height: 48px;
    border: 1px solid rgba(224,224,224,1);
    border-radius: 50%;
    clip-path: inset(0 0 0 50%);
    pointer-events: none;
  }

  svg {
    width: 16px;
    height: 16px;
    color: #9a9a9a;
    transition: color 0.2s ease;
    position: relative;
    z-index: 1;
  }

  &:hover {
    svg {
      color: #333;
    }
  }
}

.menu-panel {
  width: 280px;
  height: 100%;
  background-color: rgba(255,255,255,1);
  border: 1px solid rgba(224,224,224,1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;

  /* 覆盖收起按钮位置的边框 */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -1px; /* 覆盖右边框 */
    transform: translateY(-50%);
    width: 2px; /* 覆盖边框宽度 */
    height: 48px; /* 与按钮高度一致 */
    background-color: rgba(255,255,255,1); /* 与面板背景色一致 */
    z-index: 1000; /* 在面板之上，按钮之下 */
  }

  @media (max-width: 768px) {
    width: 80%;
    max-width: 320px;
  }
}

.menu-header {
  padding: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0; /* 防止被压缩 */
}

.menu-actions {
  padding: 16px 16px 0px 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0; /* 防止被压缩 */

  .menu-button {
    position: relative; /* 父相子绝定位 */
    display: flex;
    align-items: center;
    padding: 10px 13px;
    line-height: 23px;
    border-radius: 12px;
    border: 1px solid transparent; /* 添加透明边框，防止尺寸变化 */
    color: rgba(16,16,16,1);
    font-size: 14px;
    text-align: left;
    font-family: PingFangSC-regular;
    cursor: pointer;
    transition: all 0.2s ease; /* 添加过渡效果 */

    &:hover {
      border: 1px solid rgba(236,236,236,1);
      background-color: rgba(255,252,240,1);
    }

    &:active {
      border: 1px solid rgba(200,200,200,1); /* 更深的边框色 */
      background-color: rgba(255,248,220,1); /* 更深的背景色 */
      transform: scale(0.98); /* 轻微缩小效果 */
    }

    &.active {
      border: 1px solid rgba(236,236,236,1);
      background-color: rgba(255,252,240,1);
    }

    /* 禁用 Agents History 的 hover 和 active 效果 */
    &.no-hover {
      &:hover {
        border: 1px solid transparent;
        background-color: transparent;
      }

      &:active {
        border: 1px solid transparent;
        background-color: transparent;
        transform: none;
      }

      &.active {
        border: 1px solid transparent;
        background-color: transparent;
      }
    }

    svg{
      width: 20px;
      height: 20px;
      margin-right: 15px;
    }

    .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    /* 右侧图标 */
    .right-icon {
      width: 18px;
      height: 18px;
      margin-left: auto;
      margin-right: 8px;
      color: rgba(154, 154, 154, 1);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;

      &:hover {
        color: rgba(16, 16, 16, 1);
        transform: scale(1.1);
      }
    }

    /* new 标识 */
    .new-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 2px 6px;
      background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      line-height: 14px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 4px rgba(255, 107, 107, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.05);
        opacity: 0.9;
      }
    }

    /* 悬浮提示框 */
    .menu-tooltip {
      position: absolute;
      left: 200px; /* 靠右下角显示 */
      width: max-content;
      top:50%;
      height: 47px;
      line-height: 20px;
      border-radius: 10px;
      background-color: rgba(255,255,255,1);
      color: rgba(16,16,16,1);
      font-size: 14px;
      text-align: center;
      box-shadow: 0px 2px 6px 0px rgba(177,177,177,0.4);
      font-family: PingFangSC-regular;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      z-index: 9999;
      pointer-events: none; /* 防止提示框阻挡鼠标事件 */
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }
}

/* Agent 列表容器（可滚动） */
.agent-list-container {
  flex: 1; /* 占据剩余空间 */
  overflow-y: auto; /* 垂直滚动 */
  overflow-x: hidden;
  min-height: 0; /* 重要：允许 flex 子元素缩小 */

  /* 滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 3px;

    &:hover {
      background-color: rgba(0, 0, 0, 0.2);
    }
  }
}

.menu-bottom {
  padding: 16px ;
  display: flex;
  flex-direction: column;
  position: relative;
}

.second-menu {
  flex: 1;
}
</style>
