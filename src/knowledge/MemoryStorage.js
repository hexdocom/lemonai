/**
 * Base Memory Storage Interface
 * All storage implementations must implement these methods
 */
class MemoryStorage {
  /**
   * Save a memory to storage
   * @param {Object} memory - The memory object to save
   * @returns {Promise<Object>} The saved memory
   */
  async save(memory) { throw new Error('Not implemented'); }

  /**
   * Get a memory by ID
   * @param {string} id - The ID of the memory to retrieve
   * @returns {Promise<Object|null>} The memory object or null if not found
   */
  async get(id) { throw new Error('Not implemented'); }

  /**
   * Get all stored memories
   * @returns {Promise<Array<Object>>} Array of all memories
   */
  async getAll() { throw new Error('Not implemented'); }

  /**
   * Update a memory
   * @param {string} id - The ID of the memory to update
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Object|null>} The updated memory or null if not found
   */
  async update(id, updates) { throw new Error('Not implemented'); }

  /**
   * Delete a memory by ID
   * @param {string} id - The ID of the memory to delete
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) { throw new Error('Not implemented'); }

  /**
   * Search for memories matching a query
   * @param {string} query - The search query
   * @param {Object} options - Search options
   * @param {number} [options.limit=10] - Maximum number of results to return
   * @param {number} [options.offset=0] - Number of results to skip
   * @returns {Promise<Array<Object>>} Array of matching memories
   */
  async search(query, options = {}) { throw new Error('Not implemented'); }
}


module.exports = MemoryStorage
