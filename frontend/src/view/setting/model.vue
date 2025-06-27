<template>
  <div class="model-service">
    <h2 v-if="!showLanuch">{{ $t('setting.modelService.title') }}</h2>
    <div class="model-service-container">
      <div class="provider-sidebar">
        <div class="provider-search" style="justify-content: center; align-items: center;">
          <a-input v-model:value="searchQuery" :placeholder="$t('setting.modelService.searchPlaceholder')" prefix-icon
                   style="font-size: 14px; height: 36px; margin-bottom: 16px;">
            <template #prefix>
              <SearchOutlined/>
            </template>
          </a-input>
        </div>

        <div class="platform-list">
          <div v-for="platform in filteredPlatforms" :key="platform.id" class="platform-item"
               :class="{ 'platform-item-active': choose_platform.id === platform.id }"
               @click="handlePlatform(platform)">
            <div v-if="platform.logo_url" class="platform-logo">
              <img :src="platform.logo_url" alt="logo" class="logo">
            </div>
            <div v-else class="platform-letter platform-logo" :style="{ backgroundColor: platform.color }">
              {{ platform.name.charAt(0) }}
            </div>
            <span class="platform-name">{{ getPlatformDisplayName(platform.name) }}</span>
            <span v-if="platform.is_enabled" class="status-text">{{ $t('setting.modelService.statusOn') }}</span>
          </div>
        </div>

        <div class="provider-post platform-item" @click="handlePlatformAdd()"> + {{
            $t('setting.modelService.addPlatform')
          }}
        </div>
      </div>
      <div class="provider-sidebar-mobile">
        <div
            style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="color:#213547;font-size: 18px;font-weight: 700;">{{ $t(`setting.modelService.modelPlatform`) }}
          </div>
          <div class="provider-post" @click="handlePlatformAdd()"> + {{
              $t('setting.modelService.addPlatform')
            }}
          </div>
        </div>
        <a-select style="width: 100%;" v-model:value="choose_platform.id">
          <a-select-option v-for="platform in filteredPlatforms" :key="platform.id" :value="platform.id"
                           @click="handlePlatform(platform)">
            <div class="platform-item">
              <div v-if="platform.logo_url" class="platform-logo">
                <img :src="platform.logo_url" alt="logo" class="logo">
              </div>
              <div v-else class="platform-letter platform-logo" :style="{ backgroundColor: platform.color }">
                {{ platform.name.charAt(0) }}
              </div>
              <span class="platform-name">{{ platform.name }}</span>
              <span v-if="platform.is_enabled" class="status-text">{{ $t('setting.modelService.statusOn') }}</span>
            </div>
          </a-select-option>
        </a-select>
      </div>
      <div class="provider-info">
        <div class="info-header">
          <span class="info-model-header">{{ getPlatformDisplayName(choose_platform.name) }} </span>
          <span v-if="choose_platform.source_type === 'user'" class="platform-icon">
            <setting-outlined class="platform-setting" @click.stop="handlePlatformSetting"/>
          </span>
          <span class="platform-status" v-if="!choose_platform.is_subscribe">
            <a-switch v-model:checked="choose_platform.is_enabled" class="custom-switch" @change="handleSaveChanges"/>
          </span>
          <!-- <a-button :disabled="!isInfoChanged" type="primary" class="save-button" @click="handleSaveChanges">{{
            $t('setting.modelService.save') }}</a-button> -->
        </div>

        <div class="info-content">
          <div class="info-platform" v-if="!choose_platform.is_subscribe">
            <!--      provider info DIY      -->
            <div class="api-msg-container" >
