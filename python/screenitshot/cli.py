"""Command-line interface for screenitshot"""

import sys
import argparse
from . import screenshot, ScreenitshotError, __version__


def main():
    parser = argparse.ArgumentParser(
        prog="screenitshot",
        description="Convert various file formats to high-quality screenshots",
    )

    parser.add_argument("input", help="Input file path")
    parser.add_argument("output", nargs="?", help="Output image path")
    parser.add_argument(
        "-f", "--format",
        choices=["png", "jpeg", "webp"],
        default="png",
        help="Output image format (default: png)",
    )
    parser.add_argument(
        "-w", "--width",
        type=int,
        default=1920,
        help="Viewport width (default: 1920)",
    )
    parser.add_argument(
        "-H", "--height",
        type=int,
        default=1080,
        help="Viewport height (default: 1080)",
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
        print(f"Converting {args.input}...")
        result = screenshot(
            args.input,
            output=args.output,
            format=args.format,
            width=args.width,
            height=args.height,
            page=args.page,
        )
        print(f"✓ Screenshot saved to {result}")
    except ScreenitshotError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nAborted", file=sys.stderr)
        sys.exit(130)


if __name__ == "__main__":
    main()
