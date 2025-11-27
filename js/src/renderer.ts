import { chromium, type Page } from 'playwright';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { FileFormat, ScreenshotOptions, ScreenshotResult } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Renderer {
  private getTemplatePath(format: FileFormat): string {
    const templateMap: Record<FileFormat, string> = {
      pdf: resolve(__dirname, '../templates/pdf.html'),
      epub: resolve(__dirname, '../templates/epub.html'),
      docx: resolve(__dirname, '../templates/docx.html'),
      unknown: '',
    };

    const path = templateMap[format];
    if (!path) {
      throw new Error(`No template available for format: ${format}`);
    }
    return path;
  }

  async render(
    inputPath: string,
    format: FileFormat,
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    const {
      output,
      format: imageFormat = 'png',
      width = 1920,
      height = 1080,
    } = options;

    const outputPath = output || inputPath.replace(/\.[^.]+$/, `.${imageFormat}`);

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage({
        viewport: { width, height },
      });

      // Load template
      const templatePath = this.getTemplatePath(format);
      await page.goto(`file://${templatePath}`);

      // Inject file data
      const fileData = await readFile(inputPath);
      await page.evaluate((data) => {
        (globalThis as any).fileData = data;
      }, Array.from(fileData));

      // Wait for render complete
      await page.evaluate(() => {
        return (globalThis as any).renderComplete;
      });

      // Take screenshot
      await page.screenshot({
        path: outputPath,
        type: imageFormat as 'png' | 'jpeg',
        fullPage: false,
      });

      await browser.close();

      return {
        path: outputPath,
        format: imageFormat,
        width,
        height,
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }
}
