<template>
  <!-- 桌面端选择器 -->
  <a-select
    v-if="!isMobile"
    ref="selectRef"
    class="model-select"
    @change="changeModel"
    :value="selectedModel"
    :placeholder="$t('lemon.input.chooseModel')"
    style="max-width: 200px; width: 100%"
    :options="groupedOptions"
    optionLabelProp="label"
    :fieldNames="{ label: 'label', value: 'value' }"
    :dropdownMatchSelectWidth="false"
    :dropdownRender="dropdownRender"
    :open="dropdownOpen"
    @dropdownVisibleChange="onDropdownVisibleChange"
  >
    <template #option="{ label, logo_url, requires_membership, disabled, priceLabel, priceColor, requiresLogin, is_subscribe }">
      <div 
        style="display: flex; align-items: center; justify-content: space-between; width: 100%"
        :style="{ opacity: disabled ? 0.5 : 1 }"
      >
        <div style="display: flex; align-items: center">
          <img
            v-if="logo_url"
            :src="logo_url"
            alt="logo"
            style="max-width: 20px; height: 20px; margin-right: 8px"
          />
          <span>{{ label }}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <a-tag v-if="requiresLogin" size="small" class="model-tag-login">
            {{ $t('lemon.model.requiresLogin') }}
          </a-tag>
        </div>
      </div>
    </template>
  </a-select>

  <!-- 移动端按钮触发器 -->
  <div v-else class="mobile-model-trigger" @click="openMobileModal">
    <div class="selected-model">
      <img
        v-if="currentModelInfo?.logo_url"
        :src="currentModelInfo.logo_url"
        alt="logo"
        class="model-logo"
      />
      <span class="model-name">{{ currentModelInfo?.model_name || 'Select Model' }}</span>
    </div>
    <DownOutlined class="dropdown-icon" />
  </div>

  <!-- 移动端底部弹出选择器 -->
  <teleport to="body">
    <div v-if="showMobileModal" class="mobile-modal-overlay" @click="closeMobileModal">
      <div class="mobile-model-selector" @click.stop>
        <!-- 头部 -->
        <div class="modal-header">
          <h3>{{ $t('lemon.input.chooseModel') }}</h3>
          <a-button type="text" @click="closeMobileModal" class="close-btn">
            <CloseOutlined />
          </a-button>
        </div>
        <div class="model-list">
          <div v-for="group in groupedOptions" :key="group.label" class="platform-group">
            <div class="platform-header">
              <span class="platform-name">{{ group.label }}</span>
            </div>
            <div 
              v-for="option in group.options" 
              :key="option.value"
              class="model-item"
              :class="{ 
                'selected': option.value === selectedModel,
                'disabled': option.disabled
              }"
              @click="handleMobileModelSelect(option)"
            >
              <div class="model-info">
                <img
                  v-if="option.logo_url"
                  :src="option.logo_url"
                  alt="logo"
                  class="model-logo"
                />
                <span class="model-name">{{ option.label || option.model_name || 'Unknown Model' }}</span>
              </div>
              <div class="model-tags">
                <a-tag v-if="option.requiresLogin" size="small" class="model-tag-login">
                  {{ $t('lemon.model.requiresLogin') }}
                </a-tag>
                <a-tag v-if="option.requires_membership" size="small" class="model-tag-pro">
                  Pro+
                </a-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
    <!-- 升级弹窗 -->
    <a-modal
    v-model:open="showUpgradeModal"
    :title="upgradeTitle"
    centered
    width="1200px"
    :footer="null"
    @cancel="closeModal"
  >
  <Pricing  isWindow="true"  showTitle="false" @close_window="closeModal" />
  </a-modal>

  <!-- 登录提示弹窗 -->
  <a-modal
    v-model:open="showLoginPrompt"
    :title="$t('lemon.model.loginRequired')"
    centered
    width="400px"
    :footer="null"
    @cancel="closeLoginPrompt"
  >
    <div style="text-align: center; padding: 20px 0;">
      <p style="margin-bottom: 20px; font-size: 16px;">{{ $t('lemon.model.loginRequiredDescription') }}</p>
      <p style="margin-bottom: 20px; color: #666;">{{ $t('lemon.model.pleaseLoginFirst') }}</p>
      <a-button type="primary" @click="handleGoToLogin" style="margin-right: 12px;">
        {{ $t('lemon.model.goToLogin') }}
      </a-button>
      <a-button @click="closeLoginPrompt">
        {{ $t('lemon.common.cancel') }}
      </a-button>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect, nextTick, h } from 'vue'
import { useChatStore } from '@/store/modules/chat'
import { storeToRefs } from 'pinia'
import { DownOutlined, CloseOutlined } from '@ant-design/icons-vue'