<!--              <div v-if="choose_platform.name===`Cloudsway`">-->
<!--                <span class="api-key">{{ $t('setting.modelService.ak') }}</span>-->
<!--                <a-input-password v-if="choose_platform.name===`Cloudsway`" id="api-key-value"-->
<!--                                  v-model:value="choose_platform.api_key"-->
<!--                                  :placeholder="$t('setting.modelService.akPlaceholder')" class="api-input" @blur="handleSaveChanges"/>-->
<!--              </div>-->
              <div v-if="choose_platform.name.toLocaleString() === 'Ollama'">
                      <!--       ollama do not have apikey           -->
              </div>
              <div v-else>
                <span class="api-key">{{handleApiTitle }}</span>
                  <a-input-password id="api-key-value" v-model:value="choose_platform.api_key"
                                  :placeholder="handleApiPlaceholder"  @change="handleSaveChanges">
                     <template #addonAfter>
                        <a-button class="no-button" @click="handleCheckApiKey" :loading="checkLoading" >{{
               $t('setting.modelService.check') }}</a-button>
                     </template>
                  </a-input-password>


              </div>

            </div>

            <a v-if="choose_platform.key_obtain_url" :href="choose_platform.key_obtain_url" target="_blank"
               class="get-api-link">{{ $t('setting.modelService.getApiKey')  }}</a>

            <span class="api-address-title">{{ $t('setting.modelService.apiAddress') }}</span>

            <a-input v-model:value="choose_platform.api_url"
                     :placeholder="$t('setting.modelService.apiAddressPlaceholder')" class="api-input" @change="handleSaveChanges">
              <template #addonAfter v-if="handleShowCheckButton">
                        <a-button class="no-button" @click="handleCheckApiKey" :loading="checkLoading" >{{
               $t('setting.modelService.check') }}</a-button>
                     </template>
            </a-input>
            <div class="show-api-tips">
              <div>
                <span v-if="choose_platform?.api_url?.endsWith('#')" class="api-address">
                  {{ choose_platform.api_url.substring(0, choose_platform.api_url.length - 1) }}
                </span>
                <span v-else-if="choose_platform?.api_url?.endsWith('/')" class="api-address">
                  {{ choose_platform.api_url }}chat/completions
                </span>
                <span v-else class="api-address">
                  {{ choose_platform?.api_url }}/chat/completions
                </span>
              </div>
              <div class="api-address">
                {{ $t('setting.modelService.apiAddressTip') }}
              </div>
            </div>

          </div>
          <div class="info-model">
            <div>
              <models-list :models="models" :platform_id="choose_platform.id" :is_subscribe="choose_platform.is_subscribe" @setting="" @delete="handleModelDelete"
                           @add-model="handleModelAdd" @update-model="handleModelUpdate"/>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- <div v-if="showLanuch" class="lanuch-model"> -->
    <add-platform ref="addPlatformRef" @add-platform="handleAddPlatform"/>
    <setting-platform ref="settingPlatformRef" @update-platform="handleUpdatePlatform"/>
  </div>
    <!-- 选择模型弹窗 -->
  <a-modal  :cancelText=" $t('setting.modelService.cancel')" :okText="$t('setting.modelService.confirm')" v-model:open="modelVisible" centered   :title="$t('setting.modelService.selectCheckModel')" width="400px" @ok="handleOk">
      <a-select v-model:value="selectedModel" style="width: 100%">
        <a-select-option v-for="model in models" :key="model.id" :value="model.model_id">
          {{ model.model_name }}
        </a-select-option>
      </a-select>
  </a-modal>

</template>

<script setup>
import {ref, onMounted, computed, watch, nextTick} from 'vue'
import {useI18n} from 'vue-i18n'

const {t} = useI18n()
import service from '@/services/platforms'
import {
  SettingOutlined,
  SearchOutlined,
  DownOutlined,
  RightOutlined,
  SnippetsOutlined,
  ToolOutlined,
  GlobalOutlined,
  BranchesOutlined,
  CameraOutlined
} from '@ant-design/icons-vue'
import {message} from 'ant-design-vue'
import AddPlatform from '@/components/platforms/addPlatform.vue'
import SettingPlatform from '@/components/platforms/settingPlatform.vue'
import ModelsList from '@/components/platforms/modelsList.vue'
import emitter from '@/utils/emitter'
import modelService from '@/services/default-model-setting'
import {driver} from "driver.js";
import "driver.js/dist/driver.css";

import { useUserStore } from '@/store/modules/user.js'
const { user,membership,points } = useUserStore();

const platforms = ref({})
const choose_platform = ref({
  id: 'default',
  name: 'OpenAI',
})
const searchQuery = ref('')
const models = ref([])
const originalInfo = ref({})
const isInfoChanged = ref(false)
const showInfoPlatform = ref(true)

