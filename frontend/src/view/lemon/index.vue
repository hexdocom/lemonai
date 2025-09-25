<template>
  <div class="lemon-container" :class="{ 'mobile-menu-open': isMobileMenuOpen }">
    <SidebarMain />
    <div class="lemon-content">
      <div v-if="isMobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import SidebarMain from '@/view/menu/index.vue'
import emitter from '@/utils/emitter'

import { useRoute } from 'vue-router';
const route = useRoute();

import { useChatStore } from '@/store/modules/chat';
const chatStore = useChatStore();
const isCollapsed = ref(false);
const isMobileMenuOpen = ref(false);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
}

// 处理移动端菜单状态变化
const handleMobileMenuToggle = (show) => {
  if (typeof show === 'boolean') {
    isMobileMenuOpen.value = show
  } else {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }
}

// 关闭移动端菜单
const closeMobileMenu = () => {
  emitter.emit('toggleMobileMenu', false)
}

const init = async () => {
  let mode = localStorage.getItem('mode') || 'task';
  await chatStore.init(mode);
}

onMounted(() => {
  init();
  // 监听移动端菜单切换事件
  emitter.on('mobileMenuStateChange', handleMobileMenuToggle);
});

onUnmounted(() => {
  emitter.off('mobileMenuStateChange', handleMobileMenuToggle);
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
  overflow-x: hidden;
}

.lemon-content {
  width: 100%;
  height: 100%;
  display: flex;
  overflow-y: auto;
  transition: transform 0.3s ease;
}

/* 移动端推拉式布局 */
@media (max-width: 768px) {
  .lemon-container {
    position: relative;
  }
  
  .lemon-content {
    transform: translateX(0);
    width: 100vw;
    position: relative;
  }
  
  /* 当移动端菜单打开时，推动主内容 */
  .lemon-container.mobile-menu-open .lemon-content {
    transform: translateX(70%);
  }
  
  /* 移动端蒙层 */
  .mobile-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    z-index: 999;
    cursor: pointer;
    opacity: 0;
    animation: fadeIn 0.3s ease forwards;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}

@media screen and (max-width: 768px) {
  .preview {
    position: absolute;
    z-index: 999;
    margin: 0px;
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0px;
    max-width: 100vh !important;
    border: unset !important;
    box-shadow: unset !important;
  }
}
</style>