const fs = require('fs').promises;
const path = require('path');
const xlsx = require('node-xlsx');

const { readXlsxOptimized } = require('./read_xlsx_optimized');

/**
 * Reads the content of a file asynchronously.
 * 
 * @param {string} filepath - The absolute or relative path to the file.
 * @returns {Promise<string>} A promise that resolves with the file content as a string or parsed data for xlsx files.
 * @throws {Error} If the file cannot be read (e.g., does not exist, permissions error).
 */
async function read_file(filepath) {
  try {
    // Resolve the path to ensure it's absolute if needed, though fs handles relative paths
    const absolute_path = path.resolve(filepath);
    // Basic file type detection based on extension
    const extension = path.extname(absolute_path).toLowerCase();
    console.log(`Reading file: ${absolute_path}, Type based on extension: ${extension}`);
    // xlsx file handling
    if (extension === '.xlsx') {
      // use node-xlsx to parse xlsx file and convert to markdown
      const result = readXlsxOptimized(absolute_path);
      return result.content;
    } else {
      // try reading as utf8
      const content = await fs.readFile(absolute_path, 'utf8');
      return content;
    }
  } catch (error) {
    console.error(`Error reading file at ${filepath}:`, error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

module.exports = read_file;