<template>
  <div v-if="messages.length > 1" class="message-nav">
    <LeftOutlined
      class="change-btn"
      :class="canBeLeft?'enabled' : 'disabled'"
      @click="leftClick"
    />
    <div class="change-btns-text">{{ localCurrentMessageIndex + 1 }}<span class="" style="margin-right: 2px;margin-left: 2px;"> / </span>{{ messages.length }}</div>
    <RightOutlined
      class="change-btn"
      :class="canBeRight?'enabled' : 'disabled'"
      @click="rightClick"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, defineExpose, computed ,ref} from 'vue';
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue';

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  currentMessageIndex: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:currentMessageIndex','changeChat']);

const localCurrentMessageIndex = computed({
  get: () => props.currentMessageIndex,
  set: (val) => emit('update:currentMessageIndex', val)
});

const canBeRight = computed (() => {
  return localCurrentMessageIndex.value < props.messages.length - 1;
})
const canBeLeft = computed(() => {
  return localCurrentMessageIndex.value > 0;
})


//点击事件
const leftClick = (index) => {
  //调用接口 changeChat
  emit('changeChat',localCurrentMessageIndex.value - 1 )
  emit('update:currentMessageIndex',localCurrentMessageIndex.value - 1)
}

const rightClick = (index) => {
    //调用接口 changeChat
    emit('changeChat',localCurrentMessageIndex.value + 1)
    emit('update:currentMessageIndex',localCurrentMessageIndex.value + 1)
}

defineExpose({ currentMessageIndex: localCurrentMessageIndex });
</script>

<style scoped>
.change-btn {
  cursor: pointer;
  font-size: 16px;
  color: #1e1e1e;
}

.message-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}
.enabled{
  cursor: pointer;
  color: #1e1e1e;
  font-size: 16px;

}
.disabled{
  cursor: not-allowed;
  color: #d9d9d9;
  font-size: 16px;
}

</style>