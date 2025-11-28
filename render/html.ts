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
      <p>Select an HTML file to render:</p>
      <input type="file" accept=".html,.htm" id="file-input" style="margin: 1rem 0;">
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
      await renderHTML();
    };
    reader.readAsDataURL(file);
  });
}

// Main rendering function
async function renderHTML(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('html-container') as HTMLElement;
    if (!container) {
      throw new Error('HTML container element not found');
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

    // Decode base64 to text
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const htmlContent = new TextDecoder('utf-8').decode(bytes);

    // Parse HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Extract styles from head
    const styles = doc.querySelectorAll('style');
    styles.forEach(style => {
      const newStyle = document.createElement('style');
      newStyle.textContent = style.textContent;
      document.head.appendChild(newStyle);
    });

    // Extract link stylesheets (won't load external ones but handle inline)
    const links = doc.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      // Skip external stylesheets (they won't load in this context)
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http')) {
        console.warn('External stylesheet skipped:', href);
      }
    });

    // Set body content
    container.innerHTML = doc.body.innerHTML;

    // Copy body styles if any
    if (doc.body.style.cssText) {
      container.style.cssText = doc.body.style.cssText;
    }

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

    // Measure rendered content dimensions
    const scale = 2.0;
    const rect = container.getBoundingClientRect();

    // Use reasonable minimum width
    const width = Math.ceil(Math.max(rect.width, 800) * scale);
    const height = Math.ceil(Math.max(rect.height, 100) * scale);

    console.log('HTML rendered successfully');

    // Return metadata for Playwright to resize viewport
    return {
      width,
      height,
      pageCount: 1,
      pageNumber: pageNumber,
      scale
    };
  } catch (error) {
    console.error('Error rendering HTML:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderHTML();
