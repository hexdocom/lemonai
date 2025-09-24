const router = require("koa-router")();

// 获取 category 列表
router.get("/categories", async ({ state, response }) => {
  return response.success(['core_directive', 'user_profile', 'planning', 'execution']);
});


module.exports = exports = router.routes();
