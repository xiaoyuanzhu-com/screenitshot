import { RTFJS, WMFJS, EMFJS } from 'rtf.js';

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

// Disable logging
RTFJS.loggingEnabled(false);
WMFJS.loggingEnabled(false);
EMFJS.loggingEnabled(false);

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
      <p>Select an RTF file to render:</p>
      <input type="file" accept=".rtf" id="file-input" style="margin: 1rem 0;">
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
      await renderRTF();
    };
    reader.readAsDataURL(file);
  });
}

// Convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const buffer = new ArrayBuffer(str.length);
  const bufferView = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    bufferView[i] = str.charCodeAt(i);
  }
  return buffer;
}

// Main rendering function
async function renderRTF(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('rtf-container') as HTMLElement;
    if (!container) {
      throw new Error('RTF container element not found');
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

    // Decode base64 to binary string
    const binaryString = atob(fileBase64);

    // Convert to ArrayBuffer for rtf.js
    const arrayBuffer = stringToArrayBuffer(binaryString);

    // Create RTF document and render
    const doc = new RTFJS.Document(arrayBuffer);
    const htmlElements = await doc.render();

    // Append all rendered HTML elements to container
    htmlElements.forEach((element: HTMLElement) => {
      container.appendChild(element);
    });

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Measure rendered content dimensions
    const scale = 2.0;
    const rect = container.getBoundingClientRect();

    // Include padding
    const width = Math.ceil(Math.max(rect.width + 80, 400) * scale);
    const height = Math.ceil((rect.height + 80) * scale);

    console.log('RTF rendered successfully');

    // Return metadata for Playwright to resize viewport
    return {
      width,
      height,
      pageCount: 1,
      pageNumber: pageNumber,
      scale
    };
  } catch (error) {
    console.error('Error rendering RTF:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderRTF();
