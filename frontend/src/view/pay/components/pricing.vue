<template>
  <div class="pricing-page">
    <div class="header">
      <h1 class="title" v-if="showTitle == true">{{ $t('member.pricing') }}</h1>
      <div class="billing-toggle">
        <a-segmented v-model:value="billingType" :options="billingOptions" size="large" />
      </div>
    </div>

    <!-- 降级提示信息 -->
    <div v-if="isDowngradeStatus" class="downgrade-notice">
      <div class="downgrade-notice-content">
        <span class="downgrade-text">
          {{ $t('member.downgradeNotice').replace('{planName}', membership?.planName).replace('{targetPlan}', downgradeTargetPlan).replace('{date}', formatPeriodEndDate) }}
        </span>
        <a-button type="primary" @click="cancelDowngrade" :loading="cancelDowngradeLoading">
          {{ $t('member.cancelDowngrade') }}
        </a-button>
      </div>
    </div>

    <div class="pricing-cards">
      <div v-if="filteredPlans.length" class="pricing-cards-container">
        <div v-for="plan in filteredPlans" :key="plan.id">
          <div class="pricing-card">
            <div class="info">
              <h3 class="plan-name">{{ plan.plan_name }}</h3>
              <div class="price" v-if="billingType === 'month' ">
                {{ currency }}{{ formatPrice(displayedPrices[plan.id] ?? plan.price) }} {{ $t('member.monthlyBilling') }}
              </div>
              <div class="price" v-else>
                <div style="display: flex;flex-direction: column;">
                  <span>
                    {{ currency }}{{ formatPrice(displayedPrices[plan.id]) }} {{ $t('member.monthlyBilling') }}
                  </span>
                  <span class="save-text" v-if="calculateYearlySavings(plan) > 0">
                    {{ $t('member.save') }} {{ currency }}{{ calculateYearlySavings(plan) }}
                  </span>
                </div>
                <div class="monthly-equivalent" v-if="calculateYearlySavings(plan) > 0">
                  {{ currency }}{{ plan.price }} {{ $t('member.yearlyBilling') }}
                </div>
              </div>

              <div v-if="plan.benefits?.length" class="benefits-list">
                <div v-for="(benefit, index) in plan.benefits" :key="index" class="benefit-item">
                  <div class="benefit-item-icon">
                    <GiftOutlined v-if="benefit.iconType == 'GiftOutlined'" />
                    <CheckOutlined v-else />
                  </div>
                  <div class="benefit-item-title">
                    {{ benefit.title }}
                  </div>
                </div>
              </div>
            </div>
            <a-button :loading="loadingMap[plan.id]" class="subscribe-btn" size="large" :disabled="planDisabled(plan)"
              block @click="pay(plan)">
              {{
                getPlanActionLabel(plan)
              }}
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <a-modal v-model:open="showQrCode" centered :footer="null">
    <div class="qr-code-container">
      <a-qrcode :value="qrCodeUrl" :size="200" />
      <p>{{ $t('member.qrTip') }}</p>
    </div>
  </a-modal>
  <a-modal
  v-model:open="showPaymentMethodModal"
  :footer="null"
  centered
  width="480px"
  :title="$t('member.selectPaymentMethod')"
>
  <div style="display: flex; flex-direction: column; gap: 16px; padding: 12px 4px;">
    <!-- Stripe -->
    <div
      class="payment-option"
      @click="handlePayment('stripe',selectedPlan?.id)"
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
      @click="handlePayment('wechat',selectedPlan?.id)"
    >
      <WechatLogo/>
      <div class="payment-content">
        <div class="payment-title">{{ $t('payment.wechat.title') }}</div>
        <div class="payment-description">{{ $t('payment.wechat.description') }}</div>
      </div>
    </div>
  </div>
</a-modal>
  <div  class="cancel-btn">
    <a-button type="text" @click="openCancelMembership" v-if="membership && membership.subscription_id && !isDowngradeStatus && !cancelStatus">
      {{ $t('member.cancelMembership') }}
    </a-button>
    
    <!-- 调试按钮，仅在开发环境显示 -->
    <!-- <a-button type="text" @click="debugSubscription" v-if="membership && membership.subscription_id" style="color: #ff4d4f; margin-left: 16px;">
      Debug Subscription
    </a-button> -->
    
    <!-- 清理按钮 -->
    <!-- <a-button type="text" @click="cleanupPendingItems" v-if="membership && membership.subscription_id" style="color: #52c41a; margin-left: 16px;">
      Cleanup Pending Items
    </a-button> -->
    
    <!-- 重置余额按钮 -->
    <!-- <a-button type="text" @click="resetCustomerBalance" v-if="membership && membership.subscription_id" style="color: #722ed1; margin-left: 16px;">
      Reset Balance
    </a-button> -->
  </div>

  <a-modal v-model:open="showCancelConfirm" :title="$t('member.confirmCancelTitle')"
    @ok="handleConfirmCancel" @cancel="showCancelConfirm = false" :ok-button-props="{ loading: confirmLoading }"
    :ok-text="$t('member.confirm')" :cancel-text="$t('member.cancel')">
    <p>{{ $t('member.confirmCancelMessage') }}</p>
  </a-modal>

  <a-modal v-model:open="showDowngradeConfirm" :title="$t('member.confirmDowngrade')"
    @ok="handleConfirmDowngrade" @cancel="showDowngradeConfirm = false" :ok-button-props="{ loading: confirmLoading }"
    :ok-text="$t('member.confirmDowngrade')" :cancel-text="$t('member.cancel')">
    <p v-if="pendingDowngradePlan">
      {{ $t('member.confirmDowngradeMessage') }} {{ membership?.planName }} {{ $t('member.to') }} {{ pendingDowngradePlan.plan_name }}?
      <br><br>
      {{ $t('member.effectAtPeriodEnd') }} ({{ formatPeriodEndDate }}).
    </p>
  </a-modal>

  <!-- 升级预览确认弹窗 -->
  <a-modal v-model:open="showUpgradeConfirm" :title="$t('member.upgradePreviewTitle')" width="520px" centered
    @ok="handleConfirmUpgrade" @cancel="cancelUpgradePreview" :ok-button-props="{ loading: confirmLoading }"
    :ok-text="$t('member.confirmUpgrade')" :cancel-text="$t('member.cancel')">
    <div v-if="upgradePreview" class="upgrade-preview-content">
      <div class="upgrade-info">
        <h4>{{ $t('member.upgradeSummary') }}</h4>
        <div class="upgrade-details">
          <div class="upgrade-row">
            <span>{{ $t('member.from') }}</span>
            <strong>{{ membership?.planName }} - {{ currency }}{{ formatPrice(getCurrentPlanPrice()) }}/{{ membership?.durationDays === 365 ? $t('member.year') : $t('member.month') }}</strong>
          </div>
          <div class="upgrade-row">
            <span>{{ $t('member.to') }}</span>
            <strong>{{ pendingUpgradePlan?.plan_name }} - {{ currency }}{{ formatPrice(pendingUpgradePlan?.price) }}/{{ pendingUpgradePlan?.duration_days === 365 ? $t('member.year') : $t('member.month') }}</strong>
          </div>
        </div>
      </div>
      
      <div class="pricing-info">
        <h4>{{ $t('member.paymentRequired') }}</h4>
        <div class="pricing-details">
          <div class="pricing-row">
            <span>{{ $t('member.upgradePrice') }}</span>
            <span class="amount">{{ upgradePreview.currency === 'USD' ? '$' : upgradePreview.currency }}{{ formatPrice(upgradePreview.upgrade_price) }}</span>
          </div>
        </div>
      </div>
      
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/modules/user.js'
import membershipService from '@/services/membership'
import { message, Modal } from 'ant-design-vue'
import { CheckOutlined, GiftOutlined } from '@ant-design/icons-vue'

