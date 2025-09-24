const MemoryStorage = require('./MemoryStorage');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ensure the temporary directory exists
const { getDirpath } = require('@src/utils/electron');
const knowledge_dir = getDirpath('Caches/knowledge');
fs.mkdirSync(knowledge_dir, { recursive: true });

/**
 * Local file-based storage implementation
 */
class FileStorage extends MemoryStorage {
  constructor({ directory = 'coding' } = {}) {
    super();
    this.storagePath = path.resolve(knowledge_dir, directory);
    this.ensureStorageDir();
    console.log('storagePath', this.storagePath);
  }

  ensureStorageDir() {
    try {
      fs.mkdirSync(this.storagePath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  getFilePath(filename) {
    if (filename.endsWith('.json')) {
      return path.join(this.storagePath, filename);
    }
    return path.join(this.storagePath, filename + '.json');
  }

  async save(memory) {
    if (!memory.id) memory.id = uuidv4();
    if (!memory.timestamp) memory.timestamp = Date.now();
    if (memory.importance === undefined) memory.importance = 1;

    const filepath = this.getFilePath(memory.id);
    fs.writeFileSync(filepath, JSON.stringify(memory, null, 2), 'utf8');
    return memory;
  }

  async get(id) {
    try {
      const filepath = this.getFilePath(id);
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async getAll() {
    try {
      const files = await fs.readdirSync(this.storagePath);
      const json_files = files.filter(file => file.endsWith('.json'));
      console.log('json_files', json_files);
      const memories = await Promise.all(
        json_files.map(file => {
          const filepath = this.getFilePath(file);
          const data = fs.readFileSync(filepath, 'utf8');
          return JSON.parse(data);
        })
      );
      return memories.filter(Boolean);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async update(id, updates = {}) {
    const memory = await this.get(id);
    if (!memory) return null;
    const updatedMemory = { ...memory, ...updates, updatedAt: Date.now() };
    await this.save(updatedMemory);
    return updatedMemory;
  }

  async delete(id) {
    try {
      const filepath = this.getFilePath(id);
      fs.unlinkSync(filepath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  async search(query, { limit = 10, offset = 0 } = {}) {
    const allMemories = await this.getAll();
    // Simple text search implementation
    const queryLower = query.toLowerCase();
    return allMemories
      .filter(memory =>
        memory.content.toLowerCase().includes(queryLower) ||
        JSON.stringify(memory.metadata || {}).toLowerCase().includes(queryLower)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
  }
}

module.exports = FileStorage;
