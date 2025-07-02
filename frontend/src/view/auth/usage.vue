<template>
  <div class="usage">
      <div class="member-info">
          <div style="    display: flex;align-items: center;justify-content: space-between;">
              <div>
                  <div class="plan-name">
                      {{ membership?.planName || t('member.freePlan') }}
                  </div>
                  <div class="expiration-date" v-if="membership">
                      {{ t('member.expirationDate') }}{{ dayjs(membership.endDate).format('YYYY-MM-DD HH:mm') }}
                  </div>
              </div>
              <div style="gap:12px;display: flex;">
                  <button @click="toMember" class="upgrade">{{ t('member.upgrade') }}</button>
                  <button @click="toPoints" v-if="membership" class="upgrade">{{ t('member.purchasePoints') }}</button>
              </div>
          </div>

          <div class="points-details">
            <div class="points-details-text-container">
              <div class="points-details-text">{{ t('member.points') }}</div>
              <div class="points-details-total">{{ points.total }}</div>
            </div>
            <div>
              <div class="points-details-accounts" v-for="item in points.accounts">
                <div class="points-accounts">{{ getPointsTypeName(item.type) }}</div>
                <div class="points-accounts">{{ item.balance }}</div>
              </div>
            </div>

          </div>

      </div>

      <a-card :title="t('member.pointsUsageHistory')">
          <a-table :columns="columns" @change="handleTableChange" :data-source="data" row-key="id"
              :pagination="{ current: page, pageSize: pageSize, page, total: total }" />
      </a-card>
  </div>

  <a-modal
  v-model:open="isModalVisible"
  :title="t('member.purchasePoints')"
  :footer="null"
  width="800px"
  class="recharge-modal"
  centered
>
  <div v-if="rechargeProducts.length" class="recharge-products">
    <div
      v-for="item in rechargeProducts"
      :key="item.id"
      class="product-card"
    >
      <div class="product-title">{{ item.product_name }}</div>
      <div class="product-info">
        <p style="margin-top: 8px;">{{ currency }} {{ item.amount }}</p>
        <p>{{ item.points_awarded }}{{ t('member.pointsUnit') }}</p>
      </div>
      <button size="small" :loading="loading" @click="handleBuy(item)">{{ t('member.buyNow') }}</button>
    </div>
  </div>
  <div v-else>{{ t('member.noPackagesAvailable') }}</div>
</a-modal>
<a-modal v-model:open="showQrCode" :title="t('member.wechatScanToPay')" centered :footer="null">
<div style="text-align: center;display: flex;
    flex-direction: column;
    align-items: center;">
  <div style="display: inline-block;">
    <a-qrcode :value="qrCodeUrl" :size="200" />
  </div>
  <p style="margin-top: 12px;">{{ t('member.wechatScanPrompt') }}</p>
</div>
</a-modal>

<!-- 支付方式选择弹窗 -->
<a-modal
  v-model:open="showPaymentMethodModal"
  :footer="null"
  centered
  width="480"
  :title="$t('member.selectPaymentMethod')"
>
  <div style="display: flex; flex-direction: column; gap: 16px; padding: 12px 4px;">
    <!-- Stripe -->
    <div
      class="payment-option"
      @click="handlePayment('stripe')"
    >
      <StripeLogo/>
      <div class="payment-content">
        <div class="payment-title">{{ $t('payment.stripe.title') }}</div>
        <div class="payment-description">{{ $t('payment.stripe.description') }}</div>
      </div>
    </div>

    <!-- WeChat -->
    <div
      class="payment-option"
      @click="handlePayment('wechat')"
    >
      <WechatLogo/>
      <div class="payment-content">
        <div class="payment-title">{{ $t('payment.wechat.title') }}</div>
        <div class="payment-description">{{ $t('payment.wechat.description') }}</div>
      </div>
    </div>
  </div>
</a-modal>


</template>

<script setup>
import { ref, onMounted,computed } from 'vue'
import auth from '@/services/auth';
import membershipService from '@/services/membership'

// --- 国际化引入 ---
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

import dayjs from 'dayjs'
import { useRouter } from "vue-router";
const router = useRouter();
import { message  } from 'ant-design-vue';

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user.js'
const userStore = useUserStore();
const { user, membership, points } = storeToRefs(userStore);

import StripeLogo from '@/assets/svg/stripe.svg'
import WechatLogo from '@/assets/svg/wechatpay.svg'


//判断是国内还是海外 VITE_REGION
// const isAbroad = computed(() => import.meta.env.VITE_REGION === 'abroad');
const isAbroad = ref(true);

//¥
const currency = computed(() => {
  return isAbroad.value ? '$' : '¥'
})





//获取用户信息 getUserInfo
async function getUserInfo() {
  let res = await auth.getUserInfo();
  //设置缓存
  membership.value = res.membership;
  points.value = res.points;
}

//分页
const page = ref(1)
const pageSize = ref(5)
const total = ref(0)
const data = ref([
])

const showQrCode = ref(false)
const qrCodeUrl = ref('')
const showPaymentMethodModal = ref(false)
const selectedPlan = ref(null)
const pollingTimer = ref(null)
const loading = ref(false)

const isModalVisible = ref(false)
const rechargeProducts = ref([])

onMounted(() => {
  getUserInfo();
  getPointsTransactionList()
  if(window.electronAPI){
    window.electronAPI.on('stripe-payment-success', ({ orderId,amount,currency,status }) => {
      console.log("stripe-payment-success",orderId,amount,currency,status);
      if(status === 'paid'){
        message.success(t('member.paySuccess'));
        router.push({
          name: 'app'
        });
      }else{
        message.error(t('member.payFailed'));
      }
    });
    //支付取消
    window.electronAPI.on('stripe-payment-cancel', () => {
      message.error(t('member.payCancel'));
    });
  }
})


