FROM node:20-slim

# Install system dependencies for Chromium
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install screenitshot globally from npm
# NOTE: For local testing, build and install from local js/ package instead
RUN npm install -g screenitshot@latest && \
    npx playwright install --with-deps chromium

WORKDIR /app

# Set up entry point
ENTRYPOINT ["screenitshot"]

# Default command (show help)
CMD ["--help"]
