# ScreenItShot

[![PyPI version](https://img.shields.io/pypi/v/screenitshot)](https://pypi.org/project/screenitshot/)
[![npm version](https://img.shields.io/npm/v/screenitshot)](https://www.npmjs.com/package/screenitshot)

Convert many document formats into screenshot previews.  
Inspired by [MarkItDown](https://github.com/microsoft/markitdown).

## Features

- PDF, Word, Excel and many more
- Browser based render and screenshot
- Retina quality
- Auto landscape/portrait detection
- Support JavaScript, Python and Docker

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
| `.tex` | [LaTeX.js](https://github.com/michael-brade/LaTeX.js) | ✅ |
| source code | [Shiki](https://github.com/shikijs/shiki) | ✅ |
| URL | [Chromium](https://www.chromium.org/chromium-projects/) | ✅ |
| `.mmd` (Mermaid) | [mermaid.js](https://github.com/mermaid-js/mermaid) | ✅ |
| `.geojson` | [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | ✅ |
| `.gpx` | [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) + [@tmcw/togeojson](https://github.com/placemark/togeojson) | ✅ |


## Quick Start

### Python CLI

```bash
# One-time setup (browsers are cached globally, only needed once)
pip install screenitshot
playwright install chromium

# Run
screenitshot document.pdf
# outputs document.png in the same folder
```

Or with `uvx` (no install needed, but still requires the one-time browser setup):
```bash
pip install playwright && playwright install chromium  # one-time
uvx screenitshot document.pdf
```

**Options:**

| Option | Description |
|--------|-------------|
| `-o`, `--output` | Output file path (default: same folder as input) |
| `-f`, `--format` | Output image format: `png`, `jpeg`, `webp` (default: `png`) |
| `-w`, `--width` | Viewport width |
| `-H`, `--height` | Viewport height |
| `-p`, `--page` | Page number for multi-page documents (default: `1`) |
| `-v`, `--version` | Show version |

### Node.js CLI

Chromium is downloaded automatically on install:

```bash
npm install -g screenitshot
screenitshot document.pdf
```

### Python Package

```bash
pip install screenitshot
playwright install chromium
```

```python
from screenitshot import screenshot

with open('document.pdf', 'rb') as f:
    result = screenshot(f.read(), 'pdf')

with open('output.png', 'wb') as f:
    f.write(result.data)
```

### Node.js Package

```bash
npm install screenitshot
```

```js
import { screenshot } from 'screenitshot';
```

---

## Documentation

- [Development Guide](docs/dev.md) - Build from source, local testing, and contribution guide
- [Technical Design](docs/tech-design.md) - Complete technical design and architecture
