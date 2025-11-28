# Development Guide

This guide covers building screenitshot from source, local testing, and contributing to the project.

## Prerequisites

- Node.js 18+
- npm or yarn
- Python 3.8+ (for Python binding development)
- Docker (for Docker image development)

## Build from Source

### 1. Build render templates

```bash
cd render
npm install
npm run build
```

### 2. Build js package

```bash
cd ../js
npm install
npm run build
```

### 3. Install Python package (development mode)

```bash
cd ../python
pip install -e .
```

## Local Testing

### Test npm package

```bash
cd js
npm link
screenitshot ../test.pdf test.png
```

### Test Python package

```bash
cd python
pip install -e .
screenitshot ../test.pdf test.png
```

### Test Docker

#### From npm registry (production)

```bash
cd docker
docker build -t screenitshot:latest -f Dockerfile .
```

#### From local source (development)

```bash
# Build from repository root
docker build -t screenitshot:local -f docker/Dockerfile.local .

# Run test
docker run -v $(pwd):/app screenitshot:local /app/test.pdf /app/output.png
```

## Docker Usage

### Run with volume mount

```bash
# Mount current directory and convert a PDF
docker run -v $(pwd):/app screenitshot/screenitshot /app/document.pdf /app/output.png

# With options
docker run -v $(pwd):/app screenitshot/screenitshot \
  /app/document.pdf /app/output.png \
  --format jpeg \
  --width 1920 \
  --height 1080
```

### Docker Compose (optional)

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  screenitshot:
    image: screenitshot/screenitshot:latest
    volumes:
      - ./input:/input
      - ./output:/output
    command: /input/document.pdf /output/screenshot.png
```

Run:
```bash
docker-compose run screenitshot
```

## Docker Notes

- The container includes Chromium and all necessary dependencies
- Files must be mounted into the container to be accessible
- Output files are written to the mounted volume

## Python Binding Notes

The Python package is a thin wrapper around the npm package and requires:
- Node.js installed on the system
- The screenitshot npm package installed globally

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Build and test locally
5. Submit a pull request

## Project Structure

- **render/** - Vite project with format templates (PDF.js, etc.)
- **js/** - Node.js package (primary implementation)
- **python/** - Python binding (thin wrapper)
- **docker/** - Docker image configuration
- **docs/** - Technical design and documentation

## Linting

```bash
# Lint TypeScript files
npm run lint

# Auto-fix linting issues
npm run lint:fix
```
