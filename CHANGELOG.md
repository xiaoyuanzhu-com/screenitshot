# Changelog

## [Unreleased]

### Added
- **Metadata callback system**: PDF renderer now returns `RenderMetadata` with actual viewport dimensions
- **Automatic viewport resizing**: Playwright automatically resizes browser viewport to match PDF page size
- **Renderer specification**: Added [render/RENDERER_SPEC.md](render/RENDERER_SPEC.md) defining interface requirements for all format renderers
- **Dual-mode support**: Renderers now support both Playwright automation and manual testing with file upload
- **Quality control documentation**: Added "Render Quality Control" section in tech design doc
- **Technical challenges documentation**: Documented solutions to CORS, data injection, and size detection issues

### Changed
- **Build system**: Switched to `vite-plugin-singlefile` to inline all JavaScript into HTML
  - Templates are now single self-contained HTML files (~1.6MB for PDF)
  - No separate assets folder needed
  - Fixes CORS issues with `file://` protocol
- **Data injection**: Changed from string replacement to `page.addInitScript()`
  - More robust for bundled JavaScript
  - Cleaner separation of concerns
- **Template interface**: `window.renderComplete` now returns `Promise<RenderMetadata>` instead of `Promise<void>`
- **Screenshot dimensions**: Now based on actual PDF page size × scale factor
  - Letter PDF (612×792 pt) → 1224×1584 px at 2× scale
  - No more cropping or whitespace issues

### Technical Details

**File Structure Changes**:
```
render/dist/
  ├── pdf.html          # Single 1.6MB file (was: pdf.html + assets/pdf-*.js)
  └── (no assets/)      # All JS inlined

js/templates/
  └── pdf.html          # Self-contained template (was: pdf.html + assets/)
```

**API Changes**:
```typescript
// New RenderMetadata interface
interface RenderMetadata {
  width: number;        // Actual rendered width
  height: number;       // Actual rendered height
  pageCount: number;    // Total pages
  pageNumber: number;   // Current page
  scale: number;        // Scale factor used
}

// Template now returns metadata
window.renderComplete: Promise<RenderMetadata>  // was: Promise<void>

// Renderer uses metadata to resize
const metadata = await page.evaluate(() => window.renderComplete);
await page.setViewportSize({ width: metadata.width, height: metadata.height });
```

**Dependencies Added**:
- `vite-plugin-singlefile@^2.3.0` (render/)

**Build Process Changes**:
1. `cd render && npm run build` → produces single `dist/pdf.html` (1.6MB)
2. `cd js && npm run build` → copies `pdf.html` to `templates/` (no assets)

### Fixed
- CORS errors when loading templates via `file://` protocol
- Incorrect screenshot dimensions for PDFs with non-standard sizes
- Data injection not working with Vite-bundled JavaScript
