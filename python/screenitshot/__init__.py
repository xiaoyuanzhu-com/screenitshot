"""
ScreenItShot - Convert various file formats to high-quality screenshots

This is a Python binding that wraps the npm package 'screenitshot'.
Requires Node.js and the npm package to be installed globally.
"""

import subprocess
import shutil
from pathlib import Path
from typing import Optional, Literal

__version__ = "0.1.0"

ImageFormat = Literal["png", "jpeg", "webp"]


class ScreenitshotError(Exception):
    """Base exception for screenitshot errors"""
    pass


def screenshot(
    input_file: str,
    output: Optional[str] = None,
    format: ImageFormat = "png",
    width: int = 1920,
    height: int = 1080,
    page: int = 1,
) -> str:
    """
    Convert a file to a screenshot image.

    Args:
        input_file: Path to the input file (PDF, EPUB, etc.)
        output: Output image path (optional, defaults to input with new extension)
        format: Output image format ('png', 'jpeg', 'webp')
        width: Viewport width in pixels
        height: Viewport height in pixels
        page: Page number for multi-page documents

    Returns:
        Path to the generated screenshot

    Raises:
        ScreenitshotError: If the npm package is not installed or conversion fails
    """
    # Check if npm package is installed
    npm_cli = shutil.which("screenitshot")
    if not npm_cli:
        raise ScreenitshotError(
            "npm package 'screenitshot' not found. "
            "Install it with: npm install -g screenitshot"
        )

    # Build command
    args = [npm_cli, input_file]
    if output:
        args.append(output)

    args.extend([
        "--format", format,
        "--width", str(width),
        "--height", str(height),
        "--page", str(page),
    ])

    try:
        result = subprocess.run(
            args,
            check=True,
            capture_output=True,
            text=True,
        )

        # Extract output path from result
        output_path = output or str(Path(input_file).with_suffix(f".{format}"))
        return output_path

    except subprocess.CalledProcessError as e:
        # Parse error message from stderr
        error_msg = e.stderr.strip()

        # Extract meaningful error from npm CLI output
        if "Error:" in error_msg:
            # Get just the error line
            for line in error_msg.split('\n'):
                if line.startswith('Error:'):
                    error_msg = line
                    break

        raise ScreenitshotError(f"Conversion failed: {error_msg}") from e
    except FileNotFoundError as e:
        raise ScreenitshotError(
            "npm package 'screenitshot' not found in PATH. "
            "Install it with: npm install -g screenitshot"
        ) from e


__all__ = ["screenshot", "ScreenitshotError", "ImageFormat"]
