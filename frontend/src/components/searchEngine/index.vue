<template>
  <div class="search-container">
    <div class="search-choose search-item">
      <div class="search-choose-header header">
        {{ $t('setting.searchService.searchProvider') }}
      </div>
      <div class="search-choose-list">
        <a-select v-model:value="selectedTemplate" :loading="loading" style="width:100%;height: 100%"
                  id="searchTemplates" @change="handleTemplateChange">
          <a-select-option v-for="item in searchTemplates" :key="item.id" :value="item.name">
            <div class="select-option-content">
              <img :src="item.logo_url" alt="" class="logo"/>
              <span>{{ displayName(item.name) }}</span>
            </div>
          </a-select-option>
        </a-select>
        <div class="search-choose-api-config" v-if="selectedTemplate === 'Tavily'">
          <span style="white-space: nowrap">{{ $t('setting.searchService.apiTips') }}</span>
          <a-input-password v-model:value="selectedConfig.base_config.api_key" class="search-choose-api-input"
                            :placeholder="$t('setting.searchService.apiKeyPlaceholder')" :disabled="loading"
                            @change="handleSave"/>
        </div>
        <div class="search-choose-api-config" v-if="selectedTemplate === 'Cloudsway'">
          <span style="white-space: nowrap">{{ $t('setting.searchService.accessKey') }}</span>
          <a-input-password v-model:value="selectedConfig.base_config.api_key" class="search-choose-api-input"
                            :placeholder="$t('setting.searchService.accessKeyPlaceholder')" :disabled="loading"
                            @change="handleSave"/>
          <span style="white-space: nowrap">{{ $t('setting.searchService.endPoint') }}</span>
          <a-input-password v-model:value="selectedConfig.base_config.endpoint" class="search-choose-api-input"
                            :placeholder="$t('setting.searchService.endpointPlaceholder')" :disabled="loading"
                            @change="handleSave"/>
        </div>
        <a-button v-show="selectedTemplate!==`Lemon`" class="save-button" @click="handleCheckApiKey" :loading="checkLoading">{{
            $t('setting.modelService.check')
          }}
        </a-button>
      </div>

      <!--  Tavily link-->
      <a v-if="selectedConfig.provider_name=== 'Tavily'" href="https://app.tavily.com/" target="_blank"
         class="get-api-link">{{ $t('setting.modelService.getApiKey') }}</a>
      <!--  Cloudsway link-->
      <a v-else-if="selectedConfig.provider_name=== 'Cloudsway'" href="https://console.cloudsway.net/" target="_blank"
         class="get-api-link">{{ $t('setting.modelService.getApiKey') }}</a>
    </div>

    <div class="search-rule search-item">
      <div class="search-rule-header header">
        {{ $t('setting.searchService.generalSettings') }}
      </div>
      <!-- <div class="search-include-date header search-bool-item">
        <div>
          <span>{{ $t('setting.searchService.includeDate') }}</span>
        </div>
        <div>
          <a-switch v-model:checked="selectedConfig.include_date" />
        </div>
      </div>
      <div class="search-include-server header search-bool-item">
        <div>
          <span>{{ $t('setting.searchService.includeServer') }}</span>
        </div>
        <div>
          <a-switch v-model:checked="selectedConfig.cover_provider_search" />
        </div>
      </div> -->
      <!-- <div class="search-enhancement header search-bool-item">
        <div>
          <span>{{ $t('setting.searchService.searchEnhancement') }}</span>
        </div>
        <div>
          <a-switch v-model:checked="selectedConfig.enable_enhanced_mode" />
        </div>
      </div> -->

      <div class="search-number header search-slider-item">
        <span>{{ $t('setting.searchService.searchResultCount') }}</span>
        <div class="slider">
          <a-form-item style="height: 10px;">
            <a-slider v-model:value="selectedConfig.result_count" :min="1" :max="20" :step="1" :marks="{
              1: '1',
              5: $t('setting.searchService.default'),
              20: '20'
            }" @afterChange="handleSave"/>
          </a-form-item>
        </div>
      </div>
    </div>
    <!-- <div class="search-backlist search-item">
      <div class="search-backlist-header header">
        {{ $t('setting.searchService.blacklist') }}
      </div>
      <div>
        <p class="tips">{{ $t('setting.searchService.blacklistTips') }}</p>
      </div>
      <div class="search-blacklist-list">
        <a-textarea v-model:value="selectedConfig.blacklist" :rows="4"
          :placeholder="$t('setting.searchService.blacklistPlaceholder')" style="resize: none;" />
      </div>
    </div> -->
    <!-- <div class="search-blacklist-button" style="display: flex;justify-content: end;">
      <a-button type="primary" class="search-blacklist-save-button" @click="handleSave">
        {{ $t('setting.searchService.save') }}
      </a-button>
    </div> -->
  </div>
