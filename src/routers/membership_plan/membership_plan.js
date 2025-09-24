const router = require("koa-router")();

const MembershipPlanTable = require("@src/models/MembershipPlan");

router.get("/list", async ({ response }) => {
    const list = await MembershipPlanTable.findAll({
    });

    return response.success(list);
});




module.exports = exports = router.routes();