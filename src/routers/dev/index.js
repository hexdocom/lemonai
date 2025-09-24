const Router = require("koa-router");
const router = new Router();

router.prefix("/api/dev");

router.use(require(`./conversation.js`));

module.exports = router.routes();