const modelVisible  = ref(false)
const selectedModel = ref(null)
const checkLoading = ref(false)
//launch model
const showLanuch =ref(false)
//handleCheckApiKey
const  handleCheckApiKey = async () => {
  modelVisible.value = true;
}

const handleOk =  async () => {
  if (!selectedModel.value) {
    //setting.modelService.selectCheckModel
    message.error(t('setting.modelService.selectCheckModel'))
    return
  }
  //checkApiAvailability

  modelVisible.value = false;
  checkLoading.value = true
  let res = await service.checkApiAvailability({
    "base_url": choose_platform.value.api_url,
    "api_key": choose_platform.value.api_key,
    "model": selectedModel.value
  })
  checkLoading.value = false
  if(res.status){
    //res.message : LLM API call succeeded start
    message.success(t('setting.modelService.apiCallSucceeded'))
  }else{
    //`LLM API call failed, HTTP status: ${response.status}, error: ${errorText}`
    if(res.message.startsWith('LLM API call failed')){
      let resposneContent = res.message.replace('LLM API call failed', t('setting.modelService.apiCallFailed'))
      message.error(resposneContent)
    }else if(res.message.startsWith('LLM API call timed out')){
      let resposneContent = res.message.replace('LLM API call timed out', t('setting.modelService.apiCallTimeout'))
      message.error(resposneContent)
    }else if(res.message.startsWith('Network or other error occurred during LLM API call')){
      let resposneContent = res.message.replace('Network or other error occurred during LLM API call', t('setting.modelService.unknownError'))
      message.error(resposneContent)
    }
  }
}


// i18 support
function getPlatformDisplayName(name) {
  const key = `setting.modelService.platforms.${name.replace(' ', '')}`;
  const translation = t(key);
  // 如果翻译结果等于键名，说明翻译不存在，回退到原始 name
  return translation === key ? name : translation;
}

emitter.on('fresh-models', (value) => {
  handleGetModels(choose_platform.value.id)
})

const handleShowCheckButton = computed(() => {
  return choose_platform.value.name.toLocaleString() === 'Ollama'
})
const handleApiTitle = computed(() => {
  if (choose_platform.value.name === 'Cloudsway') {
    return t('setting.modelService.ak')
  }
  return t('setting.modelService.apiKey')
})
const handleApiPlaceholder = computed(() => {
  if (choose_platform.value.name === 'Cloudsway') {
    return t('setting.modelService.akPlaceholder')
  }
  return t('setting.modelService.apiKeyPlaceholder')
})
const handlePlatform = (platform) => {

  choose_platform.value = JSON.parse(JSON.stringify(platform))
  originalInfo.value = {
    api_key: platform.api_key,
    api_url: platform.api_url,
    is_enabled: platform.is_enabled
  }
  handleGetModels(choose_platform.value.id)

  showInfoPlatform.value = true
}

watch([() => choose_platform.value.api_key, () => choose_platform.value.api_url, () => choose_platform.value.is_enabled],
    () => {
      if (!originalInfo.value) return
      isInfoChanged.value =
          choose_platform.value.api_key !== originalInfo.value.api_key ||
          choose_platform.value.api_url !== originalInfo.value.api_url ||
          choose_platform.value.is_enabled !== originalInfo.value.is_enabled
    },
    {deep: true}
)

const handleSaveChanges = async () => {
  try {
    await service.updatePlatform({
      id: choose_platform.value.id,
      api_key: choose_platform.value.api_key,
      api_url: choose_platform.value.api_url,
      is_enabled: choose_platform.value.is_enabled,
      name: choose_platform.value.name,
      logo_url: choose_platform.value.logo_url,
      provider_type: choose_platform.value.provider_type,
      api_version: choose_platform.value.api_version
    })
    originalInfo.value = {
      api_key: choose_platform.value.api_key,
      api_url: choose_platform.value.api_url,
      is_enabled: choose_platform.value.is_enabled
    }
    isInfoChanged.value = false
  } catch (error) {
    return
  }
  init(choose_platform.value.id)
}

