import Papa from 'papaparse';

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
      <p>Select a CSV file to render:</p>
      <input type="file" accept=".csv,.tsv" id="file-input" style="margin: 1rem 0;">
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
      await renderCSV();
    };
    reader.readAsDataURL(file);
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Viewport constants for pseudo-pagination
const VIEWPORT_WIDTH = 1080;
const VIEWPORT_HEIGHT = 1920;

// Main rendering function
async function renderCSV(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('csv-container') as HTMLElement;
    if (!container) {
      throw new Error('CSV container element not found');
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
    const csvText = new TextDecoder('utf-8').decode(bytes);

    // Parse CSV using PapaParse
    const result = Papa.parse<string[]>(csvText, {
      header: false,
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing warnings:', result.errors);
    }

    const data = result.data;
    if (data.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Build HTML table
    const table = document.createElement('table');
    table.style.width = '100%';

    // First row as header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    data[0].forEach(cell => {
      const th = document.createElement('th');
      th.innerHTML = escapeHtml(cell);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Rest as body
    const tbody = document.createElement('tbody');
    for (let i = 1; i < data.length; i++) {
      const tr = document.createElement('tr');
      data[i].forEach(cell => {
        const td = document.createElement('td');
        td.innerHTML = escapeHtml(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    container.appendChild(table);

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 100));

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

    console.log(`CSV rendered successfully (page ${targetPage}/${pageCount})`);

    // Return metadata for Playwright to resize viewport
    return {
      width: VIEWPORT_WIDTH,
      height: pageHeight,
      pageCount,
      pageNumber: targetPage,
      scale: 2.0
    };
  } catch (error) {
    console.error('Error rendering CSV:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderCSV();
