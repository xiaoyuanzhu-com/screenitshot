export interface ScreenshotOptions {
  output?: string;
  format?: 'png' | 'jpeg' | 'webp';
  width?: number;
  height?: number;
  page?: number;
}

export interface ScreenshotResult {
  path: string;
  format: string;
  width: number;
  height: number;
}

export type FileFormat = 'pdf' | 'epub' | 'docx' | 'unknown';
