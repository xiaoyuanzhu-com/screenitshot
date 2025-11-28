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
    // This allows measuring actual content height
    const rendition = book.renderTo(container, {
      width: 600,
      spread: 'none',
      flow: 'scrolled-doc'  // Scrolled mode to get full content height
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
    let contentWidth = 600;
    let contentHeight = 800;

    if (iframe && iframe.contentDocument) {
      const body = iframe.contentDocument.body;
      if (body) {
        // Get the actual content dimensions
        contentWidth = Math.max(body.scrollWidth, body.offsetWidth, 600);
        contentHeight = Math.max(body.scrollHeight, body.offsetHeight, 100);

        // Add some padding
        contentWidth = Math.min(contentWidth + 40, 800);
        contentHeight = contentHeight + 40;
      }
    }

    // Update container to match content size
    container.style.width = `${contentWidth}px`;
    container.style.height = `${contentHeight}px`;
    container.style.overflow = 'hidden';

    // Also resize the iframe to match
    if (iframe) {
      iframe.style.width = `${contentWidth}px`;
      iframe.style.height = `${contentHeight}px`;
    }

    // Wait a bit more for any reflow
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return CSS pixel dimensions - Playwright's deviceScaleFactor handles 2x scaling
    // This matches how PDF renderer returns viewport dimensions
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
