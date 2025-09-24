// utils/wechatpay.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


// 从环境变量中直接获取配置，便于模块化
const API_V3_ENDPOINT = 'https://api.mch.weixin.qq.com';
// 直连商户模式的 AppID 和 MchID
const APP_ID = process.env.WECHATPAY_APP_ID;     // 直连商户的应用 ID
const MCH_ID = process.env.WECHATPAY_MCH_ID;     // 直连商户的商户号

const API_V3_KEY = process.env.WECHATPAY_API_V3_KEY;
const MERCHANT_PRIVATE_KEY_PATH = process.env.WECHATPAY_MERCHANT_PRIVATE_KEY_PATH;
const MERCHANT_SERIAL_NO = process.env.WECHATPAY_MERCHANT_SERIAL_NO;

const NOTIFY_URL = process.env.WECHATPAY_NOTIFY_URL; // 添加通知 URL
// 默认证书存储目录为项目根目录下的 certs/wechatpay_platform_certs
const WECHATPAY_PLATFORM_CERTS_DIR = process.env.WECHATPAY_PLATFORM_CERTS_DIR || path.join(__dirname, '../certs/wechatpay_platform_certs');

// --- 商户私钥加载 ---
let merchantPrivateKey;
try {
    merchantPrivateKey = fs.readFileSync(MERCHANT_PRIVATE_KEY_PATH, 'utf8');
    console.log('商户私钥文件已加载。');
} catch (e) {
    console.error('错误：无法加载商户私钥文件。请检查路径和文件权限:', MERCHANT_PRIVATE_KEY_PATH, e.message);
    console.error('请确保私钥文件（例如 apiclient_key.pem）存在于指定路径，且为 PEM 格式，且未加密。');
    // 在生产环境中，这里可能需要抛出错误或终止进程，因为没有私钥无法进行核心业务。
    // process.exit(1);
}

/**
 * 生成随机字符串 Nonce Str
 */
function generateNonceStr() {
    return uuidv4().replace(/-/g, '');
}

function createSign(signStr) {
    let cert = fs.readFileSync(MERCHANT_PRIVATE_KEY_PATH, "utf-8");
    let sign = crypto.createSign("RSA-SHA256");
    sign.update(signStr);
    return sign.sign(cert, "base64");
}
/**
 * 生成 V3 API Authorization 请求头
 * @param {string} method - HTTP 请求方法 (GET, POST, etc.)
 * @param {string} urlPath - 请求的 URL 路径 (不包含域名和查询参数, 例如: '/v3/certificates')
 * @param {number} timestamp - 当前时间戳 (秒)
 * @param {string} nonce - 随机字符串 (用于 Authorization 头中的 nonce_str)
 * @param {Object|string} body - 请求体 (POST/PUT 请求时为 JSON 对象，GET/DELETE 为空字符串或 null)
 * @returns {string|null} Authorization Header 字符串，如果私钥未加载则返回 null
 */
function generateAuthorizationHeader(method, urlPath, timestamp, nonce, body) {
    if (!merchantPrivateKey) {
        console.error('商户私钥未加载，无法生成 Authorization Header。');
        return null;
    }
    const mchid = MCH_ID; // 使用直连商户号 MCH_ID
    const serialNo = MERCHANT_SERIAL_NO; // 商户证书序列号

    const bodyString = body ? JSON.stringify(body) : ''; // GET 请求时 body 为空字符串

    // 构建签名原始字符串
    // 格式: HTTP请求方法\nURLPath\n时间戳\n随机字符串\n请求体\n
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${bodyString}\n`;

    console.log("\n--- 签名原始字符串调试 ---");
    console.log(`  Method: ${method}`);
    console.log(`  URL Path: ${urlPath}`);
    console.log(`  Timestamp: ${timestamp}`);
    console.log(`  Nonce: ${nonce}`);
    console.log(`  Body String (JSON): ${bodyString}`);
    console.log(`  完整签名原始字符串 (请逐字比对):`);
    // 打印带有可见换行符的原始字符串，便于比对
    console.log(`\`${message.replace(/\n/g, '\\n')}\``);
    console.log("--- 签名原始字符串调试结束 ---\n");


    // 使用商户私钥和 RSA-SHA256 算法签名
    let signature
    try {
        signature = createSign(message)
        console.log("signature:", signature)
        //signature = signer.sign(merchantPrivateKey, 'base64'); // 生成 Base64 编码的签名
    } catch (e) {
        console.error('签名过程中发生错误，可能是私钥格式不正确或损坏:', e.message);
        return null;
    }


    // 构建 Authorization 请求头
    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;

    console.log(authorization)
    return authorization;
}

