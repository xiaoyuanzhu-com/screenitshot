import { parse, HtmlGenerator } from 'latex.js';

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
      <p>Select a LaTeX file to render:</p>
      <input type="file" accept=".tex,.latex" id="file-input" style="margin: 1rem 0;">
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
      await renderLaTeX();
    };
    reader.readAsDataURL(file);
  });
}

// Viewport constants for pseudo-pagination
const VIEWPORT_WIDTH = 960;
const VIEWPORT_HEIGHT = 1280;

// Main rendering function
async function renderLaTeX(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('tex-container') as HTMLElement;
    if (!container) {
      throw new Error('LaTeX container element not found');
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

    // Decode base64 to text
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const latexSource = new TextDecoder('utf-8').decode(bytes);

    // Parse and generate HTML
    const generator = new HtmlGenerator({ hyphenate: false });
    const doc = parse(latexSource, { generator });

    // Get the generated HTML document
    const htmlDocument = generator.htmlDocument();

    // Extract the body content and styles
    const bodyContent = htmlDocument.body.innerHTML;
    const styleSheets = htmlDocument.head.querySelectorAll('style');

    // Add latex.js styles to our document
    styleSheets.forEach(style => {
      document.head.appendChild(style.cloneNode(true));
    });

    // Add latex.js base styles
    const baseStyle = document.createElement('style');
    baseStyle.textContent = `
      #tex-container {
        font-family: 'Computer Modern Serif', 'Latin Modern Roman', 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.6;
      }
      #tex-container .document {
        padding: 0;
      }
      #tex-container h1, #tex-container h2, #tex-container h3 {
        margin-top: 1em;
        margin-bottom: 0.5em;
      }
      #tex-container p {
        margin-bottom: 1em;
        text-align: justify;
      }
      #tex-container .math {
        font-style: italic;
      }
    `;
    document.head.appendChild(baseStyle);

    // Set the content
    container.innerHTML = bodyContent;

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 200));

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

    console.log(`LaTeX rendered successfully (page ${targetPage}/${pageCount})`);

    // Return metadata for Playwright to resize viewport
    return {
      width: VIEWPORT_WIDTH,
      height: pageHeight,
      pageCount,
      pageNumber: targetPage,
      scale: 2.0
    };
  } catch (error) {
    console.error('Error rendering LaTeX:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderLaTeX();
