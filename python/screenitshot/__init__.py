"""
ScreenItShot - Convert various file formats to high-quality screenshots

Self-contained Python package using Playwright for browser-based rendering.
"""

import base64
import asyncio
from pathlib import Path
from typing import Optional, Literal
from dataclasses import dataclass

from playwright.async_api import async_playwright


__version__ = "0.5.0"

ImageFormat = Literal["png", "jpeg", "webp"]
FileFormat = Literal[
    "pdf", "epub", "docx", "xlsx", "pptx", "md", "html", "csv", "rtf",
    "ipynb", "tex", "code", "url", "mmd", "geojson", "gpx", "unknown"
]

# Template directory - use render/dist in dev, bundled templates in installed package
_DEV_TEMPLATES_DIR = Path(__file__).parent.parent.parent / "render" / "dist"
_INSTALLED_TEMPLATES_DIR = Path(__file__).parent / "templates"

# Prefer dev path if it exists (for local development)
TEMPLATES_DIR = _DEV_TEMPLATES_DIR if _DEV_TEMPLATES_DIR.exists() else _INSTALLED_TEMPLATES_DIR


@dataclass
class ScreenshotResult:
    """Result of a screenshot operation"""
    path: str
    format: str
    width: int
    height: int
    renderer: str


class ScreenitshotError(Exception):
    """Base exception for screenitshot errors"""
    pass


def detect_format(file_path: str) -> FileFormat:
    """Detect file format from extension and magic bytes"""
    ext = Path(file_path).suffix.lower()

    extension_map: dict[str, FileFormat] = {
        # Document formats
        ".pdf": "pdf",
        ".epub": "epub",
        ".docx": "docx",
        ".xlsx": "xlsx",
        ".pptx": "pptx",
        # Text formats
        ".md": "md",
        ".markdown": "md",
        ".html": "html",
        ".htm": "html",
        ".csv": "csv",
        ".tsv": "csv",
        ".rtf": "rtf",
        ".ipynb": "ipynb",
        ".tex": "tex",
        ".latex": "tex",
        # Source code extensions
        ".js": "code",
        ".jsx": "code",
        ".ts": "code",
        ".tsx": "code",
        ".py": "code",
        ".rb": "code",
        ".java": "code",
        ".c": "code",
        ".cpp": "code",
        ".cc": "code",
        ".cxx": "code",
        ".h": "code",
        ".hpp": "code",
        ".cs": "code",
        ".go": "code",
        ".rs": "code",
        ".swift": "code",
        ".kt": "code",
        ".kts": "code",
        ".scala": "code",
        ".php": "code",
        ".sh": "code",
        ".bash": "code",
        ".zsh": "code",
        ".fish": "code",
        ".ps1": "code",
        ".sql": "code",
        ".json": "code",
        ".yaml": "code",
        ".yml": "code",
        ".xml": "code",
        ".css": "code",
        ".scss": "code",
        ".sass": "code",
        ".less": "code",
        ".vue": "code",
        ".svelte": "code",
        ".r": "code",
        ".lua": "code",
        ".perl": "code",
        ".pl": "code",
        ".ex": "code",
        ".exs": "code",
        ".erl": "code",
        ".hs": "code",
        ".ml": "code",
        ".fs": "code",
        ".fsx": "code",
        ".clj": "code",
        ".cljs": "code",
        ".dart": "code",
        ".zig": "code",
        ".nim": "code",
        ".v": "code",
        ".toml": "code",
        ".ini": "code",
        ".conf": "code",
        ".graphql": "code",
        ".gql": "code",
        ".proto": "code",
        ".tf": "code",
        ".hcl": "code",
        ".asm": "code",
        ".s": "code",
        ".diff": "code",
        ".patch": "code",
        ".mdx": "code",
        ".astro": "code",
        # URL file extension
        ".url": "url",
        # Mermaid diagram extension
        ".mmd": "mmd",
        ".mermaid": "mmd",
        # GeoJSON extension
        ".geojson": "geojson",
        # GPX extension
        ".gpx": "gpx",
    }

    if ext in extension_map:
        return extension_map[ext]

    # Fallback: check magic bytes
    try:
        with open(file_path, "rb") as f:
            magic = f.read(4)
            if magic[:4] == b"%PDF":
                return "pdf"
            if magic[:2] == b"PK":  # ZIP-based (could be epub, docx, xlsx, pptx)
                return "epub"  # Default to epub for ZIP
    except Exception:
        pass

    return "unknown"


def get_template_path(format: FileFormat) -> Path:
    """Get the template path for a file format"""
    if format == "unknown":
        raise ScreenitshotError(f"No template available for format: {format}")

    template_path = TEMPLATES_DIR / f"{format}.html"
    if not template_path.exists():
        raise ScreenitshotError(
            f"Template not found: {template_path}. "
            "Ensure templates are installed with the package."
        )
    return template_path


