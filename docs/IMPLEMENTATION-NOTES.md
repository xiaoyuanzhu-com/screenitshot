# Implementation Notes & Design Gaps

This document tracks differences between the original design and actual implementation, along with rationale for changes.

## Template Data Injection Pattern

**Design:** Inject `window.fileData` via Playwright `page.evaluate()`

**Implemented:** String replacement with placeholders

### Rationale:
The placeholder pattern (`FILE_BASE64_PLACEHOLDER`) provides several advantages:
1. **Local testing**: Templates can detect placeholder and show file selector
2. **Simpler debugging**: Actual data is in the HTML source
3. **No timing issues**: Data is available before any script runs
4. **Type safety**: Base64 string is cleaner than ArrayBuffer injection

### How it works:
```typescript
// Template has:
let fileBase64 = 'FILE_BASE64_PLACEHOLDER';
let pageNumber = PAGE_NUMBER_PLACEHOLDER;

// Renderer replaces these before loading:
template.replace(/let fileBase64 = ['"]FILE_BASE64_PLACEHOLDER['"];/,
                `let fileBase64 = '${actualBase64}';`)
```

### Local Testing:
When placeholder is not replaced, template shows a file selector for manual testing.

## Template Structure

**Design said:** "Self-contained HTML files"

**Actually:** HTML + separate asset files

### Structure:
```
templates/
├── pdf.html                    # Entry point
└── assets/
    ├── pdf-[hash].js          # Main logic (294KB)
    └── pdf.worker.min-[hash].mjs  # PDF.js worker (1MB)
```

### Rationale:
- Vite's default multi-page output structure
- Code splitting for better caching
- Worker must be separate file (Web Worker requirement)

### Impact:
- Must copy entire `render/dist/src/templates/` directory
- Not just HTML files, but also `assets/` folder
- Templates reference assets with relative paths

## PDF.js Worker Bundling

**Original issue:** CDN dependency

**Fix:** Bundle locally with Vite

```typescript
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
```

### Result:
- 1MB worker file bundled in `assets/`
- No internet required
- Truly pinned version
- Works offline

## Page Selection

**Implemented:** Fully functional

- CLI: `--page N` flag
- API: `{ page: N }` option
- Template: `let pageNumber = N;` injected

Works for multi-page PDFs. Page numbers are 1-indexed.

## Error Handling

### Node.js CLI:
```typescript
// User-friendly messages
if (err.message.includes('ENOENT')) {
  console.error(`Error: Input file not found: ${input}`);
}
// ... more specific cases

// Debug mode for stack traces
if (process.env.DEBUG) {
  console.error(err.stack);
}
```

### Python wrapper:
```python
# Extract clean error from npm CLI output
if "Error:" in error_msg:
    for line in error_msg.split('\n'):
        if line.startswith('Error:'):
            error_msg = line
            break
```

Both provide user-friendly messages without technical stack traces.

## Build Process

**Design:** Implied automated flow

**Implemented:** Manual steps (for now)

### Current process:
```bash
# 1. Build templates
cd render && npm run build

# 2. Build js package (auto-copies templates)
cd ../js && npm run build
```

### Future improvement:
Add root-level `package.json` with workspace scripts:
```json
{
  "workspaces": ["render", "js"],
  "scripts": {
    "build": "npm run build:render && npm run build:js",
    "build:render": "npm run build --workspace=render",
    "build:js": "npm run build --workspace=js"
  }
}
```

## Known Limitations (Intentional for MVP)

1. **Single page per screenshot** - Multi-page → multiple screenshots not yet implemented
2. **No timeout handling** - Long renders could hang indefinitely
3. **No progress reporting** - Silent during conversion
4. **Basic format detection** - Extension + magic bytes only
5. **Only PDF supported** - EPUB, DOCX coming in Phase 2

## Design Decisions Made During Implementation

### Good choices:
1. **`globalThis` over `window`** - More correct in Node.js Playwright context
2. **Temp file cleanup** - Ensures no leftover files on error
3. **TypeScript strict mode** - Caught several bugs early
4. **Separate Dockerfile.local** - Easier development workflow
5. **Base64 encoding** - Simpler than binary array injection

### Trade-offs:
1. **Template not self-contained** - But allows code splitting
2. **String replacement vs evaluation** - Safer and easier to debug
3. **1MB worker file** - But no CDN dependency

## Testing Checklist

- [x] PDF rendering works
- [x] Page selection works
- [x] Local testing (placeholder detection)
- [x] Error messages are user-friendly
- [x] Worker loads from bundled file (no internet)
- [ ] Large PDF files (>10MB)
- [ ] Multi-page documents
- [ ] Edge cases (corrupted PDFs, etc.)

## Next Steps

### High Priority:
1. Add integration tests
2. Add timeout handling (30s default)
3. Implement EPUB support

### Medium Priority:
4. Root-level build automation
5. Progress reporting
6. Better temp file management

### Low Priority:
7. Template validation
8. Custom CSS injection
9. Batch processing
