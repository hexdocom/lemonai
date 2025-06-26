<template>
  <div v-html="renderHTML" class="markdown-render"></div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";

// API documentation: https://markdown-it.github.io/markdown-it
import markdownIt from "markdown-it";

// https://github.com/arve0/markdown-it-attrs
import markdownItAttrs from "markdown-it-attrs";
// https://www.npmjs.com/package/markdown-it-graphviz
// import markdownItGraphviz from "markdown-it-graphviz";
// import markdownItCodeCopy from 'markdown-it-code-copy';
import markdownItMermaid, { renderMermaidElements } from "./markdown-it-mermaid";
import markdownItPrism from "./markdown-it-prism";
// https://github.com/jGleitz/markdown-it-prism#options
// Code highlighting

// Mind map rendering
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

// Function to render mermaid charts
async function renderMermaid() {
  await nextTick();
  try {
    await renderMermaidElements();
  } catch (error) {
    console.error('Error rendering Mermaid charts:', error);
  }
}

watch(
  () => props.content,
  async (val) => {
    await nextTick();
    renderHTML.value = md.render(val);
    // Process mermaid charts after rendering
    await renderMermaid();
  }
);

onMounted(async () => {
  await nextTick();
  renderHTML.value = md.render(props.content || "");
  // Process mermaid charts after initial render
  await renderMermaid();
});
</script>

<style lang="scss">
.dialog-item {

  /* Code without line wrapping */
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

  /* Mermaid styles */
  .mermaid-container {
    margin: 16px 0;
    display: flex;
    justify-content: center;
    
    &.mermaid-rendered {
      // Rendered mermaid chart
      svg {
        max-width: 100%;
        height: auto;
      }
    }
  }

  .mermaid-error {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    color: #e53e3e;
    
    p {
      margin: 0 0 8px 0 !important;
      font-weight: 600;
    }
    
    pre {
      background: #f5f5f5 !important;
      color: #666 !important;
      margin: 8px 0 0 0 !important;
    }
  }
}
</style>
