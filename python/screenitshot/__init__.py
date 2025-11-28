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


__version__ = "0.4.1"

ImageFormat = Literal["png", "jpeg", "webp"]
FileFormat = Literal["pdf", "epub", "docx", "xlsx", "pptx", "unknown"]

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


class ScreenitshotError(Exception):
    """Base exception for screenitshot errors"""
    pass


def detect_format(file_path: str) -> FileFormat:
    """Detect file format from extension and magic bytes"""
    ext = Path(file_path).suffix.lower()

    extension_map: dict[str, FileFormat] = {
        ".pdf": "pdf",
        ".epub": "epub",
        ".docx": "docx",
        ".xlsx": "xlsx",
        ".pptx": "pptx",
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
    page: int = 1,
) -> ScreenshotResult:
    """
    Async implementation of screenshot rendering.

    Args:
        input_file: Path to the input file (PDF, EPUB, DOCX, XLSX, PPTX)
        output: Output image path (optional, defaults to input with new extension)
        format: Output image format ('png', 'jpeg', 'webp')
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

    # Get template
    template_path = get_template_path(file_format)

    # Read and encode file as base64
    with open(input_file, "rb") as f:
        file_base64 = base64.b64encode(f.read()).decode("ascii")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        try:
            # Use deviceScaleFactor for high-quality rendering (2x = retina quality)
            device_scale_factor = 2

            # Use small initial viewport - content will determine final size
            context = await browser.new_context(
                viewport={"width": 800, "height": 600},
                device_scale_factor=device_scale_factor,
            )
            page_obj = await context.new_page()

            # Inject data before loading template
            await page_obj.add_init_script(f"""
                globalThis.fileBase64 = {repr(file_base64)};
                globalThis.pageNumber = {page};
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

            # Resize viewport to match actual rendered content
            await page_obj.set_viewport_size({
                "width": metadata["width"],
                "height": metadata["height"],
            })

            # Take screenshot at exact rendered size
            await page_obj.screenshot(
                path=output_path,
                type=format if format != "webp" else "png",  # Playwright doesn't support webp directly
                full_page=False,
            )

            # Actual image size is viewport * deviceScaleFactor
            actual_width = metadata["width"] * device_scale_factor
            actual_height = metadata["height"] * device_scale_factor

            return ScreenshotResult(
                path=output_path,
                format=format,
                width=actual_width,
                height=actual_height,
            )

        finally:
            await browser.close()


def screenshot(
    input_file: str,
    output: Optional[str] = None,
    format: ImageFormat = "png",
    page: int = 1,
) -> ScreenshotResult:
    """
    Convert a file to a screenshot image.

    Args:
        input_file: Path to the input file (PDF, EPUB, DOCX, XLSX, PPTX)
        output: Output image path (optional, defaults to input with new extension)
        format: Output image format ('png', 'jpeg', 'webp')
        page: Page number for multi-page documents

    Returns:
        ScreenshotResult with path and dimensions

    Raises:
        ScreenitshotError: If conversion fails
    """
    return asyncio.run(render_async(input_file, output, format, page))


# Convenience function for async usage
render = render_async

__all__ = ["screenshot", "render", "ScreenshotResult", "ScreenitshotError", "ImageFormat", "FileFormat"]
