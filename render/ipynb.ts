import { marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';

// Placeholder values - will be injected by Playwright before page loads
const FILE_BASE64_PLACEHOLDER = 'FILE_BASE64_PLACEHOLDER';
const PAGE_NUMBER_PLACEHOLDER = 1;

// Check if values were injected via Playwright, otherwise use placeholders
let fileBase64 = (globalThis as any).fileBase64 || FILE_BASE64_PLACEHOLDER;
let pageNumber = (globalThis as any).pageNumber || PAGE_NUMBER_PLACEHOLDER;

interface RenderMetadata {
  width: number;
  height: number;
  pageCount: number;
  pageNumber: number;
  scale: number;
}

interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  outputs?: any[];
  execution_count?: number | null;
}

interface NotebookData {
  cells: NotebookCell[];
  metadata?: any;
}

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
}

let highlighter: Highlighter | null = null;

// Viewport constants for pseudo-pagination
const VIEWPORT_WIDTH = 960;
const VIEWPORT_HEIGHT = 1280;

// Initialize Shiki highlighter
async function initHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-light'],
      langs: ['python', 'javascript', 'typescript', 'json', 'bash', 'shell', 'sql', 'r', 'julia', 'markdown'],
    });
  }
  return highlighter;
}

// Show file selector for local testing
function showFileSelector() {
  const container = document.getElementById('container');
  if (!container) return;

  // Create file input overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  overlay.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>Local Testing Mode</h2>
      <p>Select a Jupyter Notebook file to render:</p>
      <input type="file" accept=".ipynb" id="file-input" style="margin: 1rem 0;">
    </div>
  `;

  document.body.appendChild(overlay);

  const input = document.getElementById('file-input') as HTMLInputElement;
  input.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      fileBase64 = base64;
      // Remove overlay
      overlay.remove();
      await renderNotebook();
    };
    reader.readAsDataURL(file);
  });
}

// Inject styles for notebook rendering
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .notebook-cell {
      margin-bottom: 16px;
      border-radius: 4px;
    }

    .cell-input {
      display: flex;
      align-items: flex-start;
    }

    .cell-prompt {
      width: 80px;
      min-width: 80px;
      text-align: right;
      padding-right: 12px;
      font-family: monospace;
      font-size: 12px;
      color: #0366d6;
      padding-top: 8px;
    }

    .cell-content {
      flex: 1;
      min-width: 0;
    }

    .code-cell .cell-content {
      background: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      overflow: hidden;
    }

    .code-cell .cell-content pre {
      margin: 0;
      padding: 12px;
      overflow-x: auto;
    }

    .code-cell .cell-content code {
      font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
      font-size: 13px;
    }

    .markdown-cell .cell-content {
      padding: 8px 0;
    }

    .markdown-cell h1, .markdown-cell h2, .markdown-cell h3,
    .markdown-cell h4, .markdown-cell h5, .markdown-cell h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }

    .markdown-cell h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    .markdown-cell h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    .markdown-cell h3 { font-size: 1.25em; }

    .markdown-cell p { margin-bottom: 16px; }

    .markdown-cell code {
      padding: 0.2em 0.4em;
      background-color: rgba(27, 31, 35, 0.05);
      border-radius: 3px;
      font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
      font-size: 85%;
    }

    .markdown-cell pre {
      padding: 16px;
      background-color: #f6f8fa;
      border-radius: 6px;
      overflow: auto;
    }

    .markdown-cell pre code {
      padding: 0;
      background: transparent;
    }

    .cell-output {
      margin-top: 8px;
    }

    .output-area {
      display: flex;
      align-items: flex-start;
    }

    .output-prompt {
      width: 80px;
      min-width: 80px;
      text-align: right;
      padding-right: 12px;
      font-family: monospace;
      font-size: 12px;
      color: #d73a49;
      padding-top: 8px;
    }

    .output-content {
      flex: 1;
      min-width: 0;
    }

    .output-text {
      background: #fff;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 12px;
      font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
      font-size: 13px;
      white-space: pre-wrap;
      overflow-x: auto;
    }

    .output-image img {
      max-width: 100%;
    }

    .output-error {
      background: #ffeef0;
      border: 1px solid #f97583;
      border-radius: 6px;
      padding: 12px;
      font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
      font-size: 13px;
      color: #d73a49;
      white-space: pre-wrap;
    }
  `;
  document.head.appendChild(style);
}

// Get cell source as string
function getCellSource(cell: NotebookCell): string {
  if (Array.isArray(cell.source)) {
    return cell.source.join('');
  }
  return cell.source;
}