import StripeLogo from '@/assets/svg/stripe.svg'
import WechatLogo from '@/assets/svg/wechatpay.svg'

import userService from '@/services/auth'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const { membership,points } = storeToRefs(userStore)

const confirmLoading = ref(false)
const cancelDowngradeLoading = ref(false)

// 升降级功能开关
const upgradeDowngradeEnabled = ref(true) // 默认关闭升降级功能

// 根据用户当前计划设置默认计费类型
const getDefaultBillingType = () => {
  if (membership.value?.durationDays) {
    return membership.value.durationDays === 365 ? 'year' : 'month';
  }
  // 如果没有计划，默认为year
  return 'year';
};

const billingType = ref(getDefaultBillingType())
const billingOptions = [
  {
    label: () => h('div', [h('span', t('member.billingMonthly'))]),
    value: 'month',
  },
  {
    label: () =>
      h(
        'div',
        { style: 'display: flex; align-items: center; gap: 4px;' },
        [
          h('span', t('member.billingYearly')),
          h(
            'span',
            {
              style: 'color: #0081f2; font-size: 13px; font-weight: 500;',
            },
            'Save 16%'
          ),
        ]
      ),
    value: 'year',
  },
]

const pricingPlans = ref([])
const loadingMap = ref({})
const showQrCode = ref(false)
const qrCodeUrl = ref('')
const showPaymentMethodModal = ref(false)
const selectedPlan = ref(null)
const pollingTimer = ref(null)

const currency = computed(() => '$')


const showCancelConfirm = ref(false)
const showDowngradeConfirm = ref(false)
const pendingDowngradePlan = ref(null)
const showUpgradeConfirm = ref(false)
const pendingUpgradePlan = ref(null)
const upgradePreview = ref(null)

const props = defineProps({
  isWindow: {
    type: Boolean,
    default: false,
  },
  showTitle: {
    type: Boolean,
    default: true,
  },
})


const emits =  defineEmits(['close_window']);

const openCancelMembership = () => {
  showCancelConfirm.value = true
}
const cancelMembership = async () => {
  // 执行取消订阅的 API 或逻辑
  console.log('Subscription canceled', membership.value.subscription_id)
  let subscription_id = membership.value.subscription_id;
  if (!subscription_id) {
    let res = await membershipService.getSubscriptionInfo()
    subscription_id = res.subscription?.data?.[0]?.id ?? null;
  }
  if (subscription_id) {
    let cancel_res = await membershipService.cancelSubscription({
      subscription_id
    })
    console.log("=== cancel_res === ", cancel_res);
    await getSubscriptionInfo()
    // 刷新用户信息以确保membership数据更新
    await getUserInfo()
  }
}

//getSubscriptionInfo
const subscriptionInfo = ref(null)
const getSubscriptionInfo = async () => {
  let res = await membershipService.getSubscriptionInfo()
  subscriptionInfo.value = res.subscription?.data?.[0] ?? null;
  return res
}
const cancelStatus = computed(() => {
  return subscriptionInfo.value?.cancel_at_period_end
})

// 检查是否处于降级状态
const isDowngradeStatus = computed(() => {
  return subscriptionInfo.value?.metadata?.action === 'downgrade'
})

// 修改后的取消状态：区分真正取消和降级
const isTrueCancelStatus = computed(() => {
  return cancelStatus.value && !isDowngradeStatus.value
})

// 获取降级目标计划信息
const downgradeTargetPlan = computed(() => {
  if (!isDowngradeStatus.value || !subscriptionInfo.value?.metadata?.target_plan_name) {
    return null
  }
  return subscriptionInfo.value.metadata.target_plan_name
})

// 格式化期间结束日期
const formatPeriodEndDate = computed(() => {
  const periodEnd = subscriptionInfo.value?.items?.data?.[0]?.current_period_end
  if (!periodEnd) {
    return ''
  }
  const date = new Date(periodEnd * 1000)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
})


// 使用 computed 缓存按钮文本
const planActionLabelsMap = computed(() => {
  const labelsMap = {}
  filteredPlans.value.forEach(plan => {
    // 当前用户是否为会员
    const isCurrentUserMember = !!membership.value?.planName;

    if (isCurrentUserMember && plan.plan_name === 'Free') {
      labelsMap[plan.id] = t('member.unavailable');
      return;
    }

    if (isMember(plan)) {
      // 当前用户是该 plan 的会员
      if (plan.plan_name === 'Free') {
        labelsMap[plan.id] = t('member.unavailable');
      } else {
        labelsMap[plan.id] = isTrueCancelStatus.value ? t('member.reactivatePlan') : t('member.alreadyCurrentMember');
      }
    } else {
      // 当前用户不是该 plan 的会员
      if (plan.plan_name === 'Free') {
        labelsMap[plan.id] = t('member.alreadyCurrentMember');
      } else {
        //判断是升级 还是 降级
        // 如果是年会员 需要在 后面 增加 year
        let plan_name = plan.plan_name;
        if(plan.duration_days === 365){
          plan_name = plan_name + ' ' + t('member.year');
        }else{
          plan_name = plan_name + ' ' + t('member.month');
        }
        const label = isUpgradeOrDowngrade(plan);
        if (label === 'upgrade') {
          labelsMap[plan.id] = t('member.upgradeTo') + ' ' + plan_name;
        } else if (label === 'downgrade') {
          labelsMap[plan.id] = t('member.downgradeTo') + ' ' + plan_name;
        } else {
          labelsMap[plan.id] = t('member.upgradeTo') + ' ' + plan_name;
        }
      }
    }
  })
  return labelsMap
})

