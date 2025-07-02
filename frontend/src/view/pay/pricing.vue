<template>
  <div class="top-bar">
    <a-button type="text" @click="back">
      <template #icon>
        <arrow-left-outlined />
      </template>
      {{ $t('setting.back') }}
    </a-button>
  </div>

  <div class="pricing-page">
    <div class="header">
      <h1 class="title">{{ $t('member.pricing') }}</h1>
      <div class="billing-toggle">
        <a-segmented v-model:value="billingType" :options="billingOptions" size="large" />
      </div>
    </div>

    <div class="pricing-cards">
      <a-row :gutter="24" justify="center" v-if="filteredPlans.length">
        <a-col
          :xs="24"
          :sm="24"
          :md="8"
          :lg="8"
          v-for="plan in pricingPlans"
          :key="plan.id"
        >
          <a-card
            class="pricing-card"
            :class="{ popular: plan.popular, recommended: plan.recommended }"
            bordered
          >
            <div class="plan-badge" v-if="plan.popular || plan.recommended">
              <a-tag :color="plan.popular ? '#722ed1' : '#1890ff'">
                {{ plan.popular ? $t('member.mostPopular') : $t('member.recommended') }}
              </a-tag>
            </div>

            <div class="plan-header">
              <h3 class="plan-name">{{ plan.plan_name }}</h3>
              <div
                class="discount-badge"
                v-if="billingType === 'year' && plan.discount"
              >
                <a-tag :color="plan.discountColor">
                  {{ plan.discount }}% {{ $t('member.discount') }} {{ $t('member.annual') }}
                </a-tag>
              </div>
            </div>

            <div class="pricing" style="text-align:center; margin: 20px 0;">
              <div class="price">{{ currency }} {{ plan.price }}</div>
            </div>

            <div class="credits">
              <div class="credits-amount">
                {{ plan.monthly_points.toLocaleString() }} {{ $t('member.points') }} / {{ $t('member.month') }}
              </div>
            </div>

            <div class="cta">
              <a-button
                :loading="loading"
                type="primary"
                size="large"
                :disabled="isMember(plan)"
                block
                :class="{ 'popular-btn': plan.popular }"
                @click="pay(plan)"
              >
                {{ isMember(plan) ? $t('member.alreadyCurrentMember') : $t('member.select') }}
              </a-button>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <div v-else style="text-align: center; margin-top: 40px; font-size: 16px; color: #888;">
        {{ $t('member.noPlanForBilling') }}
      </div>
    </div>
  </div>

  <!-- 支付二维码弹窗 -->
  <a-modal v-model:open="showQrCode" :title="$t('member.qrTitle')" centered :footer="null">
    <div style="text-align: center;display: flex;
    flex-direction: column;
    align-items: center;">
      <a-qrcode :value="qrCodeUrl" :size="200" />
      <p style="margin-top: 12px;">{{ $t('member.qrTip') }}</p>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/modules/user.js'
import membershipService from '@/services/membership'
import { message } from 'ant-design-vue'
import StripeLogo from '@/assets/svg/stripe.svg'
import WechatLogo from '@/assets/svg/wechatpay.svg'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const { membership } = storeToRefs(userStore)

const billingType = ref('month')
const billingOptions = [
  { label: t('member.billingMonthly'), value: 'month' },
  { label: t('member.billingYearly'), value: 'year' },
]

const pricingPlans = ref([])
const loading = ref(false)
const showQrCode = ref(false)
const qrCodeUrl = ref('')
const showPaymentMethodModal = ref(false)
const selectedPlan = ref(null)
const pollingTimer = ref(null)
const isAbroad = ref(true)

const currency = computed(() => isAbroad.value ? '$' : '¥')

const isMember = (plan) => {
  console.log("membership.value?.planName",plan);
  return membership.value?.planName === plan.plan_name
}

const filteredPlans = computed(() => {
  return pricingPlans.value.filter(plan => {
    return billingType.value === 'year' ? plan.duration_days === 365 : plan.duration_days !== 365
  })
})

const back = () => router.push({ name: 'app' })

onMounted(() => {
  getMembershipPlan()
  if (window.electronAPI) {
    window.electronAPI.on('stripe-payment-success', ({ status }) => {
      if (status === 'paid') {
        message.success(t('member.paySuccess'))
        router.push({
          name: 'app'
        })
      } else {
        message.error(t('member.payFailed'))
      }
    })
    window.electronAPI.on('stripe-payment-cancel', () => {
      message.error(t('member.payCancel'))
    })
  }
})

const getMembershipPlan = async () => {
  const res = await membershipService.getList()
  pricingPlans.value = res
}

const pay = async (plan) => {
  selectedPlan.value = plan
  showPaymentMethodModal.value = true
}

const handlePayment = async (method) => {
  const plan = selectedPlan.value
  showPaymentMethodModal.value = false
  loading.value = true

  try {
    if (method === 'stripe') {
      const res = await membershipService.createStripeOrder(plan.id)
      if (res?.url) {
        window.location.href = res.url
      } else {
        message.error(t('member.payFailed'))
      }
    } else if (method === 'wechat') {
      const res = await membershipService.createOrder(plan.id)
      if (res?.code_url) {
        qrCodeUrl.value = res.code_url
        showQrCode.value = true
        checkOrderStatus(res.order_sn)
      } else {
        message.error(t('member.qrError'))
      }
    }
  } catch (err) {
    message.error(t('member.payError'))
    console.error(err)
  } finally {
    loading.value = false
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
      message.success(t('member.paySuccess'))
      router.push({
        name: 'app'
      })
    }
    if (attempts >= maxRetries) {
      clearInterval(pollingTimer.value)
      message.warning(t('member.payTimeout'))
    }
  }, 3000)
}
</script>

<style scoped>
.pricing-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.title {
  font-size: 42px;
  font-weight: bold;
  color: #1f1f1f;
  margin-bottom: 20px;
}

.billing-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
}

.pricing-cards {
  margin-bottom: 60px;
}
.top-bar {
  height: 60px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.pricing-card {
  height: 100%;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: transform 0.3s;
  background-color: #fff;
  position: relative;
}

.pricing-card:hover {
  transform: translateY(-6px);
}

.plan-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
}

.plan-header {
  text-align: center;
  padding-top: 24px;
}

.plan-icon {
  font-size: 40px;
}

.plan-name {
  font-size: 20px;
  font-weight: 600;
  margin: 8px 0;
}

.discount-badge {
  margin-top: 8px;
}

.pricing {
  text-align: center;
  margin: 20px 0;
}

.price {
  font-size: 32px;
  font-weight: bold;
  color: #1a1a1a;
  transition: all 0.3s ease;
}

.credits {
  text-align: center;
  margin-top: 12px;
}

.credits-amount {
  font-size: 16px;
  font-weight: 500;
  color: #444;
}

.credits-icon {
  margin-right: 6px;
}

.credits-note {
  font-size: 12px;
  color: #aaa;
}

.features {
  margin-top: 20px;
  padding: 0 12px;
}

.features-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.cta {
  margin-top: 20px;
  padding: 0 12px 20px;
}

.popular-btn {
  background-color: #722ed1;
  border-color: #722ed1;
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
