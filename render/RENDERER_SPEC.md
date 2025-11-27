# Renderer Page Specification

This document defines the interface requirements for all renderer pages (e.g., `pdf.html`, `epub.html`, etc.).

## Overview

Each renderer page is a self-contained HTML file that:
1. Renders a specific file format to a canvas
2. Works in both **manual testing mode** (file upload) and **Playwright automation mode**
3. Returns metadata via a Promise-based callback

## Required Interface

### 1. Global Variables (Input)

Each renderer must read these values from `globalThis`:

```typescript
// Data injected by Playwright via page.addInitScript()
// Falls back to placeholders for manual testing mode
let fileBase64 = (globalThis as any).fileBase64 || 'FILE_BASE64_PLACEHOLDER';
let pageNumber = (globalThis as any).pageNumber || 1; // or other params as needed
```

**Naming Convention**:
- Use `*_PLACEHOLDER` constants for placeholder values
- Check if value equals placeholder to detect manual testing mode

### 2. Window API (Output)

Each renderer must expose this Promise on `window`:

```typescript
interface RenderMetadata {
  width: number;        // Rendered canvas width in pixels
  height: number;       // Rendered canvas height in pixels
  pageCount: number;    // Total pages/items in document
  pageNumber: number;   // Current page/item being rendered
  scale: number;        // Scale factor used (e.g., 2.0 for HiDPI)
}

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
}

// Set immediately on page load
window.renderComplete = renderDocument();
```

**Promise Resolution**:
- ✅ Resolve with `RenderMetadata` when rendering is complete
- ❌ Never reject - handle errors internally and show UI feedback
- ⏱️ Playwright waits for this Promise before taking screenshot

### 3. Dual Mode Support

Each renderer must support **two modes**:

#### Mode 1: Playwright Automation (Production)
- `fileBase64` is injected via `page.addInitScript()`
- Render automatically on page load
- Return accurate metadata

```typescript
async function renderDocument(): Promise<RenderMetadata> {
  // fileBase64 will be injected by Playwright
  const bytes = base64ToUint8Array(fileBase64);

  // ... render logic ...

  return {
    width: actualWidth,
    height: actualHeight,
    pageCount: totalPages,
    pageNumber: currentPage,
    scale: scaleUsed
  };
}
```

#### Mode 2: Manual Testing (Development)
- Detect placeholder value
- Show file upload UI
- Allow local testing without Playwright

```typescript
async function renderDocument(): Promise<RenderMetadata> {
  // Check if running in manual testing mode
  if (fileBase64 === 'FILE_BASE64_PLACEHOLDER') {
    showFileSelector(); // Show upload UI

    // Return dummy metadata (won't be used)
    return {
      width: 1920,
      height: 1080,
      pageCount: 1,
      pageNumber: 1,
      scale: 2.0
    };
  }

  // Production rendering...
}
```

**File Upload Handler**:
```typescript
function showFileSelector() {
  // Create overlay with file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.epub'; // Appropriate formats

  input.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      // Extract base64 (remove data URL prefix)
      fileBase64 = (e.target?.result as string).split(',')[1];

      // Re-render with uploaded file
      await renderDocument();

      // Remove overlay
      overlay.remove();
    };
    reader.readAsDataURL(file);
  });

  document.body.appendChild(overlay);
}
```

## HTML Structure Requirements

### Required Elements

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Format Renderer</title>

  <style>
    /* Reset and container styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: white;
      overflow: hidden;
    }

    #container {
      width: 100%;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    canvas {
      display: block;
      max-width: 100%;
      max-height: 100%;
    }
  </style>
</head>
<body>
  <div id="container">
    <!-- Main rendering canvas -->
    <canvas id="format-canvas"></canvas>
  </div>

  <!-- Script will be inlined by vite-plugin-singlefile -->
  <script type="module" src="./format.ts"></script>
</body>
</html>
```

**Required IDs**:
- `container`: Main container div
- `format-canvas`: Canvas element for rendering (use descriptive name like `pdf-canvas`, `epub-canvas`)

## Build Requirements

### Vite Configuration

Each renderer must be built with `vite-plugin-singlefile`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: resolve(__dirname, 'format.html'),
    },
  },
});
```

**Output**: Single self-contained HTML file with all JS/CSS inlined (~1-3MB depending on libraries)

### Dependencies

- Must use npm packages (not CDN links)
- All dependencies will be bundled by Vite
- Ensure libraries are compatible with ES modules

## Example Implementation

See [`pdf.ts`](./pdf.ts) for a complete reference implementation following this spec.

### Key Features Demonstrated:
✅ Dual mode support (Playwright + manual testing)
✅ Proper metadata return with actual dimensions
✅ Clean error handling
✅ File upload UI for local testing
✅ High-quality rendering (2× scale)

## Checklist for New Renderers

When creating a new renderer (e.g., `epub.html`):

- [ ] Define placeholder constants (e.g., `FILE_BASE64_PLACEHOLDER`)
- [ ] Read from `globalThis` with fallback to placeholders
- [ ] Implement `renderDocument(): Promise<RenderMetadata>`
- [ ] Detect placeholder value for manual testing mode
- [ ] Show file upload UI in manual mode
- [ ] Return accurate `RenderMetadata` in production mode
- [ ] Set `window.renderComplete = renderDocument()`
- [ ] Create canvas element with descriptive ID
- [ ] Add format-specific file extensions to upload UI
- [ ] Test both Playwright and manual modes
- [ ] Verify metadata accuracy (width, height, pageCount)
- [ ] Configure Vite build with `viteSingleFile()`
- [ ] Update `js/src/renderer.ts` template map
- [ ] Update Vite config input to build new template

## Testing

### Manual Testing
```bash
cd render
npm run dev
# Open http://localhost:5173/format.html
# Upload a test file
# Verify rendering works
```

### Playwright Testing
```typescript
import { screenshot } from './js/dist/index.js';

const result = await screenshot('test.format', {
  output: 'output.png',
});

console.log('Result:', result);
// Should show actual dimensions, not defaults
```

## Best Practices

1. **Always return actual dimensions** - Don't use hardcoded values in production mode
2. **Handle errors gracefully** - Show user-friendly error messages in manual mode
3. **Use appropriate scale** - Default to 2.0× for high-quality output
4. **Respect intrinsic sizes** - Use document's actual page/viewport dimensions
5. **Test both modes** - Verify Playwright automation and manual upload work
6. **Keep placeholders obvious** - Use ALL_CAPS naming like `FILE_BASE64_PLACEHOLDER`

## Format-Specific Parameters

Different formats may need different parameters injected by Playwright:

```typescript
// PDF
let fileBase64 = (globalThis as any).fileBase64 || 'FILE_BASE64_PLACEHOLDER';
let pageNumber = (globalThis as any).pageNumber || 1;

// EPUB
let fileBase64 = (globalThis as any).fileBase64 || 'FILE_BASE64_PLACEHOLDER';
let chapterNumber = (globalThis as any).chapterNumber || 1;

// Video
let fileBase64 = (globalThis as any).fileBase64 || 'FILE_BASE64_PLACEHOLDER';
let timeOffset = (globalThis as any).timeOffset || 1000; // milliseconds
```

Update `js/src/renderer.ts` `injectDataIntoPage()` method accordingly for each format.
