import { renderAsync } from 'docx-preview';

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
      <p>Select a DOCX file to render:</p>
      <input type="file" accept=".docx" id="file-input" style="margin: 1rem 0;">
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
      await renderDOCX();
    };
    reader.readAsDataURL(file);
  });
}

// Render DOCX using docx-preview
async function renderDOCX(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('docx-container') as HTMLElement;
    if (!container) {
      throw new Error('DOCX container element not found');
    }

    // Check if placeholder value (local testing mode)
    if (fileBase64 === FILE_BASE64_PLACEHOLDER) {
      showFileSelector();
      // Return dummy metadata for local testing
      return {
        width: 1920,
        height: 1080,
        pageCount: 1,
        pageNumber: 1,
        scale: 1.0
      };
    }

    // Convert base64 to Blob (docx-preview accepts Blob)
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    // Render DOCX using docx-preview
    await renderAsync(blob, container, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      experimental: false,
      trimXmlDeclaration: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    });

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // docx-preview creates a wrapper div with class 'docx-wrapper'
    const wrapper = container.querySelector('.docx-wrapper') as HTMLElement;
    if (!wrapper) {
      throw new Error('DOCX rendering failed - no wrapper element found');
    }

    // Find all rendered sections (document sections, not page breaks)
    const sections = wrapper.querySelectorAll('section.docx');

    // Use the first section as the main content (contains body)
    // docx-preview renders the full document in sections, page breaks are visual only
    let visiblePage: HTMLElement;
    if (sections.length > 0) {
      visiblePage = sections[0] as HTMLElement;
      // Hide other sections (headers/footers rendered separately)
      sections.forEach((section, index) => {
        if (index > 0) {
          (section as HTMLElement).style.display = 'none';
        }
      });
    } else {
      visiblePage = wrapper;
    }

    // Use 2x scale for high quality output
    const scale = 2.0;

    // Get page dimensions from inline styles (set by docx-preview from DOCX page settings)
    const inlineWidth = visiblePage.style.width;
    const inlineMinHeight = visiblePage.style.minHeight;

    let width: number;
    let height: number;

    // Parse width from inline style (in pt)
    if (inlineWidth) {
      width = parseFloat(inlineWidth);
    } else {
      width = visiblePage.offsetWidth;
    }

    // For height, use minHeight (page height from DOCX) or calculate A4 ratio
    if (inlineMinHeight) {
      height = parseFloat(inlineMinHeight);
    } else {
      // A4 ratio: height = width * (297/210)
      height = width * (297 / 210);
    }

    width = Math.ceil(width * scale);
    height = Math.ceil(height * scale);

    // Calculate approximate page count based on content height vs page height
    const contentHeight = visiblePage.scrollHeight;
    const singlePageHeight = parseFloat(inlineMinHeight) || (width / scale) * (297 / 210);
    const pageCount = Math.ceil(contentHeight / singlePageHeight);
    const targetPage = Math.max(1, Math.min(pageNumber, pageCount));

    // Return metadata for Playwright to resize viewport
    return {
      width,
      height,
      pageCount,
      pageNumber: targetPage,
      scale
    };
  } catch (error) {
    console.error('Error rendering DOCX:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderDOCX();
