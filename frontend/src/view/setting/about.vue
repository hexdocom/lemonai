<template>
  <div class="about">
    <h2>{{ $t('setting.about.title') }}</h2>
    <div class="options-item">
      <div class="son">
        <div>
          <span>{{ $t('setting.about.lemonAI') }}</span>
          <span class="version">V{{ versionInfo.localVersion }}</span>
        </div>
        <div>
          <a-button @click="handleUpdate">{{ $t('setting.about.checkUpdate') }}</a-button>
        </div>
      </div>
      <div class="son">
        <div>
          <span>{{ $t('setting.about.officialWebsite') }}</span>
        </div>
        <div>
          <a-button @click="handleOpenLemonPage">{{ $t('setting.about.view') }}</a-button>
        </div>
      </div>
      <div class="son">
        <div>
          <span>{{ $t('setting.about.feedback') }}</span>
        </div>
        <div>
          <a-button @click="handleIssuePage">{{ $t('setting.about.submitFeedback') }}</a-button>
        </div>
      </div>
      <!-- <div class="son last">
        <div>
          <span>{{ $t('setting.about.license') }}</span>
        </div>
        <div>
          <a-button>{{ $t('setting.about.view') }}</a-button>
        </div>
      </div> -->
    </div>
  </div>
  <a-modal :open="updateVisible" :footer="null" :closable="false" :centered="true">
    <div
      class="update-prompt"
      style="border-radius: 12px; text-align: center; font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"
    >
      <h2 style="color: #d81b60; font-size: 24px; margin: 0 0 16px;">
        {{ $t('setting.about.newVersionReleased') }}
      </h2>
      <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 24px;">
        {{ $t('setting.about.version') }}：<strong>V{{ versionInfo.localVersion }} --> </strong>
        <strong> V{{ versionInfo.latestVersion }}</strong>
      </p>
      <!-- TODO show update detail -->
      <div class="update-detail" style="display: flex;">
        <markdownRender :content="versionInfo.body" />
      </div>
      <div style="display: flex; justify-content: center; gap: 16px; padding: 10px;">
        <a-button @click="updateVisible = false;">
          {{ $t('setting.about.skipUpdate') }}
        </a-button>
        <a-button type="primary" @click="handleOpenReleasePage()">
          {{ $t('setting.about.viewDetails') }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import versionService from '@/services/version';
import { message } from 'ant-design-vue';
import markdownRender from '@/components/markdown/index.vue';

const { t } = useI18n();

const versionInfo = ref({
  localVersion: '0.5.1',
  latestVersion: '0.5.1',
  isLatest: true,
  updateUrl: 'https://github.com/yu-mengyun/vue-admin-template',
  message: 'the current version is the latest version',
});
const updateVisible = ref(false);

function handleUpdate() {
  if (versionInfo.value.isLatest) {
    message.success(t('setting.about.alreadyLatest'));
  } else {
    updateVisible.value = true;
  }
}

function handleOpenReleasePage() {
  window.open(versionInfo.value.updateUrl, '_blank');
}

function handleOpenLemonPage() {
  window.open('https://www.lemonai.cc/', '_blank');
}

function handleIssuePage() {
  window.open('https://github.com/hexdocom/lemonai/issues/new', '_blank');
}

onMounted(() => {
  // versionService.getVersionInfo().then((res) => {
  //   console.log(res);
  //   versionInfo.value = res;
  // });
});
</script>

<style scoped>
.about {
  padding: 16px;
  color: #333;
}

.options-item {
  padding: 16px;
  background-color: rgb(254, 254, 254);
  width: 100%;
  border: 1px solid #c6c6c6;
  border-radius: 10px;
  font-size: 15px;
  display: flex;
  flex-direction: column;

  .son {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 10px 0px;
    border-bottom: 1px solid #d4d4d4;
  }

  .last {
    border-bottom: none;
  }
}

@media screen and (max-width: 768px) {
  .about {
    padding: 16px;
  }

  .title {
    font-size: 2rem;
  }
}

.version {
  margin-left: 10px;
  color: #36deee;
  border-radius: 4px;
  /* background-color: #f7f7f7; */
}

.update-detail {
  width: 100%;
  max-height: 500px;
  overflow: auto;
  padding: 2px;
}
.update-detail::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>