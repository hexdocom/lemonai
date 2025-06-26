<template>
    <a-modal v-model:visible="visible" :centered="true" width="auto" :footer="null" closable="false" :keyboard="false"
        maskClosable="false" class="check">
        <div class="main">
            <!-- Status check: Docker -> Model -> Search -->
            <div class="title">
                <a-steps :status="status_dict[step].status" :current="step" :items="status_dict" />
            </div>
            <!-- Display specific components -->
            <div class="body">
                <docker v-show="step == 0" />
                <div v-show="step == 1" class="scroll">
                    <model class="model" />
                    <div class="lanuch-model">
                        <a-button @click="handleNextAction">{{ $t('lemon.check.next') }}</a-button>
                    </div>
                </div>
                <div v-show="step == 2" class="step-two">
                    <search />
                    <div class="skip">
                        <a-button class="skip-button" @click="handleSuccess">
                            {{ $t('lemon.check.complete') }}
                        </a-button>
                    </div>
                </div>
            </div>
        </div>
    </a-modal>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import docker from './docker.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import model from '@/view/setting/model.vue'
import search from '@/view/setting/search.vue'
import emitter from '@/utils/emitter'
import { message } from 'ant-design-vue'
import modelService from '@/services/default-model-setting'

const { t } = useI18n()

const visible = ref(false)
const step = ref(0)
const status_dict = ref([
    {
        title: t('lemon.check.sandboxStep'),
        status: 'wait' // wait finish error
    },
    {
        title: t('lemon.check.modelStep'),
        status: 'wait'
    },
    {
        title: t('lemon.check.searchStep'),
        status: 'wait'
    }
])

function dockerStep() {
    status_dict.value[0].status = 'finish'
    step.value = 1
}

function modelStep() {
    status_dict.value[1].status = 'finish'
    step.value = 2
}

async function searchStep() {
    status_dict.value[2].status = 'finish'
    visible.value = false
    message.success(t('lemon.check.configCompleted'))
}

async function handleNextAction() {
    const res = await modelService.checkModel()
    if (!res.has_enabled_platform) {
        message.warn(t('lemon.check.enableModelPlatformFirst'))
        return
    }
    emitter.emit('model-welcome')
}

async function handleSuccess() {
    const res = await modelService.checkModel()
    if (!res.has_search_setting) {
        message.warn(t('lemon.check.configureSearchEngineFirst'))
        return
    }
    message.success(t('lemon.check.configSucceeded'))
    visible.value = false
}

onMounted(() => {
    emitter.on('docker-welcome', async () => {
        dockerStep()
        emitter.emit('model-start', true)
    })
    emitter.on('model-welcome', async () => {
        modelStep()
        emitter.emit('search-start', true)
    })
    emitter.on('search-welcome', async () => {
        searchStep()
    })
    emitter.on('check-visiable', async () => {
        visible.value = true
    })
})

onUnmounted(() => {
    emitter.off('docker-welcome')
    emitter.off('model-welcome')
    emitter.off('search-welcome')
    emitter.off('check-visiable')
})
</script>

<style scoped>
.lanuch-model {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px;
}
.check {
    width: 100%;
    height: 100%;
}

.main {
    display: flex;
    flex-direction: column;
    width: 980px;
    max-height: 980px;
    background-color: #fff;
    padding-top: 20px;
    padding-left: 20px;
    padding-right: 20px;
    overflow: hidden;
}

.title {
    height: 40px;
    flex-shrink: 0;
}

.body {
    height: 100%;
    width: 100%;
    flex: 1;
    margin: 10px;
    overflow: hidden;
}

.scroll {
    display: flex;
    height: 100%;
    width: 100%;
    overflow-y: auto;
    flex-direction: column;
}

.step-two {
    display: flex;
    flex-direction: column;
}

.skip {
    display: flex;
    justify-content: center;
}
</style>

<style>
.father .ant-modal-content {
    width: auto;
}
</style>