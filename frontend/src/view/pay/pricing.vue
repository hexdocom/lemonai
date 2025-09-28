<template>
  <div class="top-bar">
    <a-button type="text" @click="back" class="back-btn">
      <template #icon>
        <arrow-left-outlined />
      </template>
      {{ $t('setting.back') }}
    </a-button>
  </div>
  <div class="pricing">
    <Pricing  />
  </div>
</template>

<script setup>
import { ref, computed, watch, h,onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
//pricing 
import Pricing from './components/pricing.vue'

const { t } = useI18n()
const router = useRouter()
const back = () => router.push({ name: 'lemon' })



</script>

<style scoped>
/* 你原来的样式保持不变 */
body {
  color: #000;
}
.top-bar {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}
.back-btn {
  color: #000;
  display: flex;
  align-items: center;
}
.pricing {
  height: 100%;
}


@media(max-width: 768px){
  .top-bar {
    position: sticky;
    background-color: #fff;
    top: 0;
  }
  .pricing{
    overflow: auto;
    background: #f5f5f5;
  }
}
</style>
<style>

</style>