# screenitshot (Python Binding)

Convert various file formats to high-quality screenshots.

This is a Python binding for the [screenitshot](https://www.npmjs.com/package/screenitshot) npm package.

## Prerequisites

**Required**: Node.js and the npm package must be installed:

```bash
npm install -g screenitshot
```

## Installation

```bash
pip install screenitshot
```

## Usage

### CLI

```bash
# Basic usage
screenitshot document.pdf

# Specify output
screenitshot document.pdf output.png

# Custom options
screenitshot document.pdf --format jpeg --width 1920 --height 1080
```

### Programmatic API

```python
from screenitshot import screenshot

# Basic usage
screenshot('document.pdf')

# With options
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

- PDF
- EPUB (coming soon)
- DOCX (coming soon)

## License

MIT
