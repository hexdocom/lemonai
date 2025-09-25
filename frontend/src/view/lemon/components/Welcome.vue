<template>
  <div class="welcome-screen">
    <div class="welcome-header">
      <button class="mobile-menu-btn" @click="toggleMobileMenu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <div class="welcome-mode">
      <!-- <h2>{{handleModeTitle }}</h2> -->
    </div>
    <div class="welcome-content">
      <h1>{{ $t('lemon.welcome.greeting', { username }) }}</h1>
      <p v-if="mode == 'chat'">{{ $t('lemon.welcome.question') }}</p>
      <p v-else >Create, Training, Evoloving you new Agent</p>
      <ChatInput @send="handleWelcomeInput" />
    </div>
    <!-- <Store class="store"></Store> -->


  <div v-if="isLoadingVisible" class="agent-loading">
    <div class="loader"></div>
    <p class="tip">{{ tip }}</p>
  </div>
  </div>
</template>

<script setup>
import { ref,computed } from 'vue';
import Suggestion from './Suggestion.vue';
import Sample from './Sample.vue';
import ChatInput from './ChatInput.vue';
// import Store from '@/view/store/index.vue';

import { useChatStore } from '@/store/modules/chat';
import seeAgent from '@/services/see-agent';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import emitter from '@/utils/emitter';
import fileServices from '@/services/files'; 
import agentServices from '@/services/agent';

import { Modal } from 'ant-design-vue';

import { storeToRefs } from 'pinia';
const chatStore = useChatStore();
const router = useRouter();
const { t } = useI18n();
const {chatInfo,mode} = storeToRefs(chatStore);
const props = defineProps({
  username: String
});

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


const sampleClick = (item) => {
  //触发 changeMessageText 修改数据
  emitter.emit('changeMessageText', item.content);
};
const handleWelcomeInput = async (value) => {
  const { text,files,mcp_server_ids,is_public,workMode } = value;
  const result = await chatStore.createConversation(text,mode.value);
  const { conversation_id } = result;
  if(mode.value === 'chat' && conversation_id){
    router.push(`/lemon/chat/${conversation_id}`);
    await seeAgent.sendMessage(text,conversation_id,[],mcp_server_ids,workMode);
  }else{
    show('Creating Agent...')
    await new Promise(resolve => setTimeout(resolve, 1000));
    update('Learning from the Experience base...');
    let res = await agentServices.generate(text,conversation_id,is_public)
    hide();
    //刷新agent
    emitter.emit('selectedAgent', res);
    router.push(`/lemon/${res.id}/${conversation_id}`);
    await seeAgent.sendMessage(text,conversation_id,files,mcp_server_ids,workMode);
  }
};

const handleModeTitle = computed(() => {
  if (mode.value === 'chat') {
    return 'ChatBot';
  }
  return 'Agent';
});

// 移动端菜单按钮点击处理
const toggleMobileMenu = () => {
  // 触发事件给父组件处理侧边栏的显示/隐藏
  console.log('toggleMobileMenu');
  emitter.emit('toggleMobileMenu', true); // true表示打开菜单
};

</script>

<style lang="scss" scoped>


.agent-loading {
  position: fixed;
  top: 0;
  left: 248px;
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
  --w:10ch;
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
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000;
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
  9.09% {text-shadow: 
        calc( 0*var(--w)) -10px #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000}
  18.18% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) -10px #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000}
  27.27% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) -10px #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000}
  36.36% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) -10px #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000}
  45.45% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) -10px #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000}
  54.54% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) -10px #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000}
  63.63% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) -10px #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000}
  72.72% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) -10px #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000}
  81.81% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) -10px #000,calc(-9*var(--w)) 0 #000}
  90.90% {text-shadow: 
        calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000, 
        calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) -10px #000}
}


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
    margin: 0px !important;

  }

  p {
    color: #858481;
    font-size: 32px;
    margin-bottom: 16px;
  }
}
.welcome-mode{
  display: flex;
  width: 100%;
  justify-content: center;
  margin-top: 20px;
  
}

.welcome-input-container {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
}

.welcome-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
  padding: 8px 0;

  &::placeholder {
    color: #999;
  }
}

.input-tools {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.tool-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #333;
  }
}

.divider {
  width: 1px;
  height: 16px;
  background: #e0e0e0;
  margin: 0 8px;
}

.send-button {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 14px;
  color: #666;
  cursor: pointer;

  .arrow-icon {
    margin-left: 6px;
  }

  &:hover {
    background: #e9e9e9;
  }
}
.case-container{
  margin-top: 92px;
  padding-left: 2.5rem;
  padding-right: 2.5rem;
  padding-bottom: 100px;
}

@media (max-width: 768px) {
  .case-container{
    padding-left: 2px!important;
    padding-right: 2px!important;
  }

  .agent-loading{
    left: 0!important;
  }
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  justify-content: center;
  &::-webkit-scrollbar {
    display: none;
  }
}
.case-title{
    border: 0 solid #e5e7eb;
    box-sizing: border-box;
    outline: none;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    margin: 0;
    margin-top: 1.25rem;
    margin-bottom: 1.25rem;
    text-align: center;
    font-size: .875rem;
    line-height: 1.25rem;
    color:#b9b9b7;
}

.tab {
  padding: 7px 1rem;
  border-radius: 999999px;
  border: 1px solid #0000000f;
  color: #858481;
  font-size: .875rem;
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

.icon{
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  padding-top: 20px;

  img{
    width: 24px;
    height: 24px;
    margin-right: 8px;
  }
}

/* 默认隐藏移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
}

@media screen and (max-width: 768px) {

  .welcome-screen{
    padding:0px 16px;
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
  .welcome-mode{
    margin-top: 8px;
  }
  .welcome-header{
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
  .icon{
    display: none;
  }

  .welcome-content{
    h1{
      display: none;
    }
    p{
      font-size: 16px!important;
      text-align: center;
    }
  }
}


.store {
  margin-top: 100px;

  ::v-deep(.card-grid) {
    max-height: unset;
  }
}

</style>