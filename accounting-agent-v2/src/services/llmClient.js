'use strict';

const fs = require('fs');
const path = require('path');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.MODEL || 'llama3:8b';

function loadSystemPrompt(name) {
  const promptPath = path.join(process.cwd(), 'src/prompts', `${name}.txt`);
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  return fs.readFileSync(promptPath, 'utf-8').trim();
}

async function analyzeFinancialData(formattedData) {
  const systemPrompt = loadSystemPrompt('accounting_analysis');
  const userMessage = `Analyze the following financial transaction data and return the JSON summary per your instructions.\n\nDATA:\n${formattedData}`;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  return json.message.content.trim();
}

module.exports = { analyzeFinancialData };
