const router = require("koa-router")();

const McpServer = require("@src/models/McpServer");

// Create a new mcp server
router.post("/", async ({ state, request, response }) => {
  const body = request.body || {};
  const user_id = state.user.id

  const { name, url, description, activate, type, command, registryUrl, args, env, api_key, is_default } = body

  const mcp_server = await McpServer.create({
    user_id,
    name,
    url,
    description,
    activate,
    type,
    command,
    registryUrl,
    args,
    env,
    api_key,
    is_default
  });

  return response.success(mcp_server);
});

router.get("/", async ({ state, response }) => {
  const user_id = state.user.id
  const mcp_servers = await McpServer.findAll({ where: { user_id }, order: [['create_at', 'DESC']] });
  return response.success(mcp_servers);
});

router.get("/active", async ({ state, response }) => {
  const user_id = state.user.id
  const mcp_servers = await McpServer.findAll({ where: { activate: true, user_id } });
  return response.success(mcp_servers);
})

// update mcp server
router.put("/:mcp_server_id", async ({ state, params, request, response }) => {
  const user_id = state.user.id
  const { mcp_server_id } = params;
  const body = request.body || {};

  const { name, url, description, activate, type, command, registryUrl, args, env, api_key, is_default } = body

  const mcp_server = await McpServer.findOne({
    where: { id: mcp_server_id, user_id }
  });
  if (!mcp_server) {
    return response.fail({}, "Mcp Server does not exist");
  }

  await mcp_server.update({
    name,
    url,
    description,
    activate,
    type,
    command,
    registryUrl,
    args,
    env,
    api_key,
    is_default
  });

  return response.success(mcp_server);
});

// delete mcp server
router.delete("/:mcp_server_id", async ({ state, params, response }) => {
  const user_id = state.user.id
  const { mcp_server_id } = params;

  const mcp_server = await McpServer.findOne({
    where: { id: mcp_server_id, user_id }
  });
  if (!mcp_server) {
    return response.fail({}, "Mcp Server does not exist");
  }

  await mcp_server.destroy();

  return response.success();
});

module.exports = exports = router.routes();
