import { detectFormat } from './detector.js';
import { Renderer } from './renderer.js';
import type { ScreenshotOptions, ScreenshotResult } from './types.js';

export { type ScreenshotOptions, type ScreenshotResult, type FileFormat } from './types.js';

export async function screenshot(
  inputPath: string,
  options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
  const format = await detectFormat(inputPath);

  if (format === 'unknown') {
    throw new Error(`Unsupported file format: ${inputPath}`);
  }

  const renderer = new Renderer();
  return await renderer.render(inputPath, format, options);
}
