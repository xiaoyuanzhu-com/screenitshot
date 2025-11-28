import ePub from 'epubjs';

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
  clipX?: number;
  clipY?: number;
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
      <p>Select an EPUB file to render:</p>
      <input type="file" accept=".epub" id="file-input" style="margin: 1rem 0;">
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
      await renderEPUB();
    };
    reader.readAsDataURL(file);
  });
}

// Render EPUB using epub.js
async function renderEPUB(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('epub-container') as HTMLElement;
    if (!container) {
      throw new Error('EPUB container element not found');
    }

    // Check if placeholder value (local testing mode)
    if (fileBase64 === FILE_BASE64_PLACEHOLDER) {
      showFileSelector();
      // Return dummy metadata for local testing
      return {
        width: 800,
        height: 1200,
        pageCount: 1,
        pageNumber: 1,
        scale: 2.0
      };
    }

    // Convert base64 to ArrayBuffer
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    const scale = 2.0; // 2x scale for high quality output

    // Open the EPUB book
    const book = ePub(arrayBuffer);

    // Get spine for page count
    await book.ready;
    const spine = book.spine as any;
    const pageCount = spine.items?.length || spine.length || 1;
    const targetPage = Math.max(1, Math.min(pageNumber, pageCount));

    // Use scrolled-doc flow to render full chapter content
    const rendition = book.renderTo(container, {
      width: 1600,
      spread: 'none',
      flow: 'scrolled-doc',
      allowScriptedContent: true
    });

    // Inject CSS to remove epub.js default padding/margins
    rendition.themes.default({
      'body': {
        'margin': '0 !important',
        'padding': '0 !important'
      },
      'html': {
        'margin': '0 !important',
        'padding': '0 !important'
      }
    });

    // Navigate to the target chapter/section
    if (targetPage > 1 && spine.items && spine.items[targetPage - 1]) {
      const targetSection = spine.items[targetPage - 1];
      await rendition.display(targetSection.href);
    } else {
      await rendition.display();
    }

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Measure actual content dimensions from the rendered iframe
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    let contentWidth = 1600;
    let contentHeight = 1080;

    if (iframe && iframe.contentDocument) {
      const body = iframe.contentDocument.body;
      const html = iframe.contentDocument.documentElement;

      if (body && html) {
        // Force remove margins/padding
        body.style.margin = '0';
        body.style.padding = '0';
        html.style.margin = '0';
        html.style.padding = '0';

        // Find actual content bounds by checking all elements
        const allElements = body.querySelectorAll('*');
        let minLeft = Infinity;
        let minTop = Infinity;
        let maxRight = 0;
        let maxBottom = 0;

        // Skip generic container elements (div, span, body, etc.) - focus on actual content
        const containerTags = new Set(['DIV', 'SPAN', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'NAV', 'ASIDE']);

        allElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const tagName = el.tagName.toUpperCase();
          const isContainer = containerTags.has(tagName);

          if (rect.width > 0 && rect.height > 0 && !isContainer) {
            minLeft = Math.min(minLeft, rect.left);
            minTop = Math.min(minTop, rect.top);
            maxRight = Math.max(maxRight, rect.right);
            maxBottom = Math.max(maxBottom, rect.bottom);
          }
        });

        // Also check scrollHeight for full content height
        const scrollHeight = Math.max(
          body.scrollHeight,
          html.scrollHeight,
          maxBottom
        );

        // Calculate actual content dimensions (crop to content bounds)
        if (minLeft !== Infinity) {
          contentWidth = Math.max(Math.ceil(maxRight - minLeft), 100);
          // Use scrollHeight if it's larger than measured maxBottom
          contentHeight = Math.max(Math.ceil(scrollHeight - minTop), 100);

          // Store clip coordinates for Playwright
          const clipX = minLeft;
          const clipY = minTop;

          // Return with clip info - let Playwright handle the clipping
          return {
            width: Math.ceil(contentWidth),
            height: Math.ceil(contentHeight),
            pageCount,
            pageNumber: targetPage,
            scale,
            clipX: Math.floor(clipX),
            clipY: Math.floor(clipY)
          };
        }
      }
    }

    // Fallback return if no content found
    return {
      width: Math.ceil(contentWidth),
      height: Math.ceil(contentHeight),
      pageCount,
      pageNumber: targetPage,
      scale
    };
  } catch (error) {
    console.error('Error rendering EPUB:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderEPUB();
