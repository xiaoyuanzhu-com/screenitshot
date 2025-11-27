import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js`;

declare global {
  interface Window {
    fileData: ArrayBuffer | string;
    renderComplete: Promise<void>;
  }
}

// Main rendering function
async function renderPDF() {
  try {
    const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // Wait for fileData to be injected
    while (!window.fileData) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const loadingTask = pdfjsLib.getDocument({ data: window.fileData });
    const pdf = await loadingTask.promise;

    // Render first page (default)
    const pageNumber = 1;
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
