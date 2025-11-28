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

// Convert DOCX to HTML using mammoth.js or similar approach
async function renderDOCX(): Promise<RenderMetadata> {
  try {
    const wrapper = document.querySelector('.docx-wrapper') as HTMLElement;
    if (!wrapper) {
      throw new Error('DOCX wrapper element not found');
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

    // Convert base64 to ArrayBuffer
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Import mammoth dynamically
    const mammoth = await import('mammoth');

    // Convert DOCX to HTML
    const result = await mammoth.convertToHtml(
      { arrayBuffer: bytes.buffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
        ]
      }
    );

    // Insert the HTML content
    wrapper.innerHTML = result.value;

    // Log any messages/warnings
    if (result.messages.length > 0) {
      console.log('Conversion messages:', result.messages);
    }

    // Wait for images and other resources to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Calculate the actual content dimensions
    const content = document.getElementById('docx-content') as HTMLElement;
    if (!content) {
      throw new Error('Content element not found');
    }

    // Get the bounding box of the actual content
    const boundingBox = wrapper.getBoundingClientRect();
    const width = Math.ceil(boundingBox.width) + 80; // Add padding
    const height = Math.ceil(boundingBox.height) + 80; // Add padding

    console.log('DOCX rendered successfully');

    // Return metadata for Playwright to resize viewport
    return {
      width: Math.max(width, 816), // Minimum A4 width
      height: Math.max(height, 400), // Minimum reasonable height
      pageCount: 1, // DOCX is rendered as single continuous page
      pageNumber: 1,
      scale: 1.0
    };
  } catch (error) {
    console.error('Error rendering DOCX:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderDOCX();
