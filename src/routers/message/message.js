const router = require("koa-router")();

const Message = require("@src/models/Message");
const Conversation = require("@src/models/Conversation")

const { auth_check } = require('@src/utils/share_auth')

// api/message/list?conversation_id=1234567890
/**
 * @swagger
 * /api/message/list:
 *   get:
 *     summary: Get message list
 *     tags:  
 *       - Message
 *     description: This endpoint retrieves a list of messages.
 *     parameters:
 *       - in: query
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the conversation to retrieve messages for.
 *     responses:
 *       200:
 *         description: A list of messages.
 */
router.get("/list", async ({ state, query, response }) => {
    const { conversation_id } = query;
    if (!conversation_id) {
        return response.fail({}, "Missing conversation_id");
    }

    const conversation = await Conversation.findOne({ where: { conversation_id } })
    const allow_read = await auth_check(state.user.id, conversation.dataValues.user_id, conversation)

    if (!allow_read) {
        return response.fail('no auth')
    }
    const messages = await Message.findAll({
        where: { conversation_id: conversation_id },
        order: [['timestamp', 'ASC']] // 按timestamp升序
    });

    return response.success(messages);
});


module.exports = exports = router.routes();