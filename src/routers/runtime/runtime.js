const router = require("koa-router")();

const DockerRuntime = require("@src/runtime/DockerRuntime");

const RUNTIME_TYPE = process.env.RUNTIME_TYPE || 'local-docker';
const { closeContainer: dockerCloseContainer } = require('@src/utils/eci_server');

let closeContainer = dockerCloseContainer
const runtimeMap = {
  'docker': DockerRuntime,
}

const Runtime = runtimeMap[RUNTIME_TYPE]
/**
 * @swagger
 * /api/runtime/vscode-url:
 *   get:
 *     tags:
 *       - Runtime
 *     summary: Get the VSCode URL for the running container
 *     description: |
 *       This endpoint retrieves the URL for accessing the VSCode instance running in the Docker container.
 *     parameters:
 *       - in: query
 *         name: conversation_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the conversation to retrieve messages for.
 *     responses:
 *       200:
 *         description: Successfully retrieved the VSCode URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: URL for accessing the VSCode instance
 *                 code:
 *                   type: integer
 *                   description: Status code
 *                 msg:
 *                   type: string
 *                   description: Message
 */
router.get('/vscode-url', async ({ state, query, response }) => {
  const { conversation_id } = query;
  const user_id = state.user.id
  let dir_name = ''
  if (conversation_id) {
    dir_name = 'Conversation_' + conversation_id.slice(0, 6);
  }

  const runtime = new Runtime({ user_id, conversation_id })
  await runtime.connect_container()
  // 五分钟后关闭
  setTimeout(() => {
    closeContainer(user_id);
  }, 5 * 60 * 1000);

  const vscode_port = 9002

  const vscode_url = runtime.get_vscode_url(dir_name);
  return response.success({ url: vscode_url });
});

router.post('/delete_container', async ({ state, response }) => {
  const user_id = state.user.id

  let res = await closeContainer(user_id)
  return response.success(res);
});


module.exports = exports = router.routes();