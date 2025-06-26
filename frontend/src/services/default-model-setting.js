import http from '@/utils/http.js'


const service = {
    // 获取可选模型信息
    async getModels() {
        const uri = `/api/model/enabled`
        const response = await http.get(uri)
        return response || {};
    },

    // 获取类型模型信息
    async getModelBySetting() {
        const uri = `/api/default_model_setting`
        const response = await http.get(uri)
        return response || {};
    },
    //更新模型
    async updateModel(data) {
        const uri = `/api/default_model_setting`
        const response = await http.put(uri, data)
        return response.data || {};
    },
    // 检测模型
    //api/default_model_setting/check
    async checkModel() {
        const uri = `/api/default_model_setting/check`
        const response = await http.get(uri)
        return response || {};
    },

}
export default service