const addPlatformRef = ref(null)
const settingPlatformRef = ref(null)

const handlePlatformAdd = () => {
  addPlatformRef.value?.showModal()
}

const handlePlatformSetting = () => {
  settingPlatformRef.value?.showModal(choose_platform.value)
}


const handleModelDelete = (model) => {
  models.value = models.value.filter(m => m.id !== model.id)
};

const handleAddPlatform = (platformData) => {
  const newPlatform = {
    ...platformData,
    is_enabled: true,
    source_type: 'user',
    color: colors[platforms.value.length % colors.length]
  }
  platforms.value = [...platforms.value, newPlatform]
  choose_platform.value = newPlatform
  handleGetModels(choose_platform.value.id)
}

const handleUpdatePlatform = (updatedPlatform) => {
  const index = platforms.value.findIndex(p => p.id === updatedPlatform.id)
  if (index !== -1) {
    platforms.value[index] = {...updatedPlatform, color: platforms.value[index].color}
    if (choose_platform.value.id === updatedPlatform.id) {
      choose_platform.value = platforms.value[index]
    }
  }
}

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB']

onMounted(async () => {
  //触发全局事件 closeTour 延迟500mms
  await init();
  //localStorage.setItem('tour_end', 'true');
  emitter.on('model-start',async ()=>{ 
    showLanuch.value = true
    step1();
  })
})



let tourDriver = null; // 提升作用域，并初始化为空

const step1 = async () => {
  tourDriver = driver({
    animate: true,
    showProgress: true,
    prevBtnText: t('setting.prevStep'),
    nextBtnText: t('setting.nextStep'),
    doneBtnText: t('setting.doneStep'),
    steps: [
      {
        element: '.platform-list',
        popover: {
          side: 'bottom',
          title: t('setting.modelService.modelService'),
          description: t('setting.modelService.modelServiceTipsOne'),
          onNextClick: async () => {
            nextTick(() => {
              // 设置缓存，结束引导
              tourDriver.moveNext();
            });
          },
        }
      },
      {
        element: '#api-key-value',
        popover: {
          side: 'bottom',
          title: t('setting.modelService.modelService'),
          description: t('setting.modelService.modelServiceTipsTwo'),
          onNextClick: async () => {
            nextTick(() => {
              tourDriver.moveNext();
            });
          },
        }
      },
      {
        //platform-status
        element: '.platform-status',
        popover: {
          side: 'bottom',
          title: t('setting.modelService.modelService'),
          description: t('setting.modelService.modelServiceTipsThree'),
          onNextClick: async () => {
            nextTick(() => {
              // 设置缓存，结束引导
              tourDriver.moveNext();
              // emitter.emit('onSearchService');
            });
          },
        }
      }
    ]
  });

  tourDriver.drive();
};

function init(id) {
  service.getPlatforms().then((res) => {
    //判断是不是会员 membership
    let is_membership = false;
    //判断是不是在 membership.endDate: "2026-06-12T09:44:02.000Z" membership.startDate: "2025-06-12T09:44:02.000Z" 在这个时间范围内
    if (membership && membership?.startDate && membership?.endDate) {
        const start = new Date(membership.startDate);
        const end = new Date(membership.endDate);
        const now = new Date();

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          if (now >= start && now <= end) {
            is_membership = true;
          }
        }
    }
    
    platforms.value = res.sort((u, v) => {
      // return u.name.toUpperCase() > v.name.toUpperCase() ? 1 : -1; // 忽略大小写进行排序，确保大写字母在小写字母之前
      return u.name.localeCompare(v.name); // 使用本地语言环境进行排序，确保正确的字母顺序
    }).map((platform, index) => ({
      ...platform,
      color: colors[index % colors.length]
    }))
    platforms.value = platforms.value.filter(platform => platform.name!=="Lemon")

    if (id) {
      choose_platform.value = platforms.value.find(p => p.id === id)
      handleGetModels(choose_platform.value.id)
    } else {
      choose_platform.value = platforms.value[0]
      handleGetModels(choose_platform.value.id)
    }

  })
}

const handleGetModels = ( id) => {
       service.getModels(id).then((res) => {
        models.value = res
        selectedModel.value = res[0]?.model_id
      })
}

