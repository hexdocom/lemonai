<template>
    <a-modal :centered="true"
             width="auto"
             :footer="null" 
             class="sub" 
             v-model:visible="visible" 
             wrapClassName="father" 
             :maskClosable="false">
        <div class="container">
            <div>
                <div class="sub-header">
                    <span class="title">{{ $t('lemon.sub.modeSelection') }}</span>
                </div>
            </div>
            <div class="sub-body">
                <!-- SaaS Plan (unchanged) -->
                <div class="saas item">
                    <div class="header">
                        <span class="type">{{ $t('lemon.sub.saasType') }}</span>
                    </div>
                    <div class="body">
                        <a-button type="primary" class="btn" @click="handleWeb">{{ $t('lemon.sub.goToView') }}</a-button>
                        <div class="detail-list">
                            <div class="detail-item">
                                <rightSvg class="icon" /><span>{{ $t('lemon.sub.cloudServiceReady') }}</span>
                            </div>
                            <div class="detail-item">
                                <rightSvg class="icon" /><span>{{ $t('lemon.sub.cloudSandbox') }}</span>
                            </div>
                            <div class="detail-item">
                                <rightSvg class="icon" /><span>{{ $t('lemon.sub.cloudModel') }}</span>
                            </div>
                            <div class="detail-item">
                                <rightSvg class="icon" /><span>{{ $t('lemon.sub.cloudSearch') }}</span>
                            </div>
                            <div class="detail-item">
                                <giftSvg class="icon" /><span>{{ $t('lemon.sub.supportSelfModel') }}</span>
                            </div>
                            <div class="detail-item opcation">
                                <div class="icon placeholder"></div>
                                <span>{{ $t('lemon.sub.supportModelSeries') }}</span>
                            </div>
                            <div class="detail-item">
                                <giftSvg class="icon" /><span>{{ $t('lemon.sub.supportSelfSearch') }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="bt"></div>
                </div>
                <!-- Lemon Server Plan (revised) -->
                <div class="half-sub item">
                    <div class="header">
                        <span class="type">{{ $t('lemon.sub.localDockerType') }}</span>
                    </div>
                    <div class="body">
                        <a-button type="primary" class="btn" @click="handleLocalDockerType">{{ $t('lemon.sub.select') }}</a-button>
                        <div class="detail-list">
                            <div class="detail-item">
                                <rightSvg class="icon" /><span>{{ $t('lemon.sub.cloudModel') }}</span>
                            </div>
                            <div class="detail-item">
                                <rightSvg class="icon" /><span>{{ $t('lemon.sub.cloudSearch') }}</span>
                            </div>
                            <div class="detail-item">
                                <giftSvg class="icon" /><span>{{ $t('lemon.sub.supportSelfModel') }}</span>
                            </div>
                            <div class="detail-item">
                                <div class="icon placeholder"></div>
                                <span class="opcation">{{ $t('lemon.sub.supportModelSeries') }}</span>
                            </div>
                            <div class="detail-item">
                                <giftSvg class="icon" /><span>{{ $t('lemon.sub.supportSelfSearch') }}</span>
                            </div>
                            <div class="detail-item">
                                <dockerSvg class="icon" /><span class="text">{{ $t('lemon.sub.requireLocalSandbox') }} </span>
                            </div>
                        </div>
                    </div>
                    <div class="bt"></div>
                </div>
                <!-- Free Plan (revised) -->
                <div class="free item">
                    <div class="header">
                        <span class="type">{{ $t('lemon.sub.localDockerConfigType') }}</span>
                    </div>
                    <div class="body">
                        <a-button type="primary" class="btn" @click="handleFree">{{ $t('lemon.sub.select') }}</a-button>
                        <div class="detail-list">
                            <div class="detail-item">
                                <closeSvg class="icon" /><span>{{ $t('lemon.sub.requireModelConfig') }}</span>
                            </div>
                            <div class="detail-item ">
                                <div class="icon placeholder"></div>
                                <span class="opcation">{{ $t('lemon.sub.supportModelSeries') }}</span>
                            </div>
                            <div class="detail-item">
                                <closeSvg class="icon" /><span>{{ $t('lemon.sub.requireSearchConfig') }}</span>
                            </div>
                            <div class="detail-item">
                                <dockerSvg class="icon" /> <span >{{ $t('lemon.sub.requireLocalSandbox') }} </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </a-modal>
</template>

<script setup>

// SVG
import rightSvg from '@/assets/svg/right.svg'
import dockerSvg from '@/assets/svg/docker.svg'
import closeSvg from '@/assets/svg/close.svg'
import giftSvg from '@/assets/svg/gift.svg'
//
import { onMounted, ref} from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router';
import emitter from '@/utils/emitter.js'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user.js'
// store
const userStore = useUserStore();
const { user,membership,points } = storeToRefs(userStore);
//server
import modelService from '@/services/default-model-setting'
import searchEngineService from '@/services/search-engine'

async function initAndSetLemonModelAndSearchEngine() {
  try {
    // 1. get models list
    const models = await modelService.getModels();
    if (!models || models.length === 0) {
      console.error('No models found.');
      return false;
    }

    // 2. Find the model with provider name Lemon
    const lemonModel = models.find(model => model.platform_name === 'Lemon');
    if (!lemonModel) {
        console.error('No Lemon model found.');
      return false;
    }

    // 3. Set Lemon model as default model
    const modelId = lemonModel.id;
    await Promise.all([
      modelService.updateModel({
        model_id: modelId,
        setting_type: 'assistant',
        config: {},
      }),
      modelService.updateModel({
        model_id: modelId,
        setting_type: 'topic-naming',
        config: {},
      }),
    ]);
    emitter.emit('change-model',lemonModel)
    // 4.get search engine templates
    const searchTemplates = await searchEngineService.getSearchEngineTemplates();
    const lemonTemplate = searchTemplates.find(item => item.name === 'Lemon');
    if (!lemonTemplate) {
        console.error('Lemon search engine template not found');
      return;
    }
    // 5. updagte lemon as default search engine config 
    const providerId = lemonTemplate.id;
    await searchEngineService.updateSearchEngineConfig({
      provider_id: providerId,
      include_date: true,
      cover_provider_search: true,
      enable_enhanced_mode: true,
      result_count: 5,
      blacklist: null,
    });
    return true;
  } catch (error) {
    console.error('error:', error);
    return false;
  }
}

const router = useRouter();




const visible = ref(false)

const { t } = useI18n()

// Open Saas
const handleWeb = () => {
    console.log('process.env.VITE_LEMON_SAAS_URL',import.meta.env.VITE_LEMON_SAAS_URL)
    if(import.meta.env.VITE_LEMON_SAAS_URL){
        window.open(import.meta.env.VITE_LEMON_SAAS_URL)
    }else{
        window.open("https://lemon-saas-test.lemonai.ai/auth")
    }
}

// Open Free 
const handleFree = () => {
    //Docker check
    visible.value = false
    localStorage.setItem('lemon-type','config')
    emitter.emit('check-visiable')
    emitter.emit('change-model')
}

const handleLocalDockerType = async() =>{
    // check login status
    if  (!user.value.id) {
        message.info(t('lemon.sub.notLoggedIn'))
        //  wait 1 seconds
        setTimeout(() => {
            router.push('/auth')
        }, 1000);
        return
    }
    // check user is membership
    let is_membership = false;
    if (membership.value && membership.value?.startDate && membership.value?.endDate) {
        const start = new Date(membership.value?.startDate);
        const end = new Date(membership.value?.endDate);
        const now = new Date();
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          if (now >= start && now <= end) {
            is_membership = true;
          }
        }
    }
    //
    if (!is_membership) {
      // push to sub page
      message.info(t('lemon.sub.notSubscribed'))
      setTimeout(() => {
            router.push({ path: '/pricing' })
        }, 1000);
        return
    }
    // wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Set Lemon Model And Lemon Search Provider
    const result = await initAndSetLemonModelAndSearchEngine()
    if (!result) {
      message.error(t('lemon.sub.enableCloudFailed'))
      return
    }
    message.success(t('lemon.sub.enableCloudSuccess'))
    // Run Check Docker
    await new Promise(resolve => setTimeout(resolve, 2000))
    visible.value = false
    emitter.emit('docker-check',true)
    localStorage.setItem('lemon-type','lemon')   
}


