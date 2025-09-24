const Router = require("koa-router");
const router = new Router();

const resolveConversation = require('./memory.js');

router.get("/conversation", async ({ request, response }) => {
  const { conversation_id } = request.query;
  const conversation = await resolveConversation(conversation_id);

  // @ts-ignore
  return response.success(conversation);
});

module.exports = exports = router.routes();