function getPlanActionLabel(plan) {
  return planActionLabelsMap.value[plan.id]
}

// 判断是升级 还是 降级
const isUpgradeOrDowngrade = (plan) => {
  const current = membership.value;
  if (!current) return null; // 没有当前会员信息，无法判断

  // 设定等级优先级
  const levelRank = {
    'Pro': 1,
    'Business': 2
  };

  const currentRank = levelRank[current.planName];
  const newRank = levelRank[plan.plan_name];

  // 先比较等级
  // if (newRank > currentRank) {
  //   return 'upgrade';
  // } else if (newRank < currentRank) {
  //   return 'downgrade';
  // }

  // 如果等级一样，再比较
  console.log('plan monthly_points', plan.monthly_points);
  console.log('current monthlyPoints', current.monthlyPoints);

  console.log('plan duration_days', plan.duration_days);
  console.log('current durationDays', current.durationDays);

  if ((plan.duration_days >= current.durationDays) && (plan.monthly_points >= current.monthlyPoints) ) {  
    return 'upgrade';
  } else if (plan.duration_days <= current.durationDays && plan.monthly_points <= current.monthlyPoints) {
    return 'downgrade';
  } else if (plan.duration_days > current.durationDays){
    return 'upgrade'
  } else {
    return 'none';
  }

  // 如果等级和时长都一样
  return null;
};




// 使用 computed 缓存 planDisabled 结果
const planDisabledMap = computed(() => {
  const disabledMap = {}
  filteredPlans.value.forEach(plan => {
    if (plan.plan_name === 'Free') {
      disabledMap[plan.id] = true
    } else if (isMember(plan)) {
      disabledMap[plan.id] = !isTrueCancelStatus.value
    } else {
      disabledMap[plan.id] = false
    }
  })
  return disabledMap
})

const planDisabled = (plan) => {
  return planDisabledMap.value[plan.id]
}

const handleConfirmCancel = async () => {
  confirmLoading.value = true
  try {
    await cancelMembership()
    showCancelConfirm.value = false
    message.success(t('member.cancelMembershipSuccess'))
  } finally {
    confirmLoading.value = false
  }
}

// 处理降级确认
const handleConfirmDowngrade = async () => {
  if (!pendingDowngradePlan.value) return
  
  confirmLoading.value = true
  try {
    const previousPaymentMethod = getPreviousPaymentMethod()
    
    if (previousPaymentMethod === 'stripe') {
      await membershipService.downgradeSubscription({
        subscription_id: membership.value.subscription_id,
        new_price_id: pendingDowngradePlan.value.stripe_price_id
      })
      message.success(t('member.downgradeScheduledSuccess'))
      // 刷新订阅信息
      await getSubscriptionInfo()
      await getUserInfo()
    } else {
      message.info(t('member.downgradeNotSupported'))
    }
    
    showDowngradeConfirm.value = false
    pendingDowngradePlan.value = null
  } catch (error) {
    console.error('降级失败:', error)
    message.error(t('member.downgradeFailed'))
  } finally {
    confirmLoading.value = false
  }
}

// 取消降级操作
const cancelDowngrade = async () => {
  cancelDowngradeLoading.value = true
  try {
    // 调用取消降级的API - 需要根据实际API调整
    await membershipService.cancelDowngrade({
      subscription_id: subscriptionInfo.value.id
    })
    message.success(t('member.cancelDowngradeSuccess'))
    // 刷新订阅信息
    await getSubscriptionInfo()
    await getUserInfo()
  } catch (error) {
    console.error('取消降级失败:', error)
    message.error(t('member.cancelDowngradeFailed'))
  } finally {
    cancelDowngradeLoading.value = false
  }
}


const calculateYearlySavings = (plan) => {
  //Pro
  if (plan.plan_name === 'Pro') {
    return 38
  }
  //Business
  if (plan.plan_name === 'Business') {
    return 189
  }
}


const calculateMonthlyPrice = (plan) => {
  if (plan.plan_name === 'Pro') {
    return 16
  }
  if (plan.plan_name === 'Business') {
    return 83
  }
  return 0
}

onMounted(() => {
  getSubscriptionInfo()
})

const isMember = (plan) => {
  return membership.value?.planName === plan.plan_name && membership.value?.durationDays === plan.duration_days
}

const filteredPlans = computed(() => {
  return pricingPlans.value.filter((plan) =>
    billingType.value === 'year' ? plan.duration_days === 365 : plan.duration_days === 30
  )
})

const back = () => router.push({ name: 'lemon' })

const membershipBenefitsMap = computed(() => ({
  'Free': [
    { title: t('member.benefits.free.newUserCredits'), iconType: "GiftOutlined" },
    { title: t('member.benefits.free.dailyCredits')},
    { title: t('member.benefits.free.publicAgentsOnly') },
    { title: t('member.benefits.free.systemExperienceInvisible') },
    { title: t('member.benefits.free.limitedChat') },
    { title: t('member.benefits.free.limitedAgent') },
  ],
  'Pro': [
    { title: t('member.benefits.pro.monthlyCredits'), iconType: "GiftOutlined" },
    { title: t('member.benefits.pro.dailyCredits') },
    { title: t('member.benefits.pro.privateAgents') },
    { title: t('member.benefits.pro.systemExperienceEditable') },
    { title: t('member.benefits.pro.unlimitedChat') },
    { title: t('member.benefits.pro.unlimitedAgent') },
  ],
  'Business': [
    { title: t('member.benefits.business.monthlyCredits'), iconType: "GiftOutlined" },
    { title: t('member.benefits.business.dailyCredits') },
    { title: t('member.benefits.business.privateAgents') },
    { title: t('member.benefits.business.systemExperienceEdit') },
    { title: t('member.benefits.business.unlimitedChat') },
    { title: t('member.benefits.business.unlimitedAgent') },
    { title: t('member.benefits.business.earlyAccess') },
    { title: t('member.benefits.business.customDomains') },
    { title: t('member.benefits.business.teamShare') },
  ]
}))


