// @ts-ignore
const router = require("koa-router")();
const { coding } = require("@src/editor/coding.js");

// 接口地址: /api/agent/coding/ai

router.post("/coding/ai", async (ctx, next) => {
  const { request, response } = ctx;
  const body = request.body || {};
  const { user_id } = ctx.state.user;
  const { conversation_id, selection, requirement, filepath } = body;
  console.log('conversation_id', conversation_id);

  const params = {
    selection,
    requirement
  }
  const context = { user_id, filepath, conversation_id }
  try {
    await coding(params, context);
  } catch (error) {
    console.error(error);
    response.error(error.message);
    return;
  }

  response.success({
    status: 'success'
  })
});

module.exports = exports = router.routes();