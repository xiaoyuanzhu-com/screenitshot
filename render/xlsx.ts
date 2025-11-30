import ExcelJS from 'exceljs';

// Placeholder values - will be injected by Playwright before page loads
const FILE_BASE64_PLACEHOLDER = 'FILE_BASE64_PLACEHOLDER';
const PAGE_NUMBER_PLACEHOLDER = 1;

// Check if values were injected via Playwright, otherwise use placeholders
let fileBase64 = (globalThis as any).fileBase64 || FILE_BASE64_PLACEHOLDER;
let pageNumber = (globalThis as any).pageNumber || PAGE_NUMBER_PLACEHOLDER;

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

// Convert column number to Excel letter (1 -> A, 27 -> AA)
function columnToLetter(col: number): string {
  let letter = '';
  while (col > 0) {
    const remainder = (col - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

// Convert ExcelJS color to CSS color
function colorToCSS(color: Partial<ExcelJS.Color> | undefined): string | undefined {
  if (!color) return undefined;

  if (color.argb) {
    // ARGB format: first 2 chars are alpha, rest is RGB
    const argb = color.argb;
    if (argb.length === 8) {
      const r = parseInt(argb.substring(2, 4), 16);
      const g = parseInt(argb.substring(4, 6), 16);
      const b = parseInt(argb.substring(6, 8), 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  if (color.theme !== undefined) {
    // Theme colors - use reasonable defaults
    const themeColors: Record<number, string> = {
      0: '#000000', // Dark 1 (usually black)
      1: '#FFFFFF', // Light 1 (usually white)
      2: '#44546A', // Dark 2
      3: '#E7E6E6', // Light 2
      4: '#4472C4', // Accent 1
      5: '#ED7D31', // Accent 2
      6: '#A5A5A5', // Accent 3
      7: '#FFC000', // Accent 4
      8: '#5B9BD5', // Accent 5
      9: '#70AD47', // Accent 6
    };
    return themeColors[color.theme] || undefined;
  }

  return undefined;
}

// Get cell display value (prefer cached result for formulas)
function getCellDisplayValue(cell: ExcelJS.Cell): string {
  const value = cell.value;

  if (value === null || value === undefined) {
    return '';
  }

  // Formula cell - use cached result
  if (typeof value === 'object' && 'formula' in value) {
    const formulaValue = value as ExcelJS.CellFormulaValue;
    if (formulaValue.result !== undefined) {
      // Handle result types
      if (typeof formulaValue.result === 'object' && formulaValue.result !== null) {
        // Could be a date or error
        if ('error' in formulaValue.result) {
          return String((formulaValue.result as ExcelJS.CellErrorValue).error);
        }
      }
      return String(formulaValue.result);
    }
    // No cached result, show formula
    return `=${formulaValue.formula}`;
  }

  // Rich text
  if (typeof value === 'object' && 'richText' in value) {
    return (value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('');
  }

  // Hyperlink
  if (typeof value === 'object' && 'hyperlink' in value) {
    return (value as ExcelJS.CellHyperlinkValue).text || '';
  }

  // Date
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  // Error
  if (typeof value === 'object' && 'error' in value) {
    return String((value as ExcelJS.CellErrorValue).error);
  }

  return String(value);
}

// Build CSS styles for a cell
function getCellStyles(cell: ExcelJS.Cell): string {
  const styles: string[] = [];

  // Font styles
  if (cell.font) {
    if (cell.font.bold) styles.push('font-weight: bold');
    if (cell.font.italic) styles.push('font-style: italic');
    if (cell.font.underline) styles.push('text-decoration: underline');
    if (cell.font.strike) styles.push('text-decoration: line-through');
    if (cell.font.size) styles.push(`font-size: ${cell.font.size}pt`);
    if (cell.font.name) styles.push(`font-family: "${cell.font.name}", sans-serif`);

    const fontColor = colorToCSS(cell.font.color);
    if (fontColor) styles.push(`color: ${fontColor}`);
  }

  // Background fill
  if (cell.fill && cell.fill.type === 'pattern') {
    const patternFill = cell.fill as ExcelJS.FillPattern;
    if (patternFill.fgColor) {
      const bgColor = colorToCSS(patternFill.fgColor);
      if (bgColor) styles.push(`background-color: ${bgColor}`);
    }
  }

  // Alignment
  if (cell.alignment) {
    if (cell.alignment.horizontal) {
      styles.push(`text-align: ${cell.alignment.horizontal}`);
    }
    if (cell.alignment.vertical) {
      const vAlign = cell.alignment.vertical === 'middle' ? 'middle' : cell.alignment.vertical;
      styles.push(`vertical-align: ${vAlign}`);
    }
    if (cell.alignment.wrapText) {
      styles.push('white-space: normal');
      styles.push('word-wrap: break-word');
    }
  }

  // Border styles (individual sides)
  const borderStyle = (border: Partial<ExcelJS.Border> | undefined, side: string) => {
    if (!border || !border.style) return;
    const color = colorToCSS(border.color) || '#000000';
    let width = '1px';
    let style = 'solid';

    switch (border.style) {
      case 'thin': width = '1px'; break;
      case 'medium': width = '2px'; break;
      case 'thick': width = '3px'; break;
      case 'dotted': style = 'dotted'; break;
      case 'dashed': style = 'dashed'; break;
      case 'double': style = 'double'; width = '3px'; break;
    }

    styles.push(`border-${side}: ${width} ${style} ${color}`);
  };

  if (cell.border) {
    borderStyle(cell.border.top, 'top');
    borderStyle(cell.border.right, 'right');
    borderStyle(cell.border.bottom, 'bottom');
    borderStyle(cell.border.left, 'left');
  }

  return styles.join('; ');
}

// Show file selector for local testing
function showFileSelector() {
  const container = document.getElementById('container');
  if (!container) return;

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
      <p>Select an XLSX file to render:</p>
      <input type="file" accept=".xlsx,.xls" id="file-input" style="margin: 1rem 0;">
    </div>
  `;

  document.body.appendChild(overlay);

  const input = document.getElementById('file-input') as HTMLInputElement;
  input.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      fileBase64 = base64;
      overlay.remove();
      await renderXLSX();
    };
    reader.readAsDataURL(file);
  });
}

// Render XLSX using ExcelJS
async function renderXLSX(): Promise<RenderMetadata> {
  try {
    const container = document.getElementById('xlsx-container') as HTMLElement;
    if (!container) {
      throw new Error('XLSX container element not found');
    }

    // Check if placeholder value (local testing mode)
    if (fileBase64 === FILE_BASE64_PLACEHOLDER) {
      showFileSelector();
      return {
        width: 1280,
        height: 960,
        pageCount: 1,
        pageNumber: 1,
        scale: 1.0
      };
    }

    // Convert base64 to ArrayBuffer
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Load workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer);

    const worksheets = workbook.worksheets;
    const pageCount = worksheets.length;
    const targetPage = Math.max(1, Math.min(pageNumber, pageCount));
    const worksheet = worksheets[targetPage - 1];

    if (!worksheet) {
      throw new Error(`Worksheet ${targetPage} not found`);
    }

    // Build HTML table
    const table = document.createElement('table');
    table.className = 'xlsx-table';

    // Find actual data bounds (not just rowCount/columnCount which may include empty cells)
    let maxRow = 0;
    let maxCol = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > maxRow) maxRow = rowNumber;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (colNumber > maxCol) maxCol = colNumber;
      });
    });

    // Use at least 1 row/col, fall back to worksheet counts if no data found
    const rowCount = maxRow || worksheet.rowCount || 1;
    const colCount = maxCol || worksheet.columnCount || 1;

    // Create header row (column letters)
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Corner cell
    const cornerCell = document.createElement('th');
    cornerCell.className = 'corner';
    headerRow.appendChild(cornerCell);

    // Column headers (A, B, C, ...)
    for (let col = 1; col <= colCount; col++) {
      const th = document.createElement('th');
      th.textContent = columnToLetter(col);
      // Let columns auto-size based on content (no explicit width)
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create data rows
    const tbody = document.createElement('tbody');

    // Track merged cells
    const mergedCells = new Map<string, { rowSpan: number; colSpan: number }>();
    const skipCells = new Set<string>();

    // Process merged cells
    worksheet.model.merges?.forEach(merge => {
      // Parse merge range (e.g., "A1:B2")
      const match = merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (match) {
        const startCol = columnLetterToNumber(match[1]);
        const startRow = parseInt(match[2]);
        const endCol = columnLetterToNumber(match[3]);
        const endRow = parseInt(match[4]);

        const key = `${startRow},${startCol}`;
        mergedCells.set(key, {
          rowSpan: endRow - startRow + 1,
          colSpan: endCol - startCol + 1
        });

        // Mark cells to skip
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            if (r !== startRow || c !== startCol) {
              skipCells.add(`${r},${c}`);
            }
          }
        }
      }
    });

    for (let rowNum = 1; rowNum <= rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const tr = document.createElement('tr');

      // Row number header
      const rowHeader = document.createElement('td');
      rowHeader.className = 'row-header';
      rowHeader.textContent = String(rowNum);

      // Apply row height if set
      if (row.height) {
        tr.style.height = `${row.height}px`;
      }

      tr.appendChild(rowHeader);

      // Data cells
      for (let colNum = 1; colNum <= colCount; colNum++) {
        const cellKey = `${rowNum},${colNum}`;

        // Skip cells that are part of a merge (not the top-left)
        if (skipCells.has(cellKey)) {
          continue;
        }

        const cell = row.getCell(colNum);
        const td = document.createElement('td');

        // Apply merge spans
        const mergeInfo = mergedCells.get(cellKey);
        if (mergeInfo) {
          if (mergeInfo.rowSpan > 1) td.rowSpan = mergeInfo.rowSpan;
          if (mergeInfo.colSpan > 1) td.colSpan = mergeInfo.colSpan;
        }

        // Set cell content
        td.textContent = getCellDisplayValue(cell);

        // Apply styles
        const cellStyles = getCellStyles(cell);
        if (cellStyles) {
          td.style.cssText = cellStyles;
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // Clear container and add table
    container.innerHTML = '';
    container.appendChild(table);

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    // Calculate dimensions with scale - use exact table size
    const scale = 2.0;
    const tableRect = table.getBoundingClientRect();
    const width = Math.ceil(tableRect.width * scale);
    const height = Math.ceil(tableRect.height * scale);

    const metadata = {
      width,
      height,
      pageCount,
      pageNumber: targetPage,
      scale,
      // Debug info
      tableRect: {
        width: tableRect.width,
        height: tableRect.height,
        top: tableRect.top,
        left: tableRect.left
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    console.log('RenderMetadata:', metadata);

    return metadata;
  } catch (error) {
    console.error('Error rendering XLSX:', error);
    throw error;
  }
}

// Helper to convert column letter to number (A -> 1, AA -> 27)
function columnLetterToNumber(letters: string): number {
  let num = 0;
  for (let i = 0; i < letters.length; i++) {
    num = num * 26 + (letters.charCodeAt(i) - 64);
  }
  return num;
}

// Expose promise for screenshot timing
window.renderComplete = renderXLSX();
