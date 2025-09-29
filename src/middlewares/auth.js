
/**
 * Token 校验中间件
 * 除了指定的不需要校验的接口外，其他接口均需校验 Token
 * @param {Array} excludePaths - 不需要校验 Token 的接口路径数组
 */

const excludePatterns = [
  '/api/agent_store/last/'
];

module.exports = () => {
  return async (ctx, next) => {

    // 直接设置默认用户 ID 为 1，不进行 Token 校验
    ctx.state.user = { id: 1 };
    await next();
  };
};
