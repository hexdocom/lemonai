import { fetchEventSource } from '@microsoft/fetch-event-source';
import base64 from "@/utils/base64.js";
const env = import.meta.env;
const sse = (uri, options, onTokenStream = (answer, ch,conversation_id) => { }, onOpenStream = () => { }, answer, throttledScrollToBottom = () => { }, abortController = new AbortController(),conversationId,agentConversationId = null) => {
  const nodeToken = localStorage.getItem('node_token');
  return new Promise((resolve, reject) => {

    let content = ''
    const fes = fetchEventSource(uri, {
      method: 'POST',
      body: JSON.stringify(options),
      headers: {
        'Content-Type': 'application/json',
        'node-token': nodeToken || '',
      },
      openWhenHidden: true,
      signal: abortController.signal,
      onopen(response) {
        if (response.ok) {
          onOpenStream(answer, response);
          return; // ev
        }
      },
      onmessage(ev) {
        const ch = decodeBase64(ev.data);
        content += ch;
        onTokenStream(answer, ch,conversationId,agentConversationId); // 回调处理流式消息
        throttledScrollToBottom();
      },
      onerror(err) {
        console.log('触发了 ============ sse.error ============ ', err);
        abortController.abort();
        //抛出异常
        reject(err);
        throw err;
      }
    });

    fes.then((response) => {
      console.log('fes.response', response);
      resolve(content);
    }).catch((error) => {
      abortController.abort();
      reject(error);
    })
  })
}


const decodeBase64 = (encodedString) => {
  const decodedString = decodeURIComponent(
    atob(encodedString)
      .split("")
      .map(function (char) {
        return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
  return decodedString;
};

export default sse;