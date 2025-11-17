<template>
  <div class="user-version-wrapper">
    <div class="user-profile-container" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
      <div class="user-info-bar">
        <div class="user-avatar" :style="avatarStyle">
          {{ userInitial }}
        </div>
        <div class="user-info-text">
          <span class="user-name">{{ isLoggedIn ? (user.user_name || user.mobile || user.user_email) : 'Offline' }}</span>
          <div class="user-details">
            <div class="points-display" v-if="isLoggedIn">
              <PointsIcon class="points-icon" />
              <span class="points-value">{{ points?.total || 0 }}</span>
              <span class="user-plan">{{ membership?.planName || $t("member.freePlan") }}</span>
            </div>
            <div class="offline-status" v-else>
              <span class="offline-text">Offline Mode</span>
            </div>
            <div class="version-text" @click="handleVersionClick">
              V {{ versionInfo.localVersion }}
            </div>
          </div>
        </div>
      </div>
      <div class="profile-wrapper" v-show="showProfile">
        <UserProFile :isCollapsed="isCollapsed" :chats="chats" />
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/modules/user.js'
import UserProFile from '@/view/auth/components/user-profile.vue'
import PointsIcon from '@/assets/svg/points-icon.svg'

// Props
defineProps({
  isCollapsed: {
    type: Boolean,
    default: false
  },
  chats: {
    type: Array,
    default: () => []
  }
})



import { driver } from "driver.js";
import "driver.js/dist/driver.css";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let tourDriver = null;

const tour = async () => {
  tourDriver = driver({
    animate: true,
    showProgress: false,
    prevBtnText: t('setting.prevStep'),
    nextBtnText: t('setting.nextStep'),
    doneBtnText: t('setting.doneStep'),
    steps: [
      {
        element: '.user-profile-container',
        popover: {
          side: 'top',
          title: t('setting.settingModel'),
          description: t('setting.tourHoverDescription'),
          showButtons: ['next'],
          nextBtnText: t('setting.tourUnderstood'),
          onNextClick: () => {
            // 结束引导并跳转到设置页面
            localStorage.setItem('tour_end', 'true');
            router.push({ path: '/setting/basic' });
            tourDriver.destroy();
          }
        }
      }
    ]
  });

  tourDriver.drive();
}

// 处理鼠标进入事件
const handleMouseEnter = () => {
  showProfile.value = true;

  // 如果第一步引导正在进行中，关闭它
  if (tourDriver && tourDriver.isActive()) {
    tourDriver.destroy();
  }
}

// 处理鼠标离开事件
const handleMouseLeave = () => {
  showProfile.value = false;
}

// User Store
const userStore = useUserStore()
const { user, membership, points } = storeToRefs(userStore)

// Local State
const showProfile = ref(false)

// 判断用户是否登录
const isLoggedIn = computed(() => {
  return !!(user.value && (user.value.user_name || user.value.mobile || user.value.user_email || user.value.id))
})

// 获取用户名首字母
const userInitial = computed(() => {
  if (!isLoggedIn.value) {
    return 'O' // Offline 的首字母
  }
  const name = user.value.user_name || user.value.mobile || user.value.user_email || 'U'
  return name.charAt(0).toUpperCase()
})

// 根据首字母生成背景色
const getAvatarColor = (initial) => {
  // 如果未登录，使用灰色
  if (!isLoggedIn.value) {
    return '#9A9A9A'
  }
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ]
  const index = initial.charCodeAt(0) % colors.length
  return colors[index]
}

const avatarStyle = computed(() => ({
  backgroundColor: getAvatarColor(userInitial.value)
}))

// Version Info
const versionInfo = ref({
  localVersion: '0.5.1',
  latestVersion: '0.5.1',
  isLatest: true,
  updateUrl: 'https://github.com/yu-mengyun/vue-admin-template',
  message: 'the current version is the latest version',
})

// Methods
const handleVersionClick = () => {
  window.open('https://lemon-11.gitbook.io/lemonai/version-update', '_blank')
}
</script>

<style scoped lang="less">
.user-version-wrapper {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 16px;
}

.user-profile-container {
  position: relative;
  width: 100%;
}

.user-info-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;

  .user-avatar {
    width: 37px;
    height: 37px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    flex-shrink: 0;
    text-transform: uppercase;
    user-select: none;
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.05);
    }
  }

  .user-info-text {
    display: flex;
    flex-direction: column;
    font-size: 12px;
    flex: 1;
    min-width: 0;

    .user-name {
      font-weight: bold;
      line-height: 24px;
      color: rgba(16, 16, 16, 1);
      font-size: 16px;
      text-align: left;
      font-family: PingFangSC;
      max-width: 50%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-plan {
      line-height: 17px;
      color: rgba(154, 154, 154, 1);
      font-size: 12px;
    }

    .user-details {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
      justify-content: space-between;
    }

    .points-display {
      display: flex;
      align-items: center;
      gap: 4px;
      line-height: 17px;
      color: rgba(154, 154, 154, 1);
      font-size: 12px;

      .points-icon {
        width: 14px;
        height: 14px;
        color: #FFB800;
        flex-shrink: 0;
      }

      .points-value {
        min-width: 20px;
        margin-right: 10px;
        font-weight: 500;
      }
    }

    .offline-status {
      display: flex;
      align-items: center;
      gap: 4px;

      .offline-text {
        line-height: 17px;
        color: rgba(154, 154, 154, 1);
        font-size: 12px;
      }
    }
  }
}

.profile-wrapper {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 298px;
  padding: 10px 16px;
  font-size: 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.04);
  z-index: 99999;

  &::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    height: 10px;
    background: transparent;
  }
}

.version-text {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  user-select: none;

  line-height: 17px;
  color: rgba(154, 154, 154, 1);
  font-size: 12px;

  &:hover {
    color: #000;
    background-color: #e5e5e5;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