onMounted(()=>{
    let lemonType = localStorage.getItem('lemon-type')  
    console.log('lemonType',lemonType)
    if(lemonType === undefined){
        visible.value = true
    }

    emitter.on('show-type',()=>{
        visible.value = true
    })
})


</script>

<style scoped>
.sub{
    width: unset!important;
}
.father{
    display: flex;
    width: 100%;
    height: 100%;
}
.container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* margin: 0 auto; */
    background-color: rgb(255, 255, 255);
    border-radius: 4px;
    padding: 30px;
    border:  1px solid rgb(227, 227, 227);
    /* max-width: 60%; */

}

.sub-header {
    display: flex;
    justify-content: center;
    font-size: 24px;
}

.sub-body {
    display: flex;
    /* justify-content: space-between; */
    justify-content: center;
    flex: 8;
    gap: 10px;
}

.item {
    background-color: rgb(249, 251, 252);
    display: flex;
    flex-direction: column;
    flex: 1;
    border-radius: 10px;
    padding: 10px 20px;
    border: 1px solid rgba(0, 0, 0, 0.5);
    max-width: 300px;
}

.body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 0;
    flex: 1;
}

.body ul {
    font-size: 1.1rem;
    line-height: 1.5;
    list-style-type: disc;
    padding-left: 20px;
}

.price {
    font-size: 2rem;
    font-weight: bold;
}

.preice-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    justify-content: start;
}

.old-price {
    text-decoration: line-through;
    opacity: 0.5;
}

.unit {
    font-size: 1rem;
    opacity: 0.6;
    font-weight: bold;
}

.btn {
    display: flex;
    justify-content: center;
    font-size: 16px;
    border-radius: 10px;
    background-color: rgb(0, 0, 0, 0.8);
    color: white;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
}

.btn:hover {
    background-color: rgb(0, 0, 0, 1);
}

.detail-list {
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    margin-top: 10px;
    gap: 10px;
}

.detail-item {
    display: flex;
    flex-direction: row;
    gap: 8px;
}
.text {
  word-break: break-word; /* 长单词或 URL 自动换行 */
}

.icon {
    width: 20px;
    height: 20px;
    flex-shrink:0px;
    margin-top: 2px;
}
.detail-item .text,
.detail-item span {
  word-break: break-word;
}
.opcation {
    opacity: 0.7;
}
.type{
    font-size: 18px;
}

.icon.placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
  width: 24px;
  height: 24px;
  /* 可根据实际情况调整宽高 */
}

</style>
<style lang="scss">
.sub {
    .ant-modal-content {
        background-color: unset !important;
        box-shadow: unset !important;
        padding: 10px !important;
    }
}
</style>