const getMembershipPlan = async () => {
  try {
    const res = await membershipService.getList()
    //增加一个免费计划
    res.unshift({
      id: 0,
      plan_name: 'Free',
      price: 0,
      duration_days: 30,
    }, {
      id: 1,
      plan_name: 'Free',
      price: 0,
      duration_days: 365,
    })
    res.forEach(plan => {
      plan.benefits = membershipBenefitsMap.value[plan.plan_name] || []
    })
    pricingPlans.value = res

    filteredPlans.value.forEach(plan => {
      if (plan.duration_days == 30) {
        displayedPrices.value[plan.id] = Number(plan.price)
      } else {
        displayedPrices.value[plan.id] = Number(calculateMonthlyPrice(plan))
      }
    })
  } catch (error) {
    message.error(t('member.loadPlansFailed'))
  }
}
getMembershipPlan()

const displayedPrices = ref({})
const timers = {}

function formatPrice(price) {
  return Number(price).toFixed(2)
}

function getPlanPriceByName(name, durationDays) {
  const plan = pricingPlans.value.find(p => p.plan_name === name && p.duration_days === durationDays)
  return plan ? Number(plan.price) : 0
}

function getCurrentPlanPrice() {
  if (!membership.value) return 0
  const plan = pricingPlans.value.find(p => 
    p.plan_name === membership.value.planName && 
    p.duration_days === membership.value.durationDays
  )
  return plan ? Number(plan.price) : 0
}

function animatePrice(planId, from, to, duration = 300) {
  if (timers[planId]) {
    clearInterval(timers[planId])
    timers[planId] = null
  }
  const frameRate = 30
  const totalFrames = Math.round(duration / (1000 / frameRate))
  let frame = 0
  const diff = to - from

  timers[planId] = setInterval(() => {
    frame++
    if (frame >= totalFrames) {
      displayedPrices.value[planId] = to
      clearInterval(timers[planId])
      timers[planId] = null
    } else {
      displayedPrices.value[planId] = from + (diff * frame) / totalFrames
    }
  }, 1000 / frameRate)
}

watch(billingType, (newVal, oldVal) => {
  if (!pricingPlans.value.length) return

  const oldDuration = oldVal === 'year' ? 365 : 30
  const newDuration = newVal === 'year' ? 365 : 30

  filteredPlans.value.forEach(plan => {
    const planId = plan.id
    let newPrice = Number(plan.price)
    if (plan.duration_days == 365) {
      newPrice = Number(calculateMonthlyPrice(plan))
    }
    const oldPrice = getPlanPriceByName(plan.plan_name, oldDuration)

    displayedPrices.value[planId] = oldPrice
    animatePrice(planId, oldPrice, newPrice)
  })
})

const pay = async (plan) => {
  // 如果处于降级状态，检查操作类型
  if (isDowngradeStatus.value) {
    const upgradeOrDowngrade = isUpgradeOrDowngrade(plan);
    // 如果是降级操作，阻止执行
    if (upgradeOrDowngrade === 'downgrade') {
      message.info(t('member.cancelPleaseFirst'))
      return
    }
    // 如果是升级操作，允许执行（继续下面的逻辑）
  }

  // 检查是否是重新激活订阅的情况（真正的取消状态，不是降级）
  if (isTrueCancelStatus.value) {
    // 检查选择的计划是否和当前被取消的计划相同
    const isSamePlan = membership.value?.planName === plan.plan_name && 
                      membership.value?.durationDays === plan.duration_days
    
    if (isSamePlan) {
      // 用户选择的是同一个被取消的计划，允许重新激活
      //reactivateSubscription subscription_id
      loadingMap.value = { ...loadingMap.value, [plan.id]: true }
      await membershipService.reactivateSubscription({
          subscription_id: subscriptionInfo.value.id
      })
      message.success(t('member.reactivateSuccess'))
        //刷新
      loadingMap.value = { ...loadingMap.value, [plan.id]: false }
      getSubscriptionInfo();
      await getUserInfo();
      return
    } 
    
    // else {
    //   // 用户选择的是不同的计划，不支持升级/降级
    //   message.info("Sorry, you can only reactivate your current plan. Upgrading or downgrading is not supported at the moment.")
    //   return
    // }
  }
  console.log('membership.value?.planName', membership.value?.planName)
  // 检查是否已经是会员且没有设置取消
  if (membership.value?.planName) {

    // message.info("Sorry, you are already a member, and we do not support upgrading or downgrading at the moment.")
    // return

    const upgradeOrDowngrade = isUpgradeOrDowngrade(plan);
    console.log('upgradeOrDowngrade', upgradeOrDowngrade)
    if (upgradeOrDowngrade === 'upgrade') {
      // 检查升级功能是否开启（免费用户始终可以升级）
      if (!upgradeDowngradeEnabled.value && membership.value?.planName && membership.value.planName !== 'Free') {
        message.info(t('member.platformNotSupported'))
        return
      }
    
      const previousPaymentMethod = getPreviousPaymentMethod();
      
      if (previousPaymentMethod === 'stripe') {
        // 先调用预览接口获取升级信息
        try {
          loadingMap.value = { ...loadingMap.value, [plan.id]: true };
          const previewResult = await membershipService.previewUpgrade({
            current_plan_id: membership.value.planId,
            new_plan_id: plan.id
          });
          
          // 保存预览数据并显示确认弹窗
          upgradePreview.value = previewResult;
          pendingUpgradePlan.value = plan;
          showUpgradeConfirm.value = true;
          loadingMap.value = { ...loadingMap.value, [plan.id]: false };
          
          return;
        } catch (error) {
          message.error(t('member.upgradePreviewFailed'));
          loadingMap.value = { ...loadingMap.value, [plan.id]: false };
          return;
        }
      } else {
        // 微信支付的升级也显示预览弹窗
        try {
          loadingMap.value = { ...loadingMap.value, [plan.id]: true };
          const previewResult = await membershipService.previewUpgrade({
            current_plan_id: membership.value.planId,
            new_plan_id: plan.id
          });
          
          // 保存预览数据并显示确认弹窗
          upgradePreview.value = previewResult;
          pendingUpgradePlan.value = plan;
          showUpgradeConfirm.value = true;
          loadingMap.value = { ...loadingMap.value, [plan.id]: false };
          
          return;
        } catch (error) {
          message.error(t('member.upgradePreviewFailed'));
          loadingMap.value = { ...loadingMap.value, [plan.id]: false };
          return;
        }
      }
    }else if( upgradeOrDowngrade === 'none' ){
      message.error(t('member.switchNotSupported'));
      return
    }else if (upgradeOrDowngrade === null) {
      // 免费用户首次购买，直接打开支付选择弹窗
      selectedPlan.value = plan
      showPaymentMethodModal.value = true
      return
      
    } else if (upgradeOrDowngrade === 'downgrade') {
      // 检查降级功能是否开启
      if (!upgradeDowngradeEnabled.value) {
        message.info(t('member.platformNotSupported'))
        return
      }
      
      // 检查支付方式，微信支付不支持降级
      const previousPaymentMethod = getPreviousPaymentMethod();
      if (previousPaymentMethod === 'wechat') {
        message.info(t('member.wechatDowngradeNotSupported'))
        return
      }
      
      // 降级逻辑：显示确认弹窗（仅限 Stripe 支付）
      pendingDowngradePlan.value = plan
      showDowngradeConfirm.value = true
      return
    }
  }
  
  selectedPlan.value = plan
  showPaymentMethodModal.value = true
}

