import http from '@/utils/http.js'

const service = {
  async getList() {
    const uri = '/api/membership_plan/list'
    const res = await http.get(uri)
    return res
  },

  ///api/payment/create_mambership_plan_order
  async createOrder(planId) {
    const uri = '/api/payment/create_mambership_plan_order'
    const res = await http.post(uri, {
      membership_plan_id: planId
    })
    return res
  },
  //create_point_purchase_order
  async createPointPurchaseOrder(product_id) {
    const uri = '/api/payment/create_point_purchase_order'
    const res = await http.post(uri, {
      product_id: product_id
    })
    return res
  },

  ///strip/create_point_purchase_order
  async createStripeOrder(planId) {
    const uri = '/api/payment/strip/create_mambership_plan_order'
    const res = await http.post(uri, {
      membership_plan_id:planId,
      from_client: "web"
    })
    return res
  },
  //stripe/create_point_purchase_order
  async createStripePointPurchaseOrder(product_id) {
    const uri = '/api/payment/strip/create_point_purchase_order'
    const res = await http.post(uri, {
      product_id: product_id,
      from_client: "web"
    })
    return res
  },
  ///strip/checkout-session
  async createStripeCheckoutSession(sessionId) {
    const uri = '/api/payment/strip/checkout-session'
    const res = await http.get(uri, {
      session_id: sessionId
    })
    return res
  },
  ////check_order_status?order_sn
  async checkOrderStatus(orderSn) {
    const uri = '/api/payment/check_order_status'
    const res = await http.get(uri, {
      order_sn: orderSn
    })
    return res
  },
  //check_order_status_by_id
  async checkOrderStatusById(orderId) {
    const uri = '/api/payment/check_order_status_by_id'
    const res = await http.get(uri, {
      order_id: orderId
    })
    return res
  },
  //points_transaction
  async getPointsTransactionList(Query) {
    const uri = '/api/points_transaction/list'
    const res = await http.get(uri,Query)
    return res
  },
  //order list
  async getOrderList(Query) {
    const uri = '/api/order/list'
    const res = await http.get(uri,Query)
    return res
  },
  //recharge_product/list
  async getRechargeProductList() {
    const uri = '/api/recharge_product/list'
    const res = await http.get(uri)
    return res
  },
  //get_subscription_info
  async getSubscriptionInfo() {
    const uri = '/api/payment/strip/get_subscription_info'
    const res = await http.get(uri)
    return res
  },
  //strip/cancel_subscription
  async cancelSubscription(params) {
    const uri = '/api/payment/strip/cancel_subscription'
    const res = await http.post(uri,params)
    return res
  },
  //strip/reactivate_subscription
  async reactivateSubscription(params) {
    const uri = '/api/payment/strip/reactivate_subscription'
    const res = await http.post(uri,params)
    return res
  },
  //upgrade_subscription
  async upgradeSubscription(params) {
    const uri = '/api/payment/strip/upgrade_subscription'
    const res = await http.post(uri,params)
    return res
  },
  //downgrade_subscription
  async downgradeSubscription(params) {
    const uri = '/api/payment/stripe/downgrade_subscription'
    const res = await http.post(uri,params)
    return res
  },

  //stripe/cancel_downgrade
  async cancelDowngrade(params) {
    const uri = '/api/payment/stripe/cancel_downgrade'
    const res = await http.post(uri,params)
    return res
  },

  //strip/preview_upgrade
  async previewUpgrade(params) {
    const uri = '/api/payment/strip/preview_upgrade'
    const res = await http.post(uri,params)
    return res
  },

  //create_membership_upgrade_order
  async createMembershipUpgradeOrder(params) {
    const uri = '/api/payment/create_membership_upgrade_order'
    const res = await http.post(uri,params)
    return res
  },

  //stripe/payment_failure_reason - 查询支付失败原因
  async getPaymentFailureReason(subscriptionId) {
    const uri = '/api/payment/stripe/payment_failure_reason'
    const res = await http.get(uri, {
      subscription_id: subscriptionId
    })
    return res
  },

  //stripe/debug_subscription - 调试订阅状态
  async debugSubscription(subscriptionId = null) {
    const uri = '/api/payment/stripe/debug_subscription'
    const params = subscriptionId ? { subscription_id: subscriptionId } : {}
    const res = await http.get(uri, params)
    return res
  },

  //stripe/cleanup_pending_items - 清理 pending InvoiceItems
  async cleanupPendingItems() {
    const uri = '/api/payment/stripe/cleanup_pending_items'
    const res = await http.post(uri, {})
    return res
  },

  //stripe/reset_customer_balance - 重置客户余额
  async resetCustomerBalance() {
    const uri = '/api/payment/stripe/reset_customer_balance'
    const res = await http.post(uri, {})
    return res
  },
  
}

export default service