const router = require("koa-router")();
const forwardRequest = require('@src/utils/sub_server_forward_request')

router.get("/list", async (ctx) => {
  let res = await forwardRequest(ctx, "GET", "/api/order/list")
  return ctx.body = res;
})

module.exports = exports = router.routes();