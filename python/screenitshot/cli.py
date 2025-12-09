"""Command-line interface for screenitshot"""

import os
import sys
import argparse
from pathlib import Path
from . import screenshot, detect_format, ScreenitshotError, __version__


def get_unique_output_path(base_path: Path) -> Path:
    """Generate a unique output path using macOS-style duplicate naming.

    If base_path exists, returns base_path with ' (1)', ' (2)', etc. suffix.
    Example: document.png -> document (1).png -> document (2).png
    """
    if not base_path.exists():
        return base_path

    stem = base_path.stem
    suffix = base_path.suffix
    parent = base_path.parent

    counter = 1
    while True:
        new_path = parent / f"{stem} ({counter}){suffix}"
        if not new_path.exists():
            return new_path
        counter += 1


def main():
    parser = argparse.ArgumentParser(
        prog="screenitshot",
        description="Convert various file formats to high-quality screenshots",
    )

    parser.add_argument("input", help="Input file path")
    parser.add_argument(
        "-f", "--format",
        choices=["png", "jpeg", "webp"],
        default="png",
        help="Output image format (default: png)",
    )
    parser.add_argument(
        "-w", "--width",
        type=int,
        help="Viewport width",
    )
    parser.add_argument(
        "-H", "--height",
        type=int,
        help="Viewport height",
    )
    parser.add_argument(
        "-p", "--page",
        type=int,
        default=1,
        help="Page number for multi-page documents (default: 1)",
    )
    parser.add_argument(
        "-v", "--version",
        action="version",
        version=f"%(prog)s {__version__}",
    )

    args = parser.parse_args()

    try:
        input_path = Path(args.input)

        # Check input file exists
        if not input_path.exists():
            print(f"Error: Input file not found: {args.input}", file=sys.stderr)
            sys.exit(1)

        # Detect input format from file
        input_format = detect_format(args.input)
        if input_format == "unknown":
            print(f"Error: Unsupported file format: {args.input}", file=sys.stderr)
            sys.exit(1)

        # Determine output path (same folder as input, with unique name)
        base_output = input_path.with_suffix(f".{args.format}")
        output_path = get_unique_output_path(base_output)

        print(f"Converting {args.input}...")

        # Read input file
        with open(input_path, "rb") as f:
            input_data = f.read()

        # Call buffer-based API
        result = screenshot(
            input_data,
            input_format,
            format=args.format,
            width=args.width,
            height=args.height,
            page=args.page,
            file_name=input_path.name,
        )

        # Write output to file
        with open(output_path, "wb") as f:
            f.write(result.data)

        print(f"✓ Screenshot saved to {output_path}")
        print(f"  Renderer: {result.renderer}")
        print(f"  Format: {result.format}")
        print(f"  Size: {result.width}x{result.height}")
    except ScreenitshotError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nAborted", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        if os.environ.get("DEBUG"):
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
