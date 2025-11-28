import { readFile } from 'fs/promises';
import { extname } from 'path';
import type { FileFormat } from './types.js';

export async function detectFormat(filePath: string): Promise<FileFormat> {
  const ext = extname(filePath).toLowerCase();

  // Basic extension-based detection
  const extensionMap: Record<string, FileFormat> = {
    '.pdf': 'pdf',
    '.epub': 'epub',
    '.docx': 'docx',
    '.xlsx': 'xlsx',
    '.pptx': 'pptx',
    '.md': 'md',
    '.markdown': 'md',
    '.html': 'html',
    '.htm': 'html',
    '.csv': 'csv',
    '.tsv': 'csv',
    '.rtf': 'rtf',
    '.ipynb': 'ipynb',
    '.tex': 'tex',
    '.latex': 'tex',
  };

  if (ext in extensionMap) {
    return extensionMap[ext];
  }

  // Fallback: check magic bytes
  try {
    const buffer = await readFile(filePath);
    const magic = buffer.slice(0, 4).toString('hex');

    if (magic === '25504446') return 'pdf';  // %PDF
    if (buffer.slice(0, 2).toString() === 'PK') return 'epub';  // ZIP-based
  } catch {
    // Ignore read errors
  }

  return 'unknown';
}
