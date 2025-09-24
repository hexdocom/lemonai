const router = require("koa-router")();

const UserProviderConfig = require("@src/models/UserProviderConfig");
const UserSearchSetting = require("@src/models/UserSearchSetting");
const SearchProviderTable = require("@src/models/SearchProvider");
const TalivySearch = require("@src/tools/impl/web_search/TalivySearch");
const LocalSearch = require("@src/tools/impl/web_search/LocalSearch");
const CloudswaySearch = require("@src/tools/impl/web_search/CloudswaySearch");
// upsert user provider config
/**
 * @swagger
 * /api/search_provider_setting:
 *   put:
 *     summary: Upsert user provider config
 *     tags:
 *       - SearchProviderSetting
 *     description: This endpoint upserts user provider config with the provided content.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider_id:
 *                 type: integer
 *                 description: Search provider id
 *               api_key:
 *                 type: string
 *                 description: Search provider api key
 *               endpoint:
 *                 type: string
 *                 description: Search provider endpoint
 *               include_date:
 *                 type: boolean
 *                 description: Include date in search
 *               cover_provider_search:
 *                 type: boolean
 *                 description: Cover provider search
 *               enable_enhanced_mode:
 *                 type: boolean
 *                 description: Enable enhanced mode
 *               result_count:
 *                 type: integer
 *                 description: Result count
 *               blacklist:
 *                 type: string
 *                 description: Blacklist
 *     responses:
 *       200:
 *         description: Successfully upserted user provider config
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/provider_setting_result.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *
 */
router.put("/", async (ctx) => {
    const {
        provider_id,
        api_key,
        endpoint,
        include_date,
        cover_provider_search,
        enable_enhanced_mode,
        result_count,
        blacklist
    } = ctx.request.body;

    const user_id = ctx.state.user.id

    // Validate input
    if (!provider_id) {
        ctx.body = { code: 400, msg: "Provider ID is required" };
        return;
    }

    // Check if the provider exists
    const provider = await SearchProviderTable.findByPk(provider_id);
    if (!provider) {
        ctx.body = { code: 404, msg: "Provider not found" };
        return;
    }

    // 检查用户提供者配置表中是否存在记录
    const userConfig = await UserSearchSetting.findOne({
        where: { user_id } // if create user provider config, there be only one record
    });
    let config = null;
    if (!userConfig) {
        // 添加新的配置项
        [config] = await UserSearchSetting.upsert({
            provider_id,
            include_date,
            cover_provider_search,
            enable_enhanced_mode,
            result_count,
            blacklist,
            user_id,
        });
    } else {
        console.log('provider_id', provider_id)
        // 更新新的配置项
        await userConfig.update({
            provider_id,
            include_date,
            cover_provider_search,
            enable_enhanced_mode,
            result_count,
            blacklist,
        });
        config = userConfig;
    }
    console.log(api_key)
    // 更新和创建用户提供者配置表中的记录
    let [userProviderConfig, created] = await UserProviderConfig.findOrCreate({
        where: { provider_id: provider_id, user_id },
        defaults: {
        }
    });
    // update api_key 通过provider_id 更新。如果endpoint不为空，则也更新endpoint
    if (endpoint !== undefined && endpoint !== "") {
        await userProviderConfig.update({
            base_config: { api_key, endpoint }
        }, { where: { provider_id: provider_id, user_id } })
    } else if (api_key !== undefined && api_key !== "") {
        await userProviderConfig.update({
            base_config: { api_key }
        }, { where: { provider_id: provider_id, user_id } })
    }
    const requestBody = Object.assign({
        provider_id: provider_id,
        base_config: userProviderConfig.base_config,
        provider_name: provider.name,
        logo_url: provider.logo_url
    }, config.dataValues)

    ctx.body = { code: 200, data: requestBody, msg: "Successfully upserted user provider config" };
});

// Get user provider config
/**
 * @swagger
 * /api/search_provider_setting:
 *   get:
 *     summary: Get user provider config
 *     tags:
 *       - SearchProviderSetting
 *     description: This endpoint retrieves the user provider config.
 *     responses:
 *       200:
 *         description: Successfully retrieved user provider config
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/provider_setting_result.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get("/", async (ctx) => {

    // Get user provider config
    const user_id = ctx.state.user.id
    const config = await UserSearchSetting.findOne({ where: { user_id } });

    if (!config) {
        ctx.body = { code: 1, msg: "User provider config not found" };
        return;
    }
    const userProviderConfig = await UserProviderConfig.findOne({
        where: { provider_id: config.provider_id, user_id }
    })
    const provider = await SearchProviderTable.findByPk(config.provider_id);
    if (!provider) {
        ctx.body = { code: 404, msg: "Provider not found" };
        return;
    }
    const requestBody = Object.assign({
        provider_name: provider.name,
        logo_url: provider.logo_url,
        base_config: userProviderConfig.dataValues.base_config
    }, config.dataValues);
    ctx.body = { code: 200, data: requestBody, msg: "Successfully retrieved user provider config" };
});


// Get current provider config list
/**
 * @swagger
 * /api/search_provider_setting/provider:
 *   get:
 *     summary: Get provider list
 *     tags:
 *       - SearchProviderSetting
 *     description: This endpoint retrieves the provider list.
 *     responses:
 *       200:
 *         description: Successfully retrieved provider list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/provider.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get("/configs", async (ctx) => {
    const user_id = ctx.state.user.id
    const providers = await UserProviderConfig.findAll({ where: { user_id } });
    ctx.body = { code: 200, data: providers, msg: "Successfully retrieved provider configs" };
});
// Get current provider templates list
/**
 * @swagger
 * /api/search_provider_setting/provider:
 *   get:
 *     summary: Get provider list
 *     tags:
 *       - SearchProviderSetting
 *     description: This endpoint retrieves the provider list.
 *     responses:
 *       200:
 *         description: Successfully retrieved provider list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/provider.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get("/templates", async (ctx) => {
    const providers = await SearchProviderTable.findAll();
    ctx.body = { code: 200, data: providers, msg: "Successfully retrieved provider templates" };
});


/**
 * @swagger
 * /api/search_provider_setting/check_search_provider:
 *   post:
 *     summary: Check search provider
 *     tags:
 *       - SearchProviderSetting
 *     description: This endpoint checks the search provider.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Search provider type
 *               api_key:
 *                 type: string
 *                 description: Search provider api key
 *               engine:
 *                 type: string
 *                 description: Search provider engine
 *     responses:
 *       200:
 *         description: Successfully checked search provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       description: Status
 *                     message:
 *                       type: string
 *                       description: Message
 */
router.post("/check_search_provider", async ({ request, response }) => {
    const { type, api_key = "", endpoint = "", engine = "" } = request.body;
    if (type === 'tavily') {
        const talivy = new TalivySearch({ key: api_key });
        const res = await talivy.check()
        response.success(res)
    } else if (type === 'local') {
        const local = new LocalSearch();
        const res = await local.check(engine)
        response.success(res)
    } else if (type === 'cloudsway') {
        const cloudsway = new CloudswaySearch({ access_key: api_key, endpoint: endpoint });
        const res = await cloudsway.check()
        response.success(res)
    } else {
        response.fail("Invalid search provider type")
    }
})

module.exports = exports = router.routes();