const router = require("koa-router")();
const DefaultModelSetting = require("@src/models/DefaultModelSetting");
const Model = require('@src/models/Model')
const { updateDefaultModel } = require('@src/utils/default_model')
const Platform = require('@src/models/Platform')
const UserSearchSetting = require('@src/models/UserSearchSetting')

// change default_model_setting 
/**
 * @swagger
 * /api/default_model_setting:
 *   put:
 *     summary: update default_model_setting
 *     tags:  
 *       - DefaultModelSetting
 *     description: This endpoint creates a new platform with the provided content.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               setting_type:
 *                 type: string
 *                 description: setting_type 'assistant', 'topic_naming', 'translation'
 *               model_id:
 *                 type: integer
 *                 description: model id
 *               config:
 *                 type: object
 *                 description: config
 * 
 *     responses:
 *       200:
 *         description: Successfully 
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/default_model_setting.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *                 
 */
router.put("/", async ({ state, request, response }) => {
    const body = request.body || {};
    const { setting_type, model_id, config } = body
    const existingModelSetting = await DefaultModelSetting.findOne({ where: { setting_type: setting_type, user_id: state.user.id } });
    if (existingModelSetting) {
        await DefaultModelSetting.update(
            { model_id: model_id, config: config },
            { where: { setting_type: setting_type, user_id: state.user.id } }
        );
    } else {
        await DefaultModelSetting.create({
            setting_type: setting_type,
            model_id: model_id,
            config: config,
            user_id: state.user.id
        });
    }
    await updateDefaultModel(setting_type)
    return response.success();
});

// get default_model_setting
/**
 * @swagger
 * /api/default_model_setting:
 *   get:
 *     summary: Get default model setting
 *     tags:  
 *       - DefaultModelSetting
 *     description: This endpoint gets default model setting.
 *     responses:
 *       200:
 *         description: Successfully get default model setting
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: './schemas/default_model_setting.json'
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get("/", async ({ state, response }) => {
    const defaultModelSetting = await DefaultModelSetting.findAll({ where: { user_id: state.user.id }, order: [['create_at', 'DESC']] });
    return response.success(defaultModelSetting);
});


/**
 * @swagger
 * /api/default_model_setting/check:
 *   get:
 *     summary: do check default_model_setting
 *     tags:  
 *       - DefaultModelSetting
 *     description: do check default_model_setting
 *     responses:
 *       200:
 *         description: Successfully 
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 *                 
 */
router.get("/check", async ({ response }) => {
    let check_map = {
        has_enabled_platform: true,
        has_default_platform: true,
        has_search_setting: true,
    }
    // 检查是否配置并开启模型
    const platform = await Platform.findOne({ where: { is_enabled: true } })
    if (!platform) {
        check_map.has_enabled_platform = false
    }
    // 检查是否配置默认模型
    let defaultModelSetting = await DefaultModelSetting.findOne({ where: { setting_type: 'assistant' } })
    if (!defaultModelSetting) {
        check_map.has_default_platform = false
    } else {
        const model = await Model.findOne({ where: { id: defaultModelSetting.model_id } })

        const platform = await Platform.findOne({ where: { id: model.platform_id } })
        if (!platform || !platform.is_enabled) {
            check_map.has_default_platform = false
        }
    }

    // 检查是否有搜索配置
    const userSearchSetting = await UserSearchSetting.findOne()
    if (!userSearchSetting) {
        check_map.has_search_setting = false
    }

    return response.success(check_map);
});

module.exports = exports = router.routes();