//判断支付方式 微信 还是 STRIPE 根据membership.subscription_id 判断
const getPreviousPaymentMethod = () => {
  // 只有Stripe支付才有subscription_id
  // 如果没有subscription_id，说明是微信支付
  if (!membership.value?.subscription_id) {
    return 'wechat'; // 没有订阅ID，属于微信支付
  }
  
  // 有subscription_id，说明是Stripe支付
  return 'stripe';
}

// 处理升级确认
const handleConfirmUpgrade = async () => {
  if (!pendingUpgradePlan.value || !upgradePreview.value) return
  
  confirmLoading.value = true
  let upgradeResult = null
  
  try {
    const previousPaymentMethod = getPreviousPaymentMethod();
    
    if (previousPaymentMethod === 'stripe') {
      // Stripe 支付升级
      const customAmountInCents = Math.round(parseFloat(upgradePreview.value.upgrade_price) * 100);
      
      upgradeResult = await membershipService.upgradeSubscription({
        subscription_id: membership.value.subscription_id,
        new_price_id: pendingUpgradePlan.value.stripe_price_id,
        custom_amount: customAmountInCents
      });
      
      console.log("=== upgradeResult === ",upgradeResult);
      
      // 检查是否为支付失败的响应
      if (upgradeResult.data?.payment_failed === true || upgradeResult.data?.success === false) {
        // 支付失败，直接显示错误信息，不进入订单轮询
        let errorMessage = upgradeResult.data?.message || t('member.upgradeFailed');
        let suggestions = []
        
        // 构建弹窗内容
        const modalContent = [
          h('p', { style: 'margin-bottom: 16px; color: #ff4d4f; font-weight: 500;' }, errorMessage)
        ]
        
        // 如果有建议，添加建议列表
        if (suggestions.length > 0) {
          modalContent.push(
            h('div', { style: 'margin-top: 16px;' }, [
              h('p', { style: 'margin-bottom: 8px; font-weight: 500; color: #1890ff;' }, t('member.whatYouCanDo')),
              h('ul', { style: 'margin: 0; padding-left: 20px; color: #666;' }, 
                suggestions.map(suggestion => 
                  h('li', { style: 'margin-bottom: 4px; line-height: 1.4;' }, suggestion)
                )
              )
            ])
          )
        }
        
        // 添加错误代码（如果有）
        // if (upgradeResult.data?.code) {
        //   modalContent.push(
        //     h('p', { style: 'margin-top: 16px; color: #999; font-size: 12px; border-top: 1px solid #f0f0f0; padding-top: 8px;' }, 
        //       `Error Code: ${upgradeResult.data.code}`
        //     )
        //   )
        // }
        
        // 使用与 handleUpgradeFailure 相同的 Modal 显示样式
        Modal.error({
          title: t('member.upgradePaymentFailed'),
          width: 480,
          content: h('div', modalContent),
          okText: t('member.iUnderstand'),
          okType: 'primary'
        })
        
        // 关闭弹窗并清理状态
        showUpgradeConfirm.value = false;
        pendingUpgradePlan.value = null;
        upgradePreview.value = null;
        
        return; // 直接返回，不进入订单轮询
      }
      
      // 如果返回了订单ID，则开始轮询订单状态
      if (upgradeResult?.order?.order_sn) {
        message.info(t('member.processingUpgrade'));
        checkUpgradeOrderStatus(upgradeResult.order.order_sn);
        // 不在这里关闭弹窗，让轮询函数处理
        // 注意：不要在这里return，因为finally块会重置loading状态
      } else {
        // 兼容旧的处理方式
        message.success(t('member.upgradeSuccessful'));
        // 延迟后刷新用户信息
        await new Promise(resolve => setTimeout(resolve, 2000));
        await getSubscriptionInfo();
        await getUserInfo();
        
        // 关闭弹窗并清理状态
        showUpgradeConfirm.value = false;
        pendingUpgradePlan.value = null;
        upgradePreview.value = null;
      }
    } else {
      // 微信支付升级 - 创建升级订单
      const res = await membershipService.createMembershipUpgradeOrder({
        current_plan_id: membership.value.planId,
        new_plan_id: pendingUpgradePlan.value.id
      });
      qrCodeUrl.value = res.code_url;
      showQrCode.value = true;
      checkOrderStatus(res.order_sn);
      
      // 关闭弹窗并清理状态
      showUpgradeConfirm.value = false;
      pendingUpgradePlan.value = null;
      upgradePreview.value = null;
    }
    
  } catch (error) {
    console.error('升级失败:', error)
    message.error(t('member.upgradeFailed'));
    
    // 出错时关闭弹窗
    showUpgradeConfirm.value = false;
    pendingUpgradePlan.value = null;
    upgradePreview.value = null;
  } finally {
    // 只有在不需要轮询的情况下才重置loading状态
    // 轮询情况下由checkUpgradeOrderStatus函数负责管理loading状态
    if (!upgradeResult?.order?.order_sn) {
      confirmLoading.value = false;
    }
  }
}

// 取消升级预览
const cancelUpgradePreview = () => {
  showUpgradeConfirm.value = false;
  pendingUpgradePlan.value = null;
  upgradePreview.value = null;
}

//帮我实现一个降级的逻辑

const handlePayment = async (method, planId) => {
  console.log("=== method === ", method, planId);
  loadingMap.value = { ...loadingMap.value, [planId]: true }
  const plan = selectedPlan.value
  showPaymentMethodModal.value = false
  try {
    if (method === 'stripe') {
      const res = await membershipService.createStripeOrder(plan.id)
      if (res?.url) {
        window.location.href = res.url
      }
    } else if (method === 'wechat') {
      const res = await membershipService.createOrder(plan.id)
      qrCodeUrl.value = res.code_url
      showQrCode.value = true
      checkOrderStatus(res.order_sn)
    }
  } catch (error) {
    console.error("paymentFailed", error)
    message.error(t('member.paymentFailed'))
  } finally {
    loadingMap.value = { ...loadingMap.value, [planId]: false }
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
      //刷新用户数据
      await getUserInfo()
      //判断是不是弹窗 isWindow
      if(props.isWindow){
        emits('close_window')
      }else{
        //刷新页面
        router.push('/pricing')
      }
    }
    if (attempts >= maxRetries) {
      clearInterval(pollingTimer.value)
      // message.warning(t('member.payTimeout'))
    }
  }, 3000)
}

