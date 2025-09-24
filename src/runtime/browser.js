const axios = require('axios')

async function browser(action, uuid) {
  const host = 'localhost'
  const host_port = 9000

  const request = {
    method: 'POST',
    url: `http://${host}:${host_port}/api/browser/task`,
    data: { prompt: action.params.question, llm_config: action.params.llm_config },
  };
  const response = await axios(request);
  //extracted_content
  const result_content = response.data.data.history.task;
  return {
    uuid,
    status: 'success',
    content: result_content,
    meta: {
      action_type: 'browser',
      json: { browser_history: response.data.data.history.browser_history, browser_history_screenshot: response.data.data.history.browser_history_screenshot }
    }
  };
}


module.exports = browser;