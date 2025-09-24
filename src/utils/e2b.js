require('dotenv').config();
require('module-alias/register');

const { Sandbox } = require('e2b')
const axios = require('axios')
const Conversation = require('@src/models/Conversation')
const { deductPointsForPoint, calRuntimePoint } = require('@src/utils/point')
const User = require('@src/models/User')

const E2B_EXPORT_DIR = process.env.E2B_EXPORT_DIR
const E2B_TEMPLATE_ID = process.env.E2B_TEMPLATE_ID

async function createCustomSandboxInstance(user_id) {
  try {

    const sandbox = await Sandbox.create(E2B_TEMPLATE_ID, { timeoutMs: 3600000 });

    console.log('Sandbox 实例已成功创建！');
    console.log('实例 ID:', sandbox);

    console.log("=======")
    console.log(sandbox.commands);

    await sandbox.commands.run('sudo mkdir export', { cwd: '/' });

    const proc = await sandbox.commands.run('sudo mount -t nfs 47.238.250.235:/ /export', { cwd: '/' });
    await sandbox.commands.run('sudo rm -rf /workspace', { cwd: '/' });

    // console.log("====proc=====", proc)
    await sandbox.commands.run(`sudo ln -s /export/${E2B_EXPORT_DIR}/workspace/user_${user_id} /workspace`, { cwd: '/' });
    // 环境处理
    await sandbox.commands.run(`sudo ln -s /chataa/micromamba/envs/chataa/bin/pip3 /usr/bin/pip3 && sudo ln -s /chataa/micromamba/envs/chataa/bin/pip /usr/bin/pip && sudo ln -s /chataa/micromamba/envs/chataa/bin/python /usr/bin/python`, { cwd: '/' });

    const host9001 = sandbox.getHost(9001);
    const host9002 = sandbox.getHost(9002);

    console.log('9001:', host9001);
    console.log('9002:', host9002);

  //   await sandbox.commands.run(`
  //     eval "$(/chataa/micromamba/bin/micromamba shell hook --shell bash)" && \
  //     micromamba activate chataa && \
  //     python -m playwright install
  // `, { cwd: '/' });

    return { sandbox, docker_url: host9001, vscode_url: host9002 };
  } catch (error) {
    console.error('创建 Sandbox 实例时发生错误:', error);
    throw error;
  }
}

async function killSandboxInstanceById(sandboxId) {
  if (!sandboxId) {
    console.warn('没有提供沙盒 ID，无法执行 kill 操作。');
    return;
  }

  let sandboxToKill;
  try {
    console.log(`尝试连接到沙盒实例 ID: ${sandboxId} 以进行终止...`);
    // 使用 Sandbox.reconnect 重新连接到现有沙盒实例
    sandboxToKill = await Sandbox.connect(sandboxId);

    console.log(sandboxToKill)

    console.log(`正在终止沙盒实例 ID: ${sandboxToKill.sandboxId}...`);
    await sandboxToKill.kill(); // 调用 kill 方法
    console.log(`沙盒实例 ID: ${sandboxToKill.sandboxId} 已成功终止。`);
  } catch (error) {
    console.error(`终止沙盒实例 ID: ${sandboxId} 时发生错误:`, error);
    // 根据错误类型，你可能需要更细致的处理，例如：
    // 如果沙盒已经不存在或已终止，reconnect() 或 kill() 可能会抛出错误。
    if (error.message.includes('not found') || error.message.includes('NotFoundException')) {
      console.warn(`沙盒实例 ID: ${sandboxId} 不存在或已被删除。`);
    }
    throw error;
  }
}

async function status(sandboxId) {
  if (!sandboxId) {
    console.warn('没有提供沙盒 ID');
    return { exists: false, message: '没有提供沙盒 ID' };
  }

  let sandbox;
  try {
    console.log(`尝试连接到沙盒实例 ID: ${sandboxId} ...`);
    // 使用 Sandbox.reconnect 重新连接到现有沙盒实例
    sandbox = await Sandbox.connect(sandboxId);

    const host9001 = sandbox.getHost(9001);
    const host9002 = sandbox.getHost(9002);
    return { exists: true, sandbox, docker_url: host9001, vscode_url: host9002 }; // 连接成功，返回实例

  } catch (error) {
    // 判断错误信息
    if (
      error.message.includes("doesn't exist") ||
      error.message.includes('not found') ||
      error.message.includes('NotFoundException')
    ) {
      console.warn(`沙盒实例 ID: ${sandboxId} 不存在或已被删除。`);
      return { exists: false, message: '沙盒不存在' };
    }
    throw error; // 其他错误继续抛出
  }
}