// 轮询升级订单状态
const checkUpgradeOrderStatus = async (orderSn) => {
  const maxRetries = 20
  let attempts = 0
  
  // 开始轮询时保持 loading 状态
  confirmLoading.value = true
  
  pollingTimer.value = setInterval(async () => {
    attempts++
    try {
      const res = await membershipService.checkOrderStatus(orderSn)
      console.log(`=== 轮询订单状态 (第${attempts}次) ===`)
      console.log('订单状态:', res?.status)
      
      if (res?.status === 'paid') {
        clearInterval(pollingTimer.value)
        confirmLoading.value = false
        
        // 关闭弹窗并清理状态
        showUpgradeConfirm.value = false
        pendingUpgradePlan.value = null
        upgradePreview.value = null
        
        message.success(t('member.upgradeSuccessful'))
        
        // 刷新用户信息
        await getSubscriptionInfo()
        await getUserInfo()
        
        //判断是不是弹窗 isWindow
        if(props.isWindow){
          emits('close_window')
        }
      } else if (res?.status === 'failed') {
        console.log('=== 检测到订单失败 ===')
        // 订单支付失败，停止轮询并查询失败原因
        clearInterval(pollingTimer.value)
        confirmLoading.value = false
        
        // 关闭弹窗并清理状态
        showUpgradeConfirm.value = false
        pendingUpgradePlan.value = null
        upgradePreview.value = null
        
        // 查询支付失败原因
        console.log('准备调用 handleUpgradeFailure')
        await handleUpgradeFailure()
        console.log('handleUpgradeFailure 调用完成')
      } else if (attempts >= maxRetries) {
        clearInterval(pollingTimer.value)
        confirmLoading.value = false
        message.warning(t('member.upgradeTimeoutWarning'))
        
        // 超时时也关闭弹窗
        showUpgradeConfirm.value = false
        pendingUpgradePlan.value = null
        upgradePreview.value = null
      }
    } catch (error) {
      console.error('检查升级订单状态失败:', error)
      if (attempts >= maxRetries) {
        clearInterval(pollingTimer.value)
        confirmLoading.value = false
        
        // 关闭弹窗并清理状态
        showUpgradeConfirm.value = false
        pendingUpgradePlan.value = null
        upgradePreview.value = null
        
        message.error(t('member.upgradeStatusCheckFailed'))
      }
    }
  }, 3000)
}

// 处理升级失败，查询失败原因并弹窗提示
const handleUpgradeFailure = async () => {
  try {
    // 通过当前用户的订阅ID查询支付失败原因
    const subscriptionId = membership.value?.subscription_id
    console.log('=== handleUpgradeFailure 调试信息 ===')
    console.log('subscriptionId:', subscriptionId)
    
    if (!subscriptionId) {
      console.log('没有找到 subscriptionId')
      message.error(t('member.getSubscriptionFailed'))
      return
    }
    
    console.log('正在查询支付失败原因...')
    const failureResult = await membershipService.getPaymentFailureReason(subscriptionId)
    console.log('支付失败原因查询结果:', failureResult)
    console.log('failureResult.success:', failureResult.success)
    console.log('failureResult.data:', failureResult.data)
    
    // 兼容两种返回格式：包装格式和直接格式
    const failureInfo = failureResult.success ? failureResult.data : failureResult
    
    if (failureInfo && (failureInfo.failure_reason || failureInfo.failure_code || failureInfo.failure_message)) {
      let errorMessage = t('member.upgradeFailed')
      let suggestions = []
      
      // 根据不同的失败原因给出相应的提示
      if (failureInfo.failure_code === 'insufficient_funds') {
        errorMessage = t('member.insufficientFunds')
      } else if (failureInfo.failure_code === 'card_declined') {
        errorMessage = t('member.cardDeclined')
      } else if (failureInfo.failure_code === 'authentication_required') {
        errorMessage = t('member.authenticationRequired')
      } else if (failureInfo.failure_code === 'expired_card') {
        errorMessage = t('member.expiredCard')
      } else if (failureInfo.failure_code === 'no_payment_method_or_failed') {
        // 处理新的支付方式问题
        errorMessage = failureInfo.failure_message || t('member.paymentMethodIssue')
        suggestions = failureInfo.suggestions || []
      } else if (failureInfo.failure_code === 'invoice_open') {
        // 处理未支付发票的情况
        errorMessage = failureInfo.failure_message || t('member.invoiceUnpaid')
        suggestions = failureInfo.suggestions || []
      } else if (failureInfo.failure_message) {
        errorMessage = failureInfo.failure_message
        suggestions = failureInfo.suggestions || []
      }
      
      // 构建弹窗内容
      const modalContent = [
        h('p', { style: 'margin-bottom: 16px; color: #ff4d4f; font-weight: 500;' }, errorMessage)
      ]
      
      // 如果有建议，添加建议列表
      if (suggestions.length > 0) {
        modalContent.push(
          h('div', { style: 'margin-top: 16px;' }, [
            h('p', { style: 'margin-bottom: 8px; font-weight: 500; color: #1890ff;' }, t('member.whatYouCanDo')),
            h('ul', { style: 'margin: 0; padding-left: 20px; color: #666;' }, 
              suggestions.map(suggestion => 
                h('li', { style: 'margin-bottom: 4px; line-height: 1.4;' }, suggestion)
              )
            )
          ])
        )
      }
      
      // 添加错误代码（如果有）
      // if (failureInfo.failure_code) {
      //   modalContent.push(
      //     h('p', { style: 'margin-top: 16px; color: #999; font-size: 12px; border-top: 1px solid #f0f0f0; padding-top: 8px;' }, 
      //       `Error Code: ${failureInfo.failure_code}`
      //     )
      //   )
      // }
      
      console.log('准备显示 Modal 弹窗')
      console.log('errorMessage:', errorMessage)
      console.log('suggestions:', suggestions)
      console.log('failure_code:', failureInfo.failure_code)
      
      // 使用 Modal 显示详细的错误信息
      Modal.error({
        title: t('member.upgradePaymentFailed'),
        width: 480,
        content: h('div', modalContent),
        okText: t('member.iUnderstand'),
        okType: 'primary'
      })
      
      console.log('Modal.error 已调用')
    } else {
      message.error(t('member.contactSupport'))
    }
  } catch (error) {
    console.error('查询升级失败原因出错:', error)
    message.error('Upgrade failed. Please try again or contact support.')
  }
}

