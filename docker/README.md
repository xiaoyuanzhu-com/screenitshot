# Screenitshot Docker Image

Docker container for running screenitshot without installing Node.js locally.

## Usage

### Pull from registry (after publishing)

```bash
docker pull screenitshot/screenitshot:latest
```

### Run

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

## Build locally

### From npm registry (production)

```bash
cd docker
docker build -t screenitshot:latest -f Dockerfile .
```

### From local source (development)

```bash
# Build from repository root
docker build -t screenitshot:local -f docker/Dockerfile.local .
```

## Docker Compose (optional)

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

## Notes

- The container includes Chromium and all necessary dependencies
- Files must be mounted into the container to be accessible
- Output files are written to the mounted volume
