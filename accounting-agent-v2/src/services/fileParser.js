'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.pdf'];

function detectType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type "${ext}". Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  }
  return ext;
}

// --- CSV ---

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

// --- Excel ---

async function parseExcel(filePath) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Excel file has no worksheets');

  const rows = [];
  let headers = [];

  sheet.eachRow((row, rowNumber) => {
    const values = row.values.slice(1); // exceljs row.values is 1-indexed with undefined at 0
    if (rowNumber === 1) {
      headers = values.map((v) => String(v ?? '').trim());
    } else {
      const record = {};
      headers.forEach((h, i) => {
        const cell = values[i];
        record[h] = cell instanceof Date
          ? cell.toISOString().split('T')[0]
          : String(cell ?? '').trim();
      });
      if (Object.values(record).some((v) => v !== '')) rows.push(record);
    }
  });

  return rows;
}

// --- PDF ---

async function parsePDF(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// --- Unified entry point ---

// Returns { structured: true, records } for CSV/Excel
// Returns { structured: false, text }   for PDF
async function parseFile(filePath) {
  const absolute = path.resolve(filePath);

  if (!fs.existsSync(absolute)) {
    throw new Error(`File not found: ${absolute}`);
  }

  const ext = detectType(absolute);

  if (ext === '.csv') {
    const records = parseCSV(absolute);
    return { structured: true, records };
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const records = await parseExcel(absolute);
    return { structured: true, records };
  }

  if (ext === '.pdf') {
    const text = await parsePDF(absolute);
    return { structured: false, text };
  }
}

function formatRecordsForPrompt(records) {
  return records
    .map((row, i) => {
      const cols = Object.entries(row)
        .map(([k, v]) => `${k}="${v}"`)
        .join(', ');
      return `Row ${i + 1}: ${cols}`;
    })
    .join('\n');
}

module.exports = { parseFile, formatRecordsForPrompt };
