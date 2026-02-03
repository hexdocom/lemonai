const axios = require('axios');

class MetasoSearch {
  constructor({ key: API_KEY, endpoint: ENDPOINT }) {
    this.API_KEY = API_KEY;
    this.baseUrl = ENDPOINT;
  }

  ensureConfig() {
    if (!this.baseUrl) {
      throw new Error('Metaso Search endpoint is required. Please configure it in the search provider settings.');
    }
    if (!this.API_KEY) {
      throw new Error('Metaso API key is required. Please configure it in the search provider settings.');
    }
  }

  async search(query, options = {}) {
    this.ensureConfig();
    
    try {
      const searchUrl = `${this.baseUrl}/search`;
      console.log(`[MetasoSearch] Sending request to ${searchUrl} with query: ${query}`);
      console.log(`[MetasoSearch] API Key present: ${!!this.API_KEY}`);
      
      const axiosConfig = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };
      
      // Try with Bearer token first
      if (this.API_KEY) {
        axiosConfig.headers['Authorization'] = `Bearer ${this.API_KEY}`;
      }
      
      const requestOptions = {
        q: query,
        ...options
      };

//       {
//     "q":"ai"
// }
      console.log(`[MetasoSearch] Request options:`, requestOptions);
      console.log(`API_KEY: ${this.API_KEY}`);
      console.log(`Search URL: ${searchUrl}`);
      const response = await axios.post(searchUrl, requestOptions, axiosConfig);

      console.log(`[MetasoSearch] Response status: ${response.status}`);
      console.log(`[MetasoSearch] Response data:`, response.data);
      this.result = response.data;
      return this.result;
    } catch (error) {
      console.error('[MetasoSearch] Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: this.baseUrl,
        timeout: error.timeout
      });
      throw error;
    }
  }

  getResults() {
    const data = this.result || {};
    // Metaso API returns results in 'webpages' array
    return data.webpages || data.results || data.data?.results || data.items || [];
  }

  async formatContent() {
    const results = this.getResults();
    const list = [];
    for (const item of results) {
      const url = item.link || item.url || 'N/A';
      const title = item.title || item.name || 'N/A';
      const content = item.snippet || item.content || item.description || 'N/A';
      const description = `URL: ${url}\nTitle: ${title}\nContent: ${content}\n`;
      list.push(description);
    }
    return list.join('======\n======');
  }

  async formatJSON() {
    const results = this.getResults();
    return results.map(item => ({
      url: item.link || item.url,
      title: item.title || item.name,
      content: item.snippet || item.content || item.description
    }));
  }

  async check() {
    try {
      this.ensureConfig();
      const searchUrl = `${this.baseUrl}/search`;
      const response = await axios.post(searchUrl, {
        q: 'test connection',
        max_results: 1
      }, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        return { status: 'success', message: 'Metaso Search API connection successful.' };
      }
      return { status: 'fail', message: `Metaso Search API returned status: ${response.status}` };
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          return { status: 'fail', message: 'Metaso Search API key is invalid or unauthorized.' };
        }
        return {
          status: 'fail',
          message: `Metaso Search API error: ${error.response.status} - ${error.response.statusText || 'Unknown error'}`
        };
      }
      if (error.request) {
        return { status: 'fail', message: 'No response received from Metaso Search API. Check network connection.' };
      }
      return { status: 'fail', message: `An unexpected error occurred: ${error.message}` };
    }
  }
}

module.exports = MetasoSearch;
