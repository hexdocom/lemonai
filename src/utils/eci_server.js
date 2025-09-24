require('dotenv').config()

const Conversation = require('@src/models/Conversation')
const axios = require('axios');
const ECI_SERVER_HOST = process.env.ECI_SERVER_HOST

const { deductPointsForPoint, calRuntimePoint } = require('@src/utils/point')
const { deleteConf } = require('@src/utils/nginx')

async function closeContainer(user_id) {
  const has_running_conversation = await check_has_running(user_id)
  if (has_running_conversation) {
    return
  }
  const status_res = await getContainerStatus(user_id)
  if (status_res.ContainerGroups.length > 0) {
    const creation_time = status_res.ContainerGroups[0].CreationTime;
    const creationDate = new Date(creation_time);
    const now = new Date();
    const diffSeconds = Math.floor((now - creationDate) / 1000);
    console.log('相差秒数:', diffSeconds);
    const point = await calRuntimePoint(diffSeconds)
    await deductPointsForPoint(user_id, 0, point, '', { type: 'docker' })

    const request = {
      method: 'POST',
      url: `${ECI_SERVER_HOST}/delete`,
      data: { name: `user-${user_id}-lemon-runtime-sandbox` },
    };

    const response = await axios(request)

    await deleteConf(user_id)

    console.log(response)
    return response
  } else {
    return
  }
}

async function getContainerStatus(user_id) {
  const request = {
    method: 'POST',
    url: `${ECI_SERVER_HOST}/status`,
    data: { name: `user-${user_id}-lemon-runtime-sandbox` },
  };

  const response = await axios(request)

  // const creation_time = response.data.ContainerGroups[0].CreationTime

  console.log(response)
  return response.data
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

module.exports = exports = { closeContainer };