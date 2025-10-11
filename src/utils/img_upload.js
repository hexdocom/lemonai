require('dotenv').config()
const fs = require('fs').promises;
const path = require('path');
const { takeScreenshot } = require('./screen_shot');

/**
 * File upload utility class (local storage)
 */
class ImgUploader {
    constructor() {
        console.log('File upload utility initialized successfully (local storage mode)');
    }

    /**
     * Generate unique file name
     * @param {string} originalName - Original file name
     * @param {string} prefix - File prefix
     * @returns {string} Unique file name
     */
    generateUniqueFileName(originalName, prefix = 'screenshots') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(originalName);
        const name = path.basename(originalName, ext);

        return `${prefix}/${name}${ext}`;
    }

    /**
     * Save file to public folder
     * @param {string|Buffer} file - File path, Buffer or base64 string
     * @param {Object} options - Upload options
     * @param {string} [options.objectName] - File name
     * @param {string} [options.prefix] - File prefix (subfolder)
     * @returns {Promise<Object>} Save result
     */
    async uploadFile(file, options = {}) {
        const {
            objectName,
            prefix = 'uploads'
        } = options;

        try {
            let buffer;
            let fileName;

            // Handle file input
            if (typeof file === 'string') {
                // Check if it's a base64 string
                if (file.startsWith('data:image/')) {
                    const matches = file.match(/^data:([^;]+);base64,(.+)$/);
                    if (matches) {
                        const mimeType = matches[1];
                        const base64Data = matches[2];
                        buffer = Buffer.from(base64Data, 'base64');
                        // Determine file extension based on MIME type
                        const ext = this.getExtensionFromMimeType(mimeType);
                        fileName = options.fileName || `screenshot-${Date.now()}${ext}`;
                    } else {
                        throw new Error('Invalid base64 data format');
                    }
                } else {
                    // File path
                    buffer = await fs.readFile(file);
                    fileName = path.basename(file);
                }
            } else if (Buffer.isBuffer(file)) {
                // Buffer
                buffer = file;
                fileName = options.fileName || `file-${Date.now()}`;
            } else {
                throw new Error('Unsupported file type');
            }

            // Generate file name
            const finalFileName = objectName || this.generateUniqueFileName(fileName, prefix);

            // Build save path (ensure it's under the project root's public folder)
            const projectRoot = path.resolve(__dirname, '../../');
            const publicDir = path.join(projectRoot, 'public');
            const targetDir = path.join(publicDir, path.dirname(finalFileName));
            const targetPath = path.join(publicDir, finalFileName);

            // Ensure target directory exists
            await fs.mkdir(targetDir, { recursive: true });

            console.log(`Starting to save file locally: ${targetPath}`);

            // Save file to public folder
            await fs.writeFile(targetPath, buffer);

            // Generate access URL (relative to public folder path)
            const url = `http://localhost:5005/${finalFileName.replace(/\\/g, '/')}`;

            console.log('File saved successfully:', url);

            return {
                success: true,
                url: url,
                objectName: finalFileName,
                localPath: targetPath,
                size: buffer.length,
                fileName: fileName
            };

        } catch (error) {
            console.error('File save failed:', error.message);
            return {
                success: false,
                error: error.message,
                fileName: typeof file === 'string' ? path.basename(file) : 'unknown'
            };
        }
    }

    /**
     * Get Content-Type based on file name
     * @param {string} fileName - File name
     * @returns {string} Content-Type
     */
    getContentType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }

    /**
     * Get file extension based on MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} File extension
     */
    getExtensionFromMimeType(mimeType) {
        const extensionMap = {
            'image/png': '.png',
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'application/json': '.json',
            'application/xml': '.xml',
            'text/html': '.html',
            'text/css': '.css',
            'application/javascript': '.js'
        };

        return extensionMap[mimeType] || '.png'; // Default to png
    }

    /**
     * Generate web page screenshot and save to public folder
     * @param {string} url - Web page URL to screenshot
     * @param {Object} screenshotOptions - Screenshot options
     * @param {Object} uploadOptions - Upload options
     * @returns {Promise<Object>} Screenshot save result
     */
    async takeScreenshotAndUpload(url, screenshotOptions = {}, uploadOptions = {}) {
        try {
            console.log(`Starting to generate web page screenshot: ${url}`);

            // Generate screenshot
            const screenshotResult = await takeScreenshot(url, screenshotOptions);

            if (!screenshotResult.success) {
                return {
                    success: false,
                    error: screenshotResult.error,
                    url: url
                };
            }

            // Save screenshot to public folder
            const uploadResult = await this.uploadFile(screenshotResult.buffer, {
                fileName: path.basename(screenshotResult.outputPath),
                prefix: 'screenshots',
                ...uploadOptions
            });

            if (uploadResult.success) {
                // Clean up temporary screenshot file
                try {
                    await fs.unlink(screenshotResult.outputPath);
                    console.log('Temporary screenshot file cleaned up');
                } catch (cleanupError) {
                    console.warn('Failed to clean up temporary file:', cleanupError.message);
                }
            }

            return {
                success: uploadResult.success,
                screenshotUrl: uploadResult.url,
                screenshotInfo: screenshotResult.pageInfo,
                screenshotOptions: screenshotResult.options,
                originalUrl: url,
                error: uploadResult.error
            };

        } catch (error) {
            console.error('Screenshot save failed:', error.message);
            return {
                success: false,
                error: error.message,
                url: url
            };
        }
    }

    /**
     * Generate multiple screenshots and save in batch
     * @param {Array} urls - URL array
     * @param {Object} screenshotOptions - Screenshot options
     * @param {Object} uploadOptions - Upload options
     * @returns {Promise<Array>} Batch save results
     */
    async takeMultipleScreenshotsAndUpload(urls, screenshotOptions = {}, uploadOptions = {}) {
        const results = [];

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`\nProcessing URL ${i + 1}/${urls.length}: ${url}`);

            const result = await this.takeScreenshotAndUpload(url, screenshotOptions, uploadOptions);
            results.push(result);

            // Add delay to avoid too fast requests
            if (i < urls.length - 1 && screenshotOptions.delay) {
                await new Promise(resolve => setTimeout(resolve, screenshotOptions.delay));
            }
        }

        return results;
    }

    /**
     * Delete local file
     * @param {string} fileName - File name (relative to public folder)
     * @returns {Promise<Object>} Delete result
     */
    async deleteFile(fileName) {
        try {
            const projectRoot = path.resolve(__dirname, '../../');
            const publicDir = path.join(projectRoot, 'public');
            const filePath = path.join(publicDir, fileName);

            await fs.unlink(filePath);
            console.log('File deleted successfully:', fileName);

            return {
                success: true,
                fileName: fileName,
                localPath: filePath
            };

        } catch (error) {
            console.error('File deletion failed:', error.message);
            return {
                success: false,
                error: error.message,
                fileName: fileName
            };
        }
    }

    /**
     * Get file access URL
     * @param {string} fileName - File name (relative to public folder)
     * @returns {string} File access URL
     */
    getFileUrl(fileName) {
        // Return relative path URL
        return `/${fileName.replace(/\\/g, '/')}`;
    }

    /**
     * Check if file exists
     * @param {string} fileName - File name (relative to public folder)
     * @returns {Promise<boolean>} Whether file exists
     */
    async fileExists(fileName) {
        try {
            const projectRoot = path.resolve(__dirname, '../../');
            const publicDir = path.join(projectRoot, 'public');
            const filePath = path.join(publicDir, fileName);

            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Save base64 image to public folder
     * @param {string} base64Data - Base64 format image data
     * @param {Object} options - Save options
     * @param {string} [options.prefix] - File prefix, defaults to 'screenshots'
     * @param {string} [options.fileName] - Custom file name
     * @returns {Promise<Object>} Save result
     */
    async uploadBase64Image(base64Data, options = {}) {
        try {
            if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:image/')) {
                throw new Error('Invalid base64 image data');
            }

            const uploadOptions = {
                prefix: 'screenshots',
                ...options
            };

            const result = await this.uploadFile(base64Data, uploadOptions);
            if (result.success) {
                console.log('Base64 image saved successfully:', result.url);
            }
            return result;
        } catch (error) {
            console.error('Base64 image save failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save AI-generated image result to public folder
     * @param {Object} imageResult - AI-generated image result
     * @param {Object} uploadOptions - Save options
     * @returns {Promise<Object>} AI-generated image save result
     */
    async uploadGeneratedImageToOSS(imageResult, uploadOptions = {}) {
        try {
            console.log(`🎨 Starting to save AI-generated image locally`);

            if (!imageResult || !imageResult.success) {
                return {
                    success: false,
                    error: imageResult?.error || 'Invalid image generation result',
                    imageResult: imageResult
                };
            }

            const imageData = imageResult.data;
            const imageUrl = imageData.imageUrl;
            const metadata = imageData.metadata || {};
            const prompt = imageData.originalPrompt || imageData.prompt || 'unknown';

            // Generate file name
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const shortPrompt = prompt.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
            const fileName = uploadOptions.fileName || `ai_image_${shortPrompt}_${timestamp}.png`;

            // Prepare save options
            const finalUploadOptions = {
                fileName: fileName,
                prefix: 'ai-generated-images',
                ...uploadOptions
            };

            // Save image to public folder
            const uploadResult = await this.uploadFile(imageUrl, finalUploadOptions);

            if (!uploadResult.success) {
                return {
                    success: false,
                    error: uploadResult.error,
                    originalImageUrl: imageUrl,
                    imageResult: imageResult
                };
            }

            console.log('AI-generated image saved successfully:', uploadResult.url);

            return {
                success: true,
                imageUrl: uploadResult.url,
                originalImageUrl: imageUrl,
                imageInfo: {
                    prompt: prompt,
                    metadata: metadata,
                    fileName: uploadResult.fileName,
                    objectName: uploadResult.objectName,
                    size: uploadResult.size
                },
                originalResult: imageResult,
                uploadInfo: {
                    url: uploadResult.url,
                    objectName: uploadResult.objectName,
                    localPath: uploadResult.localPath
                }
            };

        } catch (error) {
            console.error('AI-generated image save failed:', error.message);
            return {
                success: false,
                error: error.message,
                imageResult: imageResult
            };
        }
    }
}

// Create singleton instance
const imgUploader = new ImgUploader();


module.exports = {
    ImgUploader,
    imgUploader,
    // Convenience methods
    uploadFile: (file, options) => imgUploader.uploadFile(file, options),
    uploadBase64Image: (base64Data, options) => imgUploader.uploadBase64Image(base64Data, options),
}; 