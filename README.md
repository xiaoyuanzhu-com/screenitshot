# Screenitshot

Convert various file formats to high-quality screenshots using browser-based rendering.

## Features

- Universal screenshot tool for PDFs, EPUBs, DOCX, and more
- High-quality rendering using Chromium
- Available as npm package, Python binding, and Docker image
- Reproducible builds with pinned dependencies
- Simple CLI and programmatic APIs

## Quick Start

### CLI (One-liner)

```bash
# With npx (no installation)
npx screenitshot document.pdf output.png

# With uvx (Python, no installation)
uvx screenitshot document.pdf output.png

# With Docker (no installation)
docker run -v $(pwd):/app screenitshot/screenitshot /app/document.pdf /app/output.png
```

### Package Usage

**JavaScript/TypeScript:**
```javascript
import { screenshot } from 'screenitshot';

await screenshot('document.pdf', {
  output: 'output.png',
  format: 'png',
  width: 1920,
  height: 1080,
  page: 1
});
```

**Python:**
```python
from screenitshot import screenshot

screenshot(
    'document.pdf',
    output='output.png',
    format='png',
    width=1920,
    height=1080,
    page=1
)
```

## Supported Formats

| File Extension | Library | Version |
|----------------|---------|---------|
| `.pdf` | [PDF.js](https://mozilla.github.io/pdf.js/) | 4.0.379 |

## Installation

### npm
```bash
npm install -g screenitshot
```

### Python
```bash
pip install screenitshot
```

## Documentation

- [Development Guide](docs/dev.md) - Build from source, local testing, and contribution guide
- [Technical Design](docs/tech-design.md) - Complete technical design and architecture
