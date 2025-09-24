const router = require("koa-router")();
require("module-alias/register");

const agent_remix = require("@src/routers/agent_store/agent_remix");

const Agent = require("@src/models/Agent");
const Knowledge = require('@src/models/Knowledge')
const Conversation = require("@src/models/Conversation");
const { Op } = require("sequelize");

const ALLOWED_SORT_FIELDS = [
  "direct_reference_count",
  "total_reference_count",
  "knowledge_count",
  "experience_iteration_count",
  "create_at"
];

router.get("/", async ({ query, response }) => {
  try {
    // 分页参数
    const page = parseInt(query.page, 10) > 0 ? parseInt(query.page, 10) : 1;
    const pageSize = parseInt(query.page_size, 10) > 0 ? parseInt(query.page_size, 10) : 20;
    const offset = (page - 1) * pageSize;
    const limit = pageSize;

    // 排序参数
    let orderField = "recommend";
    let orderDirection = "DESC";
    if (query && query.order_by && ALLOWED_SORT_FIELDS.includes(query.order_by)) {
      orderField = query.order_by;
    }
    if (query && query.order && ["ASC", "DESC"].includes(query.order.toUpperCase())) {
      orderDirection = query.order.toUpperCase();
    }

    // 构建查询条件
    const where = {
      is_public: true,
      deleted_at: null,
      experience_iteration_count: { [Op.gt]: 0 }
    };

    if (query && query.name) {
      where.name = { [Op.like]: `%${query.name}%` };
    }

    // 构建用户查询条件
    let userWhere = {};
    if (query && query.username) {
      userWhere.user_name = { [Op.like]: `%${query.username}%` };
    }

    // 使用原生SQL查询，修复MySQL语法
    const sequelize = Agent.sequelize;

    // 构建WHERE条件
    let whereConditions = ['a.is_public = 1', 'a.experience_iteration_count > 0', 'a.deleted_at IS NULL', 'a.recommend != -1'];
    let replacements = {};

    if (query && query.name) {
      whereConditions.push('a.name LIKE :name');
      replacements.name = `%${query.name}%`;
    }

    if (query && query.username) {
      whereConditions.push('u.user_name LIKE :username');
      replacements.username = `%${query.username}%`;
    }

    // 统计总数
    const countSql = `
      SELECT COUNT(*) AS count 
      FROM agent a
      LEFT JOIN sys_user u ON a.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    // 查询数据
    const dataSql = `
      SELECT a.*, u.user_name as username 
      FROM agent a
      LEFT JOIN sys_user u ON a.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY a.${orderField} ${orderDirection}
      LIMIT :limit OFFSET :offset
    `;

    // 执行查询
    const countResult = await sequelize.query(countSql, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    const dataReplacements = { ...replacements, limit, offset };
    const rows = await sequelize.query(dataSql, {
      replacements: dataReplacements,
      type: sequelize.QueryTypes.SELECT
    });

    const total = parseInt(countResult[0].count, 10);

    return response.success({
      data: rows,
      pagination: {
        total,
        page,
        page_size: pageSize,
        total_page: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error('Agent store query error:', error);
    return response.fail({}, "Failed to get agent list");
  }
});



//查询最后一条 conversations 的ID 根据agent_id
router.get("/last/:agent_id", async ({ state, params, response }) => {
  const { agent_id } = params;
  //先判断 agent 是不是 公开的
  const agent = await Agent.findOne({
    where: { id: agent_id, is_public: true },
  });
  if (!agent) {
    return response.fail("Agent does not exist");
  }
  const conversations = await Conversation.findOne({
    where: { 
      agent_id,
      status: 'done',
      deleted_at: null  // 过滤已删除的记录
    },
    order: [["id", "DESC"]],
  });
  return response.success(conversations);
})

router.post("/remix", async ({ state, request, response }) => {
  const { agent_id } = request.body
  const user_id = state.user.id

  try {
    let new_agent = await agent_remix(agent_id,user_id)
    return response.success(new_agent)
  } catch (e) {
    console.log(e)
    return response.fail({}, e)
  }
})

module.exports = exports = router.routes();