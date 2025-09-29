<template>
  <div class="callback-container">
    <div class="animation-wrapper">
      <a-spin 
        size="large" 
        :indicator="indicator"
        class="spin-animation"
      />
      <a-progress
        :percent="percent"
        :show-info="false"
        stroke-color="#4f46e5"
        class="progress-bar"
      />
    </div>
    <transition name="fade">
      <p class="loading-text" v-if="showText">{{ $t('Verifying Google Login...') }}</p>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted,h } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { LoadingOutlined } from '@ant-design/icons-vue';
import auth from '@/services/auth';
const { t } = useI18n();

const router = useRouter();
const percent = ref(0);
const showText = ref(false);
const indicator = h(LoadingOutlined, {
  style: {
    fontSize: '48px',
    color: '#4f46e5'
  },
  spin: true
});

onMounted(async () => {
  // 初始动画
  setTimeout(() => showText.value = true, 300);
  
  const animateProgress = () => {
    if (percent.value < 80) {
      percent.value += 10;
      setTimeout(animateProgress, 300);
    }
  };
  animateProgress();

  // 获取URL参数，优先从search中获取，如果没有再从hash中获取
  let urlParams;
  if (window.location.search) {
    // 如果有search参数，直接使用
    urlParams = new URLSearchParams(window.location.search);
  } else {
    // 否则从hash中获取
    const hash = window.location.hash; // "#/auth/google?code=4%2F0AUJR-x6"
    const queryString = hash.split('?')[1];
    urlParams = new URLSearchParams(queryString);
  }
  console.log('urlParams:', urlParams.has('code')); 
  if (urlParams.has('code')) {
    try {
      const isClient = import.meta.env.VITE_IS_CLIENT === 'true';
      const redirectUri = isClient
      ? import.meta.env.VITE_GOOGLE_REDIRECT_URI_ELECTRON
      : 'http://localhost:5005/api/users/auth/google'; // Electron 主进程处理

      // const redirectUri = 'http://localhost:5005/api/users/auth/google';
      console.log("redirectUri",redirectUri)
      await auth.googleAuth(urlParams.get('code'),redirectUri);
      percent.value = 100;
      message.success(t('auth.loginSuccessful'));
      setTimeout(() => router.push({ name: 'lemon' }), 500);
    } catch (error) {
      message.error(t('auth.loginFailed') + ': ' + error.message);
      // setTimeout(() => router.push({ name: 'login' }), 1000);
    }
  } else {
    // setTimeout(() => router.push({ name: 'login' }), 1000);
  }
});
</script>

<style scoped>
.callback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 32px;
  background: rgba(255, 255, 255, 0.9);
}

.animation-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 300px;
  gap: 24px;
}

.spin-animation {
  animation: spin 1.5s linear infinite;
}

.progress-bar {
  width: 100%;
  transition: all 0.3s ease;
}

.loading-text {
  font-size: 18px;
  color: #4f46e5;
  font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>