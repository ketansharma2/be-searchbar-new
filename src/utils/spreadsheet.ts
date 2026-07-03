import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import { ApiError } from './ApiError';

export interface ParsedSheet {
  headers: string[];
  /** One object per data row, keyed by the original header text. */
  rows: Record<string, string>[];
}

/** Normalise an exceljs cell value to a trimmed string. */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const v = value as {
      text?: string;
      hyperlink?: string;
      result?: unknown;
      richText?: { text: string }[];
    };
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
    if (typeof v.text === 'string') return v.text.trim();
    if (typeof v.hyperlink === 'string') return v.hyperlink.trim();
    if (v.result !== undefined) return String(v.result).trim();
    return '';
  }
  return String(value).trim();
}

/**
 * Parse the first worksheet of an .xlsx or .csv buffer into headers + rows.
 * Throws ApiError(400) for unreadable/empty files or unsupported types.
 */
export async function parseSpreadsheet(
  buffer: Buffer,
  filename: string
): Promise<ParsedSheet> {
  const isCsv = /\.csv$/i.test(filename);
  const isXlsx = /\.xlsx$/i.test(filename);

  if (!isCsv && !isXlsx) {
    throw ApiError.badRequest(
      'Unsupported file type. Please upload an .xlsx or .csv file (legacy .xls must be re-saved as .xlsx).'
    );
  }

  const workbook = new ExcelJS.Workbook();
  try {
    if (isCsv) {
      await workbook.csv.read(Readable.from(buffer));
    } else {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    }
  } catch {
    throw ApiError.badRequest('Could not read the spreadsheet. It may be corrupt.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 1) {
    throw ApiError.badRequest('The spreadsheet is empty.');
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = cellToString(cell.value);
  });
  const cleanHeaders = headers.filter(Boolean);
  if (cleanHeaders.length === 0) {
    throw ApiError.badRequest('The spreadsheet has no header row.');
  }

  const rows: Record<string, string>[] = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const obj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, i) => {
      if (!header) return;
      const value = cellToString(row.getCell(i + 1).value);
      obj[header] = value;
      if (value) hasValue = true;
    });
    if (hasValue) rows.push(obj); // skip fully-blank rows
  }

  return { headers: cleanHeaders, rows };
}
