const TalivySearch = require('./impl/web_search/TalivySearch');
const LocalSearch = require('./impl/web_search/LocalSearch');
const CloudswaySearch = require('./impl/web_search/CloudswaySearch');
const UserProviderConfig = require('@src/models/UserProviderConfig');
const SearchProvider = require('@src/models/SearchProvider');
const UserSearchSetting = require('@src/models/UserSearchSetting');
const sub_server_request = require('@src/utils/sub_server_request')

/** @type {import('types/Tool').Tool} */
const WebSearchTool = {
    name: "web_search", // Snake_case is common for LLM function names
    description: `Use this tool to search the web for information`,
    params: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "the search key words split with space",
            },
            num_results: {
                type: "integer",
                description: "Optional. The desired number of search results (default: 3).",
            }
        },
        required: ["query"], // Only 'query' is mandatory
    },
    memorized: true,

    /**
     * Gets the description of the web search action.
     * @param {object} args - The arguments for the search.
     * @param {string} args.query - The search query.
     * @param {number} [args.num_results=3] - Optional number of results.
     * @returns {Promise<string>} A promise resolving to a string containing the action description.
     */
    getActionDescription: async ({ query, num_results = 3 }) => {
        return query;
    },

    /**
     * Executes the web search.
     * @param {object} args - The arguments for the search.
     * @param {string} args.query - The search query.
     * @param {number} [args.num_results=3] - Optional number of results.
     * @param {string} args.conversation_id
     * @returns {Promise<Object>} A promise resolving to a string containing the search results.
     */
    execute: async ({ query, num_results = 3, conversation_id = "" }) => {
        try {
            // 如果设置了，默认走设置
            let userSearchSetting = await UserSearchSetting.findOne()
            num_results = userSearchSetting.dataValues.result_count || 3

            console.log(`[WebSearchTool] Searching for: "${query}" (max ${num_results} results)`);
            if (!query || typeof query !== 'string' || query.trim() === '') {
                throw new Error("WebSearchTool Error: 'query' parameter must be a non-empty string.");
            }
            if (typeof num_results !== 'number' || !Number.isInteger(num_results) || num_results <= 0) {
                console.warn(`[WebSearchTool] Invalid num_results value (${num_results}), defaulting to 3.`);
                num_results = 3;
            }

            // 判断当前设置
            const searchProvider = await SearchProvider.findOne({ where: { id: userSearchSetting.provider_id } })
            let json = {}
            let content = ''
            let obj
            switch (searchProvider.name) {
                case 'Tavily':
                    obj = await doTalivySearch(query, num_results)
                    json = obj.json
                    content = obj.content
                    break;
                case 'Cloudsway':
                    obj = await doCloudswaySearch(query, num_results)
                    json = obj.json
                    content = obj.content
                    break;
                case 'Baidu':
                    obj = await doLocalSearch(query, 'baidu', num_results)
                    json = obj.json
                    content = obj.content
                    break;
                case 'Bing':
                    obj = await doLocalSearch(query, 'bing', num_results)
                    json = obj.json
                    content = obj.content
                    break;
                case 'Lemon':
                    obj = await doLemonSearch(query, num_results, conversation_id)
                    json = obj.json
                    content = obj.content
                    break;
            }
            return {
                content,
                meta: { json }
            }
        } catch (error) {
            console.error(`[WebSearchTool] Error during execution for query "${query}":`, error);
            // Return a user-friendly error message or re-throw for the agent to handle
            throw new Error(`Error performing web search for "${query}". Please check the logs or try again. Details: ${error.message || 'Unknown error'}`);
        }
    },
};

async function doTalivySearch(query, num_results) {
    let userSearchSetting = await UserSearchSetting.findOne()
    const userProviderConfig = await UserProviderConfig.findOne({ where: { provider_id: userSearchSetting.provider_id } })
    let tavily_api_key = userProviderConfig.base_config.api_key

    const talivy = new TalivySearch({ key: tavily_api_key });
    const results = await talivy.search(query, { max_results: num_results });
    // console.log(`[WebSearchTool] Search results for "${query}":`, results);

    const formatted = await talivy.formatContent();
    const json = await talivy.formatJSON();
    const content = `Web search results for "${query}":\n\n${formatted}`;

    return { json, content }
}

async function doLemonSearch(query, num_results, conversation_id) {
    return sub_server_request('/api/sub_server/search', {
        query,
        num_results,
        conversation_id
    })
}

async function doCloudswaySearch(query, num_results) {
    let userSearchSetting = await UserSearchSetting.findOne()
    const userProviderConfig = await UserProviderConfig.findOne({ where: { provider_id: userSearchSetting.provider_id } })
    let cloudsway_access_key = userProviderConfig.base_config.api_key
    let cloudsway_endpoint = userProviderConfig.base_config.endpoint
    const cloudsway = new CloudswaySearch({ access_key: cloudsway_access_key, endpoint: cloudsway_endpoint });
    const results = await cloudsway.search(query, { max_results: num_results });
    // console.log(`[WebSearchTool] Search results for "${query}":`, results);
    const formatted = await cloudsway.formatContent();
    const json = await cloudsway.formatJSON();
    const content = `Web search results for "${query}":\n\n${formatted}`;
    console.log(`[WebSearchTool] doCloudswaySearch Search results for "${query}":`, results)
    return { json, content }
}


async function doLocalSearch(query, engine_name, num_results) {
    const localSearch = new LocalSearch()
    const results = await localSearch.search(query, { uid: 'user1', max_results: num_results, engine: engine_name });
    let formatted = await localSearch.formatContent()
    const json = await localSearch.formatJSON();
    const content = `Web search results for "${query}":\n\n${formatted}`;

    return { json, content }
}


module.exports = WebSearchTool;