export interface ScreenshotOptions {
  format?: 'png' | 'jpeg' | 'webp';
  width?: number;
  height?: number;
  page?: number;
  fileName?: string;
}

export interface ScreenshotResult {
  data: Buffer;
  format: string;
  width: number;
  height: number;
  renderer: string;
}

export interface RenderMetadata {
  width: number;
  height: number;
  pageCount: number;
  pageNumber: number;
  scale: number;
}

export type FileFormat = 'pdf' | 'epub' | 'docx' | 'xlsx' | 'pptx' | 'md' | 'html' | 'csv' | 'rtf' | 'ipynb' | 'tex' | 'code' | 'url' | 'mmd' | 'geojson' | 'gpx' | 'unknown';

// Mapping from MIME types to FileFormat
export const MIME_TO_FORMAT: Record<string, FileFormat> = {
  'application/pdf': 'pdf',
  'application/epub+zip': 'epub',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/markdown': 'md',
  'text/html': 'html',
  'text/csv': 'csv',
  'application/rtf': 'rtf',
  'text/rtf': 'rtf',
  'application/x-ipynb+json': 'ipynb',
  'application/x-tex': 'tex',
  'text/x-tex': 'tex',
  'application/geo+json': 'geojson',
  'application/gpx+xml': 'gpx',
};

// Mapping from slug names to FileFormat
export const SLUG_TO_FORMAT: Record<string, FileFormat> = {
  'pdf': 'pdf',
  'epub': 'epub',
  'docx': 'docx',
  'xlsx': 'xlsx',
  'pptx': 'pptx',
  'md': 'md',
  'markdown': 'md',
  'html': 'html',
  'htm': 'html',
  'csv': 'csv',
  'rtf': 'rtf',
  'ipynb': 'ipynb',
  'jupyter': 'ipynb',
  'tex': 'tex',
  'latex': 'tex',
  'code': 'code',
  'url': 'url',
  'mmd': 'mmd',
  'mermaid': 'mmd',
  'geojson': 'geojson',
  'gpx': 'gpx',
};

/**
 * Resolve a format string (MIME type or slug) to a FileFormat.
 */
export function resolveFormat(formatStr: string): FileFormat {
  // Try slug first (more common)
  const lowerFormat = formatStr.toLowerCase();
  if (lowerFormat in SLUG_TO_FORMAT) {
    return SLUG_TO_FORMAT[lowerFormat];
  }

  // Try MIME type
  if (formatStr in MIME_TO_FORMAT) {
    return MIME_TO_FORMAT[formatStr];
  }

  throw new Error(`Unknown format: ${formatStr}. Use a slug (e.g., 'pdf') or MIME type (e.g., 'application/pdf')`);
}
