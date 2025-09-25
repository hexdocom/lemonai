import http from "@/utils/http.js";

const service = {
  async list(modeType = 'task', agent_id = null) {
    const params = new URLSearchParams({ mode_type: modeType, agent_id: agent_id });
    const uri = `/api/conversation?${params.toString()}`;
    const res = await http.get(uri);
    return res || {};
  },
  async create(message, modeType = 'task', agent_id = null, model_id = null) {
    const uri = "/api/conversation";
    const response = await http.post(uri, {
      content: message,
      mode_type: modeType,
      agent_id: agent_id,
      model_id: model_id
    });
    return response || {};
  },
  //PATCH
  async update(conversationId, title = "") {
    const uri = `/api/conversation/${conversationId}`;
    const response = await http.put(uri, {
      title: title
    });
    return response || {};
  },
  async get(conversationId) {
    const uri = `/api/conversation/${conversationId}`;
    const response = await http.get(uri);
    return response || {};
  },
  async remove(conversationId) {
    const uri = `/api/conversation/${conversationId}`;
    const response = await http.del(uri);
    return response || {};
  },
  //query
  async query(query) {
    const uri = `/api/conversation/query`;
    const response = await http.post(uri, {
      query: query
    });
    return response || {};
  },
  //favorite
  async favorite(conversationId) {
    const uri = `/api/conversation/favorite`;
    const response = await http.post(uri, {
      conversation_id: conversationId
    });
    return response || {};
  },
  //unfavorite
  async unfavorite(conversationId) {
    const uri = `/api/conversation/unfavorite`;
    const response = await http.post(uri, {
      conversation_id: conversationId
    });
    return response || {};
  },
  ///api/message/list
  async messageList(conversationId) {
    const uri = `/api/message/list?conversation_id=${conversationId}`;
    const response = await http.get(uri);
    return response || {};
  },

  async stop(conversationId) {
    const uri = `/api/agent/stop`;
    const response = await http.post(uri, {
      conversation_id: conversationId
    });
    return response || {};
  },
}

export default service;