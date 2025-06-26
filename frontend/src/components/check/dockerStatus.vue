<template>
    <a-tooltip>
        <template #title>
            <div>
                <div v-if="!dockerExist" class="tips">
                    <warningSvg style="width: 22px;height: 22px;fill: white;" />
                    <span>
                        {{ $t('lemon.check.docker.dockerNotInstalled') }}
                    </span>
                </div>
                <div v-else-if="!dockerRunning" class="tips">
                    <warningSvg style="width: 22px;height: 22px;fill: white;" />
                    <span>
                        {{ $t('lemon.check.docker.dockerNotRunningStatus') }}
                    </span>
                </div>
                <div v-else-if="!dockerImgExist" class="tips">
                    <span>
                        {{ $t('lemon.check.docker.sandboxImageNotExist') }}
                    </span>
                </div>
                <div v-else>
                    {{ $t('lemon.check.docker.dockerIsRunningStatus') }}
                </div>
            </div>
        </template>
        <div class="dockdr-status" @click="handleDockerCheck">
            <dockerSvg class="icon-size"
                :class="dockerRunning && dockerExist ? 'icon-docker-on' : 'icon-docker-stop'" />
            <div class="img-status">
                <div class="icon-size-small"
                    :class="dockerImgExist && dockerRunning ? 'icon-img-on' : 'icon-img-stop'" />
            </div>
        </div>
    </a-tooltip>
    <dockerModel />
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import dockerSvg from '@/assets/svg/docker.svg'
import warningSvg from '@/assets/svg/warning.svg'

import { onMounted, onUnmounted, ref, computed } from 'vue'
import DockerModel from '@/components/check/dockerModal.vue'
import {
    checkDockerInstall,
    checkDockerRunning,
    checkDockerEnvironmentReady,
} from '@/utils/docker'
import emitter from '@/utils/emitter'

const { t } = useI18n()

const dockerExist = ref(false);
const dockerRunning = ref(false);
const dockerImgExist = ref(false);

onMounted(async () => {
    if (window.electronAPI) {
        updateDockerStatus()
        if (dockerExist.value && dockerRunning.value && dockerImgExist.value) {
            return
        }
        checkWhile()
    }
});

async function checkWhile() {
    let var1 = localStorage.getItem('docker-installed')
    let vae2 = localStorage.getItem('docker-launch')
    let var3 = localStorage.getItem('docker-image')
    while (true) {
        if (var1 === 'true' && vae2 === 'true' && var3 === 'true') {
            break
        }
        var1 = localStorage.getItem('docker-installed')
        vae2 = localStorage.getItem('docker-launch')
        var3 = localStorage.getItem('docker-image')
        console.log('waiting for docker to be ready')
        // wait 5 second
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    dockerExist.value = true
    dockerRunning.value = true
    dockerImgExist.value = true
}
const updateDockerStatus = async()=>{
    if (window.electronAPI) {
        let dockerInstall = await checkDockerInstall();
        console.log(dockerInstall)
        dockerExist.value = dockerInstall.status
        let dockerIsRunning = await checkDockerRunning();
        console.log(dockerRunning)
        dockerRunning.value = dockerIsRunning.status
        let dockerEnvironmentReady = await checkDockerEnvironmentReady();
        dockerImgExist.value = dockerEnvironmentReady.status
    }
}

const handleDockerCheck = async() => {

    if (dockerExist.value &&
        dockerRunning.value &&
        dockerImgExist.value) {
        await updateDockerStatus()
        return
    }
    checkWhile()
    emitter.emit('docker-check', true)
};

</script>
<style lang="scss" scoped>
.tips {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-content: center;
    gap: 4px;
}

.img-status {
    display: flex;
    justify-content: center;
    align-content: center;
}

.icon-size-small {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: #8b8b8b 1px solid;
}

.dockdr-status {
    // background-color: #e4e4e4;
    width: 50px;
    height: 25px;
    border-radius: 18px;
    border: #c1c1c1 1px solid;
    display: flex;
    justify-content: center;
    gap: 4px;
    align-items: center;
}

.dockdr-status:hover {
    background-color: #cbcbcb;
}

.icon-size {
    width: 20px;
    height: 20px;
}

.icon-size::hover {
    background-color: unset !important;
}

.icon-img-stop {
    background-color: rgb(198, 198, 198) !important;
}

.icon-img-on {
    background-color: #0cee3d !important;
}

.icon-docker-stop {
    fill: rgb(76, 87, 94);
}

.icon-docker-on {
    fill: rgb(0, 149, 255);
}
</style>