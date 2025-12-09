#!/usr/bin/env node

import { Command } from 'commander';
import { screenshot, detectFormat } from './index.js';
import { readFile, writeFile, access } from 'fs/promises';
import { resolve, dirname, basename, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  await readFile(resolve(__dirname, '../package.json'), 'utf-8')
);

/**
 * Generate a unique output path using macOS-style duplicate naming.
 * If basePath exists, returns basePath with ' (1)', ' (2)', etc. suffix.
 * Example: document.png -> document (1).png -> document (2).png
 */
async function getUniqueOutputPath(basePath: string): Promise<string> {
  try {
    await access(basePath);
  } catch {
    // File doesn't exist, use the base path
    return basePath;
  }

  const dir = dirname(basePath);
  const ext = extname(basePath);
  const stem = basename(basePath, ext);

  let counter = 1;
  while (true) {
    const newPath = join(dir, `${stem} (${counter})${ext}`);
    try {
      await access(newPath);
      counter++;
    } catch {
      return newPath;
    }
  }
}

const program = new Command();

program
  .name('screenitshot')
  .description('Convert various file formats to high-quality screenshots')
  .version(packageJson.version)
  .argument('<input>', 'Input file path')
  .option('-f, --format <format>', 'Output image format (png, jpeg, webp)', 'png')
  .option('-w, --width <width>', 'Viewport width')
  .option('-H, --height <height>', 'Viewport height')
  .option('-p, --page <page>', 'Page number for multi-page documents', '1')
  .action(async (input: string, options: any) => {
    try {
      // Check input file exists and detect format
      let inputData: Buffer;
      try {
        inputData = await readFile(input);
      } catch {
        console.error(`Error: Input file not found: ${input}`);
        process.exit(1);
      }

      const inputFormat = await detectFormat(input);
      if (inputFormat === 'unknown') {
        console.error(`Error: Unsupported file format: ${input}`);
        process.exit(1);
      }

      // Determine output path (same folder as input, with unique name)
      const dir = dirname(input);
      const stem = basename(input, extname(input));
      const baseOutput = join(dir, `${stem}.${options.format}`);
      const outputPath = await getUniqueOutputPath(baseOutput);

      console.log(`Converting ${input}...`);

      const result = await screenshot(inputData, inputFormat, {
        format: options.format,
        width: options.width ? parseInt(options.width) : undefined,
        height: options.height ? parseInt(options.height) : undefined,
        page: parseInt(options.page),
        fileName: basename(input),
      });

      // Write output to file
      await writeFile(outputPath, result.data);

      console.log(`✓ Screenshot saved to ${outputPath}`);
      console.log(`  Renderer: ${result.renderer}`);
      console.log(`  Format: ${result.format}`);
      console.log(`  Size: ${result.width}x${result.height}`);
    } catch (error) {
      const err = error as Error;

      // User-friendly error messages
      if (err.message.includes('Unknown format')) {
        console.error(`Error: ${err.message}`);
      } else if (err.message.includes('No template available')) {
        console.error(`Error: Format not yet supported`);
      } else if (err.message.includes('page')) {
        console.error(`Error: Invalid page number or page not found`);
        // Show stack trace in debug mode
        if (process.env.DEBUG) {
          console.error('Full error:', err.message);
          console.error(err.stack);
        }
      } else {
        console.error(`Error: ${err.message}`);

        // Show stack trace in debug mode
        if (process.env.DEBUG) {
          console.error(err.stack);
        }
      }

      process.exit(1);
    }
  });

program.parse();
