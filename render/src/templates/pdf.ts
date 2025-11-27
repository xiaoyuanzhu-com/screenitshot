import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker path (bundled locally by Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Placeholder values that get replaced by renderer
const FILE_BASE64_PLACEHOLDER = 'FILE_BASE64_PLACEHOLDER';
const PAGE_NUMBER_PLACEHOLDER = 1;

let fileBase64 = FILE_BASE64_PLACEHOLDER;
let pageNumber = PAGE_NUMBER_PLACEHOLDER;

declare global {
  interface Window {
    renderComplete: Promise<void>;
  }
}

// Show file selector for local testing
function showFileSelector() {
  const container = document.getElementById('container');
  if (!container) return;

  const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;

  // Create file input overlay without removing canvas
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
      <p>Select a PDF file to render:</p>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif" id="file-input" style="margin: 1rem 0;">
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
      await renderPDF();
    };
    reader.readAsDataURL(file);
  });
}

// Main rendering function
async function renderPDF() {
  try {
    const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // Check if placeholder value (local testing mode)
    if (fileBase64 === FILE_BASE64_PLACEHOLDER) {
      showFileSelector();
      return;
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;

    // Use configured page number
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({ scale: 2.0 });
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Cannot get canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    console.log('PDF rendered successfully');
  } catch (error) {
    console.error('Error rendering PDF:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderPDF();
