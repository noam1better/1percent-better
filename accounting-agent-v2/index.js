'use strict';

const path = require('path');
const { parseFile, formatRecordsForPrompt } = require('./src/services/fileParser');
const { analyzeFinancialData } = require('./src/services/llmClient');
const { computeGroundTruth, parseAndValidateLLMResponse } = require('./src/utils/validator');

async function run(inputFile) {
  const target = inputFile || path.join(__dirname, 'data/sample_expenses.csv');

  console.log(`[1/5] Parsing file: ${target}`);
  const parsed = await parseFile(target);

  let formatted;
  let groundTruth = null;

  if (parsed.structured) {
    const { records } = parsed;
    console.log(`      ${records.length} rows loaded (structured: CSV/Excel)`);

    console.log('[2/5] Computing ground-truth totals from raw data...');
    groundTruth = computeGroundTruth(records);
    console.log(`      revenue=${groundTruth.total_revenue}  expenses=${groundTruth.total_expenses}  net=${groundTruth.net_income}`);
    if (groundTruth.bad_rows.length > 0) {
      console.warn('      Unparseable rows in source:');
      groundTruth.bad_rows.forEach((r) => console.warn(`        - ${r}`));
    }

    console.log('[3/5] Formatting records for LLM prompt...');
    formatted = formatRecordsForPrompt(records);
  } else {
    console.log('      File parsed as PDF (unstructured text)');
    console.warn('      [NOTE] Ground-truth validation unavailable for PDF — totals will not be cross-checked');

    console.log('[2/5] Skipped (PDF has no structured rows)');
    console.log('[3/5] Using extracted PDF text as LLM input...');
    formatted = parsed.text;
  }

  console.log('[4/5] Sending to LLM for analysis...');
  const rawResponse = await analyzeFinancialData(formatted);

  console.log('[5/5] Validating response...');
  const result = parseAndValidateLLMResponse(rawResponse, groundTruth);

  if (!result.success) {
    console.error('\n[ERROR] Validation failed:');
    console.error(result.error);
    if (result.raw) {
      console.error('Raw LLM output:');
      console.error(typeof result.raw === 'string' ? result.raw : JSON.stringify(result.raw, null, 2));
    }
    process.exit(1);
  }

  const summary = result.data;

  if (summary.has_errors) {
    console.warn('\n[WARNING] Report contains errors flagged by model or validator:');
    summary.errors.forEach((e) => console.warn(`  - ${e}`));
  }

  if (summary.unparseable_rows.length > 0) {
    console.warn('\n[WARNING] Unparseable rows:');
    summary.unparseable_rows.forEach((r) => console.warn(`  - ${r}`));
  }

  console.log('\n========== ACCOUNTING SUMMARY ==========');
  console.log(JSON.stringify(summary, null, 2));
  console.log('=========================================');

  return summary;
}

run(process.argv[2]).catch((err) => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
