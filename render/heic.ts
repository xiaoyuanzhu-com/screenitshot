// HEIC/HEIF renderer using libheif-js (WASM, bundled inline).
// Defaults to original resolution; honors requestedWidth / requestedHeight
// for scaling. Multi-image HEICs select a frame via pageNumber (1-based).
import libheif from 'libheif-js/wasm-bundle';
import type { RenderMetadata } from '../js/src/types';

interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(
    imageData: { data: Uint8ClampedArray; width: number; height: number },
    callback: (displayData: { data: Uint8ClampedArray; width: number; height: number } | null) => void
  ): void;
}

interface HeifDecoder {
  decode(buffer: ArrayBuffer | Uint8Array): HeifImage[];
}

interface LibHeifModule {
  HeifDecoder: new () => HeifDecoder;
}

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
  // eslint-disable-next-line no-var
  var fileBase64: string;
  // eslint-disable-next-line no-var
  var pageNumber: number;
  // eslint-disable-next-line no-var
  var requestedWidth: number;
  // eslint-disable-next-line no-var
  var requestedHeight: number;
}

const FILE_BASE64_PLACEHOLDER = 'FILE_BASE64_PLACEHOLDER';

const fileBase64 = (globalThis as { fileBase64?: string }).fileBase64 || FILE_BASE64_PLACEHOLDER;
const pageNumber = (globalThis as { pageNumber?: number }).pageNumber || 1;
const requestedWidth = (globalThis as { requestedWidth?: number }).requestedWidth || 0;
const requestedHeight = (globalThis as { requestedHeight?: number }).requestedHeight || 0;

function showFileSelector(): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: white;
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; font-family: system-ui, -apple-system, sans-serif;
  `;
  overlay.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>HEIC Renderer — Local Testing</h2>
      <p>Select a HEIC/HEIF file to render:</p>
      <input type="file" accept=".heic,.heif,image/heic,image/heif" id="heic-file-input" style="margin: 1rem 0;">
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById('heic-file-input') as HTMLInputElement;
  input.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    overlay.remove();
    await renderHeicBuffer(new Uint8Array(buf));
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function computeOutputSize(
  intrinsicW: number,
  intrinsicH: number,
  reqW: number,
  reqH: number
): { width: number; height: number } {
  if (!reqW && !reqH) return { width: intrinsicW, height: intrinsicH };
  let scale: number;
  if (reqW && reqH) {
    scale = Math.min(reqW / intrinsicW, reqH / intrinsicH);
  } else if (reqW) {
    scale = reqW / intrinsicW;
  } else {
    scale = reqH / intrinsicH;
  }
  return {
    width: Math.max(1, Math.round(intrinsicW * scale)),
    height: Math.max(1, Math.round(intrinsicH * scale)),
  };
}

async function renderHeicBuffer(bytes: Uint8Array): Promise<RenderMetadata> {
  const lib = libheif as unknown as LibHeifModule;
  const decoder = new lib.HeifDecoder();
  const images = decoder.decode(bytes);
  if (!images || images.length === 0) {
    throw new Error('No images found in HEIC file');
  }

  const pageCount = images.length;
  const idx = Math.min(Math.max(pageNumber, 1), pageCount) - 1;
  const image = images[idx];

  const intrinsicW = image.get_width();
  const intrinsicH = image.get_height();

  // Decode into source canvas at intrinsic dimensions.
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = intrinsicW;
  sourceCanvas.height = intrinsicH;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Cannot get 2D context for source canvas');

  const imageData = sourceCtx.createImageData(intrinsicW, intrinsicH);
  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (displayData) => {
      if (!displayData) {
        reject(new Error('HEIC decode failed'));
        return;
      }
      resolve();
    });
  });
  sourceCtx.putImageData(imageData, 0, 0);

  // Compute output size (default = intrinsic, otherwise scaled to requested).
  const { width, height } = computeOutputSize(intrinsicW, intrinsicH, requestedWidth, requestedHeight);

  // Set the visible canvas to output size and draw scaled.
  const canvas = document.getElementById('heic-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('heic-canvas element not found');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context for output canvas');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, intrinsicW, intrinsicH, 0, 0, width, height);

  return {
    width,
    height,
    pageCount,
    pageNumber: idx + 1,
    scale: width / intrinsicW,
  };
}

async function render(): Promise<RenderMetadata> {
  if (fileBase64 === FILE_BASE64_PLACEHOLDER) {
    showFileSelector();
    return { width: 800, height: 600, pageCount: 1, pageNumber: 1, scale: 1 };
  }
  return renderHeicBuffer(base64ToUint8Array(fileBase64));
}

window.renderComplete = render();
