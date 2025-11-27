import { chromium, type Page } from 'playwright';
import { readFile, writeFile, unlink } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
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

  private async prepareTemplate(
    templatePath: string,
    fileBase64: string,
    pageNumber: number = 1
  ): Promise<string> {
    // Read original template
    const template = await readFile(templatePath, 'utf-8');

    // Replace placeholders
    const modified = template
      .replace(
        /let fileBase64 = ['"]FILE_BASE64_PLACEHOLDER['"];/,
        `let fileBase64 = '${fileBase64}';`
      )
      .replace(
        /let pageNumber = PAGE_NUMBER_PLACEHOLDER;/,
        `let pageNumber = ${pageNumber};`
      );

    // Write to temp file
    const tempPath = join(tmpdir(), `screenitshot-${Date.now()}.html`);
    await writeFile(tempPath, modified, 'utf-8');

    return tempPath;
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

    let tempTemplatePath: string | null = null;

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

      // Prepare template with injected data
      const templatePath = this.getTemplatePath(format);
      tempTemplatePath = await this.prepareTemplate(templatePath, fileBase64, pageNumber);

      // Load modified template
      await page.goto(`file://${tempTemplatePath}`);

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

      // Clean up temp file
      if (tempTemplatePath) {
        await unlink(tempTemplatePath).catch(() => {});
      }

      return {
        path: outputPath,
        format: imageFormat,
        width,
        height,
      };
    } catch (error) {
      await browser.close();

      // Clean up temp file on error
      if (tempTemplatePath) {
        await unlink(tempTemplatePath).catch(() => {});
      }

      throw error;
    }
  }
}
