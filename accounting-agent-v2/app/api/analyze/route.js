'use server';

const { writeFileSync, unlinkSync, existsSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { randomUUID } = require('crypto');

const { parseFile, formatRecordsForPrompt } = require('../../../src/services/fileParser');
const { analyzeFinancialData } = require('../../../src/services/llmClient');
const { computeGroundTruth, parseAndValidateLLMResponse } = require('../../../src/utils/validator');

export async function POST(request) {
  let tmpPath = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const originalName = file.name || 'upload';
    const ext = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
    const allowed = ['.csv', '.xlsx', '.xls', '.pdf'];

    if (!allowed.includes(ext)) {
      return Response.json(
        { error: `Unsupported file type "${ext}". Allowed: ${allowed.join(', ')}` },
        { status: 400 }
      );
    }

    // Write to temp file
    const buffer = Buffer.from(await file.arrayBuffer());
    tmpPath = join(tmpdir(), `acct-${randomUUID()}${ext}`);
    writeFileSync(tmpPath, buffer);

    // Run pipeline
    const parsed = await parseFile(tmpPath);

    let formatted;
    let groundTruth = null;

    if (parsed.structured) {
      groundTruth = computeGroundTruth(parsed.records);
      formatted = formatRecordsForPrompt(parsed.records);
    } else {
      formatted = parsed.text;
    }

    const rawResponse = await analyzeFinancialData(formatted);
    const result = parseAndValidateLLMResponse(rawResponse, groundTruth);

    if (!result.success) {
      return Response.json({ error: result.error, raw: result.raw }, { status: 422 });
    }

    return Response.json({
      summary: result.data,
      fileType: ext.slice(1).toUpperCase(),
      groundTruthAvailable: !!groundTruth,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  } finally {
    if (tmpPath && existsSync(tmpPath)) {
      try { unlinkSync(tmpPath); } catch (_) {}
    }
  }
}
