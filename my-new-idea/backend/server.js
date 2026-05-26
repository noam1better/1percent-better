const express = require('express');
const cors = require('cors');
const { Ollama } = require('ollama');

const app = express();
const ollama = new Ollama({ host: 'http://localhost:11434' });

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  console.log('[health] ping received');
  res.json({ ok: true, status: 'online' });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message required' });
  }

  try {
    const response = await ollama.chat({
      model: 'qwen2.5:1.5b',
      messages: [{ role: 'user', content: message }],
    });

    res.json({ reply: response.message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ollama error: ' + err.message });
  }
});

app.post('/api/router', async (req, res) => {
  const { task, target } = req.body;

  if (!task || !target) {
    return res.status(400).json({ error: 'task and target required' });
  }

  if (target === 'local') {
    try {
      const response = await ollama.chat({
        model: 'qwen2.5:1.5b',
        messages: [{ role: 'user', content: task }],
      });
      return res.json({ type: 'local', result: response.message.content });
    } catch (err) {
      return res.status(500).json({ error: 'Ollama error: ' + err.message });
    }
  }

  if (target === 'claude-code') {
    const prompt = `You are an expert software engineer using Claude Code CLI.

Task:
${task}

Instructions:
- Analyze the task carefully
- Write clean, production-ready code
- Explain your approach before writing code
- If multiple files are needed, specify each file path
- Follow best practices for the language/framework involved`;
    return res.json({ type: 'claude-code', result: prompt });
  }

  if (target === 'chatgpt') {
    const prompt = `Act as a helpful AI assistant.

Task: ${task}

Please provide:
1. A clear, structured answer
2. Examples if relevant
3. Any important caveats or considerations`;
    return res.json({ type: 'chatgpt', result: prompt });
  }

  res.status(400).json({ error: 'unknown target' });
});

app.listen(3002, () => {
  console.log('Backend running on http://localhost:3002');
});
