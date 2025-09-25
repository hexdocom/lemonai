<template>
    <a-modal v-model:open="visible" width="720px" centered :footer="null" title="Buy add-on credits">
        <!-- 原来的内容 -->
        <div v-if="rechargeProducts.length" class="recharge-products">
            <div v-for="item in rechargeProducts" :key="item.id" class="product-card">
                <div class="product-title">{{ item.product_name }}</div>
                <div class="product-info">
                    <p style="margin-top: 8px;">{{ currency }} {{ item.amount }}</p>
                    <p>{{ item.points_awarded }}{{ t('member.pointsUnit') }}</p>
                </div>
                <button size="small" :loading="loading" @click="handleBuy(item)">
                    {{ t('member.buyNow') }}
                </button>
            </div>
        </div>
        <div v-else>{{ t('member.noPackagesAvailable') }}</div>

        <!-- 扫码支付弹窗 -->
        <a-modal v-model:open="showQrCode" :title="t('member.wechatScanToPay')" centered :footer="null">
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
                <div style="display: inline-block;">
                    <a-qrcode :value="qrCodeUrl" :size="200" />
                </div>
                <p style="margin-top: 12px;">{{ t('member.wechatScanPrompt') }}</p>
            </div>
        </a-modal>

        <!-- 支付方式选择 -->
        <a-modal v-model:open="showPaymentMethodModal" :footer="null" centered width="480"
            :title="$t('member.selectPaymentMethod')">
            <div style="display: flex; flex-direction: column; gap: 16px; padding: 12px 4px;">
                <div class="payment-option" @click="handlePayment('stripe')">
                    <StripeLogo />
                    <div class="payment-content">
                        <div class="payment-title">{{ $t('payment.stripe.title') }}</div>
                        <div class="payment-description">{{ $t('payment.stripe.description') }}</div>
                    </div>
                </div>
                <div class="payment-option" @click="handlePayment('wechat')">
                    <WechatLogo />
                    <div class="payment-content">
                        <div class="payment-title">{{ $t('payment.wechat.title') }}</div>
                        <div class="payment-description">{{ $t('payment.wechat.description') }}</div>
                    </div>
                </div>
            </div>
        </a-modal>
    </a-modal>
</template>
<script setup>
import { ref, onMounted, computed } from 'vue'
import auth from '@/services/auth';
import membershipService from '@/services/membership'

// --- 国际化引入 ---
import { useI18n } from 'vue-i18n'
const { t } = useI18n()


import dayjs from 'dayjs'
import { useRouter } from "vue-router";
const router = useRouter();
import { message } from 'ant-design-vue';

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user.js'
const userStore = useUserStore();
const { user, membership, points } = storeToRefs(userStore);

import StripeLogo from '@/assets/svg/stripe.svg'
import WechatLogo from '@/assets/svg/wechatpay.svg'

const props = defineProps({
    open: {
        type: Boolean,
        default: false
    }
})
const emit = defineEmits(['update:open'])

const visible = computed({
    get: () => props.open,
    set: (val) => emit('update:open', val),
})

const showQrCode = ref(false)
const qrCodeUrl = ref('')
const showPaymentMethodModal = ref(false)
const selectedPlan = ref(null)
const pollingTimer = ref(null)
const loading = ref(false)

const currency = computed(() => {
    return '$';
})


const rechargeProducts = ref([])

const handleBuy = async (item) => {
    // handlePayment('stripe')
    showPaymentMethodModal.value = true
    selectedPlan.value = item
}


onMounted(async () => {
    await toPoints()
})

const toPoints = async () => {
    let res = await membershipService.getRechargeProductList()
    rechargeProducts.value = res || []
};

const handlePayment = async (method) => {
    showPaymentMethodModal.value = false
    loading.value = true

    if (method === 'stripe') {
        let res = await membershipService.createStripePointPurchaseOrder(selectedPlan.value.id)
        window.location.href = res.url;
        loading.value = false
    } else {
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

</script>
<style scoped>
.recharge-products {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    background-color: #f8f8f7;
    padding: 24px;
    justify-content: space-between;
}

.product-card {
    width: calc(33.333% - 11px);
    /* 3列布局，减去间距 */
    border: 1px solid #f0f0f0;
    background-color: #fff;
    border-radius: 8px;
    padding: 16px;
    box-sizing: border-box;
    text-align: center;
    /* 文字居中 */
    transition: box-shadow 0.3s;
}

.product-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>