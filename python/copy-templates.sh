#!/bin/bash
# Copy templates from render/dist to python package
# Only needed for publishing to PyPI - dev uses render/dist directly

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENDER_DIST="$SCRIPT_DIR/../render/dist"
TEMPLATES_DIR="$SCRIPT_DIR/screenitshot/templates"

mkdir -p "$TEMPLATES_DIR"

for format in pdf docx xlsx pptx epub; do
    if [ -f "$RENDER_DIST/$format.html" ]; then
        cp "$RENDER_DIST/$format.html" "$TEMPLATES_DIR/"
        echo "Copied $format.html"
    else
        echo "Warning: $format.html not found in $RENDER_DIST"
    fi
done

echo "Templates copied to $TEMPLATES_DIR"
