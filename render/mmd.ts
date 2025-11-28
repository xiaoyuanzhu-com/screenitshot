import mermaid from 'mermaid';
import type { RenderMetadata } from '../js/src/types';

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
  // eslint-disable-next-line no-var
  var fileBase64: string;
}

async function render(): Promise<RenderMetadata> {
  // Decode base64 file content
  const mmdContent = atob(globalThis.fileBase64);

  // Initialize mermaid with configuration
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  });

  // Get the source element
  const sourceEl = document.getElementById('mermaid-source');
  if (!sourceEl) {
    throw new Error('Mermaid source element not found');
  }

  // Set the mermaid content
  sourceEl.textContent = mmdContent;

  // Render the diagram
  await mermaid.run({
    nodes: [sourceEl],
  });

  // Wait for render to complete
  await new Promise(resolve => setTimeout(resolve, 100));

  // Get the rendered SVG dimensions
  const container = document.getElementById('container');
  if (!container) {
    throw new Error('Container not found');
  }

  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('Rendered SVG not found');
  }

  // Get the actual dimensions
  const rect = svg.getBoundingClientRect();
  const width = Math.ceil(rect.width) + 40; // Add padding
  const height = Math.ceil(rect.height) + 40;

  return {
    width,
    height,
    pageCount: 1,
    pageNumber: 1,
    scale: 1,
  };
}

window.renderComplete = render();
