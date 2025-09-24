const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

/**
 * 使用 Playwright 生成网页截图
 * @param {string} url - 要截图的网页URL
 * @param {Object} [options] - 截图选项
 * @param {string} [options.outputPath] - 输出文件路径 (可选，默认生成时间戳文件名)
 * @param {number} [options.width=1920] - 浏览器窗口宽度
 * @param {number} [options.height=1080] - 浏览器窗口高度
 * @param {number} [options.timeout=30000] - 页面加载超时时间 (ms)
 * @param {boolean} [options.fullPage=true] - 是否截取完整页面
 * @param {'png'|'jpeg'} [options.format='png'] - 图片格式
 * @param {number} [options.quality=90] - 图片质量 0-100 (仅对jpeg有效)
 * @param {boolean} [options.headless=true] - 是否无头模式
 * @param {number} [options.waitTime=2000] - 页面加载后等待时间 (ms)
 * @param {string} [options.accessToken] - 访问令牌，用于设置请求头
 * @param {string} [options.conversation_id] - 会话ID，用于拼接文件名
 * @returns {Promise<Object>} 返回截图信息
 */
async function takeScreenshot(url, options = {}) {
    const {
        outputPath,
        width = 1920,
        height = 1080,
        timeout = 30000,
        fullPage = true,
        format = 'png',
        quality = 90,
        headless = true,
        waitTime = 2000,
        accessToken, // 你的 token
        conversation_id,
    } = options;
    const localStorageKey = 'access_token' // localStorage 的 key

    let browser = null;
    let page = null;

    try {
        browser = await chromium.launch({ headless });
        page = await browser.newPage({ viewport: { width, height } });
        page.setDefaultTimeout(timeout);

        // 1. 先访问同源页面（如首页）
        const baseUrl = url.split('/').slice(0, 3).join('/');
        try {
            await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        } catch (error) {
            console.log('访问基础页面失败，继续尝试直接访问目标页面');
        }

        // 2. 设置 localStorage
        if (accessToken) {
            try {
                await page.evaluate(
                    ([key, value]) => localStorage.setItem(key, value),
                    [localStorageKey, accessToken]
                );
            } catch (error) {
                console.log('设置localStorage失败:', error.message);
            }
        }

        // 3. 跳转到目标页面
        console.log(`正在访问: ${url}`);
        
        // 尝试多种等待策略
        let pageLoaded = false;
        const waitStrategies = [
            { waitUntil: 'domcontentloaded', timeout: 15000 },
            { waitUntil: 'load', timeout: 20000 },
            { waitUntil: 'networkidle', timeout: 30000 }
        ];

        for (const strategy of waitStrategies) {
            try {
                await page.goto(url, strategy);
                pageLoaded = true;
                console.log(`页面加载成功，使用策略: ${strategy.waitUntil}`);
                break;
            } catch (error) {
                console.log(`策略 ${strategy.waitUntil} 失败: ${error.message}`);
                if (strategy === waitStrategies[waitStrategies.length - 1]) {
                    throw error; // 最后一个策略也失败了
                }
            }
        }

        // 等待指定时间，确保页面完全加载
        if (waitTime > 0) {
            console.log(`等待 ${waitTime}ms 确保页面完全加载...`);
            await page.waitForTimeout(waitTime);
        }

        // 检查页面是否真的加载了内容
        const pageContent = await page.content();
        if (!pageContent || pageContent.length < 100) {
            throw new Error('页面内容为空或过少，可能加载失败');
        }

        // 生成输出文件路径
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFileName = `screenshot-${conversation_id}.${format}`;
        const finalOutputPath = outputPath || path.join(__dirname, '../../public', 'screenshots', defaultFileName);

        // 确保输出目录存在
        const outputDir = path.dirname(finalOutputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // 生成截图
        console.log(`正在生成截图: ${finalOutputPath}`);
        const screenshotBuffer = await page.screenshot({
            path: finalOutputPath,
            fullPage: fullPage,
            type: format === 'jpeg' ? 'jpeg' : 'png',
            quality: format === 'jpeg' ? quality : undefined
        });

        // 获取页面信息
        const pageInfo = {
            title: await page.title(),
            url: page.url(),
            viewport: await page.viewportSize()
        };

        console.log('截图生成成功!');

        return {
            success: true,
            outputPath: finalOutputPath,
            buffer: screenshotBuffer,
            pageInfo: pageInfo,
            options: {
                width,
                height,
                fullPage,
                format,
                quality
            }
        };

    } catch (error) {
        console.error('截图生成失败:', error.message);
        
        // 尝试获取更多错误信息
        if (page) {
            try {
                const currentUrl = page.url();
                const title = await page.title();
                console.error(`当前页面URL: ${currentUrl}`);
                console.error(`页面标题: ${title}`);
            } catch (e) {
                console.error('无法获取页面信息:', e.message);
            }
        }

        return {
            success: false,
            error: error.message,
            url: url
        };
    } finally {
        // 清理资源
        if (page) {
            await page.close();
        }
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * 批量生成截图
 * @param {Array} urls - URL数组
 * @param {Object} options - 截图选项
 * @returns {Promise<Array>} 返回截图结果数组
 */
async function takeMultipleScreenshots(urls, options = {}) {
    const results = [];

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\n处理第 ${i + 1}/${urls.length} 个URL: ${url}`);

        const result = await takeScreenshot(url, {
            ...options,
            outputPath: options.outputPath ?
                options.outputPath.replace('.png', `-${i + 1}.png`) :
                undefined
        });

        results.push(result);

        // 添加延迟避免过快请求
        if (i < urls.length - 1 && options.delay) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
        }
    }

    return results;
}

/**
 * 生成PDF版本（可选功能）
 * @param {string} url - 要转换的网页URL
 * @param {Object} options - PDF选项
 * @returns {Promise<Object>} 返回PDF生成结果
 */
async function generatePDF(url, options = {}) {
    const {
        outputPath,
        width = 1920,
        height = 1080,
        timeout = 30000,
        headless = true,
        waitTime = 2000
    } = options;

    let browser = null;
    let page = null;

    try {
        browser = await chromium.launch({ headless: headless });
        page = await browser.newPage({ viewport: { width, height } });
        page.setDefaultTimeout(timeout);

        await page.goto(url, { waitUntil: 'networkidle' });

        if (waitTime > 0) {
            await page.waitForTimeout(waitTime);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFileName = `page-${timestamp}.pdf`;
        const finalOutputPath = outputPath || path.join(process.cwd(), 'screenshots', defaultFileName);

        const outputDir = path.dirname(finalOutputPath);
        await fs.mkdir(outputDir, { recursive: true });

        await page.pdf({
            path: finalOutputPath,
            format: 'A4',
            printBackground: true
        });

        return {
            success: true,
            outputPath: finalOutputPath,
            url: url
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            url: url
        };
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

module.exports = {
    takeScreenshot,
    takeMultipleScreenshots,
    generatePDF
};