const filteredPlatforms = computed(() => {
  // Defensive check: Ensure platforms.value is an array; default to empty array if not
  const platformsArray = Array.isArray(platforms.value) ? platforms.value : [];
  // 1. Sort by is_enabled: true first, false later
  const sortedPlatforms = [...platformsArray].sort((a, b) => {
    return (b.is_enabled ? 1 : 0) - (a.is_enabled ? 1 : 0);
  });

  // 2. Return sorted platforms if no search query
  if (!searchQuery.value) {
    return sortedPlatforms;
  }

  // 3. Filter by search query
  const query = searchQuery.value.toLowerCase();
  return sortedPlatforms.filter(platform =>
    platform.name && platform.name.toLowerCase().includes(query) || getPlatformDisplayName(platform.name).includes(query)
  );
});
const handleModelAdd = async (model) => {
 handleGetModels(choose_platform.value.id)
}

const handleModelUpdate = async (model) => {
  handleGetModels(choose_platform.value.id)
}


emitter.on('fresh-pages', (value) => {
  // 刷新页面
  init()
})
</script>

<style scoped>
.model-service {
  padding: 16px;
  height: 100%;
  overflow-y: hidden;
  width: 100%;
}

.model-service-container {
  display: flex;
  flex-direction: row;
  padding: 1px;
}

.provider-sidebar {
  width: 250px;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  height: 80vh;
}

.provider-sidebar-mobile {
  display: none;
}

.provider-info {
  flex: 5;
  max-height: calc(100vh - 200px);
  width: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.provider-info::-webkit-scrollbar {
  width: 2px;
  background-color: transparent;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.provider-info:hover::-webkit-scrollbar {
  opacity: 1;
}

.provider-info::-webkit-scrollbar-thumb {
  background-color: #d9d9d9;
  border-radius: 3px;
}

.provider-info::-webkit-scrollbar-track {
  background-color: transparent;
}

.platform-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  gap: 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.provider-post {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 10px;
  text-align: center;
  border: 1px solid #ededed;
  padding: 5px;
  margin-top: auto;
}


.platform-item-active {
  background-color: #f0f0f0;
}


.platform-logo {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  margin-left: 8px;
}

.logo {
  border-radius: 6px;
  width: 32px;
  height: 32px;
}

.platform-letter {
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.platform-name {
  flex: 1;
}

.platform-setting {
  color: #8c8c8c;
  cursor: pointer;
}

.platform-setting:hover {
  color: #1890ff;
}

.platform-delete {
  color: #8c8c8c;
  cursor: pointer;
}

.platform-delete:hover {
  color: #1890ff;
}

.platform-status {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.status-text {
  background-color: #e7f3e1;
  padding-left: 7px;
  padding-right: 7px;
  color: #7fd056;
  border-radius: 10px;
  font-size: 11px;
  border: #8fc873 1px solid;
}

.custom-switch :deep(.ant-switch-checked) {
  background-color: #67c23a;
}

.info-header {
  display: flex;
  justify-content: start;
  padding: 12px 16px;
}

.info-subscription-header {
  flex-direction: column;
}

.info-content {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}

.info-platform {
  display: flex;
  flex-direction: column;
}

.api-input {
  margin-top: 5px;
  margin-bottom: 5px;
  font-size: 14px;
}

.get-api-link {
  margin-left: 5px;
  margin-top: 5px;
  font-size: 11px;
  color: #1890ff;
}

.modal-content {
  padding: 16px;
  text-align: center;
}

.round-button {
  border-radius: 20px;
  padding: 8px 24px;
}

.confirm-btn {
  background-color: #ff4d4f;
  border-color: #ff4d4f;
}

.confirm-btn:hover {
  background-color: #ff7875;
  border-color: #ff7875;
}

.save-button {
  margin-left: 12px;
  border-radius: 20px;
}

.api-address-title {
  margin-top: 10px;
  font-weight: bold;
}

.provider-search {
  width: 100%;
  font-size: 14px;
}

.platform-icon {
  padding-left: 6px;
  display: flex;
}

.platform-list {
  overflow-y: auto;
  height: 80vh;
  overflow-x: hidden;
  font-size: 14px;
  padding-right: 12px;
  box-sizing: border-box;
}

.platform-list::-webkit-scrollbar {
  width: 2px;
  height: 30px;
  background-color: transparent;
  scrollbar-width: none; /* 默认隐藏 */
}

.platform-list::-webkit-scrollbar-thumb {
  background-color: #d9d9d9;
  border-radius: 3px;
  opacity: 0; /* 默认隐藏滚动条 */
  transition: opacity 0.3s ease; /* 平滑过渡 */
}

.platform-list::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 鼠标悬停时显示滚动条 */
.platform-list:hover::-webkit-scrollbar-thumb {
  opacity: 1;
}




.model-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
}

.models-list {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.09);
}

.sub-title {
  font-size: 13px;
  color: #8c8c8c;
}

.model-group {
  margin-bottom: 10px;
  border-radius: 6px;
  border: #d1d1d1 solid 1px;
}

.group-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  background-color: #f5f5f5;
  padding: 12px;
  gap: 12px;
}

.group-toggle {
  font-size: 14px;
  color: #a4a2a2;
  transition: transform 0.6s;
}

.group-toggle.expanded {
  transform: rotate(180deg);
  border-bottom: #666 solid 1px;
}

.model-items {
  transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out;
  opacity: 1;
  overflow: hidden;
}

.model-items.collapsed {
  max-height: 0;
  opacity: 0;
  margin: 0;
  padding: 0;
}

.model-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  transition: all 0.3s;
  padding: 12px;
  gap: 12px;
}

