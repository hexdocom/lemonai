const router = require("koa-router")();
const Conversation = require('@src/models/Conversation')

const forwardRequest = require('@src/utils/sub_server_forward_request')


router.get("/list", async (ctx) => {
  let res = await forwardRequest(ctx, "GET", "/api/points_transaction/list")

  for (let item of res.data.list) {
    if (item.source_id) {
      try {
        let conversation = await Conversation.findOne({ where: { conversation_id: item.source_id } })
        if (conversation) {
          item.conversation_title = conversation.dataValues.title
          item.description = conversation.dataValues.title
        }
      } catch (e) {

      }
    }
  }
  return ctx.body = res;
})


module.exports = exports = router.routes();