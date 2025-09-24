require('dotenv').config()
const globals = require('@src/globals');
const axios = require('axios')
const SUB_SERVER_DOMAIN = process.env.SUB_SERVER_DOMAIN || 'https://sub-server.lemonai.cc';
async function sub_server_request(url, data) {
  const full_url = `${SUB_SERVER_DOMAIN}${url}`
  const token = globals.getToken()
  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url:full_url,
    data,
    headers: {
      'Authorization': `Bearer ${token}` // 使用传入的 token
    },
  };

  try {
    const result = await axios.request(config);
    return result.data.data;
  } catch (error) {
    console.error(`Error calling ${url}:`, error.response ? error.response.data : error.message);
    throw error; // 抛出错误以便上层捕获处理
  }
}

module.exports = exports = sub_server_request;