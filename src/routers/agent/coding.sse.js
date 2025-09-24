// @ts-ignore
const router = require("koa-router")();
const Conversation = require("@src/models/Conversation");
const { getContainerCloseHandler } = require('./utils/coding-helpers');
const { setupCodingTask } = require('./utils/coding-setup');
const { executeCoding } = require('./utils/coding-executor');
const { handleCodingResult, setupStreamCloseHandler } = require('./utils/coding-cleanup');

// Store active tasks
const activeTasks = new Map();

/**
 * POST /api/agent/coding/sse
 * 
 * Core logic is extremely simple:
 * 1. Setup
 * 2. Execute 
 * 3. Cleanup
 */
router.post("/coding/sse", async (ctx, next) => {
  try {
    // 1. Setup everything
    console.log('coding.sse');
    const setup = await setupCodingTask(ctx);

    // Register active task
    activeTasks.set(setup.conversation_id, { stop: () => setup.stream.end() });

    // Setup cleanup handler
    setupStreamCloseHandler({
      stream: setup.stream,
      conversation_id: setup.conversation_id,
      agent_id: setup.agent_id,
      userId: setup.userId,
      dir_path: setup.dir_path,
      filepath: setup.filepath,
      token: ctx.headers.authorization,
      onCleanup: () => activeTasks.delete(setup.conversation_id)
    });

    // 2. Execute core logic
    executeCoding({
      conversation_id: setup.conversation_id,
      agent_id: setup.agent_id,
      filepath: setup.filepath,
      selection: setup.selection,
      screenshot: setup.screenshot,
      requirement: setup.requirement,
      userId: setup.userId,
      onTokenStream: setup.onTokenStream,
      mcp_server_ids: setup.mcp_server_ids || []
    }).then((result) => {
      console.log('Coding result:', result);
      handleCodingResult(setup, result);
    });

    ctx.body = setup.stream;
    ctx.status = 200;

  } catch (error) {
    console.error('Unexpected error:', error);
    ctx.response.fail({}, error.message);
  }
});

/**
 * Stop coding task
 * POST /api/agent/coding/stop
 */
router.post("/coding/stop", async (ctx) => {
  const { conversation_id } = ctx.request.body || {};
  const userId = ctx.state.user.id;

  const task = activeTasks.get(conversation_id);

  if (!task) {
    return ctx.response.fail(`Task ${conversation_id} not found`);
  }

  try {
    if (task.stop) task.stop();
    activeTasks.delete(conversation_id);

    await Conversation.update(
      { status: 'stopped' },
      { where: { conversation_id } }
    );

    const closeContainer = getContainerCloseHandler();
    await closeContainer(userId);

    ctx.response.success('Coding task stopped');
  } catch (error) {
    ctx.response.fail(`Error: ${error.message}`);
  }
});

/**
 * Get task status
 * GET /api/agent/coding/status/:conversation_id
 */
router.get("/coding/status/:conversation_id", async (ctx) => {
  const { conversation_id } = ctx.params;

  const conversation = await Conversation.findOne({ where: { conversation_id } });

  if (!conversation) {
    return ctx.response.fail('Conversation not found');
  }

  ctx.response.success({
    conversation_id,
    status: conversation.status,
    is_active: activeTasks.has(conversation_id),
  });
});

module.exports = exports = router.routes();