async def render_async(
    input_file: str,
    output: Optional[str] = None,
    format: ImageFormat = "png",
    width: Optional[int] = None,
    height: Optional[int] = None,
    page: int = 1,
) -> ScreenshotResult:
    """
    Async implementation of screenshot rendering.

    Args:
        input_file: Path to the input file
        output: Output image path (optional, defaults to input with new extension)
        format: Output image format ('png', 'jpeg', 'webp')
        width: Viewport width (optional, defaults to 800 or 1280 for URLs)
        height: Viewport height (optional, defaults to 600 or 800 for URLs)
        page: Page number for multi-page documents

    Returns:
        ScreenshotResult with path and dimensions

    Raises:
        ScreenitshotError: If conversion fails
    """
    input_path = Path(input_file)
    if not input_path.exists():
        raise ScreenitshotError(f"Input file not found: {input_file}")

    # Detect format
    file_format = detect_format(input_file)
    if file_format == "unknown":
        raise ScreenitshotError(f"Unsupported file format: {input_file}")

    # Determine output path
    output_path = output or str(input_path.with_suffix(f".{format}"))

    # Use small initial viewport - content will determine final size
    initial_width = width or 800
    initial_height = height or 600

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        try:
            # Use deviceScaleFactor for high-quality rendering (2x = retina quality)
            device_scale_factor = 2

            context = await browser.new_context(
                viewport={"width": initial_width, "height": initial_height},
                device_scale_factor=device_scale_factor,
            )
            page_obj = await context.new_page()

            # Special handling for URL format - navigate directly to the URL
            if file_format == "url":
                # Read URL from file (file contains just the URL string)
                with open(input_file, "r") as f:
                    url = f.read().strip()

                # Set a reasonable viewport for webpage screenshots
                web_width = width or 1280
                web_height = height or 800
                await page_obj.set_viewport_size({"width": web_width, "height": web_height})

                # Navigate to URL and wait for network idle
                await page_obj.goto(url, wait_until="networkidle")

                # Take screenshot
                await page_obj.screenshot(
                    path=output_path,
                    type=format if format != "webp" else "png",
                    full_page=False,
                )

                await browser.close()

                return ScreenshotResult(
                    path=output_path,
                    format=format,
                    width=web_width * device_scale_factor,
                    height=web_height * device_scale_factor,
                    renderer=file_format,
                )

            # Get template
            template_path = get_template_path(file_format)

            # Read and encode file as base64
            with open(input_file, "rb") as f:
                file_base64 = base64.b64encode(f.read()).decode("ascii")

            # Get filename for code format language detection
            file_name = input_path.name

            # Inject data before loading template
            await page_obj.add_init_script(f"""
                globalThis.fileBase64 = {repr(file_base64)};
                globalThis.pageNumber = {page};
                globalThis.fileName = {repr(file_name)};
            """)

            # Load template
            await page_obj.goto(f"file://{template_path}")

            # Wait for render complete and get metadata
            metadata = await page_obj.evaluate("""
                async () => {
                    const renderComplete = globalThis.renderComplete;
                    if (!renderComplete) {
                        throw new Error('window.renderComplete not found');
                    }
                    return await renderComplete;
                }
            """)

            # Check if we need to clip (for EPUB content cropping)
            clip_x = metadata.get("clipX")
            clip_y = metadata.get("clipY")

            if clip_x is not None and clip_y is not None:
                # Resize viewport to ensure clip area is fully visible
                required_width = clip_x + metadata["width"]
                required_height = clip_y + metadata["height"]
                await page_obj.set_viewport_size({
                    "width": max(required_width, initial_width),
                    "height": max(required_height, initial_height),
                })

                # Wait for layout to stabilize
                await page_obj.wait_for_timeout(100)

                # Use clip to capture just the content area
                await page_obj.screenshot(
                    path=output_path,
                    type=format if format != "webp" else "png",
                    clip={
                        "x": clip_x,
                        "y": clip_y,
                        "width": metadata["width"],
                        "height": metadata["height"],
                    },
                )
            else:
                # Resize viewport to match actual rendered content
                await page_obj.set_viewport_size({
                    "width": metadata["width"],
                    "height": metadata["height"],
                })

                # Wait for layout to stabilize after viewport resize
                await page_obj.wait_for_timeout(100)

                # Take screenshot at exact rendered size
                await page_obj.screenshot(
                    path=output_path,
                    type=format if format != "webp" else "png",
                    full_page=False,
                )

            await browser.close()

            # Actual image size is viewport * deviceScaleFactor
            actual_width = metadata["width"] * device_scale_factor
            actual_height = metadata["height"] * device_scale_factor

            return ScreenshotResult(
                path=output_path,
                format=format,
                width=actual_width,
                height=actual_height,
                renderer=file_format,
            )

        except Exception:
            await browser.close()
            raise


def screenshot(
    input_file: str,
    output: Optional[str] = None,
    format: ImageFormat = "png",
    width: Optional[int] = None,
    height: Optional[int] = None,
    page: int = 1,
) -> ScreenshotResult:
    """
    Convert a file to a screenshot image.

    Args:
        input_file: Path to the input file
        output: Output image path (optional, defaults to input with new extension)
        format: Output image format ('png', 'jpeg', 'webp')
        width: Viewport width (optional, defaults to 800 or 1280 for URLs)
        height: Viewport height (optional, defaults to 600 or 800 for URLs)
        page: Page number for multi-page documents

    Returns:
        ScreenshotResult with path and dimensions

    Raises:
        ScreenitshotError: If conversion fails
    """
    return asyncio.run(render_async(input_file, output, format, width, height, page))


# Convenience function for async usage
render = render_async

__all__ = ["screenshot", "render", "ScreenshotResult", "ScreenitshotError", "ImageFormat", "FileFormat"]
