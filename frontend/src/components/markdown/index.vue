<template>
  <div v-html="renderHTML" class="markdown-render"></div>
</template>

<script setup>
import { ref, watch, onMounted,nextTick } from "vue";

// API 文档: https://markdown-it.github.io/markdown-it
import markdownIt from "markdown-it";

// https://github.com/arve0/markdown-it-attrs
import markdownItAttrs from "markdown-it-attrs";
// https://www.npmjs.com/package/markdown-it-graphviz
// import markdownItGraphviz from "markdown-it-graphviz";
// import markdownItCodeCopy from 'markdown-it-code-copy';
import markdownItMermaid from "./markdown-it-mermaid";
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
  quotes: "“”‘’",
})
  .use(markdownItAttrs)
  .use(markdownItMermaid, { theme: "forest" })

// md.use(markdownItGraphviz);
// md.use(markdownItCodeCopy);
md.use(markdownItPrism);
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

watch(
  () => props.content,
  (val) => {
    nextTick(() => {
      renderHTML.value = md.render(val);
    })
  }
);


// console.log("props", props.content);
onMounted(() => {
  nextTick(() => {
    renderHTML.value = md.render(props.content || "");
  })
 
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
  img{
    max-width: 100%;
  }
}
</style>