</template>

<script setup>
import {ref, onMounted, watch, computed, onUnmounted, nextTick} from 'vue'
import {useI18n} from 'vue-i18n'
import searchEngineService from '@/services/search-engine'
import {message} from 'ant-design-vue'
import emitter from '@/utils/emitter'

import {driver} from "driver.js";
import "driver.js/dist/driver.css";

const {t} = useI18n()

const searchTemplates = ref([])
const loading = ref(true)
const selectedTemplate = ref('')
const selectedConfig = ref({
  provider_id: 1,
  provider_name: 'Tavily',
  base_config: {
    api_key: "",
    endpoint: ""
  },
  include_date: true,
  cover_provider_search: true,
  enable_enhanced_mode: true,
  result_count: 5,
  blacklist: null
})


const checkLoading = ref(false)

let tourDriver = null; // 提升作用域，并初始化为空

const handleCheckApiKey = async () => {
  console.log("checkApiKeydasdsa")
  let config = {}
  //checkSearchProvider
  if (selectedConfig.value.provider_name == "Tavily") {
    config.type = "tavily"
    config.api_key = selectedConfig.value.base_config.api_key;
    if (config.api_key == "") {
      message.error(t('setting.searchService.apiKeyRequired'))
      return
    }
  } else if (selectedConfig.value.provider_name == "Cloudsway"){
    config.type = "cloudsway"
    config.api_key = selectedConfig.value.base_config.api_key;
    config.endpoint = selectedConfig.value.base_config.endpoint;
    if (config.api_key == ""){
      message.error(t('setting.searchService.accessKeyRequired'))
      return
    }else if (config.endpoint == ""){
      message.error(t('setting.searchService.endpointRequired'))
      return
    }
    
  }else {
    config.type = "local"
    config.engine = selectedConfig.value.provider_name;
  }
  console.log(selectedConfig.value)
  checkLoading.value = true
  let res = await searchEngineService.checkSearchProvider(config)
  checkLoading.value = false
  if (res.status != "fail") {
    message.success(selectedConfig.value.provider_name+' '+ t('setting.searchService.checkSearchEngineSuccess'))
    // message.success(res.message)
  } else {
    message.error(selectedConfig.value.provider_name+' '+ t('setting.searchService.checkSearchEngineFailed'))
  }
}

const step1 = async () => {
  tourDriver = driver({
    animate: true,
    showProgress: true,
    prevBtnText: t('setting.prevStep'),
    nextBtnText: t('setting.nextStep'),
    doneBtnText: t('setting.doneStep'),
    steps: [
      {
        element: '#searchTemplates',
        popover: {
          side: 'bottom',
          title: t('setting.searchService.searchService'),
          description: t('setting.searchService.searchEngineTipsOne'),
          onNextClick: async () => {
            nextTick(() => {
              tourDriver.moveNext();
            });
          },
        }
      },
      {
        element: '.search-choose-api-input',
        popover: {
          side: 'bottom',
          title: t('setting.searchService.searchService'),
          description: t('setting.searchService.searchEngineTipsTwo'),
          onNextClick: async () => {
            nextTick(() => {
              // 设置缓存，结束引导
              localStorage.setItem('tour_end', 'true');
              tourDriver.moveNext();
              emitter.emit('onDefaultModelSetting');
            });
          },
        }
      }
    ]
  });

  tourDriver.drive();
};

