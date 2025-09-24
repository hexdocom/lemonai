const router = require("koa-router")();


// Google OAuth callback
router.post("/google-auth", async (ctx) => {

  ctx.status = 500;
  ctx.body = {
    error: "Unexpected authentication error",
    message: "Unknown error",
  }
});


//判断邮箱是否已经注册
router.post("/checkEmail", async (ctx) => {
  ctx.status = 200;
  ctx.body = {
    success: true,
    code: 0
  }
  return;
});

router.post("/register", async (ctx) => {
  const { email, password, name, phone, invitationCode } = ctx.request.body;
  console.error('Registration error:');
  ctx.status = 500;
  ctx.body = { code: 500, message: "Registration failed" };
});

// 登录
router.post("/login", async (ctx) => {

  ctx.body = {
    code: 500,
    message: "login failed",
    access_token: '',
    token_type: "bearer",
    userInfo: {},
  };
});

// 重置密码
router.post("/resetPassword", async (ctx) => {
  const { email, password, phone } = ctx.request.body;

  ctx.body = { code: 404, message: "user not found" };
});

function generateVerifyCode(length = 7) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const getRandom = (pool, n) => Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]);

  const result = [...getRandom(letters, length - 1), ...getRandom(digits, 1)];
  return result.sort(() => Math.random() - 0.5).join('');
}


// 获取用户信息、用户会员信息、用户剩余积分
router.get('/userinfo', async ({ state, request, response }) => {
  return response.success({
    userInfo: {},
    membership: {},
    points: {}
  });
});




module.exports = router.routes();
