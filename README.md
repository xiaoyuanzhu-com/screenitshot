# ScreenItShot

Convert many document formats into screenshot previews.  
Inspired by [MarkItDown](https://github.com/microsoft/markitdown).

## Features

- PDF, Word, Excel support and many more
- Browser based render and screenshot
- JavaScript package and cli
- Python package and cli
- Docker image

**Supported Formats**

| File Extension | Library | Status |
|----------------|---------|--------|
| `.pdf` | [PDF.js](https://github.com/mozilla/pdf.js) | ✅ |
| `.epub` | [epub.js](https://github.com/futurepress/epub.js) | ✅ |
| `.docx` | [docxjs](https://github.com/VolodymyrBaydalka/docxjs) | ✅ |
| `.xlsx` | [ExcelJS](https://github.com/exceljs/exceljs) | ✅ |
| `.pptx` | [pptx-preview](https://github.com/niconiahi/pptx-preview) | ✅ |
| `.md` | [marked](https://github.com/markedjs/marked) | ✅ |
| `.html` | [Chromium](https://www.chromium.org/chromium-projects/) | ✅ |
| `.csv` | [PapaParse](https://github.com/mholt/PapaParse) | ✅ |
| `.rtf` | [rtf.js](https://github.com/tbluemel/rtf.js) | ✅ |
| `.ipynb` | [marked](https://github.com/markedjs/marked) + [Shiki](https://github.com/shikijs/shiki) | ✅ |
| `.tex` | [LaTeX.js](https://github.com/michael-brade/LaTeX.js) | 📋 TODO |
| source code | [Shiki](https://github.com/shikijs/shiki) | 📋 TODO |
| URL | [Chromium](https://www.chromium.org/chromium-projects/) | 📋 TODO |
| `.mmd` (Mermaid) | [mermaid.js](https://github.com/mermaid-js/mermaid) | 📋 TODO |
| location (lat/lng) | [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | 📋 TODO |


## Quick Start

### CLI Usage

```bash
# With npx
npx screenitshot document.pdf output.png

# With uvx
uvx screenitshot document.pdf output.png

# With docker
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

### Installation

**JavaScript**
```bash
npm install screenitshot
```

**Python**
```bash
pip install screenitshot
```

## Documentation

- [Development Guide](docs/dev.md) - Build from source, local testing, and contribution guide
- [Technical Design](docs/tech-design.md) - Complete technical design and architecture
