<template>
  <div class="setting-container">
    <!-- Top Navigation Bar -->
    <div class="top-bar">
      <a-button type="text" @click="back">
        <template #icon>
          <arrow-left-outlined />
        </template>
        {{ $t('setting.back') }}
      </a-button>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Menu Sidebar -->
      <div>
        <setting-menu />
      </div>
      
      <!-- Right Content Area -->
      <div class="content-side">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, nextTick } from 'vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import SettingMenu from './MenuSide.vue'

import emitter from '@/utils/emitter';

import { useI18n } from 'vue-i18n';
const { t } = useI18n();

import { useRouter } from 'vue-router'
const router = useRouter()



// import { driver } from "driver.js";
// import "driver.js/dist/driver.css";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

//search-service
//default-model-setting
//model-service
let tourDriver = null; // 提升作用域，并初始化为空

// const step1 = async () => {
//   tourDriver = driver({
//     animate: true,
//     showProgress: true,
//     prevBtnText: t('setting.prevStep'),
//     nextBtnText: t('setting.nextStep'),
//     doneBtnText: t('setting.doneStep'),
//     steps: [
//       {
//         element: '#model-service',
//         popover: {
//           side: 'bottom',
//           title: t('setting.modelService.modelService'),
//           description: t('setting.modelService.modelServiceTipsOne'),
//           onNextClick: async () => {
//             nextTick(() => { 
//               // 设置缓存，结束引导
//               localStorage.setItem('tour_end', 'true');
//               tourDriver.moveNext();
//             });
//           },
//         }
//       }
//     ]
//   });

//   tourDriver.drive();
// };


// const step2 = async () => {
//   tourDriver = driver({
//     animate: true,
//     showProgress: true,
//     prevBtnText: t('setting.prevStep'),
//     nextBtnText: t('setting.nextStep'),
//     doneBtnText: t('setting.doneStep'),
//     steps: [
//       {
//         element: '#search-service',
//         popover: {
//           side: 'bottom',
//           title: t('setting.searchService.searchService'),
//           description: t('setting.searchService.searchServiceTipsOne'),
//           onNextClick: async () => {
//             nextTick(() => { 
//               // 设置缓存，结束引导
//               localStorage.setItem('tour_end', 'true');
//               tourDriver.moveNext();
//             });
//           },
//         }
//       }
//     ]
//   });

//   tourDriver.drive();
// };

// const step3 = async () => {
//   tourDriver = driver({
//     animate: true,
//     showProgress: true,
//     prevBtnText: t('setting.prevStep'),
//     nextBtnText: t('setting.nextStep'),
//     doneBtnText: t('setting.doneStep'),
//     steps: [
//       {
//         element: '#default-model-setting',
//         popover: {
//           side: 'bottom',
//           title: t('setting.defaultModel.defaultModel'),
//           description: t('setting.defaultModel.defaultModelTipsOne'),
//           onNextClick: async () => {
//             nextTick(() => { 
//               // 设置缓存，结束引导
//               localStorage.setItem('tour_end', 'true');
//               tourDriver.moveNext();
//             });
//           },
//         }
//       }
//     ]
//   });

//   tourDriver.drive();
// };

emitter.on('onSearchService', () => { 
  step2();
});

//default-model-setting
emitter.on('onDefaultModelSetting', () => {
  step3();
});

// 全局事件监听器：关闭引导
emitter.on('closeTour', () => {
  if (tourDriver) {
    tourDriver.moveNext();
  }
  tourDriver = null; // 可选：重置为 null 避免重复调用
});


onMounted(() => {
  nextTick(() => {
    // if (localStorage.getItem('tour') === 'true' && localStorage.getItem('tour_end') !== 'true') {
    //   step1();
    // }
  });
});



const back = () => {
  router.push('/')
}

</script>

<style scoped lang="scss">
.setting-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.top-bar {
  height: 60px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
}
.content-side {
  flex: 1;
  overflow-y: auto;
}


@media screen and (max-width: 768px) {
  .content-side{
    padding: 16px!important;
  }
  //隐藏滚动条
  .content-side::-webkit-scrollbar{
    display: none;
  }
  .top-bar{
    padding: 0!important;
  }
  .main-content {
    display: flex;
    flex-direction: column!important;

    div{
      overflow: auto;
    }
  } 
}
</style>