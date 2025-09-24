/**
 * 文本嵌入向量化工具
 * 使用豆包 doubao-embedding-large 模型
 */

const axios = require('axios');

class EmbeddingService {
    constructor() {
        this.endpoint = process.env.DOUBAO_EMBEDDING_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3/embeddings';
        this.apiKey = process.env.DOUBAO_API_KEY;
        this.model = process.env.DOUBAO_EMBEDDING_MODEL || 'doubao-embedding-large-text-240915';
        
        if (!this.apiKey) {
            throw new Error('DOUBAO_API_KEY is required in environment variables');
        }

        this.client = axios.create({
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * 生成文本的嵌入向量
     * @param {string|string[]} input - 输入文本，可以是字符串或字符串数组
     * @returns {Promise<number[]|number[][]>} 嵌入向量或向量数组
     */
    async getEmbedding(input) {
        try {
            const isArray = Array.isArray(input);
            const texts = isArray ? input : [input];
            
            // 验证输入
            if (texts.some(text => !text || typeof text !== 'string')) {
                throw new Error('Input must be non-empty string(s)');
            }

            const response = await this.client.post(this.endpoint, {
                model: this.model,
                input: texts,
                encoding_format: "float"
            });

            if (!response.data || !response.data.data) {
                throw new Error('Invalid response from embedding API');
            }

            const embeddings = response.data.data.map(item => item.embedding);
            
            return isArray ? embeddings : embeddings[0];
        } catch (error) {
            console.error('Embedding generation failed:', error.message);
            if (error.response) {
                console.error('API Response:', error.response.data);
            }
            throw new Error(`Failed to generate embeddings: ${error.message}`);
        }
    }

    /**
     * 批量生成嵌入向量
     * @param {string[]} texts - 文本数组
     * @param {number} batchSize - 批次大小，默认20
     * @returns {Promise<number[][]>} 嵌入向量数组
     */
    async getBatchEmbeddings(texts, batchSize = 20) {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Texts must be a non-empty array');
        }

        const results = [];
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`Processing embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
            
            const embeddings = await this.getEmbedding(batch);
            results.push(...embeddings);
            
            // 避免请求过于频繁
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    /**
     * 生成用于Agent的嵌入向量
     * 将name和describe组合后生成向量
     * @param {string} name - Agent名称
     * @param {string} describe - Agent描述
     * @returns {Promise<number[]>} 嵌入向量
     */
    async getAgentEmbedding(name, describe) {
        if (!name || !describe) {
            throw new Error('Both name and describe are required');
        }

        // 组合名称和描述，给名称更高权重
        const combinedText = `${name}: ${describe}`;
        return await this.getEmbedding(combinedText);
    }

    /**
     * 批量生成Agent嵌入向量
     * @param {Array<{name: string, describe: string}>} agents - Agent数组
     * @param {number} batchSize - 批次大小
     * @returns {Promise<number[][]>} 嵌入向量数组
     */
    async getBatchAgentEmbeddings(agents, batchSize = 20) {
        if (!Array.isArray(agents) || agents.length === 0) {
            throw new Error('Agents must be a non-empty array');
        }

        // 验证输入格式
        agents.forEach((agent, index) => {
            if (!agent.name || !agent.describe) {
                throw new Error(`Agent at index ${index} must have name and describe properties`);
            }
        });

        const texts = agents.map(agent => `${agent.name}: ${agent.describe}`);
        return await this.getBatchEmbeddings(texts, batchSize);
    }


    async getAgentQuestionEmbedding(question) {
        if (!question) {
            throw new Error('Question must be provided');
        }
        return await this.getEmbedding(question);
    }
}

// 创建单例实例
let embeddingService = null;

/**
 * 获取嵌入服务实例
 * @returns {EmbeddingService}
 */
function getEmbeddingService() {
    if (!embeddingService) {
        embeddingService = new EmbeddingService();
    }
    return embeddingService;
}

/**
 * 便捷方法：生成文本嵌入向量
 * @param {string|string[]} input - 输入文本
 * @returns {Promise<number[]|number[][]>}
 */
async function generateEmbedding(input) {
    const service = getEmbeddingService();
    return await service.getEmbedding(input);
}

/**
 * 便捷方法：生成Agent嵌入向量
 * @param {string} name - Agent名称
 * @param {string} describe - Agent描述
 * @returns {Promise<number[]>}
 */
async function generateAgentEmbedding(name, describe) {
    const service = getEmbeddingService();
    return await service.getAgentEmbedding(name, describe);
}

async function generateAgentQuestionEmbedding(question) {
    const service = getEmbeddingService();
    return await service.getAgentQuestionEmbedding(question);
}


module.exports = {
    EmbeddingService,
    getEmbeddingService,
    generateEmbedding,
    generateAgentEmbedding,
    generateAgentQuestionEmbedding
};