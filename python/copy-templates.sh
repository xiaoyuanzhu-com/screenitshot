#!/bin/bash
# Copy templates from render/dist to python package
# Only needed for publishing to PyPI - dev uses render/dist directly

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENDER_DIST="$SCRIPT_DIR/../render/dist"
TEMPLATES_DIR="$SCRIPT_DIR/screenitshot/templates"

mkdir -p "$TEMPLATES_DIR"

# All supported formats (matching JS binding)
for format in pdf epub docx xlsx pptx md html csv rtf ipynb tex code url mmd geojson gpx; do
    if [ -f "$RENDER_DIST/$format.html" ]; then
        cp "$RENDER_DIST/$format.html" "$TEMPLATES_DIR/"
        echo "Copied $format.html"
    else
        echo "Warning: $format.html not found in $RENDER_DIST"
    fi
done

echo "Templates copied to $TEMPLATES_DIR"
