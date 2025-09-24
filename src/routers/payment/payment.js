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

module.exports = exports = router.routes();