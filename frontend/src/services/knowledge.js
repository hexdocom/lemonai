import http from "@/utils/http.js";

const uri = `/api/knowledge`;

const service = {
  //新增 content = '', category = '', agent_id
  create(content, category, agent_id){
    return http.post(uri, {
      content,
      category,
      agent_id
    });
  },
  //获取 agent_id
  getList(agent_id){
    return http.get(uri, {
      agent_id
    });
  },
  //获取单个 /detail/:id
  getById(id){
    return http.get(`${uri}/detail/${id}`);
  },
  //更新 /:id
  update(id, content, category){
    return http.put(`${uri}/${id}`, {
      content,
      category
    });
  },
  //删除 /:id
  delete(id){
    return http.del(`${uri}/${id}`);
  },
  //获取 category 列表
  getCategoryList(){
    return http.get(`/api/knowledge/categories`);
  }
};

export default service;