//获取用户信息 getUserInfo
async function getUserInfo() {
  let res = await userService.getUserInfo();
  //设置缓存
  membership.value = res.membership;
  points.value = res.points;
}

// 调试订阅状态
const debugSubscription = async () => {
  try {
    console.log('=== 开始调试订阅状态 ===');
    const debugResult = await membershipService.debugSubscription();
    
    console.log('=== 调试结果 ===');
    console.log(JSON.stringify(debugResult, null, 2));
    
    // 在控制台展示关键信息
    if (debugResult?.data) {
      const data = debugResult.data;
      
      console.log('\n=== 订阅基本信息 ===');
      console.log('订阅ID:', data.subscription?.id);
      console.log('状态:', data.subscription?.status);
      console.log('当前价格ID:', data.subscription?.current_price_id);
      console.log('下次计费时间:', data.subscription?.current_period_end);
      
      console.log('\n=== Pending Items ===');
      console.log('数量:', data.pending_items?.count);
      console.log('总金额 USD:', data.pending_items?.total_amount_usd);
      if (data.pending_items?.items?.length > 0) {
        console.table(data.pending_items.items);
      }
      
      console.log('\n=== 即将到来的发票 ===');
      console.log('预计金额 USD:', data.upcoming_invoice?.amount_due_usd);
      if (data.upcoming_invoice?.lines?.length > 0) {
        console.table(data.upcoming_invoice.lines);
      }
      
      console.log('\n=== 最近发票历史 ===');
      if (data.recent_invoices?.length > 0) {
        console.table(data.recent_invoices);
      }
      
      // 弹出简化的结果给用户看
      const summary = `
订阅状态调试结果:

基本信息:
- 订阅ID: ${data.subscription?.id}
- 状态: ${data.subscription?.status}
- 下次计费: ${data.subscription?.current_period_end}

Pending Items: ${data.pending_items?.count} 项，总金额: $${data.pending_items?.total_amount_usd}

下期账单预计: $${data.upcoming_invoice?.amount_due_usd}

详细信息请查看浏览器控制台
      `;
      
      Modal.info({
        title: 'Subscription Debug Result',
        content: h('pre', { style: 'white-space: pre-wrap; font-family: monospace; font-size: 12px;' }, summary),
        width: 600,
        okText: 'Got it'
      });
    }
    
  } catch (error) {
    console.error('调试订阅状态失败:', error);
    message.error('Debug failed: ' + error.message);
  }
}

// 清理 pending InvoiceItems
const cleanupPendingItems = async () => {
  try {
    console.log('=== 开始清理 pending InvoiceItems ===');
    const cleanupResult = await membershipService.cleanupPendingItems();
    
    console.log('=== 清理结果 ===');
    console.log(JSON.stringify(cleanupResult, null, 2));
    
    if (cleanupResult?.data) {
      const data = cleanupResult.data;
      
      const summary = `
清理 Pending Items 结果:

${data.message}

详细信息:
- 删除了 ${data.deleted_count} 个升级相关项目
- 保留了 ${data.kept_count} 个其他项目

处理的项目:
${data.items.map(item => 
  `- ${item.action.toUpperCase()}: $${item.amount_usd} - ${item.description}`
).join('\n')}

详细日志请查看浏览器控制台
      `;
      
      Modal.success({
        title: 'Cleanup Completed',
        content: h('pre', { style: 'white-space: pre-wrap; font-family: monospace; font-size: 12px;' }, summary),
        width: 700,
        okText: 'Great!',
        onOk: () => {
          // 清理完成后，建议用户再次调试查看结果
          message.info('建议点击 "Debug Subscription" 查看清理后的状态');
        }
      });
    }
    
  } catch (error) {
    console.error('清理 pending items 失败:', error);
    message.error('Cleanup failed: ' + error.message);
  }
}

// 重置客户余额
const resetCustomerBalance = async () => {
  try {
    console.log('=== 开始重置客户余额 ===');
    
    // 先确认操作
    Modal.confirm({
      title: 'Reset Customer Balance',
      content: 'This will reset your Stripe customer balance to $0.00. This should fix the incorrect billing amount. Are you sure?',
      okText: 'Yes, Reset',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const resetResult = await membershipService.resetCustomerBalance();
          
          console.log('=== 重置结果 ===');
          console.log(JSON.stringify(resetResult, null, 2));
          
          if (resetResult?.data) {
            const data = resetResult.data;
            
            const summary = `
重置客户余额结果:

${data.message}

详细信息:
- 之前余额: $${data.previous_balance_usd}
- 当前余额: $${data.current_balance_usd}
- 调整金额: $${data.adjustment_amount_usd}
- 交易ID: ${data.transaction_id}

现在请点击 "Debug Subscription" 查看更新后的状态
下期账单应该显示正常的 $998.00
            `;
            
            Modal.success({
              title: 'Balance Reset Completed',
              content: h('pre', { style: 'white-space: pre-wrap; font-family: monospace; font-size: 12px;' }, summary),
              width: 600,
              okText: 'Perfect!',
              onOk: () => {
                message.info('建议点击 "Debug Subscription" 查看余额重置后的状态');
              }
            });
          }
        } catch (error) {
          console.error('重置余额失败:', error);
          message.error('Reset failed: ' + error.message);
        }
      }
    });
    
  } catch (error) {
    console.error('重置客户余额失败:', error);
    message.error('Reset failed: ' + error.message);
  }
}

</script>

<style scoped>
/* 你原来的样式保持不变 */
body {
  background-color: #fff;
  color: #000;
}

.save-text {
  color: #0081f2;
  font-size: 14px;
  margin-left: 6px;
}

.monthly-equivalent {
  font-size: 14px;
  color: #888;
  margin-top: 4px;
}