import { useUserStore } from '@/store/modules/user';
import modelService from '@/services/default-model-setting'
import Pricing from '@/view/pay/components/pricing.vue';
import i18n from '@/locals';

const userStore = useUserStore();
const { membership } = storeToRefs(userStore);

// Pinia store
const chatStore = useChatStore()
const { model_id } = storeToRefs(chatStore)

const modelList = ref([])
const selectedModelValue = ref(null)
const selectRef = ref(null)
const dropdownOpen = ref(false)

const showUpgradeModal = ref(false);
const upgradeTitle = ref("Upgrade")
const showLoginPrompt = ref(false)

// 移动端相关状态
const showMobileModal = ref(false)
const isMobile = ref(false)

// 登录状态检查
const isLoggedIn = computed(() => {
  return !!localStorage.getItem('access_token')
})

// 登录提示弹窗
const showLoginModal = ref(false)

// 移动端检测
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// 当前选中模型信息 (will be defined after selectedModel)
let currentModelInfo


//判断是不是会员
const isMember = computed(() => {
  if(membership.value){
    return true
  }
  return false
})

const closeModal = () => {
  showUpgradeModal.value = false;
};

// 关闭登录提示弹窗
const closeLoginPrompt = () => {
  showLoginPrompt.value = false;
};

// 跳转到登录页面
const handleGoToLogin = () => {
  closeLoginPrompt();
  // 这里可以根据项目的路由配置跳转到登录页面
  // 例如: router.push('/login') 或者其他登录逻辑
  console.log('跳转到登录页面');
};

// 移动端模型选择处理
const handleMobileModelSelect = (option) => {
  // 如果需要登录但未登录，显示登录提示
  if (option.requiresLogin) {
    closeMobileModal()
    showLoginPrompt.value = true
    return
  }
  
  // 如果选择的是 Pro+ 模型且用户不是会员，弹出升级弹窗
  if (option.requires_membership && !isMember.value) {
    closeMobileModal()
    showUpgradeModal.value = true
    return
  }
  
  // 选择模型
  changeModel(option.value)
  closeMobileModal()
}

// 移动端升级按钮处理
const handleMobileUpgrade = () => {
  closeMobileModal()
  showUpgradeModal.value = true
}

// 打开移动端模态框
const openMobileModal = () => {
  showMobileModal.value = true
}

// 关闭移动端模态框
const closeMobileModal = () => {
  // 添加关闭动画类
  const modalSelector = document.querySelector('.mobile-model-selector')
  if (modalSelector) {
    modalSelector.classList.add('closing')
  }
  
  // 延迟关闭模态框以完成动画
  setTimeout(() => {
    showMobileModal.value = false
  }, 250)
}

// 处理下拉框可见性变化
const onDropdownVisibleChange = (visible) => {
  dropdownOpen.value = visible;
};

// 初始化模型列表
const initModel = async () => {
  console.log('membership.value', membership.value) 
  // Step 1: 读取本地缓存
  const cachedData = localStorage.getItem('modelList')
  if (cachedData) {
    try {
      modelList.value = JSON.parse(cachedData)

      // 如果 model_id 还没设置，默认设置为第一个模型的 ID
      if (modelList.value.length > 0 && !model_id.value) {
        const defaultId = modelList.value[0].id * 1
        model_id.value = defaultId
        selectedModelValue.value = defaultId
      }
    } catch (e) {
      console.error('Failed to parse cached modelList', e)
    }
  }

  // Step 2: 获取接口数据（用于刷新）
  try {
    const res = await modelService.getModels()

    if (Array.isArray(res)) {
      modelList.value = res
      localStorage.setItem('modelList', JSON.stringify(res))

      if (res.length > 0 && !model_id.value) {
        const defaultId = res[0].id * 1
        model_id.value = defaultId
        selectedModelValue.value = defaultId
      }
    }
  } catch (e) {
    console.error('Failed to fetch models from API', e)
  }
}


// 切换模型
const changeModel = (modelId) => {
  const id = modelId * 1
  const selectedModelData = modelList.value.find(model => model.id === id)
  
  // 如果需要登录但未登录，显示登录提示
  if (selectedModelData && selectedModelData.is_subscribe && !isLoggedIn.value) {
    showLoginPrompt.value = true
    return // 不切换模型
  }
  
  // 如果选择的是 Pro+ 模型且用户不是会员，弹出升级弹窗
  if (selectedModelData && selectedModelData.requires_membership && !isMember.value) {
    showUpgradeModal.value = true
    return // 不切换模型
  }
  
  selectedModelValue.value = id
  model_id.value = id
}

