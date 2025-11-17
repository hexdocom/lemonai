<template>
  <div class="welcome-screen" :class="rootClass" @click="handleRootClick">
    <slot name="header"></slot>

    <div class="welcome-content">
      <span class="welcome-greeting">{{ greeting }}</span>
      <span class="welcome-description">{{ description }}</span>
      <slot name="input"></slot>
    </div>

    <slot name="sample"></slot>
    <slot name="store"></slot>
    <slot name="extra"></slot>
  </div>
</template>

<script setup>
const props = defineProps({
  greeting: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  rootClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['rootClick']);

const handleRootClick = (e) => {
  emit('rootClick', e);
};
</script>

<style lang="scss" scoped>
.welcome-screen {
  background: #f8f8f7;
  overflow: auto;
  height: 100%;

  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.welcome-screen::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.welcome-content {
  margin-top: 180px;
  margin-left: auto;
  margin-right: auto;
  max-width: 1039px;
  width: 100%;
  display: flex;
  flex-direction: column;

  > span {
    margin-left: 22px;
  }

  .welcome-greeting {
    line-height: 28px;
    height: 37px;
    color: rgba(0,0,0,1);
    font-size: 28px;
    text-align: left;
    font-family: PingFangSC, 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 600;
  }

  .welcome-description {
    line-height: 28px;
    color: rgba(0,0,0,1);
    font-size: 20px;
    text-align: left;
    font-family: PingFangSC-regular;
    margin-bottom: 22px;
  }
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .welcome-screen {
    padding: 0px 16px;
  }

  .welcome-content {
    .welcome-greeting {
      display: none;
    }

    .welcome-description {
      font-size: 16px !important;
      text-align: center;
    }
  }
}
</style>
