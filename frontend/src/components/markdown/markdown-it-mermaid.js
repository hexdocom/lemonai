import MarkdownIt from "markdown-it";
// https://mermaid.js.org/
// https://github.com/mermaid-js/mermaid#readme
// https://github.com/mermaid-js/mermaid-live-editor

// Note: V9 is OK, but V10 is not.
// import Mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@9/dist/mermaid.esm.min.mjs';
import Mermaid from "mermaid";

// Ensure Mermaid is initialized
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

  // Store reference to original fence renderer
  let defaultFenceRenderer = md.renderer.rules.fence;

  function customFenceRenderer(tokens = [], idx, options = {}, env, slf) {
    let token = tokens[idx];
    let info = token.info.trim();
    let langName = info ? getLangName(info) : "";

    // Check if it's a mermaid code block
    if (["mermaid", "{mermaid}"].indexOf(langName) === -1) {
      // Not mermaid, use default renderer
      if (defaultFenceRenderer !== undefined) {
        return defaultFenceRenderer(tokens, idx, options, env, slf);
      }
      return "";
    }

    // Process mermaid code block
    try {
      const mermaidCode = token.content.trim();
      if (!mermaidCode) {
        return '<div class="mermaid-error">Mermaid content is empty</div>';
      }

      // Generate unique ID
      const containerId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Return a div containing mermaid code, let Vue component process it after mounted
      return `<div class="mermaid-container" id="${containerId}" data-mermaid="${encodeURIComponent(mermaidCode)}">${mermaidCode}</div>`;
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      return `<div class="mermaid-error">
        <p>Mermaid chart rendering failed</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #666;">${error.message}</pre>
      </div>`;
    }
  }

  md.renderer.rules.fence = customFenceRenderer;
}

// Export render function for Vue component usage
export async function renderMermaidElements() {
  const mermaidElements = document.querySelectorAll('.mermaid-container[data-mermaid]');
  
  for (let element of mermaidElements) {
    try {
      const mermaidCode = decodeURIComponent(element.getAttribute('data-mermaid'));
      const id = element.id;
      
      // Clear original content
      element.innerHTML = '';
      element.removeAttribute('data-mermaid');
      
      // Render with mermaid
      const { svg } = await Mermaid.render(id + '-svg', mermaidCode);
      element.innerHTML = svg;
      element.classList.add('mermaid-rendered');
      
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      element.innerHTML = `
        <div class="mermaid-error">
          <p>Mermaid chart rendering failed</p>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; color: #666;">${error.message}</pre>
        </div>
      `;
      element.classList.add('mermaid-error');
    }
  }
}
