const router = require("koa-router")();

const forwardRequest = require('@src/utils/sub_server_forward_request')

router.get("/userinfo",async (ctx) => {
  let res =  await forwardRequest(ctx, "GET", "/api/users/userinfo")
  return ctx.body = res;
})

router.post("/google-auth", async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/users/google-auth")
  return ctx.body = res;
});



//loginSMSCode
router.post("/login-sms-code", async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/users/login-sms-code")
  return ctx.body = res;
});

//send-sms-code
router.post("/send-sms-code", async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/users/send-sms-code")
  return ctx.body = res;
});
//verifySmsVerifyCode
router.post("/verifySmsVerifyCode", async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/users/verifySmsVerifyCode")
  return ctx.body = res;
});
///api/users/updateUsername
router.post("/updateUsername", async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/users/updateUsername")
  return ctx.body = res;
});

router.post("/sendEmailVerifyCode", async (ctx) => {
  let res =  await forwardRequest(ctx, "POST", "/api/users/sendEmailVerifyCode")
  return ctx.body = res;
});

router.post("/verifyEmailVerifyCode", async (ctx) => {
  return ctx.body =  await forwardRequest(ctx, "POST", "/api/users/verifyEmailVerifyCode")
});

router.post("/register", async (ctx) => {
  return ctx.body =  await forwardRequest(ctx, "POST", "/api/users/register")
});

//login
router.post("/login", async (ctx) => {
  return ctx.body = await forwardRequest(ctx, "POST", "/api/users/login")
});

//resetPassword
router.post("/resetPassword", async (ctx) => {
  return ctx.body =  await forwardRequest(ctx, "POST", "/api/users/resetPassword")
});

router.get('/auth/google', async (ctx) => {
  const query = ctx.query;
  const queryString = new URLSearchParams(query).toString();

  // 读取环境变量，判断是不是客户端
  // 注意：这里服务端要能读取 import.meta.env 需要相应配置，或者通过 process.env 传递
  // 如果你用的是 Vite + SSR，可能要从 ctx.env 或者其他地方拿
  // 这里假设你用 process.env.VITE_IS_CLIENT 替代
  const isClient = process.env.VITE_IS_CLIENT === 'true';
  console.log("isClient === ",isClient);
  if (isClient) {
    // 是客户端，返回 HTML 页面
    const clientRedirectUrl = `http://localhost:51789/?${queryString}`;

    ctx.set('Content-Type', 'text/html; charset=utf-8');
    ctx.body = `
      <html>
        <head><title>登录成功</title></head>
        <body>
          <h2>登录成功，正在通知客户端，请稍候...</h2>
          <script>
            fetch("${clientRedirectUrl}", {
              method: "GET",
              mode: "no-cors"
            }).catch(() => {});
          </script>
        </body>
      </html>
    `;
  } else {
    // 不是客户端，直接重定向到前端页面
    const redirectUrl = `http://localhost:5005/auth/google${queryString ? '?' + queryString : ''}`;
    ctx.redirect(redirectUrl);
  }
});


module.exports = router.routes();