async function handleTemplateChange(name) {
  //1.find the id of name
  const provider_id = searchTemplates.value.find(item => item.name === name).id
  //2.update the id of user selected
  try {
    await searchEngineService.updateSearchEngineConfig(
        {
          provider_id: provider_id,
          // api_key: selectedConfig.value.base_config.api_key,
          include_date: selectedConfig.value.include_date,
          cover_provider_search: selectedConfig.value.cover_provider_search,
          enable_enhanced_mode: selectedConfig.value.enable_enhanced_mode,
          result_count: selectedConfig.value.result_count,
          blacklist: selectedConfig.value.blacklist
        }
    )
  }catch (e){
    message.error(t('update platform failed'))
    return
  }
  //3.find the config of the id
  const configs = await searchEngineService.getSearchEngineConfigs()
  const config = configs.find(item => item.provider_id === provider_id)
  //4.update status
  selectedConfig.value.base_config = config.base_config || {api_key: '',endpoint: ''}
  selectedConfig.value.provider_id = provider_id || -1
  selectedConfig.value.provider_name = name || ''
}

//  display name function
function displayName(name) {
  if (name === 'Tavily') {
    return t('setting.searchService.tavilyName')
  } else if (name === 'Baidu') {
    return t('setting.searchService.baiduName')
  } else if (name === 'Bing') {
    return t('setting.searchService.bingName')
  } else if (name === 'Cloudsway') {
    return t('setting.searchService.couldswayName')
  }
  return name
}


onMounted(async () => {
  if (localStorage.getItem('tour') === 'true' && localStorage.getItem('tour_end') !== 'true') {
    step1();
  }
  try {
    searchTemplates.value = await searchEngineService.getSearchEngineTemplates()
    loading.value = false

    try {
      const userConfig = await searchEngineService.getSearchEngineConfig()
      // console.log('userConfig', userConfig)
      if (userConfig.provider_name) {
        selectedTemplate.value = userConfig.provider_name
        selectedConfig.value = {
          ...userConfig
        }
        if (userConfig.provider_name === 'Tavily') {
          selectedConfig.value.base_config = {
            api_key: ""
          }
          selectedConfig.value.base_config.api_key = userConfig?.base_config?.api_key || "";
        } else if (userConfig.provider_name === 'Cloudsway') {
          selectedConfig.value.base_config = {
            api_key: "",
            endpoint: ""
          }
          selectedConfig.value.base_config.api_key = userConfig?.base_config?.api_key || "";
          selectedConfig.value.base_config.endpoint = userConfig?.base_config?.endpoint || "";
        } else {
          selectedConfig.value.base_config = {}
        }
      } else {
        selectedTemplate.value = 'Tavily'
      }
    } catch (error) {
      console.error('Failed to fetch user config:', error)
      selectedTemplate.value = 'Tavily'
    }
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    loading.value = false
  }
})