//返回积分类型对应的名称
//FREE: 免费积分, MONTHLY: 月度积分, PURCHASED_ADDON: 购买附加积分, GIFTED_ADDON: 赠送附加积分, FEEDBACK_ADDON: 反馈的附加积分
function getPointsTypeName(type) {
  switch (type) {
    case 'FREE':
      return t("member.pointsType.free")
    case 'MONTHLY':
      return t("member.pointsType.monthly")
    case 'PURCHASED_ADDON':
      return t("member.pointsType.purchasedAddon")
    case 'GIFTED_ADDON':
      return t("member.pointsType.giftedAddon")
    case 'FEEDBACK_ADDON':
      return t("member.pointsType.feedbackAddon")
  }
}


const handleBuy = async (item) => {
  showPaymentMethodModal.value = true
  selectedPlan.value = item
}

const handlePayment = async (method) => {
  showPaymentMethodModal.value = false
  loading.value = true

  if(method === 'stripe'){
    let res = await membershipService.createStripePointPurchaseOrder(selectedPlan.value.id)
    window.location.href = res.url; 
    loading.value = false
  }else{
    let res = await membershipService.createPointPurchaseOrder(selectedPlan.value.id)
    if (res && res.code_url) {
      loading.value = false
      qrCodeUrl.value = res.code_url
      showQrCode.value = true
      checkOrderStatus(res.order_sn)
    } else {
      loading.value = false
    }
    console.log(res)
  }
}

const checkOrderStatus = async (orderSn) => {
  const maxRetries = 20
  let attempts = 0

  pollingTimer.value = setInterval(async () => {
    attempts++

    const res = await membershipService.checkOrderStatus(orderSn)
    if (res?.status === 'paid') {
      clearInterval(pollingTimer.value)
      showQrCode.value = false
      message.success(t("member.paymentSuccess"))
      paySuccess();
      // message.success("支付成功！")
      console.log('支付成功')
    }

    if (attempts >= maxRetries) {
      clearInterval(pollingTimer.value)
      console.warn("支付超时，请重新下单")
    }
  }, 3000)
}

//支付成功 
const paySuccess = () => {
 //刷新当前页面
 window.location.reload()
}

const getPointsTransactionList = async () => {
    const res = await membershipService.getPointsTransactionList(
        { page: page.value, pageSize: pageSize.value }
    )
    console.log(res)
    total.value = res.pagination.total
    data.value = res.list
}

const handleTableChange = (pagination) => {
    page.value = pagination.current
    pageSize.value = pagination.pageSize
    getPointsTransactionList()
}

const toMember = () => {
    router.push({ name: "pricing" });
};

const toPoints =  async () => {
    let res = await membershipService.getRechargeProductList()
    rechargeProducts.value = res || []
    isModalVisible.value = true
};

const columns = [
    // {
    //     title: t("member.table.conversation_title"),
    //     dataIndex: 'conversation_title',
    //     key: 'conversation_title'
    // },
    {
        title: t("member.table.details"),
        dataIndex: 'description',
        key: 'description'
    },
    {
        title: t("member.table.time"),
        dataIndex: 'created_at',
        key: 'created_at',
        customRender: ({ text }) => {
            return dayjs(text).format('YYYY-MM-DD HH:mm')
        }
    },
    {
        title:t("member.table.pointsChange"),
        key: 'amount',
        customRender: ({ record }) => {
            const prefix = record.type === 'credit' ? '+' : record.type === 'debit' ? '-' : ''
            return `${prefix}${record.amount}`
        }
    }
]


</script>

<style scoped>
.usage {
    padding: 24px;
}

.mb-4 {
    margin-bottom: 16px;
}

.member-info {
    border-radius: 12px;
    padding: 1rem;
    background-color: #37352f0a;
    border: 1px solid #0000000f;
    margin-bottom: 16px;
}

.plan-name {
    font-weight: 700;
    font-size: 1rem;
    line-height: 28px;
}
.points-details{
  margin-top: 12px;
}
.points-details-text{
    font-weight: 700;
    font-size: 1rem;
    line-height: 28px;
}
.points-details-text-container{
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.points-details-accounts{
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.expiration-date {
    color: #858481;
    line-height: 18px;
    font-size: 13px;

}

.points-accounts{
    color: #858481;
    line-height: 18px;
    font-size: 13px;
}

button {
    color: #fff;
    background-color: #1a1a19;
    padding-left: .75rem;
    padding-right: .75rem;
    border-radius: 99999px;
    cursor: pointer;
}


.recharge-products {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  background-color: #f8f8f7;
  padding: 24px;
  justify-content: space-between;
}

.product-card {
  width: calc(33.333% - 11px); /* 3列布局，减去间距 */
  border: 1px solid #f0f0f0;
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
  text-align: center; /* 文字居中 */
  transition: box-shadow 0.3s;
}

.product-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
<style lang="scss">
.recharge-modal {
  .ant-modal-content {
    background-color: #f8f8f7!important;
  }
  .ant-modal-title{
    background-color: #f8f8f7!important;
  }
}


.payment-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  gap: 16px;
}

.payment-option:hover {
  border-color: #1677ff;
  box-shadow: 0 4px 16px rgba(22,119,255,0.12);
}

.payment-logo {
  width: 40px;
  height: 40px;
  margin-right: 16px;
  object-fit: contain;
}

.payment-content {
  display: flex;
  flex-direction: column;
}

.payment-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.payment-description {
  font-size: 13px;
  color: #666;
}

</style>