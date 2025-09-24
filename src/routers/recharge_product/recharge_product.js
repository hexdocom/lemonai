const router = require("koa-router")();
const axios = require("axios");
const SUB_SERVER_DOMAIN = process.env.SUB_SERVER_DOMAIN || 'https://app.lemonai.ai';
const forwardRequest = require('@src/utils/sub_server_forward_request')


router.get("/list",async (ctx) => {
  let res =  await forwardRequest(ctx, "GET", "/api/recharge_product/list")
  return ctx.body = res;
})


module.exports = exports = router.routes();