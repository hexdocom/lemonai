const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { deductPointsForPoint } = require('./point');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Aryn AI 文档集管理类
class ArynDocsetManager {
    constructor(apiKey, baseURL = 'https://api.aryn.ai') {
        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
    }

    /**
     * 创建新的文档集
     * @param {Object} options - 文档集创建选项
     * @param {string} options.name - 文档集名称
     * @param {string} [options.description] - 文档集描述
     * @param {Object} [options.metadata] - 附加元数据
     * @param {Array} [options.tags] - 文档集标签
     * @param {Object} [options.settings] - 文档集设置
     * @returns {Promise<Object>} API 响应
     */
    async createDocset(options) {
        const { name, description, metadata = {}, tags = [], settings = {} } = options;

        try {
            const payload = {
                name,
                ...(description && { description }),
                ...(Object.keys(metadata).length > 0 && { metadata }),
                ...(tags.length > 0 && { tags }),
                ...(Object.keys(settings).length > 0 && { settings })
            };

            const response = await this.client.post('/v1/storage/docsets', payload);
            return response.data;
        } catch (error) {
            console.error('文档集创建失败:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * 获取文档集中的所有文档
     * @param {string} docsetId - 文档集 ID
     * @returns {Promise<Object>} 文档列表响应
     */
    async getDocuments(docsetId) {
        try {
            const response = await this.client.get(`/v1/storage/docsets/${docsetId}/docs`);
            return response.data;
        } catch (error) {
            console.error('获取文档列表失败:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * 检查文档是否存在于文档集中
     * @param {string} docsetId - 文档集 ID
     * @param {string} fileName - 文件名
     * @returns {Promise<boolean>} 文档是否存在
     */
    async documentExists(docsetId, fileName) {
        try {
            const documents = await this.getDocuments(docsetId);

            if (documents && documents.items) {
                return documents.items.some(doc => doc.name === fileName);
            }

            return false;
        } catch (error) {
            console.warn('Failed to check document existence:', error.message);
            return false;
        }
    }
}

// Aryn AI 文档上传类
class ArynDocumentUploader {
    constructor(apiKey, baseURL = 'https://api.aryn.ai') {
        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            }
        });
    }

    /**
     * 添加文档到指定文档集 (带重试机制)
     * @param {Object} options - 文档上传选项
     * @param {string} options.docsetId - 文档集 ID
     * @param {string} options.filePath - 本地文件路径
     * @param {string} [options.fileName] - 文档名称
     * @param {Object} [options.metadata] - 文档元数据
     * @param {string} [options.userId] - 用户ID，用于扣费
     * @param {string} [options.conversationId] - 会话ID，用于扣费记录
     * @returns {Promise<Object>} API 响应
     */
    async addDocument(options) {
        const { docsetId, filePath, fileName, metadata = {}, userId, conversationId } = options;

        // 尝试上传，如果遇到 socket hang up 错误则重试一次
        let uploadSuccess = false;
        let lastError = null;
        let response = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const formData = new FormData();

                // 添加文件
                if (filePath) {
                    const fileStream = fs.createReadStream(filePath);
                    const actualFileName = fileName || require('path').basename(filePath);
                    formData.append('file', fileStream, actualFileName);
                }

                // 添加元数据
                if (Object.keys(metadata).length > 0) {
                    formData.append('metadata', JSON.stringify(metadata));
                }

                // 添加处理选项
                const uploadOptions = {
                    text_mode: 'ocr_vision',
                    table_mode: 'vision',
                    extract_images: true,
                    summarize_images: true,
                };
                formData.append('options', JSON.stringify(uploadOptions));

                response = await this.client.post(`/v1/storage/docsets/${docsetId}/docs`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Content-Type': 'multipart/form-data'
                    }
                });

                uploadSuccess = true;
                console.log(`Document upload successful on attempt ${attempt}`);
                break;

            } catch (uploadError) {
                lastError = uploadError;
                const isSocketHangup = uploadError.message && (
                    uploadError.message.includes('socket hang up') ||
                    uploadError.code === 'ECONNRESET' ||
                    uploadError.code === 'EPIPE'
                );

                if (isSocketHangup && attempt === 1) {
                    console.log(`Upload attempt ${attempt} failed with socket error, retrying...`);
                    // 等待 1 秒后重试
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                } else {
                    // 非 socket 错误或已经是第二次尝试，直接抛出
                    console.error('文档上传失败:', uploadError.response?.data || uploadError.message);
                    throw uploadError;
                }
            }
        }

        if (!uploadSuccess) {
            console.error('文档上传失败:', lastError?.response?.data || lastError?.message);
            throw lastError || new Error('Upload failed after retries');
        }

