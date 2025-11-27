# Screenitshot

Convert various file formats to high-quality screenshots using browser-based rendering.

## Features

- =ø Universal screenshot tool for PDFs, EPUBs, DOCX, and more
- <¯ High-quality rendering using Chromium
- =' Available as npm package, Python binding, and Docker image
- =æ Reproducible builds with pinned dependencies
- =€ Simple CLI and programmatic APIs

## Quick Start

### npm (Recommended)

```bash
# Install globally
npm install -g screenitshot

# Use CLI
screenitshot document.pdf output.png
```

### Python

```bash
# Install (requires Node.js + npm package)
pip install screenitshot

# Use CLI
screenitshot document.pdf output.png
```

### Docker

```bash
# Run without installing anything
docker run -v $(pwd):/app screenitshot/screenitshot /app/document.pdf /app/output.png
```

## Supported Formats

-  PDF (via PDF.js)
- =§ EPUB (coming soon)
- =§ DOCX (coming soon)
- =§ Markdown (coming soon)

## Project Structure

This is a monorepo with the following packages:

- **render/** - Vite project with format templates (PDF.js, etc.)
- **js/** - Node.js package (primary implementation)
- **python/** - Python binding (thin wrapper)
- **docker/** - Docker image configuration
- **docs/** - Technical design and documentation

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Build from source

```bash
# 1. Build render templates
cd render
npm install
npm run build

# 2. Build js package
cd ../js
npm install
npm run build

# 3. Install Python package (development mode)
cd ../python
pip install -e .
```

### Local testing

```bash
# Test npm package
cd js
npm link
screenitshot ../test.pdf test.png

# Test Python package
cd python
pip install -e .
screenitshot ../test.pdf test.png

# Test Docker
docker build -t screenitshot:local -f docker/Dockerfile.local .
docker run -v $(pwd):/app screenitshot:local /app/test.pdf /app/output.png
```

## Documentation

See [docs/tech-design.md](docs/tech-design.md) for the complete technical design.

## License

MIT
