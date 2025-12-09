import { Renderer } from './renderer.js';
import type { ScreenshotOptions, ScreenshotResult } from './types.js';
import { resolveFormat } from './types.js';

export { type ScreenshotOptions, type ScreenshotResult, type FileFormat, resolveFormat } from './types.js';
export { detectFormat } from './detector.js';

/**
 * Convert input data to a screenshot image.
 *
 * @param input - Input data: Buffer for documents, or URL string for 'url' format
 * @param inputFormat - Input format as slug (e.g., 'pdf') or MIME type (e.g., 'application/pdf')
 * @param options - Optional screenshot options (format, width, height, page, fileName)
 * @returns ScreenshotResult with image data buffer and dimensions
 */
export async function screenshot(
  input: Buffer | string,
  inputFormat: string,
  options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
  const format = resolveFormat(inputFormat);

  const renderer = new Renderer();
  return await renderer.render(input, format, options);
}
