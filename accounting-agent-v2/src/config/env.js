'use strict';

require('dotenv').config();

module.exports = {
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  MODEL: process.env.MODEL || 'llama3:8b',
};
