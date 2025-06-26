<template>
  <div class="lemon-container">
    <Sidebar v-model:isCollapsed="isCollapsed" />
    <div class="lemon-content">
      <!-- 主页面 -->
      <ChatPanel class="chat-panel" />
      <!-- 实时预览文件-->
      <Preview class="preview" />
      <!--本地预览文件-->
      <LocalPreview class="preview" />
    </div>
  </div>
  <SubPreview class="sub"/>
  <CheckComponent/>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Sidebar from './sidebar/index.vue'
import ChatPanel from './components/ChatPanel.vue'
import Preview from '@/components/preview/index.vue'
import LocalPreview from '@/components/preview/fullPreview.vue'
import SubPreview from '@/components/sub/index.vue'
// import DockerCheck from '@/components/check/dockerModal.vue'
import CheckComponent from '@/components/check/index.vue'
import { useRoute } from 'vue-router';
const route = useRoute();

import { useChatStore } from '@/store/modules/chat';
const chatStore = useChatStore();
const isCollapsed = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
}
const init = async () => {
  await chatStore.init();
}
init();

onMounted(() => {
  init();
});

onUnmounted(() => {

});
</script>

<style lang="scss" scoped>
.menu-switch {
  cursor: pointer; 
}
.lemon-container {
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100vh;
  background: #f8f8f7;
}

.lemon-content {
  width: 100%;
  height: 100%;
  display: flex;
  overflow-y: auto;

  .chat-panel {
    min-width: 50%;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
    max-width: 100%;
    width: 100%;
    overflow: hidden;
  }

  .preview {
    max-width: 50%;
    min-width: 50%;
  }
}

@media screen and (max-width: 768px) {
 .preview{
    position: absolute;
    z-index: 999;
    margin: 0px;
    width: 100vw!important;
    height: 100vh!important;
    border-radius: 0px;
    max-width: 100vh!important;
    border: unset!important;
    box-shadow: unset!important;
 }
}
.check{
  width: 80%!important;
  height: 80%!important;
}
</style>