const decodePayNotify = (resource)=> {
    const v3Key = '624ee78e3f48ad7f7a4cfdcf11111111' // 微信后台获取 v3 key
    try {
        const { ciphertext, associated_data, nonce } = resource
        const AUTH_KEY_LENGTH = 16
        // 密钥
        const key_bytes = Buffer.from(v3Key, 'utf-8')
        // 随机串
        const nonce_bytes = Buffer.from(nonce, 'utf-8')
        // 填充内容
        const associated_data_bytes = Buffer.from(associated_data, 'utf-8')
        // 密文Buffer
        const ciphertext_bytes = Buffer.from(ciphertext, 'base64')
        // 计算减去16位长度
        const cipherdata_length = ciphertext_bytes.length - AUTH_KEY_LENGTH
        // upodata
        const cipherdata_bytes = ciphertext_bytes.slice(0, cipherdata_length)
        // tag
        const auth_tag_bytes = ciphertext_bytes.slice(cipherdata_length, ciphertext_bytes.length);
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm', key_bytes, nonce_bytes
        );
        decipher.setAuthTag(auth_tag_bytes);
        decipher.setAAD(Buffer.from(associated_data_bytes));
        const output = Buffer.concat([
            decipher.update(cipherdata_bytes),
            decipher.final(),
        ]);
        // 解密后 转成 JSON 格式输出
        return JSON.parse(output.toString('utf8'));
    } catch (error) {
        console.log('解密失败', error)
        throw error
    }
}

function decrypt(nonce, ciphertext, associatedData) { // 建议把 key 也作为参数传入
    // 确保密钥是32字节（256位）的AES-256-GCM密钥。
    // const key = "Your32Apiv3Key"; // 如果 key 不作为参数传入，则在这里定义

    try {
        const keyBytes = Buffer.from(API_V3_KEY, 'utf8');
        // 微信支付的 nonce 是 16 进制字符串，需要转换成 Buffer。
        // 长度应为 24 个十六进制字符（12 字节）。
        const nonceBytes = Buffer.from(nonce, 'hex');
        const adBytes = Buffer.from(associatedData, 'utf8');
        // Base64解码密文
        const data = Buffer.from(ciphertext, 'base64');

        // 对于AES-GCM，Python的AESGCM.decrypt通常期望密文包含认证标签。
        // 在Node.js中，我们需要将认证标签从密文中分离出来。
        // GCM的认证标签通常是16字节。
        const tagLength = 16;
        const encryptedData = data.slice(0, data.length - tagLength);
        const authTag = data.slice(data.length - tagLength);

        // *** 修正点：这里使用 createDecipheriv，并指定算法为 'aes-256-gcm' ***
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, nonceBytes);

        // 设置附加认证数据
        decipher.setAAD(adBytes);
        // 设置认证标签。如果标签不匹配，解密将失败并抛出错误。
        decipher.setAuthTag(authTag);

        // 更新解密器并获取解密后的部分数据
        let decrypted = decipher.update(encryptedData);
        // 完成解密过程，获取剩余数据。
        // 如果认证标签无效，decipher.final()将抛出错误。
        decrypted += decipher.final();

        // 假设解密后的数据是UTF-8文本，并将其转换为字符串
        return decrypted.toString('utf8');
    } catch (error) {
        console.error("解密失败:", error.message);
        throw new Error("解密失败: " + error.message);
    }
}


module.exports = {
    generateNonceStr,
    generateAuthorizationHeader,
    decodePayNotify,
    // 导出所有配置，方便路由直接使用
    wechatPayConfig: {
        API_V3_ENDPOINT, APP_ID, MCH_ID,
        API_V3_KEY, MERCHANT_PRIVATE_KEY_PATH, MERCHANT_SERIAL_NO,
        NOTIFY_URL, WECHATPAY_PLATFORM_CERTS_DIR
    }
};
