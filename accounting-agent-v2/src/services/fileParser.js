'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

function parseCSV(filePath) {
  const absolute = path.resolve(filePath);

  if (!fs.existsSync(absolute)) {
    throw new Error(`File not found: ${absolute}`);
  }

  const content = fs.readFileSync(absolute, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records;
}

function formatRecordsForPrompt(records) {
  const lines = records.map((row, i) => {
    const cols = Object.entries(row)
      .map(([k, v]) => `${k}="${v}"`)
      .join(', ');
    return `Row ${i + 1}: ${cols}`;
  });

  return lines.join('\n');
}

module.exports = { parseCSV, formatRecordsForPrompt };
