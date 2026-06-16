'use strict';

// Runs in a fresh child process — no csv-parse or exceljs loaded here
const pdfParse = require('pdf-parse/lib/pdf-parse');
const fs = require('fs');

const filePath = process.argv[2];
if (!filePath) {
  process.stderr.write('pdfWorker: no file path given\n');
  process.exit(1);
}

pdfParse(fs.readFileSync(filePath))
  .then((data) => {
    process.stdout.write(JSON.stringify({ text: data.text }));
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write(`pdfWorker error: ${err.message}\n`);
    process.exit(1);
  });