// 当前选中模型
const selectedModel = computed(() => {
  // 确保 modelList 已初始化且不为空
  if (!modelList.value || modelList.value.length === 0) {
    return null
  }
  
  const currentModelId = selectedModelValue.value ?? model_id.value ?? modelList.value[0]?.id ?? null
  
  // 如果有选中的模型，检查用户是否有权限使用
  if (currentModelId && modelList.value.length > 0) {
    const currentModel = modelList.value.find(model => model.id === currentModelId)
    
    // 如果当前模型需要登录但用户未登录，则选择第一个不需要登录的模型
    if (currentModel && currentModel.is_subscribe && !isLoggedIn.value) {
      const availableModel = modelList.value.find(model => !model.is_subscribe)
      return availableModel ? availableModel.id : null
    }
    
    // 如果当前模型需要会员权限但用户不是会员，则选择第一个可用的模型
    if (currentModel && currentModel.requires_membership && !isMember.value) {
      const availableModel = modelList.value.find(model => !model.requires_membership && (!model.is_subscribe || isLoggedIn.value))
      return availableModel ? availableModel.id : null
    }
  }
  
  return currentModelId
})

// 当前选中模型信息
currentModelInfo = computed(() => {
  const currentId = selectedModel.value
  if (!currentId || !modelList.value || modelList.value.length === 0) {
    return null
  }
  return modelList.value.find(model => model.id === currentId)
})

// 模拟价格等级映射 - 确保4个等级都有分配
const getPriceLevel = (price_level_description) => {
  const map = {
    cheap: { label: "Cheapest", color: "#52c41a" },
    normal: { label: "Cheap", color: "#1890ff" },
    expensive: { label: "Expensive", color: "#722ed1" },
    very_expensive: { label: "Very Expensive", color: "#ff4d4f" },
  };

  return map[price_level_description] || { label: "Unknown", color: "#d9d9d9" };
};

// 分组的 options 列表
const groupedOptions = computed(() => {
  const modelsWithPrice = modelList.value.map(model => {
    const priceInfo = getPriceLevel(model.price_level_description)
    const requiresLogin = model.is_subscribe && !isLoggedIn.value
    return {
      label: model.model_name,
      requires_membership: model.requires_membership,
      value: model.id,
      logo_url: model.logo_url,
      disabled: requiresLogin, // 需要登录但未登录的模型设为禁用
      priceLevel: priceInfo.level,
      priceLabel: priceInfo.label,
      priceColor: priceInfo.color,
      platform_name: model.platform_name,
      platform_id: model.platform_id,
      is_subscribe: model.is_subscribe,
      requiresLogin: requiresLogin
    }
  })
  
  // 按平台分组
  const groupedByPlatform = modelsWithPrice.reduce((groups, model) => {
    const platformName = model.platform_name || 'Other'
    if (!groups[platformName]) {
      groups[platformName] = []
    }
    groups[platformName].push(model)
    return groups
  }, {})
  
  // 转换为 Ant Design Select 的分组格式
  const result = Object.keys(groupedByPlatform).map(platformName => ({
    label: platformName,
    options: groupedByPlatform[platformName].sort((a, b) => a.priceLevel - b.priceLevel)
  }))
  
  console.log('groupedOptions:', result)
  return result
})

// 扁平的 options 列表（用于移动端和其他需要扁平列表的地方）
const flatOptions = computed(() => {
  return groupedOptions.value.flatMap(group => group.options)
})

// 处理升级按钮点击
const handleUpgrade = () => {
  // 关闭下拉框
  dropdownOpen.value = false;
  // 显示升级弹窗
  showUpgradeModal.value = true;
}

// 自定义下拉框渲染
const dropdownRender = ({ menuNode }) => {
  const headerElements = [
    h('span', {
      style: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#333'
      }
    }, i18n.global.t('lemon.model.models'))
  ]
  
  
  return h('div', [
    // 标题栏 - 始终显示
    h('div', {
      class: 'model-dropdown-header',
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        marginBottom: '8px'
      }
    }, headerElements),
    // 原有的选项列表
    menuNode
  ])
}

onMounted(() => {
  initModel()
  checkMobile()
  // 监听窗口大小变化
  window.addEventListener('resize', checkMobile)
})

// 组件销毁时清理事件监听
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 使用一个标志来避免循环触发
let isUpdatingFromWatchEffect = false

// 监听 selectedModel 变化，自动同步 model_id
watchEffect(() => {
  if (isUpdatingFromWatchEffect) return
  
  const selected = selectedModel.value
  // 添加 null 检查，确保 selected 不为 null 且与当前 model_id 不同
  if (selected && selected !== model_id.value && modelList.value && modelList.value.length > 0) {
    // 使用 nextTick 确保在下一个事件循环中执行，避免在计算属性计算过程中修改响应式数据
    nextTick(() => {
      isUpdatingFromWatchEffect = true
      changeModel(selected)
      // 在下一次事件循环后重置标志
      nextTick(() => {
        isUpdatingFromWatchEffect = false
      })
    })
  }
})
</script>

