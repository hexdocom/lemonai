<template>
  <div class="icon-container" :class="props.class" @click="handleClick">
    <a-tooltip v-if="props.showIcon" :arrow="false" placement="right">
      <template #title>{{ props.name }}</template>
      <div style="    height: 20px;width: 20px;" >
        <component :is="props.icon" v-bind="$attrs" :style="{
          width: props.width ? `${props.width}px` : undefined,
          height: props.height ? `${props.height}px` : undefined
        }" />
      </div>
    </a-tooltip>


    <div v-else class="name-container">
      <span>
        {{ props.name }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  icon: {
    type: Object,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  showIcon: {
    type: Boolean,
    required: false,
    default: true
  },
  width: {
    type: Number,
    default: undefined
  },
  height: {
    type: Number,
    default: undefined
  },
  click: {
    type: Function,
    default: () => { }
  },
  clickParams: {
    type: [Object, Array, String, Number, Boolean, null],
    default: undefined
  },
  class: {
    type: [String, Object, Array],
    default: ''
  }
})
const emit = defineEmits(['click'])

const handleClick = (event) => {
  if (props.click) {
    // if clickParams exist then pass clickParams to click function
    if (props.clickParams !== undefined) {
      props.click(props.clickParams)
      emit('click', event, props.clickParams)
    } else {
      props.click(event)
      emit('click', event)
    }
  }
}
</script>

<style scoped>
.icon-container {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  /* 当有 click 事件时提示可点击 */
  border-radius: 10px;
  box-sizing: border-box;
  padding: 6px;
  width: 32px;
  height: 32px;
}

.name-container {
  display: inline-block;
  text-align: start !important;
  color: #333;
  /* 默认颜色 */
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  align-content: center;
  align-items: center;
  justify-content: start !important;
  justify-items: start !important;
  margin-left: 10px;
}
</style>