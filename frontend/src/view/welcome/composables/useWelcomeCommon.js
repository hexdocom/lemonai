import { ref, computed, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '@/store/modules/chat';
import { useUserStore } from '@/store/modules/user';
import emitter from '@/utils/emitter';

/**
 * 共享的欢迎页面逻辑
 */
export function useWelcomeCommon() {
  const chatStore = useChatStore();
  const userStore = useUserStore();
  const { t } = useI18n();
  const { user } = storeToRefs(userStore);

  // 获取用户名
  const username = computed(() => {
    return user.value.user_name || user.value.user_email || 'User';
  });

  // 获取当前工作模式
  const currentWorkMode = ref(localStorage.getItem('workMode') || 'twins');

  // 根据 workMode 获取欢迎描述
  const welcomeDescription = computed(() => {
    const workMode = currentWorkMode.value;
    return t(`lemon.welcome.workMode.${workMode}`);
  });

  // 示例点击处理
  const sampleClick = async (item) => {
    console.log('sampleClick:', item);

    // 等待下一个 tick，确保所有组件都已挂载完成
    await nextTick();

    // 添加一个小延迟，确保 ChatInput 完成挂载
    setTimeout(() => {
      console.log("发送 changeMessageText:", item.content);
      emitter.emit('changeMessageText', item.content);
    }, 100);
  };

  // 处理模式切换
  const handleModeChange = (mode) => {
    console.log('收到模式切换:', mode);
    currentWorkMode.value = mode;
  };

  return {
    username,
    currentWorkMode,
    welcomeDescription,
    sampleClick,
    handleModeChange
  };
}
