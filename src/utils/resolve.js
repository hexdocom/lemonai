// https://github.com/NaturalIntelligence/fast-xml-parser
const { XMLParser, XMLBuilder, XMLValidator } = require("fast-xml-parser");

const resolveXML = (content) => {
  const parser = new XMLParser({
    stopNodes: ["write_code.content"],
    ignoreAttributes: false,
  });
  const result = parser.parse(content);
  // Temporary solution
  // TODO: Optimize Prompt to gen code with CDATA
  if (result.write_code && result.write_code.content && result.write_code.content.trim().startsWith(`<![CDATA[`)) {
    const content = result.write_code.content.trim();
    result.write_code.content = content.replace(`<![CDATA[`, '').replace(`]]>`, '');
  }
  return result;
}

const resolveActions = xml => {
  try {
    const resolved = resolveXML(xml);
    const actions = []
    for (let key in resolved) {
      const value = resolved[key];
      const action = {
        type: key,
        params: value
      }
      actions.push(action);
    }
    return actions;
  } catch (err) {
    console.log(err);
    return [];
  }
}

module.exports = {
  resolveXML,
  resolveActions
};