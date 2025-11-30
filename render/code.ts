import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

// Placeholder values - will be injected by Playwright before page loads
const FILE_BASE64_PLACEHOLDER = 'FILE_BASE64_PLACEHOLDER';
const PAGE_NUMBER_PLACEHOLDER = 1;

// Also inject filename for language detection
let fileBase64 = (globalThis as any).fileBase64 || FILE_BASE64_PLACEHOLDER;
let pageNumber = (globalThis as any).pageNumber || PAGE_NUMBER_PLACEHOLDER;
let fileName = (globalThis as any).fileName || '';

interface RenderMetadata {
  width: number;
  height: number;
  pageCount: number;
  pageNumber: number;
  scale: number;
}

declare global {
  interface Window {
    renderComplete: Promise<RenderMetadata>;
  }
}

let highlighter: Highlighter | null = null;

// Map file extensions to Shiki language identifiers
const extensionToLanguage: Record<string, BundledLanguage> = {
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.rb': 'ruby',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.go': 'go',
  '.rs': 'rust',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.scala': 'scala',
  '.php': 'php',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'fish',
  '.ps1': 'powershell',
  '.sql': 'sql',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.r': 'r',
  '.R': 'r',
  '.lua': 'lua',
  '.perl': 'perl',
  '.pl': 'perl',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.ml': 'ocaml',
  '.fs': 'fsharp',
  '.fsx': 'fsharp',
  '.clj': 'clojure',
  '.cljs': 'clojure',
  '.dart': 'dart',
  '.zig': 'zig',
  '.nim': 'nim',
  '.v': 'v',
  '.dockerfile': 'dockerfile',
  '.makefile': 'makefile',
  '.cmake': 'cmake',
  '.toml': 'toml',
  '.ini': 'ini',
  '.conf': 'ini',
  '.env': 'dotenv',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.proto': 'proto',
  '.tf': 'hcl',
  '.hcl': 'hcl',
  '.nginx': 'nginx',
  '.asm': 'asm',
  '.s': 'asm',
  '.wasm': 'wasm',
  '.diff': 'diff',
  '.patch': 'diff',
  '.md': 'markdown',
  '.mdx': 'mdx',
  '.astro': 'astro',
};

// Get language from file extension
function getLanguageFromFilename(filename: string): BundledLanguage {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';

  // Check special filenames first
  const basename = filename.toLowerCase().split('/').pop() || '';
  if (basename === 'dockerfile' || basename.startsWith('dockerfile.')) return 'dockerfile';
  if (basename === 'makefile' || basename === 'gnumakefile') return 'makefile';
  if (basename === 'cmakelists.txt') return 'cmake';
  if (basename === '.gitignore' || basename === '.dockerignore') return 'gitignore';

  return extensionToLanguage[ext] || 'text';
}

// Get all languages we need to load
function getLanguagesToLoad(): BundledLanguage[] {
  const languages = new Set<BundledLanguage>(Object.values(extensionToLanguage));
  languages.add('text');
  languages.add('gitignore');
  return Array.from(languages);
}

// Initialize Shiki highlighter
async function initHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-light'],
      langs: getLanguagesToLoad(),
    });
  }
  return highlighter;
}

// Viewport constants for pseudo-pagination
const VIEWPORT_WIDTH = 1080;
const VIEWPORT_HEIGHT = 1920;

// Show file selector for local testing
function showFileSelector() {
  const container = document.getElementById('container');
  if (!container) return;

  // Create file input overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  overlay.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>Local Testing Mode</h2>
      <p>Select a source code file to render:</p>
      <input type="file" id="file-input" style="margin: 1rem 0;">
    </div>
  `;

  document.body.appendChild(overlay);

  const input = document.getElementById('file-input') as HTMLInputElement;
  input.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    fileName = file.name;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      fileBase64 = base64;
      // Remove overlay
      overlay.remove();
      await renderCode();
    };
    reader.readAsDataURL(file);
  });
}

// Main rendering function
async function renderCode(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('code-container') as HTMLElement;
    if (!container) {
      throw new Error('Code container element not found');
    }

    // Check if placeholder value (local testing mode)
    if (fileBase64 === FILE_BASE64_PLACEHOLDER) {
      showFileSelector();
      // Return dummy metadata for local testing
      return {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        pageCount: 1,
        pageNumber: 1,
        scale: 1.0
      };
    }

    // Set container to fixed width for consistent rendering
    container.style.width = `${VIEWPORT_WIDTH}px`;

    // Initialize highlighter
    const hl = await initHighlighter();

    // Decode base64 to text
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const code = new TextDecoder('utf-8').decode(bytes);

    // Detect language from filename
    const language = getLanguageFromFilename(fileName);

    // Highlight code
    const highlighted = hl.codeToHtml(code, {
      lang: language,
      theme: 'github-light',
    });

    // Add styling
    const style = document.createElement('style');
    style.textContent = `
      #code-container {
        padding: 16px;
        background: #f6f8fa;
      }
      #code-container pre {
        margin: 0;
        padding: 16px;
        background: #ffffff;
        border: 1px solid #e1e4e8;
        border-radius: 6px;
        overflow: auto;
      }
      #code-container code {
        font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
        font-size: 13px;
        line-height: 1.45;
      }
      .shiki {
        background: #ffffff !important;
      }
    `;
    document.head.appendChild(style);

    container.innerHTML = highlighted;

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Measure total content height for pseudo-pagination
    const totalHeight = container.scrollHeight;

    // Calculate page count based on viewport height
    const pageCount = Math.max(1, Math.ceil(totalHeight / VIEWPORT_HEIGHT));

    // Validate requested page
    const targetPage = Math.max(1, Math.min(pageNumber, pageCount));

    // Calculate scroll offset for this page
    const scrollY = (targetPage - 1) * VIEWPORT_HEIGHT;

    // Calculate height for this page (may be less for last page)
    const remainingHeight = totalHeight - scrollY;
    const pageHeight = Math.min(VIEWPORT_HEIGHT, remainingHeight);

    // Scroll to the target page position
    window.scrollTo(0, scrollY);

    console.log(`Source code rendered successfully (page ${targetPage}/${pageCount})`);

    // Return metadata for Playwright to resize viewport
    return {
      width: VIEWPORT_WIDTH,
      height: pageHeight,
      pageCount,
      pageNumber: targetPage,
      scale: 2.0
    };
  } catch (error) {
    console.error('Error rendering source code:', error);
    throw error;
  }
}

// Expose promise for screenshot timing
window.renderComplete = renderCode();
