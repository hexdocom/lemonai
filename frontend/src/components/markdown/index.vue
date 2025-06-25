<template>
  <div v-html="renderHTML" class="markdown-render"></div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";

// API 文档: https://markdown-it.github.io/markdown-it
import markdownIt from "markdown-it";

// https://github.com/arve0/markdown-it-attrs
import markdownItAttrs from "markdown-it-attrs";
// https://www.npmjs.com/package/markdown-it-graphviz
// import markdownItGraphviz from "markdown-it-graphviz";
// import markdownItCodeCopy from 'markdown-it-code-copy';
import markdownItMermaid, { renderMermaidElements } from "./markdown-it-mermaid";
import markdownItPrism from "./markdown-it-prism";
// https://github.com/jGleitz/markdown-it-prism#options
// 代码高亮

// 脑图渲染
// import markdownItMarkmap from './markdown-it-markmap';

// import markdownItHighlight from 'markdown-it-highlightjs'
// import hljs from 'highlight.js/lib/core';
// import 'highlight.js/styles/github.css';

const md = markdownIt({
  html: false,
  breaks: true,
  langPrefix: "language-",
  quotes: "\u201c\u201d\u2018\u2019",
})
  .use(markdownItAttrs)
  .use(markdownItMermaid, { theme: "default" })
  .use(markdownItPrism);

// md.use(markdownItGraphviz);
// md.use(markdownItCodeCopy);
// md.use(markdownItMarkmap);

// import markdownItThink from "./markdown-it-think.js";
// md.use(markdownItThink);

// md.use(markdownItHighlight, { hljs });

const props = defineProps({
  content: {
    type: String,
    default: "",
  },
});

const renderHTML = ref("");

// 渲染 mermaid 图表的函数
async function renderMermaid() {
  await nextTick();
  try {
    await renderMermaidElements();
  } catch (error) {
    console.error('渲染 Mermaid 图表时出错:', error);
  }
}

watch(
  () => props.content,
  async (val) => {
    await nextTick();
    renderHTML.value = md.render(val);
    // 渲染完成后，处理 mermaid 图表
    await renderMermaid();
  }
);

onMounted(async () => {
  await nextTick();
  renderHTML.value = md.render(props.content || "");
  // 初始渲染后，处理 mermaid 图表
  await renderMermaid();
});
</script>

<style lang="scss">
.dialog-item {

  /* 代码不换行 */
  pre {
    box-sizing: border-box;
  }

  pre>code[class*="language-"] {
    box-sizing: border-box !important;
    white-space: pre-wrap;
    font-size: 14px;
    color: #213547 !important;
    text-shadow:unset!important;
  }
}

/* markdown-it-thinking.css */
.thinking-container {
  min-height: 30px;
  position: relative;
  transition: background-color 0.3s ease;
  margin-bottom: 12px;
}

.thinking-toggle {
  width: fit-content;
  color: rgb(38, 38, 38);
  background-color: #e0e0e0;
  padding: 8px 16px;
  font-size: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-bottom: 12px;
  user-select: none;
}

.thinking-content {
  padding: 0 16px;
  border-left: 1px solid #ddd;
  animation: fadeIn 0.3s ease;
  color: #8b8b8b;
  font-size: 14px;
  margin: 12px 0;
}


@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
.markdown-render {
  table {
    width: 90%;
    border-collapse: collapse;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    overflow: hidden;
    margin: 12px 0;
  }
  h1 {
    font-size: 1.8em!important;
  }
  p{
    margin:0px!important;
  }

  th,
  td {
    padding: 15px 25px;
    text-align: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  th {
    background: rgba(0, 150, 255, 0.1);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 0.9em;
    color: #0066cc;
  }

  tr:hover {
    background: rgba(0, 150, 255, 0.03);
    transition: background 0.3s ease;
  }

  td {
    transition: all 0.3s ease;
  }

  tr:hover td {
    color: #0066cc;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
  // direct element
  & > pre{
    background: #272822;
    padding: 12px;
    border-radius: 8px;
    code{
      // color: #8b8b8b;
      text-shadow: none;
      
    }
  }

  /* Mermaid 样式 */
  .mermaid-container {
    margin: 16px 0;
    display: flex;
    justify-content: center;
    
    &.mermaid-rendered {
      // 渲染完成的 mermaid 图表
      svg {
        max-width: 100%;
        height: auto;
      }
    }
  }

  .mermaid-error {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 12px;
    margin: 16px 0;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 2px 8px rgba(229, 62, 62, 0.1);
    
    .mermaid-error-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 16px 12px 16px;
      border-bottom: 1px solid #fed7d7;
      background: linear-gradient(135deg, #fed7d7 0%, #fbb6ce 100%);
      border-radius: 12px 12px 0 0;
      color: #c53030;
      
      svg {
        flex-shrink: 0;
      }
      
      h4 {
        margin: 0 !important;
        font-size: 16px;
        font-weight: 600;
      }
    }
    
    .mermaid-error-content {
      padding: 16px;
      
      .error-message {
        margin-bottom: 16px;
        
        strong {
          display: block;
          margin-bottom: 8px;
          color: #2d3748;
          font-size: 14px;
        }
        
        code {
          display: block;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
          font-size: 13px;
          color: #e53e3e;
          line-height: 1.5;
          word-break: break-word;
        }
      }
      
      .error-suggestions {
        margin-bottom: 16px;
        
        strong {
          display: block;
          margin-bottom: 8px;
          color: #2d3748;
          font-size: 14px;
        }
        
        ul {
          margin: 0 !important;
          padding-left: 0 !important;
          list-style: none;
          
          li {
            padding: 6px 0;
            font-size: 14px;
            color: #4a5568;
            line-height: 1.5;
            
            &:before {
              content: "💡";
              margin-right: 8px;
            }
          }
        }
      }
      
      .error-code {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        
        summary {
          padding: 12px;
          cursor: pointer;
          background: #f7fafc;
          border-radius: 6px 6px 0 0;
          font-size: 14px;
          font-weight: 500;
          color: #4a5568;
          user-select: none;
          
          &:hover {
            background: #edf2f7;
          }
        }
        
        pre {
          margin: 0 !important;
          padding: 12px !important;
          background: #1a202c !important;
          border-radius: 0 0 6px 6px;
          
          code {
            color: #e2e8f0 !important;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
            font-size: 13px;
            line-height: 1.6;
          }
        }
      }
    }
  }
}
</style>
