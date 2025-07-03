<template>
  <a-modal v-model:visible="visible" width="auto" centered="true" :footer="null" closable="false"
    class="docker-checker-modal" maskClosable="false" keyboard="false">
    <div class="modal-content">

      <div class="status-sidebar">
        <h2 class="sidebar-title">{{ $t('lemon.check.docker.sandboxService') }}</h2>
        <a-steps v-model:current="currentStep" direction="vertical" class="status-steps" @change="handleStepChange">
          <!-- stauts 1：install -->
          <a-step :status="getStepStatus('installed')">
            <template #title>
              <div class="status-header">
                <span>{{ $t('lemon.check.docker.dockerInstallation') }}</span>
              </div>
            </template>
            <template #description>
              <div class="sub-steps">
                <div v-for="sub in subStatuses['installed']" :key="sub.key" class="sub-step-item">
                  <LoadingOutlined v-if="sub.status === 'pending'" size="small" style="margin-left: 8px;" />
                  <check-circle-outlined v-else-if="sub.status === 'success'"
                    style="color: green; margin-right: 8px;" />
                  <exclamation-circle-outlined v-else-if="sub.status === 'error'"
                    style="color: red; margin-right: 8px;" />
                  <span>{{ $t(`lemon.check.docker.${sub.name}`) }}</span>
                </div>
              </div>
            </template>
          </a-step>
          <!-- status 2：launching -->
          <a-step :status="getStepStatus('started')">
            <template #title>
              <div class="status-header">
                <span>{{ $t('lemon.check.docker.dockerStartup') }}</span>
              </div>
            </template>
            <template #description>
              <div class="sub-steps">
                <div v-for="sub in subStatuses['started']" :key="sub.key" class="sub-step-item">
                  <LoadingOutlined v-if="sub.status === 'pending'" size="small" style="margin-left: 8px;" />
                  <check-circle-outlined v-else-if="sub.status === 'success'"
                    style="color: green; margin-right: 8px;" />
                  <exclamation-circle-outlined v-else-if="sub.status === 'error'"
                    style="color: red; margin-right: 8px;" />
                  <span>{{ $t(`lemon.check.docker.${sub.name}`) }}</span>
                </div>
              </div>
            </template>
          </a-step>
          <!-- status 3：img -->
          <a-step :status="getStepStatus('image-container')">
            <template #title>
              <div class="status-header">
                <span>{{ $t('lemon.check.docker.sandboxImage') }}</span>
              </div>
            </template>
            <template #description>
              <div class="sub-steps">
                <div v-for="sub in subStatuses['image-container']" :key="sub.key" class="sub-step-item">
                  <LoadingOutlined v-if="sub.status === 'pending'" size="small" style="margin-left: 8px;" />
                  <check-circle-outlined v-else-if="sub.status === 'success'"
                    style="color: green; margin-right: 8px;" />
                  <exclamation-circle-outlined v-else-if="sub.status === 'error'"
                    style="color: red; margin-right: 8px;" />
                  <span>{{ $t(`lemon.check.docker.${sub.name}`) }}</span>
                </div>
              </div>
            </template>
          </a-step>
        </a-steps>
      </div>


      <div class="main-content">
        <div class="content-wrapper">
          <h2>{{ $t('lemon.check.docker.currentStatus') }}</h2>
          <a-card class="steps-card">
            <div>
              <h3>{{ $t(title) }}</h3>
              <div class="more">
                <div class="install" v-if="showInstallTip">
                  <div class="tip">
                    <h2>{{ $t('lemon.check.docker.option1') }}<span style="opacity: 0.6;font-size: 14px;">{{
                      $t('lemon.check.docker.recommended') }}</span></h2>
                    <div>
                      <a href="https://www.lemonai.cc/#download" target="_blank">
                        <span style="font-size: 16px;">{{
                          $t('lemon.check.docker.lemonOfflineDownload')
                        }}</span> www.lemonai.cc
                      </a>
                    </div>
                  </div>
                  <div class="tip">
                    <h2>{{ $t('lemon.check.docker.option2') }}</h2>
                    <div>
                      <a href="https://www.docker.com/" target="_blank">
                        <span style="font-size: 14px;">{{
                          $t('lemon.check.docker.dockerOfficialWebsite')
                        }}</span> www.docker.com
                      </a>
                    </div>
                  </div>
                </div>
                <div class="running" v-else-if="showStartTip">
                  <div class="tip">
                    <h2>{{ $t('lemon.check.docker.tryingToStartDocker') }}</h2>
                    <div>
                      <span>{{ $t('lemon.check.docker.dockerIsStarting') }}</span>
                    </div>
                  </div>
                </div>
                <div class="image" v-else-if="showImgTip">
                  <div>
                    <p>{{ $t('lemon.check.docker.imageNotDetected') }}</p>
                  </div>
                  <div class="tip">
                    <span style="font-size: large;font-weight: bold;">{{
                      $t('lemon.check.docker.option1')
                    }}<span style="opacity: 0.6;font-size: 14px;">{{
                        $t('lemon.check.docker.recommended')
                      }}</span></span>
                    <div>
                      <a href="https://www.lemonai.cc/#download" target="_blank">
                        <span style="font-size: 14px;">{{
                          $t('lemon.check.docker.getLemonRuntimeSandboxImage') }}</span>
                      </a>
                    </div>
                  </div>
                  <div class="tip">
                    <span style="font-size: large;font-weight: bold;">{{
                      $t('lemon.check.docker.option2')
                    }}</span>
                    <div style="display:flex;gap: 10px; align-content: start;flex-direction: column;">
                      <span style="font-size: 14px">
                        {{ $t('lemon.check.docker.runCommand') }}
                      </span>
                      <span class="copyable"
                        @click="copyToClipboard('docker pull hexdolemonai/lemon-runtime-sandbox:latest')"
                        title="Click to copy">
                        docker pull hexdolemonai/lemon-runtime-sandbox:latest
                      </span>
                      <span style="font-size: 14px">
                        {{ $t('lemon.check.docker.toGetSandboxImage') }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="finish" v-else-if="isComplete">
                  <div class="title">
                    <div class="icon">
                      <span>{{ $t('lemon.check.docker.dockerIsRunning') }}</span>
                    </div>
                  </div>
                </div>
                <div class="" v-else>
                  <span>{{ detail }}</span>
                </div>
                <div>
                  
                  <a href="https://lemon-11.gitbook.io/lemonai/development-deployment-guidelines/docker-quick-deployment"
                    target="_blank">
                    <span style="font-size: 14px;margin-left: 10px;">{{
                      $t('lemon.check.docker.getLemonDockerDoc') }}</span>
                  </a>
                </div>
              </div>


            </div>

          </a-card>

        </div>

        <div class="action-button">
          <!-- <a-popconfirm :title="$t('lemon.check.docker.skipSandboxCheckConfirm')" ok-text="yes" cancel-text="no" @confirm="handleSkipAction"
                        @cancel="">
                        <a-button v-show="canContinue" type="primary" :loading="isLoading"
                            @click="openConfirmSkipModal = true" class="skip-button">
                            {{ $t('lemon.check.docker.skip') }}
                        </a-button>
                    </a-popconfirm> -->
          <a-button type="primary" :loading="isLoading" @click="handleAction" :disabled="!canContinue && !isComplete">
            {{ isComplete ? $t('lemon.check.docker.continue') : $t('lemon.check.docker.continue') }}
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue'

//docker util
import { checkSystem, checkDockerInstall, checkDockerRunning, checkDockerEnvironmentReady, attemptStartDocker } from '@/utils/docker'
import emitter from '@/utils/emitter'

const { t } = useI18n()

// modal status
const visible = ref(false)
const showInstallTip = ref(false)
const showStartTip = ref(false)
const showImgTip = ref(false)
// main status
const mainStatuses = ref({
  'installed': 'pending', // 'pending', 'success', 'error'
  'started': 'pending',
  'image-container': 'pending'
})

// sub status 国际化
const subStatuses = ref({
  'installed': [
    { key: 'sub1', name: 'DockerSystem', status: 'pending' }, // 'pending', 'success', 'loading'
    { key: 'sub2', name: 'dockerStartup', status: 'pending' }, // 'pending', 'success', 'loading'
  ],
  'started': [
    { key: 'sub1', name: 'dockerRunning', status: 'pending' }
  ],
  'image-container': [
    { key: 'sub1', name: 'checkingImage', status: 'pending' },
  ]
})

function resetStatuses() {
  mainStatuses.value = {
    'installed': 'pending',
    'started': 'pending',
    'image-container': 'pending'
  }
  subStatuses.value = {
    'installed': [
      { key: 'sub1', name: 'DockerSystem', status: 'pending' },
      { key: 'sub2', name: 'dockerInstallation', status: 'pending' },
    ],
    'started': [
      { key: 'sub1', name: 'dockerRunning', status: 'pending' }
    ],
    'image-container': [
      { key: 'sub1', name: 'checkingImage', status: 'pending' },
    ]
  }
}

// currentStep
const currentStep = ref(0)
// mainKey status list
const statusKeys = ['installed', 'started', 'image-container']
// current status
const currentStatus = computed(() => statusKeys[currentStep.value])
const title = ref('lemon.check.docker.checkingSystemPlatform')
const detail = ref(t('common.wait'))
// computer status
const getStepStatus = (key) => {
  const status = mainStatuses.value[key]
  if (status === 'success') return 'finish'
  if (status === 'error') return 'error'
  if (status === 'pending') return 'wait'
  return 'wait'
}
// process step change
const handleStepChange = (step) => {
  currentStep.value = step
}
// process action
const handleAction = () => {
  if (!isComplete.value) {
    isLoading.value = true
    canContinue.value = false
    setTimeout(() => {
      isLoading.value = false
      detail.value = t('common.wait')
    }, 1000)

    resetShowTip()
  } else {
    resetShowTip
    visible.value = false
  }
}
// button status
const isLoading = ref(false)
const isComplete = ref(false)
const canContinue = ref(false)
const skip = ref(false)
const checkDockerStatus = async () => {
  localStorage.setItem('docker-installed', false)
  localStorage.setItem('docker-launch', false)
  localStorage.setItem('docker-image', false)
  // Installation
  // sys
  title.value = 'lemon.check.docker.checkingSystemPlatform'
  await doWhileUntilTure(checkSystem, dockerCheckErrorInfo, 'checkSystem')
  subStatuses.value.installed[0].status = 'success'
  // install 
  title.value = 'lemon.check.docker.checkingDockerInstallation'
  await doWhileUntilTure(checkDockerInstall, dockerCheckErrorInfo, 'checkDockerInstall')
  subStatuses.value.installed[1].status = 'success'
  mainStatuses.value.installed = 'success'
  localStorage.setItem('docker-installed', true)
  // Docker Setup
  title.value = 'lemon.check.docker.checkingDockerStartup'
  await doWhileUntilTure(checkDockerRunning, dockerCheckErrorInfo, 'checkDockerRunning')
  subStatuses.value.started[0].status = 'success'
  mainStatuses.value.started = 'success'
  localStorage.setItem('docker-launch', true)
  title.value = 'lemon.check.docker.checkingLemonImage'
  await doWhileUntilTure(checkDockerEnvironmentReady, dockerCheckErrorInfo, 'checkDockerEnvironmentReady')
  subStatuses.value['image-container'][0].status = 'success'
  mainStatuses.value['image-container'] = 'success'
  title.value = 'lemon.check.docker.sandboxCheckSucceeded'
  localStorage.setItem('docker-image', true)
  isComplete.value = true
  // docker-check-over
  emitter.emit('docker-check-over')
}
// Process error
async function dockerCheckErrorInfo(key, result) {
  function formatReturn(title, info) {
    return {
      'title': title,
      'info': info,
    }
  }
  switch (key) {
    case 'checkSystem':
      subStatuses.value.installed[0].status = 'error'
      mainStatuses.value.installed = 'error'
      return formatReturn('lemon.check.docker.platformNotSupported', result.meta.error)
    case 'checkDockerInstall':
      showInstallTip.value = true
      mainStatuses.value.installed = 'error'
      subStatuses.value.installed[1].status = 'error'
      return formatReturn('lemon.check.docker.dockerNotDetected', result.meta.error)
    case 'checkDockerRunning':
      subStatuses.value.started[0].status = 'error'
      mainStatuses.value.started = 'error'
      title.value = 'lemon.check.docker.dockerNotRunning'
      detail.value = 'lemon.check.docker.pleaseWait'
      await lanuchDocker()
      return formatReturn('lemon.check.docker.dockerStartedSuccessfully', '')
    case 'checkDockerEnvironmentReady':
      subStatuses.value['image-container'][0].status = 'error'
      mainStatuses.value['image-container'] = 'error'
      showImgTip.value = true
      return formatReturn('lemon.check.docker.dockerImageNotReady', result.meta.error)
  }
}

async function doWhileUntilTure(fn, errorHandler, name) {
  let result = await fn()
  while (!result.status) {
    canContinue.value = true
    resetShowTip()
    const info = await errorHandler(name, result)
    title.value = info.title
    detail.value = info.detail
    while (canContinue.value && !skip.value) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    result = await fn()
    if (result.status) {
      canContinue.value = false
      return result
    }
  }
  await new Promise(resolve => setTimeout(resolve, 300));
  return result
}

function resetShowTip() {
  showStartTip.value = false
  showInstallTip.value = false
  showImgTip.value = false
}

async function lanuchDocker() {
  showStartTip.value = true
  await attemptStartDocker()
  let result = await checkDockerRunning()
  while (!result.status && !skip.value) {
    result = await checkDockerRunning()
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  canContinue.value = false
  resetShowTip()
}
function copyToClipboard(text) {
  //TODO copy to clipboard
}

onMounted(async () => {
  emitter.on('docker-check', async () => {
    if (window.electronAPI) {
      visible.value = true
      setTimeout(() => { }, 500)
      resetStatuses()
      await checkDockerStatus()
    }

  })
})
onUnmounted(async () => {
  emitter.off('docker-check')

})

</script>

<style lang="less" scoped>
.docker-checker-modal {
  border: #595959 1px solid;
  overflow: hidden;
  z-index: 9998;

  .ant-modal-body {
    padding: 0;
  }


  .modal-content {
    display: flex;
    // border: #dcdcdc 1px solid;
    background-color: #fff;
    overflow: hidden;

    .status-sidebar {
      background-color: #fff;
      border-right: 1px solid #e8e8e8;
      padding: 20px 40px;
      overflow-y: auto;
      min-width: 240px;

      .sidebar-title {
        font-size: 20px;
        margin-bottom: 20px;
        font-weight: 600;
      }

      .status-steps {
        .status-header {
          display: flex;
          align-items: center;
        }

        .sub-steps {
          // margin-top: 8px;

          .sub-step-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 14px;
            color: #595959;

            .anticon {
              font-size: 16px;
            }
          }
        }
      }
    }

    .main-content {
      flex: 8;
      padding: 20px;
      position: relative;
      // overflow-y: auto;
      background-color: #fff;
      // border-radius: 20px;
      width: 600px;
      min-height: 540px;

      .content-wrapper {
        max-width: 700px;
        margin: 0 auto;

        .steps-card {
          min-height: 400px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

          h3 {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 16px;
          }

          p {
            color: #595959;
            line-height: 1.6;
          }
        }
      }

      .action-button {
        display: flex;
        justify-content: right;
        padding: 10px 0px;
        gap: 10px;

        .ant-btn {
          width: 90px;
          height: 40px;
          font-size: 16px;
          border-radius: 10px;
          box-shadow: unset !important;
        }
      }
    }
  }
}

.tip {
  padding: 10px;
  gap: 4px;
  display: flex;
  flex-direction: column;
}

.copyable {
  cursor: pointer;
  padding: 10px;
  border-radius: 10px;
  background-color: #e5e5e5;
}

.copyable:hover {
  // background-color: #f0f0f0;
  text-decoration: underline;
}

.skip-button {
  background-color: #868686;

}

.skip-button:hover {
  background-color: #595959;
}
</style>
<style>
.docker-checker-modal .ant-modal-content {
  overflow: auto;
  padding: 0px !important;
  /* width: unset !important; */
}
</style>