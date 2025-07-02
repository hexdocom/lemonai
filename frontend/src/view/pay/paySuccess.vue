<template>
    <div style="max-width: 600px; margin: 60px auto; text-align: center;">
      <a-spin :spinning="loading" :tip="$t('loadingTip')">
        <template v-if="orderLoaded">
          <a-result
            :status="resultStatus"
            :title="resultTitle"
            :sub-title="resultSubtitle"
          >
            <template #extra>
              <a-button v-if="!fromClient" type="primary" @click="goHome">{{ $t('backHome') }}</a-button>
            </template>
          </a-result>
  
          <a-card v-if="showOrderInfo" :title="$t('orderInfo')" style="margin-top: 24px; text-align: left;">
            <p><strong>{{ $t('orderId') }}：</strong>{{ order_sn }}</p>
            <p><strong>{{ $t('paymentAmount') }}：</strong>
              {{ order.amount_total && order.currency ? formatAmount(order.amount_total, order.currency) : $t('unknown') }}
            </p>
            <p><strong>{{ $t('orderStatus') }}：</strong>
              <a-tag :color="orderStatusColor(orderStatus)">
                {{ statusText(orderStatus) }}
              </a-tag>
            </p>
          </a-card>
        </template>
  
        <template v-else-if="error">
          <a-alert type="error" :message="$t('loadFailed')" show-icon />
        </template>
      </a-spin>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { message } from 'ant-design-vue'
  import membershipService from '@/services/membership'
  import { useI18n } from 'vue-i18n'
  
  const { t } = useI18n()
  
  const route = useRoute()
  const router = useRouter()
  
  const loading = ref(true)
  const error = ref(false)
  const order = ref({})
  const orderStatus = ref('checking') // 初始为“checking”，表示正在获取中
  const pollingTimer = ref(null)
  
  const terminalStates = ['pending', 'paid', 'cancelled', 'failed']
  const zeroDecimalCurrencies = ['JPY', 'KRW']
  
  const orderLoaded = ref(false)
  const showOrderInfo = ref(false)
  const order_sn = ref('')

  //是否来自客户端
  const fromClient = computed(() => {
    const from = route.query.from
    return from === 'desktop'
  })
  
  function formatAmount(amount, currency) {
    if (!currency) return `${amount}（${t('unknownCurrency')}）`
    const upperCurrency = currency.toUpperCase()
    const isZeroDecimal = zeroDecimalCurrencies.includes(upperCurrency)
    const value = isZeroDecimal ? amount : amount / 100
    return `${value.toFixed(2)} ${upperCurrency}`
  }
  
  function paymentStatusColor(status) {
    switch (status) {
      case 'paid': return 'green'
      case 'unpaid': return 'red'
      default: return 'default'
    }
  }
  
  function orderStatusColor(status) {
    switch (status) {
      case 'paid': return 'green'
      case 'pending': return 'orange'
      case 'cancelled':
      case 'failed': return 'red'
      case 'checking': return 'blue'
      default: return 'default'
    }
  }
  
  function statusText(status) {
    const map = {
      checking: t('status.checking'),
      paid: t('status.paid'),
      pending: t('status.pending'),
      cancelled: t('status.cancelled'),
      failed: t('status.failed')
    }
    return map[status] || status
  }
  
  const resultStatus = computed(() => {
    switch (orderStatus.value) {
      case 'paid': return 'success'
      case 'pending': return 'warning'
      case 'cancelled':
      case 'failed': return 'error'
      case 'checking': return 'info'
      default: return 'info'
    }
  })
  
  const resultTitle = computed(() => {
    switch (orderStatus.value) {
      case 'paid': return t('resultTitle.paid')
      case 'pending': return t('resultTitle.pending')
      case 'cancelled': return t('resultTitle.cancelled')
      case 'failed': return t('resultTitle.failed')
      case 'checking': return t('resultTitle.checking')
      default: return t('resultTitle.unknown')
    }
  })
  
  const resultSubtitle = computed(() => {
    if (['paid', 'pending', 'cancelled', 'failed'].includes(orderStatus.value)) {
      return t('resultSubtitle.submitted')
    }
    return ''
  })
  
  async function pollOrderStatus(orderId) {
    pollingTimer.value = setInterval(async () => {
      try {
        const res = await membershipService.checkOrderStatusById(orderId)
        const status = res?.status
        if (status) {
          orderStatus.value = status
          if (terminalStates.includes(status)) {
            showOrderInfo.value = true
            order_sn.value = res.order_sn
            //根据url 中的 参数 from 判断是否是客户端
            if(orderStatus.value === 'paid'){
              clearInterval(pollingTimer.value)
              pollingTimer.value = null
            }
            const from = route.query.from
            if(from === 'desktop' && orderStatus.value === 'paid'){
              notifyClient("paid")
            }

          }
        }
      } catch (err) {
        console.error('轮询订单状态失败：', err)
      }
    }, 3000)
  }
  
  const fetchOrder = async () => {
    const sessionId = route.query.session_id
    if (!sessionId) {
      error.value = true
      loading.value = false
      return
    }
  
    try {
      const res = await membershipService.createStripeCheckoutSession(sessionId)
      order.value = res.session
      orderLoaded.value = true
  
      const orderId = order.value?.metadata?.order_id
      if (orderId) {
        pollOrderStatus(orderId)
      } else {
        showOrderInfo.value = true
        loading.value = false
      }
    } catch (err) {
      console.error(err)
      message.error(t('fetchFailed'))
      error.value = true
    } finally {
      loading.value = false
    }
  }
  
  const goHome = () => {
    router.push('/')
  }
  
  onMounted(
    () => {
      fetchOrder()
    }
  )
  
  onBeforeUnmount(() => {
    if (pollingTimer.value) clearInterval(pollingTimer.value)
  })

  //通知客户端 支付成功 使用自定义协议
  const notifyClient = (status) => {
    const deeplink = `lemonai://pay-result?orderId=${order.value.id}&amount=${order.value.amount_total}&currency=${order.value.currency}&status=${status}`
    window.location.href = deeplink
  }
  </script>
  