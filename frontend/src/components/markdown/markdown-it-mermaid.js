import MarkdownIt from "markdown-it";
// https://mermaid.js.org/
// https://github.com/mermaid-js/mermaid#readme
// https://github.com/mermaid-js/mermaid-live-editor

// Note: V9 is OK, but V10 is not.
// import Mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@9/dist/mermaid.esm.min.mjs';
import Mermaid from "mermaid";

// 确保 Mermaid 已初始化
let mermaidInitialized = false;

function initMermaid(options = {}) {
  if (!mermaidInitialized) {
    Mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
      ...options,
    });
    mermaidInitialized = true;
  }
}

export default function mermaid(md, options = {}) {
  initMermaid(options);

  function getLangName(info) {
    return info.split(/\s+/g)[0];
  }

  // 存储原始的 fence 渲染器
  let defaultFenceRenderer = md.renderer.rules.fence;

  function customFenceRenderer(tokens = [], idx, options = {}, env, slf) {
    let token = tokens[idx];
    let info = token.info.trim();
    let langName = info ? getLangName(info) : "";

    // 检查是否是 mermaid 代码块
    if (["mermaid", "{mermaid}"].indexOf(langName) === -1) {
      // 不是 mermaid，使用默认渲染器
      if (defaultFenceRenderer !== undefined) {
        return defaultFenceRenderer(tokens, idx, options, env, slf);
      }
      return "";
    }

    // 处理 mermaid 代码块
    try {
      const mermaidCode = token.content.trim();
      if (!mermaidCode) {
        return formatErrorDisplay(
          { message: '图表内容为空，请添加 Mermaid 语法内容' }, 
          '(空内容)'
        );
      }

      // 生成唯一的 ID
      const containerId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 返回一个包含 mermaid 代码的 div，让 Vue 组件在 mounted 后处理
      return `<div class="mermaid-container" id="${containerId}" data-mermaid="${encodeURIComponent(mermaidCode)}">${mermaidCode}</div>`;
    } catch (error) {
      console.error('Mermaid 渲染错误:', error);
      return formatErrorDisplay(error, token.content.trim());
    }
  }

  md.renderer.rules.fence = customFenceRenderer;
}

// 分析错误类型并提供建议
function analyzeError(error, mermaidCode) {
  const errorMsg = error.message || error.toString();
  const suggestions = [];
  
  // 常见错误模式匹配
  if (errorMsg.includes('Parse error') || errorMsg.includes('syntax') || errorMsg.includes('Syntax')) {
    suggestions.push('• 检查语法是否正确，确保所有括号、引号都已正确闭合');
    
    // 检查常见语法错误
    if (mermaidCode.includes('[') && !mermaidCode.includes(']')) {
      suggestions.push('• 发现未闭合的方括号 [，请确保每个 [ 都有对应的 ]');
    }
    if (mermaidCode.includes('(') && !mermaidCode.includes(')')) {
      suggestions.push('• 发现未闭合的圆括号 (，请确保每个 ( 都有对应的 )');
    }
    if (mermaidCode.includes('{') && !mermaidCode.includes('}')) {
      suggestions.push('• 发现未闭合的花括号 {，请确保每个 { 都有对应的 }');
    }
  }
  
  if (errorMsg.includes('Unknown') || errorMsg.includes('not found')) {
    suggestions.push('• 检查图表类型是否正确 (graph, sequenceDiagram, classDiagram 等)');
    suggestions.push('• 确保所有关键字拼写正确');
  }
  
  if (errorMsg.includes('direction') || errorMsg.includes('orientation')) {
    suggestions.push('• 检查图表方向设置 (TD, TB, BT, RL, LR)');
  }
  
  if (errorMsg.includes('participant') || errorMsg.includes('sequenceDiagram')) {
    suggestions.push('• 序列图中确保所有参与者都已正确定义');
    suggestions.push('• 检查箭头语法：->> (同步) 或 -->> (异步)');
  }
  
  if (errorMsg.includes('class') || errorMsg.includes('classDiagram')) {
    suggestions.push('• 类图中确保类名和方法定义语法正确');
    suggestions.push('• 检查关系语法：<|-- (继承)、<-- (组合) 等');
  }
  
  // 如果没有特定建议，提供通用建议
  if (suggestions.length === 0) {
    suggestions.push('• 请检查 Mermaid 语法是否符合官方文档规范');
    suggestions.push('• 确保图表类型声明正确');
    suggestions.push('• 检查是否有拼写错误');
  }
  
  suggestions.push('• 参考文档：https://mermaid.js.org/');
  
  return suggestions;
}

// 格式化错误显示
function formatErrorDisplay(error, mermaidCode) {
  const suggestions = analyzeError(error, mermaidCode);
  const errorMsg = error.message || error.toString();
  
  return `
    <div class="mermaid-error">
      <div class="mermaid-error-header">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <h4>Mermaid 图表语法错误</h4>
      </div>
      
      <div class="mermaid-error-content">
        <div class="error-message">
          <strong>错误信息：</strong>
          <code>${errorMsg}</code>
        </div>
        
        <div class="error-suggestions">
          <strong>解决建议：</strong>
          <ul>
            ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>
        
        <details class="error-code">
          <summary>查看原始代码</summary>
          <pre><code>${mermaidCode}</code></pre>
        </details>
      </div>
    </div>
  `;
}

// 导出渲染函数供 Vue 组件使用
export async function renderMermaidElements() {
  const mermaidElements = document.querySelectorAll('.mermaid-container[data-mermaid]');
  
  for (let element of mermaidElements) {
    try {
      const mermaidCode = decodeURIComponent(element.getAttribute('data-mermaid'));
      const id = element.id;
      
      // 清空原始内容
      element.innerHTML = '';
      element.removeAttribute('data-mermaid');
      
      // 使用 mermaid 渲染
      const { svg } = await Mermaid.render(id + '-svg', mermaidCode);
      element.innerHTML = svg;
      element.classList.add('mermaid-rendered');
      
    } catch (error) {
      console.error('Mermaid 渲染错误:', error);
      element.innerHTML = formatErrorDisplay(error, element.textContent || '');
      element.classList.add('mermaid-error');
    }
  }
}