async function test(sandboxId) {
  if (!sandboxId) {
    console.warn('没有提供沙盒 ID');
    return;
  }

  let sandbox;
  try {
    console.log(`尝试连接到沙盒实例 ID: ${sandboxId} ...`);
    // 使用 Sandbox.reconnect 重新连接到现有沙盒实例
    sandbox = await Sandbox.connect(sandboxId);

    console.log("==sandbox===", sandbox)

    const commands = await sandbox.commands.list()

    console.log("==commands===", commands)


    await sandbox.commands.run('sudo mkdir export', { cwd: '/' });

    console.log("网络连通性测试通过，尝试挂载 NAS...");
    let mountProc = await sandbox.commands.run('sudo mount -t nfs 47.238.250.235:/ /export');
    //let mountProc = await sandbox.commands.run('cat /etc/idmapd.conf');

    console.log("Mount stdout:", mountProc.stdout);
    console.log("Mount stderr:", mountProc.stderr);
    console.log("Mount exitCode:", mountProc.exitCode);

    await sandbox.commands.run('sudo ln -s /export/lemon-saas-test/workspace/user_45 /workspace', { cwd: '/' });

    if (mountProc.exitCode === 0) {
      console.log("NAS 挂载成功！");
    } else {
      console.error("NAS 挂载失败！请检查 NAS 服务器的 export 配置。");
    }

  } catch (error) {

    throw error;
  }
}

async function doAction(host_url, action, uuid) {
  const request = {
    method: 'POST',
    url: `https://${host_url}/execute_action`,
    data: { action: action, uuid: uuid },
    timeout: 600000, // 设置超时时间为 10 分钟（单位：毫秒）
  };
  console.log("=====action=====", action)
  try {
    const response = await axios(request);
    return response.data.data
  } catch (e) {
    let errorMsg = '';
    if (e.errors) {
      // 如果 e.errors 是对象或数组，转成字符串
      if (typeof e.errors === 'object') {
        errorMsg = JSON.stringify(e.errors);
      } else {
        errorMsg = e.errors.toString();
      }
    } else if (e.message) {
      errorMsg = e.message;
    } else {
      errorMsg = String(e);
    }

    return { uuid: uuid, status: 'failure', comments: `Failed to do ${action.type}: ${errorMsg}` };
  }
}

async function closeContainer(user_id) {
  const has_running_conversation = await check_has_running(user_id)
  if (has_running_conversation) {
    return
  }
  const user = await User.findOne({ where: { id: user_id } })

  const status_res = await status(user.dataValues.e2b_sandbox_id)

  if (status_res.exists) {
    const sandbox = status_res.sandbox
    const sandbox_info = await sandbox.getInfo()
    const creation_time = sandbox_info.startedAt;
    const creationDate = new Date(creation_time);
    const now = new Date();
    const diffSeconds = Math.floor((now - creationDate) / 1000);
    console.log('相差秒数:', diffSeconds);
    const point = await calRuntimePoint(diffSeconds)
    await deductPointsForPoint(user_id, 0, point, '', { type: 'docker' })

    await killSandboxInstanceById(user.dataValues.e2b_sandbox_id)
    return 
  } else {
    return
  }
}


async function check_has_running(user_id) {
  // 检查是否可以删除容器组

  // 1、 没有进行中的conversation
  let running_count = await Conversation.count({ where: { user_id, status: "running" } })
  if (running_count > 0) {
    return true
  } else {
    return false
  }
}

// status("i0kb2izdd4jtksnrdj5cu-4a37e05c")
module.exports = exports = { createCustomSandboxInstance, status, doAction, closeContainer };
// 调用函数来创建实例
//createCustomSandboxInstance(45)
//killSandboxInstanceById('i33tf0m9wfc9mif9bh4eo-d0b9e1e2')
// doAction("i8hvubq1tt7dkwl2o3ciq-a7f8ef46")

// {
//   type: 'browser',
//   params: {
//     question: 'Open www.baidu.com and check if the page loads normally, verify search functionality, inspect main elements (logo, search box, buttons), record response time, and check for error messages'

//     llm_config: {
//       model_name: 'deepseek-v3-250324',
//       api_url: 'https://ark.cn-beijing.volces.com/api/v3',
//       api_key: '995e58ba-5d91-4f56-a2ee-3674c5183422'
//     },
//     conversation_id: '0a2b4acc-5493-4f47-879e-3e495b89d2ee'
//   }
// }


//  {
//   type: 'browser',
//   params: {
//     question: 'Open https://www.baidu.com and check if the page loads normally, verify core functions (search box, buttons) are interactive, and check key elements (Logo, navigation bar) are displayed properly',
//     llm_config: {
//       model_name: 'deepseek-v3-250324',
//       api_url: 'https://ark.cn-beijing.volces.com/api/v3',
//       api_key: '995e58ba-5d91-4f56-a2ee-3674c5183422'
//     },
//     conversation_id: '7362fd63-cb4e-4c65-a8e4-612a38ef9189'
//   }
// }