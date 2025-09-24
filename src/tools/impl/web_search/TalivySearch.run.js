require('dotenv').config();
require('module-alias/register')

const TalivySearch = require('@src/tools/impl/web_search/TalivySearch.js')

const run = async () => {
  const tool = new TalivySearch({ key: process.env.TAVILY_KEY })
  const result = await tool.search('北京今日天气', { max_results: 3 })
  // console.log(JSON.stringify(result, null, 2))
  const formatted = await tool.formatContent()
  console.log(formatted)
}

run()