<style scoped>
.model-select {
  width: 200px;
}

.model-tag-free {
  margin-left: 8px;
  font-size: 12px !important;
  padding: 0 6px !important;
  height: 18px !important;
  line-height: 1 !important;
  border-radius: 4px !important;
  background-color: #f0f0f0 !important;
  color: #333 !important;
  border: 1px solid #d9d9d9 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.model-tag-pro {
  margin-left: 8px;
  font-size: 12px !important;
  padding: 0 6px !important;
  height: 18px !important;
  line-height: 1 !important;
  border-radius: 4px !important;
  background-color: #1a1a19 !important;
  color: #fff !important;
  border: 1px solid #1a1a19 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.model-tag-login {
  margin-left: 8px;
  font-size: 12px !important;
  padding: 0 6px !important;
  height: 18px !important;
  line-height: 1 !important;
  border-radius: 4px !important;
  background-color: #ff7875 !important;
  color: #fff !important;
  border: 1px solid #ff7875 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.model-price-tag {
  font-size: 12px !important;
  padding: 0 6px !important;
  height: 18px !important;
  line-height: 1 !important;
  border-radius: 4px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: 600 !important;
  border: unset !important;
  background-color: unset !important;
}

::v-deep(.ant-select-dropdown .ant-select-item-option-selected) {
  background-color: #e6f7ff !important;
}

::v-deep(.ant-select-dropdown .ant-select-item-option) {
  padding: 8px 12px !important;
}

::v-deep(.ant-select-dropdown .ant-select-item-group) {
  padding: 0 !important;
}

::v-deep(.ant-select-dropdown .ant-select-item-group-list) {
  margin: 0 !important;
}

::v-deep(.ant-select-dropdown .ant-select-item-group .ant-select-item-group-list .ant-select-item-option) {
  padding-left: 20px !important;
}

::v-deep(.ant-select-dropdown .ant-select-item-group .ant-select-item-group-list .ant-select-item-option:first-child) {
  margin-top: 4px !important;
}

::v-deep(.ant-select-dropdown .ant-select-item-group .ant-select-item-group-list .ant-select-item-option:last-child) {
  margin-bottom: 8px !important;
}

.model-dropdown-header {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 移动端触发器样式 */
.mobile-model-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 90px;
  height: 24px;
  padding: 0 4px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.mobile-model-trigger .selected-model {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  width: 100%;
}

.mobile-model-trigger .model-logo {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}

.mobile-model-trigger .model-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: fit-content;
}

.mobile-model-trigger .dropdown-icon {
  font-size: 10px;
  color: #999;
}

/* 移动端模态框内容样式 */
.mobile-model-selector {
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 0;
  max-height: 60vh;
  min-height: 300px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUpIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.mobile-model-selector.closing {
  animation: slideDownOut 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  padding: 4px !important;
  color: #999 !important;
}

.upgrade-section {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.model-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 20px;
  box-sizing: content-box;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.model-item:hover {
  background-color: #f5f5f5;
}

.model-item.selected {
  background-color: #e6f7ff;
}

.model-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.model-item.disabled:hover {
  background-color: transparent;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.model-info .model-logo {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.model-info .model-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.5;
}

.model-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.platform-group {
  margin-bottom: 8px;
}

.platform-header {
  padding: 8px 20px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.platform-name {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 移动端样式优化 - 保留原有桌面端样式 */
@media screen and (max-width: 768px) {
  .model-select {
    width: 90px!important;
    height: 24px;
    font-size: 11px;
    
    div{
      height: 24px!important;
      max-height: 24px!important;
      width: 40px!important;
    }
  }
  
  /* 修改ant-select相关样式 */
  .model-select .ant-select-selection-item{
    font-size: 11px;
    padding-inline-end: 0px!important;
    line-height: 24px!important;
  }
  .model-select .ant-select-selector{
    padding: 0px 4px!important;
  }
  .model-select .ant-select-arrow{
    display: none!important;
  }
}

</style>

<style>
.ant-select-item-option-selected,
.ant-select-dropdown-menu-item-selected,
.ant-select-dropdown-menu-item-active {
  background-color: rgba(0, 0, 0, 0.0588235294) !important;
  color: #333 !important;
}

/* 移动端自定义模态框样式 */
.mobile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;
}

/* 底部弹出动画关键帧 */
@keyframes slideUpIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideDownOut {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}


@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
