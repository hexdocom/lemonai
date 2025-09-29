import { computed } from 'vue'

export function useAIPrompts() {
  // AI编辑器提示词模板
  const promptTemplates = {
    // 基础编辑模板
    basic: {
      name: '基础编辑',
      template: `你是一个专业的HTML编辑助手。请根据用户需求修改HTML代码。

## 当前选中元素信息:
- 标签: {tagName}
- 类名: {className}
- ID: {elementId}
- 当前内容: {currentContent}
- 完整HTML: {fullElementHTML}

## 用户需求: 
{userRequest}

## 完整页面上下文:
{pageContext}

## 输出要求:
你必须严格按照以下XML格式返回结果。根据需求复杂度选择合适的action类型:

**简单修改(只涉及当前元素内容/属性)** - 使用 action="replace":
<response>
<action>replace</action>
<description>修改说明</description>
<code>{修改后的当前元素HTML代码}</code>
</response>

**复杂修改(需要CSS/JS或影响其他元素)** - 使用 action="write":
<response>
<action>write</action>
<description>修改说明</description>
<code>{基于完整页面上下文的完整HTML文档,保持原有结构和内容,只修改必要部分}</code>
</response>

## 重要说明:
- action="replace": 仅返回修改后的当前选中元素HTML
- action="write": 必须返回完整的HTML文档,包含DOCTYPE、html、head、body等标签
- action="write"时请基于提供的完整页面上下文,保持其他内容不变

## 判断标准:
- 只修改文本内容、属性、简单样式 → action="replace"
- 需要添加CSS样式、JavaScript功能、影响其他元素 → action="write"

请分析需求复杂度，选择合适的action类型并严格按XML格式返回。`,
      category: 'edit'
    },

    // 样式优化模板
    style: {
      name: '样式优化',
      template: `你是一个前端样式专家。请优化HTML元素样式。

## 当前选中元素信息:
- 标签: {tagName}
- 类名: {className}
- ID: {elementId}
- 当前内容: {currentContent}
- 完整HTML: {fullElementHTML}

## 样式需求: 
{userRequest}

## 完整页面上下文:
{pageContext}

## 输出要求:
严格按照XML格式返回，根据样式复杂度选择action类型:

**简单样式修改(仅修改当前元素类名或内联样式)** - action="replace":
<response>
<action>replace</action>
<description>样式修改说明</description>
<code>{修改样式后的当前元素HTML}</code>
</response>

**复杂样式修改(需要新增CSS规则或影响多个元素)** - action="write":
<response>
<action>write</action>
<description>样式设计说明</description>
<code>{基于完整页面上下文的完整HTML文档,包含新增CSS样式}</code>
</response>

## 样式指导:
- 优先使用Tailwind CSS类名
- 复杂动画、渐变、响应式布局可能需要自定义CSS
- 保持响应式设计和可访问性
- 考虑性能影响

请分析样式需求复杂度，选择合适action并严格按XML格式返回。`,
      category: 'style'
    },

    // 内容创作模板
    content: {
      name: '内容创作',
      template: `你是一个内容创作专家。请为HTML元素创作优质内容。

## 当前选中元素信息:
- 标签: {tagName}
- 类名: {className}
- ID: {elementId}
- 当前内容: {currentContent}
- 完整HTML: {fullElementHTML}

## 内容需求: 
{userRequest}

## 完整页面上下文:
{pageContext}

## 输出要求:
严格按照XML格式返回，根据内容创作复杂度选择action类型:

**简单内容替换(仅修改当前元素文本内容)** - action="replace":
<response>
<action>replace</action>
<description>内容创作说明</description>
<code>{包含新内容的当前元素HTML}</code>
</response>

**复杂内容创作(需要调整结构、添加多媒体或交互元素)** - action="write":
<response>
<action>write</action>
<description>内容设计说明</description>
<code>{包含完整内容结构的HTML代码}</code>
</response>

## 内容创作指导:
- 保持语义化和可读性
- 符合用户意图和页面主题
- 考虑SEO和用户体验
- 内容结构要合理层次分明

请根据内容创作需求复杂度选择合适action并严格按XML格式返回。`,
      category: 'content'
    },

    // SEO优化模板
    seo: {
      name: 'SEO优化',
      template: `你是一个SEO专家。请优化HTML元素的搜索引擎表现。

## 当前选中元素信息:
- 标签: {tagName}
- 类名: {className}
- ID: {elementId}
- 当前内容: {currentContent}
- 完整HTML: {fullElementHTML}

## SEO需求: 
{userRequest}

## 完整页面上下文:
{pageContext}

## 输出要求:
严格按照XML格式返回，根据SEO优化复杂度选择action类型:

**简单SEO优化(仅修改当前元素属性、标签或内容)** - action="replace":
<response>
<action>replace</action>
<description>SEO优化说明</description>
<code>{SEO优化后的当前元素HTML}</code>
</response>

**复杂SEO优化(需要调整页面结构、添加元数据或影响多个元素)** - action="write":
<response>
<action>write</action>
<description>SEO策略说明</description>
<code>{包含完整SEO优化的HTML代码}</code>
</response>

## SEO优化指导:
- 使用语义化HTML标签 (h1-h6, article, section, nav等)
- 添加必要属性 (alt, title, aria-label等)
- 优化标题层级结构和关键词密度
- 确保内容可读性和用户体验
- 考虑结构化数据和微格式

请根据SEO需求复杂度选择合适action并严格按XML格式返回。`,
      category: 'seo'
    },

    // 交互增强模板
    interactive: {
      name: '交互增强',
      template: `你是一个前端交互专家。请为HTML元素增强用户交互体验。

## 当前选中元素信息:
- 标签: {tagName}
- 类名: {className}
- ID: {elementId}
- 当前内容: {currentContent}
- 完整HTML: {fullElementHTML}

## 交互需求: 
{userRequest}

## 完整页面上下文:
{pageContext}

## 输出要求:
严格按照XML格式返回，根据交互复杂度选择action类型:

**简单交互(仅添加CSS动画、悬停效果等)** - action="replace":
<response>
<action>replace</action>
<description>交互效果说明</description>
<code>{添加交互效果后的当前元素HTML}</code>
</response>

**复杂交互(需要JavaScript功能、事件处理或影响多个元素)** - action="write":
<response>
<action>write</action>
<description>交互设计说明</description>
<code>{包含完整交互功能的HTML、CSS和JavaScript代码}</code>
</response>

## 交互设计指导:
- 优先使用CSS3动画和过渡效果
- 复杂逻辑使用原生JavaScript或框架
- 考虑移动端触摸交互
- 保证键盘导航和可访问性
- 提供视觉反馈和状态指示
- 优化性能避免卡顿

请根据交互需求复杂度选择合适action并严格按XML格式返回。`,
      category: 'interactive'
    },

    // 可访问性优化模板
    accessibility: {
      name: '可访问性优化',
      template: `你是一个Web可访问性专家。请优化HTML元素的无障碍访问性。

## 当前选中元素信息:
- 标签: {tagName}
- 类名: {className}
- ID: {elementId}
- 当前内容: {currentContent}
- 完整HTML: {fullElementHTML}

## 可访问性需求: 
{userRequest}

## 完整页面上下文:
{pageContext}

## 输出要求:
严格按照XML格式返回，根据可访问性优化复杂度选择action类型:

**简单可访问性优化(仅修改当前元素ARIA属性、语义标签)** - action="replace":
<response>
<action>replace</action>
<description>可访问性改进说明</description>
<code>{可访问性优化后的当前元素HTML}</code>
</response>

**复杂可访问性优化(需要调整交互逻辑、键盘导航或影响多个元素)** - action="write":
<response>
<action>write</action>
<description>无障碍设计说明</description>
<code>{包含完整无障碍功能的HTML、CSS和JavaScript代码}</code>
</response>

## 可访问性指导:
- 遵循WCAG 2.1 AA级标准
- 使用语义化HTML标签
- 添加必要ARIA属性 (role, aria-label, aria-describedby等)
- 确保键盘可操作性和焦点管理
- 保证足够的颜色对比度 (4.5:1)
- 提供替代文本和屏幕阅读器支持

请根据可访问性需求复杂度选择合适action并严格按XML格式返回。`,
      category: 'accessibility'
    },

    // 性能优化模板
    performance: {
      name: '性能优化',
      template: `你是一个Web性能优化专家。请优化HTML元素的性能表现。

## 当前选中元素信息:
- 标签: {tagName}
- 类名: {className}
- ID: {elementId}
- 当前内容: {currentContent}
- 完整HTML: {fullElementHTML}

## 性能优化需求: 
{userRequest}

## 完整页面上下文:
{pageContext}

## 输出要求:
严格按照XML格式返回，根据性能优化复杂度选择action类型:

**简单性能优化(仅优化当前元素结构、属性)** - action="replace":
<response>
<action>replace</action>
<description>性能优化说明</description>
<code>{性能优化后的当前元素HTML}</code>
</response>

**复杂性能优化(需要添加懒加载、预加载机制或影响多个元素)** - action="write":
<response>
<action>write</action>
<description>性能优化策略说明</description>
<code>{包含完整性能优化的HTML、CSS和JavaScript代码}</code>
</response>

## 性能优化指导:
- 减少DOM层级和元素数量
- 优化图片资源 (WebP, 响应式图片, lazy loading)
- 使用高效CSS选择器避免重排重绘
- 实现代码分割和按需加载
- 优化关键渲染路径
- 考虑浏览器缓存策略

请根据性能优化需求复杂度选择合适action并严格按XML格式返回。`,
      category: 'performance'
    }
  }

  // 根据用户输入智能选择模板
  const detectTemplateType = (userInput) => {
    const input = userInput.toLowerCase()

    // 样式相关关键词
    const styleKeywords = ['颜色', '样式', '背景', '边框', '字体', '大小', '布局', '对齐', '间距', '圆角', '阴影', '渐变', '动画']
    // 内容相关关键词
    const contentKeywords = ['内容', '文字', '文本', '标题', '段落', '列表', '链接', '修改为', '改成', '写成']
    // SEO相关关键词
    const seoKeywords = ['seo', '搜索', '标题标签', '关键词', '描述', '语义化', 'h1', 'h2', 'h3']
    // 交互相关关键词
    const interactiveKeywords = ['点击', '悬停', '交互', '动效', '按钮', '链接', '切换', '显示', '隐藏']
    // 可访问性相关关键词
    const accessibilityKeywords = ['可访问', '无障碍', 'aria', '屏幕阅读', '键盘', '对比度', '焦点']
    // 性能相关关键词
    const performanceKeywords = ['性能', '优化', '加载', '速度', '压缩', '懒加载', '缓存']

    if (styleKeywords.some(keyword => input.includes(keyword))) {
      return 'style'
    } else if (seoKeywords.some(keyword => input.includes(keyword))) {
      return 'seo'
    } else if (interactiveKeywords.some(keyword => input.includes(keyword))) {
      return 'interactive'
    } else if (accessibilityKeywords.some(keyword => input.includes(keyword))) {
      return 'accessibility'
    } else if (performanceKeywords.some(keyword => input.includes(keyword))) {
      return 'performance'
    } else if (contentKeywords.some(keyword => input.includes(keyword))) {
      return 'content'
    } else {
      return 'basic'
    }
  }

  // 生成完整的提示词
  const generatePrompt = (templateType, elementInfo, userRequest, fullPageHTML = '') => {
    const template = promptTemplates[templateType]
    if (!template) {
      return generatePrompt('basic', elementInfo, userRequest, fullPageHTML)
    }

    const elementTagName = elementInfo.tagName || 'div'
    const elementClassName = elementInfo.className || '无'
    const elementId = elementInfo.id || '无'
    const elementContent = elementInfo.textContent || '空'
    const fullElementHTML = elementInfo.outerHTML || elementInfo.innerHTML || '无'

    // 获取页面上下文信息
    let contextInfo = ''
    if (fullPageHTML) {
      // 如果提供了完整HTML，使用它作为上下文
      // contextInfo = formatFullPageContext(fullPageHTML, elementInfo)
      contextInfo = fullPageHTML
      // 
    } else {
      // 否则获取局部上下文
      contextInfo = getElementContext(elementInfo)
    }

    return template.template
      .replace('{tagName}', elementTagName)
      .replace('{className}', elementClassName)
      .replace('{elementId}', elementId)
      .replace('{currentContent}', elementContent.length > 200 ?
        elementContent.substring(0, 200) + '...' : elementContent)
      .replace('{fullElementHTML}', fullElementHTML.length > 500 ?
        fullElementHTML.substring(0, 500) + '...' : fullElementHTML)
      .replace('{userRequest}', userRequest)
      .replace('{pageContext}', contextInfo)
  }

  // 格式化完整页面上下文
  const formatFullPageContext = (fullPageHTML, currentElement) => {
    // 限制HTML长度，避免提示词过长
    const maxLength = 3000
    let formattedHTML = fullPageHTML

    if (fullPageHTML.length > maxLength) {
      // 尝试保留重要部分：头部、当前元素周围、尾部
      const elementHTML = currentElement.outerHTML || ''
      const elementIndex = fullPageHTML.indexOf(elementHTML)

      if (elementIndex !== -1) {
        // 保留当前元素前后各1000字符
        const start = Math.max(0, elementIndex - 1000)
        const end = Math.min(fullPageHTML.length, elementIndex + elementHTML.length + 1000)

        let contextHTML = ''
        if (start > 0) contextHTML += '<!-- 前面内容已省略 -->\n'
        contextHTML += fullPageHTML.substring(start, end)
        if (end < fullPageHTML.length) contextHTML += '\n<!-- 后面内容已省略 -->'

        formattedHTML = contextHTML
      } else {
        // 如果找不到当前元素，截取前面部分
        formattedHTML = fullPageHTML.substring(0, maxLength) + '\n<!-- 内容已截断 -->'
      }
    }

    return `完整HTML文档内容:
\`\`\`html
${formattedHTML}
\`\`\`

当前选中元素在完整文档中的位置已标识。进行整体修改时，请保持其他内容不变，只修改必要的部分。`
  }

  // 获取元素上下文信息
  const getElementContext = (element) => {
    if (!element || !element.parentElement) {
      return '页面根级元素，无额外上下文'
    }

    const parent = element.parentElement
    const siblings = Array.from(parent.children).filter(child => child !== element)

    let context = `父元素: <${parent.tagName.toLowerCase()}`
    if (parent.className) context += ` class="${parent.className}"`
    if (parent.id) context += ` id="${parent.id}"`
    context += `>`

    if (siblings.length > 0) {
      const siblingInfo = siblings.slice(0, 3).map(sibling => {
        const tag = sibling.tagName.toLowerCase()
        const className = sibling.className ? ` class="${sibling.className}"` : ''
        const text = sibling.textContent?.trim().substring(0, 30) || ''
        return `<${tag}${className}>${text ? text + '...' : ''}</${tag}>`
      }).join(', ')

      context += `\n同级元素: ${siblingInfo}`
      if (siblings.length > 3) {
        context += ` (还有${siblings.length - 3}个同级元素)`
      }
    }

    return context
  }

  // 获取模板建议
  const getTemplateSuggestions = (userInput) => {
    const detectedType = detectTemplateType(userInput)
    const primaryTemplate = promptTemplates[detectedType]

    // 返回主要建议模板和其他相关模板
    const suggestions = [primaryTemplate]

    // 添加其他可能相关的模板
    Object.entries(promptTemplates).forEach(([key, template]) => {
      if (key !== detectedType && suggestions.length < 3) {
        suggestions.push(template)
      }
    })

    return suggestions
  }

  // 格式化元素信息用于显示
  const formatElementInfo = (element) => {
    if (!element) return '未选择元素'

    const tagName = element.tagName.toLowerCase()
    const className = element.className ? ` class="${element.className}"` : ''
    const id = element.id ? ` id="${element.id}"` : ''
    const textContent = element.textContent?.trim()

    let displayText = `<${tagName}${id}${className}>`
    if (textContent && textContent.length > 0) {
      const shortText = textContent.length > 50 ?
        textContent.substring(0, 50) + '...' : textContent
      displayText += `\n内容: ${shortText}`
    }

    return displayText
  }

  // 获取所有模板分类
  const getTemplateCategories = () => {
    const categories = {}
    Object.entries(promptTemplates).forEach(([key, template]) => {
      if (!categories[template.category]) {
        categories[template.category] = []
      }
      categories[template.category].push({
        key,
        name: template.name,
        template: template.template
      })
    })
    return categories
  }

  // 解析AI返回的XML响应
  const parseAIResponse = (xmlResponse) => {
    try {
      // 简单的XML解析（实际项目中建议使用专业的XML解析库）
      const actionMatch = xmlResponse.match(/<action>(.*?)<\/action>/s)
      const descriptionMatch = xmlResponse.match(/<description>(.*?)<\/description>/s)
      const codeMatch = xmlResponse.match(/<code>(.*?)<\/code>/s)

      if (!actionMatch || !descriptionMatch || !codeMatch) {
        throw new Error('XML格式不正确')
      }

      const action = actionMatch[1].trim()
      const description = descriptionMatch[1].trim()
      const code = codeMatch[1].trim()

      // 验证action类型
      if (!['replace', 'write'].includes(action)) {
        throw new Error('不支持的action类型: ' + action)
      }

      return {
        action,
        description,
        code,
        isValid: true
      }
    } catch (error) {
      return {
        action: 'replace',
        description: '响应解析失败: ' + error.message,
        code: xmlResponse,
        isValid: false,
        error: error.message
      }
    }
  }

  // 生成示例响应（用于演示）
  const generateSampleResponse = (userRequest, templateType, elementInfo, fullPageHTML = '') => {
    const isComplexRequest = detectComplexity(userRequest, templateType)
    const action = isComplexRequest ? 'write' : 'replace'

    let description = ''
    let code = ''

    if (action === 'replace') {
      description = `简单修改当前元素：${getSimpleModificationDescription(userRequest)}`
      code = generateSimpleCode(elementInfo, userRequest)
    } else {
      description = `复杂修改需要整体代码调整：${getComplexModificationDescription(userRequest)}`
      code = generateComplexCode(elementInfo, userRequest, fullPageHTML)
    }

    return `<response>
<action>${action}</action>
<description>${description}</description>
<code>${code}</code>
</response>`
  }

  // 检测需求复杂度
  const detectComplexity = (userRequest, templateType) => {
    const complexKeywords = [
      'css', 'javascript', 'js', '动画', '交互', '点击', '悬停',
      '全局', '整体', '多个', '所有', '批量', '添加样式', '自定义样式',
      '响应式', '移动端', '下拉菜单', '弹窗', '表单验证', '数据绑定'
    ]

    const request = userRequest.toLowerCase()
    const hasComplexKeywords = complexKeywords.some(keyword => request.includes(keyword))
    const isInteractiveTemplate = ['interactive', 'performance'].includes(templateType)

    return hasComplexKeywords || isInteractiveTemplate
  }

  // 生成简单修改描述
  const getSimpleModificationDescription = (userRequest) => {
    if (userRequest.includes('颜色')) return '修改文字颜色'
    if (userRequest.includes('字体')) return '调整字体样式'
    if (userRequest.includes('内容')) return '更新文本内容'
    if (userRequest.includes('大小')) return '调整元素尺寸'
    return '修改元素属性'
  }

  // 生成复杂修改描述
  const getComplexModificationDescription = (userRequest) => {
    if (userRequest.includes('动画')) return '添加CSS动画效果和相关样式'
    if (userRequest.includes('交互')) return '实现交互功能，包含JavaScript逻辑'
    if (userRequest.includes('响应式')) return '添加响应式布局和媒体查询'
    if (userRequest.includes('全局')) return '调整全局样式和布局结构'
    return '进行复杂的结构和样式调整'
  }

  // 生成简单代码示例
  const generateSimpleCode = (elementInfo, userRequest) => {
    const tagName = elementInfo.tagName || 'div'
    const className = elementInfo.className || ''
    const content = elementInfo.textContent || '示例内容'

    if (userRequest.includes('红色')) {
      return `<${tagName} class="${className} text-red-500">${content}</${tagName}>`
    }
    if (userRequest.includes('大')) {
      return `<${tagName} class="${className} text-2xl font-bold">${content}</${tagName}>`
    }
    return `<${tagName} class="${className} updated-style">${content}</${tagName}>`
  }

  // 生成复杂代码示例
  const generateComplexCode = (elementInfo, userRequest, fullPageHTML = '') => {
    // 如果有完整页面HTML，基于它进行修改
    if (fullPageHTML) {
      let modifiedHTML = fullPageHTML

      // 根据用户需求进行相应的修改
      if (userRequest.includes('动画') || userRequest.includes('悬停')) {
        // 添加CSS动画
        const styleTag = `<style>
.enhanced-element {
  transition: all 0.3s ease;
  cursor: pointer;
}
.enhanced-element:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>`

        // 如果没有head标签，添加一个
        if (!modifiedHTML.includes('<head>')) {
          modifiedHTML = `<!DOCTYPE html>
<html>
<head>
${styleTag}
</head>
<body>
${modifiedHTML}
</body>
</html>`
        } else {
          // 在head中添加样式
          modifiedHTML = modifiedHTML.replace('</head>', `${styleTag}\n</head>`)
        }
      }

      return modifiedHTML
    }

    // 如果没有完整页面HTML，生成一个基本的完整文档
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI编辑结果</title>
  <style>
    .enhanced-element {
      transition: all 0.3s ease;
      cursor: pointer;
    }
    .enhanced-element:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="container mx-auto p-6">
    ${elementInfo.outerHTML || '<div class="enhanced-element">示例元素</div>'}
  </div>
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // 根据用户需求添加的交互功能
      console.log('复杂功能已初始化');
    });
  </script>
</body>
</html>`
  }

  return {
    promptTemplates,
    detectTemplateType,
    generatePrompt,
    getTemplateSuggestions,
    formatElementInfo,
    getTemplateCategories,
    parseAIResponse,
    generateSampleResponse,
    detectComplexity
  }
}