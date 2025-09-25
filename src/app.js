require("module-alias/register");
require('dotenv').config();
const { logging } = require("@src/logger/index");
global.logging = logging;

const Koa = require('koa')
const app = new Koa()
const json = require('koa-json')
const onerror = require('koa-onerror')
const { koaBody } = require('koa-body');
const logger = require('koa-logger')

const swagger = require('@src/swagger/swagger')  // stores swagger.js, can be configured, I put it in the root directory
const { koaSwagger } = require('koa2-swagger-ui')

const router = require("@src/routers/index");
const wrapContext = require("@src/middlewares/wrap.context");
const setGlobalTokenMiddleware = require('@src/middlewares/setGlobalToken');
const authMiddleware = require('@src/middlewares/auth');

app.use(wrapContext);
// error handler 
onerror(app)

// middlewares
app.use(koaBody({
  multipart: true
}))
app.use(json())
app.use(logger())

app.use(async (ctx, next) => {
  console.log(`Request URL: ${ctx.url}`);
  await next();
});
const path = require('path');

const publicPath = path.join(__dirname, '../public');
app.use(require('koa-static')(publicPath))

// logger
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

app.use(setGlobalTokenMiddleware);
app.use(authMiddleware());

// routes
app.use(router.routes()).use(router.allowedMethods());
app.use(swagger.routes());
app.use(swagger.allowedMethods());
app.use(koaSwagger({
  routePrefix: '/swagger', // interface documentation access address
  swaggerOptions: {
    url: '/swagger.json', // example path to json 其实就是之后swagger-jsdoc生成的文档地址
  }
}))


// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
