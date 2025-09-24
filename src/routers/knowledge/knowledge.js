const router = require("koa-router")();
const Knowledge = require("@src/models/Knowledge");
const { Op } = require('sequelize')

// 新增 Knowledge
router.post("/", async ({ state, request, response }) => {
  const body = request.body || {};
  const { content = '', category = '', agent_id } = body;
  try {
    const knowledge = await Knowledge.create({
      user_id: state.user.id,
      agent_id,
      content,
      category,
    });
    return response.success(knowledge);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to create knowledge");
  }
});

// 获取 Knowledge 列表
router.get("/", async ({ state, query, response }) => {
  const { agent_id } = query
  try {
    const knowledges = await Knowledge.findAll({
      where: { user_id: state.user.id, agent_id },
      order: [['update_at', 'DESC']]
    });

    let personal = []
    let system = []
    for (let item of knowledges) {
      if (item.dataValues.is_learned) {
        system.push(item)
      } else {
        personal.push(item)
      }
    }

    return response.success({ personal, system });
  } catch (error) {
    console.error(error);
    return response.fail("Failed to get knowledge list");
  }
});

// 获取单个 Knowledge
router.get("/detail/:id", async ({ state, params, response }) => {
  const { id } = params;
  try {
    const knowledge = await Knowledge.findOne({
      where: { id, user_id: state.user.id },
    });
    if (!knowledge) {
      return response.fail("Knowledge does not exist");
    }
    return response.success(knowledge);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to get knowledge");
  }
});

// 更新 Knowledge
router.put("/:id", async ({ state, params, request, response }) => {
  const { id } = params;
  const body = request.body || {};
  const { content, category } = body;
  try {
    const knowledge = await Knowledge.findOne({
      where: { id, user_id: state.user.id },
    });
    if (!knowledge) {
      return response.fail("Knowledge does not exist");
    }
    const updateFields = {};
    if (content !== undefined) updateFields.content = content;
    if (category !== undefined) updateFields.category = category;
    knowledge.set(updateFields);
    await knowledge.save();
    return response.success(knowledge);
  } catch (error) {
    console.error(error);
    return response.fail("Failed to update knowledge");
  }
});

// 删除 Knowledge
router.delete("/:id", async ({ state, params, response }) => {
  const { id } = params;
  try {
    const knowledge = await Knowledge.findOne({
      where: { id, user_id: state.user.id },
    });
    if (!knowledge) {
      return response.fail("Knowledge does not exist");
    }
    await knowledge.destroy();
    return response.success("Knowledge deleted successfully");
  } catch (error) {
    console.error(error);
    return response.fail("Failed to delete knowledge");
  }
});

module.exports = exports = router.routes();
