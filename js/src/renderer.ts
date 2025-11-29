import { chromium, type Page } from 'playwright';
import { readFile } from 'fs/promises';
import { resolve, dirname, basename } from 'path';
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
      xlsx: resolve(__dirname, '../templates/xlsx.html'),
      pptx: resolve(__dirname, '../templates/pptx.html'),
      md: resolve(__dirname, '../templates/md.html'),
      html: resolve(__dirname, '../templates/html.html'),
      csv: resolve(__dirname, '../templates/csv.html'),
      rtf: resolve(__dirname, '../templates/rtf.html'),
      ipynb: resolve(__dirname, '../templates/ipynb.html'),
      tex: resolve(__dirname, '../templates/tex.html'),
      code: resolve(__dirname, '../templates/code.html'),
      url: resolve(__dirname, '../templates/url.html'),
      mmd: resolve(__dirname, '../templates/mmd.html'),
      geojson: resolve(__dirname, '../templates/geojson.html'),
      gpx: resolve(__dirname, '../templates/gpx.html'),
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
    pageNumber: number = 1,
    fileName: string = ''
  ): Promise<void> {
    // Inject data into page globals before template loads
    await page.addInitScript(({ fileBase64: fb64, pageNum, fName }: { fileBase64: string; pageNum: number; fName: string }) => {
      // Override the placeholder values
      (globalThis as any).fileBase64 = fb64;
      (globalThis as any).pageNumber = pageNum;
      (globalThis as any).fileName = fName;
    }, { fileBase64, pageNum: pageNumber, fName: fileName });
  }

  async render(
    inputPath: string,
    format: FileFormat,
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    const {
      output,
      format: imageFormat = 'png',
      width,
      height,
      page: pageNumber = 1,
    } = options;

    // Use small initial viewport - content will determine final size
    // For formats like XLSX, large viewport causes table to expand to fill it
    const initialWidth = width || 800;
    const initialHeight = height || 600;

    const outputPath = output || inputPath.replace(/\.[^.]+$/, `.${imageFormat}`);

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
    });

    try {
      // Use deviceScaleFactor for high-quality rendering (2x = retina quality)
      const deviceScaleFactor = 2;

      const page = await browser.newPage({
        viewport: { width: initialWidth, height: initialHeight },
        deviceScaleFactor,
      });

      // Special handling for URL format - navigate directly to the URL
      if (format === 'url') {
        // Read URL from file (file contains just the URL string)
        const fileData = await readFile(inputPath);
        const url = fileData.toString('utf-8').trim();

        // Set a reasonable viewport for webpage screenshots
        const webWidth = width || 1280;
        const webHeight = height || 800;
        await page.setViewportSize({ width: webWidth, height: webHeight });

        // Navigate to URL and wait for network idle
        await page.goto(url, { waitUntil: 'networkidle' });

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
          width: webWidth * deviceScaleFactor,
          height: webHeight * deviceScaleFactor,
        };
      }

      // Read and encode file as base64
      const fileData = await readFile(inputPath);
      const fileBase64 = fileData.toString('base64');

      // Inject data before loading template (include filename for code format)
      const fileName = basename(inputPath);
      await this.injectDataIntoPage(page, fileBase64, pageNumber, fileName);

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

      // Check if we need to clip (for EPUB content cropping)
      const clipX = (metadata as any).clipX;
      const clipY = (metadata as any).clipY;

      if (clipX !== undefined && clipY !== undefined) {
        // Resize viewport to ensure clip area is fully visible
        const requiredWidth = clipX + metadata.width;
        const requiredHeight = clipY + metadata.height;
        await page.setViewportSize({
          width: Math.max(requiredWidth, initialWidth),
          height: Math.max(requiredHeight, initialHeight),
        });

        // Wait for layout to stabilize
        await page.waitForTimeout(100);

        // Use clip to capture just the content area
        await page.screenshot({
          path: outputPath,
          type: imageFormat as 'png' | 'jpeg',
          clip: {
            x: clipX,
            y: clipY,
            width: metadata.width,
            height: metadata.height
          }
        });
      } else {
        // Resize viewport to match actual rendered content
        await page.setViewportSize({
          width: metadata.width,
          height: metadata.height,
        });

        // Wait for layout to stabilize after viewport resize
        await page.waitForTimeout(100);

        // Take screenshot at exact rendered size
        await page.screenshot({
          path: outputPath,
          type: imageFormat as 'png' | 'jpeg',
          fullPage: false,
        });
      }

      await browser.close();

      // Actual image size is viewport * deviceScaleFactor
      const actualWidth = metadata.width * deviceScaleFactor;
      const actualHeight = metadata.height * deviceScaleFactor;

      return {
        path: outputPath,
        format: imageFormat,
        width: actualWidth,
        height: actualHeight,
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }
}
