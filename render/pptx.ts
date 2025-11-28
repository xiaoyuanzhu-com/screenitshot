import { init } from 'pptx-preview';

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
      <p>Select a PPTX file to render:</p>
      <input type="file" accept=".pptx" id="file-input" style="margin: 1rem 0;">
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
      await renderPPTX();
    };
    reader.readAsDataURL(file);
  });
}

// Render PPTX using pptx-preview
async function renderPPTX(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('pptx-container') as HTMLElement;
    if (!container) {
      throw new Error('PPTX container element not found');
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

    // Convert base64 to ArrayBuffer (pptx-preview accepts ArrayBuffer)
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    // Standard PowerPoint slide dimensions (16:9 aspect ratio)
    // Using 960x540 as base, will scale up for quality
    const baseWidth = 960;
    const baseHeight = 540;
    const scale = 2.0; // 2x scale for high quality output

    // Initialize pptx-preview
    const pptxPreviewer = init(container, {
      width: baseWidth,
      height: baseHeight
    });

    // Render the presentation
    await pptxPreviewer.preview(arrayBuffer);

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get slide count from the previewer if available
    // pptx-preview renders all slides, we need to find the total count
    const slides = container.querySelectorAll('.pptx-preview-slide, [class*="slide"]');
    const pageCount = Math.max(slides.length, 1);
    const targetPage = Math.max(1, Math.min(pageNumber, pageCount));

    // If we need a specific slide, hide others
    if (slides.length > 1 && targetPage <= slides.length) {
      slides.forEach((slide, index) => {
        (slide as HTMLElement).style.display = index === targetPage - 1 ? 'block' : 'none';
      });
    }

    // Calculate final dimensions
    const width = Math.ceil(baseWidth * scale);
    const height = Math.ceil(baseHeight * scale);

    // Return metadata for Playwright to resize viewport
    return {
      width,
      height,
      pageCount,
      pageNumber: targetPage,
      scale
    };
  } catch (error) {
    console.error('Error rendering PPTX:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderPPTX();
