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

  private async injectDataIntoPage(
    page: Page,
    fileBase64: string,
    pageNumber: number = 1
  ): Promise<void> {
    // Inject data into page globals before template loads
    await page.addInitScript(({ fileBase64: fb64, pageNum }: { fileBase64: string; pageNum: number }) => {
      // Override the placeholder values
      (globalThis as any).fileBase64 = fb64;
      (globalThis as any).pageNumber = pageNum;
    }, { fileBase64, pageNum: pageNumber });
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
      page: pageNumber = 1,
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

      // Read and encode file as base64
      const fileData = await readFile(inputPath);
      const fileBase64 = fileData.toString('base64');

      // Inject data before loading template
      await this.injectDataIntoPage(page, fileBase64, pageNumber);

      // Load template
      const templatePath = this.getTemplatePath(format);
      await page.goto(`file://${templatePath}`);

      // Wait for render complete and get metadata
      const metadata = await page.evaluate(async () => {
        const renderComplete = (globalThis as any).renderComplete;

        if (!renderComplete) {
          throw new Error('window.renderComplete not found');
        }

        // Await the promise to get metadata
        return await renderComplete;
      });

      // Resize viewport to match actual rendered content
      await page.setViewportSize({
        width: metadata.width,
        height: metadata.height,
      });

      // Take screenshot at exact rendered size
      await page.screenshot({
        path: outputPath,
        type: imageFormat as 'png' | 'jpeg',
        fullPage: false,
      });

      await browser.close();

      return {
        path: outputPath,
        format: imageFormat,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }
}
