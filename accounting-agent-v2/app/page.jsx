'use client';

import { useState } from 'react';
import UploadZone from './components/UploadZone';
import ResultsDashboard from './components/ResultsDashboard';

export default function Home() {
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen px-4 py-12 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 text-xs font-semibold mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          Powered by Ollama · Hallucination-proof validation
        </div>
        <h1 className="text-4xl font-bold text-gray-100 tracking-tight">
          Accounting Agent
          <span className="text-indigo-400"> v2</span>
        </h1>
        <p className="mt-3 text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
          Upload a financial report — CSV, Excel, or PDF — and get an AI-generated summary
          with every number independently verified against the source data.
        </p>
      </div>

      {/* Upload zone */}
      <UploadZone onResult={setResult} onError={setError} onLoading={setLoading} />

      {/* Loading state */}
      {loading && (
        <div className="mt-8 flex flex-col items-center gap-4 text-gray-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Analyzing with LLM and validating against source data…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mt-6 rounded-2xl border border-rose-800 bg-rose-950/30 px-5 py-4 flex items-start gap-3">
          <span className="text-rose-400 text-lg mt-0.5">✕</span>
          <div>
            <p className="text-rose-300 font-semibold text-sm">Analysis failed</p>
            <p className="text-rose-500 text-xs mt-1 font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mt-10">
          <ResultsDashboard data={result} />
        </div>
      )}
    </main>
  );
}
