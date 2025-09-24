const Router = require("koa-router");
const router = new Router();

const fs = require('fs');
const { quickCreateVersion, getVersions, switchToVersion } = require('@src/utils/versionManager');
const { resolveAbsolutePath } = require('@src/utils/filePathHelper');

router.put("/editor", async ({ request, response, state }) => {
  const { path: filepath, content, conversation_id } = request.body || {};
  if (!filepath || !content) {
    return response.error("Missing file");
  }
  if (!conversation_id) {
    return response.fail(null, 'conversation_id is required');
  }
  const absolutePath = resolveAbsolutePath(filepath, state);
  if (!absolutePath) {
    response.fail(null, 'File path is required');
    return;
  }
  if (!fs.existsSync(absolutePath)) {
    response.fail(null, 'File does not exist');
    return;
  }
  try {
    // 写入文件
    fs.writeFileSync(absolutePath, content);

    // 简化：一行代码创建版本
    const versionInfo = await quickCreateVersion(filepath, conversation_id, state);

    response.success(versionInfo, 'File updated successfully');
  } catch (err) {
    console.error(err);
    response.fail(null, 'Failed to update file');
  }
});


// read file by path
const path = require('path');
router.post('/editor/read', async ({ request, response, state }) => {
  const { path: filepath } = request.body;
  const absolutePath = resolveAbsolutePath(filepath, state);
  console.log('absolutePath', absolutePath);
  if (!absolutePath) {
    response.fail(null, 'File path is required');
    return;
  }
  if (!fs.existsSync(absolutePath)) {
    response.fail(null, 'File does not exist');
    return;
  }
  try {
    const stream = fs.createReadStream(absolutePath);
    response.file(path.basename(absolutePath), stream);
  } catch (err) {
    console.error(err);
    response.fail(null, 'Failed to read file');
  }
});

// 获取文件版本列表
router.post('/editor/versions', async ({ request, response }) => {
  const { conversation_id, filepath } = request.body || {};

  if (!conversation_id || !filepath) {
    return response.fail(null, 'conversation_id and filepath are required');
  }

  try {
    // 使用统一的版本管理器获取版本列表
    const versions = await getVersions(conversation_id, filepath);
    response.success(versions, 'Versions retrieved successfully');
  } catch (err) {
    console.error(err);
    response.fail(null, 'Failed to retrieve versions');
  }
});

// 获取特定版本内容
router.get('/editor/version/:id', async ({ params, response }) => {
  const { id } = params;
  if (!id) {
    return response.fail(null, 'Version ID is required');
  }

  try {
    const version = await FileVersion.findOne({
      where: { id },
      attributes: ['id', 'conversation_id', 'filepath', 'content', 'version', 'create_at']
    });

    if (!version) {
      return response.fail(null, 'Version not found');
    }

    response.success(version, 'Version content retrieved successfully');
  } catch (err) {
    console.error(err);
    response.fail(null, 'Failed to retrieve version content');
  }
});

// 切换到指定版本
router.post('/editor/switch-version', async ({ request, response, state }) => {
  const { version_id, conversation_id, filepath } = request.body || {};

  if (!version_id || !conversation_id || !filepath) {
    return response.fail(null, 'version_id, conversation_id and filepath are required');
  }

  try {
    // 简化：直接调用切换版本
    const result = await switchToVersion(version_id, conversation_id, filepath, state);
    response.success(result, 'Version switched successfully');
  } catch (err) {
    console.error(err);
    response.fail(null, err.message || 'Failed to switch version');
  }
});

module.exports = exports = router.routes()