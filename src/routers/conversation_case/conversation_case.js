const router = require("koa-router")();
require("module-alias/register");

const Conversation = require("@src/models/Conversation");
const { Op } = require("sequelize");

const ALLOWED_SORT_FIELDS = [
  "create_at",
  "recommend"
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

    const sequelize = Conversation.sequelize;
    // 构建WHERE条件
    let whereConditions = ['c.is_public = 1', 'c.deleted_at IS NULL', 'c.recommend != -1'];
    let replacements = {};

    if (query && query.name) {
      whereConditions.push('c.title LIKE :name');
      replacements.name = `%${query.name}%`;
    }

    // 统计总数
    const countSql = `
      SELECT COUNT(*) AS count 
      FROM conversation c
      WHERE ${whereConditions.join(' AND ')}
    `;

    // 查询数据
    const dataSql = `
      SELECT c.*
      FROM conversation c
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.${orderField} ${orderDirection}
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
    console.error(error);
    return response.fail({}, "Failed to get conversation list");
  }
});

module.exports = exports = router.routes();