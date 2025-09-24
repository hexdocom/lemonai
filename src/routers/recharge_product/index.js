const router = require("koa-router")();

router.prefix("/api/recharge_product");

const modules = [
  "recharge_product",
]

for (const module of modules) {
  try {
    router.use(require(`./${module}.js`));
  }
  catch (error) { console.log(`load ${module} error`, error); }
}

module.exports = router.routes();