.logo-letter {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.model-name {
  font-size: 14px;
  color: #333;
}

.model-type {
  margin-left: 10px;
  font-size: 12px;
  color: #666;
}

.model-actions {
  display: flex;
  gap: 8px;
}

.group-name {
  font-size: 13px;
  font-weight: 500;
  color: #202020;
  font-weight: bold;
}

.api-address {
  font-size: 12px;
  color: #cdcdcd;
}

.show-api-tips {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.type-icon {
  margin-top: 2px;
  height: 18px;
  width: 25px;
  border-radius: 7px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
}

.type-tool {
  background-color: #ffe1ce;
  color: #a07b64;
}

.type-network {
  background-color: #b1d7f4;
  color: #537fa1;
}

.type-embed {
  background-color: #f3d4a5;
  color: #917142;
}

.type-reasoning {
  background-color: #b1bac7;
  color: #64728a;
}

.type-vision {
  background-color: #c9f6d3;
  color: #54b46a;
}

.model-info {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.api-key {
  font-weight: bold;

}

.no-button{
  border: unset !important;
    background-color: unset!important;
    height: unset!important;
}
.info-model-header {
  display: flex;
  font-weight: bold;
  font-size: 18px;
}



@media screen and (max-width: 768px) {

  h2 {
    display: none !important;
  }

  .model-service-container {
    display: flex;
    flex-direction: column;
  }

  .model-service {
    padding: 0 !important;
    width: 100%;
  }

  .provider-sidebar {
    display: none !important;
  }

  .provider-info {
    max-height: 100% !important;
  }

  .provider-sidebar-mobile {
    display: block !important;
  }

  :deep(.ant-select-selector) {
    height: 48px !important;
    /* border: none !important; */
  }

  .info-header {
    padding-left: 0px !important;
    padding-right: 0px !important;
  }

  .info-content {
    padding-left: 0px !important;
    padding-right: 0px !important;
    padding-bottom: 48px !important;
  }

  .platform-item-active {
    background-color: unset !important;
  }

  .save-button {
    position: absolute;
    bottom: 0px;
    z-index: 99;
    margin: 0px;
    border: unset;
    border-radius: 0px;
    width: 100%;
    background: rgb(26, 26, 25);
    font-size: 16px;
    font-weight: 500;
    left: 0;
    color: #fff;
    height: 48px;
  }

}


@media (hover: hover) and (pointer: fine) {
  .provider-post:hover {
    background-color: #f0f0f0;
  }

  .platform-item:hover {
    background-color: #f0f0f0;
  }
}
</style>