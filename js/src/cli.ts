#!/usr/bin/env node

import { Command } from 'commander';
import { screenshot } from './index.js';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  await readFile(resolve(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('screenitshot')
  .description('Convert various file formats to high-quality screenshots')
  .version(packageJson.version)
  .argument('<input>', 'Input file path')
  .argument('[output]', 'Output image path')
  .option('-f, --format <format>', 'Output image format (png, jpeg, webp)', 'png')
  .option('-w, --width <width>', 'Viewport width', '1920')
  .option('-h, --height <height>', 'Viewport height', '1080')
  .option('-p, --page <page>', 'Page number for multi-page documents', '1')
  .action(async (input: string, output: string | undefined, options: any) => {
    try {
      console.log(`Converting ${input}...`);

      const result = await screenshot(input, {
        output,
        format: options.format,
        width: parseInt(options.width),
        height: parseInt(options.height),
        page: parseInt(options.page),
      });

      console.log(`✓ Screenshot saved to ${result.path}`);
      console.log(`  Format: ${result.format}`);
      console.log(`  Size: ${result.width}x${result.height}`);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
