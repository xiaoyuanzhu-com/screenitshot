// URL format is special - it navigates directly to the URL instead of using a template
// This file is mainly for local testing mode

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

// Show URL input for local testing
function showUrlInput() {
  const container = document.getElementById('url-container');
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>URL Screenshot</h2>
      <p>Note: In production, URL screenshots are taken by navigating directly to the URL.</p>
      <p>This is a local testing placeholder.</p>
      <br>
      <input type="url" id="url-input" placeholder="https://example.com" style="padding: 8px; width: 300px; margin: 1rem 0;">
      <br>
      <button id="screenshot-btn" style="padding: 8px 16px; cursor: pointer;">Preview URL</button>
      <div id="preview" style="margin-top: 20px;"></div>
    </div>
  `;

  const input = document.getElementById('url-input') as HTMLInputElement;
  const btn = document.getElementById('screenshot-btn') as HTMLButtonElement;
  const preview = document.getElementById('preview') as HTMLDivElement;

  btn.addEventListener('click', () => {
    const url = input.value;
    if (url) {
      preview.innerHTML = `<p>URL to screenshot: <a href="${url}" target="_blank">${url}</a></p>`;
    }
  });
}

// Main rendering function
async function renderURL(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('url-container') as HTMLElement;
    if (!container) {
      throw new Error('URL container element not found');
    }

    // Check if placeholder value (local testing mode)
    if (fileBase64 === FILE_BASE64_PLACEHOLDER) {
      showUrlInput();
      // Return dummy metadata for local testing
      return {
        width: 1920,
        height: 1080,
        pageCount: 1,
        pageNumber: 1,
        scale: 1.0
      };
    }

    // In production, this template is not actually used
    // The renderer navigates directly to the URL
    // This code is here just for consistency

    // Decode base64 to text (URL string)
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const url = new TextDecoder('utf-8').decode(bytes).trim();

    container.innerHTML = `
      <p>URL to screenshot: ${url}</p>
      <p>Note: URL screenshots should be handled by direct navigation.</p>
    `;

    // Return metadata
    return {
      width: 1920,
      height: 1080,
      pageCount: 1,
      pageNumber: pageNumber,
      scale: 2.0
    };
  } catch (error) {
    console.error('Error rendering URL:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderURL();