.pricing-page {
  padding: 20px;
  background: #f5f5f5;
  height: 100%;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.title {
  font-size: 36px;
  font-weight: 600;
  margin-bottom: 20px;
}

.billing-toggle {
  display: flex;
  justify-content: center;
  
}

.downgrade-notice {
  margin: 20px auto;
  padding: 16px 20px;
  max-width: fit-content;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.downgrade-notice-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.downgrade-text {
  color: #595959;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  margin: 0;
}

.pricing-cards {
  display: flex;
  justify-content: center;
}

.pricing-cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.pricing-card {
  max-width: 330px;
  min-width: 330px;
  padding:16px;
  border: 1px solid #0000000f;
  background-color: #fff;
  text-align: center;
  border-radius: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .info {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}

.plan-name {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 12px;
}

.price {
  font-size: 32px;
  font-weight: bold;
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  justify-content: center;
  flex-direction: column;
}

.credits {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.subscribe-btn {
  background-color: #000;
  color: #fff;
  border-color: #000;
}

.current-btn{
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  border:unset;
}


.subscribe-btn[disabled] {
  background-color: #f5f5f5 !important;
  /* 禁用状态背景色 */
  color: #999 !important;
  /* 禁用状态文字颜色 */
  border:0px;
  opacity: 1 !important;
  /* 防止 ant 默认 opacity 降低太多 */
}

.subscribe-btn:hover {
  background-color: #fff;
  color: #000;
  border-color: #000;
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.qr-code-container {
  text-align: center;
  display: flex;
    align-items: center;
    flex-direction: column;
}

.benefit-item {
  display: flex;
  justify-content: start;
  gap: 10px;
}

.benefits-list {
  list-style: none;
  padding: 0;
  margin: 20px 0;
  text-align: left;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.benefit-item-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.benefits-list li {
  margin-bottom: 8px;
}

.benefits-list a {
  color: #1890ff;
  text-decoration: underline;
}

.benefits-list .limited {
  color: #e53935;
  font-weight: bold;
  font-size: 12px;
  margin-left: 4px;
}

.cancel-btn {
  position: fixed;
  right: 20px;
  bottom: 20px;
  color: #999;
  font-size: 14px;
}

.cancel-btn:hover {
  color: #000;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .pricing-page {
    padding: 12px;
  }
  .pricing{
    overflow: auto!important;
  }
  .pricing-page{
    height: unset!important;
  }
  .pricing-cards-container{
    display: flex;
    justify-content: center!important;
    gap: 16px;
    align-items: center;
    padding: 0 16px;

    >div{
      width: 100%;
    }
  }

  .title {
    font-size: 28px;
    margin-bottom: 16px;
  }
  
  .billing-toggle {
    margin-bottom: 16px;
  }
  
  .billing-toggle .ant-segmented {
    font-size: 14px;
  }
  

  
  .pricing-card {
    min-width: unset;
    max-width: unset;
    width: 100%;
    padding: 16px;
  }
  
  .plan-name {
    font-size: 18px;
    margin-bottom: 10px;
  }
  
  .price {
    font-size: 28px;
    margin: 16px 0;
  }
  
  .benefits-list {
    margin: 16px 0;
    font-size: 13px;
  }
  
  .benefit-item-icon {
    width: 18px;
    height: 18px;
  }
  
  .payment-option {
    padding: 12px;
    gap: 12px;
  }
  
  .payment-title {
    font-size: 15px;
  }
  
  .payment-description {
    font-size: 12px;
  }
  
  .cancel-btn {
    position: relative!important;
    right: 0px!important;
    bottom: 12px;
    font-size: 13px;
    display: flex;
    justify-content: center;
  }
  
  .downgrade-notice {
    margin: 16px 12px;
    padding: 16px;
    max-width: none;
  }
  
  .downgrade-notice-content {
    flex-direction: column;
    gap: 12px;
  }
  
  .downgrade-text {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .pricing-page {
    padding: 8px;
  }
  
  .title {
    font-size: 24px;
    margin-bottom: 12px;
  }
  
  .pricing-card {
    padding: 12px;
  }
  
  .plan-name {
    font-size: 16px;
    margin-bottom: 8px;
  }
  
  .price {
    font-size: 24px;
    margin: 12px 0;
  }
  
  .save-text {
    font-size: 12px;
  }
  
  .monthly-equivalent {
    font-size: 12px;
  }
  
  .benefits-list {
    margin: 12px 0;
    font-size: 12px;
  }
  
  .benefit-item {
    gap: 8px;
  }
  
  .benefit-item-icon {
    width: 16px;
    height: 16px;
  }
  
  .subscribe-btn {
    padding: 8px 16px;
    font-size: 14px;
  }
  
  .billing-toggle .ant-segmented {
    font-size: 12px;
  }
  
  .downgrade-notice {
    margin: 12px 8px;
    padding: 12px;
  }
  
  .downgrade-notice-content {
    flex-direction: column;
    gap: 10px;
  }
  
  .downgrade-text {
    font-size: 13px;
  }
  
  .payment-option {
    padding: 10px;
    gap: 10px;
  }
  
  .payment-title {
    font-size: 14px;
  }
  
  .payment-description {
    font-size: 11px;
  }
}

/* 升级预览弹窗样式 */
.upgrade-preview-content {
  padding: 8px 0;
}

.upgrade-info,
.pricing-info {
  margin-bottom: 24px;
}

.upgrade-info h4,
.pricing-info h4 {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.upgrade-details,
.pricing-details {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.upgrade-row,
.pricing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.upgrade-row:last-child,
.pricing-row:last-child {
  margin-bottom: 0;
}

.upgrade-row span:first-child,
.pricing-row span:first-child {
  color: #666;
  font-size: 14px;
}

.upgrade-row strong {
  color: #333;
  font-weight: 600;
}

.amount {
  color: #1677ff;
  font-weight: 600;
  font-size: 16px;
}

.points {
  color: #1677ff;
  font-weight: 600;
  font-size: 16px;
}

.confirmation-note {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 12px 16px;
}

.confirmation-note p {
  margin: 0;
  font-size: 14px;
  color: #d46b08;
}

/* 超小屏幕适配 */
@media (max-width: 360px) {
  .pricing-page {
    padding: 6px;
  }
  
  .title {
    font-size: 20px;
  }
  
  .pricing-card {
    padding: 10px;
  }
  
  .price {
    font-size: 20px;
    margin: 10px 0;
  }
  
  .benefits-list {
    font-size: 11px;
  }
  
  .qr-code-container {
    padding: 10px;
  }
  
  .qr-code-container p {
    font-size: 12px;
    margin-top: 10px;
  }
}

/* 支付弹窗移动端优化 */
@media (max-width: 768px) {
  .ant-modal {
    margin: 0 !important;
    max-width: calc(100vw - 32px) !important;
  }
  
  .qr-code-container .ant-qrcode {
    width: 160px !important;
    height: 160px !important;
  }
}

@media (max-width: 480px) {
  .ant-modal {
    margin: 0 !important;
    max-width: calc(100vw - 16px) !important;
  }
  
  .qr-code-container .ant-qrcode {
    width: 140px !important;
    height: 140px !important;
  }
  
  .qr-code-container p {
    font-size: 11px;
  }
}
</style>