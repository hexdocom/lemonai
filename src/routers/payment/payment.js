const router = require("koa-router")();

const forwardRequest = require('@src/utils/sub_server_forward_request')

router.post("/create_mambership_plan_order", async (ctx) => {
  let res = await forwardRequest(ctx, "POST", "/api/payment/create_mambership_plan_order")
  return ctx.body = res;
})

//create_point_purchase_order
router.post("/create_point_purchase_order", async (ctx) => {
  let res = await forwardRequest(ctx, "POST", "/api/payment/create_point_purchase_order")
  return ctx.body = res;
})

router.get("/check_order_status", async (ctx) => {
  let res = await forwardRequest(ctx, "GET", "/api/payment/check_order_status")
  return ctx.body = res;
})

//check_order_status_by_id
router.get("/check_order_status_by_id", async (ctx) => {
  let res = await forwardRequest(ctx, "GET", "/api/payment/check_order_status_by_id")
  return ctx.body = res;
})

//create_membership_upgrade_order
router.post("/create_membership_upgrade_order", async (ctx) => {
  let res = await forwardRequest(ctx, "POST", "/api/payment/create_membership_upgrade_order")
  return ctx.body = res;
})


// /strip/create_mambership_plan_order
router.post("/strip/create_mambership_plan_order",async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/payment/strip/create_mambership_plan_order")
  return ctx.body = res;
})
// /strip/create_point_purchase_order
router.post("/strip/create_point_purchase_order",async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/payment/strip/create_point_purchase_order")
  return ctx.body = res;
})
// payment/strip/checkout-session
router.get("/strip/checkout-session",async (ctx) => {
  let res =  await forwardRequest(ctx, "GET", "/api/payment/strip/checkout-session")
  return ctx.body = res;
})

//get_subscription_info
router.get("/strip/get_subscription_info",async (ctx) => {
  let res =  await forwardRequest(ctx, "GET", "/api/payment/strip/get_subscription_info")
  return ctx.body = res;
})

//cancel_subscription post
router.post("/strip/cancel_subscription",async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/payment/strip/cancel_subscription")
  return ctx.body = res;
})

//reactivate_subscription
router.post("/strip/reactivate_subscription",async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/payment/strip/reactivate_subscription")
  return ctx.body = res;
})

//upgrade_subscription
router.post("/strip/upgrade_subscription",async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/payment/strip/upgrade_subscription")
  return ctx.body = res;
})

//preview_upgrade
router.post("/strip/preview_upgrade",async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/payment/strip/preview_upgrade")
  return ctx.body = res;
})

//downgrade_subscription
router.post("/stripe/downgrade_subscription",async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/payment/stripe/downgrade_subscription")
  return ctx.body = res;
})

//cancel_downgrade
router.post("/stripe/cancel_downgrade",async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/payment/stripe/cancel_downgrade")
  return ctx.body = res;
})





module.exports = exports = router.routes();