// Render cell outputs
function renderOutputs(outputs: any[]): string {
  if (!outputs || outputs.length === 0) return '';

  let html = '<div class="cell-output">';

  for (const output of outputs) {
    html += '<div class="output-area">';
    html += '<div class="output-prompt"></div>';
    html += '<div class="output-content">';

    if (output.output_type === 'stream') {
      const text = Array.isArray(output.text) ? output.text.join('') : output.text;
      html += `<div class="output-text">${escapeHtml(text)}</div>`;
    } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      if (output.data) {
        if (output.data['image/png']) {
          html += `<div class="output-image"><img src="data:image/png;base64,${output.data['image/png']}" /></div>`;
        } else if (output.data['image/jpeg']) {
          html += `<div class="output-image"><img src="data:image/jpeg;base64,${output.data['image/jpeg']}" /></div>`;
        } else if (output.data['text/html']) {
          const htmlContent = Array.isArray(output.data['text/html'])
            ? output.data['text/html'].join('')
            : output.data['text/html'];
          html += `<div class="output-html">${htmlContent}</div>`;
        } else if (output.data['text/plain']) {
          const text = Array.isArray(output.data['text/plain'])
            ? output.data['text/plain'].join('')
            : output.data['text/plain'];
          html += `<div class="output-text">${escapeHtml(text)}</div>`;
        }
      }
    } else if (output.output_type === 'error') {
      const traceback = output.traceback ? output.traceback.join('\n') : output.evalue;
      html += `<div class="output-error">${escapeHtml(traceback)}</div>`;
    }

    html += '</div></div>';
  }

  html += '</div>';
  return html;
}

// Escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Main rendering function
async function renderNotebook(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('ipynb-container') as HTMLElement;
    if (!container) {
      throw new Error('Notebook container element not found');
    }

    // Check if placeholder value (local testing mode)
    if (fileBase64 === FILE_BASE64_PLACEHOLDER) {
      showFileSelector();
      // Return dummy metadata for local testing
      return {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        pageCount: 1,
        pageNumber: 1,
        scale: 1.0
      };
    }

    // Set container to fixed width for consistent rendering
    container.style.width = `${VIEWPORT_WIDTH}px`;

    // Inject styles
    injectStyles();

    // Initialize highlighter
    const hl = await initHighlighter();

    // Decode base64 to text
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const notebookJson = new TextDecoder('utf-8').decode(bytes);

    // Parse notebook JSON
    const notebook: NotebookData = JSON.parse(notebookJson);

    // Render cells
    let html = '';
    let cellNumber = 1;

    for (const cell of notebook.cells) {
      const source = getCellSource(cell);

      if (cell.cell_type === 'code') {
        // Highlight code with Shiki
        const highlighted = hl.codeToHtml(source, {
          lang: 'python',
          theme: 'github-light',
        });

        const prompt = cell.execution_count !== null && cell.execution_count !== undefined
          ? `In [${cell.execution_count}]:`
          : 'In [ ]:';

        html += `
          <div class="notebook-cell code-cell">
            <div class="cell-input">
              <div class="cell-prompt">${prompt}</div>
              <div class="cell-content">${highlighted}</div>
            </div>
            ${renderOutputs(cell.outputs || [])}
          </div>
        `;
        cellNumber++;
      } else if (cell.cell_type === 'markdown') {
        const renderedMarkdown = await marked.parse(source);
        html += `
          <div class="notebook-cell markdown-cell">
            <div class="cell-input">
              <div class="cell-prompt"></div>
              <div class="cell-content">${renderedMarkdown}</div>
            </div>
          </div>
        `;
      } else if (cell.cell_type === 'raw') {
        html += `
          <div class="notebook-cell raw-cell">
            <div class="cell-input">
              <div class="cell-prompt"></div>
              <div class="cell-content"><pre>${escapeHtml(source)}</pre></div>
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = html;

    // Wait for any images to load
    const images = container.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Measure total content height for pseudo-pagination
    const totalHeight = container.scrollHeight;

    // Calculate page count based on viewport height
    const pageCount = Math.max(1, Math.ceil(totalHeight / VIEWPORT_HEIGHT));

    // Validate requested page
    const targetPage = Math.max(1, Math.min(pageNumber, pageCount));

    // Calculate scroll offset for this page
    const scrollY = (targetPage - 1) * VIEWPORT_HEIGHT;

    // Calculate height for this page (may be less for last page)
    const remainingHeight = totalHeight - scrollY;
    const pageHeight = Math.min(VIEWPORT_HEIGHT, remainingHeight);

    // Scroll to the target page position
    window.scrollTo(0, scrollY);

    console.log(`Jupyter Notebook rendered successfully (page ${targetPage}/${pageCount})`);

    // Return metadata for Playwright to resize viewport
    return {
      width: VIEWPORT_WIDTH,
      height: pageHeight,
      pageCount,
      pageNumber: targetPage,
      scale: 2.0
    };
  } catch (error) {
    console.error('Error rendering Jupyter Notebook:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderNotebook();
