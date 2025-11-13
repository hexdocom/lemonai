import http from "@/utils/http.js";
let lastController = null;
const SHARE_TOKEN = import.meta.env.VITE_SHARE_TOKEN || '';

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
  // 修改会话可见性
  async updateVisibility(conversationId, is_public) {
    const uri = `/api/conversation/visibility/${conversationId}`;
    const response = await http.put(uri, {
      is_public: is_public
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
  async messageList(conversationId) {
    // 如果有上一个请求在进行，直接取消
    if (lastController) {
      console.log("cancel previous request");
      lastController.abort();
    }

    // 创建新的 controller
    const controller = new AbortController();
    lastController = controller;

    const uri = `/api/message/list?conversation_id=${conversationId}`;
    let accessToken = localStorage.getItem('access_token');
    if (!accessToken && SHARE_TOKEN) {
      accessToken = SHARE_TOKEN;
    }
    try {
      const response = await fetch(uri, {
        method: "GET",
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('response', data);
      return data.data || [];
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("请求被主动取消");
        return []; // 可选：取消时返回空数组
      } else {
        throw err;
      }
    } finally {
      // 只有当当前的 controller 还是最后一次的，才清掉
      if (lastController === controller) {
        lastController = null;
      }
    }
  },
  async stop(conversationId) {
    const uri = `/api/agent/stop`;
    const response = await http.post(uri, {
      conversation_id: conversationId
    });
    return response || {};
  },
  async stopCoding(conversationId) {
    const uri = `/api/agent/coding/stop`;
    const response = await http.post(uri, {
      conversation_id: conversationId
    });
    return response || {};
  },
  //chat stop stop_chat
  async stopChat(conversationId) {
    const uri = `/api/agent/stop_chat`;
    const response = await http.post(uri, {
      conversation_id: conversationId
    });
    return response || {};
  },

  //change chat 
  async changeChat(conversationId, pid, new_message_id) {
    const uri = `/api/agent/change`;
    const response = await http.post(uri, {
      conversation_id: conversationId,
      pid: pid,
      new_message_id: new_message_id
    });
    return response || {};
  },
  //localhost:3000/api/agent_store?page=1&page_size=20&order_by=create_at&order=DESC
  async agentStoreList(page = 1, page_size = 20, order_by = "create_at", order = "DESC", name) {
    const params = new URLSearchParams({ page: page, page_size: page_size, order_by: order_by, order: order, name: name });
    const uri = `/api/agent_store?${params.toString()}`;
    const res = await http.get(uri);
    return res || {};
  },
  // 获取所有 agent 的 id 和 name（不分页）
  async agentStoreAll(name) {
    const params = new URLSearchParams();
    if (name) {
      params.append('name', name);
    }
    const uri = `/api/agent_store/all${params.toString() ? '?' + params.toString() : ''}`;
    const res = await http.get(uri);
    return res || {};
  },
  ///last/:agent_id
  async last(agent_id) {
    const uri = `/api/agent_store/last/${agent_id}`;
    const res = await http.get(uri);
    return res || {};
  },
  // var settings = {
  //   "url": "http://localhost:3000/api/agent_store/remix",
  //   "method": "POST",
  //   "data": JSON.stringify({
  //     "agent_id": 7
  //   }),
  // };
  async remix(agent_id) {
    const uri = `/api/agent_store/remix`;
    const res = await http.post(uri, {
      agent_id: agent_id
    });
    return res || {};
  },
  async userCaseList(page = 1, page_size = 20, order_by = "create_at", order = "DESC", name, agent_id) {
    const params = new URLSearchParams({ 
      page: page, 
      page_size: page_size, 
      order_by: order_by, 
      order: order,
      name: name || ''
    });
    
    // 如果提供了 agent_id，则添加到参数中
    if (agent_id) {
      params.append('agent_id', agent_id);
    }
    
    const uri = `/api/user_case?${params.toString()}`;
    const res = await http.get(uri);
    return res || {};
  },
  // Twins conversation management
  async handleTwins(conversationId) {
    const uri = "/api/conversation/twins";
    const response = await http.post(uri, {
      conversation_id: conversationId
    });
    return response || {};
  },
  // 获取 twins conversation 的 token 信息
  async getTwinsTokens(conversationId) {
    const uri = `/api/conversation/twins/tokens/${conversationId}`;
    const response = await http.get(uri);
    return response || {};
  },
}

export default service;