        try {
            // 如果需要扣费，获取文档页数并扣费
            if (userId && conversationId && response.data && response.data.doc_id) {

                try {
                    const pageCount = await this.getDocumentPageCount(docsetId, response.data.doc_id);
                    const pointsToDeduct = pageCount * 2; // 每页2积分

                    if (pointsToDeduct > 0) {
                        console.log(`Document analysis cost ${pointsToDeduct} points (${pageCount} pages × 2 points/page)`);
                        const chargeResult = await deductPointsForPoint(userId, 0, pointsToDeduct, conversationId, {
                            type: 'document_analysis',
                            pageCount: pageCount,
                            fileName: fileName || require('path').basename(filePath),
                            docId: response.data.doc_id
                        });

                        // 添加计费信息到响应
                        response.data.billing = {
                            pageCount: pageCount,
                            pointsCharged: pointsToDeduct,
                            chargeResult: chargeResult
                        };

                        if (chargeResult.notEnough) {
                            console.warn(`Insufficient points for document analysis. Required: ${pointsToDeduct} points, lacking: ${chargeResult.lack} points`);
                        }
                    }
                } catch (billingError) {
                    console.error('Document billing failed:', billingError.message);
                    // 计费失败不影响文档上传，只记录错误
                    response.data.billing = {
                        error: billingError.message,
                        pageCount: 0,
                        pointsCharged: 0
                    };
                }
            }

            return response.data;
        } catch (error) {
            console.error('文档后处理失败:', error.message);
            // 后处理失败不影响上传结果，返回原始响应
            return response.data;
        }
    }

    /**
     * 通过 API 获取文档页数
     * @param {string} docsetId - 文档集 ID
     * @param {string} docId - 文档 ID
     * @returns {Promise<number>} 页数
     */
    async getDocumentPageCount(docsetId, docId) {
        try {
            const response = await this.client.get(`/v1/storage/docsets/${docsetId}/docs/${docId}`);
            const docData = response.data;

            if (docData && docData.elements && Array.isArray(docData.elements)) {
                // 查找所有页码
                let maxPageNumber = 0;
                const pageNumbers = [];

                for (const element of docData.elements) {
                    // 页码信息在 properties.page_number 中
                    if (element.properties && element.properties.page_number) {
                        const pageNum = element.properties.page_number;
                        if (typeof pageNum === 'number') {
                            pageNumbers.push(pageNum);
                            maxPageNumber = Math.max(maxPageNumber, pageNum);
                        }
                    }
                }

                const uniquePages = [...new Set(pageNumbers)].sort((a, b) => a - b);
                console.log(`Document has ${maxPageNumber} pages (found pages: ${uniquePages.join(', ')})`);

                return maxPageNumber || 1; // 至少1页
            }

            return 1; // 默认1页
        } catch (error) {
            console.warn('Failed to get document page count from API:', error.message);
            return 1; // 默认1页
        }
    }
}

// Aryn AI 查询运行器类
class ArynQueryRunner {
    constructor(apiKey, baseURL = 'https://api.aryn.ai') {
        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000
        });
    }

    /**
     * 生成查询计划（不执行）
     * @param {Object} queryRequest - 查询请求对象
     * @param {string} [queryRequest.query] - 自然语言查询
     * @param {string} [queryRequest.docset_id] - 文档集 ID
     * @returns {Promise<Object>} LogicalPlan 响应
     */
    async generatePlan(queryRequest) {
        try {
            console.log('发送计划生成请求:', JSON.stringify(queryRequest, null, 2));
            const response = await this.client.post('/v1/query/plan', queryRequest);
            return response.data;
        } catch (error) {
            console.error('查询计划生成失败:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    /**
     * 运行查询
     * @param {Object} queryRequest - 查询请求对象
     * @param {string} [queryRequest.docset_id] - 文档集 ID
     * @param {string} [queryRequest.query] - 自然语言查询（与plan互斥）
     * @param {Object} [queryRequest.plan] - 查询计划对象（与query互斥）
     * @param {boolean} [queryRequest.stream] - 是否流式返回结果
     * @param {boolean} [queryRequest.summarize_result] - 是否返回结果摘要
     * @param {boolean} [queryRequest.rag_mode] - 是否只运行RAG查询计划
     * @returns {Promise<Object>} QueryResult 响应
     */
    async runQuery(queryRequest) {
        try {
            console.log('发送查询请求:', JSON.stringify(queryRequest, null, 2));
            const response = await this.client.post('/v1/query', queryRequest);
            return response.data;
        } catch (error) {
            console.error('查询运行失败:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }
}

module.exports = {
    ArynDocsetManager,
    ArynDocumentUploader,
    ArynQueryRunner
};