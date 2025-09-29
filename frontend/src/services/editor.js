import http from "@/utils/http.js";

const uri = `/api/file/editor`;

const service = {
  // 保存文件内容并创建版本
  saveFile(data) {
    return http.put(`${uri}`, data);
  },

  // 读取文件内容
  readFile(data) {
    return http.post(`${uri}/read`, data);
  },

  // 获取文件版本列表
  getVersions(data) {
    return http.post(`${uri}/versions`, data);
  },

  // 获取特定版本的内容
  getVersionContent(id) {
    return http.get(`${uri}/version/${id}`);
  },

  // 切换到指定版本
  switchVersion(data) {
    return http.post(`${uri}/switch-version`, data);
  },

  // 批量操作
  async saveAndGetVersions(filepath, content, conversation_id) {
    const saveResult = await this.saveFile({
      path: filepath,
      content,
      conversation_id
    });

    if (saveResult.data.code === 0) {
      const versionsResult = await this.getVersions({
        conversation_id,
        filepath
      });
      return versionsResult;
    }
    return saveResult;
  }
};

export default service;