onUnmounted(() => {
  handleSave()
})
// save function
const handleSave = async () => {
  try {
    //判断当前的搜索服务
    console.log("当前保存", selectedConfig.value)
    if (selectedConfig.value.provider_name === "Tavily") {
      await searchEngineService.updateSearchEngineConfig({
        provider_id: selectedConfig.value.provider_id,
        api_key: selectedConfig.value.base_config.api_key,
        include_date: selectedConfig.value.include_date,
        cover_provider_search: selectedConfig.value.cover_provider_search,
        enable_enhanced_mode: selectedConfig.value.enable_enhanced_mode,
        result_count: selectedConfig.value.result_count,
        blacklist: selectedConfig.value.blacklist
      })
    } else if (selectedConfig.value.provider_name === 'Cloudsway') {
      await searchEngineService.updateSearchEngineConfig({
        provider_id: selectedConfig.value.provider_id,
        api_key: selectedConfig.value.base_config.api_key,
        endpoint: selectedConfig.value.base_config.endpoint,
        include_date: selectedConfig.value.include_date,
        cover_provider_search: selectedConfig.value.cover_provider_search,
        enable_enhanced_mode: selectedConfig.value.enable_enhanced_mode,
        result_count: selectedConfig.value.result_count,
        blacklist: selectedConfig.value.blacklist
      })
    } else {
      await searchEngineService.updateSearchEngineConfig({
        provider_id: selectedConfig.value.provider_id,
        include_date: selectedConfig.value.include_date,
        cover_provider_search: selectedConfig.value.cover_provider_search,
        enable_enhanced_mode: selectedConfig.value.enable_enhanced_mode,
        result_count: selectedConfig.value.result_count,
        blacklist: selectedConfig.value.blacklist
      })
    }
    // message.success(t('setting.searchService.saveBlacklistSuccess'))
  } catch (error) {
    console.error('Failed to save config:', error)
    message.error(t('setting.searchService.saveBlacklistFailed'))
  }
}


</script>

<style scoped lang="scss">
.search-container {
  //padding: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slider {
  width: 30%;
}

.search-item {
  padding: 16px;
  background-color: rgb(254, 254, 254);
  width: 100%;
  border: 1px solid #c6c6c6;
  border-radius: 10px;
  font-size: 15px;
}

.search-backlist-subscription-content {
  margin-bottom: 12px;
}

.search-blacklist-list {
  margin-bottom: 12px;
}

.search-rule-header {
  marginзор: 12px;
}

.search-choose {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

:deep(.ant-select-selector) {
  height: 45px !important;
  display: flex;
  align-items: center;
}

:deep(.ant-select-selection-item) {
  display: flex;
  align-items: center;
  height: 100%;
}

:deep(.ant-select-selection-item .select-option-content) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-choose-header {
  margin-bottom: 12px;
}

.search-choose-list {
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;

  #searchTemplates {
    width: 100%;
  }
}

.search-choose-api-config {
  font-size: 15px;
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 10px;
  width: 100%;
}

.get-api-link {
  margin-left: 5px;
  margin-top: 5px;
  font-size: 11px;
  color: #1890ff;
}

.search-choose-api-input {
  height: 100%;
}

p {
  font-size: 14px;
  color: #585858;
}

.search-bool-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  border-bottom: #dfdfdf 1px solid;
  margin-bottom: 12px;
  padding-bottom: 12px;
}

.search-slider-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.search-slider-item p {
  width: 100%;
}

.tips {
  color: #888888;
  font-size: small;
  margin-top: 5px;
}

.search-blacklist-save-button {
  color: rgb(50, 50, 50);
  background-color: #fff;
  border: #d2cece 1px solid;
}

.search-backlist-subscription-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.centered-modal {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.centered-modal .ant-modal) {
  top: 0;
  padding-bottom: 0;
  margin: 0;
}

@media screen and (max-width: 768px) {
  .search-choose-list {
    flex-direction: column;
  }

  .search-choose-list div:first-child {
    width: 100% !important;
  }

  .search-choose-list div:last-child {
    width: 100% !important;
  }

  .search-choose-api-config {
    flex-direction: column;
    align-items: flex-start !important;
  }

  :deep(.ant-select-selector) {
    height: 100% !important;
  }

  .search-number {
    flex-direction: column;
    align-items: flex-start !important;
  }

  .slider {
    width: 100% !important;
  }

  .search-backlist-subscription-delete-container {
    flex-direction: column;

    button {
      margin-bottom: 12px;
    }
  }
}

.select-option-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  width: 18px;
  height: 18px;
}
</style>