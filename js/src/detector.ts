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
    // Source code extensions
    '.js': 'code',
    '.jsx': 'code',
    '.ts': 'code',
    '.tsx': 'code',
    '.py': 'code',
    '.rb': 'code',
    '.java': 'code',
    '.c': 'code',
    '.cpp': 'code',
    '.cc': 'code',
    '.cxx': 'code',
    '.h': 'code',
    '.hpp': 'code',
    '.cs': 'code',
    '.go': 'code',
    '.rs': 'code',
    '.swift': 'code',
    '.kt': 'code',
    '.kts': 'code',
    '.scala': 'code',
    '.php': 'code',
    '.sh': 'code',
    '.bash': 'code',
    '.zsh': 'code',
    '.fish': 'code',
    '.ps1': 'code',
    '.sql': 'code',
    '.json': 'code',
    '.yaml': 'code',
    '.yml': 'code',
    '.xml': 'code',
    '.css': 'code',
    '.scss': 'code',
    '.sass': 'code',
    '.less': 'code',
    '.vue': 'code',
    '.svelte': 'code',
    '.r': 'code',
    '.lua': 'code',
    '.perl': 'code',
    '.pl': 'code',
    '.ex': 'code',
    '.exs': 'code',
    '.erl': 'code',
    '.hs': 'code',
    '.ml': 'code',
    '.fs': 'code',
    '.fsx': 'code',
    '.clj': 'code',
    '.cljs': 'code',
    '.dart': 'code',
    '.zig': 'code',
    '.nim': 'code',
    '.v': 'code',
    '.toml': 'code',
    '.ini': 'code',
    '.conf': 'code',
    '.graphql': 'code',
    '.gql': 'code',
    '.proto': 'code',
    '.tf': 'code',
    '.hcl': 'code',
    '.asm': 'code',
    '.s': 'code',
    '.diff': 'code',
    '.patch': 'code',
    '.mdx': 'code',
    '.astro': 'code',
    // URL file extension
    '.url': 'url',
    // Mermaid diagram extension
    '.mmd': 'mmd',
    '.mermaid': 'mmd',
    // Location file extension
    '.location': 'location',
    '.loc': 'location',
    '.geo': 'location',
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
