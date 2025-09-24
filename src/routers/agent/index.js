// @ts-ignore
const router = require("koa-router")();

router.prefix("/api/agent");

router.use(require('./run.js'));
router.use(require('./proxy.js'));
router.use(require('./chat.js'));
router.use(require('./agent.js'));
router.use(require('./coding.js'));
router.use(require('./coding.sse.js'));

module.exports = router.routes();
