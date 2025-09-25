import http from "@/utils/http.js";

const uri = `/api/agent`;

const service = {
  //获取全部 get /
  getList(){
    return http.get(uri);
  },
  //获取单个 :id
  getById(id){
    return http.get(`${uri}/${id}`);
  },
  //更新 :id
  update(id, name, describe, mcp_server_ids,is_public){
    return http.put(`${uri}/${id}`, {
      name: name,
      describe: describe,
      mcp_server_ids: mcp_server_ids,
      is_public:is_public
    });
  },
  //新增 post  name, describe='', mcp_server_ids = []
  create(name, describe, mcp_server_ids,is_public){
    return http.post(uri, {
      name: name,
      describe: describe,
      mcp_server_ids: mcp_server_ids,
      is_public:is_public
    });
  },
  //删除 :id
  delete(id){
    return http.del(`${uri}/${id}`);
  },
  generate(question,conversation_id,is_public){
    return http.post(`${uri}/generate`, {
      question: question,
      conversation_id: conversation_id,
      is_public:is_public
    });
  }
};

export default service;