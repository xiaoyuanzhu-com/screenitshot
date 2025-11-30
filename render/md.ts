import { marked } from 'marked';

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

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
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
      <p>Select a Markdown file to render:</p>
      <input type="file" accept=".md,.markdown" id="file-input" style="margin: 1rem 0;">
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
      await renderMarkdown();
    };
    reader.readAsDataURL(file);
  });
}

// GitHub-style CSS for markdown
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #md-container h1, #md-container h2, #md-container h3,
    #md-container h4, #md-container h5, #md-container h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    #md-container h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    #md-container h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    #md-container h3 { font-size: 1.25em; }
    #md-container h4 { font-size: 1em; }
    #md-container h5 { font-size: 0.875em; }
    #md-container h6 { font-size: 0.85em; color: #6a737d; }

    #md-container p { margin-top: 0; margin-bottom: 16px; }

    #md-container a { color: #0366d6; text-decoration: none; }
    #md-container a:hover { text-decoration: underline; }

    #md-container code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      background-color: rgba(27, 31, 35, 0.05);
      border-radius: 3px;
      font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
    }

    #md-container pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: #f6f8fa;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    #md-container pre code {
      padding: 0;
      margin: 0;
      font-size: 100%;
      background-color: transparent;
      border: 0;
    }

    #md-container blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0 0 16px 0;
    }

    #md-container ul, #md-container ol {
      padding-left: 2em;
      margin-top: 0;
      margin-bottom: 16px;
    }

    #md-container li + li { margin-top: 0.25em; }

    #md-container table {
      border-spacing: 0;
      border-collapse: collapse;
      margin-bottom: 16px;
      width: 100%;
    }

    #md-container table th, #md-container table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }

    #md-container table th {
      font-weight: 600;
      background-color: #f6f8fa;
    }

    #md-container table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }

    #md-container hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #e1e4e8;
      border: 0;
    }

    #md-container img {
      max-width: 100%;
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(style);
}

// Viewport constants for pseudo-pagination
const VIEWPORT_WIDTH = 960;
const VIEWPORT_HEIGHT = 1280;

// Main rendering function
async function renderMarkdown(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('md-container') as HTMLElement;
    if (!container) {
      throw new Error('Markdown container element not found');
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

    // Inject GitHub-style CSS
    injectStyles();

    // Set container to fixed width for consistent rendering
    container.style.width = `${VIEWPORT_WIDTH}px`;

    // Decode base64 to text
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const markdownText = new TextDecoder('utf-8').decode(bytes);

    // Parse and render markdown
    const htmlContent = await marked.parse(markdownText);
    container.innerHTML = htmlContent;

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

    console.log(`Markdown rendered successfully (page ${targetPage}/${pageCount})`);

    // Return metadata for Playwright to resize viewport
    return {
      width: VIEWPORT_WIDTH,
      height: pageHeight,
      pageCount,
      pageNumber: targetPage,
      scale: 2.0
    };
  } catch (error) {
    console.error('Error rendering Markdown:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderMarkdown();
