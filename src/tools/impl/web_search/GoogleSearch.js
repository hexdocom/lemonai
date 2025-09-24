const { google } = require('googleapis');

class GoogleSearch {
  constructor({ key: API_KEY, cx: SEARCH_ENGINE_ID }) {
    this.API_KEY = API_KEY;
    this.SEARCH_ENGINE_ID = SEARCH_ENGINE_ID;
    this.customsearch = google.customsearch('v1');
  }

  async search(query, options = {}) {
    if (!this.SEARCH_ENGINE_ID) {
      throw new Error('Google Search Engine ID (cx) is required. Please set GOOGLE_SEARCH_ENGINE_ID environment variable.');
    }

    const defaultOptions = {
      start: 1,
      num: 10,
      safe: 'medium',
      lr: 'lang_zh-CN|lang_en'
    };

    const requestOptions = {
      auth: this.API_KEY,
      cx: this.SEARCH_ENGINE_ID,
      q: query,
      ...defaultOptions,
      ...options
    };

    try {
      // Set 1 minute timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Google search timeout after 1 minute')), 60000);
      });

      const searchPromise = this.customsearch.cse.list(requestOptions);

      const response = await Promise.race([searchPromise, timeoutPromise]);
      this.result = response.data;
      return this.result;
    } catch (error) {
      if (error.message.includes('timeout')) {
        console.error('Google search timed out after 1 minute');
      } else {
        console.error('GoogleSearch error:', error);
      }
      throw error;
    }
  }

  async formatContent() {
    if (!this.result || !this.result.items) {
      return 'No search results found.';
    }

    const list = [];
    for (const item of this.result.items) {
      const description = `URL: ${item.link}\nTitle: ${item.title}\nContent: ${item.snippet}\n`;
      list.push(description);
    }
    return list.join('======\n======');
  }

  async formatJSON() {
    if (!this.result || !this.result.items) {
      return [];
    }

    return this.result.items.map(item => ({
      url: item.link,
      title: item.title,
      content: item.snippet,
      displayUrl: item.displayLink
    }));
  }

  async check() {
    try {
      const testQuery = "test connection";
      const response = await this.customsearch.cse.list({
        auth: this.API_KEY,
        cx: this.SEARCH_ENGINE_ID,
        q: testQuery,
        num: 1
      });

      if (response.data) {
        return { status: 'success', message: 'Google Custom Search API connection successful.' };
      } else {
        return { status: 'fail', message: 'Google Custom Search API returned no response' };
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return { status: 'fail', message: 'Google Custom Search API key or Search Engine ID is invalid.' };
      } else if (error.response && error.response.status === 403) {
        return { status: 'fail', message: 'Google Custom Search API daily quota exceeded or access denied.' };
      } else if (error.response) {
        return { status: 'fail', message: `Google Custom Search API error: ${error.response.status} - ${error.response.statusText || 'Unknown error'}` };
      } else {
        return { status: 'fail', message: `An unexpected error occurred: ${error.message}` };
      }
    }
  }
}

module.exports = GoogleSearch;